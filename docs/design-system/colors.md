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
| `colors.amber` | `#DE7211` | Tienda accent (header, featured card, CTA), chosen over the other 4 palette options explored in Claude Design |
| `colors.amberDark` | `#B85806` | pressed/emphasis amber, chest-opening overlay background |
| `colors.amberTint` | `#FBE7D2` | soft amber fills (medallions, price chip icon) |

## Legacy tokens (do NOT use in new screens)

`accent`, `white`, `azulOscuro`, `blanco`, `morado`, `verde`, `amarillo`, `rosado`. Kept only for old screens (and `AppNavigator` uses `azulOscuro`/`white` in its header). New design → current tokens above.
