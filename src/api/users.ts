import { apiClient } from "./client";
import { AuthResponse, ChangePasswordRequest } from "@/types";

/**
 * UserController.java
 *
 * El perfil que se muestra en la app sale del email decodificado
 * del JWT.
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
};
