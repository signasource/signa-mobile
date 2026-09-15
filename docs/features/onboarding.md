# Onboarding feature

> Responsibility: onboarding module scope and state.
> Update when: onboarding screens, data types, or progress logic change.
> Sources: src/features/onboarding/, src/features/tour/

## Pre-login onboarding (`src/features/onboarding/`)

Status: **real**. Module under `src/features/onboarding/` (`screens/`, `types.ts`, `storage.ts`).

- **6 screens**: `Welcome`, `Intro`, `DailyGoal`, `Experience`, `Motivation`, `Achievement`. Registered in `AuthNavigator` (pre-login).
- `Welcome` shows the **real app icon** (`@assets/images/icon.jpg`, the same file `app.json` ships as the launcher icon) in the top-left corner next to the "Signa" wordmark.
- `types.ts`: `OnboardingData`, `ExperienceLevel`, `DailyGoalMinutes`, `MotivationReason`, `ONBOARDING_TOTAL_STEPS` (used by the progress bar).
- `storage.ts`: persists the onboarding-completed flag in AsyncStorage.
- Progress bar is a fixed overlay of `AuthNavigator` (`Intro`→1 … `Motivation`→4). See [../navigation.md](../navigation.md).

Known gap: onboarding answers (daily goal, experience, motivation) are not persisted to the backend yet — no place to store them. See [../status.md](../status.md).

## Post-login tour (`src/features/tour/`)

Status: **real**. Three-part feature that runs after first login.

### A · Welcome tour (first login only)

A full-screen `Modal` (`TourOverlay`) mounted in `RootNavigator`, driven by `TourContext`.

- **Step 0** – Welcome modal: Lisa character greets the user. CTA: "Mostrame la app" / "Prefiero explorar solo".
- **Steps 1–6** – Coach marks: dark overlay with a spotlight cutout and a floating bubble card.
  - Step 1: Stats bar (racha, gemas, XP) on the Home screen.
  - Step 2: Current lesson card on the Home roadmap.
  - Steps 3–6: Tab bar icons (Práctica, Tienda, Social, Perfil) in order.
- **Step 7** – Closing: celebration card, "Tour completado", CTA to start first lesson or dismiss.

Trigger rules: once only, on first authenticated app open. Skippable via "Saltear". Replayable from Perfil → Configuración → Volver a ver el tour (calls `tourReplay()` from `useTour()`).

### B · Checklist de primeros pasos (Inicio screen)

`ChecklistCard` appears above the roadmap in `HomeTabScreen` after the tour completes, until all 4 items are done:

1. **Completá tu primera lección** — auto-checked when the roadmap returns any `COMPLETED` lesson.
2. **Probá la cámara en Práctica** — marked when the user starts any `PracticeSession` from `PracticeTabScreen`.
3. **Sumá tu primer amigo en Social** — marked when `sendRequest` succeeds in `SocialScreen`.
4. **Volvé mañana y hacé racha de 2 días** — auto-checked when `currentStreak >= 2`.

Tapping an uncompleted item navigates to the relevant screen. When all 4 are done the card celebrates and then removes itself from storage.

### C · Section welcome modals (first visit per tab)

`SectionWelcomeModal` (bottom sheet) shown once the first time each tab is opened:

- **Práctica** — rendered inside `PracticeTabScreen`, triggered via `useFocusEffect`.
- **Tienda** — rendered inside `StoreTabScreen`, triggered via `useFocusEffect`.
- **Social** — rendered inside `SocialScreen`, triggered via `useFocusEffect`.

At most one modal per session (`sessionModalShown` ref in `TourContext`).

### Storage keys (`src/features/tour/storage.ts`)

| Key | Purpose |
|---|---|
| `tour_completed` | Tour has been finished/skipped |
| `tour_checklist_dismissed` | Checklist has been hidden after all 4 done |
| `tour_cl_lesson` / `_practice` / `_friend` / `_streak` | Individual checklist item flags |
| `tour_tab_practice` / `_store` / `_social` | Section modal seen flags |
