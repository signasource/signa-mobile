const AUTH_ERROR_MAP: Record<string, string> = {
  // Login
  "Invalid credentials": "El usuario o la contraseña son incorrectos",

  // Register
  "Email already in use": "Ese correo ya está registrado",
  "Username already in use": "Ese nombre de usuario ya está en uso",

  // Password flows
  "Invalid or expired token": "El enlace expiró o no es válido. Pedí uno nuevo",
  "New password must be different from current password":
    "La nueva contraseña debe ser distinta a la actual",
  "Current password is incorrect": "La contraseña actual es incorrecta",
  "Password does not meet security requirements":
    "La contraseña debe tener entre 8 y 72 caracteres",

  // Genérico
  "Internal server error": "Ocurrió un error inesperado. Intentá de nuevo",
};

/**
 * Traduce el mensaje crudo del backend al español para mostrarlo al usuario.
 * Si no hay mapeo, devuelve el fallback (nunca el string inglés crudo).
 */
export function mapAuthError(err: unknown, fallback: string): string {
  const raw =
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? null;
  if (raw && AUTH_ERROR_MAP[raw]) return AUTH_ERROR_MAP[raw];
  return fallback;
}
