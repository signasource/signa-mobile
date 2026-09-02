import { apiClient } from "@/api/client";
import { Course, Lesson } from "./types";

/** Lengua de señas (`GET /sign-languages`). LSA tiene `code: "LSA"`. */
export interface SignLanguage {
  id: string;
  code: string;
  name: string;
  countryCode: string;
}

/** Resumen de curso del catálogo (`GET /courses?signLanguageId=`). */
export interface CourseSummary {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isFree: boolean;
  signLanguageCode: string;
}

/** Página de Spring Data — sólo consumimos `content`. */
export interface Page<T> {
  content: T[];
}

export type RoadmapLessonState = "COMPLETED" | "IN_PROGRESS" | "AVAILABLE" | "LOCKED";

export interface RoadmapLesson {
  id: string;
  code: string;
  name: string;
  description: string;
  order: number;
  blockCount: number;
  xpTotal: number;
  state: RoadmapLessonState;
}

export interface RoadmapTopic {
  id: string;
  code: string;
  title: string;
  subtitle?: string;
  description: string;
  order: number;
  lessons: RoadmapLesson[];
}

export interface CourseRoadmap {
  courseId: string;
  courseName: string;
  activeVersion: string;
  topics: RoadmapTopic[];
}

export const coursesApi = {
  /**
   * STUB - paths tentativos de contenido plano, usados por `CoursesListScreen`. No confirmados
   * contra el back real; el contenido real de la pantalla de Inicio va por `getRoadmap`.
   */
  list: () => apiClient.get<Course[]>("/courses"),
  getById: (courseId: string) => apiClient.get<Course>(`/courses/${courseId}`),
  getLesson: (courseId: string, lessonId: string) =>
    apiClient.get<Lesson>(`/courses/${courseId}/lessons/${lessonId}`),

  /** Lenguas de señas sembradas en el back (para resolver el `signLanguageId` de LSA). */
  getSignLanguages: () => apiClient.get<SignLanguage[]>("/sign-languages"),

  /** Catálogo de cursos de una lengua de señas. */
  getCatalog: (signLanguageId: string) =>
    apiClient.get<Page<CourseSummary>>("/courses", { params: { signLanguageId } }),

  /** Recorrido personalizado del curso: temas con sus lecciones y estado por lección. */
  getRoadmap: (courseId: string) =>
    apiClient.get<CourseRoadmap>(`/learning/tracking/courses/${courseId}/roadmap`),
};
