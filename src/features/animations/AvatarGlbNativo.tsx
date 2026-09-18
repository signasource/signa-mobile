import React from "react";
import { StyleSheet, ViewStyle } from "react-native";

import { colors } from "@/theme";
import { AvatarNativo } from "../../../modules/signa-vision";

interface Props {
  url: string;
  paused?: boolean;
  /** Arrastrar para girar el avatar. Por omisión sí, como en la versión web. */
  cameraControls?: boolean;
  style?: ViewStyle;
  onLoaded?: (clips: string[]) => void;
  /** Cuánto tardó en estar a la vista, partido en archivo y escena. */
  onTiempos?: (t: { msArchivo: number; msMontaje: number }) => void;
  onError?: (mensaje: string) => void;
}

/**
 * El mismo avatar que GlbAnimationView, con Filament en vez de un WebView.
 *
 * Expone la misma interfaz para que los ejercicios no cambien. Lo que cambia es
 * lo que hay abajo: antes cada avatar levantaba un WebView y bajaba el runtime
 * de `<model-viewer>` de un CDN antes de empezar; ahora el motor ya está en la
 * app y el .glb queda guardado en disco después de la primera vez.
 */
export function AvatarGlbNativo({ url, paused, cameraControls = true, style, onLoaded, onTiempos, onError }: Props) {
  return (
    <AvatarNativo
      style={StyleSheet.flatten([styles.lienzo, style])}
      url={url}
      pausado={!!paused}
      rotable={cameraControls}
      onCargado={(e) => {
        onTiempos?.({ msArchivo: e.nativeEvent.msArchivo, msMontaje: e.nativeEvent.msMontaje });
        onLoaded?.(new Array(e.nativeEvent.clips).fill(""));
      }}
      onFalla={(e) => onError?.(e.nativeEvent.error)}
    />
  );
}

const styles = StyleSheet.create({
  lienzo: { flex: 1, backgroundColor: colors.fill },
});
