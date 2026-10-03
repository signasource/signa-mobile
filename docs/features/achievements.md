# Achievements

> Responsibility: achievements and their celebration screen (themes per group, streak medal, rewards).
> Update when: a group, theme, reward, the celebration flow or its backing endpoint changes.
> Sources: src/features/achievements/, src/api/achievements.ts, src/navigation/RootNavigator.tsx, scripts/build-streak-medals.mjs, assets/animations/

**Real**, wired to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md). Route → [../navigation.md](../navigation.md).

## How it works end to end

1. **Backend grants the achievement** (`AchievementService.awardReached`) when something of its
   `criteriaType` happens, and credits its rewards (`rewardGems`, `rewardStreakShields`):

   | Criteria | Evaluated when |
   |---|---|
   | `STREAK_DAYS` | the day's first activity: `UserStats.registerStreakActivity(streakDay)`. Consecutive days extend the streak; every missed day burns one **streak shield**; without enough shields it restarts at 1 |
   | `TOTAL_XP`, `WEEKLY_XP` | XP is earned |
   | `LESSONS_COMPLETED`, `COURSES_COMPLETED` | a lesson / course is completed |
   | `GIFTS_SENT`, `SHOP_PURCHASES` | a gift is sent / a purchase is made |
   | `FRIENDS_COUNT` | a friend request is accepted (both people) |

   The day rolls over at local midnight in **Argentina** (`America/Argentina/Cordoba`, UTC-3); daily
   XP, the daily goal and weekly XP use the same calendar.
2. **Every grant starts unseen.** Mobile finds out through `GET /achievements/unseen`, shows the
   celebration, then `POST /achievements/{id}/seen` so it never replays.

## Catalog

Seeded in `signa-api` (`db/seed/achievements.sql`), inspired by `Gamificación.xlsx`.

| Group | Achievements |
|---|---|
| Lessons | 1, 25, 50, 100 completed |
| Courses | 1, 3 completed |
| Streak | 3, 7, 14, 30, 60, 100 days (shields +1, +1, +2, +3, +4, +5) |
| Total XP | 500, 5.000, 25.000, 100.000 |
| Weekly XP | 1.000, 3.000 |
| Social | **Primer amigo**, 1 and 5 gifts sent |
| Shop | 1 and 5 purchases |

Left out until the backend can award them: daily/weekly challenges and "streak without shields".
`CHALLENGE_CHAMPION` is seeded inactive, which is why the app asks for `active=true`.

## Celebration screen

One screen for every achievement: `features/achievements/screens/AchievementCelebrationScreen.tsx`.
The look comes from `features/achievements/celebrations.ts`:

| Kind (`criteriaType`) | Background token | Icon | Animation |
|---|---|---|---|
| `streak` (`STREAK_DAYS`) | `streakCelebration` | flame | **real**: `streak-fire.json` |
| `lessons` (`LESSONS_COMPLETED`) | `celebrationLessons` | book | **real**: `achievement-lessons.json` |
| `courses` (`COURSES_COMPLETED`) | `celebrationCourses` | school | **real**: `achievement-courses.json` |
| `xp` (`TOTAL_XP`) | `celebrationXp` | flash | mock |
| `weeklyXp` (`WEEKLY_XP`) | `celebrationWeeklyXp` | trending-up | mock |
| `friends` (`FRIENDS_COUNT`) | `celebrationFriends` | people | mock |
| `gifts` (`GIFTS_SENT`) | `celebrationGifts` | gift | mock |
| `shop` (`SHOP_PURCHASES`) | `celebrationShop` | bag-handle | mock |
| `generic` (anything else) | `celebrationGeneric` | trophy | mock |

- **Headline** (`headlineFor`): "¡Llegaste a 14 días de racha!", "¡Completaste tu primera lección!",
  "¡Hiciste tu primer amigo!"… The first achievement of a group reads "primer/primera".
- **Reward card:** the streak medal (animated) or the group icon in a circle, the achievement title,
  and `+N gemas` / `+N protectores de racha` pills when the reward is not zero.
- **Mock animation** (`components/CelebrationAnimation.tsx`): while a theme has `animation: null` it
  shows the group icon pulsing inside expanding rings.
- **Plug a real animation in:** drop the Lottie JSON in `assets/animations/` and set
  `animation: require("@assets/animations/<file>.json")` (and `aspect` = width / height) on the
  theme. Nothing else changes.

## Mobile pieces

| Piece | File |
|---|---|
| Polling + queue (`useAchievementCelebration`: `pending`, `consume`, `refresh`) | `features/achievements/AchievementCelebrationContext.tsx` |
| Celebration screen | `features/achievements/screens/AchievementCelebrationScreen.tsx` |
| Themes, kind mapping, headlines | `features/achievements/celebrations.ts` |
| Animation or its mock | `features/achievements/components/CelebrationAnimation.tsx` |
| Streak medal (`<StreakMedal days size animated />`) | `features/achievements/components/StreakMedal.tsx` |
| Medal tier mapping + Lottie sources | `features/achievements/streakTier.ts` |

- `AchievementCelebrationProvider` checks on login and when the app returns to the foreground.
  `RootNavigator` (`AchievementCelebrationConnected`) re-checks as soon as the user **leaves `Lesson` or
  `PracticeSession`**, and navigates to `AchievementCelebration` unless the user is mid-lesson.
- The screen marks the achievement as seen **on mount**, so a killed app can't replay it. The reward
  is already credited server-side; the screen is purely cosmetic.
- `ProfileScreen` and `PublicProfileScreen` show the tier medal for earned streak achievements (still
  frame in the grid, animated in the detail modal); everything else keeps the trophy / lock icon.

## Streak medals

| Days | Medal |
|---|---|
| 3 | bronze |
| 7 | silver |
| 14 | gold |
| 30 | sapphire |
| 60 | amethyst |
| 100 | ruby |

| File | Use |
|---|---|
| `assets/animations/achievement-<group>.json` | Celebration animation of a group (lessons, courses). They carry After Effects expressions (elastic bounce, colours linked to a controller layer) that native Lottie ignores: they play with their base colours and without the bounce |
| `assets/animations/streak-fire.json` | Big fire of the streak celebration (gradient fills, not recoloured) |
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
