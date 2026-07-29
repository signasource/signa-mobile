# Typography

> Responsibility: font families, sizes, and font loading.
> Update when: a font family/weight or a `fontSizes` value changes.
> Sources: src/theme/typography.ts, App.tsx

Import: `import { fonts, fontSizes } from "@/theme"`.

## Families

- **Bricolage Grotesque** (display/titles): `fonts.displaySemiBold`, `fonts.displayBold`, `fonts.displayExtraBold`.
- **Figtree** (body, labels, buttons): `fonts.bodyRegular`, `fonts.bodyMedium`, `fonts.bodySemiBold`, `fonts.bodyBold`.
- Legacy aliases (`headingRegular/Medium/SemiBold` → Figtree; `headingBold` → Bricolage Bold): existing code only.

## Sizes (`fontSizes`)

`xs:12`, `sm:13`, `md:16`, `lg:20`, `xl:24`, `xxl:32`, `display:40`.

## Loading

Fonts load in `App.tsx` via `useFonts` (app blocks with a loader until ready). A new weight must also be registered there.
