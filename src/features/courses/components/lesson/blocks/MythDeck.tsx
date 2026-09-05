import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { MythEntry } from "@/features/courses/lessonContent.types";
import { renderTextWithLinks } from "./richText";

interface MythDeckProps {
  myths: MythEntry[];
  /** Fires once the last card has been swiped away. */
  onFinished: () => void;
}

/** Cards kept mounted behind the top one, to fake the stack. */
const VISIBLE_DEPTH = 3;
const CARD_HEIGHT = 268;
const SWIPE_THRESHOLD = 100;

/**
 * Two-sided cards stacked on top of each other: the front holds the myth, the
 * back the reality. Tapping flips the top card, dragging it far enough to
 * either side discards it, and running out of cards ends the block.
 */
export function MythDeck({ myths, onFinished }: MythDeckProps) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const pan = useRef(new Animated.ValueXY()).current;
  const flip = useRef(new Animated.Value(0)).current;

  // The PanResponder is built once, so everything it reads lives in a ref.
  const indexRef = useRef(0);
  const widthRef = useRef(width);
  const totalRef = useRef(myths.length);
  const finishedRef = useRef(onFinished);
  widthRef.current = width;
  totalRef.current = myths.length;
  finishedRef.current = onFinished;

  const advance = useCallback(() => {
    pan.setValue({ x: 0, y: 0 });
    flip.setValue(0);
    setFlipped(false);

    const next = indexRef.current + 1;
    indexRef.current = next;
    setIndex(next);
    if (next >= totalRef.current) finishedRef.current();
  }, [flip, pan]);

  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > 8 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gesture) => {
        if (Math.abs(gesture.dx) < SWIPE_THRESHOLD) {
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            friction: 6,
            useNativeDriver: false,
          }).start();
          return;
        }
        const direction = gesture.dx > 0 ? 1 : -1;
        Animated.timing(pan, {
          toValue: { x: direction * widthRef.current * 1.3, y: gesture.dy },
          duration: 220,
          useNativeDriver: false,
        }).start(() => advanceRef.current());
      },
    })
  ).current;

  function toggleFlip() {
    const next = !flipped;
    setFlipped(next);
    Animated.timing(flip, {
      toValue: next ? 1 : 0,
      duration: 320,
      useNativeDriver: false,
    }).start();
  }

  if (index >= myths.length) return null;

  const frontRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = flip.interpolate({
    inputRange: [0, 1],
    outputRange: ["180deg", "360deg"],
  });
  const tilt = pan.x.interpolate({
    inputRange: [-width, 0, width],
    outputRange: ["-11deg", "0deg", "11deg"],
  });

  const stack = myths.slice(index, index + VISIBLE_DEPTH);
  const counter = `${index + 1}/${myths.length}`;
  const top = stack[0];

  return (
    <View style={styles.container}>
      <View style={styles.deck}>
        {stack
          .slice(1)
          .map((myth, depth) => (
            <View
              key={index + depth + 1}
              style={[
                styles.card,
                {
                  transform: [
                    { translateY: (depth + 1) * 9 },
                    { scale: 1 - (depth + 1) * 0.04 },
                  ],
                },
              ]}
            >
              <CardFace
                kind="myth"
                title={myth.title}
                body={myth.myth}
                counter={`${index + depth + 2}/${myths.length}`}
              />
            </View>
          ))
          .reverse()}

        <Animated.View
          key={index}
          style={[
            styles.cardLayer,
            { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate: tilt }] },
          ]}
          {...responder.panHandlers}
        >
          <Pressable
            onPress={toggleFlip}
            accessibilityRole="button"
            accessibilityLabel={flipped ? "Ver el mito" : "Ver la verdad"}
            style={styles.cardLayer}
          >
            <Animated.View
              style={[
                styles.card,
                styles.cardFace,
                { transform: [{ perspective: 1000 }, { rotateY: frontRotation }] },
              ]}
            >
              <CardFace kind="myth" title={top.title} body={top.myth} counter={counter} />
            </Animated.View>

            <Animated.View
              style={[
                styles.card,
                styles.cardFace,
                { transform: [{ perspective: 1000 }, { rotateY: backRotation }] },
              ]}
            >
              <CardFace kind="reality" title={top.title} body={top.reality} counter={counter} />
            </Animated.View>
          </Pressable>
        </Animated.View>
      </View>

      <Text style={styles.hint}>
        {flipped ? "Deslizá la tarjeta para descartarla" : "Tocá la tarjeta para ver la verdad"}
      </Text>
    </View>
  );
}

interface CardFaceProps {
  kind: "myth" | "reality";
  title: string;
  body: string;
  counter: string;
}

function CardFace({ kind, title, body, counter }: CardFaceProps) {
  const isMyth = kind === "myth";
  const tone = isMyth ? colors.danger : colors.success;
  const tint = isMyth ? colors.dangerLight : colors.successLight;

  return (
    <View style={styles.faceContent}>
      <View style={styles.faceTop}>
        <View style={[styles.badge, { backgroundColor: tint }]}>
          <Ionicons name={isMyth ? "close-circle" : "checkmark-circle"} size={14} color={tone} />
          <Text style={[styles.badgeText, { color: tone }]}>{isMyth ? "MITO" : "VERDAD"}</Text>
        </View>
        <Text style={styles.counter}>{counter}</Text>
      </View>

      <View style={styles.faceCenter}>
        <Text style={styles.faceTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={[styles.faceBody, !isMyth && styles.faceBodyReality]}>
          {renderTextWithLinks(body, styles.link)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10, marginTop: 4 },
  deck: { height: CARD_HEIGHT + 20 },
  cardLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
  },
  card: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 22,
  },
  cardFace: {
    backfaceVisibility: "hidden",
  },
  faceContent: {
    flex: 1,
    padding: 18,
  },
  /** Title + body sit centred in whatever room the badge row leaves. */
  faceCenter: {
    flex: 1,
    justifyContent: "center",
    gap: 10,
  },
  faceTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
  },
  counter: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  faceTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.5,
    color: colors.text,
  },
  faceBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
  },
  faceBodyReality: {
    fontFamily: fonts.bodyMedium,
    color: colors.text,
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryDark,
    textDecorationLine: "underline",
  },
  hint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
    textAlign: "center",
  },
});
