# signa-mobile (scaffold)

Scaffold en **React Native (Expo + TypeScript)** para conectar el front mobile de Signa (app de aprendizaje de LSA con reconocimiento por camara) con el backend `signa-api` (Spring Boot). Este repo no es la app final: es una base funcional de auth + navegacion + los lugares reservados para contenido y ML, lista para que el equipo siga construyendo encima.

## 1. Que trae este scaffold

- Login, registro, verificacion de email, "olvide mi contrasena", reset y cambio de contrasena — **conectados a los endpoints reales de `signa-api`** (ver seccion 2).
- Manejo de sesion (`AuthContext`) con guardado seguro de tokens (`expo-secure-store`) y refresh automatico ante un 401.
- Perfil de usuario armado a partir del **JWT decodificado**, porque el backend todavia no expone un endpoint de perfil (ver seccion 3).
- Navegacion con `React Navigation`: stack de auth vs. stack de app segun haya sesion.
- Pantalla **"Test de conexion"**, provisoria, para verificar que el celular/emulador le puede pegar a `signa-api`.
- Carpetas `src/features/courses` y `src/features/ml`, con tipos y pantallas placeholder, para que el equipo sepa donde va cada cosa cuando el back defina esos modulos (ver seccion 4).
- Theming centralizado (`src/theme`) con la paleta y tipografias (Montserrat + Poppins) pedidas.
- `.gitlab-ci.yml` basico con typecheck y lint.

## 2. Endpoints — confirmados contra el codigo real

A diferencia de la primera version de este scaffold, esto ya esta chequeado contra `AuthController.java`, `UserController.java`, los DTOs y `SecurityConfig.java` reales:

| Accion | Path | Metodo | Notas |
|---|---|---|---|
| Registro | `/auth/register` | POST | Devuelve **201 sin body**. No loguea automaticamente. |
| Login | `/auth/login` | POST | Devuelve `{ accessToken, refreshToken }` |
| Refresh | `/auth/refresh` | POST | |
| Verificar email | `/auth/verify?token=` | GET | `token` es query param |
| Olvide contrasena | `/auth/forgot-password` | POST | |
| Reset contrasena | `/auth/reset-password?token=` | POST | `token` va como **query param**, separado del body |
| Reenviar verificacion | `/auth/resend-verification-email` | POST | |
| Cambiar contrasena | `/users/password` | PUT | Devuelve tokens nuevos `{ accessToken, refreshToken }` |

**No existe `GET /users/me` ni ningun otro endpoint de perfil hoy.** `UserController` solo tiene `PUT /users/password`.

Sin context-path en `application.yaml` → la URL base es directa, **sin `/api`**: `http://localhost:8080`.

### Lo que quedo sin confirmar

- Contenido de `ResendVerificationEmailRequest.java` — sigue sin verse; se asume `{ email }` por analogia con `ForgotPasswordRequest` (que ya esta confirmado y tiene exactamente esa forma).
- `ChangePasswordRequest`, `ResetPasswordRequest` y `ForgotPasswordRequest` **ya estan confirmados** contra el codigo real y coinciden con lo que se habia asumido.
- `JwtService.java` **ya esta confirmado**: el token solo lleva `subject` (username/email), `issuedAt` y `expiration` — sin `role`, `id` ni `name`. Ver seccion 3.

## 3. Como se resuelve el perfil sin `GET /users/me`

`SecurityConfig.java` muestra que fuera de `/auth/**` todo requiere autenticacion, y `User.java` tiene `id`, `email`, `name`, `role`, `enabled` en la base de datos — pero no hay ningun endpoint que devuelva esos datos del usuario logueado, y **`JwtService.java` (ya confirmado) genera el token con `Jwts.builder().subject(user.getUsername())...`, sin agregar ningun claim extra**. O sea, el JWT solo trae:

- `sub` (subject) → el username de Spring Security, que en este back es el email
- `iat` (issued at)
- `exp` (expiration)

Nada de `role`, `id` ni `name`. Por eso:

- **`email`**: se obtiene con certeza decodificando el token (`src/utils/jwt.ts`, funcion `extractEmailFromToken`).
- **`name`**: no hay forma de obtenerlo del back en ningun endpoint hoy. El unico momento en que el front lo conoce es en el propio formulario de registro (`RegisterRequest.name`). Se guarda en un cache local por email (`src/utils/profileCache.ts`, con AsyncStorage) para poder mostrarlo despues del login **en el mismo dispositivo**. Si el usuario se loguea desde otro dispositivo, o borra la app, no va a aparecer hasta que exista un endpoint real.
- **`role`, `id`**: no estan disponibles en el front por ahora. No se muestran en ninguna pantalla.

Cuando se pueda, lo ideal es pedir que agreguen `GET /users/me` (o que el `AuthResponse` devuelva estos datos directamente en el login) — ahi se reemplaza todo este armado local en `AuthContext.tsx` por un fetch real, y se agrega el metodo correspondiente en `src/api/users.ts`.

## 4. Estructura pensada para la app real (LSA + reconocimiento por camara)

La primera version de este scaffold era generica. Esta ya tiene los lugares reservados para lo especifico del producto:

```
src/features/
├── courses/                 # cursos, lecciones, bloques (segun content.yml del PDF de arquitectura)
│   ├── types.ts              # Course / Lesson / LessonBlock / LessonProgress
│   ├── api.ts                 # STUB - paths tentativos, el back no tiene endpoints de contenido todavia
│   └── screens/
│       ├── CoursesListScreen.tsx   # ya intenta pegarle a /courses (falla hasta que exista)
│       └── LessonScreen.tsx        # placeholder del reproductor de una leccion
└── ml/                        # reconocimiento de senas por camara
    ├── README.md               # que falta decidir antes de implementar esto en serio
    ├── types.ts                 # SignRecognitionResult, etc. (tentativo)
    └── screens/
        └── SignRecognitionScreen.tsx  # placeholder, SIN camara ni TFLite instalados
```

Puntos importantes de esta parte:

- **No instale `react-native-vision-camera` ni ningun runtime de TFLite/ONNX todavia.** Esas libs requieren salir de Expo Go y pasar a un dev build (`expo-dev-client` / EAS Build), lo cual afecta el flujo de todo el equipo, no solo esta feature. Los detalles y las decisiones pendientes estan en `src/features/ml/README.md`.
- Los endpoints de `courses/api.ts` son **inventados/tentativos** (`/courses`, `/courses/{id}/lessons/{lessonId}`) — no hay nada de esto en `signa-api` todavia (no aparece controller/entity de cursos en el tree). Sirven para que la pantalla de listado ya este armada y conectable el dia que el back defina el modelo real.
- Los botones "Cursos" y "Practicar con la camara" ya estan en el Home y navegan a estas pantallas placeholder, para que el flujo de navegacion completo quede visible desde ya.

## 5. Requisitos

- Node.js 20+
- npm (o yarn/pnpm si el equipo prefiere, hay que migrar el lockfile)
- Expo Go instalado en el celular (o un emulador Android/iOS) para probar rapido sin compilar nativo — **hasta que se agregue camara/ML**, momento en el que va a hacer falta un dev build

## 6. Instalacion

```bash
npm install
cp .env.example .env
```

Editar `.env` con la URL de `signa-api` corriendo en local (**sin `/api`**):

```bash
# Emulador Android -> usar 10.0.2.2 en vez de localhost
# Simulador iOS -> localhost funciona directo
# Dispositivo fisico -> IP local de tu PC en la misma red WiFi (ej 192.168.0.10)
EXPO_PUBLIC_API_URL=http://localhost:8080
```

## 7. Correr la app

```bash
npm start
```

- Escanear el QR con Expo Go (Android) o la app Camara (iOS).
- `a` para emulador Android, `i` para simulador iOS, `w` para web (limitado).

## 8. Sobre CORS

`SecurityConfig.java` no define ningun `CorsConfigurationSource`. Para una app **mobile nativa** (Expo Go / build nativo) esto no es un problema — CORS es una restriccion que aplican los navegadores, no el runtime de React Native. Si en algun momento prueban esta app corriendo con `npm run web` (Expo Web), ahi si puede fallar por CORS y va a hacer falta agregar esa config en el back.

## 9. Flujo de prueba sugerido

1. Levantar `signa-api` (`./gradlew bootRun` o `docker-compose up`), perfil `local` (asi `SecurityConfig` deja todo con `permitAll` mientras se prueba).
2. Correr `npm start` en `signa-mobile`.
3. En Login, tocar **"Probar conexion con el backend"** para confirmar que llega la request.
4. Registrar un usuario nuevo (`Crear cuenta`). Como `/auth/register` no devuelve tokens, la app te manda a la pantalla de **verificar email**.
5. Copiar el token que llega por mail (via `EmailService.java` — revisar la config de `MAIL_USERNAME`/`MAIL_PASSWORD` en el `.env` del back) y pegarlo en esa pantalla, o usar "Reenviar mail de verificacion" si hace falta.
6. Una vez verificado, iniciar sesion normalmente.
7. Desde Home: "Ver perfil" (datos del JWT), "Cambiar contrasena" (`PUT /users/password`), "Cursos" y "Practicar con la camara" (placeholders, todavia no conectados a nada real).

## 10. Estructura del proyecto

```
signa-mobile/
├── App.tsx
├── src/
│   ├── api/                    # capa de conexion con signa-api
│   │   ├── client.ts            # instancia Axios + interceptores (auth header, refresh)
│   │   ├── auth.ts               # endpoints de auth (confirmados)
│   │   ├── users.ts              # PUT /users/password (unico endpoint real hoy)
│   │   └── health.ts             # helper del test de conexion
│   ├── context/AuthContext.tsx  # estado global de sesion
│   ├── navigation/
│   │   ├── RootNavigator.tsx
│   │   ├── AuthNavigator.tsx     # Login, Register, VerifyEmail, ForgotPassword, ResetPassword
│   │   └── AppNavigator.tsx      # Home, Profile, ChangePassword, Courses, Lesson, SignRecognition
│   ├── screens/                 # pantallas transversales (auth, perfil, cambio de pass, test conexion)
│   ├── features/
│   │   ├── courses/              # ver seccion 4
│   │   └── ml/                   # ver seccion 4
│   ├── components/               # Button, Input, Card (paleta/tipografia)
│   ├── theme/
│   ├── types/                    # tipos espejados de los DTOs reales del back
│   └── utils/
│       ├── storage.ts             # persistencia segura de tokens
│       └── jwt.ts                 # decodificacion del JWT para armar el User (ver seccion 3)
├── .env.example
├── .gitlab-ci.yml
└── package.json
```

## 11. Paleta y tipografia

| Uso | Color | Hex |
|---|---|---|
| Primario (Morado) | `colors.primary` | `#7455F7` |
| Exito (Verde) | `colors.success` | `#34D339` |
| Advertencia (Amarillo) | `colors.warning` | `#FBBF24` |
| Acento (Rosado) | `colors.accent` | `#F47643` |
| Texto / Header oscuro | `colors.azulOscuro` | `#1D283C` |
| Fondo (Blanco) | `colors.background` | `#F7F8FB` (el hex original "#F78FB" tenia un digito de menos) |

- Titulos -> **Poppins** (`fonts.headingRegular` a `fonts.headingBold`)
- Cuerpo -> **Montserrat** (`fonts.bodyRegular` a `fonts.bodyBold`)

## 12. Proximos pasos sugeridos

- [ ] Confirmar `ResendVerificationEmailRequest.java` (unico DTO que sigue sin verse) para sacar la ultima suposicion que queda.
- [ ] Pedir `GET /users/me` (o equivalente) para dejar de depender del JWT decodificado para el perfil.
- [ ] Definir el modelo de contenido real (cursos/lecciones/bloques) y sus endpoints, y actualizar `src/features/courses/api.ts`.
- [ ] Definir con el equipo de ML: libreria de camara, runtime de inferencia, y formato del modelo — ver `src/features/ml/README.md`.
- [ ] Deep linking para verificacion de email y reset de contrasena (hoy los tokens se pegan a mano).
