import { apiClient } from "./client";
import {
  AuthResponse,
  ForgotPasswordRequest,
  LoginRequest,
  RegisterRequest,
  ResendVerificationEmailRequest,
  ResetPasswordRequest,
} from "@/types";

/**
 * Endpoints  contra AuthController.java 
 */
export const authApi = {
  register: (payload: RegisterRequest) => apiClient.post<void>("/auth/register", payload),

  login: (payload: LoginRequest) => apiClient.post<AuthResponse>("/auth/login", payload),

  refresh: (refreshToken: string) =>
    apiClient.post<AuthResponse>("/auth/refresh", { refreshToken }),

  // GET /auth/verify?token=...
  verifyEmail: (token: string) => apiClient.get<void>("/auth/verify", { params: { token } }),

  forgotPassword: (payload: ForgotPasswordRequest) =>
    apiClient.post<void>("/auth/forgot-password", payload),

  // El token va como query param, separado del body
  resetPassword: (payload: ResetPasswordRequest, token: string) =>
    apiClient.post<void>("/auth/reset-password", payload, { params: { token } }),

  resendVerificationEmail: (payload: ResendVerificationEmailRequest) =>
    apiClient.post<void>("/auth/resend-verification-email", payload),
};
