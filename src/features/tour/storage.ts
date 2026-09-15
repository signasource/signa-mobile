import AsyncStorage from "@react-native-async-storage/async-storage";

const makeKeys = (uid: string) => ({
  tourCompleted: `tour_${uid}_completed`,
  checklistDismissed: `tour_${uid}_cl_dismissed`,
  checklistLesson: `tour_${uid}_cl_lesson`,
  checklistPractice: `tour_${uid}_cl_practice`,
  checklistFriend: `tour_${uid}_cl_friend`,
  checklistStreak: `tour_${uid}_cl_streak`,
  tabPractice: `tour_${uid}_tab_practice`,
  tabStore: `tour_${uid}_tab_store`,
  tabSocial: `tour_${uid}_tab_social`,
});

const getBool = async (key: string): Promise<boolean> =>
  (await AsyncStorage.getItem(key)) === "true";

const setBool = async (key: string): Promise<void> =>
  AsyncStorage.setItem(key, "true");

export const tourStorage = {
  isTourCompleted: (uid: string) => getBool(makeKeys(uid).tourCompleted),
  completeTour: (uid: string) => setBool(makeKeys(uid).tourCompleted),
  resetTour: (uid: string) => AsyncStorage.multiRemove(Object.values(makeKeys(uid))),

  isChecklistDismissed: (uid: string) => getBool(makeKeys(uid).checklistDismissed),
  dismissChecklist: (uid: string) => setBool(makeKeys(uid).checklistDismissed),

  getChecklistItems: async (uid: string) => {
    const K = makeKeys(uid);
    return {
      lesson: await getBool(K.checklistLesson),
      practice: await getBool(K.checklistPractice),
      friend: await getBool(K.checklistFriend),
      streak: await getBool(K.checklistStreak),
    };
  },
  markLesson: (uid: string) => setBool(makeKeys(uid).checklistLesson),
  markPractice: (uid: string) => setBool(makeKeys(uid).checklistPractice),
  markFriend: (uid: string) => setBool(makeKeys(uid).checklistFriend),
  markStreak: (uid: string) => setBool(makeKeys(uid).checklistStreak),

  isTabSeen: (uid: string, tab: "practice" | "store" | "social") => {
    const K = makeKeys(uid);
    return getBool(tab === "practice" ? K.tabPractice : tab === "store" ? K.tabStore : K.tabSocial);
  },
  markTabSeen: (uid: string, tab: "practice" | "store" | "social") => {
    const K = makeKeys(uid);
    return setBool(tab === "practice" ? K.tabPractice : tab === "store" ? K.tabStore : K.tabSocial);
  },
};
