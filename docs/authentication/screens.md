# Auth screens

> Responsibility: per-screen auth flows.
> Update when: an auth screen's flow changes or a screen is added/removed.
> Sources: src/screens/auth/, src/screens/ChangePasswordScreen.tsx, src/utils/pendingReset.ts, src/navigation/AuthNavigator.tsx, src/screens/VerifyEmailScreen.tsx

All auth screens mount inside `AuthScreen` and use `@/components/auth` primitives (see [../design-system/components.md](../design-system/components.md)). Routes/params → [../navigation.md](../navigation.md).

| Screen | Flow |
|---|---|
| `LoginScreen` | validate fields → `login({ identifier, password })` → stack swaps on auth |
| `LoginScreen` / `RegisterScreen` — Google | "Iniciar sesión con Google" / "Registrarse con Google" (`GoogleButton`) → `loginWithGoogle()`; both do the same thing since the backend creates the account when the email is new. Cancelling the picker is silent; errors go through `mapAuthError` |
| `ConfigurationScreen` — Cuenta de Google | row "Cuenta de Google": "Vincular" opens the Google picker and calls `usersApi.linkGoogle` (toast on success/error, "Vinculada" afterwards); state comes from `UserProfile.providers`. "Cambiar contraseña" is hidden for Google-only accounts (no `LOCAL` provider) |
| `RegisterScreen` | validate name/lastName/username/email/password (live username availability + password checklist) → `register(...)` → **auto-login**, stack swaps to app and offers `VerifyEmail` once (optional: nothing in the app requires a verified email) |
| `ForgotPasswordScreen` | validate email → `authApi.forgotPassword` → navigate to `ForgotPasswordSent` |
| `ForgotPasswordSentScreen` | informational (no form): "Ingresar código" → `ResetPassword` with the email; "Probar con otro correo" → back to `ForgotPassword` |
| `ResetPasswordScreen` | email (prefilled from params, editable) + 6-digit code (`number-pad`, `maxLength={6}`, non-digits stripped, `oneTimeCode` autofill) + new password/confirm (`isPasswordValid`) → `authApi.resetPassword({ email, code, newPassword })` → auto-login via `useAuth().login`; if that login fails, navigate to `Login`. "Reenviar código" calls `authApi.forgotPassword` again and clears the code field (a new code replaces the old one on the backend) |
| *Resume after leaving the app* | Sending a code (`ForgotPassword` or "Reenviar código") saves `{ email, expiresAt: +15 min }` via `@/utils/pendingReset` (AsyncStorage); a successful reset clears it. `AuthNavigator` reads it on mount: if a non-expired entry exists and the initial route is `Welcome`, the stack opens directly on `ResetPassword` with that email, so the user can check their mail, the OS can kill Signa, and coming back lands on the code screen. Expired/corrupt entries are discarded |
| `VerifyEmailScreen` (post-login, optional) | email comes from `useAuth().user`; 6-digit code (`number-pad`, non-digits stripped, `oneTimeCode`) → `authApi.verifyEmail({ email, code })` → "¡Cuenta verificada!" → back. "Reenviar código" → `authApi.resendVerificationEmail`. "Más tarde" just goes back. Opens automatically once after registration (`verificationPrompt`) and from **Configuración → Verificar cuenta**, which only shows while `GET /users/me` reports `verified === false` |
| `ChangePasswordScreen` (post-login) | `changePassword` from context; rotates tokens |

Error/loading conventions:
- Field errors → `AuthField` `error`/`invalid` props.
- General errors → `StatusText` (tone `danger`).
- Loading → `loading` prop on `PrimaryButton`/`SecondaryButton`, or `ActivityIndicator`.
- Async action shape → standard pattern in [`CLAUDE.md`](../../CLAUDE.md).
