# Typography

> Responsibility: font families, sizes, font loading, and the shared `Text` wrapper.
> Update when: a font family/weight, a `fontSizes` value, or `Text`'s base style changes.
> Sources: src/theme/typography.ts, src/components/Text.tsx, App.tsx

Import: `import { fonts, fontSizes } from "@/theme"`.

## The `Text` wrapper

Always render copy through `@/components/Text`, never React Native's `Text`. It applies the
accessibility font scale from `SettingsContext` **and a base `textAlign: "justify"`**, so body copy
is justified app-wide. That only affects lines that actually wrap — single-line labels look the
same — and any style setting its own `textAlign` still wins, because the local style comes after
the base one in the style array.

## Families

- **Bricolage Grotesque** (display/titles): `fonts.displaySemiBold`, `fonts.displayBold`, `fonts.displayExtraBold`.
- **Figtree** (body, labels, buttons): `fonts.bodyRegular`, `fonts.bodyMedium`, `fonts.bodySemiBold`, `fonts.bodyBold`.
- Legacy aliases (`headingRegular/Medium/SemiBold` → Figtree; `headingBold` → Bricolage Bold): existing code only.

## Sizes (`fontSizes`)

`xs:12`, `sm:13`, `md:16`, `lg:20`, `xl:24`, `xxl:32`, `display:40`.

## Loading

Fonts load in `App.tsx` via `useFonts` (app blocks with a loader until ready). A new weight must also be registered there.
