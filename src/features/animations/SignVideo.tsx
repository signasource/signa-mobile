import React, { useMemo } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme";

interface Props {
  url: string;
  paused?: boolean;
  style?: ViewStyle;
  onLoaded?: () => void;
  onError?: (mensaje: string) => void;
}

/**
 * Una seña en video (.mp4, subida desde el panel de admins): en loop, sin
 * sonido y sin controles, como el avatar.
 *
 * Va en un WebView con `<video>` en lugar de un reproductor nativo para no
 * sumar una dependencia nativa: la app ya usa react-native-webview y así el
 * cambio llega sin recompilar.
 */
export function SignVideo({ url, paused, style, onLoaded, onError }: Props) {
  const html = useMemo(
    () => `<!doctype html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin: 0; height: 100%; background: ${colors.fill}; overflow: hidden; }
    video { width: 100%; height: 100%; object-fit: contain; display: block; }
  </style>
</head>
<body>
  <video id="v" autoplay loop muted playsinline preload="auto"></video>
  <script>
    var v = document.getElementById('v');
    var post = function (m) {
      if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
    };
    v.addEventListener('loadeddata', function () { post({ type: 'loaded' }); });
    v.addEventListener('error', function () {
      post({ type: 'error', message: 'video ' + (v.error ? v.error.code : '?') });
    });
    window.pausar = function (p) { if (p) v.pause(); else v.play().catch(function () {}); };
    v.src = ${JSON.stringify(url)};
  </script>
</body>
</html>`,
    [url],
  );

  const ref = React.useRef<WebView>(null);
  React.useEffect(() => {
    ref.current?.injectJavaScript(`window.pausar && window.pausar(${paused ? "true" : "false"}); true;`);
  }, [paused]);

  function onMessage(e: WebViewMessageEvent) {
    try {
      const m = JSON.parse(e.nativeEvent.data) as { type: string; message?: string };
      if (m.type === "loaded") onLoaded?.();
      else if (m.type === "error") onError?.(m.message ?? "video");
    } catch {
      // mensaje ajeno
    }
  }

  return (
    <WebView
      ref={ref}
      source={{ html }}
      originWhitelist={["*"]}
      style={[styles.lienzo, style]}
      javaScriptEnabled
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      mixedContentMode="always"
      scrollEnabled={false}
      pointerEvents="none"
      onMessage={onMessage}
      onError={(e) => onError?.(e.nativeEvent.description)}
    />
  );
}

const styles = StyleSheet.create({
  lienzo: { flex: 1, backgroundColor: colors.fill },
});
