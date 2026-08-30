import { apiClient } from "./client";

/** Presigned download URL for a sign's `.glb` animation. Snake_case is converted by the client. */
export interface SignAnimation {
  signId: string;
  animationUrl: string;
  expiresInSeconds: number;
}

export const signsApi = {
  getAnimation: (meaning: string) =>
    apiClient.get<SignAnimation>(`/signs/${encodeURIComponent(meaning)}/animation`),
};
