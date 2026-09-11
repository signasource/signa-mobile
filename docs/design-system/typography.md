# Typography

> Responsibility: font families, sizes, font loading, and the shared `Text` wrapper.
> Update when: a font family/weight, a `fontSizes` value, or `Text`'s base style changes.
> Sources: src/theme/typography.ts, src/components/Text.tsx, App.tsx

Import: `import { fonts, fontSizes } from "@/theme"`.

## The `Text` wrapper

Always render copy through `@/components/Text`, never React Native's `Text`. It applies the
accessibility font scale from `SettingsContext`; it does **not** set a default `textAlign`.

Long-form body/paragraph styles opt into `textAlign: "justify"` themselves — e.g. `InfoBlock`'s
`paragraph`/`citation` styles, `MythDeck`'s `faceBody`, `IntroScreen`'s `body`, `StoreTabScreen`'s
`cardDesc`. Titles, labels, buttons, short or centered messages, and narrow-column text (list rows,
notification rows, achievement rows) stay left as authored — RN's Android justification can clip
glyphs at the right edge on narrow columns or short lines, which reads as missing letters, so it's
opt-in per style rather than a blanket default.

## Families

- **Bricolage Grotesque** (display/titles): `fonts.displaySemiBold`, `fonts.displayBold`, `fonts.displayExtraBold`.
- **Figtree** (body, labels, buttons): `fonts.bodyRegular`, `fonts.bodyMedium`, `fonts.bodySemiBold`, `fonts.bodyBold`.
- Legacy aliases (`headingRegular/Medium/SemiBold` → Figtree; `headingBold` → Bricolage Bold): existing code only.

## Sizes (`fontSizes`)

`xs:12`, `sm:13`, `md:16`, `lg:20`, `xl:24`, `xxl:32`, `display:40`.

## Loading

Fonts load in `App.tsx` via `useFonts` (app blocks with a loader until ready). A new weight must also be registered there.
