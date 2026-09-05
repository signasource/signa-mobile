import React, { useEffect, useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";
import { signsApi } from "@/api/signs";
import { SignPlaceholder } from "./SignPlaceholder";

type Tone = "neutral" | "wrong";

interface SignAnimationProps {
  meaning: string;
  label: string;
  height?: number;
  tone?: Tone;
  paused?: boolean;
  badge?: string;
  style?: ViewStyle;
}

export function SignAnimation({ meaning, label, height = 320, tone = "neutral", paused, badge, style }: SignAnimationProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const wrong = tone === "wrong";

  useEffect(() => {
    setUrl(null);
    setFailed(false);
    signsApi.getSignAnimations([meaning]).then((res) => {
      setUrl(res.data[meaning] ?? null);
    }).catch(() => {});
  }, [meaning]);

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
