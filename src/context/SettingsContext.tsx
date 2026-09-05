import React, { createContext, useCallback, useContext, useState } from "react";
import { usersApi } from "@/api/users";

type FontSizeId = "SMALL" | "MEDIUM" | "LARGE";

const FONT_SCALES: Record<FontSizeId, number> = {
  SMALL: 14 / 15,
  MEDIUM: 1.0,
  LARGE: 17 / 15,
};

interface SettingsContextValue {
  fontSizeId: FontSizeId;
  fontScale: number;
  setFontSizeId: (id: FontSizeId) => void;
  loadFontSize: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [fontSizeId, setFontSizeIdState] = useState<FontSizeId>("MEDIUM");

  const setFontSizeId = useCallback((id: FontSizeId) => {
    setFontSizeIdState(id);
  }, []);

  const loadFontSize = useCallback(async () => {
    try {
      const res = await usersApi.getSettings();
      if (res.data.fontSize) setFontSizeIdState(res.data.fontSize as FontSizeId);
    } catch {
      // keep default
    }
  }, []);

  return (
    <SettingsContext.Provider
      value={{ fontSizeId, fontScale: FONT_SCALES[fontSizeId], setFontSizeId, loadFontSize }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}

export function useFontScale() {
  return useSettings().fontScale;
}
