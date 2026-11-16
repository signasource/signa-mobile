import { useEffect } from "react";
import { Platform } from "react-native";
import * as Notifications from "expo-notifications";
import { notificationsApi } from "@/api/notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Module-level state: there is only ever one active push token per app instance.
let _currentToken: string | null = null;
const _platform: "ANDROID" | "IOS" = Platform.OS === "ios" ? "IOS" : "ANDROID";

/**
 * Call this before clearing auth tokens (while the session is still valid) to
 * tell the backend to drop the current device token. Non-throwing: logout
 * proceeds regardless of whether the network call succeeds.
 */
export async function unregisterPushToken() {
  if (!_currentToken) return;
  try {
    await notificationsApi.removeDeviceToken(_currentToken, _platform);
    _currentToken = null;
  } catch (err) {
    if (__DEV__) console.warn("[push] unregister failed", err);
  }
}

export function usePushToken(isAuthenticated: boolean) {
  useEffect(() => {
    if (!isAuthenticated) return;

    let cancelled = false;

    async function register() {
      try {
        const { status } = await Notifications.getPermissionsAsync();
        const finalStatus =
          status === "granted"
            ? status
            : (await Notifications.requestPermissionsAsync()).status;

        if (finalStatus !== "granted" || cancelled) return;

        const { data: token } = await Notifications.getDevicePushTokenAsync();
        if (cancelled) return;

        _currentToken = token;
        await notificationsApi.registerDeviceToken(token, _platform);
      } catch (err) {
        if (__DEV__) console.warn("[push] token registration failed", err);
      }
    }

    register();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
