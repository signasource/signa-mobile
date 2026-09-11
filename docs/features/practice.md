# Practice feature

> Responsibility: "Práctica libre" tab scope, and the standalone practice-session player.
> Update when: the practice screen or session player changes, or the `/practice/*` endpoints change.
> Sources: src/screens/tabs/PracticeTabScreen.tsx, src/features/practice/, src/api/practice.ts

Status: **real**. Built from `Practica Libre.dc.html` (Claude Design), wired to `signa-api`'s
`/practice/*` endpoints (`PracticeController`).

`PracticeTabScreen` is a `courseTeal`-toned `ScreenHeader` (2 stats: señas aprendidas / ejercicios
hechos, from `practiceApi.getSummary()`), a 3-way `SegmentedControl` (Ejercicios / Señas /
Errores), and a sign-detail view that replaces the tab body when a sign is tapped (local `detail`
state, not a stack route — same pattern `SocialScreen` uses for its modals).

- **Ejercicios**: a 2-column grid of exercise types, one card per real `BlockType` (see
  `lessonContent.types.ts`) except `INFO` — `SELECT_MEANING`, `SELECT_SIGN`, `MATCH`,
  `CONTEXT_RESPONSE`, `VISUAL_RECOGNITION`. Tapping a card navigates to `PracticeSession` with
  `{ mode: "type", blockType, title }`.
- **Señas**: a search box over `practiceApi.getLearnedSigns()` — the user's actual learned signs
  (from `UserLearnedSign` on the backend), not the full catalog. Tapping a result opens the
  sign-detail view, which fetches the real animation via `signsApi.getSignAnimations([meaning])`
  and up to 4 "related" signs (the rest of the learned-signs list, minus the current one — no real
  lesson/topic grouping, so no "de la misma lección" claim is made). "Practicar" navigates to
  `PracticeSession` with `{ mode: "sign", meaning }`.
- **Errores**: a "Repaso de errores" card (count + an XP badge advertising the reward + "Empezar"
  CTA, navigates to `PracticeSession` with `{ mode: "mistakes" }`) and a list of missed items from
  `practiceApi.getMistakes()`, each showing the exercise type and a miss count, keyed by
  `lessonBlockId` (not a sign meaning — `MATCH`/`VISUAL_RECOGNITION` blocks don't have a single
  one). Empty state when there are none. The card's `MISTAKE_REVIEW_XP_REWARD` constant
  (`PracticeTabScreen.tsx`) mirrors the backend's `PracticeService.MISTAKE_REVIEW_XP_REWARD` —
  keep both in sync if the reward changes.
- `src/features/practice/types.ts`: `EXERCISE_TYPES`/`EXERCISE_TYPE_BY_KEY` — title/hint/icon per
  practicable `BlockType`, used both for the Ejercicios grid and to label each `PracticeMistake`.

## `PracticeSessionScreen` (`features/practice/screens/`, stack route `PracticeSession`)

Plays a batch of real `LessonContentBlock`s outside any real lesson, in one of three modes (see
`PracticeSessionParams` in `navigation/AppNavigator.tsx`): by exercise type, by a learned sign, or
a mistake-review queue. Reuses the exact same block components `LessonScreen` uses
(`InfoBlock`/`SelectMeaningBlock`/`SelectSignBlock`/`ContextResponseBlock`/`MatchBlock`/
`VisualRecognitionBlock`, dispatched by a small local `PracticeBlockRenderer`) and the
mount-all-blocks-simultaneously pattern for WebView/3D preload.

**Deliberately does not behave like `LessonScreen`:**
- No lives, no `NoLivesOverlay` — matches the tab's own copy ("sin perder vidas").
- No real XP per exercise: `onAnswer` calls `practiceApi.recordAttempt(block.id, correct)`, **not**
  `learningApi.recordBlockInteraction` — practice never costs lives or advances lesson/topic/course
  progress (`PracticeAttempt` is a separate table server-side), and individual answers never grant
  XP either.
- **Exception — finishing a `mode: "mistakes"` batch does grant XP.** Reaching the end of the batch
  calls `practiceApi.completeMistakeReview()`, which awards a flat backend-side bonus (see Backend
  below) unrelated to `xpReward` on the individual blocks. The result feeds `PracticeComplete`'s
  `xpEarned` prop. Other modes (`type`, `sign`) never call this and never show an XP card.
- Results screen is `PracticeComplete` (own component, not `LessonComplete`): aciertos/total, plus
  an XP card only when `xpEarned > 0` (i.e. only after a completed mistakes batch). "Repetir"
  re-fetches a fresh batch — important for `mode: "mistakes"`, so items answered correctly this
  time drop out of the next one, and the reward is claimed again only if there's still a
  non-empty batch to finish.
- Header is `PracticeSessionHeader` (own component): back + progress bar + title, no lives —
  `LessonHeader` requires `lives` and a lesson/unit breadcrumb that don't apply here.
- Empty batch (typically: no enrollments yet, or no mistakes pending) shows `EmptyState` with a
  contextual message instead of erroring.

## Backend

`signa-api`'s `learning` module, `PracticeController`/`PracticeService` (see its `CLAUDE.md` §2 and
`docs/diagrams/sequence.md#practica-libre`). Exercise/sign lookups pull from `LessonBlock`s in the
courses the user is enrolled in; attempts persist to `PracticeAttempt`, kept separate from
`LessonBlockAttempt` on purpose. Mistake detection reads **both** tables: a block is a pending
mistake if its most recent attempt, in either one, was wrong.

`POST /practice/mistakes/complete` (`PracticeService.completeMistakeReview`) is the one exception
to "practice never grants XP": it publishes an `XpEarnedEvent` for a flat
`MISTAKE_REVIEW_XP_REWARD` bonus, picked up by the same `UserStatsEventListener` that handles
lesson-block XP. It's deliberately not tied to individual block correctness — the anti-farming
guard is structural, not a cooldown: `getMistakeExercises` only ever returns pending mistakes, so
once they're resolved the next batch is empty and there's nothing left to complete.

Not covered: a per-exercise-type "session length" setting, and spaced-repetition ordering for
mistakes (currently most-recently-wrong first).
