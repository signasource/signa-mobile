/**
 * Tipos del contenido real de una lección, tal como lo sirve
 * `GET /lessons/{id}` (LessonController -> LessonDetailResponse).
 *
 * `LessonBlockResponse.config` llega como un string JSON (el mismo JSON que
 * ContentLoader arma a partir del YAML de la lección, ver
 * signa-api/content/dto/yaml/LessonBlockDto.java). Jackson global usa
 * snake_case, pero ese campo es un JsonNode crudo: conserva las claves tal
 * cual están escritas en el .yml (p. ej. "sign_sequence", "keep_order"),
 * por eso los configs de abajo usan esos mismos nombres en vez de camelCase.
 */

export type BlockType =
  | "INFO"
  | "SELECT_MEANING"
  | "SELECT_SIGN"
  | "CONTEXT_RESPONSE"
  | "MATCH"
  | "VISUAL_RECOGNITION";

export interface MythEntry {
  title: string;
  myth: string;
  reality: string;
}

export interface InfoConfig {
  title: string;
  text: string;
  myths?: MythEntry[];
}

export interface SelectMeaningConfig {
  sign: string;
  options: string[];
}

export interface SelectSignConfig {
  word: string;
  options: string[];
}

export interface ContextResponseConfig {
  question: string;
  answer: string;
  options: string[];
}

export interface MatchConfig {
  concepts: string[];
}

export interface VisualRecognitionConfig {
  sign_sequence: string[];
  options: string[];
  keep_order: boolean;
}

export type BlockConfigFor<T extends BlockType> = T extends "INFO"
  ? InfoConfig
  : T extends "SELECT_MEANING"
    ? SelectMeaningConfig
    : T extends "SELECT_SIGN"
      ? SelectSignConfig
      : T extends "CONTEXT_RESPONSE"
        ? ContextResponseConfig
        : T extends "MATCH"
          ? MatchConfig
          : VisualRecognitionConfig;

/** Espeja LessonBlockResponse.java: config llega como string, no parseado. */
export interface LessonContentBlock {
  id: string;
  type: BlockType;
  order: number;
  config: string;
  xpReward: number | null;
}

/** Espeja LessonDetailResponse.java. */
export interface LessonContent {
  id: string;
  name: string;
  description: string;
  order: number;
  blocks: LessonContentBlock[];
}

export function parseBlockConfig<T extends BlockType>(block: LessonContentBlock): BlockConfigFor<T> {
  return JSON.parse(block.config) as BlockConfigFor<T>;
}

/**
 * Returns the set of sign meanings that are the *subject* of each block —
 * i.e. the signs a user is actively learning, not distractor options.
 *
 * - SELECT_MEANING → `sign` (the animation shown)
 * - SELECT_SIGN    → `word`  (the concept whose sign the user must find)
 * - CONTEXT_RESPONSE → `answer`
 * - MATCH          → all `concepts`
 * - VISUAL_RECOGNITION → all `sign_sequence` entries
 * - INFO           → (none, no sign being tested)
 */
export function extractLessonSignNames(lesson: { blocks: LessonContentBlock[] }): string[] {
  const names = new Set<string>();
  for (const block of lesson.blocks) {
    switch (block.type as BlockType) {
      case "SELECT_MEANING":
        names.add(parseBlockConfig<"SELECT_MEANING">(block).sign);
        break;
      case "SELECT_SIGN":
        names.add(parseBlockConfig<"SELECT_SIGN">(block).word);
        break;
      case "CONTEXT_RESPONSE":
        names.add(parseBlockConfig<"CONTEXT_RESPONSE">(block).answer);
        break;
      case "MATCH":
        parseBlockConfig<"MATCH">(block).concepts.forEach((c) => names.add(c));
        break;
      case "VISUAL_RECOGNITION":
        parseBlockConfig<"VISUAL_RECOGNITION">(block).sign_sequence.forEach((s) => names.add(s));
        break;
    }
  }
  return [...names];
}
