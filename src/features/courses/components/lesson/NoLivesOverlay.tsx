import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";

interface NoLivesOverlayProps {
  onGoToStore: () => void;
  onExit: () => void;
}

export function NoLivesOverlay({ onGoToStore, onExit }: NoLivesOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        <View style={styles.icon}>
          <Ionicons name="heart-dislike" size={34} color={colors.livesRed} />
        </View>
        <Text style={styles.title}>Te quedaste sin vidas</Text>
        <Text style={styles.subtitle}>
          Podés esperar a que se recarguen o pasar por la tienda a buscar vidas y potenciadores para seguir con la
          lección.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primary} onPress={onGoToStore} activeOpacity={0.85}>
            <Ionicons name="storefront" size={18} color={colors.onPrimary} />
            <Text style={styles.primaryText}>Ir a la tienda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghost} onPress={onExit} activeOpacity={0.85}>
            <Text style={styles.ghostText}>Salir de la lección</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(36,26,22,0.42)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 40,
    alignItems: "center",
    gap: 12,
  },
  icon: {
    width: 74,
    height: 74,
    borderRadius: 24,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 300,
  },
  actions: {
    width: "100%",
    gap: 10,
    marginTop: 8,
  },
  primary: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onPrimary,
  },
  ghost: {
    alignItems: "center",
    paddingVertical: 12,
  },
  ghostText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
});
