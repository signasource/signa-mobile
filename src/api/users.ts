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
};
