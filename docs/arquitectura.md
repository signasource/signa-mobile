<!--
última actualización: 2026-07-29
mantener al: cambiar estructura de carpetas, alias de imports, dependencias base o el arranque de la app.
-->

# Arquitectura

## Stack

| Área | Elección |
|---|---|
| Framework | Expo `^54` (React `19.1`, React Native `0.81.5`) |
| Lenguaje | TypeScript `~5.9`, **strict** |
| Navegación | React Navigation 6, `@react-navigation/native-stack` |
| HTTP | Axios `^1.7` con interceptores |
| Estado global | Context API (`AuthContext`) — sin Redux/Zustand |
| Storage seguro | `expo-secure-store` (tokens) + `@react-native-async-storage/async-storage` (no sensible) |
| Fuentes | `@expo-google-fonts/*` (Bricolage Grotesque + Figtree) |
| Iconos | `@expo/vector-icons` (Ionicons) |

## Alias de imports

`@/` → `src/`. Definido en dos lugares que deben mantenerse sincronizados:
- `babel.config.js` → plugin `module-resolver` (resolución en runtime/bundling).
- `tsconfig.json` → `compilerOptions.paths` (resolución de tipos).

Siempre importar con `@/...`, nunca con rutas relativas largas.

## Estructura de carpetas (`src/`)

```
src/
├── api/          # capa de conexión con signa-api (ver api-y-datos.md)
│   ├── client.ts   # instancia Axios + interceptores
│   ├── auth.ts     # endpoints de auth
│   ├── users.ts    # endpoints de usuario
│   └── health.ts   # helper del test de conexión
├── context/
│   └── AuthContext.tsx   # estado global de sesión (ver auth.md)
├── navigation/           # ver navegacion.md
│   ├── RootNavigator.tsx
│   ├── AuthNavigator.tsx
│   └── AppNavigator.tsx
├── screens/              # pantallas transversales (no específicas de una feature)
│   ├── auth/             #   Login, Register, VerifyEmail, ForgotPassword(+Sent), ResetPassword
│   ├── HomeScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── ChangePasswordScreen.tsx
│   └── ConnectionTestScreen.tsx
├── features/             # módulos por feature (ver features.md)
│   ├── onboarding/       #   screens/ + types.ts + storage.ts
│   ├── courses/          #   screens/ + types.ts + api.ts (stub)
│   └── ml/               #   screens/ + types.ts + README.md (placeholder)
├── components/           # primitivas de UI (ver design-system.md)
│   ├── auth/             #   primitivas específicas de auth/onboarding
│   └── *.tsx             #   Button, Input, Card, BackButton, FieldIcon, SignaLogo, OnboardingProgress
├── theme/                # colors.ts, typography.ts, index.ts
├── types/                # index.ts — DTOs espejados del backend
└── utils/                # validation, storage, jwt, caseConverter, profileCache
```

**Convención `screens/` vs `features/`:** las pantallas transversales (auth, perfil, home,
utilidades) viven en `screens/`. Cuando una pantalla pertenece a un dominio de producto con su
propia lógica/tipos/API, va en `features/<dominio>/screens/` junto a su `types.ts` y su `api.ts`.

## Flujo de arranque (`App.tsx`)

```
App
├─ useFonts({ Figtree_*, BricolageGrotesque_* })   // bloquea con ActivityIndicator hasta cargar
└─ <SafeAreaProvider>
     └─ <AuthProvider>                              // hidrata sesión desde secure-store
          ├─ <StatusBar style="dark" />
          └─ <RootNavigator />                      // decide Auth vs App según isAuthenticated
```

1. `App.tsx` carga las fuentes con `useFonts`. Mientras `!fontsLoaded`, muestra un
   `ActivityIndicator` centrado (no renderiza el árbol real).
2. Envuelve todo en `SafeAreaProvider` y `AuthProvider`.
3. `RootNavigator` muestra un loader mientras `AuthContext` hidrata la sesión, y luego alterna
   entre `AuthNavigator` (no logueado) y `AppNavigator` (logueado). Ver
   [`navegacion.md`](./navegacion.md) y [`auth.md`](./auth.md).

## Configuración relevante

- `app.json` — nombre "Signa", bundle `com.signasource.signamobile`, plugins `expo-font` y
  `expo-secure-store`, `userInterfaceStyle: light`.
- `tsconfig.json` — extiende `expo/tsconfig.base`, `strict: true`, alias `@/*`.
- `.env` — `EXPO_PUBLIC_API_URL` (ver [`api-y-datos.md`](./api-y-datos.md)).
- **No hay** config propia de ESLint/Prettier (ver [`estado-y-roadmap.md`](./estado-y-roadmap.md)).
