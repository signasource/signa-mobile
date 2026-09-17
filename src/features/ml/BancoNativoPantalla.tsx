import React, { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useCameraPermissions } from "expo-camera";

import { colors, fonts } from "@/theme";
import { FrameNativo, ReconocedorNativo } from "../../../modules/signa-vision";

/**
 * TEMPORAL — etapa 1 de la migración a nativo.
 *
 * Muestra la cámara y el esqueleto dibujados enteramente del lado nativo, para
 * poder comparar contra la versión en WebView con las dos cosas que importan:
 * el número y la sensación. Las medianas que informa se comparan contra lo
 * medido en este mismo teléfono con la versión actual:
 *
 *     estático   manos  57 ms · pose 41 ms · 10 fps
 *     dinámico   manos 147 ms · pose 92 ms ·  6 fps
 *
 * Usa el Text de React Native y no el de la app: esto se monta antes que los
 * proveedores de contexto.
 */
export function BancoNativoPantalla({ onSeguir }: { onSeguir: () => void }) {
  const [permiso, pedirPermiso] = useCameraPermissions();
  const [ultimo, setUltimo] = useState<FrameNativo | null>(null);
  const [estado, setEstado] = useState("arrancando…");
  const muestras = useRef<FrameNativo[]>([]);

  useEffect(() => {
    if (permiso && !permiso.granted) void pedirPermiso();
  }, [permiso, pedirPermiso]);

  function alFrame(e: { nativeEvent: FrameNativo }) {
    muestras.current.push(e.nativeEvent);
    setUltimo(e.nativeEvent);
  }

  function seguir() {
    const m = muestras.current;
    const mediana = (campo: keyof FrameNativo) => {
      const v = m.map((x) => Number(x[campo]) || 0).sort((a, b) => a - b);
      return v.length ? v[Math.floor(v.length / 2)] : 0;
    };
    const destino = process.env.EXPO_PUBLIC_METRICS_URL;
    if (destino && m.length) {
      void fetch(destino, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion: "nativo-etapa1",
          evento: "reconocedor-nativo",
          muestras: [
            {
              t: Date.now(),
              avisos: m.length,
              fps: mediana("fps"),
              manosMs: mediana("manosMs"),
              poseMs: mediana("poseMs"),
            },
          ],
        }),
      }).catch(() => {});
    }
    onSeguir();
  }

  if (!permiso?.granted) {
    return (
      <View style={styles.centro}>
        <Text style={styles.titulo}>Necesitamos la cámara</Text>
        <Pressable style={styles.boton} onPress={() => void pedirPermiso()}>
          <Text style={styles.botonTexto}>Permitir</Text>
        </Pressable>
        <Pressable onPress={onSeguir}>
          <Text style={styles.saltar}>Saltar</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.pantalla}>
      <ReconocedorNativo
        style={styles.camara}
        activo
        mostrarEsqueleto
        usarTrasera={process.env.EXPO_PUBLIC_CAMARA_TRASERA === "1"}
        alFrame={alFrame}
        alListo={(e) => {
          const n = e.nativeEvent;
          setEstado(
            n.fase === "error"
              ? `falló · ${n.error ?? ""}`
              : n.fase === "cuadros"
                ? `cámara entregando ${n.detalle ?? ""}`
                : "detectando",
          );
        }}
      />

      <View style={styles.tarjeta}>
        <Text style={styles.titulo}>Reconocimiento nativo · {estado}</Text>
        <Text style={styles.dato}>
          {ultimo
            ? `${ultimo.fps.toFixed(1)} fps · manos ${ultimo.manosMs.toFixed(0)} ms · pose ${ultimo.poseMs.toFixed(0)} ms · ${ultimo.manos} manos`
            : "esperando el primer cuadro…"}
        </Text>
        <Text style={styles.referencia}>
          En WebView, este teléfono: manos 57-147 ms · 6-10 fps
        </Text>
        <Pressable style={styles.boton} onPress={seguir}>
          <Text style={styles.botonTexto}>Seguir a la app</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pantalla: { flex: 1, backgroundColor: "#000" },
  camara: { ...StyleSheet.absoluteFillObject },
  centro: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14, padding: 24 },
  tarjeta: {
    position: "absolute", left: 14, right: 14, bottom: 28,
    backgroundColor: "rgba(255,255,255,0.95)", borderRadius: 18, padding: 16, gap: 8,
  },
  titulo: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.text },
  dato: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  referencia: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted },
  boton: {
    backgroundColor: colors.text, borderRadius: 99, paddingVertical: 12, alignItems: "center",
  },
  botonTexto: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onPrimary },
  saltar: { fontFamily: fonts.bodyRegular, fontSize: 14, color: colors.textMuted },
});
