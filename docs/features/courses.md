# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API changes.
> Sources: src/features/courses/, src/api/lessons.ts, src/api/learning.ts, src/screens/tabs/HomeTabScreen.tsx

Status: **mixed**. The **Inicio (Home) roadmap** is wired to real `signa-api` content, and the
lesson player (`LessonScreen`) is real and wired to `signa-api`. Flat course/lesson browsing
(`CoursesListScreen`) is still a **stub** — nothing navigates to `Lesson` from it yet.

## Lesson player — real

`GET /lessons/{id}` (`lessonsApi.getLesson`, see [../api/endpoints.md](../api/endpoints.md)) returns
the full block list for one lesson — the same content `ContentLoader` reads from a course's
`.yml` files (e.g. `signa-api/src/main/resources/content/LSA/basic-course/topic-01.yml`) at
startup and persists as `Lesson` + `LessonBlock` rows. One lesson in the yaml (`lessons[].blocks`)
maps 1:1 to one `LessonContent.blocks[]` here; each block's `type` is the yaml's `type:` and its
`config` is the yaml's `config:` section, serialized to JSON with the same key casing (see
[../api/types.md](../api/types.md) for the exact per-type shape).

- `lessonContent.types.ts`: `LessonContent`, `LessonContentBlock`, the six `BlockType`s and their
  config interfaces, plus `parseBlockConfig<T>(block)` to `JSON.parse` a block's `config` string.
- `screens/LessonScreen.tsx`: orchestrates the player — loads the lesson (`route.params.lessonId`)
  and the caller's lives (`shopApi.getMyInventory()`), walks `blocks` in `order`, renders the
  matching block component, and reports every answer to
  `learningApi.recordBlockInteraction(blockId, isCorrect)` (`isCorrect: null` for an `INFO` view).
  That same call is now also where the backend spends a life server-side: `signa-api` PR #60
  (`feature/rest-lives-errors` → `develop`, open as of 2026-09-02) makes
  `CourseTrackingService.recordBlockInteraction` publish a `LifeLostEvent` whenever a non-`INFO`
  block is answered incorrectly, and `UserStatsEventListener` decrements `UserStats.currentLives`
  through it — no-op when `livesMode = INFINITE` or already at 0, defaulting to 5 (`MAX_LIVES`) if
  never initialized. No new endpoint or app change was needed: the client already calls
  `recordBlockInteraction` on every answer. The screen's own `lives` state is a **local optimistic
  mirror** of the same rule (starts from `shopApi.getMyInventory()`'s `currentLives`, decrements by
  1 on a wrong non-`INFO` answer, floors at 0, skips when `unlimitedLives`) — it stays in sync as
  long as the fire-and-forget `recordInteraction` call (errors are swallowed, see below) actually
  reaches the server; a dropped request leaves the local counter one life ahead of the backend
  until the lesson is reopened and inventory is refetched. The XP/aciertos/señas summary
  shown on the completion screen is still local-only. `route.params`: `{ lessonId: string; unitLabel?: string }` —
  `unitLabel` is supplied by the caller (there's no course-path screen yet to source it from
  `TopicSummaryResponse`, so it falls back to the lesson's own name).
- `components/lesson/`: `LessonHeader` (back + progress + lives), `XpChip`, `FeedbackBar`,
  `LessonButton`, `SignPlaceholder` (the sign/avatar animation is still a placeholder card — see
  [ml.md](./ml.md), there's no real animation asset pipeline yet), `NoLivesOverlay`,
  `LessonComplete`, and `blocks/` with one component per `BlockType`
  (`InfoBlock`, `SelectMeaningBlock`, `SelectSignBlock`, `ContextResponseBlock` and
  `SelectSignBlock` share `SignCarouselBlock`, `MatchBlock`, `VisualRecognitionBlock`).

To advance: wire the Inicio roadmap's lesson CTA to navigate into this real `LessonScreen` with a
real `unitLabel` (currently it just closes the sheet — see below). Once `signa-api` #60 merges,
consider trusting the server as the sole source of truth for `lives` (e.g. refetch
`shopApi.getMyInventory()` after each wrong answer, or surface the fire-and-forget interaction
error) instead of the local optimistic decrement, to remove the drift risk on a dropped request.

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
  the sheet. TODO: navigate to the `Lesson` route now that `LessonScreen`'s player is real.
- `roadmap.ts`: **presentation helpers** over the API types — `LESSON_STATE_VIS` (per-state
  node/chip visuals in theme tokens), `accentFor(topic)` (per-topic color+icon, since the backend
  doesn't send them, keyed by `topic.order`), and `progressFor(topic)`.
- `api.ts` (real portion) — `getSignLanguages()` (`GET /sign-languages`), `getCatalog(signLanguageId)`
  (`GET /courses?signLanguageId=`, Spring page), `getRoadmap(courseId)`
  (`GET /learning/tracking/courses/{courseId}/roadmap`). Response types: `SignLanguage`,
  `CourseSummary`, `RoadmapTopic`/`RoadmapLesson` (`state`: `COMPLETED` / `IN_PROGRESS` /
  `AVAILABLE` / `LOCKED`), `CourseRoadmap`. See [../api/endpoints.md](../api/endpoints.md).

## Course catalog — stub

- `screens/CoursesListScreen.tsx`: calls `GET /courses` via `api.ts` (shows loading → error until
  wired to the real `CourseController`/`CourseSummaryResponse` shape).
- `types.ts`: `Course`, `Lesson` (summary), `LessonBlock` (summary), `LessonProgress` — a
  provisional shape, distinct from `lessonContent.types.ts` above.
- `api.ts` (stub portion) — `list()` / `getById()` / `getLesson()`: tentative flat-content paths
  (`/courses`, `/courses/{id}`, `/courses/{courseId}/lessons/{lessonId}`), used only by
  `CoursesListScreen`; not aligned with the real `CourseController` / `CourseDetailResponse` yet.

To advance: confirm `CourseSummaryResponse`/`CourseDetailResponse` against `api.ts` + `types.ts`,
then either retire `CoursesListScreen` in favor of the Inicio roadmap, or navigate it → a
lesson-path screen → `Lesson` with a real `lessonId`.
