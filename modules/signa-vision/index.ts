import { requireNativeModule } from "expo-modules-core";

/**
 * Espiga del reconocimiento nativo. Ver el módulo Kotlin para el porqué.
 *
 * Devuelve milisegundos por detección, medidos con los mismos modelos que hoy
 * corren como WASM dentro del WebView.
 */
export interface ResultadoBanco {
  delegado: string;
  vueltas: number;
  calentamientoPoseMs: number;
  calentamientoManosMs: number;
  poseMs: number;
  manosMs: number;
  poseMsMin: number;
  manosMsMin: number;
}

const nativo = requireNativeModule("SignaVision");

export function banco(vueltas = 30, enGpu = true): Promise<ResultadoBanco> {
  return nativo.banco(vueltas, enGpu);
}
