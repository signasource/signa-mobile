import AsyncStorage from "@react-native-async-storage/async-storage";

const makeKeys = (uid: string) => ({
  tourCompleted: `tour_${uid}_completed`,
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

  isTabSeen: (uid: string, tab: "practice" | "store" | "social") => {
    const K = makeKeys(uid);
    return getBool(tab === "practice" ? K.tabPractice : tab === "store" ? K.tabStore : K.tabSocial);
  },
  markTabSeen: (uid: string, tab: "practice" | "store" | "social") => {
    const K = makeKeys(uid);
    return setBool(tab === "practice" ? K.tabPractice : tab === "store" ? K.tabStore : K.tabSocial);
  },
};
