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
| Courses | stub | [features/courses.md](./features/courses.md) |
| ML (sign recognition) | placeholder | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Profile from JWT + local cache.** Backend exposes no `GET /users/me`; the name is cached in AsyncStorage at registration; other devices show the email.
- **Verification/reset tokens pasted by hand.** No deep linking; the user copies the token from the email.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- `GET /users/me` (or equivalent) to stop deriving the profile from the decoded JWT.
- Deep linking for email verification and password reset.
- Confirm and wire real `courses` endpoints; build `LessonScreen`.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
