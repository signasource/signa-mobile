import React, { useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { trackAnimationLoad } from "@/telemetry/telemetry";
import { colors } from "@/theme";

interface SignVideoViewProps {
  url: string;
  /** Pausa el video en el frame actual. */
  paused?: boolean;
  style?: ViewStyle;
  /** Se dispara cuando el primer frame ya se puede mostrar. */
  onLoaded?: () => void;
  onError?: (message: string) => void;
}

/**
 * Renderiza un `.mp4` de una seña con `expo-av`: loop, sin sonido, encuadrado
 * por `contain`. Mismo contrato que `GlbAnimationView` (`url`, `paused`,
 * `onLoaded`, `onError`) para que `SignAnimation` pueda intercambiarlos. El
 * video lo baja el reproductor nativo directo desde R2 — no pasa por WebView.
 */
export function SignVideoView({ url, paused = false, style, onLoaded, onError }: SignVideoViewProps) {
  const ref = useRef<Video>(null);
  // Latencia de carga: el reloj arranca al montar con esta `url` y se reporta una vez.
  const loadStart = useRef(Date.now());
  const reported = useRef(false);

  function reportLoad(success: boolean) {
    if (reported.current) return;
    reported.current = true;
    trackAnimationLoad(success, Date.now() - loadStart.current);
  }

  function handleStatus(status: AVPlaybackStatus) {
    if (!status.isLoaded && status.error) {
      reportLoad(false);
      onError?.(status.error);
    }
  }

  return (
    <Video
      ref={ref}
      style={[styles.video, style]}
      source={{ uri: url }}
      resizeMode={ResizeMode.CONTAIN}
      isLooping
      isMuted
      shouldPlay={!paused}
      onReadyForDisplay={() => {
        reportLoad(true);
        onLoaded?.();
      }}
      onPlaybackStatusUpdate={handleStatus}
      onError={(e) => {
        reportLoad(false);
        onError?.(typeof e === "string" ? e : "No se pudo cargar el video.");
      }}
    />
  );
}

const styles = StyleSheet.create({
  video: { flex: 1, backgroundColor: colors.fill },
});
