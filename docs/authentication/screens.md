# Auth screens

> Responsibility: per-screen auth flows.
> Update when: an auth screen's flow changes or a screen is added/removed.
> Sources: src/screens/auth/, src/screens/ChangePasswordScreen.tsx

All auth screens mount inside `AuthScreen` and use `@/components/auth` primitives (see [../design-system/components.md](../design-system/components.md)). Routes/params → [../navigation.md](../navigation.md).

| Screen | Flow |
|---|---|
| `LoginScreen` | validate fields → `login({ identifier, password })` → stack swaps on auth |
| `RegisterScreen` | validate name/username/email/password (live username availability + password checklist) → `register(...)` → navigate to `VerifyEmail` |
| `VerifyEmailScreen` | enter token from email → `authApi.verifyEmail(token)`; can resend |
| `ForgotPasswordScreen` | validate email → `authApi.forgotPassword` → navigate to `ForgotPasswordSent` |
| `ForgotPasswordSentScreen` | informational (no form), with resend |
| `ResetPasswordScreen` | token (from email or param) + new password → `authApi.resetPassword(payload, token)` → `Login` |
| `ChangePasswordScreen` (post-login) | `changePassword` from context; rotates tokens |

Error/loading conventions:
- Field errors → `AuthField` `error`/`invalid` props.
- General errors → `StatusText` (tone `danger`).
- Loading → `loading` prop on `PrimaryButton`/`SecondaryButton`, or `ActivityIndicator`.
- Async action shape → standard pattern in [`CLAUDE.md`](../../CLAUDE.md).
