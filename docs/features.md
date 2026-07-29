<!--
última actualización: 2026-07-29
mantener al: avanzar una feature, cambiar su estado real↔stub, o agregar/quitar pantallas de una feature.
-->

# Features

Los módulos de dominio viven en `src/features/<dominio>/` con su propia `screens/`, `types.ts` y
(cuando aplica) `api.ts`. Estado actual de cada uno:

## onboarding — ✅ real

`src/features/onboarding/`

- **6 pantallas** (`screens/`): `Welcome`, `Intro`, `DailyGoal`, `Experience`, `Motivation`,
  `Achievement`. Registradas en `AuthNavigator` (previas al login).
- `types.ts`: `OnboardingData`, `ExperienceLevel`, `DailyGoalMinutes`, `MotivationReason`,
  y `ONBOARDING_TOTAL_STEPS` (usado por la barra de progreso).
- `storage.ts`: persiste en AsyncStorage si el onboarding fue completado.
- La barra de progreso es un overlay fijo del `AuthNavigator` (pasos `Intro`→1 … `Motivation`→4).
  Ver [`navegacion.md`](./navegacion.md).

**Pendiente típico:** conectar las respuestas del onboarding (meta diaria, experiencia,
motivación) con el backend/perfil cuando exista dónde guardarlas.

## courses — 🟡 stub (front listo, backend pendiente)

`src/features/courses/`

- `screens/CoursesListScreen.tsx`: ya intenta pegarle a `GET /courses` (muestra loading → error
  hasta que el endpoint exista).
- `screens/LessonScreen.tsx`: placeholder del reproductor de una lección; recibe
  `{ courseId, lessonId }` por params.
- `types.ts`: `Course`, `Lesson`, `LessonBlock`, `LessonProgress`.
- `api.ts`: **STUB** — paths tentativos (`/courses`, `/courses/{id}`,
  `/courses/{courseId}/lessons/{lessonId}`). El back **no** tiene endpoints de contenido todavía.

**Para avanzar:** confirmar los endpoints reales con `signa-api`, ajustar `api.ts` y `types.ts`, y
completar el render de `LessonScreen` según la estructura real de bloques.

## ml — 🔴 placeholder (reconocimiento de señas por cámara)

`src/features/ml/`

- `screens/SignRecognitionScreen.tsx`: placeholder, **sin cámara ni runtime de ML instalados**.
- `types.ts`: `SignRecognitionResult`, `SignRecognitionSessionState` (tentativos).
- `README.md`: puntos de decisión pendientes (librería de cámara, runtime TFLite/ONNX).

**Bloqueante conocido:** `react-native-vision-camera` y cualquier runtime de ML requieren **salir
de Expo Go** y pasar a un **dev build** (`expo-dev-client` / EAS Build), lo que afecta el flujo de
todo el equipo. Decidir eso antes de implementar en serio.

## Cómo agregar una feature nueva

1. Crear `src/features/<dominio>/` con `screens/`, `types.ts` y `api.ts` si consume backend.
2. Registrar sus pantallas en el navigator correspondiente (normalmente `AppNavigator`).
3. Reutilizar primitivas de `@/components` y tokens de `@/theme`.
4. Documentar el estado (real/stub) acá y en [`estado-y-roadmap.md`](./estado-y-roadmap.md).
