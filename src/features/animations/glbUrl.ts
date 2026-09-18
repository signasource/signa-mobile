const R2_BASE = "https://pub-f40a1de4d1fc46b0b6f07299847c66e0.r2.dev/lsa";

/**
 * Origen alternativo de los .glb, para probar otra versión de los archivos sin
 * tocar el bucket: por ejemplo los mismos avatares con las texturas en KTX2.
 * Si no responde, el avatar cae al bucket de siempre.
 */
const BASE_PRUEBA = process.env.EXPO_PUBLIC_GLB_BASE ?? "";

export function getGlbUrl(meaning: string): string {
  const base = BASE_PRUEBA || R2_BASE;
  return `${base}/${encodeURIComponent(meaning)}.glb`;
}

/** El del bucket, siempre. Se usa como respaldo del de prueba. */
export function getGlbUrlOficial(meaning: string): string {
  return `${R2_BASE}/${encodeURIComponent(meaning)}.glb`;
}
