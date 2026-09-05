import { Ionicons } from "@expo/vector-icons";
import { BlockType } from "@/features/courses/lessonContent.types";

/**
 * Content for the "Práctica libre" tab. There is no `signa-api` endpoint yet
 * for a standalone practice session, a per-user learned-signs list, or a
 * mistakes review queue (see docs/features/practice.md) — everything here is
 * local placeholder content, same as `CoursesListScreen`. `key` reuses the
 * real lesson `BlockType`s so wiring an actual exercise later is a drop-in.
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

/** Placeholder catalog of already-learned signs, until a real endpoint exists. */
export const PRACTICE_SIGNS: string[] = [
  "Hola", "Gracias", "Por favor", "Sí", "No", "Buenos días", "Buenas noches", "Perdón",
  "Casa", "Familia", "Mamá", "Papá", "Hermano", "Amigo", "Trabajo", "Escuela",
  "Agua", "Comer", "Ayuda", "Nombre", "Aprender", "Señas", "Feliz", "Cansado",
];

export interface PracticeMistake {
  meaning: string;
  type: BlockType;
  misses: number;
}

export const PRACTICE_MISTAKES: PracticeMistake[] = [
  { meaning: "Hermano", type: "SELECT_MEANING", misses: 3 },
  { meaning: "Cansado", type: "MATCH", misses: 2 },
  { meaning: "Por favor", type: "SELECT_SIGN", misses: 2 },
  { meaning: "Escuela", type: "VISUAL_RECOGNITION", misses: 1 },
  { meaning: "Perdón", type: "CONTEXT_RESPONSE", misses: 1 },
];
