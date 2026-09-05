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
| Inicio (Home) roadmap screen | real (topics/lessons + per-lesson state from `signa-api`) | [features/courses.md](./features/courses.md#inicio-home-roadmap-screen) |
| Lesson player (`LessonScreen`) | real, wired to `signa-api` | [features/courses.md](./features/courses.md#lesson-player--real) |
| Social (feed + likes, amigos, solicitudes, búsqueda) | real | [features/social.md](./features/social.md) |
| Notifications inbox | real | [features/social.md](./features/social.md#notificationsscreen) |
| Public profile (read-only, of another user) | real | [features/social.md](./features/social.md#publicprofilescreen) |
| Courses flat browse (`CoursesListScreen`) | stub | [features/courses.md](./features/courses.md#course-catalog--stub) |
| Práctica libre (`PracticeTabScreen`) | stub | [features/practice.md](./features/practice.md) |
| ML (sign recognition) | placeholder | [features/ml.md](./features/ml.md) |

## Cross-cutting tech debt

- **Profile partly from JWT + local cache.** `GET /users/me` *does* exist and `usersApi.getMe()` calls it; what is still cached in AsyncStorage is the name captured at registration, used as a fallback before the profile loads.
- **Password-reset token pasted by hand.** No deep linking; the user copies the token from the email. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **`GET /users/me/stats` and `POST /users/me/activity` do not exist.** `src/api/users.ts` calls both (`usersApi.getStats()`, `usersApi.recordActivity()`) but `UserController.java` has no such mappings — they 404. Consumed by Inicio and Perfil. Pre-existing, unrelated to Social.
- **Gifting has no UI.** `POST /store/gifts` exists and friends are now listable (`socialApi.getFriends()`), but the Store screen still only buys for yourself.
- **No leaderboard.** `signa-api` has nothing resembling a ranking or league, so the Social header shows *Solicitudes* where the mockup had *Ranking*. Deferred to a later iteration; `UserStats.weeklyXp` already exists to build it on.
- **`CourseProgress` and `Achievement` client types do not match the backend.** `src/api/learning.ts` declares `CourseProgress { courseId, icon, color, progressPercent, lessonsCompleted, currentUnit, unitProgressPercent, lastPractice }` and `src/api/achievements.ts` declares `Achievement { id: number, name, icon, color, unlocked }`, but `CourseProgressResponse` and `AchievementResponse` send entirely different fields. `ProfileScreen`'s **Cursos** and **Logros** sections therefore render `undefined`. Pre-existing. `PublicProfileScreen` sidesteps it by typing against the real shapes (`PublicCourseProgress` / `PublicAchievement` in `src/api/social.ts`).
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

- **No practice-session or mistakes-review backend for `PracticeTabScreen`.** `signa-api` has no
  endpoint for a standalone single-exercise-type session, a per-user learned-signs list, or a
  missed-answers queue, so the whole "Práctica libre" tab runs on hardcoded content in
  `src/features/practice/types.ts` with no-op CTAs. See [features/practice.md](./features/practice.md).

## Next steps

- Deep linking for password reset.
- Wire the Inicio roadmap lesson CTA to navigate into the now-real `LessonScreen`.
- Add `GET /users/me/stats` and `POST /users/me/activity` to `signa-api`, or drop the calls.
- Leaderboard endpoint + the Social *Ranking* tile.
- Fix `CourseProgress` / `Achievement` client types and re-point `ProfileScreen` at them.
- Confirm real `courses` endpoints for the flat browse stub, or retire it in favor of the Inicio roadmap.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
