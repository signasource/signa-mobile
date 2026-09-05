# Components

> Responsibility: UI primitive catalog and shared visual conventions.
> Update when: a primitive is added/changed, or a shared visual convention changes.
> Sources: src/components/, src/components/auth/index.ts, src/utils/color.ts

Reuse a primitive before creating a new one. Tokens → [colors.md](./colors.md), [typography.md](./typography.md). Styling rule: `StyleSheet.create()` at file end, tokens only (see [`CLAUDE.md`](../../CLAUDE.md)).

## Generic (`src/components/`)

| Component | Main props | Use |
|---|---|---|
| `Button` | `label, onPress, variant?("primary"\|"secondary"), loading?, disabled?, style?` | generic CTA (outside auth): black primary / neutral secondary |
| `ScreenHeader` | `title, description?, paddingTop, tone, stats?, left?, right?, children?, compact?` | **the** colored hero header of every top-level screen |
| `SegmentedControl` | `options(Segment[]), value, onChange, style?` | primary selector (full width, black active) |
| `SubTabs` | `options(SubTab[]), value, onChange, style?` | secondary selector (outlined pills + icon) |
| `EmptyState` / `EmptyNote` | `icon, title, description` / `children` | the single empty-state style |
| `Input` | `label, error?` + `TextInputProps` | generic form field |
| `Card` | `style?` + `ViewProps` | soft-shadow container, radius 16 |
| `BackButton` | `onPress, visible?, color?, style?` | back chevron, no background |
| `NavIconButton` | `icon, onPress, label, color?, size?, children?` | header icon button, no background (also in `BackButton.tsx`) |
| `FieldIcon` | `name(FieldIconName), size?, color?` | Ionicons outline for fields/badges |
| `OnboardingProgress` | `progress(0-1), onBack?` | onboarding progress bar |

## Auth / onboarding (`src/components/auth/`, barrel `index.ts`)

| Component | Main props | Use |
|---|---|---|
| `AuthScreen` | `children, onBack?, canGoBack?, contentStyle?` | **mandatory shell** for auth/onboarding: safe area, keyboard, scroll, back |
| `AuthField` | `icon(FieldIconName), secure?, invalid?, error?, hint?, hintTone?, trailing?` + `TextInputProps` | pill input with icon, password toggle, `trailing` slot (e.g. availability ✓/✕) |
| `PrimaryButton` / `SecondaryButton` | `label, onPress, loading?, disabled?, style?` | auth CTA (dark primary / light secondary) |
| `AuthHeading` | `title, subtitle?, style?` | heading (Bricolage + Figtree subtitle) |
| `AuthIconBadge` | `icon(FieldIconName)` | medallion with icon (Verify/Forgot/Reset) |
| `PasswordChecklist` | `rules(PasswordRules)` | live password-rules checklist |
| `AuthDivider` / `AuthFooter` / `StatusText` | see source | "or" divider, footer with link, status/error text |

Barrel exports (`src/components/auth/index.ts`): `AuthScreen`, `AuthField`, `PrimaryButton`, `SecondaryButton`, `AuthHeading`, `AuthIconBadge`, `AuthDivider`, `AuthFooter`, `StatusText`, `PasswordChecklist`.

`FieldIconName`: `name, user, email, password, token, key, eye, eyeOff` (mapped to Ionicons outline in `FieldIcon`).

## Visual conventions

- Inputs: **pill** shape (radius ~16), `colors.fill` background; on error → white with shadow + `danger` border.
- Cards: white, subtle shadow, radius 16.
- Buttons: radius **14**, no shadow. Primary = `colors.text` on `colors.onDark`; secondary = `colors.neutral100` on `colors.neutral900` (the "Cancelar" of the logout dialog). Only contrast CTAs over a colored surface (e.g. "Vidas ilimitadas" in the Tienda) and destructive actions keep another fill. `ActivityIndicator` when `loading`; reduced opacity on `disabled`/press.
- Navigation buttons (back, bell, settings, sheet close) have **no background**; back always uses the onboarding chevron via `BackButton`.
- Headers: one `ScreenHeader` for every screen — same title size (`fontSizes.xxl`), a bubble in the top-right corner, and stats as uppercase label on top + icon + value (the Tienda pattern). Top-level screens add a `description` and share `minHeight`; secondary screens (Configuración, Notificaciones) pass `compact` and no `description`/`stats`, which drops the `minHeight` and leaves them all at the same reduced height.
- Grids (achievements, colour swatches) size their cells as a **percentage** of the row (`width: "33.3333%"` / `"16.6667%"` plus a gutter via `paddingHorizontal` + negative `marginHorizontal`), never from `Dimensions.get("window")`, so they span the full width on any screen.
- Selectors: `SegmentedControl` (primary) and `SubTabs` (secondary) always span the full width.
- **Spacing**: no centralized scale; paddings/margins are per-component in each `StyleSheet` (typical 4–32). Screen horizontal padding **20px** (header, selectors and content share the same gutter); card padding ~18px.
