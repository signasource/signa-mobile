import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { FieldIcon, FieldIconName } from "@/components/FieldIcon";
import { colors, fonts } from "@/theme";

/** Medallón cuadrado con ícono y "pulso" detrás (Forgot / Reset / Verify). */
export function AuthIconBadge({ icon }: { icon: FieldIconName }) {
  return (
    <View style={styles.iconWrap}>
      <View style={styles.iconBg}>
        <FieldIcon name={icon} size={40} color={colors.primary} />
      </View>
      <View style={styles.iconPulse} />
    </View>
  );
}

interface AuthHeadingProps {
  title: string;
  subtitle?: React.ReactNode;
  style?: object;
}

/** Título de display + bajada. Alineado a la izquierda. */
export function AuthHeading({ title, subtitle, style }: AuthHeadingProps) {
  return (
    <View style={style}>
      <Text style={styles.heading}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    marginTop: 28,
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBg: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  iconPulse: {
    position: "absolute",
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: colors.primary,
    opacity: 0.14,
  },
  heading: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 32,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.9,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.textMuted,
  },
});
