# signa-mobile

React Native (Expo + TypeScript) scaffold connecting Signa's mobile frontend — an app for
learning Argentine Sign Language (LSA) with camera recognition — to the `signa-api` backend
(Spring Boot). Solved: auth, session, navigation, theming, onboarding. Reserved: courses (stub)
and ML (placeholder).

Developed with Claude Code / Claude Design. The knowledge base is the source of truth:

- Development rules and entry point → [`CLAUDE.md`](./CLAUDE.md)
- Detailed docs → [`docs/README.md`](./docs/README.md)

## Requirements

- Node.js 20+
- npm
- Expo Go on a device, or an Android/iOS emulator (a dev build is required once native camera/ML is added)

## Setup

```bash
npm install
cp .env.example .env
```

Set `EXPO_PUBLIC_API_URL` in `.env` to your local `signa-api` (base **without `/api`**).
Per-platform host → [`docs/api/http-client.md`](./docs/api/http-client.md).

## Run

```bash
npm start   # then: a=Android, i=iOS, w=web
```

Scan the QR with Expo Go (Android) or the Camera app (iOS).

## Run with Google sign-in

Google sign-in uses a native module, so it does **not** work in Expo Go: you need a dev build.

1. `.env` must have `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (the "Web application" client ID, same value as `GOOGLE_CLIENT_ID` in `signa-api`).
2. Build the dev client once (and again whenever a native dependency changes), then install the APK on the device:
   ```bash
   npx eas-cli build --profile development --platform android
   ```
3. Start Metro for the dev client and open the app from the installed build:
   ```bash
   npx expo start --dev-client -c
   ```

Google only accepts the build if its signing key's SHA-1 is registered on an "Android" OAuth client (package `com.signasource.signamobile`) in the same Google Cloud project; otherwise sign-in fails with `DEVELOPER_ERROR`. Get the SHA-1 with `npx eas-cli credentials`. Setup details → [`docs/status.md`](./docs/status.md) ("Google sign-in setup pending").

---

# Instalar EAS CLI globalmente
npm install -g eas-cli

# Login en Expo
eas login

# Configurar el proyecto (solo la primera vez)
eas build:configure

# Generar APK de desarrollo/prueba
eas build --platform android --profile preview

