# Challenges (Primeros pasos + desafíos diarios)

> Responsibility: the first-steps set and the daily challenges — how they unlock, progress, and pay gems.
> Update when: a challenge, its criteria or reward, the unlock rule, the card, or `/challenges` changes.
> Sources: src/features/challenges/, src/api/challenges.ts, src/screens/tabs/HomeTabScreen.tsx

**Real**, wired to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md). Types → [../api/types.md](../api/types.md).
Daily challenges are the app's **main source of gems** (design source: `Gamificación.xlsx`, sheet *Challenges*).

## How it works

1. **Two sets, one card.** `GET /challenges` returns `firstSteps`, `firstStepsDone` and `daily`.
   `ChallengesCard` (top of the Inicio scroll) shows **Primeros pasos** until every step is *claimed*;
   from then on it shows **Desafíos del día**. `daily` comes back empty until `firstStepsDone`, so the
   gate lives on the server.
2. **Progress is server-side.** `signa-api` reports progress from the places the activity already
   happens (lesson completed, XP earned, camera answer, friend request, streak). The app never reports
   progress; it just re-fetches on focus / pull-to-refresh.
3. **Rewards are claimed.** A completed challenge shows a **Reclamar** button → `POST /challenges/{id}/claim`
   credits the reward server-side and returns the new gem balance (the header updates from it).
   Claiming twice or before completing is a 400.
4. **The day is Argentine** (`America/Argentina/Cordoba`): daily rows roll over at local midnight and the
   card shows "Se renuevan en N h". An unclaimed daily reward is gone after the rollover.

## Catalog (seeded in `signa-api` · `db/seed/challenges.sql`)

| Set | Challenge | Criteria | Reward |
|---|---|---|---|
| Primeros pasos | Completá tu primera lección | `COMPLETE_LESSONS` 1 | 20 gemas |
| | Probá la cámara en Práctica | `CAMERA_PRACTICES` 1 | 20 gemas |
| | Sumá tu primer amigo en Social | `FRIEND_REQUESTS_SENT` 1 | 30 gemas |
| | Volvé mañana y hacé racha de 2 días | `STREAK_DAYS` 2 | 30 gemas |
| Diarios | Estudiante constante | `COMPLETE_LESSONS` 3 | 50 gemas |
| | Practicá con cámara | `CAMERA_PRACTICES` 5 | 40 gemas |
| | Sesión perfecta | `PERFECT_LESSONS` 3 | XP x3 · 30 min |
| | Experto del día | `EARN_XP` 500 | 60 gemas |

The first-steps rewards are **not** in the spreadsheet (it only defines the daily ones): 20/20/30/30 was
chosen so the set totals 100 gems. Weekly and course challenges from the sheet are not implemented.

Criteria definitions:

- **Camera exercises** = correct answers on `VISUAL_RECOGNITION`, `PERFORM_SIGN` or `SPELL_NAME`, in a
  lesson or in free practice.
- **Perfect lesson** = lesson completed (first time) with no wrong answer on any of its blocks.
- **Friend step** counts a request *sent*, not accepted, so a user is never stuck waiting on someone else
  (that would also keep the daily challenges locked).
- Users who were already active get **credit for past activity** on the first steps the first time the
  server creates their rows (lessons done, camera answers, requests, current streak).

## Mobile pieces

| Piece | File |
|---|---|
| API (`getChallenges`, `claim`) + types | `src/api/challenges.ts` |
| Card (rows, progress bar, reward pill, claim button, "se renuevan en") | `src/features/challenges/components/ChallengesCard.tsx` |
| Fetch, claim, row navigation | `src/screens/tabs/HomeTabScreen.tsx` |

- Tapping an unfinished row navigates: lessons / XP → the current lesson, camera → Práctica tab,
  friend → Social tab, streak → nothing.
- The card is hidden while the welcome tour is visible (the tour spotlights Home elements the card would shift).
- The old local checklist (`tour_cl_*` AsyncStorage flags, `markLesson`/`markPractice`/`markFriend`/`markStreak`)
  is gone: the server is the only source of truth.
