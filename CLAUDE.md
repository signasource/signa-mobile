# CLAUDE.md — guía para desarrollar signa-mobile con IA

Este archivo es la fuente de contexto para **Claude** y **Claude Design**. Está pensado para
poder desarrollar el frontend con la **mínima revisión de código posible**: si seguís lo que
está acá y en `/docs`, no hace falta releer todo el repo en cada tarea.

> ⚠️ **Regla de oro:** esta documentación es parte del código. Se mantiene **en el mismo commit**
> que el cambio que la afecta. Ver [§ Mantener la documentación](#5-mantener-la-documentación).

---

## 1. Qué es el proyecto

`signa-mobile` es un scaffold **React Native (Expo 54 + TypeScript strict)** para la app de
Signa (aprendizaje de Lengua de Señas Argentina con reconocimiento por cámara). Se conecta con
el backend `signa-api` (Spring Boot). Hoy tiene resuelto **auth + navegación + theming +
onboarding**, y deja reservados los lugares para **cursos** (stub) y **ML** (placeholder).

- Contexto para usuarios/humanos que arrancan el repo → [`README.md`](./README.md).
- Detalle de implementación por área → carpeta [`/docs`](./docs/README.md).

---

## 2. Cómo trabajar acá (reglas para la IA)

Estas son las convenciones que hacen que el código nuevo se vea como el existente. Respetalas
salvo que el usuario pida lo contrario.

**Lenguaje y tipos**
- Todo en **TypeScript strict**. Sin `any` en APIs públicas (props, tipos exportados, retornos).
- Importá siempre con el alias **`@/` → `src/`** (definido en `babel.config.js` y `tsconfig.json`).
  Ej: `import { colors } from "@/theme"`. No uses rutas relativas largas (`../../..`).
- Español para textos de UI, comentarios y docs. Nombres de código en inglés (como ya está).

**Estilos y diseño**
- Estilos con **`StyleSheet.create()`** al final del archivo. No styled-components, no CSS-in-JS.
- **Nunca** hardcodees colores hex ni nombres de fuente: usá tokens de `@/theme`
  (`colors.*`, `fonts.*`, `fontSizes.*`).
- Los tokens **legacy** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, etc.) existen solo
  para pantallas viejas. **No los uses en pantallas nuevas** — usá los tokens vigentes.
- Detalle completo de paleta, tipografía y primitivas → [`docs/design-system.md`](./docs/design-system.md).

**Componentes y pantallas**
- **Reutilizá primitivas existentes** antes de crear nuevas:
  - Genéricas: `@/components/{Button,Input,Card,BackButton,FieldIcon,SignaLogo}`.
  - De auth: `@/components/auth/*` (`AuthScreen`, `AuthField`, `PrimaryButton`,
    `SecondaryButton`, `AuthHeading`, `AuthIconBadge`, `PasswordChecklist`, `StatusText`…).
- Toda pantalla de **auth u onboarding** se monta dentro de `AuthScreen` (maneja safe area,
  teclado, scroll y back).
- Tipá las pantallas con `NativeStackScreenProps<ParamList, "RouteName">`.
- Para agregar una pantalla nueva: crearla, registrarla en el navigator correspondiente y
  agregar su ruta al `ParamList`. Ver [`docs/navegacion.md`](./docs/navegacion.md).

**Estado y datos**
- Estado global: solo **Context API** (`AuthContext` vía `useAuth()`). No hay Redux/Zustand;
  no agregues uno sin pedirlo.
- Estado local de pantalla: `useState`. Validación con `@/utils/validation.ts` (no hay librería
  de forms).
- **Toda llamada HTTP va por `@/api/*`** (`authApi`, `usersApi`, …), nunca `axios` directo:
  el cliente (`@/api/client.ts`) inyecta el Bearer token, convierte camelCase↔snake_case y hace
  refresh automático ante un 401. Ver [`docs/api-y-datos.md`](./docs/api-y-datos.md).

**Patrón estándar de acción async (loading + error)**
```tsx
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

async function handleAction() {
  setError(null);
  setLoading(true);
  try {
    await someApi();
    // navegar o actualizar estado en éxito
  } catch (err: any) {
    setError(err?.response?.data?.message ?? "Mensaje por defecto.");
  } finally {
    setLoading(false);
  }
}
```

---

## 3. Mapa del repo

```
signa-mobile/
├── App.tsx                  # carga de fuentes → SafeAreaProvider → AuthProvider → RootNavigator
├── src/
│   ├── api/                 # capa HTTP con signa-api (Axios + interceptores)  → docs/api-y-datos.md
│   ├── context/             # AuthContext: estado global de sesión             → docs/auth.md
│   ├── navigation/          # Root / Auth / App navigators (native-stack)      → docs/navegacion.md
│   ├── screens/             # pantallas transversales (auth/, Home, Profile, ChangePassword, ConnectionTest)
│   ├── features/            # módulos por feature                              → docs/features.md
│   │   ├── onboarding/      #   real: 6 pantallas + storage de progreso
│   │   ├── courses/         #   stub: endpoints tentativos, back sin implementar
│   │   └── ml/              #   placeholder: sin cámara ni runtime de ML
│   ├── components/          # primitivas de UI (genéricas y auth/)             → docs/design-system.md
│   ├── theme/               # colors, typography, fontSizes                    → docs/design-system.md
│   ├── types/               # DTOs espejados del backend
│   └── utils/               # validation, storage, jwt, caseConverter, profileCache
├── docs/                    # documentación detallada (mantener al día)        → docs/README.md
└── CLAUDE.md                # este archivo
```

Estructura general y flujo de arranque → [`docs/arquitectura.md`](./docs/arquitectura.md).

---

## 4. Comandos

```bash
npm start          # Expo dev server (a=Android, i=iOS, w=web)
npm run android    # abrir en emulador/dispositivo Android
npm run ios        # abrir en simulador iOS
npm run web        # web (soporte limitado)
npm run lint       # eslint (sin config propia hoy)
npm run typecheck  # tsc --noEmit  ← verificación mínima antes de dar por hecho un cambio
```

**Entorno:** copiar `.env.example` → `.env` y setear `EXPO_PUBLIC_API_URL` con la URL de
`signa-api` (base **sin `/api`**). En **emulador Android** usar `http://10.0.2.2:8080` en vez de
`localhost`; en simulador iOS `localhost` funciona; en dispositivo físico, la IP local de la PC.

---

## 5. Mantener la documentación

Cuando tu cambio toca una de estas cosas, **actualizá el doc en el mismo commit**:

| Si tu cambio… | Actualizá |
|---|---|
| Agrega/renombra una pantalla o ruta | `docs/navegacion.md` |
| Agrega/cambia un endpoint, tipo DTO o el cliente HTTP | `docs/api-y-datos.md` |
| Toca el flujo de sesión/login/validación | `docs/auth.md` |
| Agrega/cambia un color, fuente, `fontSize` o una primitiva de UI | `docs/design-system.md` |
| Avanza una feature (onboarding/courses/ml) o cambia su estado real↔stub | `docs/features.md` y `docs/estado-y-roadmap.md` |
| Cambia estructura de carpetas, alias o arranque de la app | `docs/arquitectura.md` |
| Convierte algo de stub a real, o suma deuda técnica conocida | `docs/estado-y-roadmap.md` |

Si creás una convención nueva que otros deberían seguir, agregala a [§2](#2-cómo-trabajar-acá-reglas-para-la-ia).
