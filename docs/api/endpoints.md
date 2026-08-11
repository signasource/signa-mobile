# Endpoints

> Responsibility: catalog of API endpoints exposed through `src/api/`.
> Update when: an endpoint is added, changed, or removed, or a stub becomes real.
> Sources: src/api/auth.ts, src/api/users.ts, src/api/health.ts, src/features/courses/api.ts

Types → [types.md](./types.md). Client behavior → [http-client.md](./http-client.md).

## `authApi` (`src/api/auth.ts`) — mirrors `AuthController.java`

| Method | Path | Returns | Notes |
|---|---|---|---|
| `register(RegisterRequest)` | `POST /auth/register` | `void` | 201 no body. Does **not** auto-login. |
| `login(LoginRequest)` | `POST /auth/login` | `AuthResponse` | `{ accessToken, refreshToken }` |
| `refresh(refreshToken)` | `POST /auth/refresh` | `AuthResponse` | also used by the interceptor |
| `verifyEmail(token)` | `GET /auth/verify?token=` | `void` | `token` as query param |
| `forgotPassword(ForgotPasswordRequest)` | `POST /auth/forgot-password` | `void` | |
| `resetPassword(ResetPasswordRequest, token)` | `POST /auth/reset-password?token=` | `void` | `token` is a **query param**, separate from the body |
| `resendVerificationEmail(ResendVerificationEmailRequest)` | `POST /auth/resend-verification-email` | `void` | |

## `usersApi` (`src/api/users.ts`) — mirrors `UserController.java`

| Method | Path | Returns | Notes |
|---|---|---|---|
| `changePassword(ChangePasswordRequest)` | `PUT /users/password` | `AuthResponse` | returns **new tokens** |
| `getMe()` | `GET /users/me` | `UserProfileResponse` | authenticated profile: `id, email, username, name, role, enabled` |
| `updateUsername(UpdateUsernameRequest)` | `PATCH /users/me` | `void` | 204. Changes **only** the username (3-50, `^[a-zA-Z0-9_]+$`); 409 if taken. **No endpoint updates `name`.** |
| `checkUsernameAvailability(username, signal?)` | `GET /users/username-availability?username=` | `{ available: boolean }` | **public**; accepts `AbortSignal` |

The backend `UserController` also exposes `GET/PATCH /users/settings`, `GET /users/{username}` (public profile), and `DELETE /users/me` — not wired in the app yet.

## `health` (`src/api/health.ts`)

`pingBackend()` for the connection test: GET to the API root with a short timeout.

## `courses` — STUB (`src/features/courses/api.ts`)

`GET /courses`, `GET /courses/{id}`, `GET /courses/{courseId}/lessons/{lessonId}`. **Tentative paths — backend has no content endpoints yet.** See [features/courses.md](../features/courses.md).
