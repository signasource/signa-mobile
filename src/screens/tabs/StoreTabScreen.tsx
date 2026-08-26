import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, fontSizes } from "@/theme";
import { shopApi, ShopItem, ShopItemType, ShopInventory, AppliedEffect } from "@/api/shop";

type TabKey = "vidas" | "potenciadores" | "especiales";
type FlowStep = "confirm" | "insufficient" | "opening" | "success";

interface Flow {
  step: FlowStep;
  item: ShopItem;
  effect?: AppliedEffect;
}

const TAB_LABEL: Record<TabKey, string> = {
  vidas: "Vidas",
  potenciadores: "Potenciadores",
  especiales: "Especiales",
};

const TAB_TYPES: Record<TabKey, ShopItemType[]> = {
  vidas: ["LIFE", "UNLIMITED_LIVES"],
  potenciadores: ["XP_MULTIPLIER", "STREAK_SHIELD"],
  especiales: ["MYSTERY_CHEST", "GEMS"],
};

const ICON: Record<ShopItemType, keyof typeof Ionicons.glyphMap> = {
  LIFE: "heart",
  UNLIMITED_LIVES: "infinite",
  XP_MULTIPLIER: "flash",
  STREAK_SHIELD: "shield-half",
  MYSTERY_CHEST: "gift",
  GEMS: "diamond",
};

const TONE: Record<ShopItemType, string> = {
  LIFE: colors.danger,
  UNLIMITED_LIVES: colors.shopAmber,
  XP_MULTIPLIER: colors.warning,
  STREAK_SHIELD: colors.success,
  MYSTERY_CHEST: colors.shopAmber,
  GEMS: colors.primary,
};

const TINT: Record<ShopItemType, string> = {
  LIFE: colors.dangerLight,
  UNLIMITED_LIVES: colors.shopAmberLight,
  XP_MULTIPLIER: colors.warningLight,
  STREAK_SHIELD: colors.successLight,
  MYSTERY_CHEST: colors.shopAmberLight,
  GEMS: colors.primaryLight,
};

function metaFor(item: ShopItem): string {
  if (item.itemType === "XP_MULTIPLIER") {
    return `x${item.multiplierValue} · ${item.durationMinutes} minutos`;
  }
  if (item.itemType === "UNLIMITED_LIVES") {
    return `${item.durationMinutes} minutos`;
  }
  if (item.itemType === "LIFE") {
    return item.quantity === 1 ? "1 vida" : `${item.quantity} vidas`;
  }
  if (item.itemType === "STREAK_SHIELD") {
    return item.quantity === 1 ? "1 escudo" : `${item.quantity} escudos`;
  }
  if (item.itemType === "GEMS") {
    return `${item.quantity} gemas`;
  }
  return "1 recompensa";
}

function effectLabel(effect: AppliedEffect): string {
  switch (effect.type) {
    case "GEMS":
      return `${effect.gemsGranted ?? 0} gemas`;
    case "LIFE":
      return `${effect.livesGranted ?? 0} ${effect.livesGranted === 1 ? "vida" : "vidas"}`;
    case "STREAK_SHIELD":
      return `${effect.streakShieldsGranted ?? 0} ${
        effect.streakShieldsGranted === 1 ? "escudo" : "escudos"
      } de racha`;
    case "XP_MULTIPLIER":
      return `multiplicador de XP x${effect.xpMultiplierValue ?? 1}`;
    case "UNLIMITED_LIVES":
      return `vidas infinitas por ${effect.durationMinutes ?? 0} minutos`;
    default:
      return "una recompensa";
  }
}

export function StoreTabScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [inventory, setInventory] = useState<ShopInventory | null>(null);
  const [tab, setTab] = useState<TabKey>("vidas");
  const [flow, setFlow] = useState<Flow | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadShop();
    return () => {
      if (openTimer.current) clearTimeout(openTimer.current);
    };
  }, []);

  async function loadShop() {
    setError(null);
    setLoading(true);
    try {
      const [itemsRes, inventoryRes] = await Promise.all([
        shopApi.getItems(),
        shopApi.getMyInventory(),
      ]);
      setItems(itemsRes.data);
      setInventory(inventoryRes.data);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar la tienda.");
    } finally {
      setLoading(false);
    }
  }

  function closeFlow() {
    if (openTimer.current) clearTimeout(openTimer.current);
    setFlow(null);
  }

  function openBuy(item: ShopItem) {
    const enough = (inventory?.gems ?? 0) >= item.priceGems;
    setFlow({ step: enough ? "confirm" : "insufficient", item });
  }

  async function confirmPurchase(item: ShopItem) {
    setPurchasing(true);
    try {
      const { data } = await shopApi.purchase(item.id);
      setInventory(data.inventory);
      if (item.itemType === "MYSTERY_CHEST") {
        setFlow({ step: "opening", item, effect: data.effect });
        openTimer.current = setTimeout(() => {
          setFlow({ step: "success", item, effect: data.effect });
        }, 1400);
      } else {
        setFlow({ step: "success", item, effect: data.effect });
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos completar la compra.");
      closeFlow();
    } finally {
      setPurchasing(false);
    }
  }

  const gems = inventory?.gems ?? 0;
  const livesLabel =
    inventory?.livesMode === "INFINITE" ? "∞" : `${inventory?.currentLives ?? 0}/5`;
  const shields = inventory?.streakShields ?? 0;
  const visibleItems = items.filter((i) => TAB_TYPES[tab].includes(i.itemType));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <View style={styles.headerGlow} />
        <Text style={styles.headerTitle}>Tienda</Text>
        <Text style={styles.headerSubtitle}>
          Gastá tus gemas en vidas y potenciadores para seguir aprendiendo.
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Gemas</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="diamond" size={17} color={colors.onPrimary} />
              <Text style={styles.statValue}>{gems}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Vidas</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="heart" size={17} color={colors.onPrimary} />
              <Text style={styles.statValue}>{livesLabel}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Escudos</Text>
            <View style={styles.statValueRow}>
              <Ionicons name="shield-half" size={17} color={colors.onPrimary} />
              <Text style={styles.statValue}>{shields}</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.tabsRow}>
        {(Object.keys(TAB_LABEL) as TabKey[]).map((key) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              onPress={() => setTab(key)}
              style={[styles.chip, active && styles.chipActive]}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {TAB_LABEL[key]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.shopAmber} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centerFill}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadShop} activeOpacity={0.85}>
            <Text style={styles.retryButtonText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        >
          {visibleItems.map((item) => {
            const featured = item.itemType === "UNLIMITED_LIVES";
            return (
              <View
                key={item.id}
                style={[styles.card, featured ? styles.cardFeatured : styles.cardPlain]}
              >
                <View style={styles.cardRow}>
                  <View
                    style={[
                      styles.medallion,
                      { backgroundColor: featured ? "rgba(255,255,255,0.22)" : TINT[item.itemType] },
                    ]}
                  >
                    <Ionicons
                      name={ICON[item.itemType]}
                      size={26}
                      color={featured ? colors.onDark : TONE[item.itemType]}
                    />
                  </View>
                  <View style={styles.cardTexts}>
                    <Text style={[styles.cardTitle, featured && styles.cardTitleFeatured]}>
                      {item.title}
                    </Text>
                    <Text style={[styles.cardMeta, featured && styles.cardMetaFeatured]}>
                      {metaFor(item)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.priceChip,
                      featured && { backgroundColor: "rgba(255,255,255,0.22)" },
                    ]}
                  >
                    <Ionicons
                      name="diamond"
                      size={15}
                      color={featured ? colors.onDark : colors.shopAmber}
                    />
                    <Text style={[styles.priceText, featured && styles.priceTextFeatured]}>
                      {item.priceGems}
                    </Text>
                  </View>
                </View>

                <Text style={[styles.cardDesc, featured && styles.cardDescFeatured]}>
                  {item.description}
                </Text>

                {item.itemType === "MYSTERY_CHEST" && (
                  <View style={styles.rewardsRow}>
                    <Text style={styles.rewardsLabel}>Posibles recompensas</Text>
                    <View style={styles.rewardsIcons}>
                      <Ionicons name="diamond" size={20} color={colors.primary} />
                      <Ionicons name="heart" size={20} color={colors.danger} />
                      <Ionicons name="flash" size={20} color={colors.warning} />
                      <Ionicons name="shield-half" size={20} color={colors.success} />
                      <Ionicons name="infinite" size={20} color={colors.shopAmber} />
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  style={[styles.buyButton, featured && styles.buyButtonFeatured]}
                  onPress={() => openBuy(item)}
                  activeOpacity={0.86}
                >
                  <Text style={[styles.buyButtonText, featured && styles.buyButtonTextFeatured]}>
                    Comprar
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {visibleItems.length === 0 && (
            <Text style={styles.emptyText}>No hay ítems disponibles en esta categoría.</Text>
          )}
        </ScrollView>
      )}

      <Modal
        visible={!!flow}
        transparent
        animationType="fade"
        onRequestClose={closeFlow}
        statusBarTranslucent
      >
        {flow?.step === "confirm" && (
          <Pressable style={styles.backdrop} onPress={closeFlow}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Confirmar compra</Text>
              <View style={styles.itemRow}>
                <View style={[styles.medallionSm, { backgroundColor: TINT[flow.item.itemType] }]}>
                  <Ionicons name={ICON[flow.item.itemType]} size={24} color={TONE[flow.item.itemType]} />
                </View>
                <View style={styles.cardTexts}>
                  <Text style={styles.itemRowTitle}>{flow.item.title}</Text>
                  <Text style={styles.itemRowMeta}>{metaFor(flow.item)}</Text>
                </View>
                <View style={styles.itemRowPrice}>
                  <Ionicons name="diamond" size={16} color={colors.shopAmber} />
                  <Text style={styles.itemRowPriceText}>{flow.item.priceGems}</Text>
                </View>
              </View>
              <View style={styles.mathRow}>
                <View>
                  <Text style={styles.label}>Tenés</Text>
                  <Text style={styles.mathValue}>{gems} gemas</Text>
                </View>
                <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.label}>Te quedan</Text>
                  <Text style={[styles.mathValue, { color: colors.shopAmberDark }]}>
                    {gems - flow.item.priceGems} gemas
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.darkButton}
                onPress={() => confirmPurchase(flow.item)}
                disabled={purchasing}
                activeOpacity={0.86}
              >
                {purchasing ? (
                  <ActivityIndicator color={colors.onDark} />
                ) : (
                  <Text style={styles.darkButtonText}>Comprar</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity style={styles.ghostButton} onPress={closeFlow} disabled={purchasing}>
                <Text style={styles.ghostButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        )}

        {flow?.step === "insufficient" && (
          <Pressable style={styles.backdrop} onPress={closeFlow}>
            <Pressable style={styles.sheet} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <View style={styles.insufficientIcon}>
                <Ionicons name="diamond" size={34} color={colors.danger} />
              </View>
              <Text style={styles.sheetTitle}>
                Te faltan {flow.item.priceGems - gems} gemas
              </Text>
              <Text style={styles.insufficientSub}>
                Completá lecciones, mantené tu racha y superá desafíos para conseguir más gemas.
              </Text>
              <View style={styles.mathRow}>
                <View>
                  <Text style={styles.label}>Tu saldo</Text>
                  <Text style={styles.mathValue}>{gems} gemas</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.label}>{flow.item.title}</Text>
                  <Text style={[styles.mathValue, { color: colors.danger }]}>
                    {flow.item.priceGems} gemas
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={styles.darkButton} onPress={closeFlow} activeOpacity={0.86}>
                <Text style={styles.darkButtonText}>Entendido</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        )}

        {flow?.step === "opening" && (
          <View style={styles.fullOverlay}>
            <Ionicons name="gift" size={82} color={colors.onDark} />
            <Text style={styles.fullTitle}>Abriendo el cofre…</Text>
            <Text style={styles.fullSub}>Veamos qué te tocó</Text>
          </View>
        )}

        {flow?.step === "success" && (
          <View style={[styles.fullOverlay, { backgroundColor: colors.shopAmber }]}>
            <View style={styles.successMedallion}>
              <Ionicons
                name={flow.effect ? ICON[flow.effect.type] : ICON[flow.item.itemType]}
                size={82}
                color={colors.onDark}
              />
            </View>
            <Text style={styles.fullTitle}>
              {flow.item.itemType === "MYSTERY_CHEST" && flow.effect
                ? `¡Te tocó ${effectLabel(flow.effect)}!`
                : "¡Compra exitosa!"}
            </Text>
            <Text style={styles.fullSub}>
              {flow.item.itemType === "MYSTERY_CHEST"
                ? "Ya está sumado a tu inventario."
                : flow.item.itemType === "UNLIMITED_LIVES"
                ? `Tenés vidas infinitas por ${flow.item.durationMinutes} minutos. Aprovechalas.`
                : `${flow.item.title} está listo para usar.`}
            </Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Gastaste</Text>
                <Text style={styles.summaryValue}>−{flow.item.priceGems}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Saldo restante</Text>
                <Text style={styles.summaryValueBig}>{gems}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.continueButton} onPress={closeFlow} activeOpacity={0.86}>
              <Ionicons name="arrow-forward" size={27} color={colors.onDark} />
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.shopAmber,
    paddingHorizontal: 30,
    paddingBottom: 20,
    overflow: "hidden",
  },
  headerGlow: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  headerTitle: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xxl,
    color: colors.onDark,
    letterSpacing: -1,
  },
  headerSubtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onDark,
    opacity: 0.88,
    marginTop: 8,
    maxWidth: 280,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 18,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 16,
    padding: 11,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.onDark,
    opacity: 0.75,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 21,
    color: colors.onDark,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 30,
    paddingTop: 16,
    paddingBottom: 6,
  },
  chip: {
    height: 34,
    paddingHorizontal: 15,
    borderRadius: 999,
    justifyContent: "center",
    backgroundColor: colors.fill,
  },
  chipActive: {
    backgroundColor: colors.text,
  },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  chipTextActive: {
    color: colors.onDark,
  },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 30,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
  retryButton: {
    backgroundColor: colors.text,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  retryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  list: {
    padding: 30,
    paddingTop: 14,
    gap: 14,
  },
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
    backgroundColor: colors.shopAmber,
    shadowColor: colors.text,
    shadowOpacity: 0.18,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  cardRow: {
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
  },
  medallionSm: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cardTexts: {
    flex: 1,
    minWidth: 0,
  },
  cardTitle: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 17.5,
    color: colors.text,
    letterSpacing: -0.4,
  },
  cardTitleFeatured: {
    color: colors.onDark,
  },
  cardMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 3,
  },
  cardMetaFeatured: {
    color: "rgba(251,246,242,0.8)",
  },
  priceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.fill,
  },
  priceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 15.5,
    color: colors.text,
  },
  priceTextFeatured: {
    color: colors.onDark,
  },
  cardDesc: {
    marginTop: 12,
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
  cardDescFeatured: {
    color: "rgba(251,246,242,0.9)",
  },
  rewardsRow: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rewardsLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 11,
  },
  rewardsIcons: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  buyButton: {
    width: "100%",
    marginTop: 16,
    minHeight: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
    shadowColor: colors.text,
    shadowOpacity: 0.22,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  buyButtonFeatured: {
    backgroundColor: colors.onDark,
    shadowOpacity: 0,
    elevation: 0,
  },
  buyButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
    letterSpacing: 0.2,
  },
  buyButtonTextFeatured: {
    color: colors.shopAmberDark,
  },
  emptyText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    paddingTop: 40,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36,26,22,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 22,
    paddingBottom: 34,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.7,
    textAlign: "center",
  },
  itemRow: {
    flexDirection: "row",
    gap: 13,
    alignItems: "center",
    marginTop: 16,
    padding: 14,
    borderRadius: 18,
    backgroundColor: colors.fill,
  },
  itemRowTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.text,
  },
  itemRowMeta: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  itemRowPrice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  itemRowPriceText: {
    fontFamily: fonts.bodyBold,
    fontSize: 16,
    color: colors.text,
  },
  mathRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 16,
    paddingHorizontal: 4,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  mathValue: {
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    color: colors.text,
    marginTop: 3,
  },
  darkButton: {
    minHeight: 58,
    borderRadius: 18,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 22,
  },
  darkButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },
  ghostButton: {
    alignItems: "center",
    paddingTop: 10,
  },
  ghostButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
  insufficientIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.dangerLight,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    marginBottom: 16,
    alignSelf: "center",
  },
  insufficientSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 8,
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: colors.shopAmberDark,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  successMedallion: {
    width: 168,
    height: 168,
    borderRadius: 84,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  fullTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    color: colors.onDark,
    letterSpacing: -1,
    textAlign: "center",
    marginTop: 26,
  },
  fullSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onPrimary,
    opacity: 0.9,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },
  summaryCard: {
    width: "100%",
    maxWidth: 300,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 20,
    padding: 16,
    marginTop: 24,
    gap: 10,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  summaryLabel: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.onDark,
    opacity: 0.82,
  },
  summaryValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
  },
  summaryValueBig: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.onDark,
    letterSpacing: -0.4,
  },
  summaryDivider: {
    height: 1,
    backgroundColor: "rgba(245,240,255,0.28)",
  },
  continueButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 30,
  },
});
