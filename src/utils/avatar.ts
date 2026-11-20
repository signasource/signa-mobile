import { API_URL } from "@/api/client";

/** Full URL of a profile photo from the path the API sends; null when the user has none. */
export function avatarUri(avatarUrl?: string | null): string | null {
  return avatarUrl ? `${API_URL}${avatarUrl}` : null;
}
