# CLAUDE.md — signa-mobile

Entry point and mandatory rules for developing `signa-mobile` with Claude / Claude Design.
Detailed docs (retrieval map): [`docs/README.md`](./docs/README.md).

`signa-mobile` is a React Native (Expo, TypeScript strict) app for Signa — learning Argentine
Sign Language (LSA) with camera recognition. Backend: `signa-api` (Spring Boot). Solved today:
auth, navigation, theming, onboarding. Reserved: courses (stub), ML (placeholder).

## Docs are code

These docs are the project's memory and must **self-maintain** — every change closes this loop:
1. **Before** touching an area, open its doc (router below, or [docs/README.md](./docs/README.md)) to load the current state.
2. **After**, update that same doc in the **same commit** — code and its doc move together, never in a follow-up.

If reality already diverged from a doc, **the code wins**: fix the doc first (re-read the files in its `Sources` header). Router:

| Change | Update |
|---|---|
| Add/rename a screen or route | [docs/navigation.md](./docs/navigation.md) |
| Add/change an endpoint | [docs/api/endpoints.md](./docs/api/endpoints.md) |
| Change the HTTP client or env | [docs/api/http-client.md](./docs/api/http-client.md) |
| Add/change a DTO | [docs/api/types.md](./docs/api/types.md) |
| Change token / session / profile storage | [docs/api/session-persistence.md](./docs/api/session-persistence.md) |
| Change the session flow or `useAuth` | [docs/authentication/auth-context.md](./docs/authentication/auth-context.md) |
| Change an auth screen flow | [docs/authentication/screens.md](./docs/authentication/screens.md) |
| Change a validation rule | [docs/authentication/validation.md](./docs/authentication/validation.md) |
| Add/change a color, font, size, or UI primitive | [docs/design-system/colors.md](./docs/design-system/colors.md) |
| Advance a feature or flip stub↔real | the feature's doc under [docs/features/](./docs/features/) ([onboarding](./docs/features/onboarding.md) · [courses](./docs/features/courses.md) · [social](./docs/features/social.md) · [ml](./docs/features/ml.md)) + [docs/status.md](./docs/status.md) |
| Change folder structure, alias, or app startup | [docs/architecture.md](./docs/architecture.md) |
| Add/resolve tech debt | [docs/status.md](./docs/status.md) |

A new cross-cutting convention goes in this file (§ Rules).

## Rules

**Language & types**
- TypeScript strict. No `any` in public APIs (props, exported types, returns).
- Import via the `@/` → `src/` alias (defined in `babel.config.js` + `tsconfig.json`). Never long relative paths.
- English for docs and code identifiers. **Spanish for user-facing UI copy.**

**Styling**
- `StyleSheet.create()` at the end of the file. No styled-components / CSS-in-JS.
- Never hardcode hex or font names — use `@/theme` tokens (`colors.*`, `fonts.*`, `fontSizes.*`).
- Do not use legacy tokens (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …) in new screens. See [docs/design-system/colors.md](./docs/design-system/colors.md).

**Components & screens**
- Reuse existing primitives before creating new ones (generic `@/components/*` + auth `@/components/auth/*`). See [docs/design-system/components.md](./docs/design-system/components.md).
- Auth/onboarding screens mount inside `AuthScreen`.
- Type screens with `NativeStackScreenProps<ParamList, "Route">`. Add a screen → [docs/navigation.md](./docs/navigation.md).

**State & data**
- Global state: Context API only (`AuthContext` via `useAuth()`). No Redux/Zustand without asking.
- Local state: `useState`. Validation via `@/utils/validation`.
- All HTTP via `@/api/*` (never `axios` directly): the client injects the Bearer token, converts camelCase↔snake_case, and auto-refreshes on 401. See [docs/api/http-client.md](./docs/api/http-client.md).

**Standard async action (loading + error)** — canonical pattern; reuse verbatim:
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleAction() {
  setError(null);
  setLoading(true);
  try {
    await someApi();
    // navigate or update state on success
  } catch (err: any) {
    setError(err?.response?.data?.message ?? "Mensaje por defecto.");
  } finally {
    setLoading(false);
  }
}
```

## Commands

```bash
npm start          # Expo dev server (a=Android, i=iOS, w=web)
npm run android    # Android emulator/device
npm run ios        # iOS simulator
npm run web        # web (limited)
npm run lint       # eslint (no rules configured yet)
npm run typecheck  # tsc --noEmit ← minimum check before considering a change done
```

Environment: copy `.env.example` → `.env`, set `EXPO_PUBLIC_API_URL` (base without `/api`).
Per-platform host → [docs/api/http-client.md](./docs/api/http-client.md).
