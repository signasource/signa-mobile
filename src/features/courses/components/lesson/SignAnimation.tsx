import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, View, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { SignVideoView } from "@/features/animations/SignVideoView";
import { useSignMedia } from "@/features/animations/useSignMedia";
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
  style?: ViewStyle;
}

/**
 * Muestra una seña. Resuelve contra R2 si es animación 3D (`.glb`) o video
 * (`.mp4`) y renderiza la que corresponda — misma caja, mismo placeholder
 * mientras carga. Si es video y hay toma lateral, ofrece un botón para alternar
 * entre la vista de frente y la de costado.
 */
export function SignAnimation({ meaning, label, height = 320, tone = "neutral", paused, badge, cameraControls, style }: SignAnimationProps) {
  const media = useSignMedia(meaning);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const [showLateral, setShowLateral] = useState(false);
  const wrong = tone === "wrong";

  // La seña cambió: volver a esperar carga y a la vista frontal.
  useEffect(() => {
    setFailed(false);
    setReady(false);
    setShowLateral(false);
  }, [meaning]);

  if (failed || media.kind === "missing") {
    return <SignPlaceholder label={label} height={height} tone={tone} badge={badge} style={style} />;
  }

  const videoUrl =
    media.kind === "video" ? (showLateral && media.lateralUrl ? media.lateralUrl : media.url) : null;

  return (
    <View style={[styles.container, { height }, wrong && styles.containerWrong, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}

      {media.kind === "glb" && (
        <GlbAnimationView
          url={media.url}
          paused={paused}
          cameraControls={cameraControls}
          onLoaded={() => setReady(true)}
          onError={() => setFailed(true)}
        />
      )}

      {media.kind === "video" && videoUrl && (
        <>
          <SignVideoView
            // La url como key: al alternar frente/lateral, remonta el reproductor
            // y vuelve a disparar onLoaded, así el placeholder cubre la carga.
            key={videoUrl}
            url={videoUrl}
            paused={paused}
            onLoaded={() => setReady(true)}
            onError={() => setFailed(true)}
          />
          {media.lateralUrl && (
            <Pressable
              style={styles.lateralBtn}
              onPress={() => {
                setReady(false);
                setShowLateral((v) => !v);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={showLateral ? "Ver la seña de frente" : "Ver la seña de costado"}
            >
              <Ionicons
                name={showLateral ? "person" : "person-outline"}
                size={15}
                color={colors.onDark}
              />
              <Text style={styles.lateralBtnText}>{showLateral ? "Ver de frente" : "Ver lateral"}</Text>
            </Pressable>
          )}
        </>
      )}

      {!ready && (
        <SignPlaceholder
          label={label}
          height={height}
          tone={tone}
          preparing
          style={StyleSheet.absoluteFillObject}
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
