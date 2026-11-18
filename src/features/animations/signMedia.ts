import { useSyncExternalStore } from "react";
import { signsApi, type SignMedia } from "@/api/signs";
import { getGlbUrl, getGlbUrlOficial } from "./glbUrl";

/**
 * Qué archivo muestra cada seña: el que subieron desde el panel de admins
 * (un .glb o un .mp4), o el .glb de siempre armado con el nombre.
 *
 * Las señas se piden de a lotes a POST /signs/media y quedan en memoria
 * mientras la app está abierta. Una seña sin archivo subido, o una consulta que
 * falla, cae al .glb por nombre: así nada deja de verse si la API no responde.
 */

export type SignSource = { url: string; format: "glb" | "mp4"; lateralUrl?: string | null };

type Entry = SignSource | "fallback" | "pending";

const MAX_POR_PEDIDO = 200;
/** Cuánto se espera la respuesta antes de mostrar el .glb por nombre. */
const ESPERA_MAXIMA_MS = 2500;

const entradas = new Map<string, Entry>();
const oyentes = new Set<() => void>();
let porPedir = new Set<string>();
let programado = false;
let version = 0;

function avisar() {
  version++;
  oyentes.forEach((o) => o());
}

/**
 * El .glb original del bucket, nunca re-subido: se sigue armando con getGlbUrl
 * para que EXPO_PUBLIC_GLB_BASE (el origen de prueba) siga funcionando.
 */
function esElDeSiempre(meaning: string, media: SignMedia): boolean {
  if (media.format !== "glb" || media.url.includes("?")) return false;
  try {
    return decodeURI(media.url) === decodeURI(getGlbUrlOficial(meaning));
  } catch {
    return false;
  }
}

function fallback(meaning: string): SignSource {
  return { url: getGlbUrl(meaning), format: "glb" };
}

async function pedir(lote: string[]) {
  const vencido = setTimeout(() => {
    let cambio = false;
    for (const m of lote) {
      if (entradas.get(m) === "pending") {
        entradas.set(m, "fallback");
        cambio = true;
      }
    }
    if (cambio) avisar();
  }, ESPERA_MAXIMA_MS);
  try {
    const { data } = await signsApi.getMedia(lote);
    const porNombre = new Map<string, SignMedia>(data.map((m) => [m.meaning, m]));
    for (const m of lote) {
      const media = porNombre.get(m);
      entradas.set(
        m,
        media && !esElDeSiempre(m, media)
          ? { url: media.url, format: media.format, lateralUrl: media.lateralUrl }
          : "fallback",
      );
    }
  } catch {
    // Sin red o API caída: lo de siempre. No se reintenta hasta reabrir la app.
    for (const m of lote) if (entradas.get(m) === "pending") entradas.set(m, "fallback");
  } finally {
    clearTimeout(vencido);
    avisar();
  }
}

function despachar() {
  programado = false;
  const todas = [...porPedir];
  porPedir = new Set();
  for (let i = 0; i < todas.length; i += MAX_POR_PEDIDO) void pedir(todas.slice(i, i + MAX_POR_PEDIDO));
}

/** Pide (una sola vez) las señas que todavía no se conocen; se agrupan en un lote. */
export function precargarSignMedia(meanings: string[]) {
  let nuevas = false;
  for (const m of meanings) {
    if (!m || entradas.has(m)) continue;
    entradas.set(m, "pending");
    porPedir.add(m);
    nuevas = true;
  }
  if (nuevas && !programado) {
    programado = true;
    queueMicrotask(despachar);
  }
}

/** La fuente ya resuelta, o `null` mientras se está preguntando. */
export function fuenteDeSena(meaning: string): SignSource | null {
  const e = entradas.get(meaning);
  if (e === undefined || e === "pending") return null;
  return e === "fallback" ? fallback(meaning) : e;
}

/**
 * Las fuentes de varias señas, en orden. `null` en un lugar = todavía se está
 * preguntando por esa. Se vuelve a dibujar cuando llega la respuesta.
 */
export function useSignSources(meanings: string[]): (SignSource | null)[] {
  precargarSignMedia(meanings);
  useSyncExternalStore(
    (o) => {
      oyentes.add(o);
      return () => oyentes.delete(o);
    },
    () => version,
  );
  return meanings.map(fuenteDeSena);
}

export function useSignSource(meaning: string): SignSource | null {
  return useSignSources([meaning])[0] ?? null;
}

/** Para MultiAvatarNativo y compañía, que esperan una URL por lugar ("" = vacío). */
export function urlsDeSenas(fuentes: (SignSource | null)[]): string[] {
  return fuentes.map((f) => f?.url ?? "");
}

export function esVideo(url: string): boolean {
  return /\.mp4(\?|$)/i.test(url);
}
