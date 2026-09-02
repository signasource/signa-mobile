import React, { useState } from "react";
import { StyleSheet, Text, View, ViewStyle } from "react-native";
import { colors, fonts } from "@/theme";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { getCachedAnimationUrl } from "@/features/courses/animationPreload";
import { SignPlaceholder } from "./SignPlaceholder";

type Tone = "neutral" | "wrong";

interface SignAnimationProps {
  /** Sign meaning to render; looked up in the preload cache filled by animationPreload.ts. */
  meaning: string;
  label: string;
  height?: number;
  tone?: Tone;
  paused?: boolean;
  badge?: string;
  style?: ViewStyle;
}

/**
 * Renders the 3D avatar animation for a sign meaning, falling back to
 * `SignPlaceholder` while the URL isn't cached yet (still loading, no
 * animation for that meaning, or the model failed to load).
 */
export function SignAnimation({ meaning, label, height = 320, tone = "neutral", paused, badge, style }: SignAnimationProps) {
  const [failed, setFailed] = useState(false);
  const url = getCachedAnimationUrl(meaning);
  const wrong = tone === "wrong";

  if (!url || failed) {
    return <SignPlaceholder label={label} height={height} tone={tone} badge={badge} style={style} />;
  }

  return (
    <View style={[styles.container, { height }, wrong && styles.containerWrong, style]}>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
      <GlbAnimationView url={url} paused={paused} onError={() => setFailed(true)} />
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
