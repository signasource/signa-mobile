import React from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import type { GemOffer } from "../useGemPurchase";

interface GemPackCardProps {
  offer: GemOffer;
  /** Highlighted "most chosen" pack. */
  featured?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onBuy: (offer: GemOffer) => void;
}

/** One gem pack: gems on the left, localized Google Play price on the right. */
export function GemPackCard({ offer, featured = false, disabled = false, busy = false, onBuy }: GemPackCardProps) {
  const { pack, product } = offer;
  return (
    <View style={[styles.card, featured ? styles.cardFeatured : styles.cardPlain]}>
      {featured && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>MÁS ELEGIDO</Text>
        </View>
      )}
      <View style={styles.row}>
        <View style={[styles.medallion, featured && styles.medallionFeatured]}>
          <Ionicons name="diamond" size={26} color={featured ? colors.onDark : colors.gemsBlueDark} />
        </View>
        <View style={styles.texts}>
          <Text style={[styles.title, featured && styles.titleFeatured]}>
            {pack.gems.toLocaleString("es-AR")} gemas
          </Text>
          <Text style={[styles.meta, featured && styles.metaFeatured]}>Pago único · Google Play</Text>
        </View>
        <View style={[styles.priceChip, featured && styles.priceChipFeatured]}>
          <Text style={[styles.priceText, featured && styles.priceTextFeatured]}>
            {product.displayPrice}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.buyButton, featured && styles.buyButtonFeatured, disabled && styles.buyButtonDisabled]}
        onPress={() => onBuy(offer)}
        disabled={disabled || busy}
        activeOpacity={0.86}
      >
        {busy ? (
          <ActivityIndicator color={featured ? colors.gemsBlueDark : colors.onDark} />
        ) : (
          <Text style={[styles.buyButtonText, featured && styles.buyButtonTextFeatured]}>Comprar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 18,
  },
  cardPlain: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardFeatured: {
    backgroundColor: colors.gemsBlueDark,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    color: colors.onDark,
  },
  row: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  medallion: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  medallionFeatured: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 17.5,
    color: colors.text,
    letterSpacing: -0.4,
  },
  titleFeatured: {
    color: colors.onDark,
  },
  meta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  metaFeatured: {
    color: "rgba(251,246,242,0.8)",
  },
  priceChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.fill,
  },
  priceChipFeatured: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  priceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.text,
  },
  priceTextFeatured: {
    color: colors.onDark,
  },
  buyButton: {
    width: "100%",
    marginTop: 16,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
  buyButtonFeatured: {
    backgroundColor: colors.onDark,
  },
  buyButtonDisabled: {
    opacity: 0.5,
  },
  buyButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
  },
  buyButtonTextFeatured: {
    color: colors.gemsBlueDark,
  },
});
