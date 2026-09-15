/**
 * HTML del reconocedor en vivo que corre dentro del WebView.
 *
 * Todo pasa en el teléfono: cámara → MediaPipe (WASM, en un worker) → vector de
 * 258 → ventana de 2,5 s → LSTM en TFLite → seña. No sale nada a la red. El
 * deletreo usa el mismo trackeo y decide con el modelo del abecedario, que mira
 * el frame actual en vez de una ventana.
 *
 * Corre en WebView y no en React Native porque MediaPipe sólo existe como WASM
 * para web: es la única forma hoy de sacar landmarks de pose y manos en un
 * teléfono sin escribir un módulo nativo. El resto de la app ya usa WebView
 * para los modelos 3D, así que no introduce una tecnología nueva.
 *
 * Se replica la lógica de `signa-ml/src/inference/sign_runner.py`:
 *   - ventana deslizante de 30 frames
 *   - promedio móvil de PROBABILIDADES (no del argmax), para no titilar
 *   - "reposo" como compuerta: mientras gana, no se confirma nada
 *   - N frames consecutivos por encima del umbral para confirmar
 */

export interface RecognizerConfig {
  /** Carpeta file:// donde están el wasm, los .task y el .tflite. */
  baseUrl: string;
  /** Nombre del worker de detección, firmado por contenido. Relativo a baseUrl. */
  workerUrl: string;
  /** Señas que este ejercicio acepta. El resto se ignora al confirmar. */
  targets: string[];
  /**
   * Qué modelo decide. "dinamico" mira una ventana de 2,5 s con la LSTM;
   * "estatico" mira el frame actual con el modelo del abecedario. El trackeo
   * —pose y manos— es el mismo en los dos.
   */
  modo?: "dinamico" | "estatico";
  /**
   * Confianza mínima para confirmar, igual para todas las señas. Si no viene,
   * se usa el umbral calibrado de cada seña (manifest.thresholds).
   */
  threshold?: number;
  /** Tamaño del promedio móvil de probabilidades. */
  smoothingWindow: number;
  /** Dibujar el esqueleto de pose y manos sobre el video. */
  showLandmarks: boolean;
}

/** Mensajes que el WebView manda a React Native. */
export type RecognizerMessage =
  | { type: "ready"; labels: string[]; delegate: string }
  | { type: "error"; message: string }
  | {
      type: "frame";
      /** Seña más probable ahora mismo (puede ser "reposo"). */
      sign: string | null;
      confidence: number;
      /** Qué tan llena está la ventana de 30 frames, 0..1. */
      progress: number;
      /** ¿Se ve el cuerpo? Si no, no hay nada que reconocer. */
      body: boolean;
      /** ¿Está quieto? "reposo" ganando. */
      resting: boolean;
      /** Manos detectadas (0, 1 o 2). Sin manos no hay seña posible. */
      hands: number;
      fps: number;
      /** Tamaño real del canvas del esqueleto; "0x0" delata un problema de layout. */
      canvas: string;
      /** Milisegundos por inferencia, promediados. Para comparar motores. */
      inferMs: number;
      /** Confianza de la seña que el ejercicio pidió: es la que se compara. */
      targetConfidence: number;
      /** Reparto del frame, en ms: detección de pose, de manos y dibujo. */
      /** Fps del bucle de dibujo: cuánto le queda libre al hilo principal. */
      /** Costo de copiar el frame para mandárselo al worker. */
    }
  | { type: "confirmed"; sign: string; confidence: number };

export function buildRecognizerHtml(config: RecognizerConfig): string {
  const cfg = JSON.stringify(config);
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<style>
  html, body { margin: 0; height: 100%; background: #EBE3DB; overflow: hidden; }
  #cam, #ovl { position: absolute; inset: 0; width: 100%; height: 100%; transform: scaleX(-1); }
  #cam { object-fit: cover; display: block; }
  #ovl { pointer-events: none; }
  #err { position: absolute; inset: 0; display: none; align-items: center; justify-content: center;
         padding: 24px; font: 500 14px/1.5 system-ui, sans-serif; color: #241A16; text-align: center; }
</style>
</head>
<body>
  <video id="cam" autoplay playsinline muted></video>
  <canvas id="ovl"></canvas>
  <script>
  // La página corre desde file://, donde fetch() está prohibido por norma. El
  // runtime de TFLite pide su .wasm con fetch y no tiene salida de emergencia:
  // la promesa rechaza con "Failed to fetch" y aborta. Acá se le da esa salida
  // resolviendo file:// con XHR, que el WebView sí permite.
  (function () {
    var original = window.fetch;
    window.fetch = function (entrada, init) {
      var url = typeof entrada === 'string' ? entrada : (entrada && entrada.url);
      var abs;
      try { abs = new URL(url, location.href); } catch (e) { abs = null; }
      if (!abs || abs.protocol !== 'file:') return original.apply(this, arguments);
      return new Promise(function (ok, no) {
        var x = new XMLHttpRequest();
        x.open('GET', abs.href);
        x.responseType = 'arraybuffer';
        x.onload = function () {
          // instantiateStreaming exige el content-type exacto; sin él el
          // runtime cae solo al camino de ArrayBuffer, que también funciona.
          var tipo = /\.wasm$/.test(abs.pathname) ? 'application/wasm' : 'application/octet-stream';
          ok(new Response(x.response, { status: 200, headers: { 'Content-Type': tipo } }));
        };
        x.onerror = function () { no(new TypeError('No se pudo leer ' + abs.href)); };
        x.send();
      });
    };
  })();
  </script>
  <div id="err"></div>
<script type="module">
const CFG = ${cfg};
window.__signaCfg = CFG;   // permite togglear el esqueleto en caliente

const post = (m) => {
  if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m));
};
const fail = (m) => {
  const el = document.getElementById('err');
  el.textContent = m;
  el.style.display = 'flex';
  post({ type: 'error', message: m });
};

window.addEventListener('error', (e) => fail('Error: ' + (e.message || e)));
window.addEventListener('unhandledrejection', (e) => fail('Error: ' + (e.reason?.message || e.reason)));

// fetch() rechaza file:// por especificación, pero XHR sí lo lee cuando el
// WebView tiene habilitado el acceso a archivos. Todo lo que carga esta página
// vive en la misma carpeta del sandbox, así que va por acá.
function leer(url, tipo) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = tipo;
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer ' + url.split('/').pop()));
    xhr.send();
  });
}

try {
  const { buildKeypoints, normalizeKeypoints, FEATURE_DIM, POSE_DIM } =
    await import(CFG.baseUrl + 'engine.js');
  const vision = await import(CFG.baseUrl + 'vision_bundle.js');

  const manifest = JSON.parse(await leer(CFG.baseUrl + 'manifest.json', 'text'));

  // --- umbral por seña ---
  // Cada seña tiene su propio umbral, calibrado en signa-ml: no todas salen
  // con la misma confianza y uno global o deja pasar cualquier cosa en las
  // fáciles o nunca acepta las que se reparten con una vecina parecida. El
  // ejercicio puede pisarlo con un valor único desde el YAML.
  // El modelo dinámico no recibe la pose: la usa sólo para normalizar. Sin
  // esto aprendía a reconocer por la postura del cuerpo en vez de por las
  // manos, y en el teléfono —otra postura, otro encuadre— no quedaba nada.
  const SIN_POSE = manifest.poseIgnored !== false;
  const POSE_BLOCK = POSE_DIM;

  const UMBRALES = manifest.thresholds || {};
  const UMBRAL_POR_DEFECTO = 0.8;
  const umbralDe = (s) => {
    if (typeof CFG.threshold === 'number') return CFG.threshold;
    const tabla = CFG.modo === 'estatico' ? umbralesLetras : UMBRALES;
    return typeof tabla[s] === 'number' ? tabla[s] : UMBRAL_POR_DEFECTO;
  };

  // El modelo corre en TFLite, el mismo archivo que entrena signa-ml. Se cargan
  // acá, y no con una etiqueta fija en el head, porque son 1,7 MB que sólo
  // hacen falta cuando el ejercicio arranca de verdad.
  const cargarScript = (src) => new Promise((ok, no) => {
    const el = document.createElement('script');
    el.src = src;
    el.onload = ok;
    el.onerror = () => no(new Error('no cargó ' + src));
    document.head.appendChild(el);
  });

  // OJO: src RELATIVO, no CFG.baseUrl.
  //
  // Al evaluarse, tftflite.js arranca solo la carga de su runtime y arma la
  // URL a partir del src de su propio <script>, que lee con getAttribute (o
  // sea, tal cual se lo escribimos). Si le damos un file:// absoluto, hace
  // <carpeta de la página> + "/" + <ese file:// entero> y pide una ruta
  // imposible; el script no carga, el módulo queda undefined y lo único que se
  // ve después es "cannot read _malloc". Con un src relativo la cuenta da la
  // carpeta correcta, que es donde están todos los assets.
  for (const f of ['tfcore.js', 'tfcpu.js', 'tftflite.js']) {
    await cargarScript(f);
  }
  await tf.setBackend('cpu');
  await tf.ready();

  // Ruta vacía: tfjs-tflite sólo entiende http:// o rutas absolutas del sitio,
  // y a cualquier otra le antepone la carpeta de la página. Como la página y
  // los assets viven en la misma carpeta, vacío es exactamente lo que resuelve.
  tflite.setWasmPath('');
  const tbuf = await leer(CFG.baseUrl + 'modelo.tflite', 'arraybuffer');
  const tmodel = await tflite.loadTFLiteModel(tbuf);
  const predecir = (seq) => {
    const t = tf.tensor(seq, [1, manifest.sequenceLength, manifest.featureDim]);
    const r = tmodel.predict(t);
    const d = r.dataSync();
    t.dispose(); r.dispose();
    return d;
  };
  // --- modelo del abecedario, sólo si el ejercicio lo pide ---
  //
  // Recibe los landmarks crudos: las 514 features las calcula adentro del grafo
  // (ver signa-ml/scripts/export_alphabet_for_app.py). Por eso acá no hay nada
  // parecido a hand_features.py, y por eso no puede haber desajuste.
  let alfabeto = null, letras = [], umbralesLetras = {}, entradasAlfabeto = {};
  if (CFG.modo === 'estatico') {
    const manifiestoLetras = JSON.parse(
      await leer(CFG.baseUrl + 'alfabeto.json', 'text'));
    letras = manifiestoLetras.labels;
    umbralesLetras = manifiestoLetras.thresholds || {};
    alfabeto = await tflite.loadTFLiteModel(
      await leer(CFG.baseUrl + 'alfabeto.tflite', 'arraybuffer'));

    // Los nombres de las entradas se leen del modelo, no se escriben acá.
    // Al convertir vía SavedModel, TFLite las renombra a
    // "serving_default_landmarks:0" y compañía, y pasarle las claves cortas
    // falla con "the model input names don't match".
    for (const t of alfabeto.inputs) {
      for (const clave of ['landmarks', 'world', 'cara']) {
        if (t.name.indexOf(clave) >= 0) entradasAlfabeto[clave] = t.name;
      }
    }
  }

  // La primera inferencia sale con el estado de la LSTM sin inicializar y
  // devuelve basura — medido y reproducible. Se quema una en vacío para que el
  // primer resultado que vea el usuario sea válido.
  predecir(new Float32Array(manifest.sequenceLength * manifest.featureDim));


  // --- MediaPipe: pose + manos, que es exactamente lo que come el modelo ---
  //
  // Se usan PoseLandmarker + HandLandmarker por separado y NO HolisticLandmarker:
  // holistic corre además la malla facial de 478 puntos, que este modelo no usa
  // para nada. Medido en el emulador, holistic daba 5 fps — por debajo de los
  // ~10 que la ventana de 30 frames tolera.
  //
  // Los dos viven en un worker (ver detectorWorker.ts): son WASM síncrono y en
  // este hilo bloqueaban el dibujo y los toques.
  let delegado = '';

  // El worker se levanta desde un blob, no desde su ruta file://.
  //
  // Probado en el WebView: un worker módulo cargado por file:// falla con el
  // error censurado (origen opaco), mientras que desde un blob anda, y desde
  // adentro puede importar vision_bundle.js por file:// sin problema. Módulo y
  // no clásico porque vision_bundle.js ES un módulo ES.
  async function crearWorker(forzar) {
    const src = await leer(CFG.baseUrl + CFG.workerUrl, 'text');
    const blob = new Blob([src], { type: 'text/javascript' });
    return arrancar(new Worker(URL.createObjectURL(blob), { type: 'module' }), forzar);
  }

  // Se considera arrancado sólo cuando el detector avisa que cargó MediaPipe.
  function arrancar(w, forzar) {
    return new Promise((ok, no) => {
      w.onmessage = (e) => {
        if (e.data.tipo === 'listo') { delegado = e.data.delegado; ok(w); }
        else if (e.data.tipo === 'error') no(new Error(e.data.message));
      };
      w.onerror = (e) => no(new Error(e.message || 'no arrancó'));
      w.postMessage({ tipo: 'init', baseUrl: CFG.baseUrl, forzar });
    });
  }

  let detector = await crearWorker();

  // ── Dibujo del esqueleto ────────────────────────────────────────────────
  //
  // Portado tal cual de PoseRenderer en signa-ml/demo/static/signa.js: halo
  // blanco debajo, línea de acento encima, y puntos con el mismo par
  // blanco+acento. El acento es siempre violeta.
  //
  // Clave del look: el dibujo corre a 60 fps por su cuenta e INTERPOLA hacia
  // los últimos landmarks recibidos. La detección va a ~12 fps; sin
  // interpolar, el esqueleto salta y se ve horrible.
  const LINKS = [[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],
                 [10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],
                 [18,19],[19,20],[0,17]];
  const TIPS = [4, 8, 12, 16, 20];
  // Sólo torso y brazos: las piernas no aportan a la seña y ensucian el cuadro.
  const POSE_LINKS = [[11,12],[11,13],[13,15],[12,14],[14,16],[11,23],[12,24],[23,24]];
  const POSE_POINTS = [11,12,13,14,15,16,23,24];
  const ACENTO = { idle: '#7857FF' };

  const ovl = document.getElementById('ovl');

  const render = {
    pose: null, poseTarget: null,
    manos: {}, manosTarget: {},
    accent: ACENTO.idle,
    visible: false,
    ultimoDibujo: 0,
  };

  function setFrame(pose, manos) {
    render.poseTarget = pose;
    render.manosTarget = manos || {};
    if (pose && !render.pose) render.pose = pose.map((p) => [p.x, p.y]);
    for (const k of Object.keys(render.manosTarget)) {
      if (!render.manos[k]) render.manos[k] = render.manosTarget[k].map((p) => [p.x, p.y]);
    }
    // Una mano que desaparece deja de dibujarse en vez de quedar congelada.
    for (const k of Object.keys(render.manos)) {
      if (!render.manosTarget[k]) delete render.manos[k];
    }
    render.visible = !!pose;
  }

  function dibujarLoop() {
    requestAnimationFrame(dibujarLoop);
    dibujar();
  }

  function dibujar() {
    const c = ovl;
    const w = c.clientWidth, h = c.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = Math.round(w * dpr), ch = Math.round(h * dpr);
    if (c.width !== cw || c.height !== ch) { c.width = cw; c.height = ch; }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (!CFG.showLandmarks || !render.visible || !render.pose || !render.poseTarget) return;

    // La suavización va por TIEMPO, no por frame dibujado. Con un factor fijo
    // por frame, en un teléfono lento (pocos fps de dibujo y de detección) el
    // esqueleto tardaba casi un segundo en alcanzar la mano: se veía arrastrado.
    // Con una constante de tiempo, converge siempre en los mismos ~70 ms reales,
    // corra a 60 fps o a 8.
    const ahora = performance.now();
    const dt = Math.min(ahora - (render.ultimoDibujo || ahora), 200);
    render.ultimoDibujo = ahora;
    const TAU = 70;
    const ease = 1 - Math.exp(-dt / TAU);
    for (let i = 0; i < render.pose.length; i++) {
      const t = render.poseTarget[i];
      if (!t) continue;
      render.pose[i][0] += (t.x - render.pose[i][0]) * ease;
      render.pose[i][1] += (t.y - render.pose[i][1]) * ease;
    }
    for (const k of Object.keys(render.manos)) {
      const t = render.manosTarget[k];
      if (!t) continue;
      for (let i = 0; i < render.manos[k].length; i++) {
        render.manos[k][i][0] += (t[i].x - render.manos[k][i][0]) * ease;
        render.manos[k][i][1] += (t[i].y - render.manos[k][i][1]) * ease;
      }
    }

    // El video usa object-fit:cover: hay que recortar igual que el para que
    // los puntos caigan sobre la mano y no corridos.
    const vw = video.videoWidth || 4, vh = video.videoHeight || 3;
    const escala = Math.max(w / vw, h / vh);
    const dw = vw * escala, dh = vh * escala;
    const ox = (w - dw) / 2, oy = (h - dh) / 2;
    // Los landmarks vienen de la imagen espejada y el canvas ya está espejado
    // por CSS: hay que invertir la x o el esqueleto cae del lado contrario.
    const map = (p) => [ox + (1 - p[0]) * dw, oy + p[1] * dh];

    ctx.lineCap = 'round';
    const trazo = (links, pts, halo, ancho) => {
      ctx.strokeStyle = halo ? 'rgba(255,255,255,.5)' : render.accent;
      ctx.lineWidth = ancho;
      links.forEach(([a, b]) => {
        if (!pts[a] || !pts[b]) return;
        const p = map(pts[a]), q = map(pts[b]);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      });
    };

    // Cuerpo más tenue que las manos: la seña se lee en las manos, el cuerpo
    // sólo da contexto de dónde están.
    ctx.globalAlpha = 0.65;
    trazo(POSE_LINKS, render.pose, true, 6);
    trazo(POSE_LINKS, render.pose, false, 2.6);
    POSE_POINTS.forEach((i) => {
      if (!render.pose[i]) return;
      const p = map(render.pose[i]);
      ctx.beginPath(); ctx.arc(p[0], p[1], 5, 0, 6.2832);
      ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
      ctx.beginPath(); ctx.arc(p[0], p[1], 3.4, 0, 6.2832);
      ctx.fillStyle = render.accent; ctx.fill();
    });

    ctx.globalAlpha = 1;
    for (const k of Object.keys(render.manos)) {
      if (!render.manosTarget[k]) continue;
      const pts = render.manos[k];
      trazo(LINKS, pts, true, 5);
      trazo(LINKS, pts, false, 2.4);
      pts.forEach((p0, i) => {
        const p = map(p0);
        const r = i === 0 ? 5 : TIPS.includes(i) ? 4.2 : 3;
        ctx.beginPath(); ctx.arc(p[0], p[1], r + 1.5, 0, 6.2832);
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
        ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, 6.2832);
        ctx.fillStyle = render.accent; ctx.fill();
      });
    }
  }

  const video = document.getElementById('cam');
  const stream = await navigator.mediaDevices.getUserMedia({
    // Punto medio, elegido con números: a 320x240 se veía borroso y a 640x480
    // el detector de manos pasó de 61 a 72 ms —justo el fps de detección que se
    // perdía—, así que queda en el escalón del medio.
    video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();

  // Al rotar o cambiar de tamaño, dibujar() reajusta solo en el siguiente frame.

  post({ type: 'ready', labels: manifest.labels, delegate: delegado });
  requestAnimationFrame(dibujarLoop);

  const SEQ = manifest.sequenceLength;
  const REST = 'reposo';

  // Presupuesto de trabajo. Procesar en cada vsync no sirve de nada: lo que
  // manda es que la ventana de SEQ frames cubra el tiempo que dura una seña.
  // A 12 fps son 2,5 s, holgado, y deja el triple de CPU libre.
  const FPS_OBJETIVO = 12;
  const MS_POR_FRAME = 1000 / FPS_OBJETIVO;
  // La pose se detecta cada N frames y se reutiliza la última. El torso se mueve
  // muchísimo más lento que las manos, y de la pose sólo dependen la referencia
  // de hombros (que normaliza) y los brazos. Las manos, que son donde está la
  // seña, se detectan siempre.
  //
  // Pasó de 3 a 5 midiendo: la pose sale 39 ms y corre 1 de cada N, así que
  // amortizada baja de 13 a 8 ms de los ~90 que dura el ciclo. Es poco, pero es
  // lo único barato que quedaba; los 72 ms de las manos no se tocan porque ahí
  // está la seña.
  const FRAMES_POR_POSE = 5;
  // La ventana guarda cada frame con su instante, no sólo el frame.
  //
  // Antes eran "los últimos 30 procesados", y eso dura lo que dure: a 12 fps son
  // 2,5 s y a 10 son 3,0. O sea que la misma seña le llegaba al modelo estirada
  // o comprimida según el teléfono y el momento, cuando el modelo aprendió con
  // clips de una duración fija. Ahora se toman siempre los últimos VENTANA_MS y
  // se interpolan a SEQ puntos parejos: el paso vale siempre lo mismo.
  const VENTANA_MS = 2500;
  const ventana = [];        // { t, kp } de los últimos VENTANA_MS
  const suavizado = [];      // últimas probabilidades, para el promedio móvil
  // Confirmar se mide en tiempo sostenido, no en frames.
  //
  // Eran 4 frames seguidos: a 6 predicciones por segundo daban 670 ms, pero al
  // pasar a inferir en cada frame quedaron 360 — sin querer, bajé a la mitad la
  // evidencia que pide el ejercicio. En tiempo no depende de los fps del
  // aparato ni de cuántas veces por segundo se infiera.
  const CONFIRMAR_MS = 700;

  // Y alcanza con que la seña esté por encima del umbral la MAYOR PARTE de ese
  // tiempo, no en todos los frames seguidos.
  //
  // Medido en un teléfono: haciendo bien la seña, la probabilidad supera su
  // umbral en el 64% de los frames y se cae en el resto. Exigir siete aciertos
  // consecutivos sobre eso es mucho más difícil que el 64% suelto, y era la
  // razón de que costara tanto confirmar algo que el modelo estaba viendo.
  const PROPORCION_MINIMA = 0.6;

  // Movimiento mínimo de las manos en la ventana.
  //
  // Sólo atrapa el caso degenerado: una ventana de frames idénticos, que es lo
  // que deja una cámara congelada. NO distingue "haciendo una seña" de "parado
  // sin hacer nada" — medido sobre el dataset, los clips de reposo tienen
  // movimiento mediano 0.067 y el 93% supera este piso. De eso se encarga la
  // clase de reposo del modelo, no este número.
  const MOVIMIENTO_MIN = 0.004;

  // La ventana tiene que estar POBLADA, no sólo abarcar 2,5 s.
  //
  // Los frames sin manos no entran, así que cuando MediaPipe las pierde la
  // ventana se vacía sin que nadie se entere: quedaban dos frames, uno viejo y
  // uno nuevo, y remuestrear() los unía con una recta de 30 pasos. Esa recta no
  // es una seña quieta: es un deslizamiento suave que pasa de sobra el mínimo
  // de movimiento. Medido con clips reales, una ventana de dos frames da al
  // modelo 0.95–1.00 de confianza en una seña que nunca se hizo — con las
  // manos abajo, que es justo lo que se veía en el teléfono.
  //
  // A ~11 fps una ventana llena trae unos 28 frames. Diez, y sin huecos de más
  // de medio segundo, deja pasar hasta una seña a la que MediaPipe le pierda
  // las manos un tercio del tiempo, y sigue siendo imposible para las dos o
  // tres apariciones sueltas que fabricaban señas de la nada. El margen va de
  // este lado a propósito: bloquear una seña real es peor que dejar pasar una
  // ventana algo rala, que después tiene que superar el umbral igual.
  const MIN_MUESTRAS = 10;
  const HUECO_MAX = 500;

  /** El salto más grande entre frames consecutivos de la ventana. */
  function huecoMayor() {
    let peor = 0;
    for (let i = 1; i < ventana.length; i++) {
      const d = ventana[i].t - ventana[i - 1].t;
      if (d > peor) peor = d;
    }
    return peor;
  }

  // Historial { t, ok } de los últimos CONFIRMAR_MS para la seña candidata.
  let evidencia = [], ultima = null, confirmada = null;
  let lastTs = -1, fpsEma = 0, prevT = performance.now();
  let ultimoProceso = 0, cuenta = 0, msInferencia = 0, enVuelo = false;
  let pObjetivo = 0;   // confianza de la seña pedida: es lo que se decide
  // Vigilante del detector. Crear el detector con GPU puede salir bien y aun
  // así no devolver nunca un frame, según el WebGL del aparato. Si eso pasa, se
  // levanta de nuevo en CPU en vez de quedarse esperando para siempre.
  let enviadoEn = 0, sinRespuesta = 0, reiniciando = false;
  // Holgado a propósito: el primer frame con GPU puede tardar lo suyo mientras
  // compila sus shaders, y cada resultado que llega reinicia la cuenta. Hacen
  // falta tres frames seguidos sin respuesta para dar la GPU por perdida.
  const ESPERA_MAX = 3500;

  // Al detector hay que darle la imagen ESPEJADA.
  //
  // El dataset se graba con cv2.flip(frame, 1): todos los landmarks con los que
  // se entrena salen de la imagen espejada, y la etiqueta izquierda/derecha de
  // MediaPipe también. Pasarle los píxeles crudos es la convención opuesta, y
  // medido sobre clips reales tira la probabilidad de la seña correcta de 1.00
  // a 0.00.
  const espejo = document.createElement('canvas');
  const espejoCtx = espejo.getContext('2d');

  function frameEspejado() {
    if (espejo.width !== video.videoWidth || espejo.height !== video.videoHeight) {
      espejo.width = video.videoWidth;
      espejo.height = video.videoHeight;
    }
    espejoCtx.setTransform(-1, 0, 0, 1, espejo.width, 0);
    espejoCtx.drawImage(video, 0, 0);
    return espejo;
  }

  let ultimo = { sign: null, confidence: 0, resting: false };
  let ultimoResumen = '', ultimoEnvio = 0;

  /**
   * Los últimos VENTANA_MS repartidos en SEQ pasos iguales, interpolando entre
   * los frames que realmente se capturaron.
   */
  function remuestrear(ahora) {
    const flat = new Float32Array(SEQ * FEATURE_DIM);
    const desde = ahora - VENTANA_MS;
    let j = 0;
    for (let i = 0; i < SEQ; i++) {
      const t = desde + (VENTANA_MS * i) / (SEQ - 1);
      while (j < ventana.length - 2 && ventana[j + 1].t < t) j++;
      const a = ventana[j], b = ventana[Math.min(j + 1, ventana.length - 1)];
      const span = b.t - a.t;
      const u = span > 0 ? Math.min(1, Math.max(0, (t - a.t) / span)) : 0;
      const off = i * FEATURE_DIM;
      for (let k = 0; k < FEATURE_DIM; k++) {
        flat[off + k] = a.kp[k] + (b.kp[k] - a.kp[k]) * u;
      }
    }
    return flat;
  }

  /** Desplazamiento medio de las manos entre pasos de la ventana. */
  function movimientoManos(flat) {
    let suma = 0, n = 0;
    for (let t = 1; t < SEQ; t++) {
      const a = (t - 1) * FEATURE_DIM, b = t * FEATURE_DIM;
      for (let k = POSE_DIM; k < FEATURE_DIM; k++) {
        suma += Math.abs(flat[b + k] - flat[a + k]);
        n++;
      }
    }
    return n ? suma / n : 0;
  }

  // Índices de BlazePose y de la mano que usa el bloque de cara. Son los mismos
  // que signa-ml/src/data/hand_features.py.
  const OJO_IZQ = 2, OJO_DER = 5, BOCA_IZQ = 9, BOCA_DER = 10;
  const MUNECA = 0, INDICE_PUNTA = 8, MAYOR_PUNTA = 12, MAYOR_NUDILLO = 9;

  /**
   * Los 8 valores de "dónde está la mano respecto de la cara".
   *
   * Es lo único del pipeline estático que quedó en JavaScript, porque depende
   * de la pose y no de la mano. Los ojos y la boca salen de BlazePose, igual
   * que al armar el dataset. Sin cara: todo en cero y bandera en 0, que es lo
   * que el modelo aprendió a ignorar.
   */
  function bloqueDeCara(pose, mano, espejada) {
    if (!pose || !mano) return new Float32Array(8);
    const ojo = [(pose[OJO_IZQ].x + pose[OJO_DER].x) / 2,
                 (pose[OJO_IZQ].y + pose[OJO_DER].y) / 2];
    const boca = [(pose[BOCA_IZQ].x + pose[BOCA_DER].x) / 2,
                  (pose[BOCA_IZQ].y + pose[BOCA_DER].y) / 2];
    const escala = Math.hypot(boca[0] - ojo[0], boca[1] - ojo[1]);
    if (escala < 1e-6) return new Float32Array(8);

    const out = new Float32Array(8);
    const puntos = [MUNECA, INDICE_PUNTA, MAYOR_PUNTA];
    for (let k = 0; k < 3; k++) {
      const dx = (mano[puntos[k]].x - ojo[0]) / escala;
      const dy = (mano[puntos[k]].y - ojo[1]) / escala;
      out[k * 2] = espejada ? -dx : dx;
      out[k * 2 + 1] = dy;
    }
    out[6] = Math.hypot(mano[MAYOR_NUDILLO].x - mano[MUNECA].x,
                        mano[MAYOR_NUDILLO].y - mano[MUNECA].y) / escala;
    out[7] = 1;
    return out;
  }

  /** Probabilidad de cada letra para el frame actual. */
  function predecirLetra(pose, mano, world, lado) {
    // El dataset trata todas las manos como derechas: si es izquierda, se
    // espeja en x, igual que en build_alphabet_dataset.py.
    const espejada = (lado || 'Right').toLowerCase().startsWith('l');
    const signo = espejada ? -1 : 1;

    const lm = new Float32Array(63), wl = new Float32Array(63);
    for (let i = 0; i < 21; i++) {
      lm[i * 3] = signo * mano[i].x;
      lm[i * 3 + 1] = mano[i].y;
      lm[i * 3 + 2] = mano[i].z;
      const w = world ? world[i] : { x: 0, y: 0, z: 0 };
      wl[i * 3] = signo * w.x;
      wl[i * 3 + 1] = w.y;
      wl[i * 3 + 2] = w.z;
    }

    const entradas = {
      [entradasAlfabeto.landmarks]: tf.tensor(lm, [1, 21, 3]),
      [entradasAlfabeto.world]: tf.tensor(wl, [1, 21, 3]),
      [entradasAlfabeto.cara]: tf.tensor(bloqueDeCara(pose, mano, espejada), [1, 8]),
    };
    const r = alfabeto.predict(entradas);
    const probs = r.dataSync();
    for (const t of Object.values(entradas)) t.dispose();
    r.dispose();
    return probs;
  }

  function paso(probs, etiquetas) {
    suavizado.push(probs);
    if (suavizado.length > CFG.smoothingWindow) suavizado.shift();
    const media = new Float32Array(probs.length);
    for (const p of suavizado) for (let i = 0; i < p.length; i++) media[i] += p[i] / suavizado.length;

    let idx = 0;
    for (let i = 1; i < media.length; i++) if (media[i] > media[idx]) idx = i;
    return { sign: etiquetas[idx], confidence: media[idx], media };
  }

  // Cambiar la seña pedida en caliente. Rearmar la página entre una seña y la
  // siguiente reiniciaría la cámara; además hay que soltar la confirmación
  // anterior o la seña recién hecha quedaría trabada.
  window.__signaTargets = (t) => {
    CFG.targets = t;
    confirmada = null; evidencia = []; ultima = null;
  };

  function loop() {
    const now = performance.now();
    // Pausado: se deja la cámara viva pero no se infiere, y se vacía la ventana
    // para no retomar con frames viejos de hace varios segundos.
    if (window.__signaPaused) {
      if (ventana.length) {
        ventana.length = 0; suavizado.length = 0; evidencia = []; ultima = null;
        render.visible = false;
      }
      requestAnimationFrame(loop);
      return;
    }
    if (enVuelo && !reiniciando && now - enviadoEn > ESPERA_MAX) {
      enVuelo = false;
      if (++sinRespuesta >= 3) reiniciarEnCpu();
    }

    // Un solo frame en vuelo: si el worker todavía no contestó, no tiene
    // sentido mandarle otro — se acumularían y el esqueleto mostraría pasado.
    if (!enVuelo && now - ultimoProceso >= MS_POR_FRAME &&
        video.currentTime !== lastTs && video.readyState >= 2) {
      enVuelo = true;
      enviadoEn = now;
      ultimoProceso = now;
      lastTs = video.currentTime;
      cuenta++;
      createImageBitmap(frameEspejado()).then((bitmap) => {
        detector.postMessage(
          { tipo: 'frame', bitmap, ts: now, conPose: cuenta % FRAMES_POR_POSE === 0 },
          [bitmap],
        );
      }).catch(() => { enVuelo = false; });
    }
    requestAnimationFrame(loop);
  }

  async function reiniciarEnCpu() {
    if (reiniciando || delegado.indexOf('CPU') === 0) return;
    reiniciando = true;
    detector.terminate();
    try {
      detector = await crearWorker('CPU');
      delegado = 'CPU (GPU no respondió)';
      escucharDetector();
      sinRespuesta = 0;
    } catch (e) {
      fail('El detector no respondió: ' + (e && e.message || e));
    }
    reiniciando = false;
  }

  function escucharDetector() {
    detector.onmessage = (e) => {
    const m = e.data;
    if (m.tipo === 'error') { fail(m.message); return; }
    if (m.tipo !== 'resultado') return;
    enVuelo = false;
    sinRespuesta = 0;
    procesar(m);
    };
  }
  escucharDetector();

  function procesar(r) {
    const now = r.ts;
    // El resultado puede llegar después de pausar: no se mete en la ventana.
    if (window.__signaPaused) return;

    {
      const cuerpo = r.pose;
      const lh = r.izq, rh = r.der;
      const body = !!(cuerpo && cuerpo.length);
      const nManos = (lh ? 1 : 0) + (rh ? 1 : 0);
      const manosDetectadas = {};
      if (lh) manosDetectadas.izq = lh;
      if (rh) manosDetectadas.der = rh;
      setFrame(cuerpo, manosDetectadas);

      // Sin manos no entra nada a la ventana.
      //
      // Un frame sin manos son 126 ceros donde el modelo espera una seña. En el
      // dataset eso no existe —siempre se grabó con las manos a la vista— así
      // que es entrada fuera de distribución, y el modelo responde cualquier
      // cosa con mucha confianza. Era parte de por qué reconocía señas con las
      // manos abajo.
      const kp = normalizeKeypoints(buildKeypoints(cuerpo, lh, rh));
      if (nManos > 0) ventana.push({ t: now, kp });
      // Se descarta TODO lo que se pasó de viejo, sin guardar el último.
      // Guardarlo dejaba un frame eterno en la ventana: con las manos fuera de
      // cuadro, el reconocedor seguía teniendo "la ventana cubierta" con una
      // foto de hace diez segundos.
      while (ventana.length && now - ventana[0].t > VENTANA_MS) ventana.shift();

      const dt = now - prevT; prevT = now;
      fpsEma = fpsEma ? fpsEma * 0.9 + (1000 / dt) * 0.1 : 1000 / dt;

      let { sign, confidence, resting } = ultimo;
      const estatico = CFG.modo === 'estatico';
      // El dinámico necesita la ventana llena; el estático decide con el frame
      // que tiene delante, así que le alcanza con que haya una mano.
      const listo = estatico
        ? !!(r.mano || lh || rh)
        : ventana.length >= MIN_MUESTRAS &&
          now - ventana[0].t >= VENTANA_MS * 0.9 &&
          huecoMayor() <= HUECO_MAX;
      const cubierto = listo;

      if (listo) {
        const etiquetas = estatico ? letras : manifest.labels;
        let probs, enMovimiento;

        const tInf = performance.now();
        if (estatico) {
          // Una letra ES una postura sostenida: acá el movimiento no se exige.
          probs = predecirLetra(cuerpo, r.mano || lh || rh, r.world, r.lado);
          enMovimiento = true;
        } else {
          const flat = remuestrear(now);
          enMovimiento = movimientoManos(flat) >= MOVIMIENTO_MIN;
          if (SIN_POSE) {
            for (let t = 0; t < SEQ; t++) {
              flat.fill(0, t * FEATURE_DIM, t * FEATURE_DIM + POSE_BLOCK);
            }
          }
          probs = predecir(flat);
        }
        msInferencia = msInferencia
          ? msInferencia * 0.8 + (performance.now() - tInf) * 0.2
          : performance.now() - tInf;

        const res = paso(probs, etiquetas);
        sign = res.sign; confidence = res.confidence;
        const media = res.media;
        // El abecedario no tiene clase de reposo: si no hay mano, no hay letra.
        resting = estatico ? !(r.mano || lh || rh) : sign === REST;
        ultimo = { sign, confidence, resting };

        // "reposo" ganando = no está haciendo ninguna seña. Además es la señal
        // de que terminó la anterior, así que se libera la confirmación.
        if (resting) { evidencia = []; ultima = null; confirmada = null; pObjetivo = 0; }
        else {
          // Verificación, no identificación: si el ejercicio ya dijo qué seña
          // pidió, se mira la probabilidad de ESA contra su umbral calibrado,
          // en vez de exigir que le gane a todas las demás. Es el mismo criterio
          // con el que se calibraron los umbrales, y es lo que hace pasar a las
          // señas que se reparten con una vecina parecida (mama/papa).
          let cand = sign, pCand = confidence;
          if (CFG.targets.length) {
            cand = null; pCand = 0;
            for (const t of CFG.targets) {
              const i = (CFG.modo === 'estatico' ? letras : manifest.labels).indexOf(t);
              if (i >= 0 && media[i] > pCand) { cand = t; pCand = media[i]; }
            }
          }

          pObjetivo = cand ? pCand : 0;

          if (cand !== ultima) { evidencia = []; ultima = cand; }
          if (cand) {
            evidencia.push({ t: now, ok: pCand >= umbralDe(cand) && enMovimiento });
            while (evidencia.length && now - evidencia[0].t > CONFIRMAR_MS) evidencia.shift();
          }

          const cubre = evidencia.length > 1 &&
            now - evidencia[0].t >= CONFIRMAR_MS * 0.9;
          const proporcion = evidencia.length
            ? evidencia.filter((e) => e.ok).length / evidencia.length : 0;

          if (cand && cubre && proporcion >= PROPORCION_MINIMA &&
              cand !== confirmada) {
            confirmada = cand;
            post({ type: 'confirmed', sign: cand, confidence: pCand });
          }
        }
      }

      // El HUD no necesita 12 mensajes por segundo, y cada uno cruza el puente
      // a React Native y le mueve el estado: se manda sólo cuando cambia algo
      // que se ve. Las confirmaciones van aparte y siempre salen al instante.
      const resumen = body + '|' + nManos + '|' + sign + '|' + resting + '|' +
        cubierto + '|' + Math.round(confidence * 10) +
        '|' + Math.round(msInferencia) + '|' + Math.round(pObjetivo * 20);
      if (resumen !== ultimoResumen || now - ultimoEnvio > 500) {
        ultimoResumen = resumen;
        ultimoEnvio = now;
        post({
          type: 'frame', sign, confidence,
          // El progreso dice cuánto falta para poder decidir, así que mira lo
          // mismo que listo: el tiempo que abarca la ventana Y cuántos
          // frames la pueblan. Si sólo mirara el tiempo, diría "listo" con la
          // ventana medio vacía.
          progress: ventana.length > 1
            ? Math.min(1, (now - ventana[0].t) / VENTANA_MS,
                       ventana.length / MIN_MUESTRAS) : 0,
          body, resting, hands: nManos, fps: Math.round(fpsEma),
          targetConfidence: Math.round(pObjetivo * 100) / 100,
          inferMs: Math.round(msInferencia * 10) / 10,
          canvas: ovl.width + 'x' + ovl.height,
        });
      }
    }
  }

  requestAnimationFrame(loop);
} catch (e) {
  fail(String(e?.message || e));
}
</script>
</body>
</html>`;
}
