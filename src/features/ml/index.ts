/**
 * Reconocimiento de señas en vivo, todo dentro del teléfono.
 *
 * El modelo entrenado en `signa-ml` viaja adentro de la app (assets/models) y
 * la inferencia corre local: no hay servidor de por medio. Ver
 * docs/features/ml.md.
 */
export { LiveSignRecognizer } from "./components/LiveSignRecognizer";
export type { LiveFrame } from "./components/LiveSignRecognizer";
export { SIGNS_MODEL, REST_LABEL, modelKnows, prettySign, signMeaning } from "./models/registry";
export type { ModelDescriptor } from "./models/registry";
export { stageRecognizerAssets } from "./engine/assets";
