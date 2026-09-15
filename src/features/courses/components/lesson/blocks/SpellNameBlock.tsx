import { Ionicons } from "@expo/vector-icons";
import { useCameraPermissions } from "expo-camera";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, TextInput, View } from "react-native";

import { Text } from "@/components/Text";
import { LiveSignRecognizer } from "@/features/ml";
import { colors, fonts } from "@/theme";
import { LessonButton } from "../LessonButton";
import { SignPip } from "../SignPip";
import {
  BadgeEstado,
  Estado,
  TarjetaAcierto,
  ToggleTrackeo,
  estadoDeFrame,
} from "../recognizer/EstadoCamara";
import { XpChip } from "../XpChip";
import type { LiveFrame } from "@/features/ml/components/LiveSignRecognizer";
import type { SpellNameConfig } from "@/features/courses/lessonContent.types";

interface Props {
  config: SpellNameConfig;
  active: boolean;
  xp: number;
  /** Último bloque de la lección: al completarlo se va directo al resumen. */
  ultimo: boolean;
  onAnswer: (correct: boolean) => void;
  onContinue: () => void;
}

/** Cuánto queda a la vista la tarjeta de una letra acertada, como en la demo. */
const FESTEJO_MS = 1300;

/** Sólo letras que el modelo conoce, en mayúscula. */
function limpiar(texto: string, tope: number): string {
  return texto.toUpperCase().replace(/[^A-ZÑ]/g, "").slice(0, tope);
}

/**
 * Deletrear el propio nombre con el alfabeto dactilológico.
 *
 * Portado de `signa-ml/demo/static/nombre.html`: primero se escribe el nombre
 * —con la cámara apagada— y después se deletrea letra por letra. Cada letra que
 * entra muestra su propia tarjeta, que se va sola y deja lugar a la siguiente.
 *
 * Usa el mismo reconocedor que el ejercicio de señas —mismo trackeo de cuerpo y
 * manos, mismo esqueleto, mismo PiP con el modelo 3D— con `modo="estatico"`:
 * ahí adentro decide el modelo del abecedario, que mira el frame actual en vez
 * de una ventana de 2,5 s.
 */
export function SpellNameBlock({ config, active, ultimo, xp, onAnswer, onContinue }: Props) {
  const tope = config.max_letters ?? 12;
  const [permission, requestPermission] = useCameraPermissions();
  const [nombre, setNombre] = useState("");
  const [empezado, setEmpezado] = useState(false);
  const [hechas, setHechas] = useState(0);
  const [festejo, setFestejo] = useState<string | null>(null);
  const [pipBig, setPipBig] = useState(false);
  const [estado, setEstado] = useState<Estado>("esperando");
  const [visto, setVisto] = useState<{ nombre: string; p: number } | null>(null);
  const [conf, setConf] = useState(0);
  const [fps, setFps] = useState(0);
  const [delegado, setDelegado] = useState("");
  const [verTrackeo, setVerTrackeo] = useState(true);
  const [rendido, setRendido] = useState(false);
  const answered = useRef(false);
  const pop = useRef(new Animated.Value(0)).current;

  const letras = nombre.split("");
  const objetivo = letras[hechas] ?? null;
  const completo = empezado && letras.length > 0 && hechas >= letras.length;
  const terminado = completo || rendido;
  // Ver PerformSignBlock: mientras se festeja la última letra el ejercicio
  // tiene que seguir midiendo lo mismo, o la pantalla salta antes de irse.
  const saliendo = completo && ultimo;
  // Al terminar el avatar no desaparece: se queda con la última letra.
  const enPantalla = objetivo ?? letras[letras.length - 1] ?? null;

  // Última letra del último bloque: la pantalla de lección completada dice
  // todo lo que diría el botón "Continuar". Se espera el festejo de la letra y
  // se pasa solo.
  useEffect(() => {
    if (!completo || !ultimo) return;
    const t = setTimeout(onContinue, FESTEJO_MS);
    return () => clearTimeout(t);
  }, [completo, ultimo, onContinue]);

  useEffect(() => {
    if (terminado && !answered.current) {
      answered.current = true;
      onAnswer(completo);
    }
  }, [terminado, completo, onAnswer]);

  // La tarjeta entra con un pop y se retira sola, igual que en la demo.
  useEffect(() => {
    if (!festejo) return;
    pop.setValue(0);
    Animated.spring(pop, { toValue: 1, useNativeDriver: true, friction: 6, tension: 90 }).start();
    const t = setTimeout(() => setFestejo(null), FESTEJO_MS);
    return () => clearTimeout(t);
  }, [festejo, pop]);

  const handleConfirmed = useCallback(
    (letra: string) => {
      setHechas((prev) => {
        if (letras[prev] !== letra) return prev;
        setFestejo(letra);
        return prev + 1;
      });
    },
    [letras],
  );

  const handleFrame = useCallback((f: LiveFrame) => {
    setEstado(estadoDeFrame(f));
    setFps(f.fps);
    setConf(f.targetConfidence);
    setVisto(f.sign && !f.resting ? { nombre: f.sign, p: f.confidence } : null);
  }, []);

  if (!empezado) {
    return (
      <View style={styles.setup}>
        <View style={styles.setupHead}>
          <Text style={styles.setupTitulo}>¿Cómo te llamás?</Text>
          <XpChip xp={xp} state="idle" />
        </View>
        <Text style={styles.setupTexto}>
          Vas a deletrearlo letra por letra con el alfabeto de la LSA. La cámara reconoce cada una.
        </Text>

        <View style={styles.campo}>
          <Text style={styles.campoEtiqueta}>TU NOMBRE</Text>
          <TextInput
            style={styles.campoInput}
            value={nombre}
            onChangeText={(t) => setNombre(limpiar(t, tope))}
            placeholder="NOMBRE"
            placeholderTextColor="#D6CCC4"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={tope}
          />
        </View>

        <View style={styles.espaciador} />

        <View style={[styles.footer, styles.footerNombre]}>
          <LessonButton
            label="Empezar a deletrear"
            disabled={nombre.length === 0}
            onPress={() => setEmpezado(true)}
          />
        </View>
      </View>
    );
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
            Para deletrear tenemos que verte las manos. El reconocimiento pasa entero dentro de tu
            teléfono: no se envía ni se guarda ningún video.
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
      <View style={styles.header}>
        <Text style={styles.titulo}>
          {terminado ? (
            completo ? `¡Deletreaste ${nombre}!` : "Seguimos en otra"
          ) : (
            <>
              Hacé la letra <Text style={styles.letraPedida}>{objetivo}</Text>
            </>
          )}
        </Text>
        <XpChip xp={xp} state={terminado ? (completo ? "correct" : "incorrect") : "idle"} />
      </View>

      <View style={styles.stage}>
        <LiveSignRecognizer
          targets={objetivo ? [objetivo] : []}
          modo="estatico"
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
          pedido={objetivo ? `la letra ${objetivo}` : "la letra"}
          fps={fps}
          confianza={conf}
          visto={visto}
          delegado={delegado}
        />
        <ToggleTrackeo activo={verTrackeo} onPress={() => setVerTrackeo((v) => !v)} />

        {enPantalla && (
          <SignPip
            meaning={enPantalla}
            label={enPantalla}
            paused={terminado}
            onExpandedChange={setPipBig}
          />
        )}

        {festejo && (
          <TarjetaAcierto
            sigla={festejo}
            titulo="¡Correcto!"
            detalle={`Letra ${festejo} sumada a ${nombre}.`}
            pop={pop}
          />
        )}
      </View>

      <View style={styles.slots}>
        {letras.map((l, i) => (
          <View key={`${l}-${i}`} style={[styles.slot, i < hechas && styles.slotHecho]}>
            <Text style={[styles.slotTexto, i < hechas && styles.slotTextoHecho]}>{l}</Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        {terminado && !saliendo ? (
          <LessonButton label="Continuar" onPress={onContinue} />
        ) : (
          <LessonButton
            label="No me sale, seguir"
            variant="outline"
            disabled={saliendo}
            onPress={() => setRendido(true)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // ── Pantalla de setup, calcada de la demo ──────────────────────────────
  setup: { flex: 1, paddingHorizontal: 22, paddingTop: 22 },
  setupHead: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  setupTitulo: {
    flex: 1,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.1,
    color: colors.text,
    marginBottom: 5,
  },
  setupTexto: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    marginBottom: 25,
  },
  campo: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingTop: 14,
    paddingHorizontal: 20,
    paddingBottom: 22,
    gap: 12,
  },
  campoEtiqueta: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10.5,
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  campoInput: {
    padding: 0,
    fontFamily: fonts.displayBold,
    fontSize: 32,
    letterSpacing: 1.5,
    color: colors.text,
  },
  // Empuja el botón al fondo, como el .spacer de la demo. El aire lo pone el
  // padding del footer y no un tope acá: con un maxHeight el botón quedaba
  // colgado en el medio de la pantalla en cualquier teléfono alto.
  espaciador: { flex: 1, minHeight: 28 },
  footerNombre: { paddingBottom: 40 },

  // ── Pantalla de práctica ───────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  titulo: { flex: 1, fontFamily: fonts.displayBold, fontSize: 22, color: colors.text },
  letraPedida: { color: colors.primary },
  stage: { flex: 1, marginTop: 14, marginHorizontal: 20, borderRadius: 20, overflow: "hidden" },
  camera: { flex: 1 },

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
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  resultLetra: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.successDark },
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
    minWidth: 38,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
  },
  slotHecho: { borderColor: colors.success, backgroundColor: colors.successLight },
  slotTexto: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  slotTextoHecho: { color: colors.success },

  footer: { paddingHorizontal: 20, paddingVertical: 16, gap: 10 },
  permission: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 20 },
  permissionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primaryLight,
  },
  permissionTitle: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.text },
  permissionText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
});
