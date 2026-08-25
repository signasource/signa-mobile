# Colors

> Responsibility: color tokens (current and legacy).
> Update when: a color token is added, changed, or removed.
> Sources: src/theme/colors.ts

Import: `import { colors } from "@/theme"`. Rule: every visual value comes from a token; never hardcode hex. Hex values below mirror `colors.ts` (authoritative).

## Current tokens (use these)

| Token | Hex | Use |
|---|---|---|
| `colors.primary` | `#7857FF` | brand primary (violet) |
| `colors.primaryLight` | `#EEE8FF` | soft fills over primary |
| `colors.primaryDark` | `#5E3ED1` | pressed/emphasis primary |
| `colors.primaryMedallion` | `#E0D5FF` | `AuthIconBadge` background |
| `colors.background` | `#FAF6F2` | screen background |
| `colors.surface` | `#FFFFFF` | cards / surfaces |
| `colors.fill` | `#F2ECE6` | field / secondary-button fill |
| `colors.fillDark` | `#EBE3DB` | stronger fill |
| `colors.text` | `#241A16` | primary text (and `PrimaryButton` background) |
| `colors.textMuted` | `#8C817A` | muted text / subtitles |
| `colors.onPrimary` | `#F5F0FF` | text over primary |
| `colors.onDark` | `#FBF6F2` | text over dark surfaces |
| `colors.border` | `#ECE5DE` | borders |
| `colors.success` | `#4CA65C` | success |
| `colors.warning` | `#FBBF24` | warning |
| `colors.danger` | `#E14E22` | error |

## Gamification / profile palette (use in profile and stats screens)

| Token | Hex | Use |
|---|---|---|
| `colors.streakOrange` | `#FB8B24` | streak badge, racha |
| `colors.gemsBlue` | `#29B6E8` | gems icon/border |
| `colors.gemsBlueDark` | `#1B84AB` | gems text/count |
| `colors.courseTeal` | `#2FA8A0` | courses, sign count |
| `colors.livesRed` | `#E03B3B` | heart / lives icon |
| `colors.infinitePink` | `#E86AA6` | infinite lives booster |
| `colors.successDark` | `#2E7D45` | active booster text |
| `colors.successLight` | `#E7F5EA` | active booster background |

## Neutral grays (profile screen uses a pure-gray palette)

The profile / stats screens use a pure-gray palette rather than the warm-toned one. Use these tokens in those screens.

| Token | Hex | Use |
|---|---|---|
| `colors.neutral900` | `#111111` | primary text (profile) |
| `colors.neutral600` | `#86868B` | muted text (profile) |
| `colors.neutral200` | `#E7E7E9` | borders (profile) |
| `colors.neutral100` | `#F2F2F3` | fills / inputs (profile) |

## Legacy tokens (do NOT use in new screens)

`accent`, `white`, `azulOscuro`, `blanco`, `morado`, `verde`, `amarillo`, `rosado`. Kept only for old screens (and `AppNavigator` uses `azulOscuro`/`white` in its header). New design → current tokens above.
