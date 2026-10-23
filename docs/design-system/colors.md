# Colors

> Responsibility: color tokens.
> Update when: a color token is added, changed, or removed.
> Sources: src/theme/colors.ts, src/theme/headerColors.ts, eslint.config.js

Import: `import { colors, alpha } from "@/theme"`. Rule: every color comes from a token; never hardcode hex or `rgba()`. Hex values below mirror `colors.ts` (authoritative).

**Enforced by lint.** `eslint.config.js` (`no-restricted-syntax`) fails `npm run lint` on any hex
literal, `rgb()/rgba()/hsl()` string, or hex/rgba inside a template literal anywhere in `src/`
except `src/theme/`. HTML built for a WebView (`recognizerHtml.ts`) interpolates tokens too:
`` `background: ${colors.fillDark};` ``.

**Every color is a design decision — never swap one for a "close enough" token.** When migrating
a value, map it to a token with the *exact same* hex; if none exists, add one with that value.

**Translucency:** `alpha(colors.x, 0.55)` returns `rgba(r,g,b,0.55)` of the token — use it instead
of an `rgba()` literal. Appending a hex alpha suffix (`colors.onColor + "47"`) also works.

## Current tokens (use these)

| Token | Hex | Use |
|---|---|---|
| `colors.primary` | `#7857FF` | brand primary (violet) |
| `colors.primaryLight` | `#EEE8FF` | soft fills over primary |
| `colors.primaryDark` | `#5E3ED1` | pressed/emphasis primary |
| `colors.primaryMedallion` | `#E0D5FF` | `AuthIconBadge` background |
| `colors.background` | `#FAF6F2` | screen background |
| `colors.surface` | `#FFFFFF` | cards / surfaces |
| `colors.fill` | `#F2ECE6` | field fill, inactive `SegmentedControl` segment |
| `colors.fillDark` | `#EBE3DB` | stronger fill |
| `colors.text` | `#241A16` | primary text, **every primary button**, active selector |
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
| `colors.streakCelebration` | `#FDA55A` | background of the streak achievement celebration screen (lighter than `streakOrange`) |
| `colors.celebrationLessons` | `#9B86FF` | achievement celebration background: lessons |
| `colors.celebrationCourses` | `#5FC4BB` | achievement celebration background: courses |
| `colors.celebrationXp` | `#F6BC4B` | achievement celebration background: total XP |
| `colors.celebrationWeeklyXp` | `#7FA6FF` | achievement celebration background: weekly XP |
| `colors.celebrationFriends` | `#E27FA9` | achievement celebration background: friends |
| `colors.celebrationGifts` | `#F59BC4` | achievement celebration background: gifts |
| `colors.celebrationShop` | `#F29A4F` | achievement celebration background: shop |
| `colors.celebrationGeneric` | `#9B86FF` | achievement celebration background: any other achievement |
| `colors.gemsBlue` | `#29B6E8` | gems icon/border |
| `colors.gemsBlueDark` | `#1B84AB` | gems text/count |
| `colors.courseTeal` | `#2FA8A0` | courses, sign count |
| `colors.courseTealLight` | `#E4F1EC` | icon medallion tint for `courseTeal`-toned items (Práctica libre) |
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
| `colors.socialWine` | `#8A2C5E` | Social / Notificaciones header, unread dot |
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
| `colors.neutral100` | `#F2F2F3` | fills / inputs (profile), **every secondary button** |

## Shop / tienda palette (use in the Store tab)

| Token | Hex | Use |
|---|---|---|
| `colors.shopAmber` | `#DE7211` | tienda header, featured item, success/opening overlays |
| `colors.shopAmberDark` | `#B85806` | success overlay background, "te quedan" emphasis text |
| `colors.shopAmberLight` | `#FBE4C8` | icon medallion tint for amber-toned items |
| `colors.warningLight` | `#FEF3D6` | icon medallion tint for `warning`-toned items (XP boosters) |
| `colors.dangerLight` | `#FBE0D8` | icon medallion tint for `danger`-toned items (lives) |

> Module colors (wine, amber, violet) no longer tint selectors or CTAs: those are always
> `colors.text` / `colors.neutral100`. Module colors survive in headers, medallions and accents.

## White, black and foreground on color

Two whites exist and are **not** interchangeable:

| Token | Hex | Use |
|---|---|---|
| `colors.surface` | `#FFFFFF` | white **background** (cards, inputs, tour cards) |
| `colors.onColor` | `#FFFFFF` | pure-white **foreground** where the design uses it: onboarding/challenge checks, achievement celebration, `AppNavigator` header tint, tour; base of the translucent white overlays (`alpha(colors.onColor, 0.94)`) |
| `colors.onDark` | `#FBF6F2` | warm off-white foreground used by most newer components (buttons, toasts, social) |
| `colors.black` | `#000000` | shadows (`shadowColor`) and black scrims (`alpha(colors.black, 0.45)`) |

Keep whichever one a screen already uses — they are different design decisions.

The old aliases (`accent`, `white`, `azulOscuro`, `blanco`, `morado`, `verde`, `amarillo`,
`rosado`) were removed from `colors.ts` on 2026-10-23; using one is now a type error.

## Per-surface tones

Exact values that were hardcoded in a single area; each is its own decision.

| Token | Hex | Use |
|---|---|---|
| `colors.textBody` | `#3D332E` | long-form lesson paragraphs (`InfoBlock`) |
| `colors.textSecondary` | `#6E625C` | tour body copy |
| `colors.textFaint` | `#B0A7A0` | footer hints / counters in lesson blocks |
| `colors.placeholder` | `#D6CCC4` | `SpellNameBlock` input placeholder |
| `colors.separatorDot` | `#C9BFB7` | `LessonHeader` separator dot |
| `colors.neutral400` | `#B8B8BD` | disabled icons/text in Perfil and Configuración |
| `colors.fillSoft` | `#F7F2EC` | middle layer of the `SignCarouselBlock` stack |
| `colors.dangerText` | `#B0503A` | wrong-answer label (`SignPlaceholder`) |
| `colors.matchSuccessTint` / `matchDangerTint` | `#DCEFE0` / `#F6CFC3` | matched / wrong rows in `MatchBlock` (used at 0.72 / 0.55) |
| `colors.youtubeRed` | `#FF0000` | YouTube icon (`IntroduceSignBlock`) |
| `colors.dangerDisabled` / `dangerDisabledText` | `#F6D7CD` / `#D9A697` | "Eliminar" button before the account deletion is confirmed |
| `colors.skyLight` | `#D6EFFA` | friend-accepted screen and modal background |
| `colors.tourScrim` | `#181020` | tour overlays (used at 0.5–0.74) and card shadow |
| `colors.connectionOk` | `#34D339` | reachable dot in `ConnectionTestScreen` |

## Profile header palette

`headerColors` (`src/theme/headerColors.ts`): the 30 `{ name, hex }` colors a user picks for their
profile header, shared by `ProfileScreen` and `ConfigurationScreen`. The chosen hex is stored on
the backend — never change an existing value.
