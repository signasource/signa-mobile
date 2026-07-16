import * as SecureStore from "expo-secure-store";

/**
 * Wrapper sobre expo-secure-store para persistir tokens de forma segura
 * (Keychain en iOS, Keystore en Android).
 */
const ACCESS_TOKEN_KEY = "signa_access_token";
const REFRESH_TOKEN_KEY = "signa_refresh_token";

export const tokenStorage = {
  async getAccessToken(): Promise<string | null> {
    return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  },
  async getRefreshToken(): Promise<string | null> {
    return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  },
  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    if (typeof accessToken !== "string" || typeof refreshToken !== "string") {
      // Si esto salta, el JSON que devolvio el back no tiene las claves
      // "accessToken"/"refreshToken" esperadas (ver AuthResponse.java y
      // JacksonConfig.java - puede haber una naming strategy custom, ej
      // snake_case, que cambia el nombre real de los campos).
      console.error(
        "[tokenStorage] accessToken/refreshToken no son strings. Revisar el JSON real que devuelve el back.",
        { accessToken, refreshToken }
      );
      throw new Error(
        "El backend no devolvio accessToken/refreshToken con el formato esperado. Ver logs de Metro para el detalle."
      );
    }
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
  },
};
