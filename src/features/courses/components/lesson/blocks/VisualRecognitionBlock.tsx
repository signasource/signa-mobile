import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { VisualRecognitionConfig } from "@/features/courses/lessonContent.types";
import { SignPlaceholder } from "../SignPlaceholder";
import { MultiGlbView } from "@/features/animations/MultiGlbView";
import { getGlbUrl } from "@/features/animations/glbUrl";
import { XpChip } from "../XpChip";
import { FeedbackBar } from "../FeedbackBar";
import { LessonButton } from "../LessonButton";

interface VisualRecognitionBlockProps {
  config: VisualRecognitionConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

/** How long each sign of the sequence stays on screen. */
const SIGN_DURATION_MS = 2600;
const SEQUENCE_HEIGHT = 250;

export function VisualRecognitionBlock({ config, xp, onAnswer, onContinue }: VisualRecognitionBlockProps) {
  const total = config.sign_sequence.length;
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [wrongOption, setWrongOption] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const done = marked.size === total;

  // The sequence plays one sign at a time inside a single WebView; `seqIndex`
  // advances on a timer and `replayKey` restarts it from the first sign.
  const seqUrls = useMemo(() => config.sign_sequence.map(getGlbUrl), [config.sign_sequence]);
  const [seqIndex, setSeqIndex] = useState(0);
  const [replayKey, setReplayKey] = useState(0);
  const [seqFailed, setSeqFailed] = useState(false);
  const playing = seqIndex < total - 1;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setSeqIndex((i) => i + 1), SIGN_DURATION_MS);
    return () => clearTimeout(id);
  }, [seqIndex, playing, replayKey]);

  function replay() {
    setSeqIndex(0);
    setReplayKey((k) => k + 1);
  }

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

        {seqFailed ? (
          <SignPlaceholder label={`secuencia · ${total} señas`} height={SEQUENCE_HEIGHT} />
        ) : (
          <View style={styles.sequence}>
            <MultiGlbView
              key={replayKey}
              urls={seqUrls}
              activeIndex={seqIndex}
              onError={() => setSeqFailed(true)}
            />
            <View style={styles.sequenceBadge}>
              <Text style={styles.sequenceBadgeText}>
                Seña {seqIndex + 1} de {total}
              </Text>
            </View>
            {!playing && (
              <TouchableOpacity onPress={replay} style={styles.replayButton} activeOpacity={0.85}>
                <Ionicons name="refresh" size={15} color={colors.text} />
                <Text style={styles.replayText}>Repetir</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

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
  sequence: {
    height: SEQUENCE_HEIGHT,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fill,
    overflow: "hidden",
  },
  sequenceBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  sequenceBadgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.textMuted },
  replayButton: {
    position: "absolute",
    bottom: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 999,
    paddingVertical: 7,
    paddingHorizontal: 13,
  },
  replayText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.text },
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
