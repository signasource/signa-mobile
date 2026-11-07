import { useEffect, useState } from "react";
import { getGlbUrl, getLateralMp4Url, getMp4Url } from "./glbUrl";

/**
 * Qué asset hay para una seña en R2. Una seña puede venir como animación 3D
 * (`.glb`) o como video (`.mp4`); el video puede además traer una toma lateral.
 */
export type SignMedia =
  | { kind: "loading" }
  | { kind: "glb"; url: string }
  | { kind: "video"; url: string; lateralUrl: string | null }
  | { kind: "missing" };

/** Un media ya resuelto (todo menos `loading`). */
export type ResolvedSignMedia = Exclude<SignMedia, { kind: "loading" }>;

/** HEAD al bucket público: en RN `fetch` usa red nativa, sin las reglas CORS del navegador. */
async function exists(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Resuelve el asset de una seña: busca `{meaning}.glb` y `{meaning}.mp4` en R2.
 * Si hay `.glb`, gana (es el caso habitual). Si sólo hay `.mp4`, además busca
 * la toma lateral `{meaning}_lateral.mp4` para ofrecer el botón de "ver lateral".
 */
export async function resolveSignMedia(meaning: string): Promise<ResolvedSignMedia> {
  const glbUrl = getGlbUrl(meaning);
  const mp4Url = getMp4Url(meaning);
  const [hasGlb, hasMp4] = await Promise.all([exists(glbUrl), exists(mp4Url)]);

  if (hasGlb) return { kind: "glb", url: glbUrl };
  if (hasMp4) {
    const hasLateral = await exists(getLateralMp4Url(meaning));
    return {
      kind: "video",
      url: mp4Url,
      lateralUrl: hasLateral ? getLateralMp4Url(meaning) : null,
    };
  }
  return { kind: "missing" };
}

/** Resuelve el asset de una sola seña. Ver {@link resolveSignMedia}. */
export function useSignMedia(meaning: string): SignMedia {
  const [media, setMedia] = useState<SignMedia>({ kind: "loading" });

  useEffect(() => {
    let cancelled = false;
    setMedia({ kind: "loading" });
    resolveSignMedia(meaning).then((m) => {
      if (!cancelled) setMedia(m);
    });
    return () => {
      cancelled = true;
    };
  }, [meaning]);

  return media;
}

/**
 * Resuelve el asset de varias señas a la vez (carruseles, match). Devuelve un
 * array alineado por índice con `meanings`; cada slot empieza en `loading`.
 */
export function useSignMediaList(meanings: string[]): SignMedia[] {
  // La clave es el contenido, no la identidad del array: los callers lo
  // reconstruyen con `.map` en cada render, así que depender del array
  // relanzaría las consultas sin fin. Los nombres de seña no llevan "|".
  const key = meanings.join("|");
  const [list, setList] = useState<SignMedia[]>(() => meanings.map(() => ({ kind: "loading" })));

  useEffect(() => {
    let cancelled = false;
    const names = key ? key.split("|") : [];
    setList(names.map(() => ({ kind: "loading" })));
    Promise.all(names.map(resolveSignMedia)).then((resolved) => {
      if (!cancelled) setList(resolved);
    });
    return () => {
      cancelled = true;
    };
  }, [key]);

  return list;
}
