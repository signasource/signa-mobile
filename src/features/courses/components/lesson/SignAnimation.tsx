import React, { useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { AvatarGlbNativo } from "@/features/animations/AvatarGlbNativo";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { getGlbUrl } from "@/features/animations/glbUrl";
import { marcar } from "@/features/ml/telemetria";
import { SignPlaceholder } from "./SignPlaceholder";

type Tone = "neutral" | "wrong";

interface SignAnimationProps {
  meaning: string;
  label: string;
  height?: number;
  tone?: Tone;
  paused?: boolean;
  badge?: string;
  /** Permitir rotar el modelo arrastrando. Ver GlbAnimationView. */
  cameraControls?: boolean;
  /** Forzar un motor. Sólo lo usa el banco, para compararlos lado a lado. */
  motor?: "nativo" | "webview";
  style?: ViewStyle;
}

/**
 * Qué motor dibuja el avatar. Por omisión el WebView.
 *
 * El nativo carga mucho más rápido, pero probado en un teléfono real se ve peor
 * —la iluminación es un ambiente plano, no el entorno que arma model-viewer— y
 * se mueve a tirones cuando comparte la GPU con la cámara y MediaPipe. Hasta
 * que eso esté resuelto manda el WebView, que es lo que la gente ya venía
 * viendo bien.
 *
 * `EXPO_PUBLIC_AVATAR_NATIVO=1` enciende Filament para seguir trabajándolo.
 */
const NATIVO = process.env.EXPO_PUBLIC_AVATAR_NATIVO === "1";

export function SignAnimation({ meaning, label, height = 320, tone = "neutral", paused, badge, cameraControls, motor, style }: SignAnimationProps) {
  const nativo = motor ? motor === "nativo" : NATIVO;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const wrong = tone === "wrong";

  // Cuánto tarda el avatar en aparecer, medido desde el mismo lugar para los dos
  // motores: es la única forma de que el número del nativo y el del WebView se
  // puedan comparar. El nativo agrega además en qué se le fue el tiempo.
  const desde = useRef(Date.now());
  function listo(detalle?: { msArchivo: number; msMontaje: number }) {
    setReady(true);
    marcar("avatar", {
      motor: nativo ? "filament" : "webview",
      sena: meaning,
      ms: Date.now() - desde.current,
      ...detalle,
    });
  }

  if (failed) {
    return <SignPlaceholder label={label} height={height} tone={tone} badge={badge} style={style} />;
  }

  return (
    <View style={[styles.container, { height }, wrong && styles.containerWrong, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {nativo ? (
        <AvatarGlbNativo
          url={getGlbUrl(meaning)}
          paused={paused}
          cameraControls={cameraControls}
          onTiempos={listo}
          onError={() => setFailed(true)}
        />
      ) : (
        <GlbAnimationView
          url={getGlbUrl(meaning)}
          paused={paused}
          cameraControls={cameraControls}
          onLoaded={() => listo()}
          onError={() => setFailed(true)}
        />
      )}
      {!ready && (
        <SignPlaceholder label={label} height={height} tone={tone} preparing style={StyleSheet.absoluteFillObject} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fill,
    overflow: "hidden",
  },
  containerWrong: {
    borderWidth: 2,
    borderColor: colors.danger,
    backgroundColor: colors.dangerLight,
  },
  badge: {
    position: "absolute",
    top: 14,
    left: 14,
    zIndex: 1,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
});
