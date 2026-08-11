/**
 * Tipos espejados 1:1 desde los DTOs/entities reales de signa-api
 * (confirmados con el codigo fuente compartido, no ya inferidos).
 */

// Sesion local minima: "email" sale del JWT y "name" es un cache local
// best-effort (ver src/utils/profileCache.ts). Para el perfil completo
// (username, role, id) se usa GET /users/me -> UserProfileResponse.
export interface User {
  email: string;
  name?: string;
}

// Role.java (users/entity): por ahora un unico valor.
export type Role = "USER";

// UserProfileResponse.java (users/dto): lo que devuelve GET /users/me.
// record UserProfileResponse(UUID id, String email, String username,
//   String name, Role role, boolean enabled)
export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  name: string;
  role: Role;
  enabled: boolean;
}

// UpdateUsernameRequest.java (users/dto): body de PATCH /users/me.
// El back solo permite cambiar el username (no el name). @Size(3,50) + @Pattern.
export interface UpdateUsernameRequest {
  username: string;
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

// RegisterRequest.java: email, username, password, name
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name: string;
}

// RefreshTokenRequest.java
export interface RefreshTokenRequest {
  refreshToken: string;
}

// ForgotPasswordRequest.java - confirmado: { email }
export interface ForgotPasswordRequest {
  email: string;
}

// ResetPasswordRequest.java - confirmado: solo trae la nueva contrasena
// (el token va aparte, como @RequestParam en el controller).
export interface ResetPasswordRequest {
  newPassword: string;
}

// ChangePasswordRequest.java - confirmado: currentPassword + newPassword
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ResendVerificationEmailRequest.java - se asume { email } por analogia con ForgotPasswordRequest.
export interface ResendVerificationEmailRequest {
  email: string;
}

// ErrorResponse.java: public record ErrorResponse(String message, int status, long timestamp)
export interface ApiErrorResponse {
  message: string;
  status: number;
  timestamp: number;
}
