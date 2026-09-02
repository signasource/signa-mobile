# Navigation

> Responsibility: navigators, auth↔app switching, route params, add-a-screen procedure.
> Update when: a screen/route is added, renamed, or removed, or navigation params change.
> Sources: src/navigation/RootNavigator.tsx, AuthNavigator.tsx, AppNavigator.tsx

All navigation uses `@react-navigation/native-stack`. Three navigators.

## RootNavigator (`src/navigation/RootNavigator.tsx`)

App decision point. Consumes `useAuth()`:
- `isLoading` (hydrating session from secure-store) → loader.
- `isAuthenticated` → `AppNavigator`.
- otherwise → `AuthNavigator`.

Switching between auth and app is **not** done by navigating; mutate the session in `AuthContext` (see [authentication/auth-context.md](./authentication/auth-context.md)).

## AuthNavigator (`src/navigation/AuthNavigator.tsx`)

Onboarding + authentication screens. Default `initialRoute`: `Welcome`. `screenOptions`: `headerShown: false`, `animation: "slide_from_right"`.

`AuthStackParamList` (source of truth for params):

| Route | Params | Screen |
|---|---|---|
| `Welcome` | — | onboarding |
| `Intro` | — | onboarding (step 1) |
| `DailyGoal` | — | onboarding (step 2) |
| `Experience` | — | onboarding (step 3) |
| `Motivation` | — | onboarding (step 4) |
| `Achievement` | — | onboarding (closing) |
| `Login` | — | `screens/auth/LoginScreen` |
| `Register` | — | `screens/auth/RegisterScreen` |
| `ForgotPassword` | — | `screens/auth/ForgotPasswordScreen` |
| `ForgotPasswordSent` | `{ email: string }` (required) | `screens/auth/ForgotPasswordSentScreen` |
| `ResetPassword` | `{ token?: string }` | `screens/auth/ResetPasswordScreen` |

Onboarding progress bar: rendered as a **fixed overlay** (`OnboardingProgressOverlay`) outside the `Stack.Navigator`, so it stays still during transitions. `ONBOARDING_STEP` maps route → step (`Intro:1, DailyGoal:2, Experience:3, Motivation:4`); progress = `step / ONBOARDING_TOTAL_STEPS` (from `@/features/onboarding/types`). Routes outside the map show no bar.

## AppNavigator (`src/navigation/AppNavigator.tsx`)

Post-login screens with tab navigation. `screenOptions` use a dark header: `headerStyle.backgroundColor = colors.azulOscuro`, `headerTintColor = colors.white`, `headerTitleStyle.fontFamily = fonts.headingSemiBold` (legacy tokens; existing code).

`AppStackParamList`:

| Route | Params | Header title | Screen |
|---|---|---|---|
| `Tabs` | — | (no header) | `navigation/TabNavigator` |
| `ChangePassword` | — | "Cambiar contrasena" | `screens/ChangePasswordScreen` |
| `Lesson` | `{ courseId: string; lessonId: string }` | "Leccion" | `features/courses/screens/LessonScreen` |
| `SignRecognition` | — | "Practicar" | `features/ml/screens/SignRecognitionScreen` |
| `ConnectionTest` | — | "Test de conexion" | `screens/ConnectionTestScreen` |

Header titles are UI copy (Spanish), kept verbatim from the code.

## TabNavigator (`src/navigation/TabNavigator.tsx`)

Bottom tab navigation with five tabs. Uses `@react-navigation/bottom-tabs`. Tab bar displays only icons (no labels), styled with `colors.primary` (#7857FF) as active tint and `colors.neutral600` as inactive. Based on design in Perfil.dc.html.

`TabParamList`:

| Tab | Icon | Screen |
|---|---|---|
| `Home` | home/home-outline | `screens/tabs/HomeTabScreen` |
| `Practice` | hand-left/hand-left-outline | `screens/tabs/PracticeTabScreen` |
| `Store` | storefront/storefront-outline | `screens/tabs/StoreTabScreen` |
| `Social` | people/people-outline | `screens/tabs/SocialTabScreen` |
| `Profile` | person/person-outline | `screens/ProfileScreen` |

Tab screens Practice and Social are currently placeholders. Home (Inicio lesson roadmap — see [features/courses.md](./features/courses.md#inicio-home-roadmap-screen)), Store and Profile have full implementations.

## Add a screen

1. Create the component in `screens/` (cross-cutting) or `features/<domain>/screens/` (feature).
2. Type it with `NativeStackScreenProps<AuthStackParamList | AppStackParamList, "MyRoute">`.
3. Add the route (with params) to the matching `ParamList`.
4. Register it with `<Stack.Screen name="MyRoute" ... />` and its `options`.
5. If it is auth/onboarding, mount the content inside `AuthScreen` (see [design-system/components.md](./design-system/components.md)).

## Navigating

- `navigation.navigate("Route", params)` / `navigation.replace(...)` / `navigation.goBack()`.
- Read params: `route.params?.field`.
