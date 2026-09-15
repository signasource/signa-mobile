import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme";

interface GlbAnimationViewProps {
  url: string;
  paused?: boolean;
  /** Spin the model on its Y axis automatically (in addition to drag-to-rotate). */
  autoRotate?: boolean;
  /**
   * Let the user rotate the model by dragging. Default `true`.
   *
   * Turn it off when the view is small and lives inside something else that
   * owns the gesture — a draggable picture-in-picture, say: otherwise the drag
   * rotates the avatar instead of moving the container.
   */
  cameraControls?: boolean;
  style?: ViewStyle;
  /** Reports the GLB's animation clip names once loaded (empty if it has none). */
  onLoaded?: (clipNames: string[]) => void;
  onError?: (message: string) => void;
}

const MODEL_VIEWER_CDN =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js";

/**
 * Renders a `.glb` with Google's `<model-viewer>` inside a WebView: full PBR/color, drag-to-rotate
 * (`camera-controls`), optional auto-rotation and animation autoplay. The GLB is fetched by the web
 * engine, so the R2 bucket must allow CORS (GET). The presigned URL is injected safely via JS.
 */
function buildHtml(url: string, autoRotate: boolean, cameraControls: boolean): string {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="preconnect" href="https://pub-f40a1de4d1fc46b0b6f07299847c66e0.r2.dev">
  <link rel="preconnect" href="https://cdn.jsdelivr.net">
  <link rel="preload" as="fetch" crossorigin href=${JSON.stringify(url)}>
  <style>
    html, body { margin: 0; height: 100%; background: ${colors.fill}; }
    model-viewer { width: 100%; height: 100%; }
  </style>
  <script type="module" src="${MODEL_VIEWER_CDN}"></script>
</head>
<body>
  <model-viewer id="mv" autoplay loading="eager" ${cameraControls ? "camera-controls" : ""} ${autoRotate ? "auto-rotate" : ""}
    camera-orbit="0deg 85deg 100%"
    min-camera-orbit="auto 60deg 60%"
    max-camera-orbit="auto 110deg 160%"
    min-field-of-view="10deg" max-field-of-view="35deg"
    disable-pan
    interaction-prompt="none" shadow-intensity="0" exposure="1"></model-viewer>
  <script>
    var FOV = 15;          // grados
    var ENCUADRE = 0.52;   // qué fracción del alto del avatar entra en el cuadro
    var mv = document.getElementById('mv');
    var post = function (m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
    };
    mv.addEventListener('load', function () {
      try {
        var dims = mv.getDimensions();
        var center = mv.getBoundingBoxCenter();
        // Encuadre del torso para arriba: el objetivo sube un 30% del alto.
        var targetY = center.y + dims.y * 0.30;
        mv.cameraTarget = '0m ' + targetY.toFixed(3) + 'm 0m';
        mv.fieldOfView = FOV + 'deg';
        // La distancia se calcula a mano en vez de dejar el "100%" del
        // camera-orbit. Ese auto-encuadre depende del campo de visión que haya
        // cuando se calcula: el primer modelo se enmarca con los 45° por
        // defecto y queda cerca, y los siguientes ya encuentran los 15°
        // puestos y se van lejísimos. Por eso una seña se veía de torso y otra
        // de cuerpo entero. Derivándola del alto del modelo, todas encuadran
        // igual. Es lo mismo que hace signa-ml/demo/static/nombre.html.
        var radio = (dims.y * ENCUADRE / 2) / Math.tan(FOV / 2 * Math.PI / 180);
        mv.cameraOrbit = '0deg 85deg ' + radio.toFixed(3) + 'm';
        mv.jumpCameraToGoal();
      } catch (_e) {}
      post({ type: 'loaded', clips: mv.availableAnimations || [] });
    });
    mv.addEventListener('error', function (e) {
      post({ type: 'error', message: (e && e.detail && e.detail.type) || 'No se pudo cargar el modelo.' });
    });
    mv.src = ${JSON.stringify(url)};
  </script>
</body>
</html>`;
}

export function GlbAnimationView({
  url,
  paused = false,
  autoRotate = false,
  cameraControls = true,
  style,
  onLoaded,
  onError,
}: GlbAnimationViewProps) {
  const webviewRef = useRef<WebView>(null);
  // `cameraControls` NO entra en las dependencias: se cambia por
  // injectJavaScript para no rehacer el HTML y volver a bajar el modelo.
  const html = useMemo(() => buildHtml(url, autoRotate, cameraControls), [url, autoRotate]);

  useEffect(() => {
    webviewRef.current?.injectJavaScript(
      `(function(){var m=document.getElementById('mv');` +
        `if(m)m.toggleAttribute('camera-controls', ${cameraControls});})();true;`,
    );
  }, [cameraControls]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "loaded") {
        onLoaded?.(Array.isArray(msg.clips) ? msg.clips : []);
      } else if (msg.type === "error") {
        onError?.(msg.message);
      }
    } catch {
      // ignore malformed messages
    }
  }

  /*
   * Play/pause sin recargar el modelo.
   *
   * Al pausar se vuelve al primer frame, que es la posición neutra de las manos:
   * congelar el avatar a mitad de la seña, con las manos a media altura, queda
   * raro. Volver al inicio es una línea y deja una pose estable y prolija.
   */
  useEffect(() => {
    webviewRef.current?.injectJavaScript(
      `(function(){var m=document.getElementById('mv');if(!m)return;` +
        (paused
          ? `try{m.currentTime=0;}catch(e){}m.pause();`
          : `m.play();`) +
        `})();true;`,
    );
  }, [paused]);

  return (
    <WebView
      ref={webviewRef}
      style={[styles.web, style]}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://localhost" }}
      onMessage={handleMessage}
      onError={(e) => onError?.(e.nativeEvent.description || "Error del WebView.")}
      onRenderProcessGone={() => onError?.("El visor 3D se quedo sin memoria.")}
      javaScriptEnabled
      domStorageEnabled
      allowsInlineMediaPlayback
      mixedContentMode="always"
    />
  );
}

const styles = StyleSheet.create({
  web: { flex: 1, backgroundColor: colors.fill },
});
