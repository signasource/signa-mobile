<!--
última actualización: 2026-07-29
mantener al: agregar/renombrar/eliminar una pantalla o ruta, o cambiar params de navegación.
-->

# Navegación

Toda la navegación usa `@react-navigation/native-stack`. Hay tres navigators.

## RootNavigator (`src/navigation/RootNavigator.tsx`)

Punto de decisión de la app. Consume `useAuth()`:
- Mientras `isLoading` (hidratando sesión desde secure-store) → muestra un loader.
- Si `isAuthenticated` → `AppNavigator`.
- Si no → `AuthNavigator`.

No hay que navegar "a mano" entre login y app: al setear/limpiar el usuario en `AuthContext`,
`RootNavigator` cambia de stack solo.

## AuthNavigator (`src/navigation/AuthNavigator.tsx`)

Onboarding + pantallas de autenticación. `initialRoute` por defecto: `"Welcome"`.
`screenOptions`: `headerShown: false`, `animation: "slide_from_right"`.

`AuthStackParamList`:

| Ruta | Params | Pantalla |
|---|---|---|
| `Welcome` | — | onboarding |
| `Intro` | — | onboarding (paso 1) |
| `DailyGoal` | — | onboarding (paso 2) |
| `Experience` | — | onboarding (paso 3) |
| `Motivation` | — | onboarding (paso 4) |
| `Achievement` | — | onboarding (cierre) |
| `Login` | — | `screens/auth/LoginScreen` |
| `Register` | — | `screens/auth/RegisterScreen` |
| `VerifyEmail` | `{ email?: string }` | `screens/auth/VerifyEmailScreen` |
| `ForgotPassword` | — | `screens/auth/ForgotPasswordScreen` |
| `ForgotPasswordSent` | `{ email: string }` (requerido) | `screens/auth/ForgotPasswordSentScreen` |
| `ResetPassword` | `{ token?: string }` | `screens/auth/ResetPasswordScreen` |

**Barra de progreso de onboarding:** se renderiza como **overlay fijo**
(`OnboardingProgressOverlay`) por fuera del `Stack.Navigator`, para que no participe de la
animación de transición. El mapa `ONBOARDING_STEP` define el paso de cada ruta
(`Intro:1, DailyGoal:2, Experience:3, Motivation:4`) y el progreso es `step / ONBOARDING_TOTAL_STEPS`
(`ONBOARDING_TOTAL_STEPS` viene de `@/features/onboarding/types`). Las rutas fuera de ese mapa
no muestran barra.

## AppNavigator (`src/navigation/AppNavigator.tsx`)

Pantallas post-login. `screenOptions` con header oscuro:
`headerStyle.backgroundColor = colors.azulOscuro`, `headerTintColor = colors.white`,
`headerTitleStyle.fontFamily = fonts.headingSemiBold` (tokens legacy, es código existente).

`AppStackParamList`:

| Ruta | Params | Título header | Pantalla |
|---|---|---|---|
| `Home` | — | (sin header) | `screens/HomeScreen` |
| `Profile` | — | "Perfil" | `screens/ProfileScreen` |
| `ChangePassword` | — | "Cambiar contrasena" | `screens/ChangePasswordScreen` |
| `Courses` | — | "Cursos" | `features/courses/screens/CoursesListScreen` |
| `Lesson` | `{ courseId: string; lessonId: string }` | "Leccion" | `features/courses/screens/LessonScreen` |
| `SignRecognition` | — | "Practicar" | `features/ml/screens/SignRecognitionScreen` |
| `ConnectionTest` | — | "Test de conexion" | `screens/ConnectionTestScreen` |

## Cómo agregar una pantalla

1. Crear el componente en `screens/` (transversal) o `features/<dominio>/screens/` (de feature).
2. Tiparlo con `NativeStackScreenProps<AuthStackParamList | AppStackParamList, "MiRuta">`.
3. Agregar la ruta (con sus params) al `ParamList` correspondiente.
4. Registrarla con `<Stack.Screen name="MiRuta" ... />` en el navigator, con sus `options`.
5. Si es de auth/onboarding, montar el contenido dentro de `AuthScreen` (ver
   [`design-system.md`](./design-system.md)).

## Navegación entre pantallas

- `navigation.navigate("Ruta", params)` / `navigation.replace(...)` / `navigation.goBack()`.
- Leer params: `route.params?.campo`.
- Cambiar de contexto auth↔app **no** se hace navegando: se hace mutando la sesión en
  `AuthContext` (ver [`auth.md`](./auth.md)).
