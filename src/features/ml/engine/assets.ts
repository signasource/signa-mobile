/**
 * Deja los archivos del reconocedor donde el WebView pueda leerlos.
 *
 * Todo viaja dentro de la app (ver `assets/mediapipe/` y `assets/models/`),
 * pero los assets empaquetados no son archivos sueltos accesibles por URL: en
 * Android viven comprimidos dentro del APK. MediaPipe necesita cargar su .wasm
 * y su .task por ruta, así que en el primer arranque se copian a una carpeta
 * del sandbox de la app y de ahí los toma el WebView por file://.
 *
 * Se copia una sola vez: la carpeta lleva en el nombre una huella del contenido
 * de todo lo que va adentro, así que mientras nada cambie no se vuelve a tocar,
 * y en cuanto algo cambia la carpeta es otra.
 */
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system/legacy";
import { DETECTOR_WORKER } from "./detectorWorker";
import { buildRecognizerHtml, RecognizerConfig } from "./recognizerHtml";


/**
 * Nombre final → módulo empaquetado. El HTML los referencia por ese nombre.
 *
 * El tipo es `unknown` a propósito: según la plataforma y si es dev o release,
 * `require()` de un asset devuelve un id numérico, un objeto con `uri`, o una
 * string. `assetUri()` normaliza los tres casos.
 */
/**
 * De dónde salen los binarios vendorizados.
 *
 * MediaPipe y el runtime de TFLite viajan como assets porque el WebView los
 * carga por URL, no como módulos. Los paquetes npm que los originan están en
 * devDependencies y sólo sirven para regenerarlos:
 *
 *   assets/mediapipe/vision_bundle.jsasset      @mediapipe/tasks-vision
 *   assets/mediapipe/vision_wasm_internal.*     @mediapipe/tasks-vision/wasm
 *   assets/tflite/tfcore.jsasset                @tensorflow/tfjs-core
 *   assets/tflite/tfcpu.jsasset                 @tensorflow/tfjs-backend-cpu
 *   assets/tflite/tftflite.jsasset              @tensorflow/tfjs-tflite
 *   assets/tflite/tflite_web_api_*              @tensorflow/tfjs-tflite/dist
 *
 * Las versiones están clavadas: tfjs-tflite pide exactamente tfjs-core 4.9.0
 * como peer, así que subir uno sin el otro rompe la instalación.
 *
 * Los .task y los .tflite salen de signa-ml (scripts/export_*.py).
 */
const FILES: Record<string, unknown> = {
  // Se copian como .js aunque el asset se llame .jsasset: esa extensión existe
  // sólo para que Metro los trate como archivos y no intente transformarlos.
  "engine.js": require("@assets/mediapipe/engine.jsasset"),
  "vision_bundle.js": require("@assets/mediapipe/vision_bundle.jsasset"),
  // El asset se llama distinto del .wasm a propósito: Android nombra los
  // recursos sin extensión, y "vision_wasm_internal.wasm" y
  // "vision_wasm_internal.jsasset" colisionarían al compilar la APK. Al
  // copiarlo recupera el nombre que MediaPipe espera.
  "vision_wasm_internal.js": require("@assets/mediapipe/vision_wasm_loader.jsasset"),
  "vision_wasm_internal.wasm": require("@assets/mediapipe/vision_wasm_internal.wasm"),
  "pose_landmarker.task": require("@assets/mediapipe/pose_landmarker.task"),
  "hand_landmarker.task": require("@assets/mediapipe/hand_landmarker.task"),
  "manifest.json": require("@assets/models/lsa-signs-v9/manifest.json"),

  // Runtime de TFLite. Ver ENGINE en recognizerHtml.ts: se puede volver al
  // motor propio cambiando una constante, y estos archivos dejan de usarse.
  "tfcore.js": require("@assets/tflite/tfcore.jsasset"),
  "tfcpu.js": require("@assets/tflite/tfcpu.jsasset"),
  "tftflite.js": require("@assets/tflite/tftflite.jsasset"),
  "tflite_web_api_cc_simd.js": require("@assets/tflite/tflite_web_api_loader.jsasset"),
  "tflite_web_api_cc_simd.wasm": require("@assets/tflite/tflite_web_api_cc_simd.wasm"),
  "modelo.tflite": require("@assets/tflite/modelo.tflite"),
  // Abecedario: come landmarks crudos y calcula sus features adentro del grafo.
  "alfabeto.tflite": require("@assets/tflite/alfabeto.tflite"),
  "alfabeto.json": require("@assets/models/lsa-alphabet/manifest.json"),
};

let staging: Promise<string> | null = null;

/** Copia (una vez) y devuelve la carpeta file:// con todo adentro. */
/**
 * tfjs-tflite elige el nombre del runtime según lo que detecte del dispositivo
 * (SIMD, hilos) y lo pide con un <script src>. Si pide una variante que no
 * está, el script falla en silencio y el error que llega es "_malloc of
 * undefined". Llevamos una sola variante —la no threaded, que es la que puede
 * correr sin aislamiento de origen— y la dejamos bajo los cuatro nombres: el
 * .wasm que cada una carga está escrito adentro del propio archivo.
 */
const ALIAS_TFLITE = [
  "tflite_web_api_cc.js",
  "tflite_web_api_cc_threaded.js",
  "tflite_web_api_cc_simd_threaded.js",
];

export function stageRecognizerAssets(): Promise<string> {
  if (!staging) staging = copyAll().catch((err) => {
    staging = null;          // que un fallo no deje el estado pegado
    throw err;
  });
  return staging;
}

async function alias(dir: string, origen: string, nombres: string[]): Promise<void> {
  for (const nombre of nombres) {
    await FileSystem.copyAsync({ from: dir + origen, to: dir + nombre });
  }
}

/**
 * Huella del contenido de todo lo que se copia.
 *
 * Antes esto era un número que había que acordarse de subir a mano cada vez que
 * cambiaba un asset. Lo olvidé una vez y el teléfono siguió ejecutando el
 * `engine.js` viejo —roto— aunque el APK traía el nuevo: la carpeta ya existía
 * con su marca y nadie la volvía a mirar. Un número que hay que acordarse de
 * subir no es una versión, es una trampa.
 *
 * Metro deja el md5 de cada asset en su registro, así que la huella sale de ahí
 * sin leer los archivos. Los .json vienen ya parseados y se hashean serializados.
 */
function huellaDeAssets(): string {
  const partes: string[] = [];
  for (const [nombre, mod] of Object.entries(FILES)) {
    if (isPlainData(mod)) {
      partes.push(`${nombre}:${hash(JSON.stringify(mod))}`);
      continue;
    }
    let firma = "";
    if (typeof mod === "number") {
      const asset = Asset.fromModule(mod);
      firma = asset.hash ?? asset.uri ?? "";
    } else if (typeof mod === "string") {
      firma = mod;
    } else if (mod && typeof mod === "object") {
      const m = mod as { hash?: string; localUri?: string; uri?: string };
      firma = m.hash ?? m.localUri ?? m.uri ?? "";
    }
    partes.push(`${nombre}:${firma}`);
  }
  return hash(partes.join("|"));
}

async function copyAll(): Promise<string> {
  const DIR = `${FileSystem.documentDirectory}signa-recognizer-${huellaDeAssets()}/`;
  const marca = `${DIR}.ready`;
  if ((await FileSystem.getInfoAsync(marca)).exists) return DIR;

  await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });

  for (const [nombre, mod] of Object.entries(FILES)) {
    // Metro parsea los .json como módulo, así que `require` ya devuelve el
    // objeto. Se escribe tal cual en vez de copiar un archivo que no existe.
    if (nombre.endsWith(".json") && isPlainData(mod)) {
      await FileSystem.writeAsStringAsync(DIR + nombre, JSON.stringify(mod));
      continue;
    }

    const origen = await assetUri(nombre, mod);
    if (origen.startsWith("http://") || origen.startsWith("https://")) {
      // En desarrollo Metro sirve los assets por HTTP; hay que bajarlos.
      await FileSystem.downloadAsync(origen, DIR + nombre);
    } else {
      await FileSystem.copyAsync({ from: origen, to: DIR + nombre });
    }
  }

  await alias(DIR, "tflite_web_api_cc_simd.js", ALIAS_TFLITE);

  await FileSystem.writeAsStringAsync(marca, "ok");
  await borrarCarpetasViejas(DIR);
  return DIR;
}

/** Las copias de versiones anteriores son 41 MB cada una: no se quedan. */
async function borrarCarpetasViejas(actual: string): Promise<void> {
  try {
    const raiz = FileSystem.documentDirectory;
    if (!raiz) return;
    for (const nombre of await FileSystem.readDirectoryAsync(raiz)) {
      if (!nombre.startsWith("signa-recognizer-")) continue;
      const ruta = `${raiz}${nombre}/`;
      if (ruta === actual) continue;
      await FileSystem.deleteAsync(ruta, { idempotent: true });
    }
  } catch {
    // Que no se pueda limpiar no es motivo para no reconocer señas.
  }
}

/** Un objeto de datos (JSON ya parseado por Metro), no un descriptor de asset. */
function isPlainData(mod: unknown): boolean {
  return (
    !!mod &&
    typeof mod === "object" &&
    !("uri" in mod) &&
    !("localUri" in mod) &&
    !("__packager_asset" in mod)
  );
}

/**
 * URI local de un asset empaquetado, sea cual sea la forma que devuelva
 * `require()`.
 *
 * No se puede asumir una sola: en una build de release es un id numérico, con
 * Metro en desarrollo puede ser un objeto con `uri` apuntando al server, y
 * algunas plataformas devuelven la ruta como string.
 */
async function assetUri(nombre: string, mod: unknown): Promise<string> {
  if (typeof mod === "string") return mod;

  if (typeof mod === "number") {
    const asset = Asset.fromModule(mod);
    await asset.downloadAsync();
    const uri = asset.localUri ?? asset.uri;
    if (!uri) throw new Error(`El asset ${nombre} no expone una URI`);
    return uri;
  }

  if (mod && typeof mod === "object") {
    const uri = (mod as { localUri?: string; uri?: string }).localUri
      ?? (mod as { uri?: string }).uri;
    if (uri) return uri;
  }

  throw new Error(`No se pudo resolver el asset ${nombre} (${typeof mod})`);
}

/** Escribe el HTML del reconocedor junto a los assets y devuelve su URL. */
export async function stageRecognizerPage(
  config: Omit<RecognizerConfig, "baseUrl" | "workerUrl">,
): Promise<string> {
  const dir = await stageRecognizerAssets();

  // El worker va firmado por su contenido por el mismo motivo que la página: un
  // nombre fijo se queda cacheado y se sigue ejecutando el código viejo.
  const worker = `detector-${hash(DETECTOR_WORKER)}.js`;
  if (!(await FileSystem.getInfoAsync(dir + worker)).exists) {
    await FileSystem.writeAsStringAsync(dir + worker, DETECTOR_WORKER);
  }

  const html = buildRecognizerHtml({ ...config, baseUrl: dir, workerUrl: worker });

  // El nombre incluye un hash del contenido, y no es un detalle: el WebView de
  // Android cachea por URL. Escribiendo siempre en "recognizer.html" seguía
  // sirviendo la copia vieja aunque el archivo en disco hubiera cambiado, así
  // que un cambio en el dibujo o en la lógica no se veía hasta reinstalar.
  //
  // El HTML se sirve desde la MISMA carpeta que los assets: así el WebView los
  // pide con el mismo origen file:// y no hay que pelear con CORS.
  const page = `${dir}recognizer-${hash(html)}.html`;
  if (!(await FileSystem.getInfoAsync(page)).exists) {
    await FileSystem.writeAsStringAsync(page, html);
    await limpiarPaginasViejas(dir, page, worker);
  }
  return page;
}

/** Hash corto y estable del contenido (djb2). Sólo para nombrar el archivo. */
function hash(text: string): string {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

/** Borra páginas de versiones anteriores para no acumular basura en el sandbox. */
async function limpiarPaginasViejas(dir: string, actual: string, worker: string) {
  const vigentes = [actual, dir + worker];
  try {
    const archivos = await FileSystem.readDirectoryAsync(dir);
    await Promise.all(
      archivos
        .filter(
          (f) =>
            (f.startsWith("recognizer") || f.startsWith("detector-")) &&
            !vigentes.includes(dir + f),
        )
        .map((f) => FileSystem.deleteAsync(dir + f, { idempotent: true })),
    );
  } catch {
    // Si falla, no importa: son unos KB y no afecta al funcionamiento.
  }
}
