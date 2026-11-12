import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { EmptyState } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import { colors, fonts, alpha } from "@/theme";
import { gemOrdersApi, GemOrderHistoryItem } from "@/api/gemOrders";
import { courseOrdersApi, CourseOrderHistoryItem } from "@/api/courseOrders";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { RefundRequestSheet, RefundTarget } from "@/features/store/components/RefundRequestSheet";
import type { UserRefundRequest } from "@/api/gemOrders";

type Props = NativeStackScreenProps<AppStackParamList, "PurchaseHistory">;

type HistoryEntry =
  | { kind: "gems"; order: GemOrderHistoryItem; key: string }
  | { kind: "course"; order: CourseOrderHistoryItem; key: string };

function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency }).format(amount);
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(iso),
  );
}

type OrderStatus = "PENDING" | "PAID" | "REFUNDED";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: "Pendiente",
  PAID: "Pagado",
  REFUNDED: "Reembolsado",
};

const STATUS_COLOR: Record<OrderStatus, string> = {
  PENDING: colors.shopAmberDark,
  PAID: colors.successDark,
  REFUNDED: colors.textMuted,
};

const STATUS_BG: Record<OrderStatus, string> = {
  PENDING: colors.shopAmberLight,
  PAID: colors.successLight,
  REFUNDED: colors.fill,
};

function StatusBadge({ status }: { status: string }) {
  const s = status as OrderStatus;
  return (
    <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[s] ?? colors.fill }]}>
      <Text style={[styles.statusText, { color: STATUS_COLOR[s] ?? colors.textMuted }]}>
        {STATUS_LABEL[s] ?? status}
      </Text>
    </View>
  );
}

export function PurchaseHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async (isRefresh = false) => {
    setError(null);
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [gemsRes, coursesRes] = await Promise.all([
        gemOrdersApi.getHistory(),
        courseOrdersApi.getHistory(),
      ]);
      const gems: HistoryEntry[] = gemsRes.data.map((o) => ({
        kind: "gems",
        order: o,
        key: `g-${o.id}`,
      }));
      const courses: HistoryEntry[] = coursesRes.data.map((o) => ({
        kind: "course",
        order: o,
        key: `c-${o.id}`,
      }));
      const merged = [...gems, ...courses].sort(
        (a, b) =>
          new Date(b.order.createdAt).getTime() - new Date(a.order.createdAt).getTime(),
      );
      setEntries(merged);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar tu historial.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function canRequestRefund(entry: HistoryEntry): boolean {
    if (submittedIds.has(entry.order.id)) return false;
    return entry.order.status === "PAID" && entry.order.refundedAt == null;
  }

  function handleRefundSubmitted(request: UserRefundRequest) {
    setSubmittedIds((prev) => new Set([...prev, request.purchaseId]));
    setRefundTarget(null);
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Mis compras"
        compact
        paddingTop={insets.top + 14}
        tone={colors.shopAmber}
        left={<BackButton onPress={() => navigation.goBack()} color={colors.onDark} />}
      />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.shopAmber} size="large" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState title="No pudimos cargar el historial" description={error} />
          <TouchableOpacity style={styles.retryButton} onPress={() => load()} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            title="Sin compras todavía"
            description="Acá vas a ver el historial de tus compras de gemas y cursos."
          />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={colors.shopAmber}
            />
          }
        >
          {entries.map((entry) => {
            const isGems = entry.kind === "gems";
            const icon: keyof typeof Ionicons.glyphMap = isGems ? "diamond" : "play-circle";
            const iconColor = isGems ? colors.gemsBlue : colors.primary;
            const iconBg = isGems ? colors.avatarBlueLight : colors.primaryLight;
            const name = isGems
              ? `${(entry.order as GemOrderHistoryItem).gems} gemas · ${(entry.order as GemOrderHistoryItem).packName}`
              : (entry.order as CourseOrderHistoryItem).courseName;
            const amount = entry.order.amount;
            const currency = entry.order.currency;
            const eligible = canRequestRefund(entry);

            return (
              <View key={entry.key} style={styles.card}>
                <View style={styles.cardRow}>
                  <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
                    <Ionicons name={icon} size={22} color={iconColor} />
                  </View>
                  <View style={styles.cardTexts}>
                    <Text style={styles.cardTitle} numberOfLines={2}>
                      {name}
                    </Text>
                    <Text style={styles.cardDate}>{formatDate(entry.order.createdAt)}</Text>
                  </View>
                  <View style={styles.cardRight}>
                    <Text style={styles.cardAmount}>{formatMoney(amount, currency)}</Text>
                    <StatusBadge status={entry.order.status} />
                  </View>
                </View>
                {entry.order.status === "REFUNDED" && (
                  <View style={styles.refundedNote}>
                    <Ionicons name="return-down-back" size={14} color={colors.textMuted} />
                    <Text style={styles.refundedNoteText}>
                      Reembolso procesado
                      {entry.order.refundedAt ? ` el ${formatDate(entry.order.refundedAt)}` : ""}
                    </Text>
                  </View>
                )}
                {submittedIds.has(entry.order.id) && (
                  <View style={styles.requestedNote}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.successDark} />
                    <Text style={styles.requestedNoteText}>Pedido de reembolso enviado</Text>
                  </View>
                )}
                {eligible && (
                  <TouchableOpacity
                    style={styles.refundButton}
                    onPress={() =>
                      setRefundTarget(
                        entry.kind === "gems"
                          ? { kind: "gems", order: entry.order as GemOrderHistoryItem }
                          : { kind: "course", order: entry.order as CourseOrderHistoryItem },
                      )
                    }
                    activeOpacity={0.8}
                  >
                    <Ionicons name="return-up-back-outline" size={15} color={colors.textMuted} />
                    <Text style={styles.refundButtonText}>Pedir reembolso</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <RefundRequestSheet
        target={refundTarget}
        onClose={() => setRefundTarget(null)}
        onSubmitted={handleRefundSubmitted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  list: {
    padding: 20,
    paddingTop: 14,
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 16,
    shadowColor: colors.text,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardTexts: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.text,
    lineHeight: 20,
  },
  cardDate: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  cardRight: {
    alignItems: "flex-end",
    gap: 5,
    flexShrink: 0,
  },
  cardAmount: {
    fontFamily: fonts.displayBold,
    fontSize: 16,
    color: colors.text,
    letterSpacing: -0.4,
  },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 7,
  },
  statusText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.2,
  },
  refundedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.fill,
  },
  refundedNoteText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  requestedNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.fill,
  },
  requestedNoteText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.successDark,
  },
  refundButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.fill,
  },
  refundButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
});
