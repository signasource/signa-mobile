import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { shopApi } from "../api";
import { MAX_LIVES, ShopItemResponse, StubFriend, UserInventoryResponse } from "../types";
import { metaFor, Tab, TAB_LABEL } from "../catalogMeta";
import { STUB_FRIENDS } from "../stubFriends";
import { StatPill } from "../components/StatPill";
import { ShopItemCard } from "../components/ShopItemCard";
import { FlowState, PurchaseFlowModal } from "../components/PurchaseFlowModal";

type Props = NativeStackScreenProps<AppStackParamList, "Tienda">;

const TABS: Tab[] = ["vidas", "potenciadores", "especiales"];

export function ShopScreen({ navigation }: Props) {
  const [inventory, setInventory] = useState<UserInventoryResponse | null>(null);
  const [items, setItems] = useState<ShopItemResponse[]>([]);
  const [tab, setTab] = useState<Tab>("vidas");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  function loadAll() {
    setError(null);
    setLoading(true);
    Promise.all([shopApi.getInventory(), shopApi.listItems()])
      .then(([inv, catalog]) => {
        setInventory(inv.data);
        setItems(catalog.data.filter((it) => it.active));
      })
      .catch((err) => setError(err?.response?.data?.message ?? err.message ?? "No se pudo cargar la tienda."))
      .finally(() => setLoading(false));
  }

  const tabItems = useMemo(() => items.filter((it) => metaFor(it.itemType).tab === tab), [items, tab]);

  const gems = inventory?.gems ?? 0;
  const livesLabel = inventory?.unlimitedLivesActive ? "∞" : `${inventory?.currentLives ?? 0}/${MAX_LIVES}`;

  function openBuy(item: ShopItemResponse) {
    if (gems < item.priceGems) {
      setFlow({ step: "insufficient", item });
    } else {
      setFlow({ step: "confirm", item });
    }
  }

  async function buyForSelf(item: ShopItemResponse) {
    setBusy(true);
    try {
      if (item.itemType === "MYSTERY_CHEST") {
        setFlow({ step: "chest", item });
        const [{ data }] = await Promise.all([shopApi.purchase({ shopItemId: item.id }), delay(1900)]);
        setInventory(data.inventory);
        setFlow({ step: "success", item, effect: data.effect, gemsAfter: data.inventory.gems });
      } else {
        const { data } = await shopApi.purchase({ shopItemId: item.id });
        setInventory(data.inventory);
        setFlow({ step: "success", item, effect: data.effect, gemsAfter: data.inventory.gems });
      }
    } catch (err: any) {
      setFlow(null);
      Alert.alert("No se pudo completar la compra", err?.response?.data?.message ?? "Intentá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  async function giftTo(item: ShopItemResponse, friend: StubFriend) {
    setBusy(true);
    try {
      await shopApi.sendGift({ shopItemId: item.id, recipientUserId: friend.userId });
      const { data } = await shopApi.getInventory();
      setInventory(data);
      setFlow({ step: "success", item, friend, effect: { type: item.itemType, gemsGranted: null, livesGranted: null, streakShieldsGranted: null, xpMultiplierValue: null, durationMinutes: null }, gemsAfter: data.gems });
    } catch (err: any) {
      setFlow({ step: "confirm", item });
      Alert.alert("No se pudo enviar el regalo", err?.response?.data?.message ?? "Intentá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} accessibilityLabel="Volver">
          <Ionicons name="chevron-back" size={19} color={colors.onPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Tienda</Text>
        <Text style={styles.headerSubtitle}>Gastá tus gemas en vidas y potenciadores para seguir aprendiendo.</Text>
        <View style={styles.statsRow}>
          <StatPill icon="diamond" label="Gemas" value={String(gems)} />
          <StatPill icon="heart" label="Vidas" value={livesLabel} />
          <StatPill icon="shield-half" label="Escudos" value={String(inventory?.streakShields ?? 0)} />
        </View>
      </View>

      <View style={styles.tabsRow}>
        {TABS.map((t) => (
          <Pressable key={t} onPress={() => setTab(t)} style={[styles.chip, tab === t && styles.chipActive]}>
            <Text style={[styles.chipLabel, tab === t && styles.chipLabelActive]}>{TAB_LABEL[t]}</Text>
          </Pressable>
        ))}
      </View>

      {loading && <ActivityIndicator color={colors.amber} style={{ marginTop: 40 }} />}

      {!loading && error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>No pudimos cargar la tienda</Text>
          <Text style={styles.errorDetail}>{error}</Text>
          <Pressable onPress={loadAll} style={styles.retryButton}>
            <Text style={styles.retryLabel}>Reintentar</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && (
        <ScrollView contentContainerStyle={styles.list}>
          {tabItems.map((item) => (
            <ShopItemCard key={item.id} item={item} onBuy={openBuy} />
          ))}
        </ScrollView>
      )}

      <PurchaseFlowModal
        flow={flow}
        gems={gems}
        friends={STUB_FRIENDS}
        busy={busy}
        onClose={() => setFlow(null)}
        onBuyForSelf={buyForSelf}
        onOpenGiftPicker={(item) => setFlow({ step: "friend", item })}
        onGiftTo={giftTo}
        onBackToConfirm={(item) => setFlow({ step: "confirm", item })}
      />
    </View>
  );
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { backgroundColor: colors.amber, paddingTop: 56, paddingHorizontal: 24, paddingBottom: 22 },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { marginTop: 16, fontFamily: fonts.displayBold, fontSize: 34, letterSpacing: -1.1, color: colors.onPrimary },
  headerSubtitle: { marginTop: 8, fontFamily: fonts.bodyMedium, fontSize: 14, lineHeight: 20, color: colors.onPrimary, opacity: 0.88, maxWidth: 280 },
  statsRow: { marginTop: 18, flexDirection: "row", gap: 8 },
  tabsRow: { flexDirection: "row", gap: 9, paddingHorizontal: 24, paddingVertical: 16 },
  chip: { height: 40, paddingHorizontal: 18, borderRadius: 999, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  chipActive: { backgroundColor: colors.surface, shadowColor: colors.text, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  chipLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm, color: colors.textMuted },
  chipLabelActive: { color: colors.text },
  list: { paddingHorizontal: 24, paddingBottom: 30, gap: 14 },
  errorBox: { margin: 24, padding: 18, borderRadius: 16, backgroundColor: colors.surface },
  errorTitle: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, color: colors.text, marginBottom: 6 },
  errorDetail: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted },
  retryButton: { marginTop: 14, alignSelf: "flex-start", paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.amber },
  retryLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm, color: colors.onPrimary },
});
