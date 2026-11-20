# Profile (Perfil, Configuración, Editar perfil)

> Responsibility: the Perfil tab, Configuración and Editar perfil — what each loads, shows and persists.
> Update when: a profile section, a setting, or what these screens read/write changes.
> Sources: src/screens/ProfileScreen.tsx, src/screens/ConfigurationScreen.tsx, src/screens/EditProfileScreen.tsx, src/features/profile/avatarPhoto.ts, src/context/SettingsContext.tsx, src/hooks/useHaptics.ts, src/theme/headerColors.ts

**Real**, wired to `signa-api`. Endpoints → [../api/endpoints.md](../api/endpoints.md). Another user's
read-only profile is a different screen: see [social.md](./social.md#publicprofilescreen).

## `ProfileScreen` (tab `Profile`)

Header: `ScreenHeader` tinted with the user's own `profileHeaderColor`, three stats (**Racha**,
**XP total**, **Ranking** = `#weeklyRank` or "—", all from `GET /users/me/stats`), a round avatar
(`AvatarPhoto`, initials underneath), the `VerifyEmailChip` while `GET /users/me` reports
`verified === false`, and a settings button → `Configuration`. The header colour can also be picked
from here (`applyHeaderColor`: optimistic, saved with `updateSettings`).

`loadProfile()` fires **ten requests in parallel** with `Promise.allSettled` — one failing never
blanks the screen: `usersApi.getMe`, `getWeeklyXp`, `getDailyGoal`, `getStats`, `inventoryApi.getMyInventory`,
`achievementsApi.getAchievements(true|false)`, `learningApi.getProgress`, `usersApi.getSettings`,
`boostersApi.getStored`. It re-runs silently on every focus (lessons change XP, streak, lives and
achievements while this tab stays mounted) and on pull-to-refresh. The name falls back to the JWT
cache (`user.name`) when `getMe` fails.

A `SegmentedControl` (text-only) switches between four sections:

| Section | Content |
|---|---|
| **General** | stat cards (XP total, señas aprendidas), the weekly-XP bar chart (tap a day), and the **daily goal** (minutes done today vs. `dailyGoalMinutes`, editable with `usersApi.updateDailyGoal`; `minutesToday` is fed by `useActivityTracker` while a lesson is open) |
| **Cursos** | progress per enrolled course (`PublicCourseProgress`) and a **"Para sumar"** block with the paid courses not owned yet (`PaidCourseRow` `dashed` → `CourseDetail`; see [courses.md](./courses.md#buying-a-paid-course--real)) |
| **Inventario** | gems, lives (`useLives` + `LivesTimerChip`; "Comprar vida" → Store tab), streak shields, and the **stored boosters** (`GET /boosters`) with "Usar"/"Activar" → `POST /boosters/{type}/activate`; active XP multiplier / unlimited lives show their remaining time (`useSecondsLeft`) |
| **Logros** | achievements split *Conseguidos / Bloqueados* (`SubTabs`), 3-column grid sized by percentage, a detail modal per achievement; earned streak achievements use the tier medal ([achievements.md](./achievements.md)) |

### Profile photo

Tapping the avatar opens a sheet (take / choose / remove; errors show inside it). `pickAvatar(source)`
(`features/profile/avatarPhoto.ts`) asks for the camera permission only for "take" (the library uses
the system picker), crops the image square, resizes it to 256 px and encodes a JPEG data URL
(quality 0.8, ~15–25 KB). `usersApi.setAvatar` / `removeAvatar` upload it; the response carries the
new `avatarUrl`. Needs a build with `expo-image-picker` and `expo-image-manipulator`.

## `ConfigurationScreen` (route `Configuration`)

Header tinted like Perfil; the **Color del encabezado** row opens the picker of the 30 `headerColors`. The screen loads `getSettings()` + `getMe()` on mount and
every row saves immediately with `saveSetting(patch)` → `PATCH /users/settings` (partial).

| Section | Rows |
|---|---|
| **Preferencias** | *Tamaño de fuente* (Pequeño / Mediano / Grande → `SettingsContext`: scale 14/15, 1, 17/15, applied by `@/components/Text` everywhere), *Vibración* (`vibrationEnabled`, read by `useHaptics`), *Visibilidad de la cuenta* (`PUBLIC` / `PRIVATE`: a private account only shows identity to non-friends, see [social.md](./social.md#publicprofilescreen)), *Color del encabezado* |
| **Notificaciones** | *Notificaciones* (master switch), *Recordatorio diario* (`dailyNotificationEnabled`) and *Hora del recordatorio* (`dailyNotificationTime`, wheel picker; drafts go through a ref so the effect doesn't re-run) |
| **Cuenta** | *Editar perfil* → `EditProfile`, *Verificar cuenta* (only while unverified) → `VerifyEmail`, *Volver a ver el tour* (`tourReplay()`), *Cuenta de Google* (link, see [../authentication/screens.md](../authentication/screens.md)), *Cambiar contraseña* (hidden for Google-only accounts; passes `passwordChanged` back as a param), *Cerrar sesión*, *Eliminar cuenta* |

Both **logout** and **delete account** confirm in a dialog and call `logout(unregisterPushToken)`, so
the backend drops the FCM token while the session is still valid; delete first calls
`usersApi.deleteMe()` (`DELETE /users/me`) and logs out even if that call fails.

`SettingsContext` (provider in `App.tsx`, above `AuthProvider`) holds `fontSizeId` / `fontScale` /
`vibrationEnabled`; `AppNavigator` calls `loadFontSize()` on mount to hydrate them from
`GET /users/settings`.

The footer prints the app version from `Constants.expoConfig.version` (`expo-constants`, i.e. `app.json`).

## `EditProfileScreen` (route `EditProfile`)

Receives `{ displayName, lastName, username }`, validates with `@/utils/validation` (live username
availability through `useUsernameAvailability`, skipped while unchanged) and saves with
`usersApi.updateProfile` (`PATCH /users/me`; 409 = username taken). On success it navigates back to
`Configuration` with `updatedProfile` so the previous screen updates without a refetch.
