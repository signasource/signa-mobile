import { apiClient } from "./client";
import { AuthResponse, ChangePasswordRequest, PublicUserProfileResponse } from "@/types";

export interface UserProfileResponse {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
  enabled: boolean;
}

export interface UpdateUsernameRequest {
  username: string;
}

/**
 * UserController.java
 */
export const usersApi = {
  changePassword: (payload: ChangePasswordRequest) =>
    apiClient.put<AuthResponse>("/users/password", payload),

  // GET /users/username-availability?username=... (endpoint público)
  checkUsernameAvailability: (username: string, signal?: AbortSignal) =>
    apiClient.get<{ available: boolean }>("/users/username-availability", {
      params: { username },
      signal,
    }),

  getMe: () => apiClient.get<UserProfileResponse>("/users/me"),

  updateUsername: (payload: UpdateUsernameRequest) =>
    apiClient.patch<void>("/users/me", payload),

  deleteMe: () => apiClient.delete<void>("/users/me"),

  getByUsername: (username: string) =>
    apiClient.get<PublicUserProfileResponse>(`/users/${username}`),
};
