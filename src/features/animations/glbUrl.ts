const R2_BASE = "https://pub-f40a1de4d1fc46b0b6f07299847c66e0.r2.dev/lsa";

export function getGlbUrl(meaning: string): string {
  return `${R2_BASE}/${encodeURIComponent(meaning)}.glb`;
}

/** Video frontal de la seña (algunas señas se renderizan como video en vez de animación 3D). */
export function getMp4Url(meaning: string): string {
  return `${R2_BASE}/${encodeURIComponent(meaning)}.mp4`;
}

/** Toma lateral del video, para ver la seña desde el costado (`{meaning}_lateral.mp4`). */
export function getLateralMp4Url(meaning: string): string {
  return `${R2_BASE}/${encodeURIComponent(meaning)}_lateral.mp4`;
}
