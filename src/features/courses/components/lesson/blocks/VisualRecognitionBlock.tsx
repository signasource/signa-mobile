import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { VisualRecognitionConfig } from "@/features/courses/lessonContent.types";
import { SignPlaceholder } from "../SignPlaceholder";
import { XpChip } from "../XpChip";
import { FeedbackBar } from "../FeedbackBar";
import { LessonButton } from "../LessonButton";

interface VisualRecognitionBlockProps {
  config: VisualRecognitionConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

export function VisualRecognitionBlock({ config, xp, onAnswer, onContinue }: VisualRecognitionBlockProps) {
  const total = config.sign_sequence.length;
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const done = marked.size === total;

  function handleTap(option: string) {
    if (marked.has(option) || wrongOption) return;

    if (config.sign_sequence.includes(option)) {
      setMarked((prev) => new Set(prev).add(option));
      onAnswer(true);
    } else {
      setWrongOption(option);
      onAnswer(false);
      timer.current = setTimeout(() => setWrongOption(null), 900);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.question}>¿Qué señas aparecen?</Text>
          <XpChip xp={xp} state={done ? "correct" : "idle"} />
        </View>

        <SignPlaceholder label={`secuencia · ${total} señas`} height={250} />

        <View style={styles.hintRow}>
          <Ionicons name="shuffle" size={15} color={colors.textMuted} />
          <Text style={styles.hint}>
            {config.keep_order ? "Marcálas en el orden en que aparecieron." : "Marcá las que viste. El orden no importa."}
          </Text>
        </View>

        <View style={styles.grid}>
          {config.options.map((option) => {
            const isMarked = marked.has(option);
            const isWrong = wrongOption === option;
            return (
              <TouchableOpacity
                key={option}
                onPress={() => handleTap(option)}
                disabled={isMarked || !!wrongOption}
                activeOpacity={0.85}
                style={[styles.option, isMarked && styles.optionMarked, isWrong && styles.optionWrong]}
              >
                {isMarked && <Ionicons name="checkmark-circle" size={17} color={colors.successDark} />}
                {isWrong && <Ionicons name="close-circle" size={17} color={colors.danger} />}
                <Text
                  style={[
                    styles.optionText,
                    isMarked && { color: colors.successDark },
                    isWrong && { color: colors.danger },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
          <View style={styles.counterTile}>
            <Text style={styles.counterText}>
              {marked.size} de {total} marcadas
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {wrongOption && (
          <FeedbackBar correct={false} title={`«${wrongOption}» no estaba`} detail="Perdiste una vida. Seguí marcando las que faltan." />
        )}
        {done && <LessonButton label="Continuar" onPress={onContinue} />}
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
    letterSpacing: -0.6,
    color: colors.text,
  },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  hint: { flex: 1, fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  option: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 10,
  },
  optionMarked: { borderWidth: 2, borderColor: colors.success, backgroundColor: colors.successLight },
  optionWrong: { borderWidth: 2, borderColor: colors.danger, backgroundColor: colors.dangerLight },
  optionText: { fontFamily: fonts.bodySemiBold, fontSize: 15.5, color: colors.text },
  counterTile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 56,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.neutral200,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
  },
  counterText: { fontFamily: fonts.bodySemiBold, fontSize: 12.5, color: "#B0A7A0" },
  footer: { padding: 20, paddingTop: 12, gap: 12 },
});
