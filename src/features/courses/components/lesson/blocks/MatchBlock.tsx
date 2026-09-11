import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { MatchConfig } from "@/features/courses/lessonContent.types";
import { MultiGlbView } from "@/features/animations/MultiGlbView";
import { getGlbUrl } from "@/features/animations/glbUrl";
import { XpChip } from "../XpChip";
import { LessonButton } from "../LessonButton";
import Check from "@assets/ilus/check.svg";
import Denied from "@assets/ilus/denied.svg";

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

/** Shared by both columns so the WebView rows line up with the RN word tiles. */
const ROW_HEIGHT = 96;
const ROW_GAP = 10;

export function MatchBlock({ config, xp, onAnswer, onContinue }: MatchBlockProps) {
  const signOrder = useMemo(() => shuffled(config.concepts), [config.concepts]);
  const wordOrder = useMemo(() => shuffled(config.concepts), [config.concepts]);

  const signUrls = useMemo(() => signOrder.map(getGlbUrl), [signOrder]);
  const [modelsFailed, setModelsFailed] = useState(false);

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ kind: Kind; concept: string } | null>(null);
  const [wrongPair, setWrongPair] = useState<{ sign: string; word: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const total = config.concepts.length;
  const done = matched.size === total;
  const columnHeight = total * ROW_HEIGHT + (total - 1) * ROW_GAP;

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

  function StateIcon({ state }: { state: ReturnType<typeof tileState> }) {
    if (state !== "matched" && state !== "wrong") return null;
    const Icon = state === "matched" ? Check : Denied;
    return <Icon width={18} height={18} />;
  }

  /**
   * A sign row is a transparent hit area laid over its slice of the models WebView;
   * only the border and the state tint are painted, so the avatar stays visible.
   */
  function SignRow({ concept, index }: { concept: string; index: number }) {
    const state = tileState("sign", concept);
    return (
      <TouchableOpacity
        onPress={() => handleTap("sign", concept)}
        disabled={state === "matched"}
        activeOpacity={0.85}
        style={[
          styles.signRow,
          { top: index * (ROW_HEIGHT + ROW_GAP) },
          state === "matched" && styles.signRowMatched,
          state === "wrong" && styles.signRowWrong,
          state === "selected" && styles.signRowSelected,
        ]}
      >
        <StateIcon state={state} />
      </TouchableOpacity>
    );
  }

  function WordTile({ concept }: { concept: string }) {
    const state = tileState("word", concept);
    return (
      <TouchableOpacity
        onPress={() => handleTap("word", concept)}
        disabled={state === "matched"}
        activeOpacity={0.85}
        style={[
          styles.tile,
          state === "matched" && styles.tileMatched,
          state === "wrong" && styles.tileWrong,
          state === "selected" && styles.tileSelected,
        ]}
      >
        <Text
          style={[
            styles.wordText,
            state === "matched" && { color: colors.successDark },
            state === "wrong" && { color: colors.danger },
          ]}
        >
          {concept}
        </Text>
        <StateIcon state={state} />
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
          <View style={[styles.column, { height: columnHeight }]}>
            {!modelsFailed && (
              <MultiGlbView
                urls={signUrls}
                activeIndex={0}
                layout="rows"
                rowHeight={ROW_HEIGHT}
                rowGap={ROW_GAP}
                paused={done}
                style={styles.models}
                onError={() => setModelsFailed(true)}
              />
            )}
            {signOrder.map((concept, i) => (
              <SignRow key={concept} concept={concept} index={i} />
            ))}
          </View>
          <View style={styles.column}>
            {wordOrder.map((concept) => (
              <WordTile key={concept} concept={concept} />
            ))}
          </View>
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
  grid: { flexDirection: "row", gap: ROW_GAP },
  column: { flex: 1, gap: ROW_GAP },
  models: { ...StyleSheet.absoluteFillObject, borderRadius: 16, overflow: "hidden" },
  tile: {
    height: ROW_HEIGHT,
    borderRadius: 16,
    borderWidth: 0,
    backgroundColor: colors.fill,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  signRow: {
    position: "absolute",
    left: 0,
    right: 0,
    height: ROW_HEIGHT,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-end",
    padding: 8,
  },
  // Translucent tints: a solid state background would hide the avatar underneath.
  signRowMatched: { backgroundColor: "rgba(220,239,224,0.72)", borderColor: colors.success },
  signRowWrong: { backgroundColor: "rgba(246,207,195,0.55)", borderWidth: 2, borderColor: colors.danger },
  signRowSelected: { borderWidth: 2, borderColor: colors.primary },
  tileMatched: { backgroundColor: colors.successLight, opacity: 0.6 },
  tileWrong: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  tileSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  wordText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  footer: { padding: 20, paddingTop: 16, alignItems: "center" },
  footerHint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: "#B0A7A0" },
});
