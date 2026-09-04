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

## Roadmap locked state (Inicio timeline)

The Inicio lesson-roadmap draws locked / review / chest nodes and labels with a muted grey that
has no equivalent in the palettes above.

| Token | Hex | Use |
|---|---|---|
| `colors.roadmapLockedIcon` | `#A9A09A` | locked node icon, dimmed lesson label, disabled CTA text |
| `colors.roadmapLockedBorder` | `#DCD2C8` | locked node border |

## Social module (vino)

The Social tab and the notifications inbox use a wine accent instead of the brand violet, matching
`Modulo Social.dc.html`. See [../features/social.md](../features/social.md).

| Token | Hex | Use |
|---|---|---|
| `colors.socialWine` | `#8A2C5E` | Social header, active tab, primary action, unread dot |
| `colors.socialWineDeep` | `#96406D` | decorative circle inside the header |
| `colors.socialWineLight` | `#F6E4EC` | active "me gusta" background, unread notification row |

### Avatar palette

Avatars show initials over one of six pairs, picked **deterministically from the user's id**
(`avatarColors()` in `features/social/people.ts`) so a person keeps the same color everywhere.

| Token | Hex | Paired foreground |
|---|---|---|
| `colors.primaryLight` | `#EEE8FF` | `colors.primaryDark` |
| `colors.avatarTealLight` | `#E0F4F2` | `colors.avatarTealDark` (`#1F7E77`) |
| `colors.avatarWineLight` | `#FDE8F1` | `colors.socialWine` |
| `colors.avatarAmberLight` | `#FEF0DE` | `colors.shopAmberDark` |
| `colors.avatarBlueLight` | `#E4F1FB` | `colors.gemsBlueDark` |
| `colors.avatarGreenLight` | `#E9F3EB` | `colors.successDark` |

## Neutral grays (profile screen uses a pure-gray palette)

The profile / stats screens use a pure-gray palette rather than the warm-toned one. Use these tokens in those screens.

| Token | Hex | Use |
|---|---|---|
| `colors.neutral900` | `#111111` | primary text (profile) |
| `colors.neutral600` | `#86868B` | muted text (profile) |
| `colors.neutral200` | `#E7E7E9` | borders (profile) |
| `colors.neutral100` | `#F2F2F3` | fills / inputs (profile) |

## Shop / tienda palette (use in the Store tab)

| Token | Hex | Use |
|---|---|---|
| `colors.shopAmber` | `#DE7211` | tienda header, featured item, success/opening overlays |
| `colors.shopAmberDark` | `#B85806` | success overlay background, "te quedan" emphasis text |
| `colors.shopAmberLight` | `#FBE4C8` | icon medallion tint for amber-toned items |
| `colors.warningLight` | `#FEF3D6` | icon medallion tint for `warning`-toned items (XP boosters) |
| `colors.dangerLight` | `#FBE0D8` | icon medallion tint for `danger`-toned items (lives) |

## Legacy tokens (do NOT use in new screens)

`accent`, `white`, `azulOscuro`, `blanco`, `morado`, `verde`, `amarillo`, `rosado`. Kept only for old screens (and `AppNavigator` uses `azulOscuro`/`white` in its header). New design → current tokens above.
