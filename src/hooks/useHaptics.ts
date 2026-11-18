import { useMemo } from "react";
import * as Haptics from "expo-haptics";
import { useSettings } from "@/context/SettingsContext";

/**
 * Haptic feedback that honours the "Vibración" setting (Configuración). Every call is fire-and-forget
 * and swallows errors: web and some devices have no haptic engine, and feedback must never break a
 * screen.
 */
export function useHaptics() {
  const { vibrationEnabled } = useSettings();
  return useMemo(() => {
    const run = (fn: () => Promise<void>) => {
      if (vibrationEnabled) fn().catch(() => {});
    };
    return {
      /** Light tick, e.g. a counter going up. */
      tick: () => run(() => Haptics.selectionAsync()),
      light: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      medium: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)),
      /** The big thump: something lands. */
      heavy: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
    };
  }, [vibrationEnabled]);
}
