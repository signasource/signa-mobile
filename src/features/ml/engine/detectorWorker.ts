/**
 * MediaPipe corriendo en un hilo aparte.
 *
 * `detectForVideo` es WASM síncrono: mientras corre, el hilo principal no hace
 * nada más. Medido en un teléfono real son ~75 ms de bloqueo por ciclo de 91,
 * y por eso el bucle de dibujo, que debería ir a 60 fps, iba a 21: la
 * interpolación del esqueleto, el arrastre del PiP y los toques se repartían
 * los ~16 ms que quedaban libres.
 *
 * Acá adentro la detección no le saca tiempo a nadie. Ojo: NO la hace más
 * rápida — los mismos 61 ms de manos siguen costando 61 ms, sólo que en otro
 * lado. Los fps de reconocimiento no cambian; lo que cambia es que la pantalla
 * deja de ir a los tirones.
 *
 * El modelo de señas se queda en el hilo principal a propósito: son 6 ms, y el
 * runtime de TFLite resuelve la ruta de su .wasm mirando el <script> que lo
 * cargó — un camino que acá no existe y que ya nos costó caro una vez.
 *
 * Se escribe como texto y no como asset porque lo escupe `stageRecognizerPage`
 * con el nombre firmado por su contenido, igual que la página.
 */
export const DETECTOR_WORKER = `
// --- lectura local ---------------------------------------------------------
// fetch() no lee file:// por norma y acá no hay página donde parchearlo, así
// que todo entra por XHR, que el WebView sí permite.
function leer(url, tipo) {
  return new Promise((ok, no) => {
    const x = new XMLHttpRequest();
    x.open('GET', url, true);
    x.responseType = tipo;
    x.onload = () => ok(x.response);
    x.onerror = () => no(new Error('no se pudo leer ' + url.split('/').pop()));
    x.send();
  });
}

let pose = null, manos = null, delegado = 'GPU';

async function iniciar(baseUrl, forzar) {
  const vision = await import(baseUrl + 'vision_bundle.js');

  // El loader de MediaPipe pide su .wasm con fetch, así que se lo damos ya
  // leído, como blob de este mismo hilo.
  const wasmBin = await leer(baseUrl + 'vision_wasm_internal.wasm', 'blob');

  // El runtime de MediaPipe se carga acá a mano, y wasmLoaderPath va VACÍO.
  //
  // Su cargador hace: si existe importScripts lo usa, y si tira TypeError cae a
  // import(). En un worker módulo —que es lo que necesitamos, porque
  // vision_bundle.js ES un módulo ES— importScripts existe pero tira, así que
  // termina importando vision_wasm_internal.js como módulo. Y ese archivo es un
  // script clásico que hace "var ModuleFactory = ...": dentro de un módulo ese
  // var queda en el ámbito del módulo y nunca llega a self.ModuleFactory. El
  // error que se ve es "ModuleFactory not set".
  //
  // Con eval indirecto el var cae en el ámbito global del worker, que es lo que
  // MediaPipe busca. Y con wasmLoaderPath vacío ni siquiera intenta cargarlo:
  // sólo comprueba que la factory esté puesta.
  const loaderSrc = await leer(baseUrl + 'vision_wasm_internal.js', 'text');
  // MediaPipe borra la factory después de instanciar, así que hay que reponerla
  // antes de cada detector.
  // El salto va por fromCharCode y no escapado: este archivo es un template
  // dentro de otro, y un \\n acá termina siendo un salto real adentro de las
  // comillas, que es un error de sintaxis.
  const ponerFactory = () => (0, eval)(
    loaderSrc + String.fromCharCode(10) + ';self.ModuleFactory=ModuleFactory;');

  const fileset = {
    wasmLoaderPath: '',
    wasmBinaryPath: URL.createObjectURL(wasmBin),
  };

  const poseBuf = await leer(baseUrl + 'pose_landmarker.task', 'arraybuffer');
  const handBuf = await leer(baseUrl + 'hand_landmarker.task', 'arraybuffer');

  async function crear(d) {
    ponerFactory();
    const p = await vision.PoseLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: new Uint8Array(poseBuf), delegate: d },
      runningMode: 'VIDEO',
      numPoses: 1,
    });
    ponerFactory();
    const m = await vision.HandLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetBuffer: new Uint8Array(handBuf), delegate: d },
      runningMode: 'VIDEO',
      numHands: 2,
      // Bajar el piso de seguimiento evita que MediaPipe vuelva a correr el
      // detector de palmas —lo más caro del frame— cada vez que una mano se
      // gira o se tapa a medias. Mientras la siga viendo, la sigue.
      minHandPresenceConfidence: 0.3,
      minTrackingConfidence: 0.3,
    });
    return [p, m];
  }

  // La GPU dentro de un worker necesita WebGL por OffscreenCanvas. Donde no lo
  // haya, esto tira y seguimos en CPU. Y hay un caso peor que tirar: que cree
  // el detector y después no devuelva nunca un frame, así que la página puede
  // pedir CPU de entrada (ver el vigilante).
  if (forzar) {
    delegado = forzar;
    [pose, manos] = await crear(forzar);
  } else {
    try {
      [pose, manos] = await crear('GPU');
    } catch (e) {
      delegado = 'CPU';
      [pose, manos] = await crear('CPU');
    }
  }
  postMessage({ tipo: 'listo', delegado });
}

let ultimaPose = null;

function detectar(bitmap, ts, conPose) {
  // Los cronómetros son dos performance.now() por etapa y valen lo que cuestan:
  // sin ellos, "va lento" no se puede diagnosticar sin adivinar.
  let poseMs = 0;
  if (conPose || !ultimaPose) {
    const t0 = performance.now();
    ultimaPose = pose.detectForVideo(bitmap, ts).landmarks?.[0] ?? null;
    poseMs = performance.now() - t0;
  }
  const t1 = performance.now();
  const r = manos.detectForVideo(bitmap, ts);
  const handsMs = performance.now() - t1;
  const { izq, der, lado, world } = asignarManos(r);
  return { pose: ultimaPose, izq, der, lado, world, poseMs, handsMs };
}

// Muñeca de cada mano en el frame anterior, para no perder de vista cuál es cuál.
let previaIzq = null, previaDer = null;

const dist = (a, b) => (a && b ? Math.hypot(a[0].x - b.x, a[0].y - b.y) : Infinity);

/**
 * Reparte las manos detectadas entre izquierda y derecha.
 *
 * La "handedness" de MediaPipe es la de la persona —la misma convención con la
 * que se entrenó— pero se decide en cada frame por separado, y con movimiento
 * rápido o la mano girada se equivoca: el esqueleto salta de una mano a la
 * otra. Mientras haya historia, se asigna por cercanía a dónde estaba cada mano
 * un frame antes, que es mucho más estable. La etiqueta de MediaPipe se usa
 * sólo para arrancar, cuando no hay de dónde agarrarse.
 */
function asignarManos(r) {
  const lms = r.landmarks ?? [];
  if (!lms.length) {
    previaIzq = previaDer = null;
    return { izq: null, der: null };
  }

  const porEtiqueta = () => {
    let izq = null, der = null;
    for (let i = 0; i < lms.length; i++) {
      const lado = r.handedness?.[i]?.[0]?.categoryName;
      if (lado === 'Left') izq = lms[i];
      else if (lado === 'Right') der = lms[i];
    }
    return { izq, der };
  };

  let izq = null, der = null;

  if (lms.length >= 2 && previaIzq && previaDer) {
    // Dos manos y las dos ubicadas: se resuelve por cercanía.
  } else if (lms.length === 1 && (previaIzq || previaDer)) {
    // Una sola y hay dónde compararla.
  } else {
    // Sin historia suficiente —el arranque, o una mano que reaparece— no queda
    // más que creerle a MediaPipe.
    ({ izq, der } = porEtiqueta());
    previaIzq = izq ? { x: izq[0].x, y: izq[0].y } : null;
    previaDer = der ? { x: der[0].x, y: der[0].y } : null;
    return { izq, der };
  }

  if (lms.length === 1) {
    // Una sola: va al lado del que estaba más cerca.
    const m = lms[0];
    if (dist(m, previaIzq) <= dist(m, previaDer)) izq = m; else der = m;
  } else {
    // Dos: la combinación que deja a las dos más cerca de donde estaban.
    const directo = dist(lms[0], previaIzq) + dist(lms[1], previaDer);
    const cruzado = dist(lms[1], previaIzq) + dist(lms[0], previaDer);
    if (directo <= cruzado) { izq = lms[0]; der = lms[1]; }
    else { izq = lms[1]; der = lms[0]; }
  }

  previaIzq = izq ? { x: izq[0].x, y: izq[0].y } : null;
  previaDer = der ? { x: der[0].x, y: der[0].y } : null;
  return { izq, der, ...principal(r) };
}

/**
 * La mano con más confianza, en coordenadas métricas, y de qué lado es.
 *
 * El modelo estático mira una sola mano y necesita las world landmarks, que
 * son un bloque entero de sus features. La etiqueta del lado decide si hay que
 * espejarla: el dataset trata todo como mano derecha.
 */
function principal(r) {
  const lms = r.landmarks ?? [];
  if (!lms.length) return { lado: null, world: null };
  let mejor = 0;
  for (let i = 1; i < lms.length; i++) {
    if ((r.handedness?.[i]?.[0]?.score ?? 0) > (r.handedness?.[mejor]?.[0]?.score ?? 0)) mejor = i;
  }
  return {
    lado: r.handedness?.[mejor]?.[0]?.categoryName ?? 'Right',
    world: r.worldLandmarks?.[mejor] ?? null,
    mano: lms[mejor],
  };
}

onmessage = async (e) => {
  const m = e.data;
  if (m.tipo === 'init') {
    try {
      await iniciar(m.baseUrl, m.forzar);
    } catch (err) {
      postMessage({ tipo: 'error', message: 'detector: ' + (err && err.message || err) });
    }
    return;
  }

  if (m.tipo === 'frame') {
    if (!pose || !manos) { m.bitmap.close(); return; }
    try {
      const r = detectar(m.bitmap, m.ts, m.conPose);
      postMessage({ tipo: 'resultado', ts: m.ts, ...r });
    } catch (err) {
      postMessage({ tipo: 'error', message: 'detector: ' + (err && err.message || err) });
    } finally {
      // Sin esto el bitmap queda vivo hasta que pase el recolector, y son
      // doce por segundo.
      m.bitmap.close();
    }
  }
};
`;
