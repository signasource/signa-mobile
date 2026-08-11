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

// PublicUserProfileResponse.java (UserController: GET /users/{username})
export interface PublicUserProfileResponse {
  id: string;
  username: string;
  name: string;
}

// === Tienda (signa-api rama feature/store-endpoints) ===

// ShopItemType.java
export type ShopItemType =
  | "STREAK_SHIELD"
  | "LIFE"
  | "XP_MULTIPLIER"
  | "UNLIMITED_LIVES"
  | "MYSTERY_CHEST"
  | "GEMS";

// LivesMode.java
export type LivesMode = "INFINITE" | "LIMITED";

// GiftStatus.java
export type GiftStatus = "PENDING" | "CLAIMED" | "EXPIRED";

// ShopItemResponse.java (GET /store/items, GET /store/items/{id})
export interface ShopItemResponse {
  id: string;
  code: string;
  title: string;
  description: string;
  itemType: ShopItemType;
  priceGems: number;
  quantity: number;
  durationMinutes: number | null;
  multiplierValue: number | null;
  active: boolean;
}

// AppliedEffectResponse.java: recompensa concreta aplicada (para MYSTERY_CHEST,
// "type" es el premio resuelto, no el cofre en si)
export interface AppliedEffectResponse {
  type: ShopItemType;
  gemsGranted: number | null;
  livesGranted: number | null;
  streakShieldsGranted: number | null;
  xpMultiplierValue: number | null;
  durationMinutes: number | null;
}

// UserInventoryResponse.java (GET /inventories/me)
export interface UserInventoryResponse {
  gems: number;
  streakShields: number;
  livesMode: LivesMode;
  currentLives: number | null;
  nextLifeAt: string | null;
  effectiveXpMultiplier: number;
  xpMultiplierExpiresAt: string | null;
  xpMultiplierActive: boolean;
  unlimitedLivesExpiresAt: string | null;
  unlimitedLivesActive: boolean;
}

// PurchaseRequest.java (POST /store/purchases)
export interface PurchaseRequest {
  shopItemId: string;
}

// PurchaseResponse.java
export interface PurchaseResponse {
  id: string;
  item: ShopItemResponse;
  gemsSpent: number;
  purchasedAt: string;
  effect: AppliedEffectResponse;
  inventory: UserInventoryResponse;
}

// SendGiftRequest.java (POST /store/gifts)
export interface SendGiftRequest {
  shopItemId: string;
  recipientUserId: string;
  message?: string;
}

// GiftResponse.java
export interface GiftResponse {
  id: string;
  item: ShopItemResponse;
  senderId: string;
  senderUsername: string;
  recipientId: string;
  recipientUsername: string;
  message: string | null;
  status: GiftStatus;
  sentAt: string;
  claimedAt: string | null;
  expiresAt: string | null;
}

// GiftClaimResponse.java (POST /store/gifts/{id}/claim)
export interface GiftClaimResponse {
  gift: GiftResponse;
  effect: AppliedEffectResponse;
  inventory: UserInventoryResponse;
}
