/**
 * Reglas de validación compartidas por las pantallas de auth.
 *
 * Antes estaban repartidas y divergentes: `checkPassword` vivía dentro de
 * RegisterScreen, ResetPassword validaba con un `< 8` inline, el regex de email
 * estaba inline en ForgotPassword y el de username dentro del hook. Centralizar
 * acá evita que cada pantalla invente su propio criterio.
 */

// Mismo criterio que UserController.checkUsernameAvailability (@Size 3-50, @Pattern).
export const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/;

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export function isValidUsername(value: string): boolean {
  return USERNAME_REGEX.test(value.trim());
}

export type PasswordRules = {
  length: boolean;
  uppercase: boolean;
  lowercase: boolean;
  digit: boolean;
  special: boolean;
};

export function checkPassword(password: string): PasswordRules {
  return {
    length: password.length >= 8 && password.length <= 72,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    digit: /[0-9]/.test(password),
    special: /[^a-zA-Z0-9]/.test(password),
  };
}

export function isPasswordValid(password: string): boolean {
  return Object.values(checkPassword(password)).every(Boolean);
}
