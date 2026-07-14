# signa-mobile (scaffold)

Scaffold en **React Native (Expo + TypeScript)** para conectar el front mobile de Signa (app de aprendizaje de LSA con reconocimiento por camara) con el backend `signa-api` (Spring Boot). Este repo no es la app final: es una base funcional de auth + navegacion + los lugares reservados para contenido y ML, lista para que el equipo siga construyendo encima.

## 1. Que trae este scaffold

- Login, registro, verificacion de email, "olvide mi contrasena", reset y cambio de contrasena.
- Manejo de sesion (`AuthContext`) con guardado seguro de tokens (`expo-secure-store`) y refresh automatico ante un 401.
- Perfil de usuario armado a partir del **JWT decodificado**.
- Navegacion con `React Navigation`: stack de auth vs.
- Pantalla **"Test de conexion"**, provisoria, para verificar que el celular/emulador le puede pegar a `signa-api`.
- Theming centralizado (`src/theme`) con la paleta y tipografias (Montserrat + Poppins).

## 2. Endpoints 


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


la URL base es directa, **sin `/api`**: `http://localhost:8080`.



## 3. Estructura para la app 


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

- **No se instaló `react-native-vision-camera` ni ningun runtime de TFLite/ONNX todavia.** Esas libs requieren salir de Expo Go y pasar a un dev build (`expo-dev-client` / EAS Build), lo cual afecta el flujo de todo el equipo, no solo esta feature.
- Los endpoints de `courses/api.ts` son **inventados/tentativos**.

## 4. Requisitos

- Node.js 20+
- npm (o yarn/pnpm si el equipo prefiere, hay que migrar el lockfile)
- Expo Go instalado en el celular (o un emulador Android/iOS) para probar rapido sin compilar nativo, momento en el que va a hacer falta un dev build

## 5. Instalacion

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

## 6. Correr la app

```bash
npm start
```

- Escanear el QR con Expo Go (Android) o la app Camara (iOS).
- `a` para emulador Android, `i` para simulador iOS, `w` para web (limitado).


## 7. Estructura del proyecto

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

## 8. Paleta y tipografia

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

## 9. Proximos pasos 

- [ ]  `GET /users/me` (o equivalente) para dejar de depender del JWT decodificado para el perfil.
- [ ] Deep linking para verificacion de email y reset de contrasena (hoy los tokens se pegan a mano).
