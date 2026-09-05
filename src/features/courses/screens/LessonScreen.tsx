import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { lessonsApi } from "@/api/lessons";
import { learningApi } from "@/api/learning";
import { shopApi } from "@/api/shop";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { BlockType, LessonContent, LessonContentBlock, parseBlockConfig } from "@/features/courses/lessonContent.types";
import { LessonButton } from "@/features/courses/components/lesson/LessonButton";
import { LessonHeader } from "@/features/courses/components/lesson/LessonHeader";
import { NoLivesOverlay } from "@/features/courses/components/lesson/NoLivesOverlay";
import { LessonComplete } from "@/features/courses/components/lesson/LessonComplete";
import { InfoBlock } from "@/features/courses/components/lesson/blocks/InfoBlock";
import { SelectMeaningBlock } from "@/features/courses/components/lesson/blocks/SelectMeaningBlock";
import { SelectSignBlock } from "@/features/courses/components/lesson/blocks/SelectSignBlock";
import { ContextResponseBlock } from "@/features/courses/components/lesson/blocks/ContextResponseBlock";
import { MatchBlock } from "@/features/courses/components/lesson/blocks/MatchBlock";
import { VisualRecognitionBlock } from "@/features/courses/components/lesson/blocks/VisualRecognitionBlock";
import { IntroduceSignBlock } from "@/features/courses/components/lesson/blocks/IntroduceSignBlock";

type Props = NativeStackScreenProps<AppStackParamList, "Lesson">;

const STARTING_LIVES = 5;

export function LessonScreen({ route, navigation }: Props) {
  const { lessonId, unitLabel, signsCount } = route.params;
  const insets = useSafeAreaInsets();

  useActivityTracker();

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockIndex, setBlockIndex] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  const [unlimitedLives, setUnlimitedLives] = useState(false);
  const [awardedXp, setAwardedXp] = useState<Record<string, number>>({});
  const [correctBlockIds, setCorrectBlockIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);

  const loadLesson = useCallback(() => {
    if (!lessonId) {
      setError("Falta el identificador de la lección.");
      setLoading(false);
      return;
    }
    setError(null);
    setLoading(true);
    Promise.all([lessonsApi.getLesson(lessonId), shopApi.getMyInventory().catch(() => null)])
      .then(([lessonRes, inventoryRes]) => {
        setLesson(lessonRes.data);
        if (inventoryRes?.data) {
          setUnlimitedLives(inventoryRes.data.livesMode === "INFINITE");
          setLives(inventoryRes.data.currentLives ?? STARTING_LIVES);
        }
      })
      .catch((err: any) => setError(err?.response?.data?.message ?? "No pudimos cargar la lección."))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  function resetProgress() {
    setBlockIndex(0);
    setAwardedXp({});
    setCorrectBlockIds(new Set());
    setCompleted(false);
  }

  function recordInteraction(block: LessonContentBlock, isCorrect: boolean | null) {
    learningApi.recordBlockInteraction(block.id, isCorrect).catch(() => {});
  }

  function handleAnswer(block: LessonContentBlock, correct: boolean) {
    recordInteraction(block, correct);

    if (correct) {
      setCorrectBlockIds((prev) => new Set(prev).add(block.id));
      setAwardedXp((prev) =>
        prev[block.id] !== undefined ? prev : { ...prev, [block.id]: block.xpReward ?? 0 }
      );
    } else if (!unlimitedLives) {
      setLives((prev) => Math.max(0, prev - 1));
    }
  }

  function goToNextBlock() {
    if (!lesson) return;
    if (blockIndex + 1 >= lesson.blocks.length) {
      setCompleted(true);
    } else {
      setBlockIndex((prev) => prev + 1);
    }
  }

  function handleInfoContinue(block: LessonContentBlock) {
    if (awardedXp[block.id] === undefined) {
      recordInteraction(block, null);
      setAwardedXp((prev) => ({ ...prev, [block.id]: block.xpReward ?? 0 }));
    }
    goToNextBlock();
  }

  // Sorted once per lesson load; stable identity avoids downstream re-renders.
  const blocks = useMemo(
    () => (lesson ? [...lesson.blocks].sort((a, b) => a.order - b.order) : []),
    [lesson]
  );

  if (loading) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top }]}>
        <Text style={styles.errorTitle}>No pudimos cargar la lección</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <LessonButton label="Reintentar" onPress={loadLesson} />
      </View>
    );
  }

  const noLives = lives <= 0 && !unlimitedLives && !completed;

  if (completed) {
    const xpEarned = Object.values(awardedXp).reduce((sum, v) => sum + v, 0);
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12 }]}>
        <LessonComplete
          lessonName={lesson.name}
          unitLabel={unitLabel ?? lesson.name}
          xpEarned={xpEarned}
          correctBlocks={correctBlockIds.size}
          totalBlocks={blocks.length}
          signsLearned={signsCount ?? 0}
          onClose={() => navigation.goBack()}
          onRestart={resetProgress}
        />
      </View>
    );
  }

  const progress = blocks.length > 0 ? blockIndex / blocks.length : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10 }]}>
      <LessonHeader
        unitLabel={unitLabel ?? lesson.name}
        lessonName={lesson.name}
        progress={progress}
        lives={lives}
        unlimitedLives={unlimitedLives}
        onBack={() => navigation.goBack()}
      />

      {/*
       * Only the current block and the next one are mounted (each block's WebView
       * can hold several concurrent 3D models). Mounting every block in the lesson
       * at once used to pile up WebGL contexts until Android OOM-killed the app
       * with no JS error — see docs/features/courses.md.
       */}
      <View style={styles.blockArea}>
        {blocks.map((block, i) => {
          if (i < blockIndex || i > blockIndex + 1) return null;
          return (
            <View
              key={block.id}
              style={[StyleSheet.absoluteFillObject, { opacity: i === blockIndex ? 1 : 0 }]}
              pointerEvents={i === blockIndex ? "auto" : "none"}
            >
              <BlockRenderer
                block={block}
                onAnswer={(correct) => handleAnswer(block, correct)}
                onContinue={block.type === "INFO" ? () => handleInfoContinue(block) : goToNextBlock}
              />
            </View>
          );
        })}
      </View>

      {noLives && (
        <NoLivesOverlay
          onGoToStore={() => navigation.navigate("Tabs", { screen: "Store" })}
          onExit={() => navigation.goBack()}
        />
      )}
    </View>
  );
}

interface BlockRendererProps {
  block: LessonContentBlock;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

function BlockRenderer({ block, onAnswer, onContinue }: BlockRendererProps) {
  const xp = block.xpReward ?? 0;

  switch (block.type as BlockType) {
    case "INFO":
      return <InfoBlock config={parseBlockConfig<"INFO">(block)} onContinue={onContinue} />;
    case "INTRODUCE_SIGN":
      return <IntroduceSignBlock config={parseBlockConfig<"INTRODUCE_SIGN">(block)} onContinue={onContinue} />;
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
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  blockArea: { flex: 1 },
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 30,
    backgroundColor: colors.background,
  },
  errorTitle: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 18,
    color: colors.text,
    textAlign: "center",
  },
  errorDetail: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
  },
});
