<!--
última actualización: 2026-07-29
mantener al: cambiar el flujo de sesión, la API de useAuth, la validación o el manejo de errores de auth.
-->

# Autenticación

## AuthContext (`src/context/AuthContext.tsx`)

Único estado global de la app. Se consume con el hook `useAuth()` (lanza error si se usa fuera de
`<AuthProvider>`, montado en `App.tsx`).

**Valor expuesto (`AuthContextValue`):**

| Campo | Tipo | Descripción |
|---|---|---|
| `user` | `User \| null` | `{ email, name? }`; `name` es cache local best-effort |
| `isLoading` | `boolean` | `true` mientras se hidrata la sesión al arrancar |
| `isAuthenticated` | `boolean` | `!!user` — lo consume `RootNavigator` |
| `error` | `string \| null` | último error de una operación de auth |
| `login(LoginRequest)` | `Promise<void>` | loguea, guarda tokens, arma `user` |
| `register(RegisterRequest)` | `Promise<void>` | registra y cachea el nombre; **no** loguea |
| `changePassword(ChangePasswordRequest)` | `Promise<void>` | cambia pass y **rota tokens** |
| `logout()` | `Promise<void>` | limpia tokens y `user` |

**Puntos clave de comportamiento:**
- `buildUserFromToken` arma el `user` decodificando el email del JWT + buscando el nombre en
  `profileCache`. El JWT no trae nombre (ver [`api-y-datos.md`](./api-y-datos.md)).
- `restoreSession` corre una vez al montar: si no hay tokens, termina; si el access token está
  vencido, intenta `refresh`; si algo falla, limpia tokens (sesión anónima). Setea
  `isLoading=false` al final.
- Las operaciones setean `error` con `err?.response?.data?.message ?? "<fallback>"` **y
  re-lanzan** el error, para que la pantalla también pueda reaccionar en su `catch`.
- **No se navega manualmente** entre auth y app: mutar `user` hace que `RootNavigator` cambie de
  stack (ver [`navegacion.md`](./navegacion.md)).

## Pantallas de auth (`src/screens/auth/`)

Todas se montan dentro de `AuthScreen` y usan las primitivas de `@/components/auth`
(ver [`design-system.md`](./design-system.md)).

| Pantalla | Flujo |
|---|---|
| `LoginScreen` | valida campos → `login({ identifier, password })` → el stack cambia solo al autenticar |
| `RegisterScreen` | valida nombre/username/email/password (con disponibilidad de username y checklist de password) → `register(...)` → navega a `VerifyEmail` |
| `VerifyEmailScreen` | ingresa token del mail → `authApi.verifyEmail(token)`; permite reenviar |
| `ForgotPasswordScreen` | valida email → `authApi.forgotPassword` → navega a `ForgotPasswordSent` |
| `ForgotPasswordSentScreen` | pantalla informativa (sin form), con reenvío |
| `ResetPasswordScreen` | token (del mail, o por param) + nueva password → `authApi.resetPassword(payload, token)` → Login |
| `ChangePasswordScreen` (post-login) | `changePassword` del contexto; rota tokens |

## Validación (`src/utils/validation.ts`)

Reglas centralizadas (antes estaban dispersas y divergían). Espejan las del backend.

- `USERNAME_REGEX = /^[a-zA-Z0-9_]{3,50}$/` → `isValidUsername(value)`. Mismo criterio que
  `UserController.checkUsernameAvailability`.
- `EMAIL_REGEX` → `isValidEmail(value)`.
- `checkPassword(password) → PasswordRules` con flags `length` (8–72), `uppercase`, `lowercase`,
  `digit`, `special`. `isPasswordValid(password)` = todas en `true`.
  - Se renderiza con `PasswordChecklist` (feedback en vivo en Register/Reset).

**Disponibilidad de username en vivo:** hook `useUsernameAvailability(username)`
(`src/hooks/useUsernameAvailability.ts`): valida formato local, **debounce** (~450 ms), cachea
por username, cancela requests viejos con `AbortController` y pega a
`usersApi.checkUsernameAvailability`. Devuelve `{ status, message }` con
`status: idle | invalid | checking | available | taken | error`.

## Manejo de errores y loading (convención)

Patrón estándar en pantallas (ver también `../CLAUDE.md §2`):

```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handle() {
  setError(null);
  setLoading(true);
  try {
    await someApi();
  } catch (err: any) {
    setError(err?.response?.data?.message ?? "Mensaje por defecto.");
  } finally {
    setLoading(false);
  }
}
```

- Errores de campo → prop `error`/`invalid` de `AuthField`.
- Errores generales → `StatusText` (tono `danger`).
- Loading → prop `loading` de los botones (`PrimaryButton`/`SecondaryButton`) o `ActivityIndicator`.
