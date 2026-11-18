/**
 * Tipos de dominio para cursos/lecciones. Espejan la estructura conceptual
 * de content.yml descripta en el PDF de arquitectura (signa_flujo_y_contexto_ia).
 *
 * Cuando el back defina el modelo real ajustar estos tipos y
 * api.ts en este mismo folder el resto de la app (screens) no deberia
 * necesitar cambios grandes si la forma general se mantiene.
 */

export type BlockType = "multiplechoice" | "video" | "practice" | string;

export interface LessonBlock {
  id: string;
  type: BlockType;
  sign: string; 
  options?: string[]; 
  animationAssetUrl?: string; 
}

export interface Lesson {
  id: string;
  title: string;
  blocks: LessonBlock[];
}

export interface Course {
  id: string;
  title: string;
  description?: string;
  lessons: Lesson[];
}

export interface LessonProgress {
  lessonId: string;
  completedBlockIds: string[];
  completedAt?: string;
}
