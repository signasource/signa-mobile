# Courses feature

> Responsibility: courses module scope and state.
> Update when: course screens/types change, or the backend content API changes.
> Sources: src/features/courses/, src/features/courses/screens/CourseDetailScreen.tsx, src/api/lessons.ts, src/api/learning.ts, src/api/courseOrders.ts, src/api/signs.ts, src/features/animations/signMedia.ts, src/screens/tabs/HomeTabScreen.tsx, src/features/store/useCoursePurchase.ts, src/features/store/PaidCourseRow.tsx, src/features/lives/

Status: **real**. The **Inicio (Home) roadmap** is wired to real `signa-api` content, and the
lesson player (`LessonScreen`) is real and wired to `signa-api`. The old flat course browse stub
(`CoursesListScreen`, `CoursesTabScreen`) is unused but still in the repo; Inicio is the only way into a lesson.

## Lesson player — real

`GET /lessons/{id}` (`lessonsApi.getLesson`, see [../api/endpoints.md](../api/endpoints.md)) returns
the full block list for one lesson — the same content `ContentLoader` reads from a course's
`.yml` files (e.g. `signa-api/src/main/resources/content/LSA/basic-course/topic-01.yml`) at
startup and persists as `Lesson` + `LessonBlock` rows. One lesson in the yaml (`lessons[].blocks`)
maps 1:1 to one `LessonContent.blocks[]` here; each block's `type` is the yaml's `type:` and its
`config` is the yaml's `config:` section, serialized to JSON with the same key casing (see
[../api/types.md](../api/types.md) for the exact per-type shape).

- `lessonContent.types.ts`: `LessonContent`, `LessonContentBlock`, the nine `BlockType`s (`INFO`, `INTRODUCE_SIGN`, `SELECT_MEANING`, `SELECT_SIGN`, `CONTEXT_RESPONSE`, `MATCH`, `VISUAL_RECOGNITION`, `PERFORM_SIGN`, `SPELL_NAME`) and their
  config interfaces, plus `parseBlockConfig<T>(block)` to `JSON.parse` a block's `config` string.
- `screens/LessonScreen.tsx`: orchestrates the player — loads, in parallel, the lesson
  (`lessonsApi.getLesson`, no client cache: entering a lesson always shows the spinner), the
  caller's inventory (`shopApi.getMyInventory()`, always fresh; feeds `useLives`) and
  `usersApi.getStats()` (the XP baseline), walks `blocks` in `order`, renders the matching block
  component, and reports every answer to `learningApi.recordBlockInteraction(blockId, isCorrect)`
  (`isCorrect: null` for an `INFO` view; `INTRODUCE_SIGN` reports nothing, it just advances). Reports are queued and sent **one at a time** (a promise chain in `recordInteraction`; `volver()` waits on its tail, capped by `ESPERA_MAX_SALIDA`), and an `INFO` block is reported once even on a double tap of "Continuar" — concurrent POSTs used to race on `user_lesson_progress` in signa-api (500). Each send goes through `enviarConReintentos` (3 attempts, on network errors / 5xx / 429; a 4xx is not retried).
  Blocks whose `type` isn't in `RENDERABLE_BLOCKS` (e.g. `INVISIBLE_SIGNS`, which only seeds the
  sign catalog) are dropped on load — they used to render `null` and leave a blank step with no
  way forward. `signa-api` doesn't require `INTRODUCE_SIGN`/`INVISIBLE_SIGNS` to complete a lesson.
  **Skipping a camera exercise** (`PERFORM_SIGN` / `SPELL_NAME`, "No me sale, seguir") reports
  **nothing**: `signa-api` treats a camera block as done once *attempted* (`countsAsDoneWhenAttempted`),
  so reporting `false` completed the lesson and its XP. Only successes are sent (so a skip costs no life
  either). At the end, `LessonScreen` passes `incomplete` to `LessonComplete` when any camera block wasn't
  answered correctly: title "Lección incompleta", "Repasar la lección" becomes the primary button, the
  suggested-course card is hidden, and the XP stat card reframes as pending ("XP al completar", no `+`
  prefix) because an incomplete lesson doesn't credit XP to the total. `recordBlockInteraction` is also where the backend spends a
  life: `signa-api` publishes a `LifeLostEvent` whenever a non-`INFO` block is answered incorrectly
  (no-op when `livesMode = INFINITE` or already at 0), and regenerates one life every 10 minutes.
  The screen mirrors that rule locally through `features/lives/useLives.ts` (`loseLifeLocally()`:
  one less, floor at 0, starts the regeneration timer if it wasn't running; skipped when the lives
  are unlimited) — see *Lives* below. If a report is dropped the local counter stays one life
  ahead of the backend until the lesson is reopened and the inventory refetched. `signsLearned` on the completion screen comes from `route.params.signsCount`, which
  is sourced from the roadmap (`RoadmapLesson.signsCount`) — computed server-side by
  `BlockSignExtractor`. `route.params`: `{ lessonId: string; unitLabel?: string; signsCount?: number; suggestedCourse?: { id; name } }` —
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
- `components/lesson/`: `LessonHeader` (back + progress + lives + `LivesTimerChip`), `XpChip`, `FeedbackBar`
  (correct/incorrect banner — icon is the `check.svg`/`denied.svg` spot illustration, not an
  Ionicon), `LessonButton`, `SignPlaceholder` (fallback when a model fails to load or a meaning has
  no animation; also used in a `preparing` mode — `pajaros-grupo-pequeno.svg` illustration +
  "La animación se está preparando" — while the GLB is still loading), `SignAnimation` (asks which file the
  sign uses with `useSignSource(meaning)` — see *Media resolution* below; a `.glb` renders with the
  native Filament avatar (`AvatarGlbNativo`, WebView `GlbAnimationView` on iOS or as fallback), a
  `.mp4` with `SignVideo`; overlays `SignPlaceholder preparing` until loaded, or `SignPlaceholder` on
  error. State resets when `meaning` changes (the spell-name PiP swaps letters). When the sign is a
  video **and** has a lateral take, a Frente / Lateral switch swaps between both),
  `NoLivesOverlay`, `LessonComplete` (its three tiles — XP, aciertos, señas nuevas — are filtered to
  the ones actually **earned**, `> 0`; the row disappears when none is). The XP tile is the
  **backend's delta**, not the sum of `xpReward`: `LessonScreen` reads `GET /users/me/stats`
  (`totalXp`) when the lesson loads and again — after the answer queue drains — when it
  completes, and shows the difference (multiplier included; `0` on a replay, since the backend
  grants a lesson's XP only once, **when the whole lesson completes** — blocks pay nothing on their own, so the streak only moves on lesson completion). The tile stays hidden while that request is in flight or if the stats can't be read (no local
  `xpReward` estimate any more: it promised XP the Profile didn't have). Also `blocks/` with one
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
  `VisualRecognitionBlock`) render their signs through `MultiAvatarNativo` (a carousel shows one at a
  time, a match grid shows all at once; URLs from `useSignSources`). Both paths handle `.glb`/`.mp4`
  per sign. `VisualRecognitionBlock` starts each sign's 2.6 s countdown only after sources resolve and
  `MultiAvatarNativo`/`MultiGlbView` report `onLoaded` for it (8 s safety timeout), so slow loads
  can't skip signs; Repetir resets the loaded set. Answer-option
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
  `_lateral.mp4`. They are only the **fallback** (see *Media resolution*); no presigned URLs, no cache layer in JS.
  File names are the lowercase meaning, URL-encoded by `encodeURIComponent`.
  `EXPO_PUBLIC_GLB_BASE` (optional) points `getGlbUrl` at another origin to try other `.glb` builds
  (e.g. KTX2 textures) without touching the bucket; `getGlbUrlOficial` always returns the bucket one.
- **Media resolution** (`src/features/animations/signMedia.ts`): the app asks signa-api which file
  each sign uses — `POST /signs/media` → `[{meaning, url, format, lateralUrl}]`, batched and cached
  in memory — so animations uploaded from the admin panel (`.glb`, or `.mp4` + optional lateral
  `.mp4`) show up at once; re-uploads carry `?v=` so the on-disk avatar cache refreshes. The API is the **only** place that knows
  file names (case/accent-insensitive matching, aliases such as `niño`→`nene`, `.mp4`-only signs): the app has
  no alias map and does not probe the bucket. signa-api also looks up in the bucket the signs it has no catalog
  entry for (`SignMediaResolver`), so a sign with a file in R2 comes back whether or not it is registered. No answer
  within 2.5 s or API down: the usual `{meaning}.glb` by name (`getGlbUrl`) — the one case where a video-only or
  aliased sign can't be found, because without the API the app doesn't know the file name; if that 404s the
  component shows `SignPlaceholder`. A sign that shows nothing with the API up means there is no file for it in R2:
  upload it from the panel. (The API's opt-in `include_missing` flag is not used: the 404 path already ends in the
  placeholder.)
  Bucket keys follow the same convention as before (`lsa/{meaning}.mp4`, `lsa/{meaning}_lateral.mp4`).
  Only `SignAnimation` exposes the lateral switch (see [../status.md](../status.md)). `extractLessonSignNames(lesson)`
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
- `features/animations/SignVideo.tsx`: renders a `.mp4` in a WebView `<video>` (looping, muted,
  inline) — no extra native dependency (`expo-av` is gone in SDK 57). Same contract as the avatar
  views (`url`, `paused`, `onLoaded`, `onError`) plus `rate` (1 | 0.5, slow motion).
- `features/animations/SpeedToggle.tsx`: floating 1× / 0.5× button (bottom-right) that drives
  `SignVideo`'s `rate`. Shown by `SignAnimation` for `.mp4` signs and by `MultiAvatarNativo`
  whenever a visible slot is a video (one shared rate for all its slots).
- `features/animations/MultiAvatarNativo.tsx`: several signs with the native avatar (one Filament
  view per visible slot), `SignVideo` for `.mp4` slots (with the `SpeedToggle`); on iOS falls back
  to `MultiGlbView`.

### Lives

`features/lives/useLives.ts` is the single mirror of the backend's lives rule (`MAX_LIVES = 5`,
`LIFE_REGEN_MS` = 10 min, one life per elapsed interval since `nextLifeAt`, unlimited while
`livesMode = INFINITE` and the expiry hasn't passed). It takes a `LivesSource` (the slice of
`GET /inventories/me`) and ticks each second while a timer runs; `serverNow()` (`@/utils/serverClock`)
corrects for device clock drift. `LivesTimerChip` renders the countdown. Consumers: `LessonScreen`
(`LessonHeader`, `NoLivesOverlay`), `HomeTabScreen` (the "Vidas" stat tile via `livesValue` / `livesCaption`),
the Store and Profile.

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
  description and 3 stat tiles (racha / gemas / vidas — lives replaced XP; the gems tile opens `GemShop`, with a dot while a gem order is pending) in the common uppercase-label + icon + value
  format. The old course-name kicker ("CURSO BÁSICO") was removed. Stats come from
  `usersApi.getStats()` + `inventoryApi.getMyInventory()`, loaded in parallel and non-blocking, and refetched on focus.
- **Editorial rail**: single continuous 2px vertical line (`#DCD2C8`) running behind all rows.
  Each row has `position: relative` with an absolute rail segment spanning full row height
  (including `paddingBottom`) so lines connect without gaps. Node types:
  - **COMPLETED** — green 22px dot + replay icon → navigates to `LessonScreen` directly.
  - **Current** (first IN_PROGRESS, or first AVAILABLE if none) — purple dot with two concentric
    rings + white card showing "Seguí acá" kicker, lesson name, primary CTA (→ `LessonScreen`) and
    info button (→ modal).
  - **AVAILABLE** (non-current) — hollow purple-bordered circle, lesson name; tapping opens modal.
  - **LOCKED** — gray dot, muted name; not tappable.
- **CTA label** (`ctaFor(state)`, shared by the current-lesson card and the modal): `AVAILABLE` →
  "Empezar", `IN_PROGRESS` → "Seguir" (only once started), `COMPLETED` → "Repasar".
- **Lesson modal** (centered fade overlay, not bottom sheet): "Seguí acá" kicker + "+N XP" pill (hidden when completed),
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

## Buying a paid course — real

The base course is free (auto-joined); every other catalog course is paid and bought **once** for
permanent access, via Mercado Pago, mirroring the gem flow. `CourseSummary` carries `price` (ARS,
null for free) and `owned` (user has active access).

The buy button never says "Comprar": every entry point shows **"Ver"** and opens the course sheet.

- **Course sheet** — `screens/CourseDetailScreen.tsx` (route `CourseDetail { courseId }`), design
  `Compra de cursos.dc.html`. Loads `coursesApi.getDetail` (`GET /courses/{id}`) and shows only
  real data: header in `colors.courseIndigo` with unidades / lecciones / señas, a sample sign
  (`SignAnimation` of `sampleSign`, the first sign taught) with a hint that adapts to the course
  media type (`hasVideos` → "todas en video", `hasAnimations` → "avatar 3D"), "Qué trae el curso"
  (señas, media type row — `hasVideos` or `hasAnimations`, mutually exclusive — and camera practice
  yes/no), the syllabus (units → lessons → signs) and a fixed price bar with **"Ir al pago"**.
  The "Antes de pagar" sheet includes a refund note pointing to Tienda → Historial.
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
