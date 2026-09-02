import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { MatchConfig } from "@/features/courses/lessonContent.types";
import { XpChip } from "../XpChip";
import { LessonButton } from "../LessonButton";

interface MatchBlockProps {
  config: MatchConfig;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

function shuffled<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

type Kind = "sign" | "word";

export function MatchBlock({ config, xp, onAnswer, onContinue }: MatchBlockProps) {
  const signOrder = useMemo(() => shuffled(config.concepts), [config.concepts]);
  const wordOrder = useMemo(() => shuffled(config.concepts), [config.concepts]);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ kind: Kind; concept: string } | null>(null);
  const [wrongPair, setWrongPair] = useState<{ sign: string; word: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const total = config.concepts.length;
  const done = matched.size === total;

  function handleTap(kind: Kind, concept: string) {
    if (matched.has(concept) || wrongPair) return;

    if (!selected) {
      setSelected({ kind, concept });
      return;
    }

    if (selected.kind === kind) {
      setSelected({ kind, concept });
      return;
    }

    const signConcept = kind === "sign" ? concept : selected.concept;
    const wordConcept = kind === "word" ? concept : selected.concept;

    if (signConcept === wordConcept) {
      setMatched((prev) => new Set(prev).add(signConcept));
      setSelected(null);
      onAnswer(true);
    } else {
      setWrongPair({ sign: signConcept, word: wordConcept });
      onAnswer(false);
      timer.current = setTimeout(() => {
        setWrongPair(null);
        setSelected(null);
      }, 650);
    }
  }

  function tileState(kind: Kind, concept: string) {
    if (matched.has(concept)) return "matched" as const;
    if (wrongPair && ((kind === "sign" && wrongPair.sign === concept) || (kind === "word" && wrongPair.word === concept))) {
      return "wrong" as const;
    }
    if (selected?.kind === kind && selected.concept === concept) return "selected" as const;
    return "idle" as const;
  }

  function Tile({ kind, concept }: { kind: Kind; concept: string }) {
    const state = tileState(kind, concept);
    return (
      <TouchableOpacity
        onPress={() => handleTap(kind, concept)}
        disabled={state === "matched"}
        activeOpacity={0.85}
        style={[
          styles.tile,
          kind === "sign" && styles.signTile,
          state === "matched" && styles.tileMatched,
          state === "wrong" && styles.tileWrong,
          state === "selected" && styles.tileSelected,
        ]}
      >
        {kind === "sign" && (
          <View
            style={[
              styles.signSwatch,
              state === "matched" && styles.signSwatchMatched,
              state === "wrong" && styles.signSwatchWrong,
              state === "selected" && styles.signSwatchSelected,
            ]}
          />
        )}
        {kind === "word" && (
          <Text
            style={[
              styles.wordText,
              state === "matched" && { color: colors.successDark },
              state === "wrong" && { color: colors.danger },
            ]}
          >
            {concept}
          </Text>
        )}
        {(state === "matched" || state === "wrong") && (
          <Ionicons
            name={state === "matched" ? "checkmark-circle" : "close-circle"}
            size={18}
            color={state === "matched" ? colors.successDark : colors.danger}
          />
        )}
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.headerRow}>
          <Text style={styles.question}>Uní cada seña con su palabra</Text>
          <XpChip xp={xp} state={done ? "correct" : "idle"} />
        </View>

        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${(matched.size / total) * 100}%` }]} />
          </View>
          <Text style={styles.progressLabel}>
            {matched.size} de {total} pares
          </Text>
        </View>

        <Text style={styles.hint}>Tocá una seña y luego su palabra. El par correcto se apaga; si no coinciden, perdés una vida.</Text>

        <View style={styles.grid}>
          {signOrder.map((concept, i) => (
            <React.Fragment key={`row-${i}`}>
              <Tile kind="sign" concept={concept} />
              <Tile kind="word" concept={wordOrder[i]} />
            </React.Fragment>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        {done ? <LessonButton label="Continuar" onPress={onContinue} /> : <Text style={styles.footerHint}>Faltan {total - matched.size} pares</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 10 },
  question: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
    color: colors.text,
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressTrack: { flex: 1, height: 6, borderRadius: 99, backgroundColor: colors.fill, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: colors.primary, borderRadius: 99 },
  progressLabel: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textMuted, flexShrink: 0 },
  hint: { fontFamily: fonts.bodyRegular, fontSize: 13, lineHeight: 18, color: colors.textMuted },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tile: {
    flexBasis: "47%",
    flexGrow: 1,
    minHeight: 62,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signTile: { justifyContent: "flex-start" },
  tileMatched: { backgroundColor: colors.successLight, opacity: 0.6 },
  tileWrong: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  tileSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  signSwatch: { width: 46, height: 46, borderRadius: 11, backgroundColor: colors.fill, flexShrink: 0 },
  signSwatchMatched: { backgroundColor: "#DCEFE0" },
  signSwatchWrong: { backgroundColor: "#F6CFC3" },
  signSwatchSelected: { backgroundColor: colors.primaryMedallion },
  wordText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  footer: { padding: 20, paddingTop: 16, alignItems: "center" },
  footerHint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: "#B0A7A0" },
});
