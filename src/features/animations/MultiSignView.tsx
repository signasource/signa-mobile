import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { colors } from "@/theme";
import { GlbLayout, MultiGlbView } from "./MultiGlbView";
import { SignVideoView } from "./SignVideoView";
import { useSignMediaList } from "./useSignMedia";

export interface MultiSignViewProps {
  /** Señas a mostrar, una por slot/opción. */
  meanings: string[];
  /** Índice del slot visible. Ignorado en layout `rows`. */
  activeIndex: number;
  paused?: boolean;
  /** `stack` (una a la vez) o `rows` (todas visibles). Default `stack`. */
  layout?: GlbLayout;
  /** `rows`: alto de cada fila, en dp. */
  rowHeight?: number;
  /** `rows`: espacio vertical entre filas, en dp. */
  rowGap?: number;
  style?: ViewStyle;
  onError?: (index: number) => void;
}

/**
 * Como `MultiGlbView`, pero cada seña puede ser animación 3D (`.glb`) o video
 * (`.mp4`). Resuelve el asset de cada slot contra R2 (`useSignMediaList`) y
 * reparte el render: las `.glb` van al único WebView de `MultiGlbView`, y las
 * `.mp4` se dibujan como reproductores nativos superpuestos en su slot — baratos,
 * sin contextos WebGL. Mientras resuelve, deja el fondo de la caja, igual que un
 * modelo que todavía no cargó.
 */
export function MultiSignView({
  meanings,
  activeIndex,
  paused = false,
  layout = "stack",
  rowHeight = 96,
  rowGap = 10,
  style,
  onError,
}: MultiSignViewProps) {
  const medias = useSignMediaList(meanings);
  const resolved = medias.length === meanings.length && medias.every((m) => m.kind !== "loading");

  if (!resolved) {
    return <View style={[styles.wrap, style]} />;
  }

  // Slots `.glb` para el WebView; "" en los demás = slot en blanco (lo tapa el video).
  const glbUrls = medias.map((m) => (m.kind === "glb" ? m.url : ""));
  const hasAnyGlb = glbUrls.some((u) => u !== "");
  const stacked = layout === "stack";

  return (
    <View style={[styles.wrap, style]}>
      {hasAnyGlb && (
        <MultiGlbView
          urls={glbUrls}
          activeIndex={activeIndex}
          paused={paused}
          layout={layout}
          rowHeight={rowHeight}
          rowGap={rowGap}
          style={StyleSheet.absoluteFillObject}
          onError={onError}
        />
      )}

      {stacked
        ? medias[activeIndex]?.kind === "video" && (
            <SignVideoView
              // La url como key: remonta el reproductor al cambiar de opción.
              key={medias[activeIndex].url}
              url={medias[activeIndex].url}
              paused={paused}
              style={StyleSheet.absoluteFillObject}
              onError={() => onError?.(activeIndex)}
            />
          )
        : medias.map((m, i) =>
            m.kind === "video" ? (
              <View
                key={i}
                style={[styles.row, { top: i * (rowHeight + rowGap), height: rowHeight }]}
              >
                <SignVideoView url={m.url} paused={paused} onError={() => onError?.(i)} />
              </View>
            ) : null,
          )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: colors.fill },
  row: {
    position: "absolute",
    left: 0,
    right: 0,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.fill,
  },
});
