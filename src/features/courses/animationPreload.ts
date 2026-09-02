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

    await Promise.all(
      pending.map(async (meaning) => {
        const url = urlsByMeaning[meaning] ?? null;
        animationUrlCache.set(meaning, url);
        if (url) {
          await Image.prefetch(url).catch(() => {});
        }
      })
    );
  } catch {
    pending.forEach((meaning) => animationUrlCache.set(meaning, null));
  }
}
