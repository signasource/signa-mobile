import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  BackHandler,
  Image,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes, alpha } from "@/theme";
import type { NavigationContainerRef } from "@react-navigation/native";
import { useTour } from "../TourContext";
import {
  TOUR_CLOSING_STEP,
  TOUR_STEPS,
  TOUR_STEP_COUNT,
  TOUR_WELCOME_STEP,
  type TourStepConfig,
} from "../steps";
import { useTourSpot } from "../useTourSpot";
import { placeBubble, spotFromRect, SKIP_ROW_HEIGHT, type Spot } from "../placement";

// ── Constants ────────────────────────────────────────────────────────────────

const OVERLAY = alpha(colors.tourScrim, 0.74);
const WELCOME_OVERLAY = alpha(colors.tourScrim, 0.6);
const BUBBLE_MARGIN_X = 20;
const BUBBLE_MAX_WIDTH = 460;
const ARROW_SIZE = 18;

type Size = { width: number; height: number };

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

// ── Spotlight ────────────────────────────────────────────────────────────────

function roundedRectPath(x: number, y: number, w: number, h: number, r: number): string {
  return (
    `M ${x + r} ${y} L ${x + w - r} ${y} Q ${x + w} ${y} ${x + w} ${y + r} ` +
    `L ${x + w} ${y + h - r} Q ${x + w} ${y + h} ${x + w - r} ${y + h} ` +
    `L ${x + r} ${y + h} Q ${x} ${y + h} ${x} ${y + h - r} ` +
    `L ${x} ${y + r} Q ${x} ${y} ${x + r} ${y} Z`
  );
}

function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy} A ${r} ${r} 0 0 1 ${cx - r} ${cy} Z`;
}

/** Dark scrim with a clean cutout over `spot` (or fully dark when `spot` is null). */
function Scrim({ spot, size }: { spot: Spot | null; size: Size }) {
  const { width: sw, height: sh } = size;
  const screenRect = `M 0 0 L ${sw} 0 L ${sw} ${sh} L 0 ${sh} Z`;
  const hole = spot
    ? spot.circular
      ? circlePath(spot.x + spot.width / 2, spot.y + spot.height / 2, spot.radius)
      : roundedRectPath(spot.x, spot.y, spot.width, spot.height, spot.radius)
    : "";

  return (
    <Svg style={StyleSheet.absoluteFill} width={sw} height={sh} pointerEvents="none">
      {/* evenodd: the hole path overlapping the full-screen rect becomes transparent. */}
      <Path d={`${screenRect} ${hole}`} fill={OVERLAY} fillRule="evenodd" />
    </Svg>
  );
}

/** White border plus a pulsing ring around the cutout. */
function SpotRing({ spot }: { spot: Spot }) {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const box = {
    top: spot.y,
    left: spot.x,
    width: spot.width,
    height: spot.height,
    borderRadius: spot.radius,
  };

  return (
    <>
      <View pointerEvents="none" style={[styles.spotBorder, box]} />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.spotPulse,
          box,
          {
            opacity: pulse.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0.5, 1, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.3] }) }],
          },
        ]}
      />
    </>
  );
}

// ── Coach mark ───────────────────────────────────────────────────────────────

function StepDots({ step }: { step: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: TOUR_STEP_COUNT }, (_, i) => (
        <View
          key={i}
          style={[styles.dot, i + 1 === step ? styles.dotActive : styles.dotInactive]}
        />
      ))}
    </View>
  );
}

function CoachBubble({
  step,
  config,
  maxHeight,
  onPrev,
  onNext,
}: {
  step: number;
  config: TourStepConfig;
  maxHeight: number;
  onPrev: () => void;
  onNext: () => void;
}) {
  const isFirst = step === 1;
  const isLast = step === TOUR_STEP_COUNT;

  return (
    <View style={[styles.bubble, { maxHeight }]}>
      {/* Long copy (large font scale, small phones) scrolls; the buttons always stay visible. */}
      <ScrollView
        style={styles.bubbleScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.bubbleHeader}>
          <Text style={styles.bubbleStepLabel}>
            PASO {step} DE {TOUR_STEP_COUNT}
          </Text>
          <StepDots step={step} />
        </View>

        <Text style={styles.bubbleTitle}>{config.title}</Text>
        <Text style={styles.bubbleDesc}>{config.description}</Text>

        {!!config.infoBox && (
          <View style={styles.infoBox}>
            <Ionicons
              name="information-circle"
              size={17}
              color={colors.primary}
              style={styles.infoIcon}
            />
            <Text style={styles.infoBoxText}>{config.infoBox}</Text>
          </View>
        )}
      </ScrollView>

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
          style={[styles.nextBtn, { backgroundColor: config.accentColor }]}
          onPress={onNext}
          activeOpacity={0.86}
        >
          <Text style={styles.nextBtnText}>{isLast ? "Listo" : "Siguiente"}</Text>
          <Ionicons name={isLast ? "checkmark" : "arrow-forward"} size={18} color={colors.onColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

/**
 * One coach mark: scrim + highlight + popover. The popover is measured and then placed on the
 * side of the highlight that has room, so it adapts to any screen size or font scale.
 * Remounted per step (`key`), which resets the measured popover height.
 */
function CoachMarkStep({
  step,
  config,
  spot,
  size,
  insets,
  onPrev,
  onNext,
  onSkip,
}: {
  step: number;
  config: TourStepConfig;
  /** `null`: the element could not be found, so the popover is shown centered without a highlight. */
  spot: Spot | null;
  size: Size;
  insets: { top: number; bottom: number };
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [bubbleHeight, setBubbleHeight] = useState<number | null>(null);

  const bubbleWidth = Math.min(size.width - BUBBLE_MARGIN_X * 2, BUBBLE_MAX_WIDTH);
  const bubbleLeft = (size.width - bubbleWidth) / 2;
  const maxBubbleHeight = Math.max(
    160,
    size.height - insets.top - SKIP_ROW_HEIGHT - insets.bottom - 24,
  );

  const placement =
    bubbleHeight === null
      ? null
      : placeBubble({
          spot,
          preferred: config.preferredSide,
          bubbleHeight,
          height: size.height,
          insetTop: insets.top,
          insetBottom: insets.bottom,
        });

  const lisaSize = clamp(size.height * 0.2, 110, 190);
  const showLisa =
    !!config.lisa &&
    !!placement &&
    placement.side === "above" &&
    placement.top - (insets.top + SKIP_ROW_HEIGHT) >= lisaSize * 0.8;

  const arrowLeft = spot
    ? clamp(spot.x + spot.width / 2 - bubbleLeft - ARROW_SIZE / 2, 22, bubbleWidth - 22 - ARROW_SIZE)
    : 0;

  return (
    <>
      <Scrim spot={spot} size={size} />
      {spot && <SpotRing spot={spot} />}

      <TouchableOpacity
        style={[styles.skipBtn, { top: insets.top + 12 }]}
        onPress={onSkip}
        activeOpacity={0.8}
      >
        <Text style={styles.skipText}>Saltear</Text>
        <Ionicons name="close" size={15} color={colors.onColor} />
      </TouchableOpacity>

      {/* Lisa goes before the bubble so the bubble is drawn over her. */}
      {showLisa && placement && config.lisa && (
        <Image
          source={
            config.lisa === "waving"
              ? require("@assets/images/lisa-waving.png")
              : require("@assets/images/lisa-arms-crossed.png")
          }
          style={{
            position: "absolute",
            right: bubbleLeft + 4,
            top: placement.top - lisaSize + 22,
            width: lisaSize,
            height: lisaSize,
            resizeMode: "contain",
          }}
        />
      )}

      <View
        // Invisible until measured: avoids a one-frame flash at the wrong position.
        style={[
          styles.bubbleWrap,
          {
            left: bubbleLeft,
            width: bubbleWidth,
            top: placement?.top ?? 0,
            opacity: placement ? 1 : 0,
          },
        ]}
        onLayout={(e) => {
          const h = Math.round(e.nativeEvent.layout.height);
          setBubbleHeight((prev) => (prev === h ? prev : h));
        }}
      >
        {placement?.showArrow && placement.side === "below" && (
          <View style={[styles.arrow, { top: -ARROW_SIZE / 2, left: arrowLeft }]} />
        )}
        {placement?.showArrow && placement.side === "above" && (
          <View style={[styles.arrow, { bottom: -ARROW_SIZE / 2, left: arrowLeft }]} />
        )}
        <CoachBubble
          step={step}
          config={config}
          maxHeight={maxBubbleHeight}
          onPrev={onPrev}
          onNext={onNext}
        />
      </View>
    </>
  );
}

// ── Welcome & closing ────────────────────────────────────────────────────────

function WelcomeStep({
  size,
  bottomInset,
  onStart,
  onSkip,
}: {
  size: Size;
  bottomInset: number;
  onStart: () => void;
  onSkip: () => void;
}) {
  const lisaSize = clamp(size.height * 0.2, 110, 164);

  return (
    <>
      <View style={[styles.fullOverlay, { backgroundColor: WELCOME_OVERLAY }]} />

      <View style={[styles.welcomeCard, { bottom: Math.max(24, bottomInset + 12) }]}>
        <Image
          source={require("@assets/images/lisa-waving.png")}
          style={[styles.welcomeLisa, { width: lisaSize, height: lisaSize }]}
        />

        <View style={styles.welcomeCardContent}>
          <Text style={styles.welcomeKicker}>Bienvenida</Text>
          <Text style={styles.welcomeTitle}>Hola, soy Lisa</Text>
          <Text style={styles.welcomeDesc}>
            Te voy a enseñar Lengua de Señas Argentina. Un minuto y te muestro dónde está todo.
          </Text>

          <TouchableOpacity style={styles.welcomeStartBtn} onPress={onStart} activeOpacity={0.86}>
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

// ── TourOverlay ───────────────────────────────────────────────────────────────

/**
 * The welcome tour. Rendered as the last child of the app root (not a `Modal`), so it shares
 * the app's coordinate space and always sits on top of the navigator it explains.
 * Step 0 welcome → 1..TOUR_STEP_COUNT coach marks (`TOUR_STEPS`) → closing.
 */
export function TourOverlay({
  navigationRef,
}: {
  navigationRef: React.RefObject<NavigationContainerRef<any> | null>;
}) {
  const { tourVisible, tourStep, tourGoNext, tourGoPrev, tourSkip } = useTour();
  const insets = useSafeAreaInsets();

  // Everything is laid out in the overlay's own space: its size (not the window's) and the
  // elements' positions relative to its origin (see `useTourSpot`).
  const rootRef = useRef<View>(null);
  const [size, setSize] = useState<Size | null>(null);

  const isWelcome = tourStep === TOUR_WELCOME_STEP;
  const isClosing = tourStep === TOUR_CLOSING_STEP;
  const config =
    tourVisible && tourStep >= 1 && tourStep <= TOUR_STEP_COUNT ? TOUR_STEPS[tourStep - 1] : null;

  const spotState = useTourSpot({ stepIndex: tourStep, step: config, rootRef, navigationRef });

  // Android back skips the tour instead of leaving the app underneath.
  useEffect(() => {
    if (!tourVisible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      tourSkip();
      return true;
    });
    return () => sub.remove();
  }, [tourVisible, tourSkip]);

  if (!tourVisible) return null;

  const spot =
    config && size && spotState.status === "ready" && spotState.rect
      ? spotFromRect(spotState.rect, config.shape, size)
      : null;

  return (
    <View
      ref={rootRef}
      collapsable={false}
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize((prev) =>
          prev && prev.width === width && prev.height === height ? prev : { width, height },
        );
      }}
    >
      {size && isWelcome && (
        <WelcomeStep
          size={size}
          bottomInset={insets.bottom}
          onStart={tourGoNext}
          onSkip={tourSkip}
        />
      )}

      {/* Searching: fully dark until the element holds still, so the highlight never jumps. */}
      {size && config && spotState.status === "searching" && (
        <>
          <View style={[styles.fullOverlay, { backgroundColor: OVERLAY }]} />
          <TouchableOpacity
            style={[styles.skipBtn, { top: insets.top + 12 }]}
            onPress={tourSkip}
            activeOpacity={0.8}
          >
            <Text style={styles.skipText}>Saltear</Text>
            <Ionicons name="close" size={15} color={colors.onColor} />
          </TouchableOpacity>
        </>
      )}

      {size && config && spotState.status !== "searching" && (
        <CoachMarkStep
          key={tourStep}
          step={tourStep}
          config={config}
          spot={spot}
          size={size}
          insets={insets}
          onPrev={tourGoPrev}
          onNext={tourGoNext}
          onSkip={tourSkip}
        />
      )}

      {size && isClosing && <ClosingStep onDone={tourGoNext} />}
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 9999,
    elevation: 9999,
  },
  fullOverlay: {
    ...StyleSheet.absoluteFill,
  },
  spotBorder: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: alpha(colors.onColor, 0.95),
  },
  spotPulse: {
    position: "absolute",
    borderWidth: 2.5,
    borderColor: alpha(colors.onColor, 0.7),
  },

  // Skip button
  skipBtn: {
    position: "absolute",
    right: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 32,
    paddingHorizontal: 13,
    borderRadius: 999,
    backgroundColor: alpha(colors.onColor, 0.16),
    borderWidth: 1,
    borderColor: alpha(colors.onColor, 0.3),
    zIndex: 10,
  },
  skipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.onColor,
  },

  // Bubble positioning wrapper (its height is measured to place it)
  bubbleWrap: {
    position: "absolute",
    zIndex: 10,
  },
  arrow: {
    position: "absolute",
    width: ARROW_SIZE,
    height: ARROW_SIZE,
    backgroundColor: colors.surface,
    transform: [{ rotate: "45deg" }],
    borderRadius: 4,
    zIndex: 1,
  },

  // Coach mark bubble card
  bubble: {
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 18,
    shadowColor: colors.tourScrim,
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.3,
    shadowRadius: 36,
    elevation: 12,
  },
  bubbleScroll: {
    flexGrow: 0,
    flexShrink: 1,
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
    color: colors.textSecondary,
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
  infoIcon: {
    flexShrink: 0,
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
    color: colors.onColor,
  },

  // Welcome step
  welcomeCard: {
    position: "absolute",
    left: 20,
    right: 20,
  },
  welcomeLisa: {
    position: "absolute",
    alignSelf: "center",
    bottom: "100%",
    resizeMode: "contain",
    zIndex: 1,
  },
  welcomeCardContent: {
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
    backgroundColor: colors.surface,
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
    color: colors.textSecondary,
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
