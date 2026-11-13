/**
 * Tipos espejados 1:1 desde los DTOs/entities reales de signa-api
 * (confirmados con el codigo fuente compartido, no ya inferidos).
 */

// No hay entidad de usuario expuesta por API en ningun lado (ni AuthResponse,
// ni el JWT, ni un endpoint de perfil). "email" es lo unico que se puede
// obtener con certeza (del JWT). "name" es un cache local best-effort
// (ver src/utils/profileCache.ts) que se completa cuando el usuario se
// registra en ESTE dispositivo. "role" e "id" no estan disponibles en el
// front hoy - existen en User.java del back pero no se exponen todavia.
export interface User {
  email: string;
  name?: string;
}

// AuthResponse.java: public record AuthResponse(String accessToken, String refreshToken)
// OJO: no trae datos del usuario. El perfil se arma decodificando el JWT.
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
}

// LoginRequest.java
export interface LoginRequest {
  identifier: string;
  password: string;
}

// RegisterRequest.java: email, username, password, name, lastName
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name: string;
  lastName: string;
  /** Daily goal (min) from the onboarding survey; applied only when the account is created. */
  dailyGoalMinutes?: number;
}

// RefreshTokenRequest.java
export interface RefreshTokenRequest {
  refreshToken: string;
}

// ForgotPasswordRequest.java - confirmado: { email }
export interface ForgotPasswordRequest {
  email: string;
}

// GoogleAuthRequest.java: ID token de Google (audience = GOOGLE_CLIENT_ID del back, el client ID "web").
export interface GoogleAuthRequest {
  idToken: string;
  /** Onboarding daily goal (min); the backend applies it only if this call creates the account. */
  dailyGoalMinutes?: number;
}

// ResetPasswordRequest.java - confirmado: email + codigo de 6 digitos del mail + nueva contrasena.
export interface ResetPasswordRequest {
  email: string;
  code: string;
  newPassword: string;
}

// VerifyEmailRequest.java / ResendVerificationEmailRequest.java - confirmado: email + codigo de 6 digitos.
export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface ResendVerificationEmailRequest {
  email: string;
}

// ChangePasswordRequest.java - confirmado: currentPassword + newPassword
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ErrorResponse.java: public record ErrorResponse(String message, int status, long timestamp)
export interface ApiErrorResponse {
  message: string;
  status: number;
  timestamp: number;
}
