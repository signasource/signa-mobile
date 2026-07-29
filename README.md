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
