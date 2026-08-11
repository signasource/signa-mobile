import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { storeApi } from "@/api/store";
import { inventoryApi } from "@/api/inventory";
import { usersApi } from "@/api/users";
import {
  AppliedEffectResponse,
  PublicUserProfileResponse,
  ShopItemResponse,
  ShopItemType,
  UserInventoryResponse,
} from "@/types";

type TabKey = "vidas" | "potenciadores" | "especiales";

const TAB_LABEL: Record<TabKey, string> = {
  vidas: "Vidas",
  potenciadores: "Potenciadores",
  especiales: "Especiales",
};

const TAB_FOR_TYPE: Record<ShopItemType, TabKey> = {
  LIFE: "vidas",
  UNLIMITED_LIVES: "vidas",
  XP_MULTIPLIER: "potenciadores",
  STREAK_SHIELD: "potenciadores",
  MYSTERY_CHEST: "especiales",
  GEMS: "especiales",
};

const ICON_FOR_TYPE: Record<ShopItemType, keyof typeof Ionicons.glyphMap> = {
  LIFE: "heart",
  UNLIMITED_LIVES: "infinite",
  XP_MULTIPLIER: "flash",
  STREAK_SHIELD: "shield-half",
  MYSTERY_CHEST: "gift",
  GEMS: "diamond",
};

const TONE_FOR_TYPE: Record<ShopItemType, string> = {
  LIFE: colors.danger,
  UNLIMITED_LIVES: colors.primary,
  XP_MULTIPLIER: colors.warning,
  STREAK_SHIELD: colors.success,
  MYSTERY_CHEST: colors.primary,
  GEMS: colors.warning,
};

function metaForItem(item: ShopItemResponse): string {
  switch (item.itemType) {
    case "LIFE":
      return item.quantity === 1 ? "1 vida" : `${item.quantity} vidas`;
    case "UNLIMITED_LIVES":
      return item.durationMinutes ? `${item.durationMinutes} minutos` : "Tiempo limitado";
    case "XP_MULTIPLIER":
      return `x${item.multiplierValue ?? "?"}${item.durationMinutes ? ` · ${item.durationMinutes} minutos` : ""}`;
    case "STREAK_SHIELD":
      return item.quantity === 1 ? "1 escudo" : `${item.quantity} escudos`;
    case "MYSTERY_CHEST":
      return "1 recompensa sorpresa";
    case "GEMS":
      return `+${item.quantity} gemas`;
    default:
      return "";
  }
}

function effectLabel(effect: AppliedEffectResponse): string {
  switch (effect.type) {
    case "GEMS":
      return `${effect.gemsGranted ?? 0} gemas`;
    case "LIFE":
      return effect.livesGranted === 1 ? "1 vida" : `${effect.livesGranted ?? 0} vidas`;
    case "STREAK_SHIELD":
      return effect.streakShieldsGranted === 1
        ? "1 escudo de racha"
        : `${effect.streakShieldsGranted ?? 0} escudos de racha`;
    case "XP_MULTIPLIER":
      return `Multiplicador de XP x${effect.xpMultiplierValue ?? "?"}${
        effect.durationMinutes ? ` · ${effect.durationMinutes} min` : ""
      }`;
    case "UNLIMITED_LIVES":
      return `Vidas infinitas${effect.durationMinutes ? ` · ${effect.durationMinutes} min` : ""}`;
    default:
      return "";
  }
}

type Flow =
  | { step: "confirm"; item: ShopItemResponse }
  | { step: "insufficient"; item: ShopItemResponse }
  | { step: "gift"; item: ShopItemResponse }
  | { step: "chest"; item: ShopItemResponse }
  | { step: "success"; item: ShopItemResponse; gemsSpent: number; effect?: AppliedEffectResponse; giftedTo?: string }
  | null;

export function StoreScreen() {
  const [tab, setTab] = useState<TabKey>("vidas");
  const [items, setItems] = useState<ShopItemResponse[]>([]);
  const [inventory, setInventory] = useState<UserInventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [flow, setFlow] = useState<Flow>(null);
  const [busy, setBusy] = useState(false);

  const [giftUsername, setGiftUsername] = useState("");
  const [giftLookup, setGiftLookup] = useState<PublicUserProfileResponse | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSearching, setGiftSearching] = useState(false);

  const load = useCallback(async () => {
    try {
      const [itemsRes, invRes] = await Promise.all([
        storeApi.getItems(),
        inventoryApi.getMyInventory(),
      ]);
      setItems(itemsRes.data);
      setInventory(invRes.data);
    } catch (err) {
      Alert.alert("Error", "No se pudo cargar la tienda.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function closeFlow() {
    setFlow(null);
    setGiftUsername("");
    setGiftLookup(null);
    setGiftError(null);
  }

  function openBuy(item: ShopItemResponse) {
    if (!inventory) return;
    if (inventory.gems < item.priceGems) {
      setFlow({ step: "insufficient", item });
    } else {
      setFlow({ step: "confirm", item });
    }
  }

  async function purchaseForSelf(item: ShopItemResponse) {
    setBusy(true);
    try {
      if (item.itemType === "MYSTERY_CHEST") {
        setFlow({ step: "chest", item });
      }
      const { data } = await storeApi.purchase({ shopItemId: item.id });
      setInventory(data.inventory);
      const reveal = () =>
        setFlow({ step: "success", item, gemsSpent: data.gemsSpent, effect: data.effect });
      if (item.itemType === "MYSTERY_CHEST") {
        setTimeout(reveal, 1800);
      } else {
        reveal();
      }
    } catch (err: any) {
      setFlow(null);
      Alert.alert("No se pudo comprar", err?.response?.data?.message ?? "Intentá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  async function lookupGiftRecipient() {
    const username = giftUsername.trim();
    if (!username) return;
    setGiftSearching(true);
    setGiftError(null);
    setGiftLookup(null);
    try {
      const { data } = await usersApi.getByUsername(username);
      setGiftLookup(data);
    } catch {
      setGiftError("No encontramos a ese usuario.");
    } finally {
      setGiftSearching(false);
    }
  }

  async function sendGift(item: ShopItemResponse, recipient: PublicUserProfileResponse) {
    setBusy(true);
    try {
      await storeApi.sendGift({ shopItemId: item.id, recipientUserId: recipient.id });
      const invRes = await inventoryApi.getMyInventory();
      setInventory(invRes.data);
      setFlow({ step: "success", item, gemsSpent: item.priceGems, giftedTo: recipient.name || recipient.username });
    } catch (err: any) {
      Alert.alert("No se pudo enviar el regalo", err?.response?.data?.message ?? "Intentá de nuevo en un momento.");
    } finally {
      setBusy(false);
    }
  }

  const visibleItems = items.filter((it) => TAB_FOR_TYPE[it.itemType] === tab);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Tienda</Text>
          <Text style={styles.headerSubtitle}>Gastá tus gemas en vidas y potenciadores para seguir aprendiendo.</Text>
        </View>
        <View style={styles.statsRow}>
          <StatChip icon="diamond" label="Gemas" value={inventory ? String(inventory.gems) : "—"} />
          <StatChip
            icon="heart"
            label="Vidas"
            value={
              inventory
                ? inventory.unlimitedLivesActive
                  ? "∞"
                  : `${inventory.currentLives ?? 0}/5`
                : "—"
            }
          />
          <StatChip icon="shield-half" label="Escudos" value={inventory ? String(inventory.streakShields) : "—"} />
        </View>
      </View>

      <View style={styles.tabs}>
        {(Object.keys(TAB_LABEL) as TabKey[]).map((key) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={[styles.tabChip, tab === key && styles.tabChipActive]}
          >
            <Text style={[styles.tabChipLabel, tab === key && styles.tabChipLabelActive]}>{TAB_LABEL[key]}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {visibleItems.length === 0 ? (
            <Text style={styles.emptyText}>No hay ítems disponibles en esta categoría.</Text>
          ) : (
            visibleItems.map((item) => (
              <ShopItemCard key={item.id} item={item} onBuy={() => openBuy(item)} />
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={flow?.step === "confirm" || flow?.step === "gift" || flow?.step === "insufficient"} transparent animationType="slide" onRequestClose={closeFlow}>
        <Pressable style={styles.backdrop} onPress={closeFlow}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {flow?.step === "confirm" && (
              <ConfirmSheet
                item={flow.item}
                gems={inventory?.gems ?? 0}
                busy={busy}
                onBuy={() => purchaseForSelf(flow.item)}
                onGift={() => setFlow({ step: "gift", item: flow.item })}
                onCancel={closeFlow}
              />
            )}
            {flow?.step === "gift" && (
              <GiftSheet
                item={flow.item}
                username={giftUsername}
                onChangeUsername={(v) => {
                  setGiftUsername(v);
                  setGiftLookup(null);
                  setGiftError(null);
                }}
                onSearch={lookupGiftRecipient}
                searching={giftSearching}
                lookup={giftLookup}
                error={giftError}
                busy={busy}
                onSend={() => giftLookup && sendGift(flow.item, giftLookup)}
                onBack={() => setFlow({ step: "confirm", item: flow.item })}
              />
            )}
            {flow?.step === "insufficient" && (
              <InsufficientSheet item={flow.item} gems={inventory?.gems ?? 0} onClose={closeFlow} />
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={flow?.step === "chest"} transparent animationType="fade">
        {flow?.step === "chest" && <ChestOverlay />}
      </Modal>

      <Modal visible={flow?.step === "success"} transparent animationType="fade" onRequestClose={closeFlow}>
        {flow?.step === "success" && (
          <SuccessOverlay
            item={flow.item}
            gemsSpent={flow.gemsSpent}
            effect={flow.effect}
            giftedTo={flow.giftedTo}
            gemsLeft={inventory?.gems ?? 0}
            onClose={closeFlow}
          />
        )}
      </Modal>
    </View>
  );
}

function StatChip({ icon, label, value }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Ionicons name={icon} size={16} color={colors.white} />
        <Text style={styles.statValue}>{value}</Text>
      </View>
    </View>
  );
}

function ShopItemCard({ item, onBuy }: { item: ShopItemResponse; onBuy: () => void }) {
  const featured = item.itemType === "UNLIMITED_LIVES";
  const tone = TONE_FOR_TYPE[item.itemType];

  return (
    <View style={[styles.card, featured && styles.cardFeatured]}>
      <View style={styles.cardTop}>
        <View style={[styles.medallion, { backgroundColor: featured ? "rgba(255,255,255,0.2)" : tone + "22" }]}>
          <Ionicons name={ICON_FOR_TYPE[item.itemType]} size={24} color={featured ? colors.white : tone} />
        </View>
        <View style={styles.cardTextCol}>
          <Text style={[styles.cardTitle, featured && styles.cardTitleFeatured]}>{item.title}</Text>
          <Text style={[styles.cardMeta, featured && styles.cardMetaFeatured]}>{metaForItem(item)}</Text>
        </View>
        <View style={[styles.priceChip, featured && styles.priceChipFeatured]}>
          <Ionicons name="diamond" size={14} color={featured ? colors.white : colors.primary} />
          <Text style={[styles.priceText, featured && styles.priceTextFeatured]}>{item.priceGems}</Text>
        </View>
      </View>
      <Text style={[styles.cardDesc, featured && styles.cardDescFeatured]}>{item.description}</Text>
      {item.itemType === "MYSTERY_CHEST" && (
        <View style={styles.chestRewards}>
          <Ionicons name="diamond" size={20} color={colors.primary} />
          <Ionicons name="heart" size={20} color={colors.danger} />
          <Ionicons name="flash" size={20} color={colors.warning} />
          <Ionicons name="shield-half" size={20} color={colors.success} />
        </View>
      )}
      <Button
        label="Comprar"
        onPress={onBuy}
        style={featured ? styles.buyBtnFeatured : styles.buyBtn}
      />
    </View>
  );
}

function ConfirmSheet({
  item,
  gems,
  busy,
  onBuy,
  onGift,
  onCancel,
}: {
  item: ShopItemResponse;
  gems: number;
  busy: boolean;
  onBuy: () => void;
  onGift: () => void;
  onCancel: () => void;
}) {
  return (
    <View>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>Confirmar compra</Text>
      <ItemRow item={item} />
      <View style={styles.mathRow}>
        <View>
          <Text style={styles.mathLabel}>Tenés</Text>
          <Text style={styles.mathValue}>{gems} gemas</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.mathLabel}>Te quedan</Text>
          <Text style={[styles.mathValue, { color: colors.primary }]}>{gems - item.priceGems} gemas</Text>
        </View>
      </View>
      <Button label="Comprar para mí" onPress={onBuy} loading={busy} style={styles.mt} />
      <Button label="Regalar a un amigo" variant="outline" onPress={onGift} disabled={busy} style={styles.mt} />
      <Pressable onPress={onCancel} style={styles.ghostBtn}>
        <Text style={styles.ghostBtnLabel}>Cancelar</Text>
      </Pressable>
    </View>
  );
}

function GiftSheet({
  item,
  username,
  onChangeUsername,
  onSearch,
  searching,
  lookup,
  error,
  busy,
  onSend,
  onBack,
}: {
  item: ShopItemResponse;
  username: string;
  onChangeUsername: (v: string) => void;
  onSearch: () => void;
  searching: boolean;
  lookup: PublicUserProfileResponse | null;
  error: string | null;
  busy: boolean;
  onSend: () => void;
  onBack: () => void;
}) {
  return (
    <View>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>¿A quién se lo regalás?</Text>
      <Text style={styles.sheetSubtitle}>
        {item.title} · {item.priceGems} gemas de tu saldo
      </Text>
      <View style={styles.giftSearchRow}>
        <TextInput
          style={styles.giftInput}
          placeholder="Usuario (sin @)"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          value={username}
          onChangeText={onChangeUsername}
          onSubmitEditing={onSearch}
        />
        <Pressable style={styles.searchBtn} onPress={onSearch} disabled={searching}>
          {searching ? <ActivityIndicator size="small" color={colors.white} /> : <Ionicons name="search" size={18} color={colors.white} />}
        </Pressable>
      </View>
      {!!error && <Text style={styles.giftError}>{error}</Text>}
      {lookup && (
        <View style={styles.friendRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarLabel}>{(lookup.name || lookup.username).charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.friendName}>{lookup.name}</Text>
            <Text style={styles.friendUsername}>@{lookup.username}</Text>
          </View>
          <Ionicons name="paper-plane" size={18} color={colors.primary} />
        </View>
      )}
      <Button label="Enviar regalo" onPress={onSend} loading={busy} disabled={!lookup} style={styles.mt} />
      <Pressable onPress={onBack} style={styles.ghostBtn}>
        <Text style={styles.ghostBtnLabel}>Volver</Text>
      </Pressable>
    </View>
  );
}

function InsufficientSheet({ item, gems, onClose }: { item: ShopItemResponse; gems: number; onClose: () => void }) {
  const falta = item.priceGems - gems;
  return (
    <View>
      <View style={styles.sheetHandle} />
      <View style={styles.insufficientIcon}>
        <Ionicons name="diamond" size={34} color={colors.danger} />
      </View>
      <Text style={styles.sheetTitle}>Te faltan {falta} gemas</Text>
      <Text style={styles.sheetSubtitle}>
        Completá lecciones, mantené tu racha y superá desafíos para conseguir más gemas.
      </Text>
      <View style={styles.mathRow}>
        <View>
          <Text style={styles.mathLabel}>Tu saldo</Text>
          <Text style={styles.mathValue}>{gems} gemas</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.mathLabel}>{item.title}</Text>
          <Text style={[styles.mathValue, { color: colors.danger }]}>{item.priceGems} gemas</Text>
        </View>
      </View>
      <Button label="Entendido" onPress={onClose} style={styles.mt} />
    </View>
  );
}

function ItemRow({ item }: { item: ShopItemResponse }) {
  const tone = TONE_FOR_TYPE[item.itemType];
  return (
    <View style={styles.itemRow}>
      <View style={[styles.medallionSm, { backgroundColor: tone + "22" }]}>
        <Ionicons name={ICON_FOR_TYPE[item.itemType]} size={22} color={tone} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.itemRowTitle}>{item.title}</Text>
        <Text style={styles.itemRowMeta}>{metaForItem(item)}</Text>
      </View>
      <View style={styles.priceChip}>
        <Ionicons name="diamond" size={14} color={colors.primary} />
        <Text style={styles.priceText}>{item.priceGems}</Text>
      </View>
    </View>
  );
}

function ChestOverlay() {
  const scale = useRef(new Animated.Value(0.7)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.94, duration: 550, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    ).start();
  }, [scale]);

  return (
    <View style={styles.fullOverlay}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons name="gift" size={92} color={colors.white} />
      </Animated.View>
      <Text style={styles.fullTitle}>Abriendo el cofre…</Text>
      <Text style={styles.fullSubtitle}>Veamos qué te tocó</Text>
    </View>
  );
}

function SuccessOverlay({
  item,
  gemsSpent,
  effect,
  giftedTo,
  gemsLeft,
  onClose,
}: {
  item: ShopItemResponse;
  gemsSpent: number;
  effect?: AppliedEffectResponse;
  giftedTo?: string;
  gemsLeft: number;
  onClose: () => void;
}) {
  const pop = useRef(new Animated.Value(0.2)).current;
  useEffect(() => {
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
  }, [pop]);

  const isGift = !!giftedTo;
  const isChestReveal = !isGift && item.itemType === "MYSTERY_CHEST" && !!effect;
  const icon = isGift ? "paper-plane" : effect ? ICON_FOR_TYPE[effect.type] : ICON_FOR_TYPE[item.itemType];
  const title = isGift ? "¡Regalo enviado!" : isChestReveal ? `¡Te tocó ${effectLabel(effect!)}!` : "¡Compra exitosa!";
  const subtitle = isGift
    ? `${giftedTo} ya puede reclamar tu ${item.title.toLowerCase()}.`
    : item.itemType === "UNLIMITED_LIVES"
      ? "Tenés vidas infinitas por tiempo limitado. Aprovechalas."
      : `${item.title} está listo para usar.`;

  return (
    <View style={styles.fullOverlay}>
      <Animated.View style={[styles.successIcon, { transform: [{ scale: pop }] }]}>
        <Ionicons name={icon as keyof typeof Ionicons.glyphMap} size={72} color={colors.white} />
      </Animated.View>
      <Text style={styles.fullTitle}>{title}</Text>
      <Text style={styles.fullSubtitle}>{subtitle}</Text>
      <View style={styles.successStats}>
        <View style={styles.successStatRow}>
          <Text style={styles.successStatLabel}>Gastaste</Text>
          <Text style={styles.successStatValue}>−{gemsSpent}</Text>
        </View>
        <View style={styles.successDivider} />
        <View style={styles.successStatRow}>
          <Text style={styles.successStatLabel}>Saldo restante</Text>
          <Text style={styles.successStatValueBig}>{gemsLeft}</Text>
        </View>
      </View>
      <Pressable style={styles.continueBtn} onPress={onClose}>
        <Ionicons name="arrow-forward" size={26} color={colors.white} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { backgroundColor: colors.primary, padding: 24, paddingTop: 56, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  headerTop: { marginBottom: 16 },
  headerTitle: { fontFamily: fonts.headingBold, fontSize: fontSizes.xxl, color: colors.white },
  headerSubtitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.white, opacity: 0.88, marginTop: 6, maxWidth: 280 },
  statsRow: { flexDirection: "row", gap: 8 },
  statChip: { flex: 1, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 16, padding: 11 },
  statLabel: { fontFamily: fonts.bodySemiBold, fontSize: 10, letterSpacing: 0.6, textTransform: "uppercase", color: colors.white, opacity: 0.75 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  statValue: { fontFamily: fonts.headingBold, fontSize: fontSizes.lg, color: colors.white },

  tabs: { flexDirection: "row", gap: 8, paddingHorizontal: 24, paddingVertical: 14 },
  tabChip: { height: 36, paddingHorizontal: 16, borderRadius: 999, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  tabChipActive: { backgroundColor: colors.text },
  tabChipLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm, color: colors.textMuted },
  tabChipLabelActive: { color: colors.white },

  list: { paddingHorizontal: 24, paddingBottom: 40, gap: 14 },
  emptyText: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted, textAlign: "center", marginTop: 40 },

  card: { backgroundColor: colors.white, borderRadius: 20, padding: 18 },
  cardFeatured: { backgroundColor: colors.primary },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 14 },
  medallion: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  medallionSm: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  cardTextCol: { flex: 1, minWidth: 0 },
  cardTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.text },
  cardTitleFeatured: { color: colors.white },
  cardMeta: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },
  cardMetaFeatured: { color: "rgba(255,255,255,0.8)" },
  priceChip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, backgroundColor: colors.background },
  priceChipFeatured: { backgroundColor: "rgba(255,255,255,0.22)" },
  priceText: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.sm, color: colors.text },
  priceTextFeatured: { color: colors.white },
  cardDesc: { marginTop: 12, fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, lineHeight: 20, color: colors.textMuted },
  cardDescFeatured: { color: "rgba(255,255,255,0.9)" },
  chestRewards: { flexDirection: "row", gap: 16, justifyContent: "center", marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: colors.border },
  buyBtn: { marginTop: 16 },
  buyBtnFeatured: { marginTop: 16, backgroundColor: colors.white },

  backdrop: { flex: 1, backgroundColor: "rgba(29,40,60,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.white, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 18 },
  sheetTitle: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text },
  sheetSubtitle: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  mt: { marginTop: 10 },

  itemRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 16, padding: 14, borderRadius: 16, backgroundColor: colors.background },
  itemRowTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.text },
  itemRowMeta: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 2 },

  mathRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 16, paddingHorizontal: 4 },
  mathLabel: { fontFamily: fonts.bodySemiBold, fontSize: 11, letterSpacing: 0.6, textTransform: "uppercase", color: colors.textMuted },
  mathValue: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.text, marginTop: 3 },

  ghostBtn: { paddingVertical: 12, alignItems: "center" },
  ghostBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.sm, color: colors.textMuted },

  giftSearchRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  giftInput: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontFamily: fonts.bodyRegular, fontSize: fontSizes.md, color: colors.text, backgroundColor: colors.background },
  searchBtn: { width: 46, borderRadius: 12, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  giftError: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.xs, color: colors.danger, marginTop: 8 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 13, marginTop: 14, padding: 12, borderRadius: 16, backgroundColor: colors.background },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  avatarLabel: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.white },
  friendName: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.sm, color: colors.text },
  friendUsername: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.xs, color: colors.textMuted, marginTop: 1 },

  insufficientIcon: { width: 72, height: 72, borderRadius: 22, backgroundColor: "rgba(224,49,49,0.12)", alignItems: "center", justifyContent: "center", marginBottom: 16 },

  fullOverlay: { flex: 1, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", padding: 30 },
  successIcon: { width: 150, height: 150, borderRadius: 75, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  fullTitle: { fontFamily: fonts.headingBold, fontSize: fontSizes.xxl, color: colors.white, marginTop: 26, textAlign: "center" },
  fullSubtitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.white, opacity: 0.9, marginTop: 10, textAlign: "center", maxWidth: 280 },
  successStats: { width: "100%", maxWidth: 300, backgroundColor: "rgba(255,255,255,0.16)", borderRadius: 20, padding: 16, marginTop: 24, gap: 9 },
  successStatRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  successStatLabel: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.white, opacity: 0.85 },
  successStatValue: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, color: colors.white },
  successStatValueBig: { fontFamily: fonts.headingBold, fontSize: fontSizes.lg, color: colors.white },
  successDivider: { height: 1, backgroundColor: "rgba(255,255,255,0.28)" },
  continueBtn: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(0,0,0,0.2)", alignItems: "center", justifyContent: "center", marginTop: 30 },
});
