<!--
última actualización: 2026-07-29
mantener al: convertir algo de stub a real, resolver deuda técnica o agregar deuda/próximos pasos conocidos.
-->

# Estado y roadmap

Foto de qué es **real** vs **stub/placeholder** hoy, y la deuda técnica conocida. Mantener este
doc al día es clave para no confundir un placeholder con algo funcionando.

## Qué está real vs pendiente

| Área | Estado | Nota |
|---|---|---|
| Auth (login/registro/verify/forgot/reset/change) | ✅ real | contra `signa-api` |
| Sesión + refresh de tokens | ✅ real | `AuthContext` + interceptor 401 |
| Onboarding (6 pantallas + progreso) | ✅ real | respuestas aún no se persisten en backend |
| Theming (paleta + tipografías) | ✅ real | tokens legacy a deprecar |
| Test de conexión | ✅ real | pantalla provisoria de diagnóstico |
| Perfil de usuario | 🟡 parcial | sale del JWT + cache local (falta `GET /users/me`) |
| Courses (cursos/lecciones) | 🟡 stub | front listo, endpoints tentativos, back sin implementar |
| ML (reconocimiento de señas) | 🔴 placeholder | sin cámara ni runtime; requiere dev build |

## Deuda técnica conocida

- **Perfil depende del JWT + cache local.** El back no expone `GET /users/me`; el nombre se
  cachea en AsyncStorage al registrarse en el dispositivo. En otro dispositivo se muestra el
  email. Ver [`api-y-datos.md`](./api-y-datos.md) y [`auth.md`](./auth.md).
- **Tokens de verificación/reset se pegan a mano.** No hay **deep linking**: el usuario copia el
  token del email en la pantalla correspondiente.
- **Endpoints de `courses` son tentativos** (`features/courses/api.ts`), no confirmados con el back.
- **ML bloqueado por Expo Go:** cámara + TFLite/ONNX requieren dev build (`expo-dev-client`/EAS).
  Decisión de equipo pendiente. Ver `src/features/ml/README.md`.
- **Sin config propia de ESLint/Prettier.** `npm run lint` corre eslint sin reglas configuradas;
  no hay `.eslintrc`/`.prettierrc`. La verificación real hoy es `npm run typecheck` (tsc strict).
- **Tokens legacy en `theme`** (`accent`, `morado`, `azulOscuro`, `headingSemiBold`, …): siguen en
  uso en `AppNavigator` y pantallas viejas; a migrar a los tokens vigentes.
- **CI:** el pipeline real es **GitHub Actions** (`.github/workflows/release.yml`,
  semantic-release en push a `master`). No existe pipeline de GitLab.

## Próximos pasos (del README + hallazgos)

- [ ] `GET /users/me` (o equivalente) para dejar de depender del JWT decodificado para el perfil.
- [ ] Deep linking para verificación de email y reset de contraseña.
- [ ] Confirmar y conectar endpoints reales de `courses`; completar `LessonScreen`.
- [ ] Decidir stack de cámara + runtime de ML y migrar a dev build.
- [ ] Persistir las respuestas del onboarding cuando exista dónde guardarlas.
- [ ] (Opcional) Configurar ESLint/Prettier.
