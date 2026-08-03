# Components

> Responsibility: UI primitive catalog and shared visual conventions.
> Update when: a primitive is added/changed, or a shared visual convention changes.
> Sources: src/components/, src/components/auth/index.ts

Reuse a primitive before creating a new one. Tokens → [colors.md](./colors.md), [typography.md](./typography.md). Styling rule: `StyleSheet.create()` at file end, tokens only (see [`CLAUDE.md`](../../CLAUDE.md)).

## Generic (`src/components/`)

| Component | Main props | Use |
|---|---|---|
| `Button` | `label, onPress, variant?("primary"\|"secondary"\|"outline"), loading?, disabled?, style?` | generic CTA (outside auth) |
| `Input` | `label, error?` + `TextInputProps` | generic form field |
| `Card` | `style?` + `ViewProps` | soft-shadow container, radius 16 |
| `BackButton` | `onPress, visible?` | circular back button |
| `FieldIcon` | `name(FieldIconName), size?, color?` | Ionicons outline for fields/badges |
| `SignaLogo` | `size?, barColor?, bgColor?` | logo (3 bars) |
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
- Buttons: `minHeight` ~58, radius ~18; `ActivityIndicator` when `loading`; reduced opacity on `disabled`/press.
- **Spacing**: no centralized scale; paddings/margins are per-component in each `StyleSheet` (typical 4–32). Screen horizontal padding ~30px; card padding ~18px.
