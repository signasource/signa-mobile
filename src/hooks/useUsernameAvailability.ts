import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { usersApi } from "@/api/users";
import { USERNAME_REGEX } from "@/utils/validation";

export type UsernameStatus =
  | "idle" // vacío, sin nada que validar
  | "invalid" // no cumple el formato local (evitamos pegarle al backend)
  | "checking" // consulta en vuelo
  | "available"
  | "taken"
  | "error"; // fallo de red / servidor

const DEBOUNCE_MS = 450;

export interface UsernameAvailability {
  status: UsernameStatus;
  message: string | null;
}

/**
 * Valida en vivo la disponibilidad de un username.
 *
 * Estrategia "inteligente" para no saturar ni ralentizar:
 *  - Valida el formato localmente antes de tocar la red.
 *  - Debounce: espera a que el usuario deje de tipear.
 *  - Cachea resultados por username ya consultado.
 *  - Cancela la request anterior si el texto cambia (AbortController).
 */
export function useUsernameAvailability(rawUsername: string): UsernameAvailability {
  const username = rawUsername.trim();
  const [status, setStatus] = useState<UsernameStatus>("idle");
  const cache = useRef<Map<string, boolean>>(new Map());

  useEffect(() => {
    if (username.length === 0) {
      setStatus("idle");
      return;
    }
    if (!USERNAME_REGEX.test(username)) {
      setStatus("invalid");
      return;
    }

    // Resultado ya conocido → respuesta instantánea, sin red.
    const cached = cache.current.get(username);
    if (cached !== undefined) {
      setStatus(cached ? "available" : "taken");
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setStatus("checking");
      try {
        const { data } = await usersApi.checkUsernameAvailability(username, controller.signal);
        cache.current.set(username, data.available);
        setStatus(data.available ? "available" : "taken");
      } catch (err) {
        if (axios.isCancel(err)) return; // reemplazada por una consulta más nueva
        setStatus("error");
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [username]);

  return { status, message: MESSAGES[status] };
}

const MESSAGES: Record<UsernameStatus, string | null> = {
  idle: null,
  invalid: "Solo letras, números y _ (mínimo 3 caracteres)",
  checking: "Verificando disponibilidad…",
  available: "¡Usuario disponible!",
  taken: "Ese usuario ya está en uso",
  error: "No se pudo verificar. Reintentá.",
};
