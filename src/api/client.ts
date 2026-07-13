import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "@/utils/storage";
import { keysToCamelCase, keysToSnakeCase } from "@/utils/caseConverter";

/**
 * EXPO_PUBLIC_API_URL se toma de .env 
 */
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

// Convierte cada response de snake_case 
apiClient.interceptors.response.use((response) => {
  if (response.data) {
    response.data = keysToCamelCase(response.data);
  }
  return response;
});

// Flag simple para evitar loops de refresh concurrentes
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];

/**
 * Intenta refrescar el access token cuando el backend devuelve 401.
 * Path en AuthController.java POST /auth/refresh
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        // Espera a que termine el refresh en curso
        await new Promise<void>((resolve) => pendingQueue.push(resolve));
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
        pendingQueue.forEach((resolve) => resolve());
        pendingQueue = [];

        return apiClient(originalRequest);
      } catch (refreshError) {
        await tokenStorage.clear();
        pendingQueue = [];
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);
