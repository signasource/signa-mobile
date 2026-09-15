import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Animated, StyleSheet, TouchableOpacity, View } from "react-native";

import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import type { LiveFrame } from "@/features/ml/components/LiveSignRecognizer";

/**
 * Piezas comunes a los dos ejercicios de cámara.
 *
 * El de señas dinámicas y el de deletreo comparten el mismo trackeo, el mismo
 * badge de estado, el mismo interruptor del esqueleto y la misma tarjeta de
 * acierto. Viven acá para que no se dupliquen ni se separen con el tiempo: lo
 * único que cambia entre ejercicios es qué modelo decide.
 */

export type Estado = "esperando" | "sin-cuerpo" | "sin-manos" | "reconociendo" | "quieto";

/** El estado que corresponde a un frame del reconocedor. */
export function estadoDeFrame(f: LiveFrame): Estado {
  if (!f.body) return "sin-cuerpo";
  // Sin manos no hay seña posible, y es un problema distinto de que el modelo
  // no acierte: conviene decirlo con todas las letras.
  if (f.hands === 0) return "sin-manos";
  if (f.progress < 1) return "esperando";
  return f.resting ? "quieto" : "reconociendo";
}

function texto(e: Estado, pedido: string): string {
  switch (e) {
    case "sin-cuerpo":
      return "No te vemos · alejate un poco";
    case "sin-manos":
      return "No vemos tus manos";
    case "esperando":
      return "Preparando…";
    case "quieto":
      return `Listo · hacé ${pedido}`;
    case "reconociendo":
      return "Reconociendo…";
  }
}

function color(e: Estado): string {
  switch (e) {
    case "sin-cuerpo":
    case "sin-manos":
      return colors.danger;
    case "esperando":
    case "quieto":
      return colors.textMuted;
    case "reconociendo":
      return colors.success;
  }
}

interface BadgeProps {
  estado: Estado;
  /** Cómo nombrar lo que se pide: "la seña", "la letra A". */
  pedido: string;
  fps?: number;
  /** Confianza de lo pedido y qué está viendo el modelo, para poder depurar. */
  confianza?: number;
  visto?: { nombre: string; p: number } | null;
  ms?: number;
  delegado?: string;
}

/**
 * Estado del reconocimiento, y detrás de un toque, por qué.
 *
 * Los fps, la confianza, qué seña ve y los ms de inferencia son para quien
 * desarrolla: al alumno le ocupaban media pantalla con números que no puede
 * usar. Quedan a un toque de distancia, que es lo que hace falta para
 * entender por qué una seña no entra.
 */
export function BadgeEstado({ estado, pedido, fps, confianza, visto, ms, delegado }: BadgeProps) {
  const [detalle, setDetalle] = useState(false);
  return (
    <TouchableOpacity
      style={styles.badge}
      onPress={() => setDetalle((v) => !v)}
      activeOpacity={0.9}
      hitSlop={8}
    >
      <View style={[styles.dot, { backgroundColor: color(estado) }]} />
      <Text style={styles.badgeText}>
        {texto(estado, pedido)}
        {detalle && fps ? ` · ${fps} fps` : ""}
        {detalle && confianza ? ` · ${Math.round(confianza * 100)}%` : ""}
        {detalle && visto ? ` · ve ${visto.nombre} ${Math.round(visto.p * 100)}%` : ""}
        {detalle && ms ? ` · ${ms} ms` : ""}
        {detalle && delegado ? ` · ${delegado}` : ""}
      </Text>
    </TouchableOpacity>
  );
}

/** Interruptor del esqueleto, en la esquina superior derecha como en la demo. */
export function ToggleTrackeo({ activo, onPress }: { activo: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.toggle, activo && styles.toggleOn]}
      onPress={onPress}
      activeOpacity={0.8}
      hitSlop={8}
    >
      <Ionicons
        name={activo ? "body" : "body-outline"}
        size={17}
        color={activo ? colors.onPrimary : colors.text}
      />
    </TouchableOpacity>
  );
}

interface AciertoProps {
  /** Lo que se muestra en el recuadro: una letra, o el tilde si no se pasa. */
  sigla?: string;
  titulo: string;
  detalle: string;
  /** Animación de entrada, compartida con la demo web. */
  pop: Animated.Value;
}

export function TarjetaAcierto({ sigla, titulo, detalle, pop }: AciertoProps) {
  return (
    <Animated.View
      style={[
        styles.card,
        {
          opacity: pop,
          transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] }) }],
        },
      ]}
      pointerEvents="none"
    >
      <View style={styles.cardIcon}>
        {sigla ? (
          <Text style={styles.cardSigla}>{sigla}</Text>
        ) : (
          <Ionicons name="checkmark" size={18} color={colors.successDark} />
        )}
      </View>
      <View style={styles.cardTexts}>
        <Text style={styles.cardTitle}>{titulo}</Text>
        <Text style={styles.cardDetail}>{detalle}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 99,
    paddingVertical: 6,
    paddingHorizontal: 11,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  badgeText: { fontFamily: fonts.bodySemiBold, fontSize: 11.5, color: colors.text },
  toggle: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.94)",
  },
  toggleOn: { backgroundColor: colors.primary },

  // Dentro del viewport y pegada abajo, como `.result-card` en la demo.
  card: {
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
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: colors.successLight,
    alignItems: "center",
    justifyContent: "center",
  },
  cardSigla: { fontFamily: fonts.displayBold, fontSize: 20, color: colors.successDark },
  cardTexts: { flex: 1, minWidth: 0, gap: 2 },
  cardTitle: { fontFamily: fonts.displaySemiBold, fontSize: 15.5, color: colors.successDark },
  cardDetail: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted },
});
