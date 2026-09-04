import { LessonContent } from "@/features/courses/lessonContent.types";

const cache = new Map<string, LessonContent>();

export function getCachedLesson(lessonId: string): LessonContent | undefined {
  return cache.get(lessonId);
}

export function setCachedLesson(lessonId: string, content: LessonContent): void {
  cache.set(lessonId, content);
}
