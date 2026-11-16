import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "@/utils/storage";
import { keysToCamelCase, keysToSnakeCase } from "@/utils/caseConverter";

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8080";

export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Adjunta el access token en cada request si existe
apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  const token = await tokenStorage.getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data) {
    config.data = keysToSnakeCase(config.data);
  }
  return config;
});

// Convierte cada response de snake_case a camelCase
apiClient.interceptors.response.use((response) => {
  if (response.data) {
    response.data = keysToCamelCase(response.data);
  }
  return response;
});

// Callback registrado por AuthContext para forzar logout cuando el refresh falla
let onRefreshFailure: (() => void) | null = null;

export function setOnRefreshFailure(cb: () => void) {
  onRefreshFailure = cb;
}

/**
 * El servidor rechazó el refresh token (vencido, revocado o inexistente): la sesión no se puede
 * recuperar y hay que volver a iniciar sesión. Cualquier otro fallo del refresh (sin red, timeout,
 * 5xx) es transitorio y NO debe cerrar la sesión.
 */
export class SessionRejectedError extends Error {
  constructor() {
    super("Refresh token rechazado");
    this.name = "SessionRejectedError";
  }
}

let refreshInFlight: Promise<string> | null = null;

async function requestNewTokens(): Promise<string> {
  const refreshToken = await tokenStorage.getRefreshToken();
  if (!refreshToken) throw new SessionRejectedError();

  let rawData: unknown;
  try {
    ({ data: rawData } = await axios.post(
      `${API_URL}/auth/refresh`,
      keysToSnakeCase({ refreshToken }),
      { timeout: 15000 }
    ));
  } catch (err) {
    const status = axios.isAxiosError(err) ? err.response?.status : undefined;
    if (status === 400 || status === 401 || status === 403) throw new SessionRejectedError();
    throw err; // red / timeout / 5xx: transitorio
  }

  const data = keysToCamelCase<{ accessToken: string; refreshToken: string }>(rawData);
  await tokenStorage.setTokens(data.accessToken, data.refreshToken);
  return data.accessToken;
}

/**
 * Único punto de refresh de tokens (single-flight): llamadas concurrentes (interceptor, vuelta a
 * primer plano, arranque) comparten la misma request. Si no, el refresh token rotado por la primera
 * invalidaría el de la segunda y se cerraría la sesión sin motivo.
 * Resuelve con el nuevo access token; rechaza con `SessionRejectedError` si la sesión murió.
 */
export function refreshSession(): Promise<string> {
  refreshInFlight ??= requestNewTokens().finally(() => {
    refreshInFlight = null;
  });
  return refreshInFlight;
}

/**
 * Interceptor de 401/403: intenta refrescar el access token una vez.
 * El backend responde 403 (en vez de 401) para algunos casos de token
 * expirado/inválido, así que ambos códigos disparan el mismo flujo.
 * La sesión solo se cierra si el servidor rechaza el refresh token; un fallo de red deja los
 * tokens intactos y el error original llega a la pantalla.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const status = error.response?.status;
    // Los endpoints /auth/* (login, google, refresh...) devuelven 401/403 por credenciales
    // inválidas, no por access token vencido: no tiene sentido refrescar ni cerrar sesión.
    const isAuthEndpoint = originalRequest?.url?.startsWith("/auth/") ?? false;

    if (
      (status !== 401 && status !== 403) ||
      !originalRequest ||
      originalRequest._retry ||
      isAuthEndpoint
    ) {
      // Record the failure for the usage dashboard (4xx/5xx that we don't transparently retry).
      if (status && status >= 400) {
        void import("@/telemetry/telemetry").then((t) => t.trackApiError(status)).catch(() => {});
      }
      return Promise.reject(error);
    }

    originalRequest._retry = true;

    try {
      await refreshSession();
    } catch (refreshError) {
      if (refreshError instanceof SessionRejectedError) {
        // Sin sesión de la que expirar (p. ej. request anónimo): solo propagar el error.
        const hadSession = !!(await tokenStorage.getAccessToken());
        await tokenStorage.clear();
        if (hadSession) onRefreshFailure?.();
      }
      return Promise.reject(error);
    }
    return apiClient(originalRequest);
  }
);
