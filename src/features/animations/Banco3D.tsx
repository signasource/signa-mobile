import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { FilamentScene, FilamentView, Model, useModel } from "react-native-filament";

import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
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
    setEtapa("nativo");
  }

  function terminoNativo(cargaMs: number, fps: number) {
    medicion.current.nativoCargaMs = cargaMs;
    medicion.current.nativoFps = fps;
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

      {etapa === "nativo" && (
        <FilamentScene>
          <BancoNativo onListo={terminoNativo} />
        </FilamentScene>
      )}
    </View>
  );
}

/** El lado nativo: cuenta cuándo terminó de cargar y a cuántos fps dibuja. */
function BancoNativo({ onListo }: { onListo: (cargaMs: number, fps: number) => void }) {
  const desde = useRef(Date.now());
  const cargaMs = useRef<number | null>(null);
  const cuadros = useRef(0);
  const modelo = useModel({ uri: getGlbUrl(SENA) });

  useEffect(() => {
    if (modelo.state !== "loaded" || cargaMs.current != null) return;
    cargaMs.current = Date.now() - desde.current;
    // Se deja animando unos segundos y se cuentan los cuadros reales.
    const arranque = Date.now();
    cuadros.current = 0;
    const t = setTimeout(() => {
      const segundos = (Date.now() - arranque) / 1000;
      onListo(cargaMs.current ?? 0, cuadros.current / segundos);
    }, 4000);
    return () => clearTimeout(t);
  }, [modelo.state, onListo]);

  return (
    <FilamentView style={styles.lienzo} renderCallback={() => { cuadros.current += 1; }}>
      <Model source={{ uri: getGlbUrl(SENA) }} />
    </FilamentView>
  );
}

const styles = StyleSheet.create({
  caja: { padding: 20, gap: 6 },
  titulo: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  detalle: { fontFamily: fonts.bodyRegular, fontSize: 13, color: colors.textMuted },
  lienzo: { height: 220, borderRadius: 16, overflow: "hidden", backgroundColor: colors.fill },
});
