/**
 * Qué modelo de señas lleva la app y qué sabe reconocer.
 *
 * Lo que corre es el módulo nativo `modules/signa-vision` (Android): su
 * `modelo.tflite` y `senas.json` (etiquetas, umbrales, línea del espacio de
 * seña) están en `modules/signa-vision/android/src/main/assets/` y salen de
 * `signa-ml/scripts/exportar_senas_nativo.py`. Están dentro de la app —y no
 * detrás de un endpoint— porque el reconocimiento corre on-device.
 *
 * Este archivo es sólo el metadato: qué señas existen y con qué versión.
 * (`assets/models/lsa-signs-v9/` es del motor WebView viejo, ver docs/status.md.)
 *
 * Para actualizar el modelo: correr el exportador de signa-ml, regenerar
 * golden.json (`signa-ml/scripts/golden_senas_app.py`) y ajustar `labels` y
 * `version` acá.
 */

export interface ModelDescriptor {
  id: string;
  version: number;
  /**
   * Identificación out-of-fold agrupada por clip (calibrate_signs.py), no la
   * accuracy que reporta el entrenamiento: esa mide sobre un split aleatorio
   * donde las copias aumentadas de un mismo clip caen de los dos lados, y da
   * seis puntos de más.
   */
  accuracy: number;
  /** Etiquetas en el orden exacto de salida del modelo. El índice ES la clase. */
  labels: string[];
  /** Frames que consume de una: el movimiento ES la seña. */
  sequenceLength: number;
}

export const SIGNS_MODEL: ModelDescriptor = {
  // signa-ml: models/experimentos/signa_model_todo_s42 (28 señas). Lo que corre
  // en Android es el .tflite de modules/signa-vision (ModeloSenas.kt); esto es
  // el metadato de qué puede pedir un ejercicio.
  id: "lsa-signs-v13",
  version: 13,
  // Test por clip del dataset (split fijo por hash, sin copias aumentadas).
  accuracy: 0.883,
  labels: [
    "esposo",
    "cafe",
    "hermano",
    "reposo",
    "amigo",
    "bien",
    "sordo",
    "oyente",
    "comoestas",
    "hijo",
    "papa",
    "mama",
    "novio",
    "azucar",
    "nombre",
    "companero",
    "te",
    "tarjetadebito",
    "efectivo",
    "edulcorante",
    "transferencia",
    "medialunadulce",
    "cortado",
    "medialunasalada",
    "tarjetacredito",
    "lagrima",
    "mercadopago",
    "abuelo",
  ],
  sequenceLength: 30,
};

/**
 * "reposo" no es una seña: es la clase de "no estoy haciendo nada". El modelo
 * la necesita para no disparar cualquier cosa mientras la persona está quieta,
 * pero nunca es una respuesta válida ni se muestra.
 */
export const REST_LABEL = "reposo";

/** Señas que un ejercicio puede pedir (todas menos la de reposo). */
export const RECOGNIZABLE_SIGNS = SIGNS_MODEL.labels.filter((l) => l !== REST_LABEL);

/** ¿El modelo puede evaluar esta seña? */
export function modelKnows(meaning: string): boolean {
  return RECOGNIZABLE_SIGNS.includes(meaning.trim().toLowerCase());
}

/**
 * Etiqueta del modelo → seña del curso.
 *
 * El modelo se entrenó con los nombres de las carpetas del dataset y el curso
 * usa los del catálogo de señas (el que además nombra los .glb del avatar).
 * Donde difieren, esta tabla los reconcilia; el resto pasa derecho.
 */
const MEANING_POR_LABEL: Record<string, string> = {
  mama: "madre",
  papa: "padre",
};

/** Seña del curso que corresponde a una etiqueta del modelo. */
export function signMeaning(label: string): string {
  const l = label.trim().toLowerCase();
  return MEANING_POR_LABEL[l] ?? prettySign(l);
}

/** "lengua_de_senas" → "lengua de senas", para no mostrar guiones bajos. */
export function prettySign(label: string): string {
  return label.replace(/_/g, " ");
}
