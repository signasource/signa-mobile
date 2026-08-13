import React, { useEffect, useRef } from "react";
import { Animated, Easing, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { AppliedEffectResponse, ShopItemResponse, StubFriend } from "../types";
import { metaFor, rewardMeta, TONE_COLOR, TONE_TINT } from "../catalogMeta";

export type FlowStep = "confirm" | "friend" | "insufficient" | "chest" | "success";

export interface FlowState {
  step: FlowStep;
  item: ShopItemResponse;
  friend?: StubFriend;
  effect?: AppliedEffectResponse;
  gemsAfter?: number;
}

interface PurchaseFlowModalProps {
  flow: FlowState | null;
  gems: number;
  friends: StubFriend[];
  busy: boolean;
  onClose: () => void;
  onBuyForSelf: (item: ShopItemResponse) => void;
  onOpenGiftPicker: (item: ShopItemResponse) => void;
  onGiftTo: (item: ShopItemResponse, friend: StubFriend) => void;
  onBackToConfirm: (item: ShopItemResponse) => void;
}

export function PurchaseFlowModal({
  flow,
  gems,
  friends,
  busy,
  onClose,
  onBuyForSelf,
  onOpenGiftPicker,
  onGiftTo,
  onBackToConfirm,
}: PurchaseFlowModalProps) {
  return (
    <Modal visible={!!flow} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {flow?.step === "confirm" && (
        <Sheet onClose={onClose}>
          <ConfirmContent item={flow.item} gems={gems} busy={busy} onBuyForSelf={onBuyForSelf} onOpenGiftPicker={onOpenGiftPicker} onClose={onClose} />
        </Sheet>
      )}
      {flow?.step === "friend" && (
        <Sheet onClose={onClose}>
          <FriendContent item={flow.item} friends={friends} onGiftTo={onGiftTo} onBack={onBackToConfirm} />
        </Sheet>
      )}
      {flow?.step === "insufficient" && (
        <Sheet onClose={onClose} shake>
          <InsufficientContent item={flow.item} gems={gems} onClose={onClose} />
        </Sheet>
      )}
      {flow?.step === "chest" && <ChestOverlay />}
      {flow?.step === "success" && flow.effect !== undefined && (
        <SuccessOverlay item={flow.item} friend={flow.friend} effect={flow.effect} gemsAfter={flow.gemsAfter ?? gems} onClose={onClose} />
      )}
    </Modal>
  );
}

// ---------- bottom sheet shell ----------

function Sheet({ children, onClose, shake }: { children: React.ReactNode; onClose: () => void; shake?: boolean }) {
  const translateY = useRef(new Animated.Value(80)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const shakeX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }),
    ]).start(() => {
      if (shake) {
        Animated.sequence([
          Animated.timing(shakeX, { toValue: -6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 6, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: -4, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 4, duration: 55, useNativeDriver: true }),
          Animated.timing(shakeX, { toValue: 0, duration: 55, useNativeDriver: true }),
        ]).start();
      }
    });
  }, []);

  return (
    <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <Animated.View style={[styles.sheet, { transform: [{ translateY }, { translateX: shakeX }] }]}>
        <View style={styles.grabber} />
        {children}
      </Animated.View>
    </Animated.View>
  );
}

// ---------- confirm ----------

function ItemRow({ item }: { item: ShopItemResponse }) {
  const meta = metaFor(item.itemType);
  return (
    <View style={styles.itemRow}>
      <View style={[styles.itemRowMedallion, { backgroundColor: TONE_TINT[meta.tone] }]}>
        <Ionicons name={meta.icon as keyof typeof Ionicons.glyphMap} size={24} color={TONE_COLOR[meta.tone]} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.itemRowTitle}>{item.title}</Text>
      </View>
      <View style={styles.itemRowPrice}>
        <Ionicons name="diamond" size={16} color={colors.amber} />
        <Text style={styles.itemRowPriceText}>{item.priceGems}</Text>
      </View>
    </View>
  );
}

function ConfirmContent({
  item,
  gems,
  busy,
  onBuyForSelf,
  onOpenGiftPicker,
  onClose,
}: {
  item: ShopItemResponse;
  gems: number;
  busy: boolean;
  onBuyForSelf: (item: ShopItemResponse) => void;
  onOpenGiftPicker: (item: ShopItemResponse) => void;
  onClose: () => void;
}) {
  return (
    <>
      <Text style={styles.sheetTitle}>Confirmar compra</Text>
      <ItemRow item={item} />
      <View style={styles.mathRow}>
        <View>
          <Text style={styles.label}>Tenés</Text>
          <Text style={styles.mathValue}>{gems} gemas</Text>
        </View>
        <Ionicons name="arrow-forward" size={18} color={colors.textMuted} />
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.label}>Te quedan</Text>
          <Text style={[styles.mathValue, { color: colors.amber }]}>{gems - item.priceGems} gemas</Text>
        </View>
      </View>
      <View style={styles.btnCol}>
        <Pressable disabled={busy} onPress={() => onBuyForSelf(item)} style={({ pressed }) => [styles.darkBtn, pressed && styles.pressed]}>
          <Text style={styles.darkBtnLabel}>Comprar para mí</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={() => onOpenGiftPicker(item)} style={({ pressed }) => [styles.softBtn, pressed && styles.pressed]}>
          <Text style={styles.softBtnLabel}>Regalar a un amigo</Text>
        </Pressable>
        <Pressable disabled={busy} onPress={onClose} style={styles.ghostBtn}>
          <Text style={styles.ghostBtnLabel}>Cancelar</Text>
        </Pressable>
      </View>
    </>
  );
}

// ---------- friend picker ----------

function FriendContent({
  item,
  friends,
  onGiftTo,
  onBack,
}: {
  item: ShopItemResponse;
  friends: StubFriend[];
  onGiftTo: (item: ShopItemResponse, friend: StubFriend) => void;
  onBack: (item: ShopItemResponse) => void;
}) {
  return (
    <>
      <Text style={styles.sheetTitle}>¿A quién se lo regalás?</Text>
      <Text style={styles.sheetSubtitle}>
        {item.title} · {item.priceGems} gemas de tu saldo
      </Text>
      <View style={{ marginTop: 16 }}>
        {friends.map((f, i) => (
          <Pressable
            key={f.userId}
            onPress={() => onGiftTo(item, f)}
            style={({ pressed }) => [styles.friendRow, i > 0 && styles.friendRowBorder, pressed && styles.pressed]}
          >
            <View style={styles.friendAvatar}>
              <Text style={styles.friendAvatarText}>{f.name.charAt(0)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.friendName}>{f.name}</Text>
              <Text style={styles.friendUsername}>@{f.username}</Text>
            </View>
            <Ionicons name="paper-plane" size={18} color={colors.amber} />
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => onBack(item)} style={styles.ghostBtn}>
        <Text style={styles.ghostBtnLabel}>Volver</Text>
      </Pressable>
    </>
  );
}

// ---------- insufficient gems ----------

function InsufficientContent({ item, gems, onClose }: { item: ShopItemResponse; gems: number; onClose: () => void }) {
  const falta = item.priceGems - gems;
  return (
    <>
      <View style={styles.insufficientIcon}>
        <Ionicons name="diamond" size={34} color={colors.danger} />
      </View>
      <Text style={styles.sheetTitle}>Te faltan {falta} gemas</Text>
      <Text style={styles.sheetSubtitle}>Completá lecciones, mantené tu racha y superá desafíos para conseguir más gemas.</Text>
      <View style={styles.mathRow}>
        <View>
          <Text style={styles.label}>Tu saldo</Text>
          <Text style={styles.mathValue}>{gems} gemas</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={styles.label}>{item.title}</Text>
          <Text style={[styles.mathValue, { color: colors.danger }]}>{item.priceGems} gemas</Text>
        </View>
      </View>
      <Pressable onPress={onClose} style={[styles.darkBtn, { marginTop: 20 }]}>
        <Text style={styles.darkBtnLabel}>Entendido</Text>
      </Pressable>
    </>
  );
}

// ---------- chest opening ----------

function ChestOverlay() {
  const spin = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0.6)).current;
  const ring = useRef(new Animated.Value(0.7)).current;
  const ringOpacity = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(spin, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(spin, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 12 }).start();
    Animated.loop(
      Animated.parallel([
        Animated.timing(ring, { toValue: 1.7, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
        Animated.timing(ringOpacity, { toValue: 0, duration: 1600, easing: Easing.out(Easing.ease), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["-8deg", "8deg"] });

  return (
    <View style={styles.fullOverlay}>
      <Animated.View style={[styles.chestRing, { transform: [{ scale: ring }], opacity: ringOpacity }]} />
      <Animated.View style={{ transform: [{ scale: pop }, { rotate }] }}>
        <Ionicons name="gift" size={96} color={colors.onDark} />
      </Animated.View>
      <Text style={styles.fullTitle}>Abriendo el cofre…</Text>
      <Text style={styles.fullSubtitle}>Veamos qué te tocó</Text>
    </View>
  );
}

// ---------- success ----------

function SuccessOverlay({
  item,
  friend,
  effect,
  gemsAfter,
  onClose,
}: {
  item: ShopItemResponse;
  friend?: StubFriend;
  effect: AppliedEffectResponse;
  gemsAfter: number;
  onClose: () => void;
}) {
  const pop = useRef(new Animated.Value(0.2)).current;
  const rise = useRef(new Animated.Value(12)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: true, bounciness: 14 }),
      Animated.timing(fade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(rise, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const isGift = !!friend;
  const reward = rewardMeta(effect);
  const title = isGift ? "¡Regalo enviado!" : item.itemType === "MYSTERY_CHEST" ? `¡Te tocó ${reward.label}!` : "¡Compra exitosa!";
  const subtitle = isGift
    ? `${friend!.name} ya puede reclamar tu ${item.title.toLowerCase()}.`
    : item.itemType === "MYSTERY_CHEST"
      ? reward.note
      : `${item.title} está listo para usar.`;
  const rewardGems = item.itemType === "MYSTERY_CHEST" && effect.type === "GEMS" ? effect.gemsGranted ?? 0 : 0;

  return (
    <View style={styles.fullOverlay}>
      <Animated.View style={[styles.successMedallion, { transform: [{ scale: pop }] }]}>
        <Ionicons name={isGift ? "paper-plane" : (reward.icon as keyof typeof Ionicons.glyphMap)} size={72} color={colors.onDark} />
      </Animated.View>
      <Animated.Text style={[styles.fullTitle, { opacity: fade, transform: [{ translateY: rise }] }]}>{title}</Animated.Text>
      <Animated.Text style={[styles.fullSubtitle, { opacity: fade, transform: [{ translateY: rise }] }]}>{subtitle}</Animated.Text>
      <Animated.View style={[styles.statCard, { opacity: fade, transform: [{ translateY: rise }] }]}>
        <StatRow label="Gastaste" value={`−${item.priceGems}`} />
        {rewardGems > 0 && <StatRow label="Ganaste" value={`+${rewardGems}`} />}
        <View style={styles.statDivider} />
        <StatRow label="Saldo restante" value={String(gemsAfter)} big />
      </Animated.View>
      <Pressable onPress={onClose} style={styles.continueBtn} accessibilityLabel="Continuar">
        <Ionicons name="arrow-forward" size={27} color={colors.onDark} />
      </Pressable>
    </View>
  );
}

function StatRow({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Ionicons name="diamond" size={big ? 18 : 15} color={colors.onDark} style={{ opacity: big ? 1 : 0.85 }} />
        <Text style={[styles.statValue, big && styles.statValueBig]}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(36,26,22,.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34 },
  grabber: { width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 24, letterSpacing: -0.7, color: colors.text },
  sheetSubtitle: { fontFamily: fonts.bodyMedium, fontSize: 13.5, lineHeight: 20, color: colors.textMuted, marginTop: 6 },
  label: { fontFamily: fonts.bodySemiBold, fontSize: 10.5, letterSpacing: 1, textTransform: "uppercase", color: colors.textMuted },
  mathRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 14, paddingHorizontal: 4 },
  mathValue: { fontFamily: fonts.bodyBold, fontSize: 17, color: colors.text, marginTop: 3 },
  itemRow: { flexDirection: "row", gap: 13, alignItems: "center", marginTop: 14, padding: 14, borderRadius: 18, backgroundColor: colors.fill },
  itemRowMedallion: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  itemRowTitle: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, color: colors.text },
  itemRowPrice: { flexDirection: "row", alignItems: "center", gap: 5 },
  itemRowPriceText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  btnCol: { gap: 6, marginTop: 22 },
  darkBtn: { minHeight: 58, borderRadius: 18, backgroundColor: colors.text, alignItems: "center", justifyContent: "center" },
  darkBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  softBtn: { minHeight: 46, borderRadius: 18, backgroundColor: colors.fill, alignItems: "center", justifyContent: "center" },
  softBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, color: colors.text },
  ghostBtn: { paddingTop: 10, alignItems: "center", justifyContent: "center" },
  ghostBtnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.textMuted },
  pressed: { opacity: 0.86 },
  friendRow: { flexDirection: "row", alignItems: "center", gap: 13, paddingVertical: 13 },
  friendRowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  friendAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  friendAvatarText: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.primaryDark },
  friendName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  friendUsername: { fontFamily: fonts.bodyMedium, fontSize: 12.5, color: colors.textMuted, marginTop: 1 },
  insufficientIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: TONE_TINT.danger,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.amberDark,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  chestRing: { position: "absolute", width: 220, height: 220, borderRadius: 110, borderWidth: 2, borderColor: "rgba(255,255,255,.35)" },
  fullTitle: {
    marginTop: 30,
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    color: colors.onDark,
    letterSpacing: -1,
    textAlign: "center",
  },
  fullSubtitle: { marginTop: 10, fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.onPrimary, opacity: 0.9, textAlign: "center", maxWidth: 280 },
  successMedallion: {
    width: 156,
    height: 156,
    borderRadius: 78,
    backgroundColor: "rgba(255,255,255,.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  statCard: {
    marginTop: 24,
    width: "100%",
    maxWidth: 300,
    backgroundColor: "rgba(255,255,255,.16)",
    borderRadius: 20,
    padding: 16,
    gap: 9,
  },
  statRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  statLabel: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.onPrimary, opacity: 0.82 },
  statValueRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  statValue: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, color: colors.onDark },
  statValueBig: { fontFamily: fonts.displayBold, fontSize: 22, letterSpacing: -0.4 },
  statDivider: { height: 1, backgroundColor: "rgba(245,240,255,.28)" },
  continueBtn: {
    marginTop: 30,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
});
