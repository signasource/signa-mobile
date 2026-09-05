import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { SelectMeaningConfig } from "@/features/courses/lessonContent.types";
import { SignAnimation } from "../SignAnimation";
import { XpChip } from "../XpChip";
import { FeedbackBar } from "../FeedbackBar";
import { LessonButton } from "../LessonButton";

interface SelectMeaningBlockProps {
  config: SelectMeaningConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

export function SelectMeaningBlock({ config, xp, onAnswer, onContinue }: SelectMeaningBlockProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const answered = selected !== null;
  const correct = answered && selected === config.sign;

  function handleSelect(option: string) {
    if (answered) return;
    setSelected(option);
    onAnswer(option === config.sign);
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.question}>¿Qué significa esta seña?</Text>
          <XpChip xp={xp} state={answered ? (correct ? "correct" : "incorrect") : "idle"} />
        </View>

        <SignAnimation meaning={config.sign} label="avatar 3D" paused={answered} />

        <View style={styles.grid}>
          {config.options.map((option) => {
            const isSelected = option === selected;
            const isCorrectOption = option === config.sign;
            const showCorrect = answered && isCorrectOption;
            const showWrong = answered && isSelected && !isCorrectOption;
            const dim = answered && !isSelected && !isCorrectOption;

            return (
              <TouchableOpacity
                key={option}
                onPress={() => handleSelect(option)}
                activeOpacity={0.85}
                disabled={answered}
                style={[
                  styles.option,
                  showCorrect && styles.optionCorrect,
                  showWrong && styles.optionWrong,
                  dim && styles.optionDim,
                ]}
              >
                {showCorrect && <Ionicons name="checkmark-circle" size={19} color={colors.successDark} />}
                {showWrong && <Ionicons name="close-circle" size={19} color={colors.danger} />}
                <Text
                  style={[
                    styles.optionText,
                    showCorrect && { color: colors.successDark },
                    showWrong && { color: colors.danger },
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        {!answered && <Text style={styles.hint}>Tocá una opción para responder</Text>}
        {answered && (
          <>
            <FeedbackBar
              correct={correct}
              title={correct ? "¡Correcto!" : "No era esa"}
              detail={correct ? `«${config.sign}» es la seña que viste.` : `La correcta es «${config.sign}».`}
            />
            <LessonButton label="Continuar" onPress={onContinue} />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  question: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
    color: colors.text,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  option: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 84,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    padding: 12,
  },
  optionCorrect: { backgroundColor: colors.successLight, borderWidth: 2, borderColor: colors.success },
  optionWrong: { backgroundColor: colors.dangerLight, borderWidth: 2, borderColor: colors.danger },
  optionDim: { opacity: 0.45 },
  optionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.text,
  },
  footer: { padding: 20, paddingTop: 16, gap: 12 },
  hint: {
    textAlign: "center",
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: "#B0A7A0",
  },
});
