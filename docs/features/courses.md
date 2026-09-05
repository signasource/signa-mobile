# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API changes.
> Sources: src/features/courses/, src/api/lessons.ts, src/api/learning.ts, src/api/signs.ts, src/screens/tabs/HomeTabScreen.tsx

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

- `lessonContent.types.ts`: `LessonContent`, `LessonContentBlock`, the seven `BlockType`s and their
  config interfaces, plus `parseBlockConfig<T>(block)` to `JSON.parse` a block's `config` string.
- `screens/LessonScreen.tsx`: orchestrates the player — loads the lesson (checking
  `lessonCache.ts` first, falling back to `lessonsApi.getLesson`) and the caller's lives
  (`shopApi.getMyInventory()`, always fresh), walks `blocks` in `order`, renders the matching block
  component, and reports every answer to `learningApi.recordBlockInteraction(blockId, isCorrect)`
  (`isCorrect: null` for an `INFO` view). That same call is now also where the backend spends a
  life server-side: `signa-api` PR #60 (`feature/rest-lives-errors` → `develop`, open as of
  2026-09-02) makes `CourseTrackingService.recordBlockInteraction` publish a `LifeLostEvent`
  whenever a non-`INFO` block is answered incorrectly, and `UserStatsEventListener` decrements
  `UserStats.currentLives` through it — no-op when `livesMode = INFINITE` or already at 0,
  defaulting to 5 (`MAX_LIVES`) if never initialized. No new endpoint or app change was needed:
  the client already calls `recordBlockInteraction` on every answer. The screen's own `lives` state
  is a **local optimistic mirror** of the same rule (starts from `shopApi.getMyInventory()`'s
  `currentLives`, decrements by 1 on a wrong non-`INFO` answer, floors at 0, skips when
  `unlimitedLives`) — it stays in sync as long as the fire-and-forget `recordInteraction` call
  (errors are swallowed, see below) actually reaches the server; a dropped request leaves the
  local counter one life ahead of the backend until the lesson is reopened and inventory is
  refetched. `signsLearned` on the completion screen comes from `route.params.signsCount`, which
  is sourced from the roadmap (`RoadmapLesson.signsCount`) — computed server-side by
  `BlockSignExtractor`. `route.params`: `{ lessonId: string; unitLabel?: string; signsCount?: number }` —
  `unitLabel` is supplied by the caller; `signsCount` is passed from `HomeTabScreen` via the
  roadmap response (falls back to `0` if absent for backward compatibility). Only the current block
  and the next one are mounted at a time (a windowed `blockIndex`/`blockIndex + 1` render, not the
  whole lesson) — each block's WebView can hold several concurrent 3D models, and mounting every
  block up front used to pile up WebGL contexts until Android silently OOM-killed the app (no JS
  error, just closes). Blocks only ever advance forward, so a 2-wide window is enough to keep the
  next block's WebView warm without unmount/remount.
- `components/lesson/`: `LessonHeader` (back + progress + lives), `XpChip`, `FeedbackBar`,
  `LessonButton`, `SignPlaceholder` (fallback card shown while a meaning's animation URL isn't
  cached yet — still loading, no animation for that meaning, or the model failed), `SignAnimation`
  (looks up the meaning in `animationPreload`'s cache and renders `GlbAnimationView`, falling back
  to `SignPlaceholder`), `NoLivesOverlay`, `LessonComplete` (its three tiles — XP, aciertos, señas
  nuevas — are filtered to the ones actually **earned**, `> 0`; the row disappears when none is),
  and `blocks/` with one component per
  `BlockType` (`InfoBlock`, `IntroduceSignBlock`, `SelectMeaningBlock`, `SelectSignBlock`,
  `ContextResponseBlock` and `SelectSignBlock` share `SignCarouselBlock`, `MatchBlock`,
  `VisualRecognitionBlock`). `IntroduceSignBlock` presents a new sign with its full-height
  `SignAnimation` and a "Continuar" button — no answer required, `xpReward` is ignored.
  `SelectMeaningBlock` and `SignCarouselBlock` (so `SelectSignBlock`/`ContextResponseBlock`) render
  the sign via `SignAnimation`; `MatchBlock`/`VisualRecognitionBlock` still use static
  cards/swatches (they show many signs at once, not one at a time).
- `InfoBlock`: paragraphs are linkified by `blocks/richText.tsx` (`renderTextWithLinks`), which
  understands both markdown `[label](url)` and bare `http(s)://…` and opens them with `Linking`.
  When the config carries `myths`, they render as `blocks/MythDeck.tsx` instead of a static list:
  a stack of two-sided cards (front = `myth`, back = `reality`) built on `Animated` + `PanResponder`
  — **tap flips**, **drag sideways past ~100px discards**, and discarding the last card calls
  `onContinue()`, so the block advances on its own. The next two cards are rendered with their real
  content behind the top one (not empty placeholders), so nothing pops in mid-swipe; on each face
  the title and body are centred vertically under the MITO/VERDAD badge. The "Continuar" button stays available for
  anyone who wants to skip ahead.
- `animationPreload.ts`: `preloadLessonAnimations(blocks)` — fire-and-forget, errors swallowed,
  doesn't block the UI. Called in two places: from `HomeTabScreen` as soon as the roadmap loads
  (pre-fetches the current lesson's animations before the user taps "Comenzar"), and from
  `LessonScreen` on mount as a fallback (idempotent — cached meanings are skipped).
  `collectSignMeanings(blocks)` picks the sign *meanings* to look up per block type:
  `INTRODUCE_SIGN.meaning`, `SELECT_MEANING.sign`, `SELECT_SIGN.options`,
  `CONTEXT_RESPONSE.options`, `MATCH.concepts`, `VISUAL_RECOGNITION.sign_sequence`
  (its `options` are plain text, not animated). All pending
  meanings are resolved in **one** batched request, `signsApi.getSignAnimations` (`POST
  /signs/animations`, exact-meaning match, presigned URLs). Each URL is cached in
  `animationUrlCache` immediately (presigned URL); then the GLB binary is downloaded via `fetch()`
  in the RN layer and converted to a `data:model/gltf-binary;base64,…` URL stored in
  `glbDataUrlCache`. `getCachedAnimationUrl(meaning)` prefers the data URL so the WebView renders
  from memory with no network request; it falls back to the presigned URL while the download is
  still in progress. A meaning absent from the response is cached as `null` — `SignAnimation` falls
  back to `SignPlaceholder` without retrying. `extractLessonSignNames(lesson)` (in
  `lessonContent.types.ts`) returns the *taught* meanings (correct answers only, no distractors)
  for display in the lesson-detail modal chips.
- `lessonCache.ts`: module-level `Map<lessonId, LessonContent>`. `HomeTabScreen` populates it
  after fetching the current lesson in the background; `LessonScreen` checks it on mount before
  calling the API (cache hit → no loading spinner on lesson entry). The cache is invalidated
  naturally: each time `HomeTabScreen` regains focus it re-fetches the roadmap and overwrites
  the cache with fresh lesson content. Cache lifetime = process lifetime.
- `features/animations/GlbAnimationView.tsx`: renders a `.glb` inside a `WebView` using Google's
  `<model-viewer>` (loaded from a CDN `<script type="module">`; the GLB itself is fetched by the
  web engine, so the R2 bucket must allow CORS `GET`). Same strategy and encuadre as the
  `feature/poc-animations` spike: `camera-controls` (drag to rotate) with the vertical orbit
  clamped to `60deg`–`110deg`, `autoplay`, optional `autoRotate`; once the model's `load` event
  fires, JS reframes the camera target ~30% up from the bounding-box center (upper body/chest) and
  sets `fieldOfView="15deg"`. Reports loaded animation clip names and load errors back to RN via
  `postMessage`; `paused` toggles `play()`/`pause()` on the `<model-viewer>` through
  `injectJavaScript` without reloading the model. Depends on `react-native-webview`. Both
  `GlbAnimationView` and `MultiGlbView` (the carousel's one-WebView-many-models variant) handle
  `onRenderProcessGone` by calling the same `onError` callback the caller already uses to fall back
  to `SignPlaceholder` — without it, an Android WebView renderer crash (e.g. from a low-memory
  device) took the whole host app process down with it instead of just that one card.

To advance: wire the Inicio roadmap's lesson CTA to navigate into this real `LessonScreen` with a
real `unitLabel` (currently it just closes the sheet — see below). Once `signa-api` #60 merges,
consider trusting the server as the sole source of truth for `lives` (e.g. refetch
`shopApi.getMyInventory()` after each wrong answer, or surface the fire-and-forget interaction
error) instead of the local optimistic decrement, to remove the drift risk on a dropped request.

### Inicio (Home) roadmap screen

`src/screens/tabs/HomeTabScreen.tsx` renders the vertical lesson recorrido from
`Inicio - Direcciones.dc.html` (Claude Design): purple header + scrollable editorial rail timeline
+ centered lesson-detail modal.
- **Content** is **real**: on mount it resolves LSA via `getSignLanguages()`, takes the **first**
  course from `getCatalog(lsa.id)`, and loads `getRoadmap(course.id)`. Shows a spinner while
  loading and an error + "Reintentar" on failure. Units = topics; each unit header shows `topic.title`
  as the (uppercase) kicker, `topic.subtitle` as the bold line, and `X de Y` progress.
- **Header**: the shared `ScreenHeader` with `tone={colors.primary}`, the "Tu recorrido" title, a
  description and 3 stat tiles (racha / gemas / XP) in the common uppercase-label + icon + value
  format. The old course-name kicker ("CURSO BÁSICO") was removed. Stats come from
  `usersApi.getStats()` + `inventoryApi.getMyInventory()`, loaded in parallel and non-blocking.
- **Editorial rail**: single continuous 2px vertical line (`#DCD2C8`) running behind all rows.
  Each row has `position: relative` with an absolute rail segment spanning full row height
  (including `paddingBottom`) so lines connect without gaps. Node types:
  - **COMPLETED** — green 22px dot + replay icon → navigates to `LessonScreen` directly.
  - **Current** (first IN_PROGRESS, or first AVAILABLE if none) — purple dot with two concentric
    rings + white card showing "Seguí acá" kicker, lesson name, primary CTA (→ `LessonScreen`) and
    info button (→ modal).
  - **AVAILABLE** (non-current) — hollow purple-bordered circle, lesson name; tapping opens modal.
  - **LOCKED** — gray dot, muted name; not tappable.
- **Lesson modal** (centered fade overlay, not bottom sheet): "Seguí acá" kicker + "+N XP" pill,
  lesson name (Bricolage 800 22px), description, primary CTA. CTA navigates to `LessonScreen`.
- `roadmap.ts`: **presentation helpers** — `accentFor(topic)` (per-topic color+icon, keyed by
  `topic.order`) and `progressFor(topic)`. `LESSON_STATE_VIS` is no longer used by the Home screen
  (kept in the file for future re-use).
- `api.ts` (real portion) — `getSignLanguages()` (`GET /sign-languages`), `getCatalog(signLanguageId)`
  (`GET /courses?signLanguageId=`, Spring page), `getRoadmap(courseId)`
  (`GET /learning/tracking/courses/{courseId}/roadmap`). Response types: `SignLanguage`,
  `CourseSummary`, `RoadmapTopic`/`RoadmapLesson` (`state`: `COMPLETED` / `IN_PROGRESS` /
  `AVAILABLE` / `LOCKED`; `signsCount`: unique signs in the lesson, computed server-side by
  `BlockSignExtractor`), `CourseRoadmap`. See [../api/endpoints.md](../api/endpoints.md).
- After `fetchRoadmap()` resolves, `HomeTabScreen` fires a **background prefetch** for the current
  lesson: `lessonsApi.getLesson(currentId)` → `setCachedLesson()` → `preloadLessonAnimations()`.
  All fire-and-forget; the home UI is never blocked by this.

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
