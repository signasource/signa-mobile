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

/**
 * Contrasta ventana + modelo nativos contra las probabilidades que da el
 * pipeline de Python sobre las mismas secuencias. Diferencia esperada: ~0.
 */
export function golden(): Promise<{ peorDiferencia: number; detalle: string; reproduccion: string }> {
  return nativo.golden();
}

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
  delegado: string;
  ancho: number;
  /** Milisegundos de la LSTM. Cero mientras no haya señas que reconocer. */
  inferenciaMs: number;
}

/** Cómo va la seña que se está mirando ahora. */
export interface SenaNativa {
  /** 0 a 1: cuánto le falta a la ventana para poder inferir. */
  progreso: number;
  /** Seña candidata entre las pedidas, o "" si no hay. */
  sena: string;
  /** Probabilidad de esa candidata. */
  p: number;
  /** "reposo" ganando: no se está haciendo ninguna seña. */
  reposo: boolean;
}

interface ReconocedorProps {
  style?: ViewStyle;
  activo?: boolean;
  mostrarEsqueleto?: boolean;
  /** Sólo para probar en emulador, donde la frontal puede no dar cuadros. */
  usarTrasera?: boolean;
  /** Señas que este ejercicio acepta. Vacío = no se infiere nada. */
  objetivos?: string[];
  onFrame?: (e: { nativeEvent: FrameNativo }) => void;
  /** fase: "cuadros" (la cámara entrega), "detectando" (listo), "error". */
  onListo?: (e: { nativeEvent: { fase: string; detalle?: string; error?: string } }) => void;
  onSena?: (e: { nativeEvent: SenaNativa }) => void;
  onConfirmada?: (e: { nativeEvent: { sena: string; p: number } }) => void;
}

const VistaNativa = requireNativeViewManager<ReconocedorProps>("SignaVision", "ReconocedorView");

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

interface AvatarProps {
  style?: ViewStyle;
  /** .glb a mostrar. Se guarda en disco la primera vez. */
  url: string;
  /** Vuelve a la pose neutra y deja de animar. */
  pausado?: boolean;
  /** Arrastrar para girar el avatar. */
  rotable?: boolean;
  onCargado?: (e: {
    nativeEvent: {
      clips: number;
      /** Bajar el .glb y, la primera vez, convertirle las texturas. */
      msArchivo: number;
      /** Armar la escena una vez que el archivo está en memoria. */
      msMontaje: number;
    };
  }) => void;
  onFalla?: (e: { nativeEvent: { error: string } }) => void;
}

const VistaAvatar = requireNativeViewManager<AvatarProps>("SignaVision", "AvatarView");

/**
 * El avatar de la seña con Filament, sin WebView ni runtime bajado de un CDN.
 * Ver AvatarView.kt para el encuadre, que es el mismo que el de la versión web.
 */
export function AvatarNativo(props: AvatarProps) {
  return React.createElement(VistaAvatar, props);
}
