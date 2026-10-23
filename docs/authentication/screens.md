# Auth screens

> Responsibility: per-screen auth flows.
> Update when: an auth screen's flow changes or a screen is added/removed.
> Sources: src/screens/auth/, src/screens/ChangePasswordScreen.tsx

All auth screens mount inside `AuthScreen` and use `@/components/auth` primitives (see [../design-system/components.md](../design-system/components.md)). Routes/params → [../navigation.md](../navigation.md).

| Screen | Flow |
|---|---|
| `LoginScreen` | validate fields → `login({ identifier, password })` → stack swaps on auth |
| `RegisterScreen` | validate name/lastName/username/email/password (live username availability + password checklist) → `register(...)` → **auto-login**, stack swaps to app (no email verification) |
| `ForgotPasswordScreen` | validate email → `authApi.forgotPassword` → navigate to `ForgotPasswordSent` |
| `ForgotPasswordSentScreen` | informational (no form): "Ingresar código" → `ResetPassword` with the email; "Probar con otro correo" → back to `ForgotPassword` |
| `ResetPasswordScreen` | email (prefilled from params, editable) + 6-digit code (`number-pad`, `maxLength={6}`, non-digits stripped, `oneTimeCode` autofill) + new password/confirm (`isPasswordValid`) → `authApi.resetPassword({ email, code, newPassword })` → auto-login via `useAuth().login`; if that login fails, navigate to `Login`. "Reenviar código" calls `authApi.forgotPassword` again and clears the code field (a new code replaces the old one on the backend) |
| `ChangePasswordScreen` (post-login) | `changePassword` from context; rotates tokens |

Error/loading conventions:
- Field errors → `AuthField` `error`/`invalid` props.
- General errors → `StatusText` (tone `danger`).
- Loading → `loading` prop on `PrimaryButton`/`SecondaryButton`, or `ActivityIndicator`.
- Async action shape → standard pattern in [`CLAUDE.md`](../../CLAUDE.md).
