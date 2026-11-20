const AUTH_ERROR_MAP: Record<string, string> = {
  // Login
  "Invalid credentials": "El usuario o la contraseña son incorrectos",

  // Google
  "Invalid Google token": "No pudimos verificar tu cuenta de Google. Probá de nuevo",
  "Authentication failed": "No se pudo iniciar sesión con esa cuenta",

  "Google account already linked": "Ya vinculaste una cuenta de Google",
  "Google account already in use": "Esa cuenta de Google ya está asociada a otro usuario de Signa",

  // Register
  "Email already in use": "Ese correo ya está registrado",
  "Username already in use": "Ese nombre de usuario ya está en uso",

  // Password flows
  "Invalid or expired token": "El enlace expiró o no es válido. Pedí uno nuevo",
  "Invalid or expired code": "El código no es válido o venció. Pedí uno nuevo",
  "New password must be different from current password":
    "La nueva contraseña debe ser distinta a la actual",
  "Current password is incorrect": "La contraseña actual es incorrecta",
  "Password does not meet security requirements":
    "La contraseña debe tener entre 8 y 72 caracteres",

  // Genérico
  "Too many requests": "Hiciste demasiados intentos. Esperá unos minutos y volvé a probar",
  "Internal server error": "Ocurrió un error inesperado. Intentá de nuevo",
};

/**
 * Errores de validacion de campo (Jakarta Bean Validation). El back los devuelve
 * como "<campo>: <mensaje en ingles>" (GlobalExceptionHandler, solo el primero),
 * p. ej. `name: must match "^[\p{L} .'-]+$"` cuando ponen un numero en el nombre.
 * Traducimos por campo + tipo de regla para decir el error concreto, no un generico.
 */
function translateFieldError(field: string, detail: string): string | null {
  const isPattern = /match/i.test(detail);
  const isSize = /size|between/i.test(detail);
  const isBlank = /blank|empty|null/i.test(detail);

  switch (field) {
    case "email":
      return "Ingresá un correo electrónico válido";
    case "name":
    case "lastName": {
      const noun = field === "name" ? "nombre" : "apellido";
      const Noun = field === "name" ? "El nombre" : "El apellido";
      if (isBlank) return `Ingresá tu ${noun}`;
      if (isPattern) return `${Noun} solo puede contener letras`;
      if (isSize) return `${Noun} debe tener entre 2 y 100 caracteres`;
      return `Revisá el ${noun}`;
    }
    case "username":
      if (isBlank) return "Ingresá un nombre de usuario";
      if (isPattern) return "El usuario solo puede tener letras, números y guión bajo";
      if (isSize) return "El usuario debe tener entre 3 y 50 caracteres";
      return "Revisá el nombre de usuario";
    case "password":
      return "La contraseña debe tener entre 8 y 72 caracteres";
    case "identifier":
      return "Ingresá tu correo o usuario";
    default:
      return null;
  }
}

/**
 * Traduce el mensaje crudo del backend al español para mostrarlo al usuario.
 * Si no hay mapeo, devuelve el fallback (nunca el string inglés crudo).
 */
export function mapAuthError(err: unknown, fallback: string): string {
  const raw =
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? null;
  if (raw) {
    if (AUTH_ERROR_MAP[raw]) return AUTH_ERROR_MAP[raw];
    // Errores de validacion por campo: "<campo>: <mensaje>".
    const fieldError = /^(\w+):\s*(.+)$/.exec(raw);
    if (fieldError) {
      const translated = translateFieldError(fieldError[1], fieldError[2]);
      if (translated) return translated;
    }
  }
  if (__DEV__) {
    const e = err as { message?: string; response?: { status?: number } };
    console.warn("[authErrors] unmapped error", { status: e?.response?.status, raw, message: e?.message });
  }
  return fallback;
}
