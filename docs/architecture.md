# Architecture

> Responsibility: layers, folder responsibilities, `screens/` vs `features/` rule, `@/` alias, app boot sequence.
> Update when: folder structure, import alias, or `App.tsx` startup changes.
> Sources: App.tsx, babel.config.js, tsconfig.json, app.json, src/

## Layers (`src/`)

| Folder | Responsibility | Detail |
|---|---|---|
| `api/` | HTTP layer to `signa-api` (Axios + interceptors) | [api/http-client.md](./api/http-client.md) |
| `context/` | Global session state (`AuthContext`) | [authentication/auth-context.md](./authentication/auth-context.md) |
| `navigation/` | Root / Auth / App navigators (native-stack) | [navigation.md](./navigation.md) |
| `screens/` | Cross-cutting screens (auth, Home, Profile, ChangePassword, ConnectionTest) | [authentication/screens.md](./authentication/screens.md) |
| `features/` | Product-domain modules (onboarding, courses, shop, ml) | [features/onboarding.md](./features/onboarding.md) |
| `components/` | UI primitives (generic + `auth/`) | [design-system/components.md](./design-system/components.md) |
| `theme/` | `colors`, `typography`, `fontSizes` | [design-system/colors.md](./design-system/colors.md) |
| `types/` | DTOs mirrored from the backend | [api/types.md](./api/types.md) |
| `hooks/` | Reusable hooks (`useUsernameAvailability`) | [authentication/validation.md](./authentication/validation.md) |
| `utils/` | `validation`, `storage`, `jwt`, `caseConverter`, `profileCache` | — |

## `screens/` vs `features/`

- Cross-cutting screens (auth, profile, home, utilities) → `src/screens/`.
- A screen owned by a product domain with its own logic/types/API → `src/features/<domain>/screens/`, beside its `types.ts` and `api.ts`.

## Import alias

- `@/` → `src/`. Defined in **two files that must stay in sync**:
  - `babel.config.js` → `module-resolver` plugin (runtime/bundling resolution).
  - `tsconfig.json` → `compilerOptions.paths` (type resolution).
- Always import with `@/...`; never long relative paths (`../../..`).

## Technology choices

Versions live in `package.json` — not duplicated here.

- Framework: Expo (managed) + React Native + React.
- Language: TypeScript, `strict`.
- Navigation: React Navigation, `@react-navigation/native-stack`.
- HTTP: Axios with interceptors.
- Global state: Context API only (no Redux/Zustand).
- Storage: `expo-secure-store` (tokens) + `@react-native-async-storage/async-storage` (non-sensitive).
- Fonts: `@expo-google-fonts/*` (Bricolage Grotesque + Figtree).
- Icons: `@expo/vector-icons` (Ionicons).

## Boot sequence (`App.tsx`)

1. `useFonts({ Figtree_*, BricolageGrotesque_* })` — renders a centered `ActivityIndicator` while `!fontsLoaded` (real tree not mounted).
2. Wraps the tree in `SafeAreaProvider` → `AuthProvider` (which hydrates the session from secure-store).
3. `RootNavigator` shows a loader while the session hydrates, then switches between `AuthNavigator` (logged out) and `AppNavigator` (logged in). See [navigation.md](./navigation.md).

## Relevant config

- `app.json` — app name "Signa", bundle `com.signasource.signamobile`, plugins `expo-font` + `expo-secure-store`, `userInterfaceStyle: light`.
- `tsconfig.json` — extends `expo/tsconfig.base`, `strict: true`, alias `@/*`.
- `.env` — `EXPO_PUBLIC_API_URL` (see [api/http-client.md](./api/http-client.md)).
- No ESLint/Prettier config (see [status.md](./status.md)).
