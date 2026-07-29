<!--
última actualización: 2026-07-29
mantener al: agregar/cambiar un endpoint, un tipo DTO, el cliente HTTP o la config de entorno.
-->

# API y datos

Toda la comunicación con `signa-api` (Spring Boot) pasa por la capa `src/api/`. **Nunca uses
`axios` directo desde una pantalla**: usá los módulos (`authApi`, `usersApi`, …), porque el
cliente central resuelve token, conversión de casing y refresh.

## Cliente HTTP (`src/api/client.ts`)

`apiClient` es una instancia de Axios con:

- **`baseURL`** = `process.env.EXPO_PUBLIC_API_URL` (fallback `http://localhost:8080`). La base es
  **directa, sin `/api`** (el back no define context-path). Exportada también como `API_URL`.
- **`timeout`** 10 s, `Content-Type: application/json`.
- **Interceptor de request:**
  - Adjunta `Authorization: Bearer <accessToken>` si hay token en `tokenStorage`.
  - Convierte el body a **snake_case** (`keysToSnakeCase`).
- **Interceptor de response:** convierte la data a **camelCase** (`keysToCamelCase`).
- **Refresh automático en 401:** ante un 401, intenta `POST /auth/refresh` con el refresh token,
  guarda los tokens nuevos y **reintenta** el request original (`_retry` evita loops). Usa una
  cola (`pendingQueue`) para que múltiples requests concurrentes esperen un único refresh. Si el
  refresh falla, limpia los tokens (`tokenStorage.clear()`) y rechaza.

**Implicancia práctica:** en el código de pantallas trabajás siempre en **camelCase**; la
conversión a/desde snake_case es transparente. Ver `src/utils/caseConverter.ts`.

## Módulos de endpoints

### `authApi` (`src/api/auth.ts`) — contra `AuthController.java`

| Método | Path | Retorno | Notas |
|---|---|---|---|
| `register(RegisterRequest)` | `POST /auth/register` | `void` | 201 sin body. **No** loguea automáticamente. |
| `login(LoginRequest)` | `POST /auth/login` | `AuthResponse` | `{ accessToken, refreshToken }` |
| `refresh(refreshToken)` | `POST /auth/refresh` | `AuthResponse` | también lo usa el interceptor |
| `verifyEmail(token)` | `GET /auth/verify?token=` | `void` | `token` como query param |
| `forgotPassword(ForgotPasswordRequest)` | `POST /auth/forgot-password` | `void` | |
| `resetPassword(ResetPasswordRequest, token)` | `POST /auth/reset-password?token=` | `void` | `token` va como **query param**, separado del body |
| `resendVerificationEmail(ResendVerificationEmailRequest)` | `POST /auth/resend-verification-email` | `void` | |

### `usersApi` (`src/api/users.ts`) — contra `UserController.java`

| Método | Path | Retorno | Notas |
|---|---|---|---|
| `changePassword(ChangePasswordRequest)` | `PUT /users/password` | `AuthResponse` | devuelve **tokens nuevos** |
| `checkUsernameAvailability(username, signal?)` | `GET /users/username-availability?username=` | `{ available: boolean }` | endpoint **público**; acepta `AbortSignal` |

### `health` (`src/api/health.ts`)
Helper `pingBackend()` para el "Test de conexión": GET a la raíz de la API con timeout corto.

### Stub — `courses` (`src/features/courses/api.ts`)
`GET /courses`, `GET /courses/{id}`, `GET /courses/{courseId}/lessons/{lessonId}`. **Tentativos:
el backend no tiene endpoints de contenido todavía.** Ver [`features.md`](./features.md).

## Tipos (`src/types/index.ts`)

DTOs espejados 1:1 de los records de `signa-api`. Los principales:

- `AuthResponse { accessToken, refreshToken }` — **no trae datos de usuario**.
- `LoginRequest { identifier, password }` — `identifier` puede ser email o username.
- `RegisterRequest { email, username, password, name }`.
- `ForgotPasswordRequest { email }`, `ResetPasswordRequest { newPassword }` (el token va aparte),
  `ChangePasswordRequest { currentPassword, newPassword }`, `ResendVerificationEmailRequest { email }`.
- `ApiErrorResponse { message, status, timestamp }` — forma del error del back; los mensajes de
  error de UI salen de `err?.response?.data?.message`.
- `User { email, name? }` — ver nota de perfil abajo.

## Persistencia de sesión y perfil

- **Tokens** → `src/utils/storage.ts` (`tokenStorage`) sobre **`expo-secure-store`**
  (Keychain/Keystore). Claves `signa_access_token`, `signa_refresh_token`.
- **JWT** → `src/utils/jwt.ts`: `extractEmailFromToken(token)` (claim `sub` = email),
  `isTokenExpired(token)`. El JWT **no** trae `role`, `id` ni `name`.
- **Nombre (best-effort)** → `src/utils/profileCache.ts` sobre **AsyncStorage** (no sensible,
  prefijo `signa_name_cache:`). Se guarda al registrarse en este dispositivo y se usa para el
  saludo/perfil. Fallback: si el usuario entra en otro dispositivo, se muestra el email.

> **Deuda:** el perfil depende del JWT + cache local porque el back no expone `GET /users/me`.
> Ver [`estado-y-roadmap.md`](./estado-y-roadmap.md).

## Entorno (`.env`)

```bash
# base SIN /api
# Emulador Android → 10.0.2.2 en vez de localhost
# Simulador iOS   → localhost funciona
# Dispositivo físico → IP local de la PC (ej 192.168.0.10)
EXPO_PUBLIC_API_URL=http://10.0.2.2:8080
```

`.env` está en `.gitignore`; copiar de `.env.example`. Las variables `EXPO_PUBLIC_*` se
embeben en el bundle en build time.
