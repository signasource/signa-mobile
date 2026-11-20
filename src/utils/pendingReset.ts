import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Restablecimiento de contraseña en curso. El usuario sale de Signa a leer el código en su
 * mail y el SO puede matar la app mientras tanto; al volver, la guardamos para reabrir
 * directo en la pantalla de ingresar el código (en vez de la bienvenida).
 * Solo guarda el email (no sensible) y cuándo vence el código.
 */
const KEY = "signa_pending_password_reset";

// Mismo TTL que el código del backend (15 min).
const CODE_TTL_MS = 15 * 60 * 1000;

interface PendingReset {
  email: string;
  expiresAt: number;
}

export const pendingReset = {
  /** Registra que se envió un código a `email` (también al reenviar: reinicia el plazo). */
  async save(email: string): Promise<void> {
    const value: PendingReset = { email, expiresAt: Date.now() + CODE_TTL_MS };
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      // Mejor esfuerzo: sin persistencia el flujo sigue andando mientras la app esté viva.
    }
  },

  /** Email del restablecimiento pendiente, o null si no hay o el código ya venció. */
  async get(): Promise<string | null> {
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<PendingReset>;
      if (typeof parsed.email === "string" && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now()) {
        return parsed.email;
      }
    } catch {
      // JSON corrupto o storage no disponible: se trata como "no hay nada pendiente".
    }
    await pendingReset.clear();
    return null;
  },

  async clear(): Promise<void> {
    try {
      await AsyncStorage.removeItem(KEY);
    } catch {
      // Mejor esfuerzo.
    }
  },
};
