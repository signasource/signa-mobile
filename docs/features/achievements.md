# Achievements

> Responsibility: achievements and their celebration screen (themes per group, streak medal, rewards).
> Update when: a group, theme, reward, the celebration flow or its backing endpoint changes.
> Sources: src/features/achievements/, design/achievement-coin/, assets/achievements/, src/api/achievements.ts, src/navigation/RootNavigator.tsx, scripts/build-streak-medals.mjs, assets/animations/

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
  and a `+N protectores de racha` pill when it pays shields. Gems are shown big, outside the card, by `components/GemReward.tsx`: a white chip that counts up from 0 to `+N gemas` (0.8 s, then a bump) under the subtitle.
- **Mock animation** (`components/CelebrationAnimation.tsx`): while a theme has `animation: null` it
  shows the group icon pulsing inside expanding rings.
- **Plug a real animation in:** drop the Lottie JSON in `assets/animations/` and set
  `animation: require("@assets/animations/<file>.json")` (and `aspect` = width / height) on the
  theme. Nothing else changes.

## Achievement coins

Every non-streak achievement with a coin (17 of them) shows a coin with its icon carved in the middle
instead of the generic trophy: celebration reward card, profile grid and detail, public profile.
Streaks keep the animated medal above.

- **Source of truth:** `design/achievement-coin/` (`coin-base.svg`, Phosphor *fill* icons in `icons/`,
  `PROMPT.md` for Claude Design, `build-coins.mjs`). `node design/achievement-coin/build-coins.mjs`
  regenerates `design/achievement-coin/coins/` (full SVGs with the shine, for review) and
  `assets/achievements/coins/<CODE>.svg` (app copies, **without** the shine). Metal per achievement and
  palettes live in that script; palettes match `build-streak-medals.mjs`. The carved icon is the exact
  rim colour of its metal.
- **Mapping:** `features/achievements/coins.ts` keys each SVG by `criteriaType:criteriaValue` (the
  celebration screen has no `code`). `hasAchievementArt()` is true for streaks and for achievements with a
  coin; anything else keeps the trophy / lock icon. A new seeded achievement needs: icon in `icons/`, entry in
  `build-coins.mjs`, entry in `coins.ts`.
- **Animation:** `<AchievementCoin animated />` = spring pop-in + a diagonal light band that sweeps the
  coin every ~4 s (1.2 s sweep, 2.8 s pause), all native-driver `Animated` (translateX / scale), clipped
  to the coin face. SMIL/CSS inside an SVG doesn't run in `react-native-svg`, which is why the shine is a
  separate overlay. Lists render the coin still. `<AchievementArt>` picks medal vs. coin.
- **Celebration screen:** when the achievement has a coin (and is not a streak), the middle of
  `AchievementCelebrationScreen` is `<CoinCelebration>` instead of the Lottie / mock: a 230 px coin
  spins in from above (rotateY + overshoot, 0.9 s), then a shock-wave ring pair and a 26-piece confetti
  burst fire as it lands, a sunburst keeps rotating behind it, and the coin floats with its light sweep.
  The headline, the reward card (without the small badge, since the coin is the hero) and the gem chip count-up fade
  in after ~1 s. Streaks keep the fire + medal. All timings are constants at the top of
  `components/CoinCelebration.tsx` and `COIN_REVEAL_DELAY_MS` in the screen. **Haptics** (`hooks/useHaptics.ts`, `expo-haptics`): a double hit when the coin lands whose second hit rings out and fades (heavy, heavy, medium ×2, light ×2, tick, over ~0.8 s; `LANDING_HAPTICS` in `CoinCelebration.tsx`, armed in the same tick as the confetti burst so they stay in sync), a light tick each time the gem counter crosses a step (max 10; the count starts only after the landing haptics end, `LANDING_HAPTICS_DONE_MS`) and a success buzz when it finishes. `useHaptics` honours the *Vibración* switch of Configuración, which `SettingsContext` now mirrors as `vibrationEnabled` (loaded with the font size, default on). Adding `expo-haptics` needs a dev-build rebuild.

## Streak day screen

Not an achievement: `features/achievements/screens/StreakDayScreen.tsx` (route `StreakDay`) celebrates
**a day added to the streak**, with the same `streak-fire.json` and `streak` theme.

- **Backend event (same pattern as unseen achievements):** `UserStats.streakCelebratedDate` records the
  streak day already celebrated. Today's streak day is *pending* while `lastStreakDate` is today and
  that column is not. `GET /users/me/streak-day` → `{ pending, currentStreak }`;
  `POST /users/me/streak-day/seen` marks it. Includes a streak that restarts at 1 after missed days.
  Endpoints → [../api/endpoints.md](../api/endpoints.md).
- **Mobile:** `AchievementCelebrationContext.refresh()` fetches unseen achievements **and** the streak
  day in one go (login, app back to foreground, leaving `Lesson`/`PracticeSession`) and exposes
  `pendingStreakDay` / `consumeStreakDay`. `RootNavigator` navigates to `StreakDay { streak }` unless
  mid-lesson or already on a celebration. `StreakDayScreen` marks it seen **on mount**, so a killed
  app can't replay it; a handed-out streak value is ignored until the backend reports it as no longer
  pending.
- **Order:** shield → streak day → achievement, one at a time. `RootNavigator` runs a single effect
  with an `inFlight` ref (the route just navigated to): until the navigator reports that route,
  `currentRouteName` is stale, so a second `navigate` would stack celebrations (and the achievement
  could be skipped or shown out of order). Each one waits until the previous screen is closed.
- Copy: `streakDayHeadline` / `streakDaySubtitle` in `celebrations.ts`.

## Streak shield screen

`features/achievements/screens/StreakShieldScreen.tsx` (route `StreakShield`, theme `shield`,
background `colors.celebrationShield`) tells the user the nightly scheduler **burned a shield to keep the
streak alive**. It rides on the same call as the streak day: `GET /users/me/streak-day` also returns
`shieldPending`; `refresh()` exposes `pendingStreakShield` / `consumeStreakShield`, and the screen marks it
seen **on mount** with `POST /users/me/streak-shield/seen`. Copy: `streakShieldHeadline` /
`streakShieldSubtitle` in `celebrations.ts`; the button ("¡Seguir aprendiendo!") just goes back. It is
always shown first (shield → streak day → achievement).

## Mobile pieces

| Piece | File |
|---|---|
| Polling + queue (`useAchievementCelebration`: `pending`, `consume`, `pendingStreakDay`, `pendingStreakShield`, `refresh`) | `features/achievements/AchievementCelebrationContext.tsx` |
| Celebration screen | `features/achievements/screens/AchievementCelebrationScreen.tsx` |
| Themes, kind mapping, headlines | `features/achievements/celebrations.ts` |
| Animation or its mock | `features/achievements/components/CelebrationAnimation.tsx` |
| Streak medal (`<StreakMedal days size animated />`) | `features/achievements/components/StreakMedal.tsx` |
| Medal tier mapping + Lottie sources | `features/achievements/streakTier.ts` |
| Looping Lottie (drives `progress` from JS; never use `autoPlay` — on Android its native `play` command crashes with "play on view with tag N, since the view does not exist" when the screen unmounts) | `features/achievements/components/LoopingLottie.tsx` |

- `AchievementCelebrationProvider` checks on login and when the app returns to the foreground.
  `RootNavigator` (`AchievementCelebrationConnected`) re-checks as soon as the user **leaves `Lesson` or
  `PracticeSession`**, and navigates to `AchievementCelebration` unless the user is mid-lesson.
- The screen marks the achievement as seen **on mount**, so a killed app can't replay it. The reward
  is already credited server-side; the screen is purely cosmetic, and its button reads **Reclamar N gemas** ("gema" when it is 1)
  when the achievement pays gems (otherwise "¡Genial!").
- **Achievements stack with challenges.** Finishing the first lesson pays the `FIRST_LESSON` achievement
  (+10 gemas, this screen) *and* the first-steps challenge (+20, claimed on Home) → 30 in total. Same
  for "Primer amigo" (+20 when the request is accepted) and the XP achievements vs. the XP challenges.
- `ProfileScreen` and `PublicProfileScreen` show the tier medal for earned streak achievements (still
  frame in the grid, animated in the detail modal); everything else keeps the trophy / lock icon.

## Streak medals

All animation files, their sources and compatibility notes are inventoried in [`assets/animations/README.md`](../../assets/animations/README.md).

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
