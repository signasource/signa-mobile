import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tourStorage } from "./storage";

interface TourContextValue {
  // Tour overlay (0=welcome, 1-6=coach marks, 7=closing)
  tourVisible: boolean;
  tourStep: number;
  tourGoNext: () => void;
  tourGoPrev: () => void;
  tourSkip: () => void;
  tourReplay: () => void;

  // Section modals (first-visit per tab)
  practiceModalVisible: boolean;
  storeModalVisible: boolean;
  socialModalVisible: boolean;
  showSectionModal: (tab: "practice" | "store" | "social") => Promise<void>;
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
    async (tab: "practice" | "store" | "social") => {
      const uid = userIdRef.current;
      if (!uid || sessionModalShown.current) return;
      const seen = await tourStorage.isTabSeen(uid, tab);
      if (seen) return;
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
