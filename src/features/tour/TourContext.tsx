import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { View } from "react-native";
import { tourStorage } from "./storage";

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
  // Tour overlay (0=welcome, 1-6=coach marks, 7=closing)
  tourVisible: boolean;
  tourStep: number;
  tourGoNext: () => void;
  tourGoPrev: () => void;
  tourSkip: () => void;
  tourReplay: () => void;
  /** Registers a spotlight target; returns the unregister function. */
  registerTarget: (id: string, target: TourTarget) => () => void;
  /** Measures a registered target in window coordinates, or `null` if it is not on screen. */
  measureTarget: (id: string) => Promise<TourRect | null>;

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

  const measureTarget = useCallback(async (id: string): Promise<TourRect | null> => {
    const target = targetsRef.current.get(id);
    if (!target) return null;
    try {
      await target.reveal?.();
    } catch {
      // Revealing is best-effort: measure wherever the element is.
    }
    // Layout may still be settling (scroll, fonts, data): retry a few times.
    for (let attempt = 0; attempt < 6; attempt++) {
      const node = target.ref.current;
      if (node) {
        const rect = await new Promise<TourRect | null>((resolve) => {
          node.measureInWindow((x, y, width, height) =>
            resolve(width > 0 && height > 0 ? { x, y, width, height } : null),
          );
        });
        if (rect) return rect;
      }
      await new Promise((r) => setTimeout(r, 120));
    }
    return null;
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
        setTourStep(0);
        setTourVisible(true);
      }
    })();
  }, [isAuthenticated, userId]);

  const finishTour = useCallback(() => {
    if (userIdRef.current) tourStorage.completeTour(userIdRef.current);
    setTourVisible(false);
  }, []);

  const tourGoNext = useCallback(() => {
    setTourStep((s) => {
      if (s >= 7) {
        finishTour();
        return s;
      }
      const next = s + 1;
      if (next > 7) {
        finishTour();
        return s;
      }
      return next;
    });
  }, [finishTour]);

  // Called by the closing step "Listo" button
  useEffect(() => {
    if (tourStep === 8) finishTour();
  }, [tourStep, finishTour]);

  const tourGoPrev = useCallback(() => {
    setTourStep((s) => (s > 1 ? s - 1 : s));
  }, []);

  const tourSkip = useCallback(() => finishTour(), [finishTour]);

  const tourReplay = useCallback(async () => {
    if (!userIdRef.current) return;
    await tourStorage.resetTour(userIdRef.current);
    sessionModalShown.current = false;
    setTourStep(0);
    setTourVisible(true);
  }, []);

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
