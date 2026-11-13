import { apiClient } from "@/api/client";
import { Course, Lesson } from "./types";

/** Lengua de señas (`GET /sign-languages`). LSA tiene `code: "LSA"`. */
export interface SignLanguage {
  id: string;
  code: string;
  name: string;
  countryCode: string;
}

export type CourseStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

/** Resumen de curso del catálogo (`GET /courses?signLanguageId=`). */
export interface CourseSummary {
  id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  isFree: boolean;
  /** Precio del pago único (ARS) para cursos pagos; null para los gratuitos. */
  price: number | null;
  /** `true` si el usuario ya tiene acceso (gratis unido, comprado o por organización). */
  owned: boolean;
  status: CourseStatus;
  signLanguageCode: string;
}

/** Ficha pública de un curso (`GET /courses/{id}`), calculada del contenido publicado. */
export interface CourseDetail {
  id: string;
  name: string;
  description?: string;
  isFree: boolean;
  price: number | null;
  owned: boolean;
  status: CourseStatus;
  unitCount: number;
  lessonCount: number;
  /** Señas distintas que enseña el curso. */
  signCount: number;
  /** Algún ejercicio usa reconocimiento con cámara. */
  hasCameraPractice: boolean;
  /** Tipos de ejercicio distintos (`BlockType`, sin `INFO` ni `INTRODUCE_SIGN`). */
  exerciseTypes: string[];
  /** Significado de la primera seña que enseña, o null si no enseña ninguna. */
  sampleSign: string | null;
  topics: CourseDetailTopic[];
}

export interface CourseDetailTopic {
  id: string;
  title: string;
  subtitle?: string;
  order: number;
  lessons: { name: string; signs: string[] }[];
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
  signsCount: number;
  /**
   * Sign meanings taught by this lesson, e.g. ["hola", "gracias"].
   * Populated server-side by BlockSignExtractor — requires backend support
   * in GET /learning/tracking/courses/{id}/roadmap. Falls back to client-side
   * extraction from lesson content when absent.
   */
  signsLearned?: string[];
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

  /** Catálogo de cursos de una lengua de señas (solo publicados). */
  getCatalog: (signLanguageId: string) =>
    apiClient.get<Page<CourseSummary>>("/courses", { params: { signLanguageId, status: "PUBLISHED" } }),

  /** Ficha del curso (también para quien todavía no lo tiene). */
  getDetail: (courseId: string) => apiClient.get<CourseDetail>(`/courses/${courseId}`),

  /** Recorrido personalizado del curso: temas con sus lecciones y estado por lección. */
  getRoadmap: (courseId: string) =>
    apiClient.get<CourseRoadmap>(`/learning/tracking/courses/${courseId}/roadmap`),
};
