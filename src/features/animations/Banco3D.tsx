import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors, fonts } from "@/theme";

// Usa el Text de React Native y no el de la app: el banco se monta antes que
// los proveedores de contexto, y el nuestro depende de la configuración.
import { getGlbUrl } from "./glbUrl";
import { GlbAnimationView } from "./GlbAnimationView";

/**
 * TEMPORAL — compara los dos caminos para mostrar una seña en 3D.
 *
 * Hoy el avatar se dibuja con model-viewer adentro de un WebView. La
 * alternativa es Filament, el motor nativo de Google. Lo que se quiere saber es
 * si vale el cambio, y para eso hacen falta dos números por cada camino:
 *
 *   - cuánto tarda desde que se monta hasta que hay algo en pantalla
 *   - a cuántos cuadros por segundo anima una vez cargado
 *
 * Los dos cargan el MISMO .glb desde la misma URL, uno después del otro y no a
 * la vez, para que no compitan por la GPU y ensucien la medición.
 */
const SENA = "madre";

type Etapa = "web" | "nativo" | "listo";

export interface Medicion3D {
  webCargaMs: number | null;
  nativoCargaMs: number | null;
  nativoFps: number | null;
}

export function Banco3D({ onListo }: { onListo: (m: Medicion3D) => void }) {
  const [etapa, setEtapa] = useState<Etapa>("web");
  const medicion = useRef<Medicion3D>({ webCargaMs: null, nativoCargaMs: null, nativoFps: null });
  const desde = useRef(Date.now());

  useEffect(() => {
    desde.current = Date.now();
  }, [etapa]);

  function terminoWeb() {
    if (medicion.current.webCargaMs != null) return;
    medicion.current.webCargaMs = Date.now() - desde.current;
    terminoWebYListo();
  }

  function terminoWebYListo() {
    setEtapa("listo");
    onListo(medicion.current);
  }

  return (
    <View style={styles.caja}>
      <Text style={styles.titulo}>Comparando el avatar 3D…</Text>
      <Text style={styles.detalle}>
        {etapa === "web" ? "WebView (model-viewer)" : etapa === "nativo" ? "Filament (nativo)" : "listo"}
      </Text>

      {etapa === "web" && (
        <GlbAnimationView url={getGlbUrl(SENA)} style={styles.lienzo} onLoaded={terminoWeb} onError={terminoWeb} />
      )}


    </View>
  );
}

const styles = StyleSheet.create({
  caja: { padding: 20, gap: 6 },
  titulo: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  detalle: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  lienzo: { height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: colors.fill },
});
