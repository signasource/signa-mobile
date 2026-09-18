import React, { useCallback, useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { FrameNativo, ReconocedorNativo, SenaNativa } from "../../../../modules/signa-vision";
import type { LiveFrame } from "./LiveSignRecognizer";

interface Props {
  targets: string[];
  onFrame?: (frame: LiveFrame) => void;
  onConfirmed?: (sign: string, confidence: number) => void;
  onReady?: (info: { delegate: string }) => void;
  onError?: (mensaje: string) => void;
  active?: boolean;
  paused?: boolean;
  showLandmarks?: boolean;
  style?: ViewStyle;
}

/**
 * El mismo reconocedor de señas dinámicas, sin WebView.
 *
 * Expone la interfaz de LiveSignRecognizer —mismos props, mismo LiveFrame— para
 * que los ejercicios no tengan que enterarse de cuál está abajo. Lo que cambia
 * es dónde corre todo: cámara, MediaPipe, ventana de 258 números y LSTM viven
 * en Kotlin, y por el puente sólo cruzan el resumen del cuadro y la seña
 * confirmada. Medido en el teléfono, la detección pasó de 57-147 ms a ~35.
 *
 * Que la ventana nativa dé exactamente lo mismo que el pipeline de Python no se
 * asume: se comprueba contra secuencias reales en Golden.kt.
 */
export function ReconocedorSenasNativo({
  targets,
  onFrame,
  onConfirmed,
  onReady,
  onError,
  active = true,
  paused = false,
  showLandmarks = true,
  style,
}: Props) {
  const [estado, setEstado] = useState<"arrancando" | "listo" | "error">("arrancando");
  const [error, setError] = useState("");
  const ultimo = useRef<FrameNativo | null>(null);
  const sena = useRef<SenaNativa | null>(null);

  // Los dos eventos nativos llegan a ritmos distintos —el del cuadro dos veces
  // por segundo, el de la seña a doce— así que cada uno actualiza su mitad y se
  // arma el LiveFrame con la última de cada una.
  const emitir = useCallback(() => {
    const f = ultimo.current;
    const s = sena.current;
    onFrame?.({
      sign: s?.sena || null,
      confidence: s?.p ?? 0,
      progress: s?.progreso ?? 0,
      body: f?.cuerpo ?? false,
      resting: s?.reposo ?? false,
      hands: f?.manos ?? 0,
      fps: f?.fps ?? 0,
      canvas: "nativo",
      inferMs: f?.inferenciaMs ?? 0,
      targetConfidence: s?.p ?? 0,
      poseMs: f?.poseMs ?? 0,
      handsMs: f?.manosMs ?? 0,
      drawFps: f?.fps ?? 0,
      drawMs: 0,
      delegado: f?.delegado ?? "",
    });
  }, [onFrame]);

  // Con el ejercicio fuera de pantalla no se monta: el player arma el bloque
  // siguiente por adelantado, y encender la cámara un ejercicio antes no va.
  if (!active) return <View style={[styles.marco, style]} />;

  return (
    <View style={[styles.marco, style]}>
      <ReconocedorNativo
        style={styles.camara}
        activo={!paused}
        mostrarEsqueleto={showLandmarks}
        objetivos={targets}
        onFrame={(e) => {
          ultimo.current = e.nativeEvent;
          emitir();
        }}
        onSena={(e) => {
          sena.current = e.nativeEvent;
          emitir();
        }}
        onConfirmada={(e) => onConfirmed?.(e.nativeEvent.sena, e.nativeEvent.p)}
        onListo={(e) => {
          const n = e.nativeEvent;
          if (n.fase === "error") {
            setEstado("error");
            setError(n.error ?? "");
            onError?.(n.error ?? "falló el reconocedor");
          } else if (n.fase === "detectando") {
            setEstado("listo");
            onReady?.({ delegate: n.detalle ?? "" });
          }
        }}
      />

      {estado !== "listo" && (
        <View style={styles.aviso}>
          <Text style={styles.avisoTexto}>
            {estado === "error" ? `No pudimos abrir la cámara. ${error}` : "Preparando la cámara…"}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: { overflow: "hidden", backgroundColor: "#000" },
  camara: { ...StyleSheet.absoluteFillObject },
  aviso: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: colors.background,
  },
  avisoTexto: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.textMuted, textAlign: "center" },
});
