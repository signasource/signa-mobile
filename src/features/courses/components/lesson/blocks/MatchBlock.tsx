import React, { useEffect, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";
import { MatchConfig } from "@/features/courses/lessonContent.types";
import { XpChip } from "../XpChip";
import { LessonButton } from "../LessonButton";
import { SignAnimation } from "../SignAnimation";
import Check from "@assets/ilus/check.svg";
import Denied from "@assets/ilus/denied.svg";

type TileState = "idle" | "selected" | "wrong" | "matched";

function StateIcon({ state }: { state: TileState }) {
  if (state !== "matched" && state !== "wrong") return null;
  const Icon = state === "matched" ? Check : Denied;
  return <Icon width={18} height={18} />;
}

interface MatchSignCellProps {
  concept: string;
  state: TileState;
  paused?: boolean;
  onSelect: () => void;
  onLongPress: () => void;
}

function MatchSignCell({ concept, state, paused, onSelect, onLongPress }: MatchSignCellProps) {
  return (
    <TouchableOpacity
      onPress={onSelect}
      onLongPress={onLongPress}
      delayLongPress={400}
      disabled={state === "matched"}
      activeOpacity={0.85}
      style={styles.signCellTouch}
    >
      <SignAnimation
        meaning={concept}
        label={concept}
        fillParent
        paused={paused}
        hideControls
        style={[
          styles.signCellAnim,
          state === "selected" && styles.signCellSelected,
          state === "wrong" && styles.signCellWrong,
          state === "matched" && styles.signCellMatched,
        ]}
      />
      {(state === "matched" || state === "wrong") && (
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.signCellOverlay,
            state === "matched" && styles.signCellOverlayMatched,
            state === "wrong" && styles.signCellOverlayWrong,
          ]}
        >
          <StateIcon state={state} />
        </View>
      )}
    </TouchableOpacity>
  );
}

interface MatchWordTileProps {
  concept: string;
  state: TileState;
  onSelect: () => void;
}

function MatchWordTile({ concept, state, onSelect }: MatchWordTileProps) {
  return (
    <TouchableOpacity
      onPress={onSelect}
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

/** Shared by both columns so sign cells line up with word tiles. */
const ROW_HEIGHT = 96;
const ROW_GAP = 16;

/**
 * Cuántos pares se juegan de una.
 *
 * El contenido trae entre cinco y siete conceptos por bloque —los días de la
 * semana son siete— y todos juntos dejaban las señas pegadas una a la otra, sin
 * aire para distinguir dónde termina una y empieza la siguiente. Con cinco
 * entran holgados en cualquier teléfono.
 */
const MAX_PARES = 4;

export function MatchBlock({ config, xp, onAnswer, onContinue }: MatchBlockProps) {
  const clave = config.concepts.join("|");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const conceptos = useMemo(() => shuffled(config.concepts).slice(0, MAX_PARES), [clave]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const signOrder = useMemo(() => shuffled(conceptos), [clave]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const wordOrder = useMemo(() => shuffled(conceptos), [clave]);

  const insets = useSafeAreaInsets();

  const [matched, setMatched] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<{ kind: Kind; concept: string } | null>(null);
  const [wrongPair, setWrongPair] = useState<{ sign: string; word: string } | null>(null);
  const [signModal, setSignModal] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const total = conceptos.length;
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

  function tileState(kind: Kind, concept: string): TileState {
    if (matched.has(concept)) return "matched";
    if (wrongPair && ((kind === "sign" && wrongPair.sign === concept) || (kind === "word" && wrongPair.word === concept))) {
      return "wrong";
    }
    if (selected?.kind === kind && selected.concept === concept) return "selected";
    return "idle";
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.bodyHeader}>
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

          <Text style={styles.hint}>Tocá una seña y luego su palabra. Mantené presionada una seña para verla más grande. El par correcto se apaga; si no coinciden, perdés una vida.</Text>
        </View>

        <View style={styles.grid}>
          <View style={styles.column}>
            {signOrder.map((concept) => (
              <MatchSignCell
                key={concept}
                concept={concept}
                state={tileState("sign", concept)}
                paused={done}
                onSelect={() => {
                  if (matched.has(concept) || wrongPair) return;
                  handleTap("sign", concept);
                }}
                onLongPress={() => {
                  if (matched.has(concept) || wrongPair) return;
                  setSignModal(concept);
                }}
              />
            ))}
          </View>
          <View style={styles.column}>
            {wordOrder.map((concept) => (
              <MatchWordTile
                key={concept}
                concept={concept}
                state={tileState("word", concept)}
                onSelect={() => handleTap("word", concept)}
              />
            ))}
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        {done ? (
          <LessonButton label="Continuar" onPress={onContinue} />
        ) : (
          <Text style={styles.footerHint}>
            {total - matched.size === 1 ? "Falta 1 par" : `Faltan ${total - matched.size} pares`}
          </Text>
        )}
      </View>

      <Modal
        visible={signModal !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSignModal(null)}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setSignModal(null)}>
          <Pressable
            style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalGrabber} />
            {signModal !== null && (
              <>
                <SignAnimation
                  meaning={signModal}
                  label={signModal}
                  height={280}
                />
                <TouchableOpacity
                  style={styles.modalSelectBtn}
                  onPress={() => {
                    const concept = signModal;
                    setSignModal(null);
                    handleTap("sign", concept);
                  }}
                >
                  <Text style={styles.modalSelectLabel}>Seleccionar esta seña</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setSignModal(null)}>
                  <Text style={styles.modalCancelLabel}>Cerrar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22, paddingBottom: 8, gap: 14 },
  bodyHeader: { gap: 14 },
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
  grid: { flex: 1, flexDirection: "row", gap: ROW_GAP },
  column: { flex: 1, gap: ROW_GAP },
  signCellTouch: { flex: 1 },
  tile: {
    flex: 1,
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
  tileMatched: { backgroundColor: colors.successLight, opacity: 0.6 },
  tileWrong: { backgroundColor: colors.dangerLight, borderColor: colors.danger },
  tileSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: colors.primaryLight },
  wordText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  // Sign cells — cada seña tiene su propio renderer independiente, así un fallo
  // en una no apaga las demás.
  signCellAnim: { borderRadius: 16, borderWidth: 1, borderColor: colors.border },
  signCellSelected: { borderWidth: 2, borderColor: colors.primary },
  signCellWrong: { borderWidth: 2, borderColor: colors.danger },
  signCellMatched: { borderColor: colors.success },
  signCellOverlay: { borderRadius: 16, alignItems: "flex-end", padding: 8, overflow: "hidden" },
  signCellOverlayMatched: { backgroundColor: alpha(colors.matchSuccessTint, 0.72) },
  signCellOverlayWrong: { backgroundColor: alpha(colors.matchDangerTint, 0.55) },
  footer: { paddingHorizontal: 20, paddingVertical: 16 },
  footerHint: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textFaint, textAlign: "center" },
  // Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: alpha(colors.text, 0.55),
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 12,
  },
  modalGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
  },
  modalSelectBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  modalSelectLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
  },
  modalCancelBtn: {
    height: 48,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
});
