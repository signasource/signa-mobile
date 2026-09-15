import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { tourStorage } from "./storage";

export interface ChecklistItems {
  lesson: boolean;
  practice: boolean;
  friend: boolean;
  streak: boolean;
}

interface TourContextValue {
  // Tour overlay (0=welcome, 1-6=coach marks, 7=closing)
  tourVisible: boolean;
  tourStep: number;
  tourGoNext: () => void;
  tourGoPrev: () => void;
  tourSkip: () => void;
  tourReplay: () => void;

  // Checklist
  checklistVisible: boolean;
  checklistItems: ChecklistItems;
  markLesson: () => void;
  markPractice: () => void;
  markFriend: () => void;
  markStreak: () => void;

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
  const [checklistVisible, setChecklistVisible] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItems>({
    lesson: false,
    practice: false,
    friend: false,
    streak: false,
  });
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
      setChecklistVisible(false);
      return;
    }

    (async () => {
      const [tourDone, clDismissed, clItems] = await Promise.all([
        tourStorage.isTourCompleted(userId),
        tourStorage.isChecklistDismissed(userId),
        tourStorage.getChecklistItems(userId),
      ]);
      setChecklistItems(clItems);
      if (!tourDone) {
        // Only trigger the tour when the user actually logs in during this session.
        if (justLoggedIn) {
          setTourStep(0);
          setTourVisible(true);
        }
      } else if (!clDismissed) {
        const allDone =
          clItems.lesson && clItems.practice && clItems.friend && clItems.streak;
        if (!allDone) setChecklistVisible(true);
      }
    })();
  }, [isAuthenticated, userId]);

  const finishTour = useCallback(() => {
    if (userIdRef.current) tourStorage.completeTour(userIdRef.current);
    setTourVisible(false);
    setChecklistVisible(true);
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
    setChecklistItems({ lesson: false, practice: false, friend: false, streak: false });
    setChecklistVisible(false);
    setTourStep(0);
    setTourVisible(true);
  }, []);

  const applyChecklistMark = useCallback(
    async (field: keyof ChecklistItems, markFn: (uid: string) => Promise<void>) => {
      const uid = userIdRef.current;
      if (!uid) return;
      await markFn(uid);
      setChecklistItems((prev) => {
        const next = { ...prev, [field]: true };
        if (next.lesson && next.practice && next.friend && next.streak) {
          // All done — dismiss after a brief delay (celebration handled in ChecklistCard)
          setTimeout(async () => {
            if (userIdRef.current) await tourStorage.dismissChecklist(userIdRef.current);
            setChecklistVisible(false);
          }, 2500);
        }
        return next;
      });
    },
    [],
  );

  const markLesson = useCallback(
    () => applyChecklistMark("lesson", tourStorage.markLesson),
    [applyChecklistMark],
  );
  const markPractice = useCallback(
    () => applyChecklistMark("practice", tourStorage.markPractice),
    [applyChecklistMark],
  );
  const markFriend = useCallback(
    () => applyChecklistMark("friend", tourStorage.markFriend),
    [applyChecklistMark],
  );
  const markStreak = useCallback(
    () => applyChecklistMark("streak", tourStorage.markStreak),
    [applyChecklistMark],
  );

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
        checklistVisible,
        checklistItems,
        markLesson,
        markPractice,
        markFriend,
        markStreak,
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
