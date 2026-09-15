/**
 * TEMPORAL — sólo en la rama de diagnóstico, no va a develop.
 *
 * Manda el reparto de tiempo de cada frame a un colector que corre en la
 * máquina de desarrollo. Existe porque "va lento" no se puede diagnosticar
 * mirando una pantalla: hace falta saber cuál de las etapas —detección de
 * manos, de pose, inferencia— se está comiendo el presupuesto, y eso sólo se
 * ve con números de un teléfono real.
 *
 * Se manda en lotes para no gastar en red lo que se quiere medir.
 */
const COLECTOR = process.env.EXPO_PUBLIC_METRICS_URL ?? "";

// Marca de compilación: viaja en cada lote para saber, del lado del colector,
// qué APK produjo los datos. Sin esto es imposible distinguir "la métrica nueva
// no funciona" de "el teléfono todavía tiene la APK vieja".
const BUILD = process.env.EXPO_PUBLIC_BUILD ?? "sin-marca";

const LOTE = 25;

export interface MuestraFrame {
  modo: "dinamico" | "estatico";
  fps: number;
  poseMs: number;
  handsMs: number;
  inferMs: number;
  drawFps: number;
  drawMs: number;
  delegado: string;
  body: boolean;
  hands: number;
  resting: boolean;
  progress: number;
  sign: string | null;
  confidence: number;
  targetConfidence: number;
}

let buffer: (MuestraFrame & { t: number })[] = [];
let sesion = "";

function nuevaSesion(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

async function enviar(muestras: unknown[], evento?: string): Promise<void> {
  if (!COLECTOR) return;
  try {
    await fetch(COLECTOR, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sesion, build: BUILD, evento, muestras }),
    });
  } catch {
    // Si el colector no está, la app sigue como si nada.
  }
}

/** Una muestra por frame procesado. Se va acumulando y sale de a lotes. */
export function medir(m: MuestraFrame): void {
  if (!COLECTOR) return;
  if (!sesion) sesion = nuevaSesion();
  buffer.push({ ...m, t: Date.now() });
  if (buffer.length >= LOTE) {
    const lote = buffer;
    buffer = [];
    void enviar(lote);
  }
}

/** Marca un momento con nombre: entrar al ejercicio, acertar, rendirse. */
export function marcar(evento: string, extra?: Record<string, unknown>): void {
  if (!COLECTOR) return;
  if (!sesion) sesion = nuevaSesion();
  void enviar([{ t: Date.now(), ...extra }], evento);
}

/** Al salir del ejercicio se manda lo que haya quedado sin enviar. */
export function cerrarMedicion(): void {
  if (!COLECTOR || !buffer.length) return;
  const lote = buffer;
  buffer = [];
  void enviar(lote, "cierre");
}
