import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { EmptyNote } from "@/components/EmptyState";
import { ScreenHeader } from "@/components/ScreenHeader";
import Pajaros from "@assets/ilus/pajaros.svg";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts, alpha } from "@/theme";
import type { GemOrder, GemPack } from "@/api/gemOrders";
import { shopApi } from "@/api/shop";
import { useGemPurchase } from "../useGemPurchase";
import { usePendingGemOrders } from "../usePendingGemOrders";
import { fmt, formatPrice, suggestedPack } from "../gemPacks";

type Props = NativeStackScreenProps<AppStackParamList, "GemShop">;

/** Product id of the pack highlighted as "Más elegido". */
const FEATURED_PRODUCT_ID = "gems_pack_850";

/** Extra gems per peso against the smallest pack, e.g. 14 for "+14%". 0 for the base pack. */
function bonusPercent(pack: GemPack, base: GemPack | undefined): number {
  if (!base || pack.id === base.id) return 0;
  return Math.round((pack.gems / pack.price / (base.gems / base.price) - 1) * 100);
}

/** More gems in the pack → more diamonds in the illustration (1 to 4). */
function DiamondCluster({ count, color, size = 1 }: { count: number; color: string; size?: number }) {
  const s = (n: number) => n * size;
  if (count <= 1) return <Ionicons name="diamond" size={s(34)} color={color} />;
  if (count === 2) {
    return (
      <View style={styles.clusterRow}>
        <Ionicons name="diamond" size={s(28)} color={color} style={{ marginTop: s(14) }} />
        <Ionicons name="diamond" size={s(36)} color={color} style={{ marginLeft: s(-8) }} />
      </View>
    );
  }
  if (count === 3) {
    return (
      <View style={styles.clusterRow}>
        <Ionicons name="diamond" size={s(26)} color={color} style={{ marginTop: s(18) }} />
        <Ionicons name="diamond" size={s(40)} color={color} style={{ marginHorizontal: s(-10) }} />
        <Ionicons name="diamond" size={s(26)} color={color} style={{ marginTop: s(18) }} />
      </View>
    );
  }
  return (
    <View style={[styles.clusterGrid, { width: s(64) }]}>
      <Ionicons name="diamond" size={s(26)} color={color} />
      <Ionicons name="diamond" size={s(30)} color={color} />
      <Ionicons name="diamond" size={s(30)} color={color} />
      <Ionicons name="diamond" size={s(26)} color={color} />
    </View>
  );
}

interface PackCardProps {
  pack: GemPack;
  /** Position in the sorted list: drives the illustration. */
  index: number;
  bonus: number;
  featured: boolean;
  bestPrice: boolean;
  /** Smallest pack that covers what the user was missing. */
  suggested: boolean;
  onPress: () => void;
}

function PackCard({ pack, index, bonus, featured, bestPrice, suggested, onPress }: PackCardProps) {
  const fg = featured ? colors.onColor : colors.text;
  return (
    <TouchableOpacity
      style={[styles.packCard, featured ? styles.packCardFeatured : styles.packCardPlain, suggested && styles.packCardSuggested]}
      onPress={onPress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`${fmt(pack.gems)} gemas, ${formatPrice(pack)}`}
    >
      {featured && (
        <View style={[styles.packBadge, { backgroundColor: colors.gemsHighlight }]}>
          <Text style={[styles.packBadgeText, { color: colors.text }]}>MÁS ELEGIDO</Text>
        </View>
      )}
      {bestPrice && !featured && (
        <View style={[styles.packBadge, { backgroundColor: colors.text }]}>
          <Text style={[styles.packBadgeText, { color: colors.onColor }]}>MEJOR PRECIO</Text>
        </View>
      )}
      {bonus > 0 && (
        <View style={styles.bonusBadge}>
          <Text style={styles.bonusText}>+{bonus}%</Text>
        </View>
      )}
      <View style={[styles.packArt, featured ? styles.packArtFeatured : styles.packArtPlain]}>
        <DiamondCluster count={index + 1} color={featured ? colors.onColor : colors.gemsBlue} />
      </View>
      <Text style={[styles.packGems, { color: fg }]}>{fmt(pack.gems)}</Text>
      <Text style={[styles.packUnit, { color: featured ? alpha(colors.onColor, 0.85) : colors.textMuted }]}>gemas</Text>
      <View style={[styles.priceButton, featured ? styles.priceButtonFeatured : styles.priceButtonPlain]}>
        <Text style={[styles.priceText, { color: featured ? colors.gemsBlueDark : colors.onDark }]}>
          {formatPrice(pack)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

const FLIGHT_DIAMONDS = 7;
const FLIGHT_MS = 900;

/**
 * Diamonds that fly from the credited art up to where the gems counter sits in the screens
 * underneath (a stat card of the header, below the status bar). `progress` goes 0 → 1.
 */
function DiamondFlight({ progress, targetY }: { progress: Animated.Value; targetY: number }) {
  const { width, height } = useWindowDimensions();
  const originY = height * 0.36;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: FLIGHT_DIAMONDS }, (_, i) => {
        const start = (i / FLIGHT_DIAMONDS) * 0.4;
        const range = [start, start + 0.6];
        const spread = (i - (FLIGHT_DIAMONDS - 1) / 2) * 22;
        return (
          <Animated.View
            key={i}
            style={{
              position: "absolute",
              left: width / 2 - 11,
              top: originY,
              opacity: progress.interpolate({
                inputRange: [start, start + 0.05, start + 0.5, start + 0.6],
                outputRange: [0, 1, 1, 0],
                extrapolate: "clamp",
              }),
              transform: [
                { translateX: progress.interpolate({ inputRange: range, outputRange: [spread, 0], extrapolate: "clamp" }) },
                { translateY: progress.interpolate({ inputRange: range, outputRange: [0, targetY - originY], extrapolate: "clamp" }) },
                { scale: progress.interpolate({ inputRange: range, outputRange: [1.2, 0.5], extrapolate: "clamp" }) },
              ],
            }}
          >
            <Ionicons name="diamond" size={22} color={i % 2 ? colors.gemsHighlight : colors.onColor} />
          </Animated.View>
        );
      })}
    </View>
  );
}

/** Number that counts from `from` to `to` (the credited-gems moment). */
function CountUp({ from, to, style }: { from: number; to: number; style: object }) {
  const [value, setValue] = useState(from);
  useEffect(() => {
    const progress = new Animated.Value(0);
    const id = progress.addListener(({ value: v }) => setValue(Math.round(from + (to - from) * v)));
    Animated.timing(progress, { toValue: 1, duration: 1200, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => progress.removeListener(id);
  }, [from, to]);
  return <Text style={style}>{fmt(value)}</Text>;
}

/**
 * Gem shop: its own full-screen modal (opened from the "+" of the gems counter or from a "te
 * faltan gemas" sheet), separate from the Store tab where gems are *spent*. Grid of packs →
 * confirm sheet → Mercado Pago (`useGemPurchase`) → confirming / credited / pending screens.
 */
export function GemShopScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const missing = route.params?.missingGems;
  const returnTo = route.params?.returnTo;
  const [gems, setGems] = useState<number | null>(null);
  const [selected, setSelected] = useState<GemPack | null>(null);
  const [credited, setCredited] = useState<GemOrder | null>(null);
  const [paidPack, setPaidPack] = useState<GemPack | null>(null);
  const onCredited = useCallback((order: GemOrder) => setCredited(order), []);
  const { status, error, packs, buy, reset } = useGemPurchase({ onCredited });
  const pendingOrders = usePendingGemOrders();

  useEffect(() => {
    let cancelled = false;
    shopApi
      .getMyInventory()
      .then((res) => !cancelled && setGems(res.data.gems))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const base = packs[0];
  const suggested = useMemo(() => suggestedPack(packs, missing), [packs, missing]);
  const busy = status === "buying";
  const close = () => navigation.goBack();
  const flight = useRef(new Animated.Value(0)).current;
  const [flying, setFlying] = useState(false);

  /** Diamonds fly up to the counter, then `then` runs (close or go to the Store). */
  function leaveWithFlight(then: () => void) {
    if (flying) return;
    setFlying(true);
    Animated.timing(flight, {
      toValue: 1,
      duration: FLIGHT_MS,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(then);
  }
  const sheetOpen = selected != null && (status === "idle" || status === "buying" || status === "error");

  function pay() {
    if (!selected) return;
    setPaidPack(selected);
    buy(selected);
  }

  // ── Credited ──
  if (credited) {
    const after = credited.inventory.gems;
    const before = Math.max(0, after - credited.gems);
    return (
      <View style={[styles.fullBlue, { paddingTop: insets.top + 24, paddingBottom: Math.max(insets.bottom, 28) }]}>
        <View style={styles.bubbleTop} />
        <View style={styles.bubbleBottom} />
        <View style={styles.fullCenter}>
          <View style={styles.successArt}>
            <View style={styles.successGlow} />
            <Ionicons name="diamond" size={42} color={colors.onColor} style={{ marginTop: 40, opacity: 0.9 }} />
            <Ionicons name="diamond" size={84} color={colors.onColor} style={{ marginHorizontal: -14 }} />
            <Ionicons name="diamond" size={42} color={colors.onColor} style={{ marginTop: 40, opacity: 0.9 }} />
            <Ionicons name="sparkles" size={24} color={colors.gemsHighlight} style={styles.sparkleA} />
            <Ionicons name="sparkles" size={18} color={colors.gemsHighlight} style={styles.sparkleB} />
          </View>
          <Text style={styles.successPlus}>+{fmt(credited.gems)}</Text>
          <Text style={styles.successTitle}>¡Gemas acreditadas!</Text>
          <View style={styles.balancePill}>
            <View style={styles.balanceItem}>
              <Ionicons name="diamond" size={14} color={alpha(colors.onColor, 0.8)} />
              <Text style={styles.balanceBefore}>{fmt(before)}</Text>
            </View>
            <Ionicons name="arrow-forward" size={15} color={colors.onColor} />
            <View style={styles.balanceItem}>
              <Ionicons name="diamond" size={15} color={colors.onColor} />
              <CountUp from={before} to={after} style={styles.balanceAfter} />
            </View>
          </View>
        </View>
        <View style={styles.bottomButtons}>
          <TouchableOpacity
            style={styles.lightButton}
            onPress={() => leaveWithFlight(() => (returnTo ? close() : navigation.replace("Tabs", { screen: "Store" })))}
            disabled={flying}
            activeOpacity={0.86}
          >
            <Ionicons name={returnTo ? "arrow-back" : "storefront"} size={18} color={colors.text} />
            <Text style={styles.lightButtonText}>{returnTo ? "Volver a " + returnTo : "Ir a gastarlas"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.ghostButton} onPress={() => leaveWithFlight(close)} disabled={flying} activeOpacity={0.86}>
            <Text style={styles.ghostButtonText}>Listo</Text>
          </TouchableOpacity>
        </View>
        {flying && <DiamondFlight progress={flight} targetY={insets.top + 150} />}
      </View>
    );
  }

  // ── Confirming / pending ──
  if (status === "checking" || status === "pending") {
    const pending = status === "pending";
    return (
      <View style={[styles.fullCream, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 28) }]}>
        {pending && (
          <TouchableOpacity style={styles.closeCorner} onPress={close} accessibilityLabel="Cerrar">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        )}
        <View style={styles.fullCenter}>
          {pending ? (
            <Pajaros width={190} height={170} />
          ) : (
            <ActivityIndicator size="large" color={colors.gemsBlueDark} />
          )}
          <Text style={[styles.stateTitle, !pending && { marginTop: 10 }]}>
            {pending ? "Tu pago está\nen camino" : "Confirmando\ntu pago"}
          </Text>
          <Text style={styles.stateText}>
            {pending
              ? "Si pagaste en efectivo, Mercado Pago puede tardar hasta 2 días hábiles. Las gemas se suman solas cuando se acredite."
              : "Mercado Pago puede tardar unos segundos. No hace falta que hagas nada."}
          </Text>
          {paidPack && (
            <View style={styles.orderCard}>
              <View style={styles.orderIcon}>
                <Ionicons name="diamond" size={21} color={colors.gemsBlueDark} />
              </View>
              <View style={styles.orderTexts}>
                <Text style={styles.orderTitle}>{fmt(paidPack.gems)} gemas</Text>
                <Text style={styles.orderSub}>
                  {formatPrice(paidPack)}
                  {pending ? "" : " · pago único"}
                </Text>
              </View>
              {pending && (
                <View style={styles.pendingChip}>
                  <Ionicons name="time" size={13} color={colors.shopAmberDark} />
                  <Text style={styles.pendingChipText}>Pendiente</Text>
                </View>
              )}
            </View>
          )}
        </View>
        {pending ? (
          <TouchableOpacity style={styles.darkButton} onPress={close} activeOpacity={0.86}>
            <Text style={styles.darkButtonText}>Entendido</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.footnote}>Si cerraste Mercado Pago sin pagar, no se cobró nada.</Text>
        )}
      </View>
    );
  }

  // ── Shop ──
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}>
        <ScreenHeader
          title="Conseguir gemas"
          description="Para vidas, escudos de racha y potenciadores. Cuanto más grande el pack, más gemas por peso."
          paddingTop={insets.top + 8}
          tone={colors.gemsBlueDark}
          top={
            <View style={styles.topRow}>
              <TouchableOpacity style={styles.closeButton} onPress={close} accessibilityLabel="Cerrar">
                <Ionicons name="close" size={24} color={colors.onColor} />
              </TouchableOpacity>
              {gems != null && (
                <View style={styles.gemPill}>
                  <Ionicons name="diamond" size={14} color={colors.onColor} />
                  <Text style={styles.gemPillText}>{fmt(gems)}</Text>
                </View>
              )}
            </View>
          }
        />

        <View style={styles.body}>
          {pendingOrders.map((order) => (
            <View key={order.id} style={styles.pendingRow}>
              <View style={styles.orderIcon}>
                <Ionicons name="diamond" size={21} color={colors.gemsBlueDark} />
              </View>
              <View style={styles.orderTexts}>
                <Text style={styles.orderTitle}>{fmt(order.gems)} gemas</Text>
                <Text style={styles.orderSub}>
                  {formatPrice({ price: order.amount, currency: order.currency })} · se suman solas cuando se acredite
                </Text>
              </View>
              <View style={styles.pendingChip}>
                <Ionicons name="time" size={13} color={colors.shopAmberDark} />
                <Text style={styles.pendingChipText}>Pendiente</Text>
              </View>
            </View>
          ))}

          {status === "loading" ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.gemsBlueDark} />
            </View>
          ) : packs.length === 0 ? (
            <EmptyNote>
              {error ?? "Los packs de gemas no están disponibles en este momento. Probá de nuevo más tarde."}
            </EmptyNote>
          ) : (
            <View style={styles.grid}>
              {packs.map((pack, index) => (
                <PackCard
                  key={pack.id}
                  pack={pack}
                  index={index}
                  bonus={bonusPercent(pack, base)}
                  featured={pack.productId === FEATURED_PRODUCT_ID}
                  bestPrice={index === packs.length - 1}
                  suggested={suggested?.id === pack.id}
                  onPress={() => {
                    reset();
                    setSelected(pack);
                  }}
                />
              ))}
            </View>
          )}

          <View style={styles.freeBlock}>
            <Text style={styles.sectionLabel}>GEMAS GRATIS</Text>
            <TouchableOpacity
              style={styles.freeRow}
              activeOpacity={0.85}
              onPress={() => navigation.replace("Tabs", { screen: "Home" })}
            >
              <View style={styles.freeIcon}>
                <Ionicons name="trophy" size={20} color={colors.shopAmberDark} />
              </View>
              <View style={styles.orderTexts}>
                <Text style={styles.freeTitle}>Desafíos diarios</Text>
                <Text style={styles.freeSub}>Ganá gemas completando los desafíos de Inicio</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <View style={styles.notes}>
            <View style={styles.noteRow}>
              <Ionicons name="card" size={15} color={colors.textSecondary} />
              <Text style={styles.noteText}>Pago único con Mercado Pago. Sin suscripción.</Text>
            </View>
            <View style={styles.noteRow}>
              <Ionicons name="shield-checkmark" size={15} color={colors.textSecondary} />
              <Text style={styles.noteText}>Las gemas se acreditan apenas se aprueba el pago.</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Confirm sheet */}
      <Modal visible={sheetOpen} transparent animationType="slide" onRequestClose={() => !busy && setSelected(null)} statusBarTranslucent>
        <Pressable style={styles.backdrop} onPress={() => !busy && setSelected(null)}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 34) }]} onPress={() => {}}>
            {selected && (
              <>
                <View style={styles.grabber} />
                <View style={styles.sheetArt}>
                  <DiamondCluster count={Math.max(1, packs.findIndex((p) => p.id === selected.id) + 1)} color={colors.gemsBlue} size={1.1} />
                </View>
                <View style={styles.sheetHead}>
                  <Text style={styles.sheetTitle}>{fmt(selected.gems)} gemas</Text>
                  {selected.productId === FEATURED_PRODUCT_ID && <Text style={styles.sheetSub}>Pack más elegido</Text>}
                </View>
                <View style={styles.summary}>
                  {gems != null && (
                    <>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Tenés ahora</Text>
                        <View style={styles.summaryValue}>
                          <Ionicons name="diamond" size={13} color={colors.gemsBlueDark} />
                          <Text style={styles.summaryNumber}>{fmt(gems)}</Text>
                        </View>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Después del pago</Text>
                        <View style={styles.summaryValue}>
                          <Ionicons name="diamond" size={13} color={colors.gemsBlueDark} />
                          <Text style={[styles.summaryNumber, styles.summaryAfter]}>{fmt(gems + selected.gems)}</Text>
                        </View>
                      </View>
                      <View style={styles.dashed} />
                    </>
                  )}
                  <View style={styles.summaryRow}>
                    <Text style={styles.totalLabel}>Total</Text>
                    <Text style={styles.totalValue}>
                      {formatPrice(selected)} <Text style={styles.totalCurrency}>{selected.currency}</Text>
                    </Text>
                  </View>
                </View>
                <View style={styles.safeNote}>
                  <Ionicons name="lock-closed" size={14} color={colors.successDark} />
                  <Text style={styles.safeNoteText}>No se cobra nada hasta que confirmes en Mercado Pago.</Text>
                </View>
                {status === "error" && error != null && (
                  <View style={styles.errorNote}>
                    <Text style={styles.errorText}>{error}</Text>
                  </View>
                )}
                <TouchableOpacity style={[styles.payButton, busy && { opacity: 0.7 }]} onPress={pay} disabled={busy} activeOpacity={0.86}>
                  {busy ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <>
                      <Text style={styles.payButtonText}>Pagar con Mercado Pago</Text>
                      <Ionicons name="open-outline" size={18} color={colors.onDark} />
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.otherButton} onPress={() => setSelected(null)} disabled={busy} activeOpacity={0.86}>
                  <Text style={styles.otherButtonText}>Elegir otro pack</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: -10,
    marginBottom: 10,
  },
  closeButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  gemPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: alpha(colors.onColor, 0.18),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 10,
  },
  gemPillText: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.onColor },
  body: { paddingHorizontal: 16, paddingTop: 22, gap: 22 },
  center: { paddingVertical: 32, alignItems: "center" },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, paddingTop: 10 },
  packCard: {
    width: "48.5%",
    flexGrow: 1,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 12,
    alignItems: "center",
    gap: 6,
  },
  packCardPlain: {
    backgroundColor: colors.surface,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  packCardFeatured: {
    backgroundColor: colors.gemsBlueDark,
    shadowColor: colors.gemsBlueDark,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  packCardSuggested: { borderWidth: 2, borderColor: colors.gemsBlue },
  packBadge: {
    position: "absolute",
    top: -10,
    alignSelf: "center",
    zIndex: 1,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  packBadgeText: { fontFamily: fonts.bodyBold, fontSize: 10, letterSpacing: 1 },
  bonusBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    zIndex: 1,
    backgroundColor: colors.successLight,
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 7,
  },
  bonusText: { fontFamily: fonts.displayExtraBold, fontSize: 11, color: colors.successDark },
  packArt: { width: "100%", height: 82, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  packArtPlain: { backgroundColor: colors.avatarBlueLight },
  packArtFeatured: { backgroundColor: alpha(colors.onColor, 0.16) },
  packGems: { fontFamily: fonts.displayExtraBold, fontSize: 22, lineHeight: 26, marginTop: 2 },
  packUnit: { fontFamily: fonts.bodyRegular, fontSize: 11.5, marginTop: -6 },
  priceButton: { width: "100%", minHeight: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  priceButtonPlain: { backgroundColor: colors.text },
  priceButtonFeatured: { backgroundColor: colors.surface },
  priceText: { fontFamily: fonts.bodyBold, fontSize: 15 },
  clusterRow: { flexDirection: "row", alignItems: "center", justifyContent: "center" },
  clusterGrid: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 2 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.warningLight,
    borderRadius: 18,
    padding: 12,
    marginBottom: -8,
  },
  freeBlock: { gap: 10 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.textMuted,
    paddingHorizontal: 4,
  },
  freeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
  },
  freeIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: colors.warningLight,
    alignItems: "center",
    justifyContent: "center",
  },
  freeTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  freeSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  notes: { gap: 8, paddingHorizontal: 4 },
  noteRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  noteText: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textSecondary },

  // Confirm sheet
  backdrop: { flex: 1, backgroundColor: alpha(colors.text, 0.45), justifyContent: "flex-end" },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    gap: 12,
  },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.roadmapLockedBorder, marginBottom: 6 },
  sheetArt: {
    alignSelf: "center",
    width: 120,
    height: 96,
    borderRadius: 24,
    backgroundColor: colors.avatarBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetHead: { alignItems: "center" },
  sheetTitle: { fontFamily: fonts.displayExtraBold, fontSize: 26, letterSpacing: -0.6, color: colors.text },
  sheetSub: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted, marginTop: 2 },
  summary: { backgroundColor: colors.fill, borderRadius: 18, padding: 14, gap: 10 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  summaryLabel: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textSecondary },
  summaryValue: { flexDirection: "row", alignItems: "center", gap: 4 },
  summaryNumber: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  summaryAfter: { fontFamily: fonts.bodyBold, color: colors.gemsBlueDark },
  dashed: { borderTopWidth: 1.5, borderStyle: "dashed", borderColor: colors.roadmapLockedBorder },
  totalLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  totalValue: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.text },
  totalCurrency: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
  safeNote: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  safeNoteText: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: colors.successDark },
  errorNote: { backgroundColor: colors.dangerLight, borderRadius: 12, padding: 12 },
  errorText: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.text },
  payButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 4,
  },
  payButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  otherButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  otherButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.neutral900 },

  // Full-screen states
  fullCream: { flex: 1, backgroundColor: colors.background, paddingHorizontal: 20 },
  fullBlue: { flex: 1, backgroundColor: colors.gemsBlueDark, paddingHorizontal: 20, overflow: "hidden" },
  fullCenter: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 8 },
  closeCorner: { alignSelf: "flex-end", width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  stateTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.9,
    color: colors.text,
    textAlign: "center",
  },
  stateText: { fontFamily: fonts.bodyRegular, fontSize: 15, lineHeight: 22, color: colors.textMuted, textAlign: "center" },
  footnote: { fontFamily: fonts.bodyRegular, fontSize: 12.5, lineHeight: 18, color: colors.textMuted, textAlign: "center" },
  orderCard: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    marginTop: 8,
  },
  orderIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.avatarBlueLight,
    alignItems: "center",
    justifyContent: "center",
  },
  orderTexts: { flex: 1, minWidth: 0 },
  orderTitle: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.text },
  orderSub: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pendingChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.shopAmberLight,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pendingChipText: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.shopAmberDark },
  darkButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  darkButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },

  // Credited
  bubbleTop: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: alpha(colors.onColor, 0.09),
  },
  bubbleBottom: {
    position: "absolute",
    bottom: 150,
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: alpha(colors.onColor, 0.07),
  },
  successArt: { width: 200, height: 170, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  successGlow: {
    position: "absolute",
    top: 10,
    left: 10,
    right: 10,
    bottom: 10,
    borderRadius: 999,
    backgroundColor: alpha(colors.onColor, 0.12),
  },
  sparkleA: { position: "absolute", top: 8, right: 22 },
  sparkleB: { position: "absolute", bottom: 20, left: 18 },
  successPlus: { fontFamily: fonts.displayExtraBold, fontSize: 56, lineHeight: 60, letterSpacing: -2, color: colors.onColor },
  successTitle: { fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: -0.6, color: colors.onColor },
  balancePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: alpha(colors.onColor, 0.16),
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 4,
  },
  balanceItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  balanceBefore: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: alpha(colors.onColor, 0.8) },
  balanceAfter: { fontFamily: fonts.displayExtraBold, fontSize: 18, color: colors.onColor },
  bottomButtons: { gap: 10 },
  lightButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.onDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lightButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.text },
  ghostButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: alpha(colors.onColor, 0.16),
    alignItems: "center",
    justifyContent: "center",
  },
  ghostButtonText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onColor },
});
