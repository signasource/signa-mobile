import React, { useMemo, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { SignPlaceholder } from "../SignPlaceholder";
import { XpChip } from "../XpChip";
import { FeedbackBar } from "../FeedbackBar";
import { LessonButton } from "../LessonButton";

interface SignCarouselBlockProps {
  question: string;
  options: string[];
  answer: string;
  xp: number;
  confirmLabel: string;
  confirmIcon: keyof typeof Ionicons.glyphMap;
  correctDetail: string;
  wrongDetail: (correctIndex: number, correctValue: string) => string;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

/** Carrusel de cards apiladas compartido por SELECT_SIGN y CONTEXT_RESPONSE. */
export function SignCarouselBlock({
  question,
  options,
  answer,
  xp,
  confirmLabel,
  confirmIcon,
  correctDetail,
  wrongDetail,
  onAnswer,
  onContinue,
}: SignCarouselBlockProps) {
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<"idle" | "correct" | "incorrect" | "revealed">("idle");

  const correctIndex = useMemo(() => options.findIndex((o) => o === answer), [options, answer]);
  const answered = status !== "idle";

  function confirm() {
    if (answered) return;
    const correct = options[index] === answer;
    onAnswer(correct);
    setStatus(correct ? "correct" : "incorrect");
  }

  function reveal() {
    setIndex(correctIndex);
    setStatus("revealed");
  }

  function move(delta: number) {
    if (answered) return;
    setIndex((current) => Math.min(options.length - 1, Math.max(0, current + delta)));
  }

  const cardTone = status === "incorrect" ? "wrong" : "neutral";

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.question}>{question}</Text>
          <XpChip xp={xp} state={status === "correct" ? "correct" : status === "incorrect" || status === "revealed" ? "incorrect" : "idle"} />
        </View>

        <View style={styles.stack}>
          <View style={[styles.stackLayer, styles.stackLayerBack]} />
          <View style={[styles.stackLayer, styles.stackLayerMid]} />
          <SignPlaceholder
            label={`avatar 3D · seña ${index + 1}`}
            height={330}
            tone={cardTone}
            icon={status === "idle" ? "play" : "refresh"}
            badge={`Opción ${index + 1} de ${options.length}`}
            style={styles.stackFront}
          />
          {status === "incorrect" && (
            <View style={styles.wrongMark}>
              <Ionicons name="close" size={20} color={colors.onDark} />
            </View>
          )}
        </View>

        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => move(-1)}
            disabled={answered || index === 0}
            style={[styles.navButton, (answered || index === 0) && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-back" size={19} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.dots}>
            {options.map((_, i) => {
              const isCurrent = i === index;
              let dotColor = colors.neutral200;
              if (isCurrent) {
                dotColor = status === "incorrect" ? colors.danger : status === "correct" || status === "revealed" ? colors.success : colors.primary;
              } else if (status === "revealed" && i === correctIndex) {
                dotColor = colors.success;
              }
              return <View key={i} style={[styles.dot, isCurrent && styles.dotActive, { backgroundColor: dotColor }]} />;
            })}
          </View>
          <TouchableOpacity
            onPress={() => move(1)}
            disabled={answered || index === options.length - 1}
            style={[styles.navButton, (answered || index === options.length - 1) && styles.navButtonDisabled]}
          >
            <Ionicons name="chevron-forward" size={19} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.footer}>
        {status === "idle" && (
          <LessonButton label={confirmLabel} icon={confirmIcon} onPress={confirm} />
        )}
        {status === "correct" && (
          <>
            <FeedbackBar correct title="¡Correcto!" detail={correctDetail} />
            <LessonButton label="Continuar" onPress={onContinue} />
          </>
        )}
        {status === "incorrect" && (
          <>
            <FeedbackBar correct={false} title="No era esa" detail={wrongDetail(correctIndex, answer)} />
            <LessonButton label="Ver la correcta" onPress={reveal} />
          </>
        )}
        {status === "revealed" && (
          <>
            <FeedbackBar correct={false} title="No era esa" detail={wrongDetail(correctIndex, answer)} />
            <LessonButton label="Continuar" onPress={onContinue} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 20, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  question: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    lineHeight: 26,
    letterSpacing: -0.6,
    color: colors.text,
  },
  stack: { height: 356 },
  stackLayer: {
    position: "absolute",
    left: 26,
    right: 26,
    top: 20,
    height: 330,
    borderRadius: 24,
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stackLayerBack: { left: 26, right: 26, top: 20 },
  stackLayerMid: { left: 13, right: 13, top: 10, backgroundColor: "#F7F2EC" },
  stackFront: { position: "absolute", left: 0, right: 0, top: 0 },
  wrongMark: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.danger,
    alignItems: "center",
    justifyContent: "center",
  },
  navRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  navButtonDisabled: { opacity: 0.4 },
  dots: { flexDirection: "row", alignItems: "center", gap: 7 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  dotActive: { width: 24 },
  footer: { padding: 20, paddingTop: 12, gap: 12 },
});
