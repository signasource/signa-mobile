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

  /**
   * Batched, exact-meaning lookup of presigned animation URLs. Mirrors
   * SignController.getSignAnimations: meanings with no matching sign, or no
   * animation uploaded, are simply absent from the response.
   */
  getSignAnimations: (meanings: string[]) =>
    apiClient.post<Record<string, string>>("/signs/animations", { meanings }),
};
