# Onboarding feature

> Responsibility: onboarding module scope and state.
> Update when: onboarding screens, data types, or progress logic change.
> Sources: src/features/onboarding/

Status: **real**. Module under `src/features/onboarding/` (`screens/`, `types.ts`, `storage.ts`).

- **6 screens**: `Welcome`, `Intro`, `DailyGoal`, `Experience`, `Motivation`, `Achievement`. Registered in `AuthNavigator` (pre-login).
- `Welcome` shows the **real app icon** (`@assets/images/icon.jpg`, the same file `app.json` ships as the launcher icon) in the top-left corner next to the "Signa" wordmark.
- `types.ts`: `OnboardingData`, `ExperienceLevel`, `DailyGoalMinutes`, `MotivationReason`, `ONBOARDING_TOTAL_STEPS` (used by the progress bar).
- `storage.ts`: persists the onboarding-completed flag in AsyncStorage.
- Progress bar is a fixed overlay of `AuthNavigator` (`Intro`→1 … `Motivation`→4). See [../navigation.md](../navigation.md).

Known gap: onboarding answers (daily goal, experience, motivation) are not persisted to the backend yet — no place to store them. See [../status.md](../status.md).
