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
- ~~**Password reset is barely usable.**~~ Fixed in [signa-api#99](https://github.com/signasource/signa-api/pull/99) + the app branch `feat/password-reset-code` (merged to `develop` 2026-10-22): the email now carries a 6-digit code (BCrypt-hashed, 15 min TTL, discarded after 5 failed attempts) and `ResetPasswordScreen` takes `{ email, code, newPassword }`, then auto-logs in. **The contract changed**: older app builds can no longer reset once the new API is deployed, so release the API and the app together. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **Password-reset hardening** ([signa-api#97](https://github.com/signasource/signa-api/pull/97), merged to `develop` 2026-10-22): `/auth/forgot-password`, `/auth/reset-password` and `/auth/resend-verification-email` are rate-limited to 10 requests / 15 min per IP (429 `Too many requests`, mapped to Spanish in `authErrors.ts`), and the reset email is sent `@Async` so the response no longer reveals whether an email is registered. A known account still costs a few ms more (deleting the old code and saving the new one); not worth hiding, since `POST /auth/register` already answers "Email already in use".
- ~~**signa-api: rate limits can be bypassed by spoofing `X-Forwarded-For`.**~~ Fixed in [signa-api#98](https://github.com/signasource/signa-api/pull/98), merged to `develop`: nginx resolves the client IP from `CF-Connecting-IP` trusting only Cloudflare's ranges and overwrites `X-Real-IP`; the app keys on `X-Real-IP`. When deploying it: **nginx first** (`docker compose restart nginx`), then the API — the reverse order makes users behind the same Cloudflare edge share a bucket (false 429s).
- ~~12 `react-hooks/exhaustive-deps` lint warnings.~~ Fixed: `npm run lint` is at 0 problems. Loaders became `useCallback` or moved inside their effect; values an effect must read without re-running (`cameraControls` in `GlbAnimationView`, the time drafts in `ConfigurationScreen`) go through a ref. Keep it at 0 — never silence the rule with a bare `eslint-disable`.
- **`npm audit`: 30 vulnerabilities left** (7 moderate, 23 high, 0 critical; was 55, reviewed 2026-10-23). `axios` was bumped to `^1.20.0` and `npm audit fix` (no `--force`) updated the in-range transitive ones (`shell-quote`, `follow-redirects`, `undici`, `tar`, `js-yaml`, `nanoid`, …). What remains only clears with a major bump outside SDK 54 and is not reachable at runtime:
  - Build/dev tooling (`metro`, `@expo/cli`, `micromatch`/`braces`, `postcss`, `node-forge`, `image-size`, the `jest` chain under `react-native`): runs on the dev machine / EAS while bundling, never ships in the APK. Clears with the next Expo SDK upgrade.
  - `query-string` → `decode-uri-component` (DoS on malformed percent-encoding) via `@react-navigation/core` 6: it ships, but only parses incoming URLs when `NavigationContainer` has a `linking` config, which the app doesn't. **Before adding deep linking, upgrade to React Navigation 7.**
  - Never run `npm audit fix --force`: it proposes `expo@44` / `react-native@0.88`.
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
- ~~Password reset with a 6-digit code instead of a link (backend + app, two PRs).~~ Merged to `develop` in the app; pending: deploy the API and publish the app together. App Links only if a link is still wanted later.
- Play Console setup for gem packs (app + 4 in-app products + service account) and an end-to-end test with a license tester.
- ~~Wire the Inicio roadmap lesson CTA to navigate into `LessonScreen`.~~ Done (`HomeTabScreen.navigateToLesson`).
- ~~Leaderboard endpoint + the Social *Ranking* tile.~~ Done.
- ~~Fix `CourseProgress` / `Achievement` client types.~~ Done.
- Confirm real `courses` endpoints for the flat browse stub, or retire it in favor of the Inicio roadmap.
- ~~Decide the camera + ML runtime stack and migrate to a dev build.~~ Done: `expo-camera` + MediaPipe (WASM in a WebView worker) + TFLite, all on-device ([features/ml.md](./features/ml.md)); `expo-dev-client` with an EAS `development` profile.
- Persist onboarding answers once there is a place to store them.
- (Optional) Add Prettier and run `npm run lint` in CI.
