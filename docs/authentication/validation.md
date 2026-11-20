# Validation

> Responsibility: input validation rules and live username availability.
> Update when: a validation rule changes or backend validation diverges.
> Sources: src/utils/validation.ts, src/hooks/useUsernameAvailability.ts, src/utils/authErrors.ts

Centralized rules that mirror the backend.

- `USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/` → `isValidUsername(value)`. Same criterion as `UserController.checkUsernameAvailability`.
- `EMAIL_REGEX` → `isValidEmail(value)`.
- `NAME_REGEX = /^[\p{L} .'-]+$/u` → `isValidName(value)` (also enforces 2–100 length). Mirrors `RegisterRequest.name/lastName` (`@Pattern`/`@Size`): letters/space/`.`/`'`/`-` only, **no digits**. Register validates both fields client-side before submit.
- `checkPassword(password) → PasswordRules` with a single flag `length` (8–72; only real rule is min 8, the 72 cap mirrors bcrypt). `isPasswordValid(password)` = `length` is `true`. Rendered live with `PasswordChecklist` in Register; Reset only checks it on submit. Mirrors `ValidPasswordValidator.java` (min 8, no complexity rules).

## Backend error messages

`mapAuthError(err, fallback)` (`src/utils/authErrors.ts`) turns the raw backend message into Spanish. Besides the exact-match `AUTH_ERROR_MAP` (domain errors like `Invalid credentials`, `Email already in use`), it parses **field validation errors** that `GlobalExceptionHandler` returns as `"<field>: <jakarta message>"` (e.g. `name: must match "^[\p{L} .'-]+$"`) and, via `translateFieldError`, shows the concrete reason per field (`email`, `name`, `lastName`, `username`, `password`, `identifier`) + rule (pattern/size/blank) instead of the generic fallback. Only the first field error is returned by the backend.

## Live username availability

`useUsernameAvailability(username)` (`src/hooks/useUsernameAvailability.ts`): validates local format, **debounces** (~450ms), caches per username, cancels stale requests with `AbortController`, calls `usersApi.checkUsernameAvailability`. Returns `{ status, message }` with `status: idle | invalid | checking | available | taken | error`.
