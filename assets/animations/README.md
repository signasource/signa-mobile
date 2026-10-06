# Animations

Lottie JSON files used by the app (`lottie-react-native`). Everything the app needs lives here, so
any machine can manage them: no file depends on someone's Downloads folder.

Metro only bundles what the code `require()`s, so files in `spare/` cost nothing in the app.

## Inventory

| File | Used by | Notes |
|---|---|---|
| `loading.json` | `LoadingAnimation` (sign-model + screen loaders) | Bouncing dots, recoloured to the Signa violet palette |
| `confetti.json` | `LessonComplete` (lesson-finished burst) | One-shot confetti over the illustration |
| `streak-fire.json` | streak celebration (`celebrations.ts`, `streak`) | Big fire, gradient fills |
| `streak-medal-base.json` | source of `medals/*` | Gold medal as downloaded; edit this one, then regenerate |
| `medals/<tier>.json` | `StreakMedal` (`streakTier.ts`) | **Generated**, don't edit by hand |
| `achievement-lessons.json` | lessons celebration | After Effects expressions, see below |
| `achievement-courses.json` | courses celebration | After Effects expressions, see below |
| `spare/streak-fire-minimal.json` | nothing (discarded alternative) | Kept so it isn't downloaded again |

Regenerate the medals after changing `streak-medal-base.json` or a palette:

```bash
node scripts/build-streak-medals.mjs
```

## Adding an animation

1. Save the JSON here as `<purpose>.json` (lowercase, dashes).
2. Wire it in `src/features/achievements/celebrations.ts`: `animation: require("@assets/animations/<file>.json")`
   and `aspect` = `w / h` from the JSON.
3. Add a row to the table above, **with where it came from** (see next section), and update
   [`docs/features/achievements.md`](../../docs/features/achievements.md).

## Sources and licenses

Downloaded from LottieFiles, whose free plan allows a limited number of downloads per month, so
keep every file you download. Write the source URL and its license next to the file when you add it:

| File | Source URL | License |
|---|---|---|
| `streak-fire.json` | _pending_ | _pending_ |
| `streak-medal-base.json` | _pending_ | _pending_ |
| `achievement-lessons.json` | _pending_ | _pending_ |
| `achievement-courses.json` | _pending_ | _pending_ |
| `spare/streak-fire-minimal.json` | _pending_ | _pending_ |

## Compatibility notes

- `achievement-lessons.json` and `achievement-courses.json` carry After Effects **expressions**
  (elastic bounce, colours linked to a controller layer). Native Lottie ignores them: they play with
  their base colours and without the bounce. `lottie-web` (a browser preview) does run them, so
  the browser and the phone can differ.
- Prefer files under ~150 KB, transparent background, no embedded images.
