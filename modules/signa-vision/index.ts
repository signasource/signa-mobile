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

import { requireNativeViewManager } from "expo-modules-core";
import * as React from "react";
import type { ViewStyle } from "react-native";

/** Lo que el lado nativo informa dos veces por segundo. */
export interface FrameNativo {
  fps: number;
  manosMs: number;
  poseMs: number;
  manos: number;
  cuerpo: boolean;
}

interface ReconocedorProps {
  style?: ViewStyle;
  activo?: boolean;
  mostrarEsqueleto?: boolean;
  /** Sólo para probar en emulador, donde la frontal puede no dar cuadros. */
  usarTrasera?: boolean;
  alFrame?: (e: { nativeEvent: FrameNativo }) => void;
  alListo?: (e: { nativeEvent: { listo: boolean; error?: string } }) => void;
}

const VistaNativa = requireNativeViewManager<ReconocedorProps>("SignaVision");

/**
 * Cámara, detección y esqueleto, todo nativo.
 *
 * No recibe ni devuelve landmarks: el esqueleto lo dibuja la propia vista y a
 * JS sólo le llegan métricas. Cruzar 75 puntos por cuadro sería pagar en el
 * puente lo que se ahorró en la detección.
 */
export function ReconocedorNativo(props: ReconocedorProps) {
  return React.createElement(VistaNativa, props);
}
