import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, alpha } from "@/theme";
import ManoCelularSinVidas from "@assets/ilus/mano-celular-sin-vidas.svg";

interface NoLivesOverlayProps {
  onGoToStore: () => void;
  onExit: () => void;
  /** Current gem balance: shows a pill with a "+" that opens the gem shop. */
  gems?: number;
  onGetGems?: () => void;
}

export function NoLivesOverlay({ onGoToStore, onExit, gems, onGetGems }: NoLivesOverlayProps) {
  return (
    <View style={styles.overlay}>
      <View style={styles.sheet}>
        {gems != null && onGetGems && (
          <TouchableOpacity style={styles.gemPill} onPress={onGetGems} activeOpacity={0.85} accessibilityLabel="Conseguir más gemas">
            <Ionicons name="diamond" size={14} color={colors.gemsBlueDark} />
            <Text style={styles.gemPillText}>{gems.toLocaleString("es-AR")}</Text>
            <View style={styles.gemPillPlus}>
              <Ionicons name="add" size={17} color={colors.onColor} />
            </View>
          </TouchableOpacity>
        )}
        <ManoCelularSinVidas width={140} height={140} />
        <Text style={styles.title}>Te quedaste sin vidas</Text>
        <Text style={styles.subtitle}>
          Podés esperar a que se recarguen o pasar por la tienda a buscar vidas y potenciadores para seguir con la
          lección.
        </Text>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.primary} onPress={onGoToStore} activeOpacity={0.85}>
            <Ionicons name="storefront" size={18} color={colors.onDark} />
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
    backgroundColor: alpha(colors.text, 0.42),
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
  gemPill: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.avatarBlueLight,
    borderRadius: 999,
    paddingVertical: 5,
    paddingLeft: 11,
    paddingRight: 5,
  },
  gemPillText: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.gemsBlueDark },
  gemPillPlus: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.gemsBlueDark,
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
    borderRadius: 14,
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  primaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },
  ghost: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  ghostText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
});
