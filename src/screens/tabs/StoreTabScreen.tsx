import React, { useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { TabParamList } from "@/navigation/TabNavigator";
import { colors, fonts } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, Segment } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { shopApi, ShopItem, ShopItemType, ShopInventory, AppliedEffect } from "@/api/shop";
import ManoVacia from "@assets/ilus/mano-vacia.svg";
import HeartConFondo from "@assets/ilus/heart-con-fondo.svg";
import ManoConCaja from "@assets/ilus/mano-con-caja.svg";

type TabKey = "vidas" | "potenciadores" | "especiales";
type FlowStep = "confirm" | "insufficient" | "opening" | "success";

interface Flow {
  step: FlowStep;
  item: ShopItem;
  effect?: AppliedEffect;
}

const TABS: ReadonlyArray<Segment<TabKey>> = [
  { key: "vidas", label: "Vidas" },
  { key: "potenciadores", label: "Potenciadores" },
  { key: "especiales", label: "Especiales" },
];

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

const LIVES_TYPES: ShopItemType[] = ["LIFE", "UNLIMITED_LIVES"];
const BOOSTER_TYPES: ShopItemType[] = ["XP_MULTIPLIER", "STREAK_SHIELD"];

interface SuccessOverlayProps {
  flow: Flow;
  gems: number;
  inventory: ShopInventory | null;
  fromLesson: boolean;
  insets: { top: number; bottom: number };
  onClose: () => void;
}

function SuccessOverlay({ flow, gems, inventory, fromLesson, insets, onClose }: SuccessOverlayProps) {
  const isLives = LIVES_TYPES.includes(flow.item.itemType);
  const isMysteryChest = flow.item.itemType === "MYSTERY_CHEST";
  const isGenericItem = !isLives && !isMysteryChest;

  const effectType = flow.effect?.type ?? flow.item.itemType;
  const isUnlimited = effectType === "UNLIMITED_LIVES";
  const livesGranted = flow.effect?.livesGranted ?? flow.item.quantity;

  const cardIcon: keyof typeof Ionicons.glyphMap =
    flow.effect ? ICON[flow.effect.type] : ICON[flow.item.itemType];

  const cardTitle = isLives
    ? isUnlimited
      ? "Vidas infinitas"
      : `Recarga de ${livesGranted} ${livesGranted === 1 ? "vida" : "vidas"}`
    : isMysteryChest && flow.effect
    ? effectLabel(flow.effect)
    : flow.item.title;

  const screenTitle = isLives
    ? isUnlimited
      ? "¡Vidas infinitas activadas!"
      : `Sumaste ${livesGranted} ${livesGranted === 1 ? "vida" : "vidas"}`
    : "¡Ya es tuyo!";

  const screenSub = isGenericItem
    ? "Lo guardamos en tu inventario y se activa cuando lo uses."
    : isMysteryChest
    ? "Ya está sumado a tu inventario."
    : undefined;

  return (
    <SafeAreaView style={styles.fullOverlay}>
      <View style={[styles.successBadgeRow, { paddingTop: insets.top + 16 }]}>
        <View style={styles.successBadge}>
          <Text style={styles.successBadgeText}>COMPRA LISTA</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.successScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.successIllustration}>
          {isLives ? (
            <HeartConFondo width={260} height={252} />
          ) : (
            <ManoConCaja width={260} height={260} />
          )}
        </View>

        <Text style={styles.fullTitle}>{screenTitle}</Text>
        {screenSub != null && <Text style={styles.fullSub}>{screenSub}</Text>}

        <View style={styles.purchaseCard}>
          <View style={styles.purchaseCardLeft}>
            <View style={styles.purchaseCardIconWrap}>
              <Ionicons name={cardIcon} size={21} color={colors.onDark} />
            </View>
            <View style={styles.purchaseCardTexts}>
              <Text style={styles.purchaseCardTitle}>{cardTitle}</Text>
              <Text style={styles.purchaseCardSub}>Te quedan {gems} gemas</Text>
            </View>
          </View>
          <View style={styles.purchaseCardGems}>
            <Ionicons name="diamond" size={14} color={colors.onDark} />
            <Text style={styles.purchaseCardGemCount}>{flow.item.priceGems}</Text>
          </View>
        </View>

      </ScrollView>

      <View style={[styles.successButtonRow, { paddingBottom: Math.max(insets.bottom, 28) }]}>
        <TouchableOpacity style={styles.successCloseButton} onPress={onClose} activeOpacity={0.86}>
          <Text style={styles.darkButtonText}>
            {fromLesson ? "Volver a la lección" : "Volver a la tienda"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

export function StoreTabScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<TabParamList, "Store">>();
  const fromLesson = route.params?.fromLesson ?? false;
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
    navigation.setParams({ fromLesson: undefined } as any);
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
      <ScreenHeader
        title="Tienda"
        description="Gastá tus gemas en vidas y potenciadores para seguir aprendiendo."
        paddingTop={insets.top + 14}
        tone={colors.shopAmber}
        stats={[
          { key: "gems", label: "Gemas", value: String(gems), icon: "diamond" },
          { key: "lives", label: "Vidas", value: livesLabel, icon: "heart" },
          { key: "shields", label: "Escudos", value: String(shields), icon: "shield-half" },
        ]}
      />

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      {loading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator color={colors.shopAmber} size="large" />
        </View>
      ) : error && items.length === 0 ? (
        <View style={styles.centerFill}>
          <EmptyState icon="cloud-offline-outline" title="No pudimos cargar la tienda" description={error} />
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
            <EmptyState
              icon="pricetags-outline"
              title="Sin ítems por ahora"
              description="No hay ítems disponibles en esta categoría."
            />
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
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 34) }]} onPress={() => {}}>
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
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={closeFlow}
                disabled={purchasing}
                activeOpacity={0.86}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        )}

        {flow?.step === "insufficient" && (
          <Pressable style={styles.backdrop} onPress={closeFlow}>
            <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 34) }]} onPress={() => {}}>
              <TouchableOpacity style={styles.insufficientClose} onPress={closeFlow} activeOpacity={0.7}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
              <View style={styles.insufficientContent}>
                <ManoVacia width={180} height={182} />
                <Text style={styles.insufficientTitle}>
                  Te faltan {flow.item.priceGems - gems} gemas
                </Text>
                <Text style={styles.insufficientSub}>
                  Este ítem cuesta {flow.item.priceGems} y tenés {gems}.
                </Text>
              </View>
              <View style={styles.insufficientActions}>
                <TouchableOpacity style={styles.darkButton} onPress={closeFlow} activeOpacity={0.86}>
                  <Text style={styles.darkButtonText}>Conseguir gemas</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryButton} onPress={closeFlow} activeOpacity={0.86}>
                  <Text style={styles.secondaryButtonText}>Volver a la tienda</Text>
                </TouchableOpacity>
              </View>
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
          <SuccessOverlay
            flow={flow}
            gems={gems}
            inventory={inventory}
            fromLesson={fromLesson}
            insets={insets}
            onClose={closeFlow}
          />
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
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 20,
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
    textAlign: "justify",
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
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
  buyButtonFeatured: {
    backgroundColor: colors.onDark,
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
    borderRadius: 14,
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
  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
  insufficientClose: {
    alignSelf: "flex-end",
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  insufficientContent: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  insufficientTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
  },
  insufficientSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
  insufficientActions: {
    gap: 10,
    marginTop: 10,
  },
  fullOverlay: {
    flex: 1,
    backgroundColor: colors.shopAmber,
  },
  successScroll: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 26,
    paddingTop: 0,
  },
  successBadgeRow: {
    alignItems: "center",
    paddingBottom: 4,
  },
  successBadge: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.onDark,
  },
  successBadgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 1.2,
    color: colors.shopAmberDark,
  },
  successIllustration: {
    marginBottom: 10,
  },
  fullTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 34,
    color: colors.onDark,
    letterSpacing: -1,
    textAlign: "center",
    marginTop: 8,
  },
  fullSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onDark,
    opacity: 0.9,
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },
  purchaseCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.22)",
    borderRadius: 18,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 22,
    marginBottom: 20,
    gap: 12,
  },
  purchaseCardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minWidth: 0,
  },
  purchaseCardIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  purchaseCardTexts: {
    flex: 1,
    minWidth: 0,
  },
  purchaseCardTitle: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
    letterSpacing: -0.2,
  },
  purchaseCardSub: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.onDark,
    opacity: 0.75,
    marginTop: 2,
  },
  purchaseCardGems: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  purchaseCardGemCount: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.onDark,
    letterSpacing: -0.5,
  },
  successButtonRow: {
    paddingHorizontal: 26,
    paddingTop: 12,
  },
  successCloseButton: {
    width: "100%",
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
});
