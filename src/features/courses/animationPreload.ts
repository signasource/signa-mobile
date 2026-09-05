import { signsApi } from "@/api/signs";
import { BlockType, LessonContentBlock, parseBlockConfig } from "./lessonContent.types";

/**
 * Meaning → presigned URL from the API. `null` = looked up, no animation.
 * Undefined = not yet looked up.
 */
const animationUrlCache = new Map<string, string | null>();

/**
 * Meaning → GLB data URL (`data:model/gltf-binary;base64,…`).
 * Populated by `preloadLessonAnimations` after the binary is downloaded.
 * Preferred over the presigned URL so the WebView needs no network request.
 */
const glbDataCache = new Map<string, string>();

/**
 * Returns the best available URL for a meaning:
 * - A data URL (GLB already downloaded, WebView renders from memory)
 * - Or the presigned URL (WebView will fetch from R2)
 * - Or null/undefined while still loading
 */
export function getCachedAnimationUrl(meaning: string): string | null | undefined {
  return glbDataCache.get(meaning) ?? animationUrlCache.get(meaning);
}

function arrayBufferToDataUrl(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1024) {
    binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + 1024, bytes.length)));
  }
  return `data:model/gltf-binary;base64,${btoa(binary)}`;
}

async function downloadGlb(meaning: string, url: string): Promise<void> {
  if (glbDataCache.has(meaning)) return;
  try {
    const response = await fetch(url);
    if (!response.ok) return;
    const buffer = await response.arrayBuffer();
    glbDataCache.set(meaning, arrayBufferToDataUrl(buffer));
  } catch {
    // Network error — keep presigned URL as fallback, don't cache failure
  }
}

/**
 * Which of a block's config strings are sign *meanings* that need an
 * animation, per block type:
 * - INFO: none.
 * - SELECT_MEANING: `sign` is the meaning shown as an animation.
 * - SELECT_SIGN / CONTEXT_RESPONSE: `options` are shown as animations.
 * - MATCH: `concepts` are shown as animations.
 * - VISUAL_RECOGNITION: `sign_sequence` is shown as animations (`options`
 *   are plain text labels, not animated).
 */
export function collectSignMeanings(blocks: LessonContentBlock[]): string[] {
  const meanings = new Set<string>();

  for (const block of blocks) {
    switch (block.type as BlockType) {
      case "INTRODUCE_SIGN":
        meanings.add(parseBlockConfig<"INTRODUCE_SIGN">(block).meaning);
        break;
      case "SELECT_MEANING":
        meanings.add(parseBlockConfig<"SELECT_MEANING">(block).sign);
        break;
      case "SELECT_SIGN":
        parseBlockConfig<"SELECT_SIGN">(block).options.forEach((m) => meanings.add(m));
        break;
      case "CONTEXT_RESPONSE":
        parseBlockConfig<"CONTEXT_RESPONSE">(block).options.forEach((m) => meanings.add(m));
        break;
      case "MATCH":
        parseBlockConfig<"MATCH">(block).concepts.forEach((m) => meanings.add(m));
        break;
      case "VISUAL_RECOGNITION":
        parseBlockConfig<"VISUAL_RECOGNITION">(block).sign_sequence.forEach((m) => meanings.add(m));
        break;
    }
  }

  return [...meanings];
}

/**
 * Fetches (and caches) the animation URL for every sign meaning used by the
 * lesson's blocks in a single batched request, then best-effort prefetches
 * each asset. Meant to be kicked off as soon as a lesson starts, without
 * blocking the UI: a failed request just leaves those meanings uncached, so
 * `SignAnimation` falls back to the placeholder instead of breaking the
 * lesson.
 */
export async function preloadLessonAnimations(blocks: LessonContentBlock[]): Promise<void> {
  const pending = collectSignMeanings(blocks).filter((meaning) => !animationUrlCache.has(meaning));
  if (pending.length === 0) return;

  try {
    const res = await signsApi.getSignAnimations(pending);
    const urlsByMeaning = res.data;

    // Store presigned URLs immediately so components can render a fallback
    // while the binary downloads in the background.
    const toDownload: Array<{ meaning: string; url: string }> = [];
    for (const meaning of pending) {
      const url = urlsByMeaning[meaning] ?? null;
      animationUrlCache.set(meaning, url);
      if (url) toDownload.push({ meaning, url });
    }

    // Download GLB binaries in parallel and store as data URLs.
    // WebViews that use getCachedAnimationUrl after this completes will find
    // the data URL and skip any network request entirely.
    await Promise.all(toDownload.map(({ meaning, url }) => downloadGlb(meaning, url)));
  } catch {
    pending.forEach((meaning) => animationUrlCache.set(meaning, null));
  }
}
