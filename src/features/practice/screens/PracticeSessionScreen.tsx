import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { practiceApi } from "@/api/practice";
import { EmptyState } from "@/components/EmptyState";
import { BlockType, LessonContentBlock, parseBlockConfig } from "@/features/courses/lessonContent.types";
import { LessonButton } from "@/features/courses/components/lesson/LessonButton";
import { InfoBlock } from "@/features/courses/components/lesson/blocks/InfoBlock";
import { SelectMeaningBlock } from "@/features/courses/components/lesson/blocks/SelectMeaningBlock";
import { SelectSignBlock } from "@/features/courses/components/lesson/blocks/SelectSignBlock";
import { ContextResponseBlock } from "@/features/courses/components/lesson/blocks/ContextResponseBlock";
import { MatchBlock } from "@/features/courses/components/lesson/blocks/MatchBlock";
import { VisualRecognitionBlock } from "@/features/courses/components/lesson/blocks/VisualRecognitionBlock";
import { PracticeSessionHeader } from "@/features/practice/components/PracticeSessionHeader";
import { PracticeComplete } from "@/features/practice/components/PracticeComplete";
import { EXERCISE_TYPE_BY_KEY } from "@/features/practice/types";

type Props = NativeStackScreenProps<AppStackParamList, "PracticeSession">;

/**
 * Standalone practice session: exercises by type, by a learned sign, or a
 * mistake-review queue (see docs/features/practice.md). Reuses the real
 * lesson block components, but — unlike LessonScreen — never calls
 * learningApi.recordBlockInteraction: no lives, no real XP, no lesson
 * progress. Attempts go to practiceApi.recordAttempt instead.
 */
export function PracticeSessionScreen({ route, navigation }: Props) {
  const { mode } = route.params;
  const insets = useSafeAreaInsets();

  const [blocks, setBlocks] = useState<LessonContentBlock[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockIndex, setBlockIndex] = useState(0);
  const [correctBlockIds, setCorrectBlockIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);

  const title = useMemo(() => {
    if (mode.mode === "type") return mode.title;
    if (mode.mode === "sign") return mode.meaning;
    return "Repaso de errores";
  }, [mode]);

  const loadExercises = useCallback(() => {
    setLoading(true);
    setError(null);
    setBlockIndex(0);
    setCorrectBlockIds(new Set());
    setCompleted(false);

    const request =
      mode.mode === "type"
        ? practiceApi.getExercisesByType(mode.blockType)
        : mode.mode === "sign"
          ? practiceApi.getExercisesForSign(mode.meaning)
          : practiceApi.getMistakeExercises();

    request
      .then((res) => setBlocks(res.data))
      .catch(() => setError("No pudimos cargar los ejercicios."))
      .finally(() => setLoading(false));
  }, [mode]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  function goToNextBlock() {
    setBlockIndex((i) => {
      const next = i + 1;
      if (!blocks || next >= blocks.length) {
        setCompleted(true);
        return i;
      }
      return next;
    });
  }

  function handleAnswer(block: LessonContentBlock, correct: boolean) {
    practiceApi.recordAttempt(block.id, correct).catch(() => {});
    if (correct) {
      setCorrectBlockIds((prev) => new Set(prev).add(block.id));
    }
    goToNextBlock();
  }

  if (loading) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.courseTeal} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>No pudimos cargar la práctica</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <LessonButton label="Reintentar" onPress={loadExercises} />
      </View>
    );
  }

  if (!blocks || blocks.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 14 }]}>
        <EmptyState
          title="Nada para practicar todavía"
          description={emptyDescription(mode)}
        />
        <View style={styles.emptyFooter}>
          <LessonButton label="Volver" onPress={() => navigation.goBack()} />
        </View>
      </View>
    );
  }

  if (completed) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <PracticeComplete
          correctBlocks={correctBlockIds.size}
          totalBlocks={blocks.length}
          onClose={() => navigation.goBack()}
          onRepeat={loadExercises}
        />
      </View>
    );
  }

  const progress = blocks.length > 0 ? blockIndex / blocks.length : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <PracticeSessionHeader title={title} progress={progress} onBack={() => navigation.goBack()} />

      <View style={styles.blockArea}>
        {blocks.map((block, i) => (
          <View
            key={block.id}
            style={[StyleSheet.absoluteFillObject, { opacity: i === blockIndex ? 1 : 0 }]}
            pointerEvents={i === blockIndex ? "auto" : "none"}
          >
            <PracticeBlockRenderer
              block={block}
              onAnswer={(correct) => handleAnswer(block, correct)}
              onContinue={goToNextBlock}
            />
          </View>
        ))}
      </View>
    </View>
  );
}

function emptyDescription(mode: Props["route"]["params"]["mode"]): string {
  if (mode.mode === "type") {
    const type = EXERCISE_TYPE_BY_KEY[mode.blockType];
    return `Todavía no tenés ejercicios de "${type.title}" para practicar — hacé alguna lección primero.`;
  }
  if (mode.mode === "sign") {
    return "No encontramos ejercicios para esta seña todavía.";
  }
  return "No tenés errores pendientes por repasar. ¡Seguí así!";
}

interface PracticeBlockRendererProps {
  block: LessonContentBlock;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

function PracticeBlockRenderer({ block, onAnswer, onContinue }: PracticeBlockRendererProps) {
  const xp = block.xpReward ?? 0;

  switch (block.type as BlockType) {
    case "SELECT_MEANING":
      return (
        <SelectMeaningBlock config={parseBlockConfig<"SELECT_MEANING">(block)} xp={xp} onAnswer={onAnswer} onContinue={onContinue} />
      );
    case "SELECT_SIGN":
      return (
        <SelectSignBlock config={parseBlockConfig<"SELECT_SIGN">(block)} xp={xp} onAnswer={onAnswer} onContinue={onContinue} />
      );
    case "CONTEXT_RESPONSE":
      return (
        <ContextResponseBlock
          config={parseBlockConfig<"CONTEXT_RESPONSE">(block)}
          xp={xp}
          onAnswer={onAnswer}
          onContinue={onContinue}
        />
      );
    case "MATCH":
      return <MatchBlock config={parseBlockConfig<"MATCH">(block)} xp={xp} onAnswer={onAnswer} onContinue={onContinue} />;
    case "VISUAL_RECOGNITION":
      return (
        <VisualRecognitionBlock
          config={parseBlockConfig<"VISUAL_RECOGNITION">(block)}
          xp={xp}
          onAnswer={onAnswer}
          onContinue={onContinue}
        />
      );
    case "INFO":
      // The backend never includes INFO blocks in a practice session — not evaluable.
      return <InfoBlock config={parseBlockConfig<"INFO">(block)} onContinue={onContinue} />;
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centerFill: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 24 },
  blockArea: { flex: 1 },
  emptyFooter: { paddingHorizontal: 20, paddingBottom: 20 },
  errorTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  errorDetail: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
});
