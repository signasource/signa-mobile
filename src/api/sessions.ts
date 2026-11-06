import { apiClient } from "@/api/client";

/**
 * App-usage session telemetry. Reports a foreground session (start + duration) for the signed-in
 * user; the client converts the body to snake_case. Backs the "sesiones por usuario" and "duración
 * promedio de sesión" admin metrics.
 */
export const sessionsApi = {
  record: (startedAt: string, durationSeconds: number) =>
    apiClient.post<void>("/sessions", { startedAt, durationSeconds }),
};
