import React, { useMemo, useRef, useEffect } from "react";
import { StyleSheet, ViewStyle } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { colors } from "@/theme";

const MODEL_VIEWER_CDN =
  "https://cdn.jsdelivr.net/npm/@google/model-viewer@3.5.0/dist/model-viewer.min.js";

function buildHtml(urls: string[], initialActiveIndex: number): string {
  const viewers = urls
    .map(
      (_, i) =>
        `<model-viewer class="mv${i === initialActiveIndex ? " active" : ""}" id="mv${i}" autoplay camera-controls camera-orbit="0deg 85deg 100%" min-camera-orbit="auto 60deg auto" max-camera-orbit="auto 110deg auto" interaction-prompt="none" shadow-intensity="1" exposure="1"></model-viewer>`
    )
    .join("");

  const srcs = urls
    .map((url, i) => (url ? `ns[${i}].src=${JSON.stringify(url)};` : ""))
    .join("");

  return `<!doctype html>
<html>
<head>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<style>
html,body{margin:0;height:100%;background:${colors.fill};}
.mv{position:absolute;inset:0;display:none;}
.mv.active{display:block;}
</style>
<script type="module" src="${MODEL_VIEWER_CDN}"></script>
</head>
<body>
${viewers}
<script>
var post=function(m){if(window.ReactNativeWebView)window.ReactNativeWebView.postMessage(JSON.stringify(m));};
var ns={};
document.querySelectorAll('.mv').forEach(function(mv,i){
  ns[i]=mv;
  mv.addEventListener('load',function(){
    try{var d=mv.getDimensions(),c=mv.getBoundingBoxCenter(),ty=c.y+d.y*0.30;mv.cameraTarget='0m '+ty.toFixed(3)+'m 0m';mv.fieldOfView='15deg';}catch(_){}
    post({type:'loaded',index:i});
  });
  mv.addEventListener('error',function(e){post({type:'error',index:i,message:(e&&e.detail&&e.detail.type)||'error'});});
});
${srcs}
</script>
</body>
</html>`;
}

export interface MultiGlbViewProps {
  /**
   * Ordered list of GLB URLs (one per meaning/option).
   * An empty string means "no model for this slot" — that model-viewer
   * element gets no src, so the slot stays blank inside the WebView.
   */
  urls: string[];
  /** 0-based index of the model to display. */
  activeIndex: number;
  paused?: boolean;
  style?: ViewStyle;
  onError?: (index: number) => void;
}

/**
 * One persistent WebView that pre-loads N GLB models simultaneously via
 * model-viewer and switches between them by injecting JS — zero WebView
 * reload when the active model changes.
 */
export function MultiGlbView({ urls, activeIndex, paused = false, style, onError }: MultiGlbViewProps) {
  const webviewRef = useRef<WebView>(null);

  // Snapshot initial values so the HTML is built exactly once and never changes.
  const initialUrls = useRef(urls);
  const initialIndex = useRef(activeIndex);
  const html = useMemo(() => buildHtml(initialUrls.current, initialIndex.current), []);

  // Always-current refs — updated synchronously during render so effects can
  // read them without stale-closure issues.
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const activeIndexRef = useRef(activeIndex);
  activeIndexRef.current = activeIndex;

  // Switch the visible model when activeIndex changes (skip on mount — initial
  // state is already encoded in the HTML).
  const prevIndexRef = useRef(activeIndex);
  useEffect(() => {
    if (prevIndexRef.current === activeIndex) return;
    prevIndexRef.current = activeIndex;
    const play = pausedRef.current ? "" : "mv.play();";
    webviewRef.current?.injectJavaScript(
      `(function(){Object.keys(ns).forEach(function(k){ns[k].className=ns[k].className.replace(/\\bactive\\b/,"").trim();ns[k].pause();});var mv=ns[${activeIndex}];if(mv){mv.className+=" active";${play}}})();true;`
    );
  }, [activeIndex]);

  // Pause / resume the active model when paused changes (skip on mount).
  const prevPausedRef = useRef(paused);
  useEffect(() => {
    if (prevPausedRef.current === paused) return;
    prevPausedRef.current = paused;
    const idx = activeIndexRef.current;
    webviewRef.current?.injectJavaScript(
      `(function(){var mv=ns[${idx}];if(mv)mv.${paused ? "pause" : "play"}();})();true;`
    );
  }, [paused]);

  function handleMessage(event: WebViewMessageEvent) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "error") onError?.(msg.index as number);
    } catch {}
  }

  return (
    <WebView
      ref={webviewRef}
      style={[styles.web, style]}
      originWhitelist={["*"]}
      source={{ html, baseUrl: "https://localhost" }}
      onMessage={handleMessage}
      onError={() => onError?.(activeIndexRef.current)}
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
