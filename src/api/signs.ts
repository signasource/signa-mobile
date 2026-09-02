import { apiClient } from "./client";

/** Mirrors SignSummaryResponse.java (signa-api SignController). */
export interface SignSummary {
  id: string;
  meaning: string;
  description: string | null;
  handedness: string;
  animationUrl: string | null;
}

interface SignsPage {
  content: SignSummary[];
}

/**
 * Mirrors SignController.java. `query` matches signs whose `meaning`
 * *contains* it (case-insensitive), not an exact match — see
 * SignService.getSignsCatalog.
 */
export const signsApi = {
  getSigns: (signLanguageId: string, query?: string) =>
    apiClient.get<SignsPage>("/signs", { params: { signLanguageId, query } }),
};
