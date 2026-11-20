import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { lessonsApi } from "@/api/lessons";
import { learningApi } from "@/api/learning";
import { shopApi } from "@/api/shop";
import { boostersApi } from "@/api/boosters";
import { usersApi } from "@/api/users";
import { serverNow } from "@/utils/serverClock";
import { useLives, LivesSource, LIFE_REGEN_MS } from "@/features/lives/useLives";
import { useActivityTracker } from "@/hooks/useActivityTracker";
import { trackLessonTime } from "@/telemetry/telemetry";
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
import { SpellNameBlock } from "../components/lesson/blocks/SpellNameBlock";
import { PerformSignBlock } from "../components/lesson/blocks/PerformSignBlock";
import { IntroduceSignBlock } from "@/features/courses/components/lesson/blocks/IntroduceSignBlock";

type Props = NativeStackScreenProps<AppStackParamList, "Lesson">;

/** Tope de espera al salir: pasado esto se vuelve igual. */
const ESPERA_MAX_SALIDA = 2500;

/** Bloques informativos: nunca llaman a `onAnswer`, así que no entran en "Aciertos". */
const NON_GRADED_BLOCKS: ReadonlySet<BlockType> = new Set<BlockType>(["INFO", "INTRODUCE_SIGN"]);

/** Ejercicios de cámara: se pueden omitir, y omitirlos deja la lección incompleta. */
const CAMERA_BLOCKS: ReadonlySet<BlockType> = new Set<BlockType>(["PERFORM_SIGN", "SPELL_NAME"]);

/**
 * Tipos que el reproductor sabe mostrar (un `Record` para que agregar un tipo a
 * `BlockType` obligue a decidir acá). El backend también manda bloques que no
 * son para el usuario, como INVISIBLE_SIGNS (solo puebla el catálogo de señas):
 * renderizaban `null` y dejaban un paso en blanco sin botón para seguir. Se
 * descartan al cargar; el backend no los exige para completar la lección.
 */
const RENDERABLE_BLOCKS: Record<BlockType, true> = {
  INFO: true,
  INTRODUCE_SIGN: true,
  SELECT_MEANING: true,
  SELECT_SIGN: true,
  CONTEXT_RESPONSE: true,
  MATCH: true,
  VISUAL_RECOGNITION: true,
  PERFORM_SIGN: true,
  SPELL_NAME: true,
};

function isRenderable(block: LessonContentBlock): boolean {
  return Object.prototype.hasOwnProperty.call(RENDERABLE_BLOCKS, block.type);
}

const STARTING_LIVES = 5;

const REINTENTOS = 3;
const ESPERA_REINTENTO_MS = 700;

/**
 * Manda una respuesta y la reintenta ante un fallo de red o un 5xx: perderla en silencio
 * dejaba al usuario sin el XP de ese bloque (el fin de la lección decía una cifra y el
 * perfil otra). Un 4xx no se reintenta, no se arregla repitiéndolo. Nunca lanza.
 */
async function enviarConReintentos(blockId: string, isCorrect: boolean | null): Promise<void> {
  for (let intento = 1; intento <= REINTENTOS; intento++) {
    try {
      await learningApi.recordBlockInteraction(blockId, isCorrect);
      return;
    } catch (err: any) {
      const status: number | undefined = err?.response?.status;
      if (status !== undefined && status < 500 && status !== 429) return;
      if (intento === REINTENTOS) return;
      await new Promise((listo) => setTimeout(listo, ESPERA_REINTENTO_MS * intento));
    }
  }
}

export function LessonScreen({ route, navigation }: Props) {
  const { lessonId, unitLabel, signsCount, suggestedCourse } = route.params;
  const insets = useSafeAreaInsets();

  useActivityTracker();

  const [lesson, setLesson] = useState<LessonContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [blockIndex, setBlockIndex] = useState(0);
  const [livesSource, setLivesSource] = useState<LivesSource | null>(null);
  const livesState = useLives(livesSource);
  // Until the inventory loads (or if it fails) play with a full bar, as the backend would.
  const lives = livesState.ready ? livesState.lives : STARTING_LIVES;
  const unlimitedLives = livesState.unlimited;
  const [gems, setGems] = useState<number | undefined>(undefined);
  const [storedInfiniteLives, setStoredInfiniteLives] = useState(0);
  const [activatingInfinite, setActivatingInfinite] = useState(false);
  const [correctBlockIds, setCorrectBlockIds] = useState<Set<string>>(new Set());
  const [completed, setCompleted] = useState(false);
  // Cola de respuestas: cada POST espera al anterior (el último eslabón de la cadena).
  const cola = useRef<Promise<unknown>>(Promise.resolve());
  // Bloques informativos ya reportados, para que un doble toque en "Continuar" no los duplique.
  const infoReportados = useRef<Set<string>>(new Set());
  // When the lesson opened, to report time-on-lesson once (null after it's been sent).
  const startRef = useRef<number | null>(null);
  // `UserStats.totalXp` before the lesson: the XP shown at the end is the backend's delta.
  const xpBaseline = useRef<number | null>(null);
  const [serverXp, setServerXp] = useState<number | null>(null);
  const [xpPending, setXpPending] = useState(false);

  const loadLesson = useCallback(() => {
    if (!lessonId) {
      setError("Falta el identificador de la lección.");
      setLoading(false);
      return;
    }
    setError(null);

    setLoading(true);
    Promise.all([
      lessonsApi.getLesson(lessonId),
      shopApi.getMyInventory().catch(() => null),
      usersApi.getStats().catch(() => null),
      boostersApi.getStored().catch(() => null),
    ])
      .then(([lessonRes, inventoryRes, statsRes, boostersRes]) => {
        setLesson(lessonRes.data);
        startRef.current = Date.now();
        xpBaseline.current = statsRes?.data.totalXp ?? null;
        if (inventoryRes?.data) {
          setLivesSource(inventoryRes.data);
          setGems(inventoryRes.data.gems);
        }
        if (boostersRes?.data) {
          setStoredInfiniteLives(boostersRes.data.unlimitedLives);
        }
      })
      .catch((err: any) => setError(err?.response?.data?.message ?? "No pudimos cargar la lección."))
      .finally(() => setLoading(false));
  }, [lessonId]);

  useEffect(() => {
    loadLesson();
  }, [loadLesson]);

  useEffect(() => {
    return navigation.addListener("beforeRemove", (e) => {
      // Sin interacciones enviadas: salida limpia, nada que drenar ni confirmar.
      if (blockIndex === 0) return;

      e.preventDefault();

      const noLives = lives <= 0 && !unlimitedLives;

      async function drainAndDispatch() {
        await Promise.race([
          cola.current,
          new Promise<void>((r) => setTimeout(r, ESPERA_MAX_SALIDA)),
        ]);
        navigation.dispatch(e.data.action);
      }

      // Sin vidas o lección completa: solo drenar la cola y salir, sin confirmar.
      if (noLives || completed) {
        drainAndDispatch();
        return;
      }

      Alert.alert(
        "¿Salir de la lección?",
        "Se perderá el progreso de esta sesión.",
        [
          { text: "Continuar lección", style: "cancel" },
          { text: "Salir", style: "destructive", onPress: drainAndDispatch },
        ]
      );
    });
  }, [navigation, blockIndex, completed, lives, unlimitedLives]);

  function resetProgress() {
    setBlockIndex(0);
    setCorrectBlockIds(new Set());
    setCompleted(false);
    setServerXp(null);
    setXpPending(false);
    infoReportados.current = new Set();
  }

  /**
   * The XP the backend actually granted, not the sum of `block.xpReward`: it applies the
   * active multiplier and grants nothing for blocks already earned (a replay), so the local
   * sum disagreed with the XP the Profile showed. Waits for the answer queue to drain first;
   * if the stats can't be read, the local estimate stays.
   */
  function confirmServerXp() {
    const base = xpBaseline.current;
    if (base == null) return;
    setXpPending(true);
    cola.current
      .then(() => usersApi.getStats())
      .then((res) => {
        setServerXp(Math.max(0, res.data.totalXp - base));
        xpBaseline.current = res.data.totalXp;
      })
      .catch(() => {})
      .finally(() => setXpPending(false));
  }

  /**
   * Las respuestas se mandan en serie, no en paralelo: dos POST del mismo usuario
   * a la vez (respuestas rápidas, doble toque) hacían que signa-api intentara
   * crear dos veces el progreso de la lección y fallara con 500. El servidor ya
   * lo serializa; acá además no lo ponemos a competir contra sí mismo. El orden
   * se conserva y el juego no espera a la red (no se hace `await` al responder).
   */
  function recordInteraction(block: LessonContentBlock, isCorrect: boolean | null) {
    cola.current = cola.current.then(() => enviarConReintentos(block.id, isCorrect));
  }

  /**
   * Volver al camino recién cuando el backend tenga la última respuesta.
   *
   * Cuando hay progreso activo, `beforeRemove` muestra primero un diálogo de
   * confirmación y hace el drain de la cola antes de despachar la acción. En los
   * demás casos (bloque 0, lección completa, sin vidas) se sale directamente.
   */
  function volver() {
    navigation.goBack();
  }

  /** Mirrors `UserStats.loseLife`: one less, and the regeneration timer starts if it was not running. */
  function loseLifeLocally() {
    const nextMs = livesState.nextLifeSecs != null ? livesState.nextLifeSecs * 1000 : LIFE_REGEN_MS;
    setLivesSource((prev) => ({
      livesMode: "LIMITED",
      unlimitedLivesExpiresAt: prev?.unlimitedLivesExpiresAt ?? null,
      currentLives: Math.max(0, lives - 1),
      nextLifeAt: new Date(serverNow() + nextMs).toISOString(),
    }));
  }

  function handleAnswer(block: LessonContentBlock, correct: boolean) {
    recordInteraction(block, correct);

    if (correct) {
      setCorrectBlockIds((prev) => new Set(prev).add(block.id));
    } else if (!unlimitedLives) {
      loseLifeLocally();
    }
  }

  // Sorted once per lesson load; stable identity avoids downstream re-renders.
  const blocks = useMemo(
    () => (lesson ? lesson.blocks.filter(isRenderable).sort((a, b) => a.order - b.order) : []),
    [lesson]
  );

  function goToPrevBlock() {
    if (blockIndex <= 0) return;
    const prevBlock = blocks[blockIndex - 1];
    // Clear the previous block's state so the user can redo it; the backend
    // won't re-grant XP for a block already earned (see confirmServerXp comment).
    setCorrectBlockIds((prev) => {
      const next = new Set(prev);
      next.delete(prevBlock.id);
      return next;
    });
    infoReportados.current.delete(prevBlock.id);
    setBlockIndex((prev) => prev - 1);
  }

  function goToNextBlock() {
    if (!lesson) return;
    if (blockIndex + 1 >= blocks.length) {
      if (startRef.current != null) {
        trackLessonTime(Date.now() - startRef.current);
        startRef.current = null;
      }
      setCompleted(true);
      confirmServerXp();
    } else {
      setBlockIndex((prev) => prev + 1);
    }
  }

  function handleInfoContinue(block: LessonContentBlock) {
    if (!infoReportados.current.has(block.id)) {
      infoReportados.current.add(block.id);
      recordInteraction(block, null);
    }
    goToNextBlock();
  }

  if (loading) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (error || !lesson) {
    return (
      <View style={[styles.centerFill, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.errorTitle}>No pudimos cargar la lección</Text>
        <Text style={styles.errorDetail}>{error}</Text>
        <LessonButton label="Reintentar" onPress={loadLesson} />
      </View>
    );
  }

  const noLives = lives <= 0 && !unlimitedLives && !completed;

  if (completed) {
    // Only the backend's figure is shown (hidden while in flight or if it can't be read): a
    // local estimate used to promise XP the Profile then didn't have.
    const xpEarned = xpPending ? 0 : serverXp ?? 0;
    // Omitir un ejercicio de cámara no se reporta (el backend lo daría por hecho),
    // así que la lección no está completa si alguno no se acertó.
    const incomplete = blocks.some(
      (b) => CAMERA_BLOCKS.has(b.type as BlockType) && !correctBlockIds.has(b.id)
    );
    return (
      <View style={[styles.container, { paddingTop: insets.top + 12, paddingBottom: insets.bottom }]}>
        <LessonComplete
          lessonName={lesson.name}
          unitLabel={unitLabel ?? lesson.name}
          incomplete={incomplete}
          xpEarned={xpEarned}
          correctBlocks={correctBlockIds.size}
          totalBlocks={blocks.filter((b) => !NON_GRADED_BLOCKS.has(b.type as BlockType)).length}
          signsLearned={signsCount ?? 0}
          onClose={volver}
          onRestart={resetProgress}
          suggestion={
            suggestedCourse && !incomplete
              ? {
                  name: suggestedCourse.name,
                  onOpen: () => navigation.replace("CourseDetail", { courseId: suggestedCourse.id }),
                }
              : undefined
          }
        />
      </View>
    );
  }

  const progress = blocks.length > 0 ? blockIndex / blocks.length : 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 10, paddingBottom: insets.bottom }]}>
      <LessonHeader
        unitLabel={unitLabel ?? lesson.name}
        lessonName={lesson.name}
        progress={progress}
        livesState={livesState}
        onBack={blockIndex > 0 ? goToPrevBlock : volver}
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
              style={[StyleSheet.absoluteFill, { opacity: i === blockIndex ? 1 : 0 }]}
              pointerEvents={i === blockIndex ? "auto" : "none"}
            >
              <BlockRenderer
                block={block}
                // El bloque siguiente se monta invisible para que su WebView
                // esté tibio, pero no debe ACTUAR hasta estar en pantalla: sin
                // esto, el ejercicio de cámara encendía la cámara un bloque antes.
                active={i === blockIndex}
                ultimo={i === blocks.length - 1}
                unlimitedLives={unlimitedLives}
                onAnswer={(correct) => handleAnswer(block, correct)}
                onContinue={block.type === "INFO" ? () => handleInfoContinue(block) : goToNextBlock}
              />
            </View>
          );
        })}
      </View>

      {noLives && (
        <NoLivesOverlay
          onGoToStore={() => navigation.navigate("Tabs", { screen: "Store", params: { fromLesson: true } })}
          onExit={() => navigation.goBack()}
          gems={gems}
          livesState={livesState}
          onGetGems={() => navigation.navigate("GemShop", { fromLesson: true })}
          storedInfiniteLives={storedInfiniteLives}
          activatingInfinite={activatingInfinite}
          onActivateInfiniteLives={async () => {
            setActivatingInfinite(true);
            try {
              const { data } = await boostersApi.activate("UNLIMITED_LIVES");
              setLivesSource(data.inventory);
              setStoredInfiniteLives((q) => Math.max(0, q - 1));
            } catch {
              // Si falla no hacemos nada; el overlay sigue visible.
            } finally {
              setActivatingInfinite(false);
            }
          }}
        />
      )}
    </View>
  );
}

interface BlockRendererProps {
  block: LessonContentBlock;
  /** ¿Es el bloque que se está viendo? El siguiente está montado pero oculto. */
  active: boolean;
  /** Último de la lección: al terminarlo no hay bloque siguiente que mostrar. */
  ultimo: boolean;
  unlimitedLives: boolean;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

function BlockRenderer({ block, active, ultimo, unlimitedLives, onAnswer, onContinue }: BlockRendererProps) {
  const xp = block.xpReward ?? 0;

  switch (block.type as BlockType) {
    case "INFO":
      return <InfoBlock config={parseBlockConfig<"INFO">(block)} onContinue={onContinue} />;
    case "INTRODUCE_SIGN":
      return <IntroduceSignBlock config={parseBlockConfig<"INTRODUCE_SIGN">(block)} onContinue={onContinue} />;
    case "SELECT_MEANING":
      return (
        <SelectMeaningBlock config={parseBlockConfig<"SELECT_MEANING">(block)} xp={xp} unlimitedLives={unlimitedLives} onAnswer={onAnswer} onContinue={onContinue} />
      );
    case "SELECT_SIGN":
      return (
        <SelectSignBlock config={parseBlockConfig<"SELECT_SIGN">(block)} xp={xp} unlimitedLives={unlimitedLives} onAnswer={onAnswer} onContinue={onContinue} />
      );
    case "CONTEXT_RESPONSE":
      return (
        <ContextResponseBlock
          config={parseBlockConfig<"CONTEXT_RESPONSE">(block)}
          xp={xp}
          unlimitedLives={unlimitedLives}
          onAnswer={onAnswer}
          onContinue={onContinue}
        />
      );
    case "MATCH":
      return <MatchBlock config={parseBlockConfig<"MATCH">(block)} xp={xp} onAnswer={onAnswer} onContinue={onContinue} />;
    case "PERFORM_SIGN":
      return (
        <PerformSignBlock
          config={parseBlockConfig<"PERFORM_SIGN">(block)}
          active={active}
          ultimo={ultimo}
          xp={xp}
          onAnswer={onAnswer}
          onContinue={onContinue}
        />
      );
    case "SPELL_NAME":
      return (
        <SpellNameBlock
          config={parseBlockConfig<"SPELL_NAME">(block)}
          active={active}
          ultimo={ultimo}
          xp={xp}
          onAnswer={onAnswer}
          onContinue={onContinue}
        />
      );
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
