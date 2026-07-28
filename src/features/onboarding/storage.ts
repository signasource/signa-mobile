import AsyncStorage from "@react-native-async-storage/async-storage";
import { OnboardingData } from "./types";

const COMPLETED_KEY = "onboarding_completed";
const DATA_KEY = "onboarding_data";

export const onboardingStorage = {
  isCompleted: async (): Promise<boolean> => {
    const val = await AsyncStorage.getItem(COMPLETED_KEY);
    return val === "true";
  },

  complete: async (): Promise<void> => {
    await AsyncStorage.setItem(COMPLETED_KEY, "true");
  },

  saveData: async (data: Partial<OnboardingData>): Promise<void> => {
    const existing = await onboardingStorage.getData();
    const merged = { ...existing, ...data };
    await AsyncStorage.setItem(DATA_KEY, JSON.stringify(merged));
  },

  getData: async (): Promise<OnboardingData> => {
    const raw = await AsyncStorage.getItem(DATA_KEY);
    if (!raw) return { dailyGoal: null, level: null, reasons: [] };
    try {
      return JSON.parse(raw) as OnboardingData;
    } catch {
      return { dailyGoal: null, level: null, reasons: [] };
    }
  },

  reset: async (): Promise<void> => {
    await AsyncStorage.multiRemove([COMPLETED_KEY, DATA_KEY]);
  },
};
