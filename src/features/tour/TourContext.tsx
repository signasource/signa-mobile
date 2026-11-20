import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { View } from "react-native";
import { tourStorage } from "./storage";
import { TOUR_CLOSING_STEP, TOUR_WELCOME_STEP } from "./steps";

/** Position of an element in window coordinates (what `measureInWindow` returns). */
export interface TourRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A real on-screen element the tour can spotlight. */
export interface TourTarget {
  ref: React.RefObject<View | null>;
  /** Brings the element into view (e.g. scrolls a list) before it is measured. */
  reveal?: () => void | Promise<void>;
}

interface TourContextValue {
  // Tour overlay (0=welcome, 1..TOUR_STEP_COUNT=coach marks, TOUR_CLOSING_STEP=closing; see steps.ts)
  tourVisible: boolean;
  tourStep: number;
  tourGoNext: () => void;
  tourGoPrev: () => void;
  tourSkip: () => void;
  tourReplay: () => void;
  /** Registers a spotlight target; returns the unregister function. */
  registerTarget: (id: string, target: TourTarget) => () => void;
  /** One measurement of a registered target in window coordinates; `null` if absent or zero-sized. */
  measureTarget: (id: string) => Promise<TourRect | null>;
  /** Asks a target to bring itself into view (e.g. scroll a list). Best-effort. */
  revealTarget: (id: string) => Promise<void>;

  // Section modals (first-visit per tab)
  practiceModalVisible: boolean;
  storeModalVisible: boolean;
  socialModalVisible: boolean;
  /** `isStillFocused` is re-checked after the async "already seen?" lookup. */
  showSectionModal: (
    tab: "practice" | "store" | "social",
    isStillFocused?: () => boolean,
  ) => Promise<void>;
  dismissPracticeModal: () => void;
  dismissStoreModal: () => void;
  dismissSocialModal: () => void;
}

const TourContext = createContext<TourContextValue | null>(null);

export function useTour(): TourContextValue {
  const ctx = useContext(TourContext);
  if (!ctx) throw new Error("useTour must be used within TourProvider");
  return ctx;
}

export function TourProvider({
  children,
  isAuthenticated,
  userId,
}: {
  children: React.ReactNode;
  isAuthenticated: boolean;
  userId: string | null;
}) {
  const [tourVisible, setTourVisible] = useState(false);
  const [tourStep, setTourStep] = useState(0);
  const [practiceModalVisible, setPracticeModalVisible] = useState(false);
  const [storeModalVisible, setStoreModalVisible] = useState(false);
  const [socialModalVisible, setSocialModalVisible] = useState(false);

  // Only one section modal per session
  const sessionModalShown = useRef(false);

  const targetsRef = useRef(new Map<string, TourTarget>());
  const tourVisibleRef = useRef(false);
  useEffect(() => {
    tourVisibleRef.current = tourVisible;
  }, [tourVisible]);

  const registerTarget = useCallback((id: string, target: TourTarget) => {
    targetsRef.current.set(id, target);
    return () => {
      if (targetsRef.current.get(id) === target) targetsRef.current.delete(id);
    };
  }, []);

  // Single-shot: the overlay's engine (`useTourSpot`) owns retrying, settling and tracking.
  const measureTarget = useCallback((id: string): Promise<TourRect | null> => {
    const node = targetsRef.current.get(id)?.ref.current;
    if (!node) return Promise.resolve(null);
    return new Promise((resolve) => {
      // measureInWindow may never call back for a detached native view: don't hang the engine.
      const timer = setTimeout(() => resolve(null), 400);
      node.measureInWindow((x, y, width, height) => {
        clearTimeout(timer);
        const valid =
          [x, y, width, height].every(Number.isFinite) && width > 0 && height > 0;
        resolve(valid ? { x, y, width, height } : null);
      });
    });
  }, []);

  const revealTarget = useCallback(async (id: string): Promise<void> => {
    try {
      await targetsRef.current.get(id)?.reveal?.();
    } catch {
      // Revealing is best-effort: the target is measured wherever it is.
    }
  }, []);

  // The step lives in a ref too, so rapid double taps advance one step each, never skip one.
  const tourStepRef = useRef(0);
  const goToStep = useCallback((step: number) => {
    tourStepRef.current = step;
    setTourStep(step);
  }, []);

  // Keep userId in a ref so callbacks always see the latest value.
  const userIdRef = useRef(userId);
  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  // Track previous auth value so we can detect actual login transitions.
  // Initialized to the current value so a cold-start with an existing session
  // (isAuthenticated already true) is NOT treated as a login.
  const prevAuthRef = useRef(isAuthenticated);

  useEffect(() => {
    const justLoggedIn = !prevAuthRef.current && isAuthenticated;
    prevAuthRef.current = isAuthenticated;

    if (!isAuthenticated || !userId) {
      setTourVisible(false);
      return;
    }

    (async () => {
      const tourDone = await tourStorage.isTourCompleted(userId);
      // Only trigger the tour when the user actually logs in during this session.
      if (!tourDone && justLoggedIn) {
        goToStep(TOUR_WELCOME_STEP);
        setTourVisible(true);
      }
    })();
  }, [isAuthenticated, userId, goToStep]);

  const finishTour = useCallback(() => {
    if (userIdRef.current) tourStorage.completeTour(userIdRef.current);
    setTourVisible(false);
  }, []);

  const tourGoNext = useCallback(() => {
    if (tourStepRef.current >= TOUR_CLOSING_STEP) finishTour();
    else goToStep(tourStepRef.current + 1);
  }, [finishTour, goToStep]);

  const tourGoPrev = useCallback(() => {
    if (tourStepRef.current > 1) goToStep(tourStepRef.current - 1);
  }, [goToStep]);

  const tourSkip = useCallback(() => finishTour(), [finishTour]);

  const tourReplay = useCallback(async () => {
    if (!userIdRef.current) return;
    await tourStorage.resetTour(userIdRef.current);
    sessionModalShown.current = false;
    goToStep(TOUR_WELCOME_STEP);
    setTourVisible(true);
  }, [goToStep]);

  const showSectionModal = useCallback(
    async (tab: "practice" | "store" | "social", isStillFocused: () => boolean = () => true) => {
      const uid = userIdRef.current;
      // The welcome tour has its own explanations: never stack a section modal on it.
      if (!uid || sessionModalShown.current || tourVisibleRef.current) return;
      const seen = await tourStorage.isTabSeen(uid, tab);
      if (seen) return;
      // The user may have switched tab while storage was read: the modal explains
      // the screen that is in front, so bail out if it no longer is.
      if (!isStillFocused() || tourVisibleRef.current || sessionModalShown.current) return;
      await tourStorage.markTabSeen(uid, tab);
      sessionModalShown.current = true;
      if (tab === "practice") setPracticeModalVisible(true);
      else if (tab === "store") setStoreModalVisible(true);
      else setSocialModalVisible(true);
    },
    [],
  );

  const dismissPracticeModal = useCallback(() => {
    setPracticeModalVisible(false);
    sessionModalShown.current = false;
  }, []);
  const dismissStoreModal = useCallback(() => {
    setStoreModalVisible(false);
    sessionModalShown.current = false;
  }, []);
  const dismissSocialModal = useCallback(() => {
    setSocialModalVisible(false);
    sessionModalShown.current = false;
  }, []);

  return (
    <TourContext.Provider
      value={{
        tourVisible,
        tourStep,
        tourGoNext,
        tourGoPrev,
        tourSkip,
        tourReplay,
        registerTarget,
        measureTarget,
        revealTarget,
        practiceModalVisible,
        storeModalVisible,
        socialModalVisible,
        showSectionModal,
        dismissPracticeModal,
        dismissStoreModal,
        dismissSocialModal,
      }}
    >
      {children}
    </TourContext.Provider>
  );
}
