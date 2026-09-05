import { lessonsApi } from "@/api/lessons";
import { getCachedLesson, setCachedLesson } from "./lessonCache";
import { preloadLessonAnimations } from "./animationPreload";

/** IDs actualmente en descarga para evitar requests duplicados. */
const warming = new Set<string>();

/**
 * Descarga una lección en background, la almacena en cache y prefetchea sus
 * animaciones. Si la lección ya está en cache o en descarga no hace nada.
 */
export function warmLesson(lessonId: string): void {
  if (warming.has(lessonId) || getCachedLesson(lessonId)) return;
  warming.add(lessonId);
  lessonsApi
    .getLesson(lessonId)
    .then((res) => {
      setCachedLesson(lessonId, res.data);
      return preloadLessonAnimations(res.data.blocks);
    })
    .catch(() => {})
    .finally(() => warming.delete(lessonId));
}

export function warmLessons(lessonIds: string[]): void {
  lessonIds.forEach(warmLesson);
}
