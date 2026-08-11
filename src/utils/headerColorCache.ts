import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Preferencia local (no sensible) del color del encabezado del perfil.
 *
 * signa-api no expone este ajuste: UserSettings solo tiene `theme`
 * (claro/oscuro), no un color libre. Por eso se guarda por dispositivo en
 * AsyncStorage, igual que el cache de nombre (ver src/utils/profileCache.ts).
 */
const HEADER_COLOR_KEY = "signa_profile_header_color";

export const headerColorCache = {
  async get(): Promise<string | null> {
    return AsyncStorage.getItem(HEADER_COLOR_KEY);
  },
  async set(hex: string): Promise<void> {
    await AsyncStorage.setItem(HEADER_COLOR_KEY, hex);
  },
};
