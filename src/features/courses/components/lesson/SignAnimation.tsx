import React, { useRef, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { AvatarGlbNativo } from "@/features/animations/AvatarGlbNativo";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { getGlbUrl, getGlbUrlOficial } from "@/features/animations/glbUrl";
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
 * Qué motor dibuja el avatar: Filament, salvo que se pida el WebView.
 *
 * Medido en el teléfono del usuario, el del WebView tarda 2752 ms en aparecer
 * contra 466 ms el nativo, y se mueve a tirones: levanta un WebView por avatar
 * y baja el runtime del visor de un CDN antes de empezar.
 *
 * La primera versión nativa se veía peor —plana y oscura—, y eran dos cosas:
 * la iluminación era un ambiente parejo de una sola banda, y el post-proceso
 * apagado se llevaba puesto el mapeo de tonos. Ahora hay luz de tres puntos,
 * mapeo de tonos encendido y un tope de 30 cuadros por segundo para no pelear
 * con MediaPipe por la GPU.
 *
 * `EXPO_PUBLIC_AVATAR_WEBVIEW=1` vuelve al anterior sin recompilar nada más.
 */
const NATIVO = process.env.EXPO_PUBLIC_AVATAR_WEBVIEW !== "1";

export function SignAnimation({ meaning, label, height = 320, tone = "neutral", paused, badge, cameraControls, motor, style }: SignAnimationProps) {
  // Si el motor nativo no puede con este modelo, se cae al visor web en vez de
  // mostrar la lámina fija: hay avatares —M y N— con un esqueleto de 574 huesos
  // contra el tope de 256 de Filament, y el web los dibuja igual.
  const [caidoANavegador, setCaidoANavegador] = useState(false);
  const nativo = (motor ? motor === "nativo" : NATIVO) && !caidoANavegador;
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
          urlRespaldo={getGlbUrlOficial(meaning)}
          paused={paused}
          cameraControls={cameraControls}
          onTiempos={listo}
          onFluidez={(f) => marcar("avatar-fluidez", { sena: meaning, ...f })}
          onError={(motivo) => {
            marcar("avatar-al-navegador", { sena: meaning, motivo });
            setCaidoANavegador(true);
          }}
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
