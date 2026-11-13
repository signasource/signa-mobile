# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API changes.
> Sources: src/features/courses/, src/features/courses/screens/CourseDetailScreen.tsx, src/api/lessons.ts, src/api/learning.ts, src/api/courseOrders.ts, src/api/signs.ts, src/screens/tabs/HomeTabScreen.tsx, src/features/store/useCoursePurchase.ts, src/features/store/CourseCatalogSheet.tsx, src/features/store/PaidCourseRow.tsx

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

- `lessonContent.types.ts`: `LessonContent`, `LessonContentBlock`, the nine `BlockType`s and their
  config interfaces, plus `parseBlockConfig<T>(block)` to `JSON.parse` a block's `config` string.
- `screens/LessonScreen.tsx`: orchestrates the player — loads the lesson
  (`lessonsApi.getLesson`; it resolves `devLessons.ts` first, but **it does not read
  `lessonCache.ts`** — the cache is written by `HomeTabScreen` and currently read by nobody, so
  entering a lesson always shows the spinner) and the caller's lives
  (`shopApi.getMyInventory()`, always fresh), walks `blocks` in `order`, renders the matching block
  component, and reports every answer to `learningApi.recordBlockInteraction(blockId, isCorrect)`
  (`isCorrect: null` for an `INFO` view; `INTRODUCE_SIGN` reports nothing, it just advances). Reports are queued and sent **one at a time** (a promise chain in `recordInteraction`; `volver()` waits on its tail, capped by `ESPERA_MAX_SALIDA`), and an `INFO` block is reported once even on a double tap of "Continuar" — concurrent POSTs used to race on `user_lesson_progress` in signa-api (500).
  Blocks whose `type` isn't in `RENDERABLE_BLOCKS` (e.g. `INVISIBLE_SIGNS`, which only seeds the
  sign catalog) are dropped on load — they used to render `null` and leave a blank step with no
  way forward. `signa-api` doesn't require `INTRODUCE_SIGN`/`INVISIBLE_SIGNS` to complete a lesson. That same call is now also where the backend spends a
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
  next block's WebView warm without unmount/remount. `LessonScreen` also calls
  `useActivityTracker()` (`src/hooks/useActivityTracker.ts`) on mount: it accumulates
  foreground-only seconds (via `AppState`) for as long as the screen is mounted and flushes whole
  minutes to `usersApi.recordActivity()` (`POST /users/me/activity`) roughly every 60s and again on
  unmount, capped at 5 minutes per request to match the backend's `RecordActivityRequest` validation.
  This is what backs `minutesToday`/"Meta diaria" in `ProfileScreen` — see
  [../api/endpoints.md](../api/endpoints.md).
- `components/lesson/`: `LessonHeader` (back + progress + lives), `XpChip`, `FeedbackBar`
  (correct/incorrect banner — icon is the `check.svg`/`denied.svg` spot illustration, not an
  Ionicon), `LessonButton`, `SignPlaceholder` (fallback when a model fails to load or a meaning has
  no animation; also used in a `preparing` mode — `pajaros-grupo-pequeno.svg` illustration +
  "La animación se está preparando" — while the GLB is still loading), `SignAnimation` (resolves the
  sign's asset in R2 via `useSignMedia(meaning)` — a `.glb` renders through `GlbAnimationView`, a
  `.mp4` through `SignVideoView`; overlays `SignPlaceholder preparing` until the source's `onLoaded`
  fires, or `SignPlaceholder` on `onError`/no asset. When the sign is a video **and** a lateral take
  exists, it shows a "Ver lateral"/"Ver de frente" pill that swaps between `{meaning}.mp4` and
  `{meaning}_lateral.mp4`),
  `NoLivesOverlay`, `LessonComplete` (its three tiles — XP, aciertos, señas nuevas — are filtered to
  the ones actually **earned**, `> 0`; the row disappears when none is), and `blocks/` with one
  component per `BlockType` (`InfoBlock`, `IntroduceSignBlock`, `SelectMeaningBlock`,
  `SelectSignBlock`, `ContextResponseBlock` and `SelectSignBlock` share `SignCarouselBlock`,
  `MatchBlock`, `VisualRecognitionBlock`). `IntroduceSignBlock` presents a new sign with its
  full-height `SignAnimation` and a "La practico" button — no answer required, `xpReward` is
  ignored. The "…" menu at the top-right offers a YouTube search link and "Reportar seña"
  (`signReportsApi.createReport`; works for both GLB animations and MP4 videos since the block
  is format-agnostic). After the report is submitted, a bottom-sheet success view thanks the user
  and tells them they will be notified when the report is resolved; when that happens, the
  `SIGN_REPORT_RESOLVED` notification in `NotificationsScreen` lets them navigate to
  `SignDetailScreen` to view the sign again (see [../features/social.md](social.md)). `SelectMeaningBlock` renders its single sign via `SignAnimation`; the multi-option blocks
  (`SignCarouselBlock` — so `SelectSignBlock`/`ContextResponseBlock` —, `MatchBlock`,
  `VisualRecognitionBlock`) render their signs through `MultiSignView` (a carousel shows one at a
  time, a match grid shows all at once). Both paths resolve `.glb`/`.mp4` per sign. Answer-option
  buttons across
  `SelectMeaningBlock`/`VisualRecognitionBlock`/`MatchBlock` share the same idle look — flat
  `colors.fill` background, no border — and the same `check.svg`/`denied.svg` icons for the
  correct/wrong states (no shared `OptionButton` component yet, each block still owns its own
  option styles).
- `InfoBlock`: paragraphs are linkified by `blocks/richText.tsx` (`renderTextWithLinks`), which
  understands both markdown `[label](url)` and bare `http(s)://…` and opens them with `Linking`.
  When the config carries `myths`, they render as `blocks/MythDeck.tsx` instead of a static list:
  a stack of two-sided cards (front = `myth`, back = `reality`) built on `Animated` + `PanResponder`
  — **tap flips**, **drag sideways past ~100px discards**, and discarding the last card calls
  `onContinue()`, so the block advances on its own. The next two cards are rendered with their real
  content behind the top one (not empty placeholders), so nothing pops in mid-swipe; on each face
  the title and body are centred vertically under the MITO/VERDAD badge. The "Continuar" button stays available for
  anyone who wants to skip ahead.
- **Media URL construction** (`src/features/animations/glbUrl.ts`): `getGlbUrl(meaning)`,
  `getMp4Url(meaning)` and `getLateralMp4Url(meaning)` build public R2 URLs deterministically —
  `https://pub-f40a1de4d1fc46b0b6f07299847c66e0.r2.dev/lsa/{meaning}.glb` / `.mp4` /
  `_lateral.mp4`. No backend round-trip; no presigned URLs; no cache layer in JS. The WebView/native
  player handle HTTP caching. File names are the lowercase meaning, URL-encoded by
  `encodeURIComponent`.
- **Media resolution** (`src/features/animations/useSignMedia.ts`): `useSignMedia(meaning)` `HEAD`s
  `{meaning}.glb` and `{meaning}.mp4` in parallel (on RN, `fetch` uses native networking, so no
  browser CORS). `.glb` wins when both exist (the common case); when only `.mp4` is present it also
  `HEAD`s `{meaning}_lateral.mp4` so `SignAnimation` knows whether to offer the lateral toggle.
  Returns a discriminated `{ kind: "loading" | "glb" | "video" | "missing" }`. `resolveSignMedia`
  is the shared promise; `useSignMediaList(meanings)` resolves a whole list at once for the
  multi-option blocks. Both single-sign (`SignAnimation`) and multi-option
  (`MultiSignView`) renderers handle video; only `SignAnimation` exposes the lateral toggle (see
  [../status.md](../status.md)). `extractLessonSignNames(lesson)`
  (in `lessonContent.types.ts`) returns the *taught* meanings (correct answers only, no
  distractors) for display in the lesson-detail modal chips.
- `blocks/PerformSignBlock.tsx` (`PERFORM_SIGN`): the only block whose answer comes from the real
  world instead of a tap — the learner performs each sign in `config.signs` and the model
  recognises them live, on the device. Laid out like the `nombre.html` demo in `signa-ml`: camera
  filling the stage, a status badge, one slot per sign filling in as each is confirmed, and
  `SignPip` — the 3D model of the requested sign floating on top, draggable, snapping to the
  nearest corner, expanding on tap (which also pauses recognition). Recognition never blocks
  progress: there is always an escape, because a model that won't fire must not trap someone
  inside a lesson. Mechanics live in `@/features/ml` — see [ml.md](./ml.md).
- **Dev-only lessons** (`devLessons.ts`): `LessonScreen` resolves a handful of local lesson ids
  *before* calling the API, so a new block type can be played end to end while its YAML is still
  waiting for a `signa-api` deploy. Gated on `__DEV__`; `recordBlockInteraction` is skipped for
  them (their block ids don't exist server-side). `DEV_CAMERA_LESSON_ID` mirrors
  `signa-api/.../content/LSA/basic-course/topic-02.yml` and is opened from `SignRecognitionScreen`.
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
- `features/animations/SignVideoView.tsx`: renders a `.mp4` with `expo-av`'s `Video` (looping,
  muted, `CONTAIN`), fetched natively straight from R2 — no WebView. Same contract as
  `GlbAnimationView` (`url`, `paused`, `onLoaded` via `onReadyForDisplay`, `onError`) so
  `SignAnimation` swaps them transparently, and reports the same `trackAnimationLoad` telemetry.
- `features/animations/MultiSignView.tsx`: the mixed-media variant of `MultiGlbView` used by the
  multi-option blocks (`SignCarouselBlock`, `MatchBlock`, `VisualRecognitionBlock`). Resolves each
  slot's media with `useSignMediaList(meanings)`, feeds the `.glb` slots to one `MultiGlbView`
  (blank `""` slot for the video ones) and overlays native `SignVideoView`s on the `.mp4` slots —
  `stack` layout shows only the active slot's video, `rows` positions one per row at
  `index * (rowHeight + rowGap)`. Native players carry no WebGL contexts, so stacking several does
  not risk the OOM that forced the one-WebView design for GLBs. Shows the plain `colors.fill` box
  while the `HEAD` resolution is in flight.

To advance: once `signa-api` #60 merges, consider trusting the server as the sole source of truth for `lives` (e.g. refetch
`shopApi.getMyInventory()` after each wrong answer, or surface the fire-and-forget interaction
error) instead of the local optimistic decrement, to remove the drift risk on a dropped request.

### Inicio (Home) roadmap screen

`src/screens/tabs/HomeTabScreen.tsx` renders the vertical lesson recorrido from
`Inicio - Direcciones.dc.html` (Claude Design): purple header + scrollable editorial rail timeline
+ centered lesson-detail modal.
- **Multiple courses / current course**: `fetchHomeData()` loads `learningApi.getEnrollments()`
  and shows the roadmap of the enrollment with `isCurrent` (else the first one). The selection is
  persisted **server-side** (`PATCH /learning/tracking/current-course`), so it survives restarts and
  devices; progress is already per course. With 2+ enrollments the header shows a course chip
  (`ScreenHeader`'s `top` slot) that opens an "Elegí tu curso" bottom sheet; picking one calls
  `setCurrentCourse` and reloads. Each option's subtitle is `organizationName` or "Tu curso
  personal" plus `X de Y` lessons (from `getProgress()`, matched by `courseName` because the
  progress DTO has no `courseId`). When the current course comes from an organization, a banner
  above the roadmap shows "Curso de {org}" and the "Acceso incluido hasta" date. Enrolment is what makes a course
  appear in the selector and in the profile's Cursos tab (the course chip only renders when the user
  has at least one enrolment). A brand-new user (enrolments loaded OK and empty) is auto-enrolled by
  `joinMissingFreeCourses()` in the base free **published** course only, then the data is refetched.
  There is no per-session flag: only an in-flight guard, so a failed attempt (or a different user
  signing in within the same session) is retried on the next load. If `getEnrollments` itself fails
  the auto-join is skipped (an empty list then means "unknown"). If enrolment is still missing, the
  first catalog course is shown. The home also filters the catalog to published courses on the
  client (`isPublished`), because older signa-api builds ignore the `status=PUBLISHED` param.
- **Content** is **real**: it loads `getRoadmap(courseId)` for that course. Shows a spinner while
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

## Buying a paid course — real

The base course is free (auto-joined); every other catalog course is paid and bought **once** for
permanent access, via Mercado Pago, mirroring the gem flow. `CourseSummary` carries `price` (ARS,
null for free) and `owned` (user has active access).

The buy button never says "Comprar": every entry point shows **"Ver"** and opens the course sheet.

- **Course sheet** — `screens/CourseDetailScreen.tsx` (route `CourseDetail { courseId }`), design
  `Compra de cursos.dc.html`. Loads `coursesApi.getDetail` (`GET /courses/{id}`) and shows only
  real data: header in `colors.courseIndigo` with unidades / lecciones / señas, a sample sign
  (`SignAnimation` of `sampleSign`, the first sign taught), "Qué trae el curso" (señas, ejercicios
  — `describeExercises(exerciseTypes)` — and camera practice yes/no), the syllabus (units →
  lessons → signs) and a fixed price bar with **"Ir al pago"**. Not shown, because the backend
  doesn't know them: which signs are 3D vs. video, a per-course tone and a refund policy.
- **Purchase flow** (all inside that screen): "Antes de pagar" summary sheet → `useCoursePurchase`
  → Mercado Pago → "Confirmando tu pago" (`status === "checking"`) → approved ("¡El curso ya es
  tuyo!", "Empezar el curso" sets it as current via `setCurrentCourse` and goes to Inicio) or
  pending ("Tu pago está en camino"). A failed order reopens the summary with the error.
- `useCoursePurchase({ onPurchased })` (`src/features/store/`): `buy({ id })` → `POST
  /store/course-orders` → opens the checkout with `WebBrowser.openAuthSessionAsync(url,
  "signa://store")` → on return, `POST /store/course-orders/{id}/sync` (retried ~4×) grants access
  and fires `onPurchased`. Access is never granted client-side; the webhook also grants it.
- `PaidCourseRow` — a paid course row (price + "Ver"). Used by every entry point below.
- **Entry points** (all open the sheet, all show "Ver"):
  - Home: the "Elegí tu curso" selector ("Más cursos"); an outlined **"+N cursos"** chip next to the
    course chip in the header; and, when the current course is free, a **"¿Y después?"** card
    under the roadmap (after a "FIN DE …" divider) listing the buyable courses.
  - Lesson complete: when the lesson just closed the **last pending lesson of a unit** of the free
    course (never a replay, never every lesson), `HomeTabScreen` passes `suggestedCourse` in the
    `Lesson` params and `LessonComplete` shows a "Seguí aprendiendo" card below the stats; it
    `replace`s the screen with `CourseDetail` so the lesson isn't left underneath.
  - Profile → Cursos: a **"Para sumar"** block with dashed `PaidCourseRow`s (`dashed`) — it replaced
    the old "Ver más cursos" button and `CourseCatalogSheet` (deleted).
  - Store → **Cursos** tab (`CoursesSection`).
  Home/Profile/Store refetch on focus, so a bought course shows up as owned when the sheet closes.
