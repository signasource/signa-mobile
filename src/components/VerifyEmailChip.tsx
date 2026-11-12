import React from "react";
import { TouchableOpacity, View, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";

interface VerifyEmailChipProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export function VerifyEmailChip({ onPress, style }: VerifyEmailChipProps) {
  return (
    <TouchableOpacity
      style={[styles.banner, style]}
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel="Email sin verificar. Tocá para verificar tu cuenta"
    >
      <View style={styles.iconWrap}>
        <Ionicons name="mail-unread" size={20} color={colors.warning} />
      </View>
      <View style={styles.textGroup}>
        <Text style={styles.title}>Verificá tu email</Text>
        <Text style={styles.subtitle}>Protegé tu cuenta y recuperá el acceso si lo perdés</Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaLabel}>Verificar</Text>
        <Ionicons name="arrow-forward" size={13} color={colors.warning} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    backgroundColor: "#FEF3D6",
    borderWidth: 1,
    borderColor: colors.warning + "55",
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.warning + "22",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  textGroup: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: fontSizes.sm,
    color: colors.neutral900,
    lineHeight: 18,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.neutral600,
    lineHeight: 15,
  },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.xs,
    color: colors.warning,
  },
});
