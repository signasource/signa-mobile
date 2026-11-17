# Onboarding feature

> Responsibility: onboarding module scope and state.
> Update when: onboarding screens, data types, or progress logic change.
> Sources: src/features/onboarding/, src/features/tour/, src/features/challenges/

## Pre-login onboarding (`src/features/onboarding/`)

Status: **real**. Module under `src/features/onboarding/` (`screens/`, `types.ts`, `storage.ts`).

- **6 screens**: `Welcome`, `Intro`, `DailyGoal`, `Experience`, `Motivation`, `Achievement`. Registered in `AuthNavigator` (pre-login).
- `Welcome` shows the **real app icon** (`@assets/images/icon.png`, the same file `app.json` ships as the launcher icon (1024×1024 PNG; Android adaptive icon = `adaptive-icon.png` foreground, transparent, hand inside the 66% safe zone, over `#F7F7F7`)) in the top-left corner next to the "Signa" wordmark.
- `types.ts`: `OnboardingData`, `ExperienceLevel`, `DailyGoalMinutes`, `MotivationReason`, `ONBOARDING_TOTAL_STEPS` (used by the progress bar).
- `storage.ts`: persists the onboarding-completed flag in AsyncStorage.
- Progress bar is a fixed overlay of `AuthNavigator` (`Intro`→1 … `Motivation`→4). See [../navigation.md](../navigation.md).

The **daily goal** is kept in AsyncStorage until there is an account, then sent as `dailyGoalMinutes` in `POST /auth/register` and `POST /auth/google` (read/cleared by `AuthContext`). The backend applies it only when the call creates the account, so a returning Google user keeps their goal; email login discards it without sending it. Known gap: experience and motivation answers are not persisted to the backend — no place to store them. See [../status.md](../status.md).

## Post-login tour (`src/features/tour/`)

Status: **real**. Three-part feature that runs after first login (the first-steps checklist is now the first set of daily challenges).

### A · Welcome tour (first login only)

`TourOverlay` is an absolutely-positioned `View` (not a `Modal`) rendered as the last child of the root box in `RootNavigator`, driven by `TourContext`. driver.js was ruled out: it is a DOM library and does not run in React Native; the tour is native but modelled on it (steps as configuration, highlight + popover).

- **Step 0** – Welcome card: Lisa greets the user. CTA: "Mostrame la app" / "Prefiero explorar solo".
- **Steps 1–6** – Coach marks (`TOUR_STEPS` in `steps.ts`): dark scrim with a cutout and a popover.
  - Step 1: Stats bar (racha, gemas, vidas) on the Home screen.
  - Step 2: Current lesson card on the Home roadmap.
  - Steps 3–6: Tab bar icons (Práctica, Tienda, Social, Perfil) in order.
- **Step `TOUR_CLOSING_STEP`** (7) – Closing: celebration card, "Tour completado", CTA to start first lesson or dismiss.

**Steps are data.** `src/features/tour/steps.ts` holds each step's `screen`, `targetId`, `shape` (`circle` for icons, `rect` otherwise), copy, accent and `preferredSide`. No coordinates anywhere. A new spotlighted element needs a `useTourTarget(id)` in its screen plus a `TourStepConfig`; the step count and dots follow `TOUR_STEPS.length`.

**How the highlight stays on target** (`useTourSpot.ts`, `placement.ts`):
1. *Screen first.* Before measuring, the engine navigates to `Tabs → step.screen` and waits until `navigationRef.getCurrentRoute()` is that screen, so it never measures a hidden screen (this was the "highlight of another screen" bug).
2. *Overlay's own coordinate space.* Target and overlay root are both measured with `measureInWindow` and subtracted; status bar, notch, edge-to-edge and any container offset cancel out on every device.
3. *Settle, then show.* A position is trusted only after 3 identical samples (navigation and scroll animations are still moving otherwise). While searching the screen is fully dark, so the hole never jumps. The target's optional `reveal` (e.g. scrolling the roadmap, proportional to screen height) is re-requested if the element mounts late or is off-screen.
4. *Keeps tracking.* While the step is active it re-samples every 200 ms, so rotation, font scale and late layout move the highlight with the element.
5. *No guessing.* If the element never appears (e.g. roadmap still loading, >6 s) the popover is shown centered **without** a highlight, and upgrades to a real highlight if the element shows up later.
6. *Adaptive popover.* The popover is measured, then placed on the side of the highlight with room (flipping from `preferredSide` when it doesn't fit), clamped to the safe area; long copy scrolls inside it while the buttons stay visible. Lisa only appears when there is room above the popover.

Targets: `home-stats` (`ScreenHeader` `statsRef`), `home-current-lesson` (current lesson card), `tab-Home|Practice|Store|Social|Profile` (`TabBarIcon` in `TabNavigator`). Android back = skip.

Trigger rules: once only, on first authenticated app open. Skippable via "Saltear". Replayable from Perfil → Configuración → Volver a ver el tour (`ConfigurationScreen` calls `tourReplay()` from `useTour()`).

### B · Primeros pasos (Inicio screen)

No longer a local checklist: the four steps are the **first set of daily challenges**, tracked and paid in gems by `signa-api`, and shown by `ChallengesCard` above the roadmap (hidden while the tour runs). Once all four are claimed the card switches to the daily challenges. Steps, rewards and rules → [challenges.md](./challenges.md).

### C · Section welcome modals (first visit per tab)

`SectionWelcomeModal` (bottom sheet) shown once the first time each tab is opened:

- **Práctica** — rendered inside `PracticeTabScreen`, triggered via `useFocusEffect`.
- **Tienda** — rendered inside `StoreTabScreen`, triggered via `useFocusEffect`.
- **Social** — rendered inside `SocialScreen`, triggered via `useFocusEffect`.

At most one modal per session (`sessionModalShown` ref in `TourContext`). A section modal only appears **on its own tab**: `showSectionModal(tab, isStillFocused)` re-checks focus after the async "already seen?" lookup, never fires while the welcome tour is visible, and each screen renders it with `visible={flag && isFocused}` so it can't show over another tab.

### Storage keys (`src/features/tour/storage.ts`)

| Key | Purpose |
|---|---|
| `tour_completed` | Tour has been finished/skipped |
| `tour_tab_practice` / `_store` / `_social` | Section modal seen flags |
