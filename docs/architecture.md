# Architecture

> Responsibility: layers, folder responsibilities, `screens/` vs `features/` rule, `@/` alias, app boot sequence.
> Update when: folder structure, import alias, or `App.tsx` startup changes.
> Sources: App.tsx, babel.config.js, metro.config.js, tsconfig.json, app.json, modules/signa-vision/, src/

## Layers (`src/`)

| Folder | Responsibility | Detail |
|---|---|---|
| `api/` | HTTP layer to `signa-api` (Axios + interceptors) | [api/http-client.md](./api/http-client.md) |
| `context/` | Global state: `AuthContext` (session), `SettingsContext` (font scale, vibration), `FriendAcceptedContext` (friend-accepted polling) | [authentication/auth-context.md](./authentication/auth-context.md) · [features/profile.md](./features/profile.md) · [features/social.md](./features/social.md) |
| `navigation/` | Root / Auth / App navigators (native-stack) | [navigation.md](./navigation.md) |
| `screens/` | Cross-cutting screens (auth, tab screens Home / Practice / Store, Profile, Configuración, EditProfile, ChangePassword, VerifyEmail, RoleBlocked, ConnectionTest) | [authentication/screens.md](./authentication/screens.md) · [features/profile.md](./features/profile.md) |
| `features/` | Product-domain modules: `onboarding`, `tour`, `courses`, `lives`, `practice`, `social`, `store`, `challenges`, `achievements`, `animations` (sign avatar/video), `ml`, `profile` (avatar photo) | [features/onboarding.md](./features/onboarding.md) · [features/courses.md](./features/courses.md) · [features/social.md](./features/social.md) · [features/store.md](./features/store.md) · [features/ml.md](./features/ml.md) |
| `components/` | UI primitives (generic + `auth/`) | [design-system/components.md](./design-system/components.md) |
| `theme/` | `colors`, `typography`, `fontSizes` | [design-system/colors.md](./design-system/colors.md) |
| `types/` | DTOs mirrored from the backend | [api/types.md](./api/types.md) |
| `hooks/` | Reusable hooks: `useUsernameAvailability`, `useFitSquare` (sizes a square illustration to the free space of a flex container), `useActivityTracker` (lesson minutes), `useSessionTracker` (app-session telemetry), `usePushToken` (FCM), `useHaptics`, `useSecondsLeft` | [authentication/validation.md](./authentication/validation.md) |
| `utils/` | `validation`, `storage`, `jwt`, `caseConverter`, `profileCache`, `pendingReset`, `serverClock`, `googleAuth`, `authErrors`, `challengeErrors`, `color`, `avatar` | [api/session-persistence.md](./api/session-persistence.md) |
| `telemetry/` | fire-and-forget client telemetry → `POST /telemetry/events` | [api/endpoints.md](./api/endpoints.md#telemetry-srctelemetrytelemetryts) |
| `modules/signa-vision/` (repo root) | local Expo native module, **Android only**: camera recogniser (MediaPipe + LiteRT) and the Filament 3D avatar | [features/ml.md](./features/ml.md) · [avatar-3d.md](./avatar-3d.md) |

## `screens/` vs `features/`

- Cross-cutting screens (auth, profile, home, utilities) → `src/screens/`.
- A screen owned by a product domain with its own logic/types/API → `src/features/<domain>/screens/`, beside its `types.ts` and `api.ts`.

## Import alias

- `@/` → `src/` and `@assets/` → `assets/` (bundled images, e.g. the app icon used by the
  Welcome screen). Both are defined in **two files that must stay in sync**:
  - `babel.config.js` → `module-resolver` plugin (runtime/bundling resolution).
  - `tsconfig.json` → `compilerOptions.paths` (type resolution).
- Always import with `@/...` / `@assets/...`; never long relative paths (`../../..`).

## Technology choices

Versions live in `package.json` — not duplicated here.

- Framework: Expo (managed) + React Native + React.
- Language: TypeScript, `strict`.
- Navigation: React Navigation, `@react-navigation/native-stack`.
- HTTP: Axios with interceptors.
- Global state: Context API only (no Redux/Zustand).
- Storage: `expo-secure-store` (tokens) + `@react-native-async-storage/async-storage` (non-sensitive).
- Fonts: `@expo-google-fonts/*` (Bricolage Grotesque + Figtree).
- Native: the local module `modules/signa-vision` (Kotlin; CameraX, MediaPipe Tasks, LiteRT, Filament) — recognition and the 3D avatar. `hayNativo` is the runtime switch (see [status.md](./status.md#plataformas)).
- Animations: `lottie-react-native` (Lottie JSON in `assets/animations/`). Native module → needs a dev-build rebuild after install. See [features/achievements.md](./features/achievements.md).
- Icons: `@expo/vector-icons` (Ionicons) for the icon font set; `react-native-svg` for one-off SVG icons/illustrations. See [design-system/components.md](./design-system/components.md#svg-icons--illustrations).

## Boot sequence (`App.tsx`)

0. `initTelemetry()` starts the client telemetry batching.
1. `useFonts({ Figtree_*, BricolageGrotesque_* })` — renders a centered `ActivityIndicator` while `!fontsLoaded` (real tree not mounted).
1b. Only in builds with `EXPO_PUBLIC_BANCO_NATIVO=1` and the native module present, `BancoNativoPantalla` (the recogniser bench) is shown before the app until "seguir".
2. Wraps the tree in `SafeAreaProvider` → `SettingsProvider` → `AuthProvider` (which hydrates the session from secure-store).
3. `RootNavigator` shows a loader while the session hydrates, then switches between `AuthNavigator` (logged out) and `AppNavigator` (logged in). See [navigation.md](./navigation.md).

## Relevant config

- `app.json` — app name "Signa", bundle `com.signasource.signamobile`, Android `googleServicesFile` (FCM), plugins `expo-font` + `expo-camera` + `expo-secure-store` + `expo-image-picker` (profile photo; photo-library and camera strings) + `expo-asset` + `expo-web-browser`, `scheme: "signa"` (deep link back from the Mercado Pago checkout), camera permission strings for both
  platforms, `userInterfaceStyle: light`. Native modules mean the app runs as a **development build** (`npx expo run:android`, EAS `development` profile with `expo-dev-client`), not in Expo Go; `android/` and `ios/` are generated by prebuild and git-ignored.
- `tsconfig.json` — extends `expo/tsconfig.base`, `strict: true`, alias `@/*`.
- `metro.config.js` — Expo default config plus `react-native-svg-transformer`: `.svg` files are removed from `assetExts` and added to `sourceExts` so they import as React components (`import Icon from "@assets/icon.svg"`) instead of static image assets. Type declaration in `svg.d.ts` (project root, picked up by `tsconfig.json`'s `include`).
- `.env` — `EXPO_PUBLIC_API_URL` (see [api/http-client.md](./api/http-client.md)).
- `eslint.config.js` — ESLint 9 flat config extending `eslint-config-expo/flat`; turns off
  `import/no-named-as-default-member` (false positive on `axios.create` / `axios.isCancel`).
  No Prettier (see [status.md](./status.md)).
