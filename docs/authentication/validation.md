# Validation

> Responsibility: input validation rules and live username availability.
> Update when: a validation rule changes or backend validation diverges.
> Sources: src/utils/validation.ts, src/hooks/useUsernameAvailability.ts

Centralized rules that mirror the backend.

- `USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/` → `isValidUsername(value)`. Same criterion as `UserController.checkUsernameAvailability`.
- `EMAIL_REGEX` → `isValidEmail(value)`.
- `checkPassword(password) → PasswordRules` with flags `length` (8–72), `uppercase`, `lowercase`, `digit`, `special`. `isPasswordValid(password)` = all `true`. Rendered live with `PasswordChecklist` (Register/Reset).

## Live username availability

`useUsernameAvailability(username)` (`src/hooks/useUsernameAvailability.ts`): validates local format, **debounces** (~450ms), caches per username, cancels stale requests with `AbortController`, calls `usersApi.checkUsernameAvailability`. Returns `{ status, message }` with `status: idle | invalid | checking | available | taken | error`.
