import React from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Text } from "@/components/Text";
import { EmptyNote } from "@/components/EmptyState";
import { colors, fonts } from "@/theme";
import { GemOrder } from "@/api/gemOrders";
import { useGemPurchase } from "../useGemPurchase";
import { GemPackCard } from "./GemPackCard";

interface GemPacksSectionProps {
  /** Fired after the backend credited the gems; the parent refreshes its inventory from it. */
  onCredited: (order: GemOrder) => void;
}

/** Product id of the pack highlighted as "Más elegido". */
const FEATURED_PRODUCT_ID = "gems_pack_850";

/**
 * "Packs de gemas" block of the Store's Especiales tab. Owns the Mercado Pago checkout; the
 * parent only learns about credited purchases.
 */
export function GemPacksSection({ onCredited }: GemPacksSectionProps) {
  const { status, error, packs, buy, reset } = useGemPurchase({ onCredited });
  const busy = status === "buying" || status === "checking";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Packs de gemas</Text>
      <Text style={styles.sectionHint}>
        Se pagan una sola vez con Mercado Pago (tarjeta, dinero en cuenta y más) y se acreditan al confirmarse el pago.
      </Text>

      {status === "loading" ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.gemsBlueDark} />
        </View>
      ) : packs.length === 0 ? (
        <EmptyNote>
          Los packs de gemas no están disponibles en este momento. Probá de nuevo más tarde.
        </EmptyNote>
      ) : (
        packs.map((pack) => (
          <GemPackCard
            key={pack.id}
            pack={pack}
            featured={pack.productId === FEATURED_PRODUCT_ID}
            busy={busy}
            onBuy={buy}
          />
        ))
      )}

      {status === "pending" && (
        <View style={styles.note}>
          <Text style={styles.noteText}>
            Tu pago todavía no se confirmó. Las gemas se acreditan solas cuando Mercado Pago lo apruebe.
          </Text>
          <Text style={styles.noteAction} onPress={reset}>
            Entendido
          </Text>
        </View>
      )}

      {status === "error" && error != null && (
        <View style={[styles.note, styles.noteError]}>
          <Text style={styles.noteText}>{error}</Text>
          <Text style={styles.noteAction} onPress={reset}>
            Cerrar
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  sectionHint: {
    marginTop: -8,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
  },
  center: {
    paddingVertical: 24,
    alignItems: "center",
  },
  note: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.warningLight,
  },
  noteError: {
    backgroundColor: colors.dangerLight,
  },
  noteText: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  noteAction: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
  },
});
