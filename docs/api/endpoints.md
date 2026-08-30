# Endpoints

> Responsibility: catalog of API endpoints exposed through `src/api/`.
> Update when: an endpoint is added, changed, or removed, or a stub becomes real.
> Sources: src/api/auth.ts, src/api/users.ts, src/api/health.ts, src/features/courses/api.ts

Types → [types.md](./types.md). Client behavior → [http-client.md](./http-client.md).

## `authApi` (`src/api/auth.ts`) — mirrors `AuthController.java`

| Method | Path | Returns | Notes |
|---|---|---|---|
| `register(RegisterRequest)` | `POST /auth/register` | `AuthResponse` | 201 with `{ accessToken, refreshToken }`. **Auto-logs in.** Backend sends a verification email (`verified` flag) but it is **not required** to use the app; the mobile app exposes no verify/resend UI. |
| `login(LoginRequest)` | `POST /auth/login` | `AuthResponse` | `{ accessToken, refreshToken }` |
| `refresh(refreshToken)` | `POST /auth/refresh` | `AuthResponse` | also used by the interceptor |
| `forgotPassword(ForgotPasswordRequest)` | `POST /auth/forgot-password` | `void` | |
| `resetPassword(ResetPasswordRequest, token)` | `POST /auth/reset-password?token=` | `void` | `token` is a **query param**, separate from the body |

## `usersApi` (`src/api/users.ts`) — mirrors `UserController.java`

| Method | Path | Returns | Notes |
|---|---|---|---|
| `changePassword(ChangePasswordRequest)` | `PUT /users/password` | `AuthResponse` | returns **new tokens** |
| `checkUsernameAvailability(username, signal?)` | `GET /users/username-availability?username=` | `{ available: boolean }` | **public**; accepts `AbortSignal` |
| `getMe()` | `GET /users/me` | `UserProfile` | `{ name, username }` |
| `getWeeklyXp()` | `GET /users/me/weekly-xp` | `WeeklyXpEntry[]` | `[{ date, xpEarned }]` Mon–today; zeros for inactive days |
| `getDailyGoal()` | `GET /users/daily-goal` | `{ dailyGoalMinutes }` | |
| `updateDailyGoal(minutes)` | `PATCH /users/daily-goal` | `void` | body: `{ daily_goal_minutes }` (snake_case via interceptor) |
| `getSettings()` | `GET /users/settings` | `UserSettings` | returns full settings; front-end uses `profileHeaderColor` |
| `updateSettings(payload)` | `PATCH /users/settings` | `UserSettings` | partial patch; all fields optional |

## `inventoryApi` (`src/api/inventory.ts`)

| Method | Path | Returns | Notes |
|---|---|---|---|
| `getMyInventory()` | `GET /inventories/me` | `UserInventory` | gems, streakShields, lives, xpMultiplier, totalSignsLearned |

## `achievementsApi` (`src/api/achievements.ts`)

| Method | Path | Returns | Notes |
|---|---|---|---|
| `getAchievements(unlocked)` | `GET /achievements?unlocked=` | `Achievement[]` | pass `true` or `false` |

## `learningApi` (`src/api/learning.ts`)

| Method | Path | Returns | Notes |
|---|---|---|---|
| `getProgress()` | `GET /learning/tracking/progress` | `CourseProgress[]` | per-course progress, unit info, signs learned |

## `signsApi` (`src/api/signs.ts`) — mirrors `SignController.java`

| Method | Path | Returns | Notes |
|---|---|---|---|
| `getAnimation(meaning)` | `GET /signs/{meaning}/animation` | `SignAnimation` | Presigned R2 URL for the sign's `.glb`, addressed by the sign's unique `meaning`. 404 if the sign doesn't exist or has no animation. Used by the 3D animation PoC (`AnimationTestScreen`). |

## `health` (`src/api/health.ts`)

`pingBackend()` for the connection test: GET to the API root with a short timeout.

## `courses` — STUB (`src/features/courses/api.ts`)

`GET /courses`, `GET /courses/{id}`, `GET /courses/{courseId}/lessons/{lessonId}`. **Tentative paths — backend has no content endpoints yet.** See [features/courses.md](../features/courses.md).
