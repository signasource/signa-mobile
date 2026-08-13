import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSizes } from "@/theme";
import { ShopItemResponse } from "../types";
import { describeItem, metaFor, TONE_COLOR, TONE_TINT } from "../catalogMeta";

const CHEST_REWARD_ICONS: { icon: keyof typeof Ionicons.glyphMap; color: string }[] = [
  { icon: "diamond", color: colors.amber },
  { icon: "heart", color: colors.danger },
  { icon: "flash", color: colors.warning },
  { icon: "shield-half", color: colors.success },
  { icon: "infinite", color: colors.amber },
];

interface ShopItemCardProps {
  item: ShopItemResponse;
  onBuy: (item: ShopItemResponse) => void;
}

export function ShopItemCard({ item, onBuy }: ShopItemCardProps) {
  const meta = metaFor(item.itemType);
  const featured = !!meta.featured;
  const toneColor = TONE_COLOR[meta.tone];
  const iconColor = featured ? colors.onDark : toneColor;

  return (
    <View style={[styles.card, featured ? styles.cardFeatured : styles.cardPlain]}>
      <View style={styles.row}>
        <View
          style={[
            styles.medallion,
            { backgroundColor: featured ? "rgba(255,255,255,.2)" : TONE_TINT[meta.tone] },
          ]}
        >
          <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={26} color={iconColor} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, featured && styles.titleFeatured]}>{item.title}</Text>
          <Text style={[styles.meta, featured && styles.metaFeatured]}>{describeItem(item)}</Text>
        </View>
        <View style={[styles.priceChip, { backgroundColor: featured ? "rgba(255,255,255,.22)" : colors.fill }]}>
          <Ionicons name="diamond" size={15} color={featured ? colors.onDark : colors.amber} />
          <Text style={[styles.price, featured && styles.priceFeatured]}>{item.priceGems}</Text>
        </View>
      </View>

      <Text style={[styles.desc, featured && styles.descFeatured]}>{item.description}</Text>

      {item.itemType === "MYSTERY_CHEST" && (
        <View style={styles.rewardsBlock}>
          <Text style={styles.rewardsLabel}>Posibles recompensas</Text>
          <View style={styles.rewardsRow}>
            {CHEST_REWARD_ICONS.map((r, i) => (
              <Ionicons key={i} name={r.icon} size={22} color={r.color} />
            ))}
          </View>
        </View>
      )}

      <Pressable
        onPress={() => onBuy(item)}
        style={({ pressed }) => [
          styles.buyButton,
          { backgroundColor: featured ? colors.onDark : colors.text },
          pressed && styles.buyButtonPressed,
        ]}
      >
        <Text style={[styles.buyLabel, { color: featured ? colors.amberDark : colors.onDark }]}>Comprar</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 22 },
  cardPlain: {
    backgroundColor: colors.surface,
    padding: 18,
    borderRadius: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardFeatured: {
    backgroundColor: colors.amber,
    padding: 20,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  row: { flexDirection: "row", gap: 14, alignItems: "center" },
  medallion: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontFamily: fonts.displaySemiBold, fontSize: 17.5, letterSpacing: -0.4, color: colors.text },
  titleFeatured: { color: colors.onDark },
  meta: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 3 },
  metaFeatured: { color: "rgba(251,246,242,.8)" },
  priceChip: { flexDirection: "row", alignItems: "center", gap: 5, flexShrink: 0, paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  price: { fontFamily: fonts.bodyBold, fontSize: 15.5, color: colors.text },
  priceFeatured: { color: colors.onDark },
  desc: { marginTop: 12, fontFamily: fonts.bodyRegular, fontSize: 13.5, lineHeight: 21, color: colors.textMuted },
  descFeatured: { color: "rgba(251,246,242,.9)" },
  rewardsBlock: { marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  rewardsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 11,
    textAlign: "center",
  },
  rewardsRow: { flexDirection: "row", gap: 16, alignItems: "center", justifyContent: "center" },
  buyButton: { width: "100%", marginTop: 16, minHeight: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  buyButtonPressed: { opacity: 0.86 },
  buyLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, letterSpacing: 0.2 },
});
