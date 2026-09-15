import React, { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { stageRecognizerAssets, stageRecognizerPage } from "../engine/assets";
import type { RecognizerMessage } from "../engine/recognizerHtml";

export interface LiveFrame {
  sign: string | null;
  confidence: number;
  progress: number;
  body: boolean;
  resting: boolean;
  /** Manos detectadas (0, 1 o 2). Sin manos no hay seña posible. */
  hands: number;
  fps: number;
  /** Tamaño real del canvas del esqueleto; "0x0" delata un problema de layout. */
  canvas: string;
  /** Milisegundos por inferencia, promediados. Para comparar motores. */
  inferMs: number;
  /** Confianza de la seña pedida: es la que se compara contra el umbral. */
  targetConfidence: number;
}

interface LiveSignRecognizerProps {
  /** Señas que este ejercicio acepta; vacío = cualquiera. */
  targets: string[];
  /** Umbral único para todas las señas. Sin esto manda el calibrado por seña. */
  threshold?: number;
  /** Qué modelo decide: la LSTM sobre una ventana, o el abecedario por frame. */
  modo?: "dinamico" | "estatico";
  /** Se llama en cada frame procesado: sirve para el HUD en vivo. */
  onFrame?: (frame: LiveFrame) => void;
  /** Una seña se sostuvo lo suficiente como para darla por hecha. */
  onConfirmed?: (sign: string, confidence: number) => void;
  /** Reconocedor listo. `delegate` dice si quedó en GPU o CPU. */
  onReady?: (info: { delegate: string }) => void;
  onError?: (message: string) => void;
  /**
   * ¿El ejercicio está en pantalla? Con `false` NO se abre la cámara: el player
   * monta el bloque siguiente por adelantado para tener su WebView tibio, y
   * encender la cámara un ejercicio antes es inaceptable.
   */
  active?: boolean;
  /** Pausa el reconocimiento sin desmontar (y sin reiniciar la cámara). */
  paused?: boolean;
  /** Dibujar el esqueleto de pose y manos sobre el video. */
  showLandmarks?: boolean;
  style?: ViewStyle;
}

/**
 * Cámara + reconocimiento de señas en vivo, todo dentro del teléfono.
 *
 * Es un WebView porque MediaPipe sólo existe como WASM para web — es hoy la
 * única forma de sacar landmarks de pose y manos sin escribir un módulo nativo.
 * La app ya usa WebView para los modelos 3D, así que no suma tecnología nueva.
 * La lógica de reconocimiento está en `../engine/recognizerHtml.ts`.
 */
export function LiveSignRecognizer({
  targets,
  threshold,
  modo,
  onFrame,
  onConfirmed,
  onReady,
  onError,
  active = true,
  paused = false,
  showLandmarks = true,
  style,
}: LiveSignRecognizerProps) {
  const [pageUrl, setPageUrl] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [fatal, setFatal] = useState<string | null>(null);
  const webRef = useRef<WebView>(null);

  // Los callbacks van por ref: si entraran en las dependencias, cada render del
  // padre reescribiría el HTML y reiniciaría la cámara.
  const cbs = useRef({ onFrame, onConfirmed, onError, onReady });
  cbs.current = { onFrame, onConfirmed, onError, onReady };

  useEffect(() => {
    let alive = true;
    if (!active) {
      // Todavía no toca: se copian los assets igual (son ~25 MB y tarda la
      // primera vez) para que al llegar al ejercicio ya estén listos, pero sin
      // abrir la cámara.
      void stageRecognizerAssets().catch(() => {});
      return;
    }
    stageRecognizerPage({
      targets,
      threshold,
      smoothingWindow: 5,
      // Sólo el valor inicial: los cambios van por injectJavaScript, porque
      // reescribir el HTML reiniciaría la cámara y MediaPipe.
      showLandmarks,
      modo,
    })
      .then((url) => alive && setPageUrl(url))
      .catch((err) => {
        if (!alive) return;
        const msg = "No se pudo preparar el reconocedor: " + String(err?.message ?? err);
        setFatal(msg);
        cbs.current.onError?.(msg);
      });
    return () => {
      alive = false;
    };
    // `targets` no está en las dependencias a propósito: cambiar de seña
    // pedida no puede rearmar la página, va por injectJavaScript más abajo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, threshold, modo]);

  // Pausar corta el bucle sin desmontar: volver a montar el WebView reinicia la
  // cámara y MediaPipe, que tarda segundos.
  useEffect(() => {
    webRef.current?.injectJavaScript(
      `window.__signaPaused = ${paused ? "true" : "false"}; true;`,
    );
  }, [paused]);

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `if (window.__signaCfg) window.__signaCfg.showLandmarks = ${showLandmarks}; true;`,
    );
  }, [showLandmarks]);

  useEffect(() => {
    webRef.current?.injectJavaScript(
      `if (window.__signaTargets) window.__signaTargets(${JSON.stringify(targets)}); true;`,
    );
  }, [JSON.stringify(targets)]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    let msg: RecognizerMessage;
    try {
      msg = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    switch (msg.type) {
      case "ready":
        setReady(true);
        cbs.current.onReady?.({ delegate: msg.delegate });
        break;
      case "frame":
        cbs.current.onFrame?.(msg);
        break;
      case "confirmed":
        cbs.current.onConfirmed?.(msg.sign, msg.confidence);
        break;
      case "error":
        setFatal(msg.message);
        cbs.current.onError?.(msg.message);
        break;
    }
  }, []);

  if (fatal) {
    return (
      <View style={[styles.container, styles.center, style]}>
        <Text style={styles.error}>{fatal}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      {pageUrl && (
        <WebView
          ref={webRef}
          source={{ uri: pageUrl }}
          style={styles.web}
          onMessage={handleMessage}
          originWhitelist={["*"]}
          // El HTML y los assets viven en la misma carpeta del sandbox: hay que
          // dejarlo leer file:// para que MediaPipe cargue su wasm y su modelo.
          allowFileAccess
          allowFileAccessFromFileURLs
          allowUniversalAccessFromFileURLs
          javaScriptEnabled
          domStorageEnabled
          mediaPlaybackRequiresUserAction={false}
          allowsInlineMediaPlayback
          onError={({ nativeEvent }) => setFatal(nativeEvent.description)}
          onRenderProcessGone={() => setFatal("El reconocedor se cerró solo. Probá de nuevo.")}
        />
      )}
      {!ready && active && (
        <View style={[StyleSheet.absoluteFill, styles.center, styles.loading]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.loadingText}>Preparando el reconocimiento…</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: "hidden", backgroundColor: colors.fillDark },
  web: { flex: 1, backgroundColor: colors.fillDark },
  center: { alignItems: "center", justifyContent: "center", gap: 10, padding: 22 },
  loading: { backgroundColor: colors.fillDark },
  loadingText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.textMuted },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.danger,
    textAlign: "center",
  },
});
