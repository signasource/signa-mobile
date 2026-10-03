# Achievements — streak milestones

> Responsibility: the streak-milestone achievements (celebration screen, tiered medal, shield reward).
> Update when: a milestone, tier, reward, the celebration flow or its backing endpoint changes.
> Sources: src/features/achievements/, src/api/achievements.ts, src/navigation/RootNavigator.tsx, scripts/build-streak-medals.mjs, assets/animations/

**Real**, wired to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md). Route → [../navigation.md](../navigation.md).

## How it works end to end

1. **Backend counts the streak.** Each `XpEarnedEvent` calls `UserStats.registerStreakActivity(streakDay)`:
   consecutive days extend it; every missed day burns one **streak shield**; without enough shields
   it restarts at 1. The streak day rolls over at local midnight in **Argentina** (`America/Argentina/Cordoba`, UTC-3); daily XP, the daily goal and weekly XP use the same Argentina calendar.
2. **Backend grants the achievement** (`AchievementService.awardStreakMilestones`) for every active
   `STREAK_DAYS` achievement the streak has reached, and credits its `rewardStreakShields`.
3. **Mobile finds out** through `GET /achievements/unseen` and shows the celebration, then
   `POST /achievements/{id}/seen` so it never replays.

## Milestones

Seeded in `signa-api` (`db/seed/achievements.sql`). The medal colour comes from the streak length
(`tierForDays`), not from the backend.

| Days | Code | Shields | Medal |
|---|---|---|---|
| 3 | `STREAK_3` | +1 | bronze |
| 7 | `STREAK_WEEK` | +1 | silver |
| 14 | `STREAK_14` | +2 | gold |
| 30 | `STREAK_MONTH` | +3 | sapphire |
| 60 | `STREAK_60` | +4 | amethyst |
| 100 | `STREAK_100` | +5 | ruby |

## Other achievements

Streak achievements are the only ones with a celebration screen. The rest are granted silently by the
backend (`AchievementService.awardReached`, gems credited on the spot) and just show up in the
profile's **Logros** section with the trophy icon. Catalog in `signa-api`
(`db/seed/achievements.sql`), inspired by `Gamificación.xlsx`:

| Group | Achievements |
|---|---|
| Lessons | 1, 25, 50, 100 completed |
| Courses | 1, 3 completed |
| Total XP | 500, 5.000, 25.000, 100.000 |
| Weekly XP | 1.000, 3.000 |
| Social | **Primer amigo**, 1 and 5 gifts sent |
| Shop | 1 and 5 purchases |

Left out until the backend can award them: daily/weekly challenges and "streak without shields".
`CHALLENGE_CHAMPION` is seeded inactive, which is why the app asks for `active=true`.

## Mobile pieces

| Piece | File |
|---|---|
| Polling + queue (`useStreakMilestone`: `pending`, `consume`, `refresh`) | `features/achievements/StreakMilestoneContext.tsx` |
| Celebration screen (orange, big fire, reward card) | `features/achievements/screens/StreakMilestoneScreen.tsx` |
| Medal (`<StreakMedal days size animated />`) | `features/achievements/components/StreakMedal.tsx` |
| Tier mapping + Lottie sources | `features/achievements/streakTier.ts` |

- `StreakMilestoneProvider` checks on login and when the app returns to the foreground.
  `RootNavigator` (`StreakMilestoneConnected`) re-checks as soon as the user **leaves `Lesson` or
  `PracticeSession`**, and navigates to `StreakMilestone` unless the user is mid-lesson.
- The screen marks the achievement as seen **on mount**, so a killed app can't replay it. The reward
  is already credited server-side; the screen is purely cosmetic.
- `ProfileScreen` shows the tier medal for earned streak achievements (still frame in the grid,
  animated in the detail modal); everything else keeps the trophy / lock icon.

## Animations

| File | Use |
|---|---|
| `assets/animations/streak-fire.json` | Big fire on the celebration screen (gradient fills, not recoloured) |
| `assets/animations/streak-medal-base.json` | Gold source medal as downloaded |
| `assets/animations/medals/<tier>.json` | One recoloured medal per tier, **generated** |

Regenerate the tiers after editing the base medal or a palette:

```bash
node scripts/build-streak-medals.mjs
```

The script swaps the five orange/yellow fills and leaves the white shine untouched. Add a tier by
adding a palette there plus an entry in `streakTier.ts`.

`lottie-react-native` is a native module: **rebuild the dev build** (`npx expo run:android`) after
pulling this change.
