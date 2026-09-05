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

type PendingEntry = { resolve: () => void; reject: (err: unknown) => void };

let isRefreshing = false;
let pendingQueue: PendingEntry[] = [];

function flushQueue(error?: unknown) {
  pendingQueue.forEach((entry) => (error ? entry.reject(error) : entry.resolve()));
  pendingQueue = [];
}

/**
 * Interceptor de 401: intenta refrescar el access token una vez.
 * Requests concurrentes que lleguen mientras se está refrescando esperan en
 * `pendingQueue` y reintentan con el nuevo token sin disparar otro refresh.
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry) {
      return Promise.reject(error);
    }

    if (isRefreshing) {
      // Esperar que termine el refresh en curso, luego reintentar
      return new Promise<void>((resolve, reject) => {
        pendingQueue.push({ resolve, reject });
      }).then(() => apiClient(originalRequest));
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await tokenStorage.getRefreshToken();
      if (!refreshToken) throw error;

      const { data: rawData } = await axios.post(
        `${API_URL}/auth/refresh`,
        keysToSnakeCase({ refreshToken })
      );
      const data = keysToCamelCase<{ accessToken: string; refreshToken: string }>(rawData);

      await tokenStorage.setTokens(data.accessToken, data.refreshToken);
      flushQueue();
      return apiClient(originalRequest);
    } catch (refreshError) {
      await tokenStorage.clear();
      flushQueue(refreshError);
      onRefreshFailure?.();
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  }
);
