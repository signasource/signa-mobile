import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme";

interface GlbAnimationViewProps {
  url: string;
  paused?: boolean;
  /** Spin the model on its Y axis automatically (in addition to drag-to-rotate). */
  autoRotate?: boolean;
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
function buildHtml(url: string, autoRotate: boolean): string {
  return `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; height: 100%; background: ${colors.fill}; }
    model-viewer { width: 100%; height: 100%; }
  </style>
  <script type="module" src="${MODEL_VIEWER_CDN}"></script>
</head>
<body>
  <model-viewer id="mv" autoplay camera-controls ${autoRotate ? "auto-rotate" : ""}
    camera-orbit="0deg 85deg 100%"
    min-camera-orbit="auto 60deg auto"
    max-camera-orbit="auto 110deg auto"
    interaction-prompt="none" shadow-intensity="1" exposure="1"></model-viewer>
  <script>
    var mv = document.getElementById('mv');
    var post = function (m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
    };
    mv.addEventListener('load', function () {
      try {
        var dims = mv.getDimensions();
        var center = mv.getBoundingBoxCenter();
        // Frame upper body: target ~65% up from bottom (chest/shoulder area).
        var targetY = center.y + dims.y * 0.30;
        mv.cameraTarget = '0m ' + targetY.toFixed(3) + 'm 0m';
        mv.fieldOfView = '15deg';
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
  style,
  onLoaded,
  onError,
}: GlbAnimationViewProps) {
  const webviewRef = useRef<WebView>(null);
  const html = useMemo(() => buildHtml(url, autoRotate), [url, autoRotate]);

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

  // Play/pause the animation without reloading the model.
  useEffect(() => {
    webviewRef.current?.injectJavaScript(
      `(function(){var m=document.getElementById('mv');if(m){m.${paused ? "pause" : "play"}();}})();true;`
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
