# Practice feature

> Responsibility: "Práctica libre" tab scope and state.
> Update when: the practice screen changes, or a real practice/mistakes-review endpoint appears in `signa-api`.
> Sources: src/screens/tabs/PracticeTabScreen.tsx, src/features/practice/types.ts

Status: **stub**, same as `CoursesListScreen` (see [courses.md](./courses.md#course-catalog--stub)).
Built from `Practica Libre.dc.html` (Claude Design).

`PracticeTabScreen` replaces the old one-line placeholder with the full UI: a `courseTeal`-toned
`ScreenHeader` (2 stats: señas aprendidas / ejercicios hechos), a 3-way `SegmentedControl`
(Ejercicios / Señas / Errores), and a sign-detail view that replaces the tab body when a sign is
tapped (local `detail` state, not a stack route — same pattern `SocialScreen` uses for its modals).

- **Ejercicios**: a 2-column grid of exercise types, one card per real `BlockType` (see
  `lessonContent.types.ts`) except `INFO` — `SELECT_MEANING`, `SELECT_SIGN`, `MATCH`,
  `CONTEXT_RESPONSE`, `VISUAL_RECOGNITION`. Cards are **not tappable**: there is no
  `signa-api` endpoint for a standalone, single-type practice session (lessons are the only thing
  that can be played today, via `LessonScreen`), so nothing they'd navigate to exists yet.
- **Señas**: a search box over a hardcoded list of sign meanings (`PRACTICE_SIGNS`), meant to stand
  in for "signs this user has learned". No such per-user endpoint exists — `signsApi.getSigns`
  returns the full language catalog, not what one user has learned, so it isn't used here to avoid
  showing signs the user never studied. Tapping a result opens the sign-detail view (also local
  content, no animation fetch).
- **Errores**: a "Repaso de errores" card (count + XP pill, "Empezar" CTA) and a list of missed
  items (`PRACTICE_MISTAKES`), each showing the exercise type and a miss count. There is no
  mistakes/miss-tracking endpoint in `signa-api`, so both the summary and the list are hardcoded,
  and "Empezar" is a no-op.
- **Sign detail**: a static "Animación LSA" placeholder box (no real GLB — unlike the lesson
  player's `SignAnimation`, this doesn't call `signsApi.getSignAnimations`), the meaning as a large
  title, a no-op "Practicar" CTA, and up to 4 "related" signs (just the rest of `PRACTICE_SIGNS`,
  no real lesson/topic grouping).
- `src/features/practice/types.ts`: all the placeholder content — `EXERCISE_TYPES`
  (title/hint/icon per `BlockType`), `PRACTICE_SIGNS`, `PRACTICE_MISTAKES`. Every CTA that would
  need a real backend call is commented at the call site with what's missing.
- Header tone: `colors.courseTeal` + the new `colors.courseTealLight` tint (see
  [../design-system/colors.md](../design-system/colors.md)) — closest existing token to the
  mockup's green accent; primary CTAs stay `colors.text`/`colors.onDark` per the "module colors
  don't tint CTAs" rule.

To advance: add a real practice-session endpoint (by exercise type and/or by mistake) and a
per-user learned-signs list to `signa-api`, then replace the local arrays in
`features/practice/types.ts` with real API calls and wire the CTAs. `PLACEHOLDER_EXERCISES_DONE`
(hardcoded `0` in `PracticeTabScreen`) should become a real counter once there's somewhere to read
it from.
