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
| Achievements (catalog, unlocked by the backend, celebration screen per group, streak medals) | real; animations are real for streak, lessons and courses and **mocked** for the rest until their Lottie files are added; needs `signa-api` with the achievement catalog and a dev-build rebuild for Lottie | [features/achievements.md](./features/achievements.md) |
| ML (sign recognition) | real, **on-device and real time** (nothing leaves the phone) | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Profile partly from JWT + local cache.** `GET /users/me` *does* exist and `usersApi.getMe()` calls it; what is still cached in AsyncStorage is the name captured at registration, used as a fallback before the profile loads.
- **Password-reset token pasted by hand.** No deep linking; the user copies the token from the email. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **Sent gifts have no UI.** Sending and receiving/claiming gifts work from the Store, but `GET /store/gifts/sent` has no client, so a sender cannot see the status (pending / claimed / expired) of what they sent.
- **Gem packs are Android-only.** `useGemPurchase` only requests Google products; iOS would need App Store products, a StoreKit branch (`request.apple`) and App Store receipt verification on the backend. The section is simply not mounted off Android.
- **No `obfuscatedAccountId` on Play purchases.** The JWT carries only the email and there is no user id on the client, so purchases are not tagged with an account hash; the backend ties every token to the redeeming user anyway.
- ~~No leaderboard.~~ Implemented in `feature/ranking`: `GET /ranking/global` + `GET /ranking/friends`, weekly reset scheduler, and the Social Ranking tab.
- ~~`CourseProgress` / `Achievement` client types out of sync with the backend.~~ Fixed: `learningApi.getProgress()` returns `PublicCourseProgress[]` and `achievementsApi` returns `Achievement` = `PublicAchievement` (alias); `ProfileScreen` renders the real fields (`title`, `earned`, `earnedAt`, `criteriaValue`; trophy/lock icons since the backend sends no icon or colour).
- ~~`inventoryApi` / `shopApi` duplicated types.~~ Fixed: `ShopInventory` (`api/shop.ts`) is the single type and `shopApi.getMyInventory` the single call; `inventoryApi` / `UserInventory` are thin aliases of them.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- Deep linking for password reset.
- Play Console setup for gem packs (app + 4 in-app products + service account) and an end-to-end test with a license tester.
- ~~Wire the Inicio roadmap lesson CTA to navigate into `LessonScreen`.~~ Done (`HomeTabScreen.navigateToLesson`).
- ~~Leaderboard endpoint + the Social *Ranking* tile.~~ Done.
- ~~Fix `CourseProgress` / `Achievement` client types.~~ Done.
- Confirm real `courses` endpoints for the flat browse stub, or retire it in favor of the Inicio roadmap.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
