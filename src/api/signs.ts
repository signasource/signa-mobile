import { apiClient } from "./client";

/** Mirrors SignSummaryResponse.java (signa-api SignController). */
export interface SignSummary {
  id: string;
  meaning: string;
  description: string | null;
  handedness: string;
  animationUrl: string | null;
  youtubeUrl: string | null;
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
   * Mirrors SignController#getSignMedia: dónde cargar la animación de cada seña,
   * tal como la subieron desde el panel de admins (.glb o .mp4). Las que no
   * tienen archivo o no existen no vienen en la lista.
   */
  getMedia: (meanings: string[]) =>
    apiClient.post<SignMedia[]>("/signs/media", { meanings }),
};

/** Mirrors SignMediaResponse.java. `meaning` vuelve tal cual se pidió. */
export interface SignMedia {
  meaning: string;
  url: string;
  format: "glb" | "mp4";
  /** Video lateral de una seña en .mp4; null si no tiene. */
  lateralUrl: string | null;
}

export type ReportReason =
  | "INCORRECT_SIGN"
  | "UNCLEAR_ANIMATION"
  | "WRONG_MEANING"
  | "MISSING_CONTEXT"
  | "REGIONAL_VARIANT"
  | "TECHNICAL_PROBLEM"
  | "OTHER";

export interface CreateSignReportRequest {
  signMeaning: string;
  reason: ReportReason;
  description?: string;
}

export const signReportsApi = {
  createReport: (req: CreateSignReportRequest) =>
    apiClient.post("/sign-reports", req),
};
