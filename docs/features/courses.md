# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API is confirmed.
> Sources: src/features/courses/, src/api/lessons.ts, src/api/learning.ts

Status: **mixed**. The lesson player (`LessonScreen`) is real and wired to `signa-api`. The
course catalog screen (`CoursesListScreen`) is still a stub — nothing navigates to `Lesson` yet.

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
  Local-only state: a session life counter (decremented on a wrong answer, since there's no
  backend endpoint yet to spend a life from a lesson attempt) and the XP/aciertos/señas summary
  shown on the completion screen. `route.params`: `{ lessonId: string; unitLabel?: string }` —
  `unitLabel` is supplied by the caller (there's no course-path screen yet to source it from
  `TopicSummaryResponse`, so it falls back to the lesson's own name).
- `components/lesson/`: `LessonHeader` (back + progress + lives), `XpChip`, `FeedbackBar`,
  `LessonButton`, `SignPlaceholder` (the sign/avatar animation is still a placeholder card — see
  [ml.md](./ml.md), there's no real animation asset pipeline yet), `NoLivesOverlay`,
  `LessonComplete`, and `blocks/` with one component per `BlockType`
  (`InfoBlock`, `SelectMeaningBlock`, `SelectSignBlock`, `ContextResponseBlock` and
  `SelectSignBlock` share `SignCarouselBlock`, `MatchBlock`, `VisualRecognitionBlock`).

To advance: build the course-path screen that actually navigates into `Lesson` (currently nothing
does), and pass a real `unitLabel`. Consider a backend endpoint to spend a life per wrong answer
once the lives system needs to be authoritative across devices/sessions instead of per-attempt
local state.

## Course catalog — stub

- `screens/CoursesListScreen.tsx`: calls `GET /courses` via `api.ts` (shows loading → error until
  wired to the real `CourseController`/`CourseSummaryResponse` shape).
- `types.ts`: `Course`, `Lesson` (summary), `LessonBlock` (summary), `LessonProgress` — a
  provisional shape, distinct from `lessonContent.types.ts` above.
- `api.ts`: **STUB** — tentative paths (`/courses`, `/courses/{id}`,
  `/courses/{courseId}/lessons/{lessonId}`), not aligned with the real `CourseController` /
  `CourseDetailResponse` yet.

To advance: confirm `CourseSummaryResponse`/`CourseDetailResponse` against `api.ts` + `types.ts`,
then navigate `CoursesListScreen` → a lesson-path screen → `Lesson` with a real `lessonId`.
