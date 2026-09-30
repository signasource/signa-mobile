import React, { useEffect, useRef } from "react";
import {
  Animated,
  Image,
  Modal,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";
import { useTour } from "../TourContext";

// ── Constants ────────────────────────────────────────────────────────────────

const OVERLAY = "rgba(24,16,32,0.74)";
const WELCOME_OVERLAY = "rgba(24,16,32,0.6)";
const TAB_BAR_H = 76;
const TOTAL_COACH_STEPS = 6;

// ── Spotlight helpers ─────────────────────────────────────────────────────────

interface Spot {
  x: number;
  y: number;
  width: number;
  height: number;
  circular: boolean;
}

function tabSpot(tabIndex: number, screenW: number, screenH: number, bottomInset: number): Spot {
  const tabW = screenW / 5;
  const cx = (tabIndex + 0.5) * tabW;
  const tabBarTop = screenH - TAB_BAR_H - bottomInset;
  const cy = tabBarTop + 25;
  const r = 31;
  return { x: cx - r, y: cy - r, width: 62, height: 62, circular: true };
}

// ── Per-step data ─────────────────────────────────────────────────────────────

interface StepData {
  title: string;
  description: string;
  infoBox?: string;
  accentColor: string;
  lisaBody?: "waving" | "arms";
  lisaSize?: number;       // override container size (default 190)
  lisaBottomExtra?: number; // bottom offset above tab bar (default 220)
  bubbleAbove: boolean;
  getSpot: (w: number, h: number, topInset: number, bottomInset: number) => Spot;
}

const STEP_DATA: Record<number, StepData> = {
  1: {
    title: "Tus tres números",
    description:
      "La racha son tus días seguidos. Las gemas se usan en la Tienda. El XP sube con cada lección.",
    infoBox:
      "Cada sección tiene su propia barra de números arriba. Siempre son los que importan en esa pantalla.",
    accentColor: colors.primary,
    bubbleAbove: false,
    getSpot: (w, _h, topInset) => ({
      x: 14,
      y: topInset + 112,
      width: w - 28,
      height: 64,
      circular: false,
    }),
  },
  2: {
    title: "Tu próxima lección, siempre acá",
    description:
      "El recorrido va de abajo hacia arriba. Tocá Empezar en la lección que te toca. La ⓘ te dice qué señas vas a ver.",
    accentColor: colors.primary,
    bubbleAbove: false,
    getSpot: (w, _h, topInset) => ({
      x: 74,
      y: topInset + 286,
      width: w - 94,
      height: 152,
      circular: false,
    }),
  },
  3: {
    title: "Práctica libre, sin perder vidas",
    description:
      "Repasá lo que ya aprendiste: por ejercicio, por seña puntual o por tus errores — esa última opción también da XP.",
    accentColor: colors.courseTeal,
    lisaBody: "arms",
    bubbleAbove: true,
    getSpot: (w, h, _top, bottom) => tabSpot(1, w, h, bottom),
  },
  4: {
    title: "Gastá tus gemas acá",
    description:
      "Vidas, escudos para tu racha y potenciadores de XP. Arrancás con 100 gemas de regalo.",
    accentColor: colors.shopAmber,
    lisaBody: "waving",
    lisaSize: 230,
    lisaBottomExtra: 185,
    bubbleAbove: true,
    getSpot: (w, h, _top, bottom) => tabSpot(2, w, h, bottom),
  },
  5: {
    title: "No aprendas sola",
    description:
      "Agregá amigos y mirá su actividad en el feed. Ver que otros practican ayuda a no cortar la racha.",
    accentColor: colors.socialWine,
    lisaBody: "arms",
    lisaBottomExtra: 170,
    bubbleAbove: true,
    getSpot: (w, h, _top, bottom) => tabSpot(3, w, h, bottom),
  },
  6: {
    title: "Tu progreso y tus ajustes",
    description:
      "Arriba: racha, XP total y tu puesto en el ranking. Adentro: logros, inventario y meta diaria. ¿Te perdiste algo? Configuración → Volver a ver el tour.",
    accentColor: colors.primary,
    lisaBody: "waving",
    bubbleAbove: true,
    getSpot: (w, h, _top, bottom) => tabSpot(4, w, h, bottom),
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} ` +
    `L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
    `L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} ` +
    `L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
  );
}

function circlePath(cx: number, cy: number, r: number): string {
  return (
    `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} ` +
    `A ${r} ${r} 0 0 1 ${cx - r} ${cy} Z`
  );
}

function SpotlightHole({ spot }: { spot: Spot }) {
  const { width: sw, height: sh } = useWindowDimensions();
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const pulseScale = pulseAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] });
  const pulseOpacity = pulseAnim.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.5, 1, 0] });

  const r = spot.circular ? spot.width / 2 : 16;
  const cx = spot.x + spot.width / 2;
  const cy = spot.y + spot.height / 2;

  // Full-screen rect + hole path — fillRule "evenodd" makes the overlap transparent.
  const screenRect = `M 0 0 L ${sw} 0 L ${sw} ${sh} L 0 ${sh} Z`;
  const hole = spot.circular
    ? circlePath(cx, cy, r)
    : roundedRectPath(spot.x, spot.y, spot.width, spot.height, r);

  return (
    <>
      {/* SVG overlay with a clean cutout (no artifacts from overlapping rgba views) */}
      <Svg style={StyleSheet.absoluteFill} width={sw} height={sh}>
        <Path d={`${screenRect} ${hole}`} fill={OVERLAY} fillRule="evenodd" />
      </Svg>

      {/* White border */}
      <View
        style={[
          styles.spotBorder,
          { top: spot.y, left: spot.x, width: spot.width, height: spot.height, borderRadius: r },
        ]}
      />

      {/* Pulsing ring */}
      <Animated.View
        style={[
          styles.spotPulse,
          { top: spot.y, left: spot.x, width: spot.width, height: spot.height, borderRadius: r },
          { transform: [{ scale: pulseScale }], opacity: pulseOpacity },
        ]}
      />
    </>
  );
}

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOTAL_COACH_STEPS }, (_, i) => {
        const dotStep = i + 1;
        const active = dotStep === step;
        return (
          <View
            key={dotStep}
            style={[
              styles.dot,
              active ? styles.dotActive : styles.dotInactive,
            ]}
          />
        );
      })}
    </View>
  );
}

function CoachBubble({
  step,
  stepData,
  onPrev,
  onNext,
}: {
  step: number;
  stepData: StepData;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isFirst = step === 1;
  const isLast = step === TOTAL_COACH_STEPS;
  const acc = stepData.accentColor;

  return (
    <View style={styles.bubble}>
      {/* Header row: step label + progress dots */}
      <View style={styles.bubbleHeader}>
        <Text style={styles.bubbleStepLabel}>
          PASO {step} DE {TOTAL_COACH_STEPS}
        </Text>
        <StepDots step={step} />
      </View>

      <Text style={styles.bubbleTitle}>{stepData.title}</Text>
      <Text style={styles.bubbleDesc}>{stepData.description}</Text>

      {!!stepData.infoBox && (
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={17} color={colors.primary} style={{ flexShrink: 0 }} />
          <Text style={styles.infoBoxText}>{stepData.infoBox}</Text>
        </View>
      )}

      <View style={styles.bubbleActions}>
        <TouchableOpacity
          style={[styles.backBtn, isFirst && styles.backBtnDisabled]}
          onPress={onPrev}
          disabled={isFirst}
          activeOpacity={0.8}
        >
          <Ionicons
            name="arrow-back"
            size={20}
            color={isFirst ? colors.textMuted : colors.text}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.nextBtn, { backgroundColor: acc }]}
          onPress={onNext}
          activeOpacity={0.86}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Listo" : "Siguiente"}</Text>
          {!isLast && <Ionicons name="arrow-forward" size={18} color="#fff" />}
          {isLast && <Ionicons name="checkmark" size={18} color="#fff" />}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── WelcomeStep ───────────────────────────────────────────────────────────────

function WelcomeStep({
  onStart,
  onSkip,
}: {
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <View style={[styles.fullOverlay, { backgroundColor: WELCOME_OVERLAY }]} />

      <View style={styles.welcomeCard}>
        {/* Lisa image floats above card */}
        <Image
          source={require("@assets/images/lisa-waving.png")}
          style={styles.welcomeLisa}
        />

        <View style={styles.welcomeCardContent}>
          <Text style={styles.welcomeKicker}>Bienvenida</Text>
          <Text style={styles.welcomeTitle}>Hola, soy Lisa</Text>
          <Text style={styles.welcomeDesc}>
            Te voy a enseñar Lengua de Señas Argentina. Un minuto y te muestro dónde está todo.
          </Text>

          <TouchableOpacity
            style={styles.welcomeStartBtn}
            onPress={onStart}
            activeOpacity={0.86}
          >
            <Ionicons name="arrow-forward" size={20} color={colors.onDark} />
            <Text style={styles.welcomeStartText}>Mostrame la app</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onSkip} activeOpacity={0.8} style={styles.welcomeSkip}>
            <Text style={styles.welcomeSkipText}>Prefiero explorar solo</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ── ClosingStep ───────────────────────────────────────────────────────────────

function ClosingStep({ onDone }: { onDone: () => void }) {
  return (
    <>
      <View style={[styles.fullOverlay, { backgroundColor: OVERLAY }]} />

      <View style={styles.closingContainer}>
        <View style={styles.closingCard}>
          <Text style={styles.closingKicker}>🎉 Tour completado</Text>
          <Text style={styles.closingTitle}>Ya sabés dónde está todo</Text>
          <Text style={styles.closingDesc}>
            Te dejé cuatro primeros pasos en Inicio. Arranquemos por el primero.
          </Text>

          <TouchableOpacity style={styles.closingStartBtn} onPress={onDone} activeOpacity={0.86}>
            <Ionicons name="list" size={18} color={colors.onDark} />
            <Text style={styles.closingStartText}>Ver mis primeros pasos</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={onDone} style={styles.closingLater} activeOpacity={0.8}>
            <Text style={styles.closingLaterText}>Después lo hago</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

// ── CoachMarkStep ─────────────────────────────────────────────────────────────

function CoachMarkStep({
  step,
  stepData,
  spot,
  onPrev,
  onNext,
  onSkip,
  bottomInset,
}: {
  step: number;
  stepData: StepData;
  spot: Spot;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
  screenH: number;
  bottomInset: number;
}) {
  const bubbleAbove = stepData.bubbleAbove;

  return (
    <>
      <SpotlightHole spot={spot} />

      {/* Skip button */}
      <TouchableOpacity style={styles.skipBtn} onPress={onSkip} activeOpacity={0.8}>
        <Text style={styles.skipText}>Saltear</Text>
        <Ionicons name="close" size={15} color="#fff" />
      </TouchableOpacity>

      {/* Lisa body image — rendered behind the bubble (comes before it in JSX) */}
      {stepData.lisaBody && bubbleAbove && (
        <View
          style={[
            styles.lisaBodyContainer,
            {
              bottom: TAB_BAR_H + bottomInset + (stepData.lisaBottomExtra ?? 220),
              width: stepData.lisaSize ?? 190,
              height: stepData.lisaSize ?? 190,
            },
          ]}
        >
          <Image
            source={
              stepData.lisaBody === "waving"
                ? require("@assets/images/lisa-waving.png")
                : require("@assets/images/lisa-arms-crossed.png")
            }
            style={[
              styles.lisaBodyImage,
              {
                width: stepData.lisaSize ?? 190,
                height: stepData.lisaSize ?? 190,
              },
            ]}
          />
        </View>
      )}

      {/* Bubble card — rendered after Lisa, so it appears on top */}
      {bubbleAbove ? (
        <View
          style={[
            styles.bubblePositioned,
            { bottom: TAB_BAR_H + bottomInset + 14, zIndex: 10 },
          ]}
        >
          {/* Arrow pointing down */}
          <View style={[styles.arrowDown, { left: spot.x + spot.width / 2 - 9 }]} />
          <CoachBubble
            step={step}
            stepData={stepData}
            onPrev={onPrev}
            onNext={onNext}
          />
        </View>
      ) : (
        <View
          style={[
            styles.bubblePositioned,
            { top: spot.y + spot.height + 14 },
          ]}
        >
          {/* Arrow pointing up */}
          <View style={[styles.arrowUp, { left: spot.x + spot.width / 2 - 9 }]} />
          <CoachBubble
            step={step}
            stepData={stepData}
            onPrev={onPrev}
            onNext={onNext}
          />
        </View>
      )}
    </>
  );
}

// ── TourOverlay ───────────────────────────────────────────────────────────────

export function TourOverlay() {
  const { tourVisible, tourStep, tourGoNext, tourGoPrev, tourSkip } = useTour();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isWelcome = tourStep === 0;
  const isClosing = tourStep === 7;
  const isCoachMark = tourStep >= 1 && tourStep <= 6;

  const stepData = isCoachMark ? STEP_DATA[tourStep] : null;
  const spot = stepData
    ? stepData.getSpot(screenW, screenH, insets.top, insets.bottom)
    : null;

  return (
    <Modal
      visible={tourVisible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={tourSkip}
    >
      <View style={styles.root}>
        {isWelcome && (
          <WelcomeStep onStart={tourGoNext} onSkip={tourSkip} />
        )}

        {isCoachMark && stepData && spot && (
          <CoachMarkStep
            step={tourStep}
            stepData={stepData}
            spot={spot}
            onPrev={tourGoPrev}
            onNext={tourGoNext}
            onSkip={tourSkip}
            screenH={screenH}
            bottomInset={insets.bottom}
          />
        )}

        {isClosing && <ClosingStep onDone={tourGoNext} />}
      </View>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  spotBorder: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.95)",
  },
  spotPulse: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.7)",
  },

  // Skip button
  skipBtn: {
    position: "absolute",
    top: 56,
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    zIndex: 10,
  },
  skipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: "#fff",
  },

  // Bubble positioning wrapper
  bubblePositioned: {
    position: "absolute",
    left: 20,
    right: 20,
  },

  // Arrow indicators
  arrowUp: {
    position: "absolute",
    top: -9,
    width: 18,
    height: 18,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
    borderRadius: 4,
    zIndex: 1,
  },
  arrowDown: {
    position: "absolute",
    bottom: -9,
    width: 18,
    height: 18,
    backgroundColor: "#fff",
    transform: [{ rotate: "45deg" }],
    borderRadius: 4,
    zIndex: 1,
  },

  // Coach mark bubble card
  bubble: {
    backgroundColor: "#fff",
    borderRadius: 22,
    padding: 18,
    shadowColor: "rgba(24,16,32,1)",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    elevation: 12,
  },
  bubbleHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  bubbleStepLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    color: colors.textMuted,
  },
  dotsRow: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  dot: {
    height: 5,
    borderRadius: 3,
  },
  dotActive: {
    width: 16,
    backgroundColor: colors.primary,
  },
  dotInactive: {
    width: 5,
    backgroundColor: colors.roadmapLockedBorder,
  },
  bubbleTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.3,
    color: colors.text,
    marginTop: 14,
  },
  bubbleDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    color: "#6E625C",
    marginTop: 7,
  },
  infoBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: 14,
    padding: 11,
    marginTop: 12,
  },
  infoBoxText: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.primaryDark,
  },
  bubbleActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  backBtnDisabled: {
    backgroundColor: colors.fill,
    opacity: 0.5,
  },
  nextBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 44,
    borderRadius: 14,
  },
  nextBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: "#fff",
  },

  // Lisa body (tab bar coach mark steps, rendered behind bubble)
  lisaBodyContainer: {
    position: "absolute",
    right: 4,
    width: 190,
    height: 190,
  },
  lisaBodyImage: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 190,
    height: 190,
    resizeMode: "contain",
  },

  // Welcome step
  welcomeCard: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 24,
  },
  welcomeLisa: {
    position: "absolute",
    alignSelf: "center",
    bottom: "100%",
    width: 164,
    height: 164,
    resizeMode: "contain",
    zIndex: 1,
  },
  welcomeCardContent: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 22,
    alignItems: "center",
  },
  welcomeKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.primary,
  },
  welcomeTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.7,
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  welcomeDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    lineHeight: 22,
    color: "#6E625C",
    textAlign: "center",
    marginTop: 10,
  },
  welcomeStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 16,
    height: 56,
    alignSelf: "stretch",
    marginTop: 20,
  },
  welcomeStartText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: colors.onDark,
  },
  welcomeSkip: {
    paddingVertical: 6,
    marginTop: 4,
  },
  welcomeSkipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.textMuted,
    textAlign: "center",
  },

  // Closing step
  closingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  closingCard: {
    backgroundColor: "#fff",
    borderRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
    overflow: "visible",
  },
  closingKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 0.5,
    color: colors.primary,
    textAlign: "center",
  },
  closingTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
    lineHeight: 30,
    letterSpacing: -0.5,
    color: colors.text,
    textAlign: "center",
    marginTop: 8,
  },
  closingDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    lineHeight: 22,
    color: "#6E625C",
    textAlign: "center",
    marginTop: 10,
  },
  closingStartBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 16,
    height: 54,
    alignSelf: "stretch",
    marginTop: 16,
  },
  closingStartText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.onDark,
  },
  closingLater: {
    paddingVertical: 8,
    marginTop: 4,
  },
  closingLaterText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.textMuted,
    textAlign: "center",
  },
});
