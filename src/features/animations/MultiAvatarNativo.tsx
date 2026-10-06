import React, { useState } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";

import { colors } from "@/theme";
import { AvatarNativo, hayNativo } from "../../../modules/signa-vision";
import { MultiGlbView } from "./MultiGlbView";
import { getGlbUrlOficial } from "./glbUrl";

export interface MultiAvatarNativoProps {
  /** Un `.glb` por seña, en orden. Vacío = ese lugar queda en blanco. */
  urls: string[];
  /** Cuál se muestra, en el modo apilado. */
  activeIndex: number;
  paused?: boolean;
  /** "stack" muestra una por vez; "rows" las muestra todas, una por fila. */
  layout?: "stack" | "rows";
  rowHeight?: number;
  rowGap?: number;
  style?: ViewStyle;
  label?: string;
  onError?: (mensaje: string) => void;
}

/**
 * Varias señas con el motor nativo, en lugar de un WebView con varios visores.
 *
 * El WebView que reemplaza armaba una página con un `<model-viewer>` por seña y
 * las alineaba con las filas de palabras. Funcionaba, pero levantaba un
 * navegador entero y bajaba su runtime de un CDN para mostrar cuatro avatares
 * quietos.
 *
 * Apilado sólo se dibuja el que se está mirando: el WebView los tenía todos
 * cargados aunque se viera uno.
 */
export function MultiAvatarNativo({
  urls,
  activeIndex,
  paused = false,
  layout = "stack",
  rowHeight = 96,
  rowGap = 10,
  style,
  onError,
}: MultiAvatarNativoProps) {
  // Sin modulo nativo (iOS) se vuelve al render por WebView con <model-viewer>.
  if (!hayNativo) {
    return (
      <MultiGlbView
        urls={urls}
        activeIndex={activeIndex}
        paused={paused}
        layout={layout}
        rowHeight={rowHeight}
        rowGap={rowGap}
        style={style}
      />
    );
  }

  const [falló, setFalló] = useState(false);

  if (falló) return <View style={style} />;

  function avatar(url: string, alto: number | "todo", key: string, enPausa: boolean) {
    const caja: ViewStyle =
      alto === "todo" ? { flex: 1, backgroundColor: colors.fill } : { height: alto, backgroundColor: colors.fill };
    if (!url) return <View key={key} style={caja} />;
    return (
      <AvatarNativo
        key={key}
        style={caja}
        url={url}
        urlRespaldo={getGlbUrlOficial(url.split("/").pop()?.replace(/\.glb$/, "") ?? "")}
        pausado={enPausa}
        rotable={false}
        onFalla={(e) => {
          setFalló(true);
          onError?.(e.nativeEvent.error);
        }}
      />
    );
  }

  if (layout === "rows") {
    return (
      <View style={[styles.filas, { gap: rowGap }, style]} pointerEvents="none">
        {urls.map((url, i) => avatar(url, rowHeight, `${i}-${url}`, paused))}
      </View>
    );
  }

  // Apilado: el WebView ocupaba todo el alto que le daba el padre, así que
  // acá pasa lo mismo y sólo se dibuja la seña que se está mirando.
  const url = urls[activeIndex] ?? "";
  return (
    <View style={[styles.completo, style]} pointerEvents="none">
      {avatar(url, "todo", `activo-${activeIndex}`, paused)}
    </View>
  );
}

const styles = StyleSheet.create({
  filas: { flexDirection: "column" },
  completo: { flex: 1 },
});
