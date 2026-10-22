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
| Store / Tienda (gem catalog, buy for self, **gem packs with real money via Google Play**) | real (Android; packs need a dev build + Play Console setup) | [features/store.md](./features/store.md) |
| Inicio (Home) roadmap screen | real (topics/lessons + per-lesson state from `signa-api`) | [features/courses.md](./features/courses.md#inicio-home-roadmap-screen) |
| Lesson player (`LessonScreen`) | real, wired to `signa-api` | [features/courses.md](./features/courses.md#lesson-player--real) |
| Social (feed + likes, amigos, solicitudes, búsqueda, ranking semanal) | real | [features/social.md](./features/social.md) |
| Notifications inbox | real | [features/social.md](./features/social.md#notificationsscreen) |
| Public profile (read-only, of another user) | real | [features/social.md](./features/social.md#publicprofilescreen) |
| Courses flat browse (`CoursesListScreen`) | stub | [features/courses.md](./features/courses.md#course-catalog--stub) |
| Práctica libre (`PracticeTabScreen` + `PracticeSessionScreen`) | real, wired to `signa-api` | [features/practice.md](./features/practice.md) |
| Primeros pasos + daily and weekly challenges (server-side progress, claimable gem rewards; the main source of gems) | real; needs `signa-api` with `/challenges` and the `challenges.sql` seed | [features/challenges.md](./features/challenges.md) |
| Achievements (catalog, unlocked by the backend, celebration screen per group, streak medals) | real; animations are real for streak, lessons and courses and **mocked** for the rest until their Lottie files are added; needs `signa-api` with the achievement catalog and a dev-build rebuild for Lottie | [features/achievements.md](./features/achievements.md) |
| ML (sign recognition) | real, **on-device and real time** (nothing leaves the phone) | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Profile partly from JWT + local cache.** `GET /users/me` *does* exist and `usersApi.getMe()` calls it; what is still cached in AsyncStorage is the name captured at registration, used as a fallback before the profile loads.
- **Password reset is barely usable.** The email link points at `${BASE_URL}/auth/reset-password?token=…` (`signa-api` `EmailService`), i.e. the API host and a `POST`-only endpoint, so tapping it opens an error page; the user has to dig the 36-char UUID out of the URL and paste it into `ResetPasswordScreen`. Planned fix: a 6-digit code instead of a link (hashed, 15 min TTL, max 5 attempts, `reset-password` takes `{ email, code, newPassword }`), see Next steps. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **Password-reset hardening** ([signa-api#97](https://github.com/signasource/signa-api/pull/97), pending merge): `/auth/forgot-password`, `/auth/reset-password` and `/auth/resend-verification-email` are rate-limited to 10 requests / 15 min per IP (429 `Too many requests`), and the reset email is sent `@Async` so the response no longer reveals whether an email is registered. The app has no Spanish mapping for the 429 yet: `mapAuthError` falls back to the screen's generic message — add `"Too many requests"` to `authErrors.ts` when doing the 6-digit code.
- **signa-api: rate limits can be bypassed by spoofing `X-Forwarded-For`.** `RateLimitInterceptor.getClientIp` takes the first value of the header, which the client controls (Cloudflare and nginx append to it, they don't replace it). Applies to every Bucket4j limit, not just auth. Fix: key on `CF-Connecting-IP` (set by Cloudflare) and fall back to `getRemoteAddr()`.
- **signa-api: residual timing difference in `forgotPassword`.** With the email async, an existing account still costs one token delete + insert that a missing one doesn't. Small next to the old SMTP wait; close it fully only if it shows up as measurable.
- ~~12 `react-hooks/exhaustive-deps` lint warnings.~~ Fixed: `npm run lint` is at 0 problems. Loaders became `useCallback` or moved inside their effect; values an effect must read without re-running (`cameraControls` in `GlbAnimationView`, the time drafts in `ConfigurationScreen`) go through a ref. Keep it at 0 — never silence the rule with a bare `eslint-disable`.
- **`npm audit`: 55 vulnerabilities** (20 moderate, 34 high, 1 critical), mostly transitive via Expo / React Native tooling. Not reviewed; `npm audit fix --force` would bump major versions out of the SDK 54 range, so triage them per package.
- **`unrs-resolver` postinstall blocked** by npm's `allowScripts` (dependency of `eslint-config-expo`'s import resolver). Lint works without it today; approve it with `npm install-scripts approve unrs-resolver` if import resolution ever breaks.
- **No Prettier.** Formatting is not enforced; only ESLint (`eslint-config-expo`) and `tsc` run.
- ~~No ESLint.~~ Fixed: `eslint` + `eslint-config-expo` (flat config, `eslint.config.js`), `npm run lint` = `expo lint`.
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **Sent gifts have no UI.** Sending and receiving/claiming gifts work from the Store, but `GET /store/gifts/sent` has no client, so a sender cannot see the status (pending / claimed / expired) of what they sent.
- **Gem packs are Android-only.** `useGemPurchase` only requests Google products; iOS would need App Store products, a StoreKit branch (`request.apple`) and App Store receipt verification on the backend. The section is simply not mounted off Android.
- **No `obfuscatedAccountId` on Play purchases.** The JWT carries only the email and there is no user id on the client, so purchases are not tagged with an account hash; the backend ties every token to the redeeming user anyway.
- ~~No leaderboard.~~ Implemented in `feature/ranking`: `GET /ranking/global` + `GET /ranking/friends`, weekly reset scheduler, and the Social Ranking tab.
- ~~`CourseProgress` / `Achievement` client types out of sync with the backend.~~ Fixed: `learningApi.getProgress()` returns `PublicCourseProgress[]` and `achievementsApi` returns `Achievement` = `PublicAchievement` (alias); `ProfileScreen` renders the real fields (`title`, `earned`, `earnedAt`, `criteriaValue`; trophy/lock icons since the backend sends no icon or colour).
- ~~`inventoryApi` / `shopApi` duplicated types.~~ Fixed: `ShopInventory` (`api/shop.ts`) is the single type and `shopApi.getMyInventory` the single call; `inventoryApi` / `UserInventory` are thin aliases of them.
- **Course challenges are not implemented.** The first-steps, daily and weekly sets exist (the weekly numbers are placeholders, not from `Gamificación.xlsx`); the achievements `DAILY_CHALLENGES_COMPLETED` / `WEEKLY_CHALLENGES_COMPLETED` still have nothing to count them.
- **Unclaimed daily/weekly rewards expire at the rollover.** The card only lists today's and this week's challenges, so a reward completed but not claimed before the rollover can't be claimed afterwards. Until [signa-api#96](https://github.com/signasource/signa-api/pull/96) the server didn't enforce it (yesterday's row id still paid out); with it, that claim is a 400 `Challenge has expired`.
- ~~Claim errors show the raw English server message and leave the card stale.~~ Fixed: `HomeTabScreen.handleClaim` maps the message with `mapChallengeClaimError` (`src/utils/challengeErrors.ts`, same pattern as `authErrors.ts`) and re-fetches `/challenges` on error, so an expired row from a card left open across midnight goes away.
- **Lessons with `INTRODUCE_SIGN` / `INVISIBLE_SIGNS` couldn't be completed** (lesson 1 onwards of the Curso Básico): the player never reports those blocks and `signa-api` required them. Fixed in [signa-api#95](https://github.com/signasource/signa-api/pull/95) (server no longer requires them; stuck lessons complete on the next answer) and [signa-mobile#72](https://github.com/signasource/signa-mobile/pull/72) (player drops `INVISIBLE_SIGNS`, which rendered a blank step). Both merged to `develop` (2026-10-18); not yet released to `master`. #72 still needs a manual device test (lesson 1 must finish after the `SPELL_NAME` block, with no blank step).
- **signa-api: `GET /courses` without `signLanguageId` returns 500 instead of 400.** `GlobalExceptionHandler` doesn't handle `MissingServletRequestParameterException`, so it falls into the generic "Internal server error". The app always sends the param; it only shows up calling the API by hand.
- **signa-api: Hibernate DDL warning on every startup.** `ddl-auto: update` runs `alter table lesson_blocks alter column type set data type varchar(30) not null`, which Postgres rejects (syntax error near `not`; comes from `LessonBlock.type`'s `columnDefinition`). Startup continues and the column is fine; it's log noise that can hide real errors.
- **signa-api: local `bootRun` needs undocumented setup.** (1) `SPRING_DOCKER_COMPOSE_ENABLED=false`, or `spring-boot-docker-compose` tries to bring up the whole `docker-compose.yml` (API, nginx, alloy); (2) `JAVA_TOOL_OPTIONS=-Duser.timezone=America/Argentina/Buenos_Aires`, because Windows' JVM default `America/Buenos_Aires` is rejected by Postgres 17; (3) a base64 `FIREBASE_CREDENTIALS_JSON` even with `firebase.enabled=false` (`FirebaseService` requires the bean) — a fake service account generated locally works and sends nothing.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- ~~Merge signa-api#95 → signa-api#96 → signa-mobile#72.~~ Merged to `develop` (2026-10-18). Pending: device test of lesson 1, then release `develop` → `master` in both repos.
- Password reset with a 6-digit code instead of a link (backend + app, two PRs); App Links only if a link is still wanted later.
- Play Console setup for gem packs (app + 4 in-app products + service account) and an end-to-end test with a license tester.
- ~~Wire the Inicio roadmap lesson CTA to navigate into `LessonScreen`.~~ Done (`HomeTabScreen.navigateToLesson`).
- ~~Leaderboard endpoint + the Social *Ranking* tile.~~ Done.
- ~~Fix `CourseProgress` / `Achievement` client types.~~ Done.
- Confirm real `courses` endpoints for the flat browse stub, or retire it in favor of the Inicio roadmap.
- ~~Decide the camera + ML runtime stack and migrate to a dev build.~~ Done: `expo-camera` + MediaPipe (WASM in a WebView worker) + TFLite, all on-device ([features/ml.md](./features/ml.md)); `expo-dev-client` with an EAS `development` profile.
- Persist onboarding answers once there is a place to store them.
- (Optional) Add Prettier and run `npm run lint` in CI.
