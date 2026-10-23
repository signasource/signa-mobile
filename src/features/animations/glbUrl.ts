const R2_BASE = "https://pub-f40a1de4d1fc46b0b6f07299847c66e0.r2.dev/lsa";

export function getGlbUrl(meaning: string): string {
  return `${R2_BASE}/${encodeURIComponent(meaning)}.glb`;
}
