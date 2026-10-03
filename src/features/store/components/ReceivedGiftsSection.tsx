import React, { useCallback, useState } from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { shopApi, Gift, GiftClaimResult } from "@/api/shop";
import ManoConCaja from "@assets/ilus/mano-con-caja.svg";

interface ReceivedGiftsSectionProps {
  /** Fired after a claim; the parent refreshes its inventory and celebrates it. */
  onClaimed: (result: GiftClaimResult) => void;
}

function daysLeft(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (Number.isNaN(ms) || ms <= 0) return null;
  const days = Math.ceil(ms / 86_400_000);
  return days === 1 ? "Vence mañana" : `Vence en ${days} días`;
}

/**
 * "Regalos para vos" block at the top of the Store. Lists the pending gifts the user received and
 * claims them one by one; renders nothing when there are none (and nothing while loading).
 */
export function ReceivedGiftsSection({ onClaimed }: ReceivedGiftsSectionProps) {
  const [gifts, setGifts] = useState<Gift[]>([]);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      shopApi
        .getReceivedGifts("PENDING")
        .then((res) => {
          // The server filters on the stored status, so a stale PENDING can still come back EXPIRED.
          if (active) setGifts(res.data.filter((g) => g.status === "PENDING"));
        })
        .catch(() => {
          // Silent: the Store works without this block, and it retries on the next focus.
        });
      return () => {
        active = false;
      };
    }, []),
  );

  async function handleClaim(gift: Gift) {
    setError(null);
    setClaimingId(gift.id);
    try {
      const { data } = await shopApi.claimGift(gift.id);
      setGifts((prev) => prev.filter((g) => g.id !== gift.id));
      onClaimed(data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos reclamar el regalo.");
      // Expired or already claimed elsewhere: drop it so the card doesn't stay stuck.
      if (err?.response?.status === 400 || err?.response?.status === 409) {
        setGifts((prev) => prev.filter((g) => g.id !== gift.id));
      }
    } finally {
      setClaimingId(null);
    }
  }

  if (gifts.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionLabel}>Regalos para vos</Text>

      {gifts.map((gift) => {
        const expiry = daysLeft(gift.expiresAt);
        return (
          <View key={gift.id} style={styles.card}>
            <View style={styles.cardRow}>
              <View style={styles.medallion}>
                <ManoConCaja width={52} height={52} />
              </View>
              <View style={styles.texts}>
                <Text style={styles.title} numberOfLines={1}>
                  {gift.item.title}
                </Text>
                <Text style={styles.meta} numberOfLines={1}>
                  De @{gift.senderUsername}
                  {expiry ? ` · ${expiry}` : ""}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => handleClaim(gift)}
                disabled={claimingId !== null}
                activeOpacity={0.86}
              >
                {claimingId === gift.id ? (
                  <ActivityIndicator color={colors.onDark} size="small" />
                ) : (
                  <Text style={styles.claimButtonText}>Reclamar</Text>
                )}
              </TouchableOpacity>
            </View>
            {gift.message ? <Text style={styles.message}>“{gift.message}”</Text> : null}
          </View>
        );
      })}

      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginBottom: 6,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  card: {
    backgroundColor: colors.shopAmberLight,
    borderRadius: 18,
    padding: 14,
    gap: 10,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  medallion: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  texts: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  meta: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.shopAmberDark,
    marginTop: 2,
  },
  message: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    lineHeight: 19,
    color: colors.text,
  },
  claimButton: {
    minWidth: 92,
    minHeight: 40,
    borderRadius: 12,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  claimButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    color: colors.danger,
  },
});
