import { apiClient } from "./client";
import {
  AuthResponse,
  ChangePasswordRequest,
  UpdateUsernameRequest,
  UserProfileResponse,
} from "@/types";

/**
 * UserController.java
 */
export const usersApi = {
  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.put<AuthResponse>("/users/password", payload),

  // GET /users/me -> perfil del usuario autenticado (id, email, username, name, role, enabled).
  getMe: () => apiClient.get<UserProfileResponse>("/users/me"),

  // PATCH /users/me -> cambia el username (204 No Content). El name no es editable.
  updateUsername: (payload: UpdateUsernameRequest) =>
    apiClient.patch<void>("/users/me", payload),

  // GET /users/username-availability?username=... (endpoint público)
  checkUsernameAvailability: (username: string, signal?: AbortSignal) =>
    apiClient.get<{ available: boolean }>("/users/username-availability", {
      params: { username },
      signal,
    }),
};
