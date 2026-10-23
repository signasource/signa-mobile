/**
 * Qué modelo de señas lleva la app y qué sabe reconocer.
 *
 * El manifiesto vive en `assets/models/lsa-signs-v9/` y el .tflite en
 * `assets/tflite/`; son copia
 * de lo que entrena `signa-ml`. Están dentro de la app —y no detrás de un
 * endpoint— porque el reconocimiento corre on-device: no hay servidor de
 * inferencia que hostear ni video que enviar a ningún lado.
 *
 * Este archivo es sólo el metadato: qué señas existen y con qué versión. El
 * motor de inferencia está en `../engine/`.
 *
 * Para actualizar el modelo: regenerar `weights.bin` + `manifest.json` desde
 * signa-ml y ajustar `labels` y `version` acá.
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
  id: "lsa-signs-v9",
  version: 9,
  accuracy: 0.833,
  labels: [
    "hermano",
    "reposo",
    "amigo",
    "papa",
    "mama",
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
