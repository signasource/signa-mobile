# Status & tech debt

> Responsibility: real/stub snapshot and cross-cutting technical debt.
> Update when: something moves stub→real, or debt is added/resolved.
> Sources: src/, .github/workflows/release.yml

## Real vs stub

Per-feature detail is owned by each feature doc; this is the index.

| Area | State | Owner doc |
|---|---|---|
| Auth (login/register/verify/forgot/reset/change) | real | [authentication/screens.md](./authentication/screens.md) |
| Session + token refresh | real | [authentication/auth-context.md](./authentication/auth-context.md), [api/http-client.md](./api/http-client.md) |
| Onboarding (6 screens + progress) | real | [features/onboarding.md](./features/onboarding.md) |
| Theming (palette + fonts) | real | [design-system/colors.md](./design-system/colors.md) |
| Connection test | real | `screens/ConnectionTestScreen` |
| User profile | partial | [api/session-persistence.md](./api/session-persistence.md) |
| Profile screen (header + footer) | real | `screens/ProfileScreen` |
| Courses | stub | [features/courses.md](./features/courses.md) |
| ML (sign recognition) | placeholder | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Session identity from JWT + local cache.** `useAuth().user` still derives `email` from the JWT and `name` from the AsyncStorage cache; the full profile (incl. `username`) is available via `GET /users/me` and used by `ProfileScreen`, but the session (`AuthContext`) does not yet hydrate from it.
- **Profile screen: header + footer only.** `ProfileScreen` implements the Claude Design "Perfil" header (name/username from `GET /users/me`) and the bottom tab bar; the per-section tab content is a "Próximamente" placeholder. Streak and weekly rank are **static placeholders** — signa-api exposes no gamification/stats endpoint (`UserStats` is not surfaced). Footer tabs navigate only where a route exists (Inicio→Home, Práctica→SignRecognition); Tienda/Social are visual-only.
- **Header color picker** is wired: the top color-palette button opens a bottom-sheet swatch grid; the choice recolors the header (contrast/text derived by WCAG luminance) and persists locally via `headerColorCache` (no backend setting).
- **Edit profile** (create-outline button) opens a bottom-sheet that edits **only the username** via `PATCH /users/me` (format-validated with `isValidUsername`; handles 409 "en uso"). The `name` field is intentionally absent — signa-api has no name-update endpoint. The `settings` header icon remains visual-only.
- **Verification/reset tokens pasted by hand.** No deep linking; the user copies the token from the email.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- Hydrate `AuthContext.user` from `GET /users/me` (username/role/id) instead of only the decoded JWT + name cache.
- Expose gamification/stats endpoints (streak, weekly rank, XP) and wire the profile header + tab content to real data.
- Deep linking for email verification and password reset.
- Confirm and wire real `courses` endpoints; build `LessonScreen`.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
