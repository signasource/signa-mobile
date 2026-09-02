# Status & tech debt

> Responsibility: real/stub snapshot and cross-cutting technical debt.
> Update when: something moves stub→real, or debt is added/resolved.
> Sources: src/, .github/workflows/release.yml

## Real vs stub

Per-feature detail is owned by each feature doc; this is the index.

| Area | State | Owner doc |
|---|---|---|
| Auth (login/register→auto-login/forgot/reset/change) | real | [authentication/screens.md](./authentication/screens.md) |
| Session + token refresh | real | [authentication/auth-context.md](./authentication/auth-context.md), [api/http-client.md](./api/http-client.md) |
| Onboarding (6 screens + progress) | real | [features/onboarding.md](./features/onboarding.md) |
| Theming (palette + fonts) | real | [design-system/colors.md](./design-system/colors.md) |
| Connection test | real | `screens/ConnectionTestScreen` |
| User profile | partial | [api/session-persistence.md](./api/session-persistence.md) |
| Store / Tienda (browse catalog, buy for self) | real | [api/endpoints.md](./api/endpoints.md#shopapi-srcapishopts--mirrors-shopitemcontrollerpurchasecontroller) |
| Courses | mixed — lesson player real, catalog stub | [features/courses.md](./features/courses.md) |
| ML (sign recognition) | placeholder | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Profile from JWT + local cache.** Backend exposes no `GET /users/me`; the name is cached in AsyncStorage at registration; other devices show the email.
- **Password-reset token pasted by hand.** No deep linking; the user copies the token from the email. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **No "list my friends" endpoint.** `signa-api` only exposes send/accept friend requests, not a list of accepted friends, so the Store screen's "regalar a un amigo" flow (`POST /store/gifts`) has no UI — buying is self-only for now.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- `GET /users/me` (or equivalent) to stop deriving the profile from the decoded JWT.
- Deep linking for password reset.
- Confirm and wire real `courses` endpoints; build a lesson-path screen that navigates into the now-real `LessonScreen`.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
