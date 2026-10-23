import { Ionicons } from "@expo/vector-icons";
import { BlockType } from "@/features/courses/lessonContent.types";

/**
 * Title/icon per practicable exercise type, for the "Ejercicios" grid and for
 * labeling each PracticeMistake (see @/api/practice) by its block type. `key`
 * reuses the real lesson `BlockType`.
 */
export interface ExerciseTypeInfo {
  key: BlockType;
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const EXERCISE_TYPES: ExerciseTypeInfo[] = [
  {
    key: "SELECT_MEANING",
    title: "Elegí el significado",
    hint: "Ves la seña y elegís la palabra.",
    icon: "hand-left",
  },
  {
    key: "SELECT_SIGN",
    title: "Elegí la seña",
    hint: "Ves la palabra y buscás la seña.",
    icon: "search",
  },
  {
    key: "MATCH",
    title: "Unir pares",
    hint: "Emparejá señas con conceptos.",
    icon: "git-compare",
  },
  {
    key: "CONTEXT_RESPONSE",
    title: "Respuesta en contexto",
    hint: "Respondé una situación real.",
    icon: "chatbubble-ellipses",
  },
  {
    key: "VISUAL_RECOGNITION",
    title: "Reconocimiento visual",
    hint: "Identificá una secuencia de señas.",
    icon: "videocam",
  },
];

export const EXERCISE_TYPE_BY_KEY: Record<BlockType, ExerciseTypeInfo> = EXERCISE_TYPES.reduce(
  (acc, type) => ({ ...acc, [type.key]: type }),
  {} as Record<BlockType, ExerciseTypeInfo>
);

/**
 * ¿El reproductor de práctica sabe mostrar este tipo? El backend ya excluye el
 * resto (INFO, INTRODUCE_SIGN, cámara…), pero un tipo desconocido dejaba la
 * sesión en blanco o rompía la lista de errores: se descarta acá por las dudas.
 */
export function isPracticableType(type: BlockType): boolean {
  return EXERCISE_TYPE_BY_KEY[type] !== undefined;
}
