import { Image } from "react-native";
import { signsApi } from "@/api/signs";
import { BlockType, LessonContentBlock, parseBlockConfig } from "./lessonContent.types";

/**
 * Meaning -> animation URL, shared across the app for the lifetime of the
 * process. `null` means "looked up, no animation found" (still cached, so we
 * don't refetch on every lesson).
 */
const animationUrlCache = new Map<string, string | null>();

export function getCachedAnimationUrl(meaning: string): string | null | undefined {
  return animationUrlCache.get(meaning);
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

async function fetchAnimationUrl(signLanguageId: string, meaning: string): Promise<string | null> {
  const res = await signsApi.getSigns(signLanguageId, meaning);
  const exact = res.data.content.find((s) => s.meaning.toLowerCase() === meaning.toLowerCase());
  return (exact ?? res.data.content[0])?.animationUrl ?? null;
}

/**
 * Fetches (and caches) the animation URL for every sign meaning used by the
 * lesson's blocks, then best-effort prefetches each asset. Meant to be
 * kicked off as soon as a lesson starts, without blocking the UI: failures
 * per-sign are swallowed so one missing/broken animation doesn't stop the
 * rest from preloading.
 */
export async function preloadLessonAnimations(
  signLanguageId: string,
  blocks: LessonContentBlock[]
): Promise<void> {
  const pending = collectSignMeanings(blocks).filter((meaning) => !animationUrlCache.has(meaning));

  await Promise.all(
    pending.map(async (meaning) => {
      try {
        const url = await fetchAnimationUrl(signLanguageId, meaning);
        animationUrlCache.set(meaning, url);
        if (url) {
          await Image.prefetch(url).catch(() => {});
        }
      } catch {
        animationUrlCache.set(meaning, null);
      }
    })
  );
}
