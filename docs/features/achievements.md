# Achievements — streak milestones

> Responsibility: the streak-milestone achievements (celebration screen, tiered medal, shield reward).
> Update when: a milestone, tier, reward, the celebration flow or its backing endpoint changes.
> Sources: src/features/achievements/, src/api/achievements.ts, src/navigation/RootNavigator.tsx, scripts/build-streak-medals.mjs, assets/animations/

**Real**, wired to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md). Route → [../navigation.md](../navigation.md).

## How it works end to end

1. **Backend counts the streak.** Each `XpEarnedEvent` calls `UserStats.registerStreakActivity(todayUTC)`:
   consecutive days extend it; every missed day burns one **streak shield**; without enough shields
   it restarts at 1. Days are **UTC**, same as daily XP.
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
