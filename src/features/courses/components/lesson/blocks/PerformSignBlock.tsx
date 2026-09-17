import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, StyleSheet, View } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { PerformSignConfig } from "@/features/courses/lessonContent.types";
import { LiveSignRecognizer, LiveFrame } from "@/features/ml/components/LiveSignRecognizer";
import { signMeaning } from "@/features/ml";
// TEMPORAL: rama de diagnóstico, ver src/features/ml/telemetria.ts
import { cerrarMedicion, marcar, medir } from "@/features/ml/telemetria";
import { SignPip } from "../SignPip";
import {
  BadgeEstado,
  Estado,
  estadoDeFrame,
  TarjetaAcierto,
  ToggleTrackeo,
} from "../recognizer/EstadoCamara";
import { XpChip } from "../XpChip";
import { FeedbackBar } from "../FeedbackBar";
import { LessonButton } from "../LessonButton";

interface PerformSignBlockProps {
  config: PerformSignConfig;
  /** ¿Está en pantalla? El player monta el bloque siguiente oculto. */
  active: boolean;
  /** Último bloque de la lección: al completarlo se va directo al resumen. */
  ultimo: boolean;
  xp: number;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

/**
 * El alumno HACE las señas frente a la cámara y el modelo las reconoce en vivo.
 *
 * Misma estructura que la demo `signa-ml/demo/static/nombre.html`: la cámara
 * ocupa la pantalla, el modelo 3D de la seña pedida va en un picture-in-picture
 * que se arrastra y se agranda al tocarlo, y abajo hay un casillero por seña
 * que se va completando.
 *
 * El reconocimiento es continuo y ocurre entero dentro del teléfono (ver
 * `@/features/ml`): no hay botón de grabar ni nada que viaje a un servidor.
 */
/** Cuánto queda a la vista la tarjeta de una seña acertada, como en la demo. */
const FESTEJO_MS = 1300;

export function PerformSignBlock({ config, active, ultimo, xp, onAnswer, onContinue }: PerformSignBlockProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const signs = useMemo(
    () => config.signs.map((s) => s.trim().toLowerCase()).filter(Boolean),
    [config.signs],
  );

  const [doneCount, setDoneCount] = useState(0);
  const [estado, setEstado] = useState<Estado>("esperando");
  const [ultima, setUltima] = useState<{ sign: string; ok: boolean } | null>(null);
  // Cada seña que entra tiene su propia tarjeta, que se va sola: igual que en
  // la demo web y que en el ejercicio de deletreo. Antes sólo había una al
  // final, y las señas del medio pasaban sin que se notara.
  const [festejo, setFestejo] = useState<string | null>(null);
  const [pipBig, setPipBig] = useState(false);
  const [fps, setFps] = useState(0);
  const [delegado, setDelegado] = useState("");
  const [ms, setMs] = useState(0);
  const [conf, setConf] = useState(0);
  // Qué seña gana entre todas. No decide nada: está para poder distinguir
  // "no te ve" de "te ve haciendo otra cosa" cuando una seña no entra.
  const [visto, setVisto] = useState<{ sign: string; p: number } | null>(null);
  // Aparición de la tarjeta de resultado: el mismo "pop" que usa la demo web.
  const pop = useRef(new Animated.Value(0)).current;
  const [verTrackeo, setVerTrackeo] = useState(true);
  const [rendido, setRendido] = useState(false);
  const answered = useRef(false);

  const target = signs[doneCount] ?? null;
  // Al terminar ya no hay "próxima seña", pero el avatar no debe desaparecer:
  // se queda mostrando la última, en pausa, como en el resto de los ejercicios.
  const enPantalla = target ?? signs[signs.length - 1] ?? null;
  const completo = doneCount >= signs.length;
  const terminado = completo || rendido;
  // Entre la última seña y la pantalla de lección completada pasa el festejo.
  // Durante ese rato el ejercicio NO cambia de forma: si el botón de abajo
  // desapareciera, la cámara se estiraría sola un segundo antes de irse.
  const saliendo = completo && ultimo;

  useEffect(() => {
    if (!festejo) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
    const t = setTimeout(() => setFestejo(null), FESTEJO_MS);
    return () => clearTimeout(t);
  }, [festejo, pop]);

  // Última seña del último bloque: la tarjeta de fin no tiene nada que anunciar
  // que la pantalla de lección completada no diga mejor, y el botón "Continuar"
  // queda como un trámite. Se espera a que el festejo de la seña se vea y se
  // pasa solo.
  useEffect(() => {
    if (!completo || !ultimo) return;
    const t = setTimeout(onContinue, FESTEJO_MS);
    return () => clearTimeout(t);
  }, [completo, ultimo, onContinue]);

  // La tarjeta entra con un pop cada vez que el ejercicio cierra. Cuando se
  // sale solo no hay tarjeta de cierre —la de la última seña ocupa ese lugar—
  // así que reiniciar el pop acá sólo le cortaría la entrada.
  useEffect(() => {
    if (!terminado || saliendo) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
  }, [terminado, pop]);

  // TEMPORAL: marca entrada y salida del ejercicio para poder separar sesiones.
  useEffect(() => {
    marcar("entra", { modo: "dinamico" });
    return cerrarMedicion;
  }, []);

  const handleFrame = useCallback((f: LiveFrame) => {
    setFps(f.fps);
    setMs(f.inferMs);
    setConf(f.targetConfidence);
    setVisto(f.sign && !f.resting ? { sign: f.sign, p: f.confidence } : null);
    setEstado(estadoDeFrame(f));
    medir({
      modo: "dinamico", fps: f.fps, poseMs: f.poseMs, handsMs: f.handsMs, inferMs: f.inferMs,
      drawFps: f.drawFps, drawMs: f.drawMs, delegado: f.delegado,
      body: f.body, hands: f.hands, resting: f.resting, progress: f.progress,
      sign: f.sign, confidence: f.confidence, targetConfidence: f.targetConfidence,
    });
  }, []);

  const handleConfirmed = useCallback(
    (sign: string) => {
      setDoneCount((prev) => {
        const esperada = signs[prev];
        if (!esperada) return prev;
        if (sign !== esperada) {
          // Reconoció otra cosa: se avisa pero no penaliza. El modelo puede
          // confundirse y trabar el ejercicio sería peor que dejar reintentar.
          setUltima({ sign, ok: false });
          return prev;
        }
        setUltima({ sign, ok: true });
        setFestejo(sign);
        const next = prev + 1;
        if (next >= signs.length && !answered.current) {
          answered.current = true;
          onAnswer(true);
        }
        return next;
      });
    },
    [signs, onAnswer],
  );

  function rendirse() {
    if (!answered.current) {
      answered.current = true;
      onAnswer(false);
    }
    setRendido(true);
  }

  if (!permission?.granted) {
    return (
      <View style={styles.container}>
        <View style={styles.permission}>
          <View style={styles.permissionIcon}>
            <Ionicons name="camera-outline" size={34} color={colors.primary} />
          </View>
          <Text style={styles.permissionTitle}>Necesitamos la cámara</Text>
          <Text style={styles.permissionText}>
            Para practicar tenemos que verte haciendo la seña. El reconocimiento pasa entero
            dentro de tu teléfono: no se envía ni se guarda ningún video.
          </Text>
        </View>

        <View style={styles.footer}>
          <LessonButton label="Permitir cámara" icon="camera" onPress={requestPermission} />
          <LessonButton label="Saltear por ahora" variant="outline" onPress={onContinue} />
        </View>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <View style={styles.head}>
        <Text style={styles.question}>
          {completo ? (
            "¡Listo!"
          ) : (
            <>
              Hacé la seña de <Text style={styles.word}>{signMeaning(target ?? "")}</Text>
            </>
          )}
        </Text>
        <XpChip xp={xp} state={terminado ? (completo ? "correct" : "incorrect") : "idle"} />
      </View>

      <View style={styles.stage}>
        <LiveSignRecognizer
          targets={target ? [target] : signs}
          threshold={config.threshold}
          onFrame={handleFrame}
          onConfirmed={handleConfirmed}
          onReady={({ delegate }) => setDelegado(delegate)}
          showLandmarks={verTrackeo}
          active={active}
          paused={pipBig || terminado}
          style={styles.camera}
        />

        <BadgeEstado
          estado={estado}
          pedido="la seña"
          fps={fps}
          confianza={conf}
          visto={visto ? { nombre: signMeaning(visto.sign), p: visto.p } : null}
          ms={ms}
          delegado={delegado}
        />
        <ToggleTrackeo activo={verTrackeo} onPress={() => setVerTrackeo((v) => !v)} />

        {festejo && (
          <TarjetaAcierto
            titulo="¡Correcto!"
            detalle={`Reconocimos ${signMeaning(festejo)}.`}
            pop={pop}
          />
        )}

        {terminado && !saliendo && (
          <Animated.View
            style={[
              styles.resultCard,
              {
                opacity: pop,
                transform: [
                  { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) },
                ],
              },
            ]}
            pointerEvents="none"
          >
            <View style={[styles.resultIcon, !completo && styles.resultIconBad]}>
              <Ionicons
                name={completo ? "checkmark" : "close"}
                size={18}
                color={completo ? colors.successDark : colors.danger}
              />
            </View>
            <View style={styles.resultTexts}>
              <Text style={[styles.resultTitle, !completo && { color: colors.danger }]}>
                {completo ? "¡Muy bien!" : "Seguimos después"}
              </Text>
              <Text style={styles.resultDetail}>
                {completo
                  ? `Reconocimos ${signs.length === 1 ? "la seña" : `las ${signs.length} señas`} que hiciste.`
                  : "Podés volver a intentarlo cuando quieras."}
              </Text>
            </View>
          </Animated.View>
        )}

        {enPantalla && (
          <SignPip
            meaning={signMeaning(enPantalla)}
            label={signMeaning(enPantalla)}
            paused={!pipBig}
            onExpandedChange={setPipBig}
          />
        )}
      </View>

      <View style={styles.slots}>
        {signs.map((sign, i) => {
          const hecho = i < doneCount;
          const actual = i === doneCount && !terminado;
          return (
            <View
              key={`${sign}-${i}`}
              style={[styles.slot, hecho && styles.slotDone, actual && styles.slotActive]}
            >
              {/* Como en la demo: la casilla se pinta de verde y el nombre se
                  queda. Un tilde tapando la seña dice menos que verla lograda. */}
              <Text
                style={[
                  styles.slotText,
                  actual && styles.slotTextActive,
                  hecho && styles.slotTextDone,
                ]}
              >
                {signMeaning(sign)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.footer}>
        {(!terminado || saliendo) && (
          <>
            {ultima && !ultima.ok && !saliendo && (
              <Text style={styles.miss}>Vimos «{signMeaning(ultima.sign)}». Probá de nuevo.</Text>
            )}
            <LessonButton
              label="No me sale, seguir"
              variant="outline"
              disabled={saliendo}
              onPress={rendirse}
            />
          </>
        )}

        {terminado && !saliendo && <LessonButton label="Continuar" onPress={onContinue} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 14,
  },
  question: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayBold,
    fontSize: 22,
    letterSpacing: -0.6,
    color: colors.text,
  },
  word: { color: colors.primary },
  stage: {
    flex: 1,
    marginHorizontal: 20,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: colors.fillDark,
  },
  camera: { flex: 1 },
  // Dentro del viewport y pegada abajo, como `.result-card` en la demo.
  resultCard: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: "#241A16",
    shadowOpacity: 0.16,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  resultIcon: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  resultIconBad: { backgroundColor: colors.dangerLight },
  resultTexts: { flex: 1, minWidth: 0, gap: 2 },
  resultTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15.5, color: colors.successDark },
  resultDetail: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted },
  slots: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  slot: {
    minWidth: 64,
    height: 40,
    borderRadius: 14,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  slotDone: { backgroundColor: colors.successLight, borderColor: colors.success },
  slotActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary, borderWidth: 2 },
  slotText: { fontFamily: fonts.bodySemiBold, fontSize: 13.5, color: colors.textMuted },
  slotTextActive: { color: colors.primaryDark },
  slotTextDone: { color: colors.successDark },
  footer: { padding: 20, paddingTop: 14, gap: 12 },
  miss: {
    textAlign: "center",
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  permission: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 34,
  },
  permissionIcon: {
    width: 70,
    height: 70,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  permissionText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
  },
});
