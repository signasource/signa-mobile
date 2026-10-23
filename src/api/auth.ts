import { apiClient } from "./client";
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResetPasswordRequest,
} from "@/types";

/**
 * Endpoints  contra AuthController.java
 */
export const authApi = {
  // POST /auth/register devuelve los tokens (201): el registro inicia sesion automaticamente.
  register: (payload: RegisterRequest) => apiClient.post<AuthResponse>("/auth/register", payload),

  login: (payload: LoginRequest) => apiClient.post<AuthResponse>("/auth/login", payload),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", { refreshToken }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    apiClient.post<void>("/auth/forgot-password", payload),

  resetPassword: (payload: ResetPasswordRequest) =>
    apiClient.post<void>("/auth/reset-password", payload),
};
