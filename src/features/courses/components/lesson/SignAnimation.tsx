import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";
import { AvatarGlbNativo } from "@/features/animations/AvatarGlbNativo";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { getGlbUrlOficial } from "@/features/animations/glbUrl";
import { useSignSource } from "@/features/animations/signMedia";
import { SignVideo } from "@/features/animations/SignVideo";
import { marcar } from "@/features/ml/telemetria";
import { hayNativo } from "../../../../../modules/signa-vision";
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
  // hayNativo es false en iOS y en Expo Go: ahi dibuja el visor web, como en develop.
  const nativo = hayNativo && (motor ? motor === "nativo" : NATIVO) && !caidoANavegador;
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  // Lo que subieron desde el panel (.glb o .mp4); null mientras se pregunta.
  const fuente = useSignSource(meaning);
  // Las señas en video pueden traer además una toma lateral.
  const [vista, setVista] = useState<"frente" | "lateral">("frente");
  const lateral = fuente?.format === "mp4" ? fuente.lateralUrl ?? null : null;

  // La seña cambió (p. ej. el PiP de deletrear pasa de letra en letra): un
  // error o una carga de la anterior no tienen que quedar pegados a esta.
  useEffect(() => {
    setFailed(false);
    setReady(false);
    setVista("frente");
    setCaidoANavegador(false);
    desde.current = Date.now();
  }, [meaning]);
  const wrong = tone === "wrong";

  // Cuánto tarda el avatar en aparecer, medido desde el mismo lugar para los dos
  // motores: es la única forma de que el número del nativo y el del WebView se
  // puedan comparar. El nativo agrega además en qué se le fue el tiempo.
  const desde = useRef(Date.now());
  function listo(detalle?: { msArchivo: number; msMontaje: number }) {
    setReady(true);
    marcar("avatar", {
      motor: fuente?.format === "mp4" ? "video" : nativo ? "filament" : "webview",
      sena: meaning,
      ms: Date.now() - desde.current,
      ...detalle,
    });
  }

  if (failed) {
    return <SignPlaceholder label={label} height={height} tone={tone} badge={badge} style={style} />;
  }

  if (!fuente) {
    return <SignPlaceholder label={label} height={height} tone={tone} badge={badge} preparing style={style} />;
  }

  return (
    <View style={[styles.container, { height }, wrong && styles.containerWrong, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      {lateral && (
        <View style={styles.vistas} accessibilityRole="tablist">
          {(["frente", "lateral"] as const).map((v) => (
            <Pressable
              key={v}
              accessibilityRole="tab"
              accessibilityState={{ selected: vista === v }}
              onPress={() => setVista(v)}
              style={[styles.vista, vista === v && styles.vistaActiva]}
            >
              <Text style={[styles.vistaTexto, vista === v && styles.vistaTextoActivo]}>
                {v === "frente" ? "Frente" : "Lateral"}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      {fuente.format === "mp4" ? (
        <SignVideo
          url={vista === "lateral" && lateral ? lateral : fuente.url}
          paused={paused}
          onLoaded={() => listo()}
          onError={(motivo) => {
            marcar("video-falla", { sena: meaning, motivo });
            setFailed(true);
          }}
        />
      ) : nativo ? (
        <AvatarGlbNativo
          url={fuente.url}
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
          url={fuente.url}
          paused={paused}
          cameraControls={cameraControls}
          onLoaded={() => listo()}
          onError={() => setFailed(true)}
        />
      )}
      {!ready && (
        <SignPlaceholder
          label={label}
          height={height}
          tone={tone}
          preparing
          style={StyleSheet.absoluteFill}
        />
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
    backgroundColor: alpha(colors.onColor, 0.94),
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  vistas: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 1,
    flexDirection: "row",
    gap: 2,
    padding: 2,
    borderRadius: 9,
    backgroundColor: alpha(colors.onColor, 0.94),
  },
  vista: { borderRadius: 7, paddingVertical: 4, paddingHorizontal: 9 },
  vistaActiva: { backgroundColor: colors.text },
  vistaTexto: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.textMuted },
  vistaTextoActivo: { color: colors.surface },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  lateralBtn: {
    position: "absolute",
    bottom: 14,
    right: 14,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: alpha(colors.text, 0.72),
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 12,
  },
  lateralBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.onDark,
  },
});
