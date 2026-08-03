# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API is confirmed.
> Sources: src/features/courses/

Status: **stub** (frontend ready, backend pending). Module under `src/features/courses/`.

- `screens/CoursesListScreen.tsx`: already calls `GET /courses` (shows loading → error until the endpoint exists).
- `screens/LessonScreen.tsx`: placeholder lesson player; receives `{ courseId, lessonId }` params.
- `types.ts`: `Course`, `Lesson`, `LessonBlock`, `LessonProgress`.
- `api.ts`: **STUB** — tentative paths (`/courses`, `/courses/{id}`, `/courses/{courseId}/lessons/{lessonId}`). Backend has no content endpoints yet. See [../api/endpoints.md](../api/endpoints.md).

To advance: confirm real endpoints with `signa-api`, adjust `api.ts` + `types.ts`, and build `LessonScreen`'s render from the real block structure.
