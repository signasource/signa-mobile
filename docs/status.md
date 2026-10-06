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
| Social (feed + likes, amigos, solicitudes, búsqueda, ranking semanal) | real | [features/social.md](./features/social.md) |
| Notifications inbox | real | [features/social.md](./features/social.md#notificationsscreen) |
| Public profile (read-only, of another user) | real | [features/social.md](./features/social.md#publicprofilescreen) |
| Courses flat browse (`CoursesListScreen`) | stub | [features/courses.md](./features/courses.md#course-catalog--stub) |
| Práctica libre (`PracticeTabScreen` + `PracticeSessionScreen`) | real, wired to `signa-api` | [features/practice.md](./features/practice.md) |
| ML (sign recognition) | real, **on-device and real time** (nothing leaves the phone) | [features/ml.md](./features/ml.md) |

## Plataformas

`modules/signa-vision` is a **local Expo module with an Android implementation only**
(`expo-module.config.json` declares `"platforms": ["android"]`; there is no `ios/` directory).
It provides both the camera recogniser and the Filament avatar.

Because of that, the app degrades on any build without it — iOS, and Expo Go on every platform,
since a local native module is never part of Expo Go:

| | Android (dev build) | iOS / Expo Go |
|---|---|---|
| Sign recognition (`PERFORM_SIGN`, `SPELL_NAME`) | native, real time | exercise skipped (`BloqueSinCamara`) |
| Sign avatar | native (Filament) | WebView with Google's `<model-viewer>` |
| Startup bench (`BancoNativoPantalla`) | shown before the app | skipped |

The switch is the `hayNativo` flag exported by `modules/signa-vision`, which is
`requireOptionalNativeModule(...) !== null`. Its six consumers are `App.tsx`, `LessonScreen`,
`AvatarGlbNativo`, `MultiAvatarNativo`, `ReconocedorSenasNativo` and `BancoNativoPantalla`.

Running on iPhone is therefore useful for everything **except** recognition: auth, Inicio,
lessons without camera, Tienda, Social, Perfil and Práctica all work.

## Cross-cutting tech debt

- **Profile partly from JWT + local cache.** `GET /users/me` *does* exist and `usersApi.getMe()` calls it; what is still cached in AsyncStorage is the name captured at registration, used as a fallback before the profile loads.
- **Password-reset token pasted by hand.** No deep linking; the user copies the token from the email. Email verification still exists on the backend (`verified` flag) but registration auto-logs in and the app surfaces no verify/resend UI.
- **No ESLint/Prettier config.** `npm run lint` runs eslint without configured rules; the real check today is `npm run typecheck` (tsc strict).
- **Legacy theme tokens** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) still used by `AppNavigator` and old screens; migrate to current tokens.
- **Gifting has no UI.** `POST /store/gifts` exists and friends are now listable (`socialApi.getFriends()`), but the Store screen still only buys for yourself.
- **`CourseProgress` and `Achievement` client types do not match the backend.** `src/api/learning.ts` declares `CourseProgress { courseId, icon, color, progressPercent, lessonsCompleted, currentUnit, unitProgressPercent, lastPractice }` and `src/api/achievements.ts` declares `Achievement { id: number, name, icon, color, unlocked }`, but `CourseProgressResponse` and `AchievementResponse` send entirely different fields. `ProfileScreen`'s **Cursos** and **Logros** sections therefore render `undefined`. Pre-existing. `PublicProfileScreen` sidesteps it by typing against the real shapes (`PublicCourseProgress` / `PublicAchievement` in `src/api/social.ts`).
- **`inventoryApi` and `shopApi` declare separate client types for the same endpoint.** Both call `GET /inventories/me`; `shopApi.ts`'s `ShopInventory` matches the backend `UserInventoryResponse` field-for-field, while `inventoryApi.ts`'s `UserInventory` used to declare its own (wrong) `lives`/`xpMultiplier` fields — fixed to mirror `ShopInventory` plus `learnedSignsCount`, but the duplication itself remains: a backend field rename only needs fixing in one of the two files to silently break the other.
- **`signa-vision` has no iOS implementation.** The recogniser and the Filament avatar are Kotlin
  only, so iOS loses the camera exercises and falls back to the WebView avatar. Writing the Swift
  side is what would unblock feature parity; until then an iPhone cannot be used to test
  recognition.
- **Enrolment is unreachable from the client.** `learningApi.enroll` posts to
  `/learning/tracking/courses/{courseVersionId}/enroll`, but **no endpoint exposes that UUID**:
  `CourseRoadmapResponse` and `CourseDetailResponse` both return `activeVersion` as the version
  *string* (`"1.0"`), not the id. Nothing calls `enroll` either. So a brand-new account browses
  Inicio fine and then gets `not enrolled in this course` on opening any lesson, on every platform.
  Unblocking it needs a backend change — expose the version id, let `enroll` take a `courseId`, or
  auto-enrol on first roadmap fetch.
- **CI:** GitHub Actions (`.github/workflows/release.yml`, semantic-release on push to `master`). No GitLab pipeline.

## Next steps

- Deep linking for password reset.
- Wire the Inicio roadmap lesson CTA to navigate into the now-real `LessonScreen`.
- Fix `CourseProgress` / `Achievement` client types and re-point `ProfileScreen` at them.
- Confirm real `courses` endpoints for the flat browse stub, or retire it in favor of the Inicio roadmap.
- Decide the camera + ML runtime stack and migrate to a dev build.
- Persist onboarding answers once there is a place to store them.
- (Optional) Configure ESLint/Prettier.
