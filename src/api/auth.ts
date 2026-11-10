import { apiClient } from "./client";
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationEmailRequest,
  GoogleAuthRequest,
  ResetPasswordRequest,
  VerifyEmailRequest,
} from "@/types";

/**
 * Endpoints  contra AuthController.java
 */
export const authApi = {
  // POST /auth/register devuelve los tokens (201): el registro inicia sesion automaticamente.
  register: (payload: RegisterRequest) => apiClient.post<AuthResponse>("/auth/register", payload),

  login: (payload: LoginRequest) => apiClient.post<AuthResponse>("/auth/login", payload),

  // POST /auth/google: login y registro en uno (crea la cuenta si el correo no existe).
  google: (payload: GoogleAuthRequest) => apiClient.post<AuthResponse>("/auth/google", payload),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", { refreshToken }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    apiClient.post<void>("/auth/forgot-password", payload),

  resetPassword: (payload: ResetPasswordRequest) =>
    apiClient.post<void>("/auth/reset-password", payload),

  verifyEmail: (payload: VerifyEmailRequest) =>
    apiClient.post<void>("/auth/verify-email", payload),

  resendVerificationEmail: (payload: ResendVerificationEmailRequest) =>
    apiClient.post<void>("/auth/resend-verification-email", payload),
};
