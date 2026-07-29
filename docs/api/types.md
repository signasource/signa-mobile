# API types

> Responsibility: DTOs mirrored 1:1 from `signa-api` records.
> Update when: a backend DTO changes or a request/response type is added.
> Sources: src/types/index.ts

- `AuthResponse { accessToken, refreshToken }` — **carries no user data**.
- `LoginRequest { identifier, password }` — `identifier` is email or username.
- `RegisterRequest { email, username, password, name }`.
- `ForgotPasswordRequest { email }`.
- `ResetPasswordRequest { newPassword }` — token passed separately (see [endpoints.md](./endpoints.md)).
- `ChangePasswordRequest { currentPassword, newPassword }`.
- `ResendVerificationEmailRequest { email }`.
- `ApiErrorResponse { message, status, timestamp }` — backend error shape; UI error messages come from `err?.response?.data?.message`.
- `User { email, name? }` — `name` is best-effort local cache (see [session-persistence.md](./session-persistence.md)).
