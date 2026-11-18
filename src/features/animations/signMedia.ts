import { useSyncExternalStore } from "react";
import { signsApi, type SignMedia } from "@/api/signs";
import { getGlbUrl, getGlbUrlOficial, getLateralMp4Url, getMp4Url } from "./glbUrl";

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
// "fallback" = sin registro en la API: se sondea el bucket antes de mostrar nada.

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

async function existe(url: string): Promise<boolean> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 4000);
  try {
    const r = await fetch(url, { method: "HEAD", signal: ctl.signal });
    return r.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(t);
  }
}

/**
 * Señas cuyo archivo en el bucket se llama distinto del significado de la lección
 * (el video es `nene.mp4`, la lección enseña "niño"). Espejo de
 * `FILE_NAME_ALIASES` en signa-api (`SignCatalogImporter`): si se agrega uno allá, va acá.
 */
const ALIAS_DE_ARCHIVO: Record<string, string> = {
  "niño": "nene",
  "niña": "nena",
  hoy: "hoy-ahora",
  "comisaría": "policía",
  "mañana": "mañana (día siguiente)",
  "la mañana": "mañana (parte del día)",
};

function claveAlias(s: string): string {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

const ALIAS_NORMALIZADOS = new Map(
  Object.entries(ALIAS_DE_ARCHIVO).map(([k, v]) => [claveAlias(k), v]),
);

/**
 * Seña sin registro en la API: algunas existen solo como .mp4 (hombre, mujer, bebé) o con
 * otro nombre de archivo (niño → nene). Se prueba, en orden: .glb y .mp4 con el nombre
 * de la seña y luego con su alias.
 */
async function resolverPorNombre(meaning: string): Promise<SignSource> {
  const nombres = [meaning];
  const alias = ALIAS_NORMALIZADOS.get(claveAlias(meaning));
  if (alias) nombres.push(alias);
  for (const nombre of nombres) {
    const glb = getGlbUrl(nombre);
    if (await existe(glb)) return { url: glb, format: "glb" };
    const mp4 = getMp4Url(nombre);
    if (await existe(mp4)) {
      const lateral = getLateralMp4Url(nombre);
      return { url: mp4, format: "mp4", lateralUrl: (await existe(lateral)) ? lateral : null };
    }
  }
  return { url: getGlbUrl(meaning), format: "glb" };
}

async function resolverFallbacks(lote: string[]) {
  await Promise.all(
    lote.map(async (m) => {
      if (entradas.get(m) !== "fallback") return;
      const fuente = await resolverPorNombre(m);
      if (entradas.get(m) === "fallback") entradas.set(m, fuente);
    }),
  );
  avisar();
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
  void resolverFallbacks(lote);
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
  if (e === undefined || e === "pending" || e === "fallback") return null;
  return e;
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
