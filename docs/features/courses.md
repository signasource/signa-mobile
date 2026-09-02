# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API changes.
> Sources: src/features/courses/

The **Inicio (Home) roadmap** is wired to real `signa-api` content. Flat course/lesson browsing
(`CoursesListScreen` / `LessonScreen`) is still a **stub**. Module under `src/features/courses/`.

- `api.ts`:
  - **Real** — `getSignLanguages()` (`GET /sign-languages`), `getCatalog(signLanguageId)`
    (`GET /courses?signLanguageId=`, Spring page), `getRoadmap(courseId)`
    (`GET /learning/tracking/courses/{courseId}/roadmap`). Response types: `SignLanguage`,
    `CourseSummary`, `RoadmapTopic`/`RoadmapLesson` (`state`: `COMPLETED` / `IN_PROGRESS` /
    `AVAILABLE` / `LOCKED`), `CourseRoadmap`. See [../api/endpoints.md](../api/endpoints.md).
  - **Stub** — `list()` / `getById()` / `getLesson()`: tentative flat-content paths, used only by
    `CoursesListScreen`; not confirmed against the backend.
- `roadmap.ts`: **presentation helpers** over the API types — `LESSON_STATE_VIS` (per-state
  node/chip visuals in theme tokens), `accentFor(topic)` (per-topic color+icon, since the backend
  doesn't send them, keyed by `topic.order`), and `progressFor(topic)`.
- `types.ts`: `Course`, `Lesson`, `LessonBlock`, `LessonProgress` (used by the stub screens).
- `screens/CoursesListScreen.tsx`: stub — calls `coursesApi.list()` (loading → error).
- `screens/LessonScreen.tsx`: placeholder lesson player; receives `{ courseId, lessonId }` params.

### Inicio (Home) roadmap screen

`src/screens/tabs/HomeTabScreen.tsx` renders the vertical lesson recorrido from `Inicio.dc.html`
(Claude Design): course header + scrollable unit/lesson timeline + lesson-detail bottom sheet.
- **Content** is **real**: on mount it resolves LSA via `getSignLanguages()`, takes the **first**
  course from `getCatalog(lsa.id)`, and loads `getRoadmap(course.id)`. Shows a spinner while loading
  and an error + "Reintentar" on failure. Units = topics; each unit header shows the topic's
  `title` as the (uppercase) kicker and its `subtitle` as the bold line below. Lesson nodes = the
  topic's lessons with their per-user `state`.
- **Header stats** (streak / gems / XP): `usersApi.getStats()` + `inventoryApi.getMyInventory()`,
  loaded in parallel and non-blocking — a stats failure still renders the roadmap.
- **Lesson CTA** (Empezar / Seguir / Repasar for actionable states; Bloqueada disabled) just closes
  the sheet. TODO: navigate to the `Lesson` route once `LessonScreen`'s player exists.

To advance: build `LessonScreen`'s render from the real block structure (`GET /lessons/{id}`) and
wire the roadmap lesson CTA to navigate into it; confirm/replace the `list`/`getById`/`getLesson`
stub paths.
