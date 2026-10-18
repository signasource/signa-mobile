const CHALLENGE_CLAIM_ERROR_MAP: Record<string, string> = {
  // ChallengeService.claim (signa-api)
  "Challenge has expired": "Este desafío ya venció. Fijate en los de hoy.",
  "Reward already claimed": "Ya reclamaste esta recompensa.",
  "Challenge is not completed yet": "Todavía no completaste este desafío.",
  "Challenge not found": "Este desafío ya no está disponible.",

  // Genérico
  "Internal server error": "Ocurrió un error inesperado. Intentá de nuevo",
};

/**
 * Traduce el error de `POST /challenges/{id}/claim` al español para mostrarlo
 * al usuario. Si no hay mapeo, devuelve el fallback (nunca el string inglés crudo).
 */
export function mapChallengeClaimError(err: unknown, fallback: string): string {
  const raw =
    (err as { response?: { data?: { message?: string } } })?.response?.data
      ?.message ?? null;
  if (raw && CHALLENGE_CLAIM_ERROR_MAP[raw]) return CHALLENGE_CLAIM_ERROR_MAP[raw];
  return fallback;
}
