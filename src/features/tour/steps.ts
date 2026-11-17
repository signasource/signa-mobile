import { colors } from "@/theme";

/** Where the coach-mark popover prefers to sit relative to the highlighted element. */
export type TourSide = "above" | "below";

export type TourShape = "circle" | "rect";

/**
 * One coach mark. Steps are pure configuration (driver.js style): the engine in
 * `useTourSpot` brings `screen` to the front, finds `targetId`, and the overlay places the
 * popover from the measured element. Nothing here depends on pixel coordinates.
 */
export interface TourStepConfig {
  /** Tab that must be in front for the target to exist (a `TabParamList` route). */
  screen: "Home";
  /** Id registered with `useTourTarget`. */
  targetId: string;
  /** `circle` for icon-sized targets (tab bar), `rect` for cards and strips. */
  shape: TourShape;
  title: string;
  description: string;
  infoBox?: string;
  accentColor: string;
  preferredSide: TourSide;
  /** Lisa peeks over the popover when it sits above the target and there is room. */
  lisa?: "waving" | "arms";
}

/** Tour phases (`tourStep` in `TourContext`): 0 = welcome, 1..N = coach marks, N + 1 = closing. */
export const TOUR_WELCOME_STEP = 0;

export const TOUR_STEPS: readonly TourStepConfig[] = [
  {
    screen: "Home",
    targetId: "home-stats",
    shape: "rect",
    title: "Tus tres números",
    description:
      "La racha son tus días seguidos. Las gemas se usan en la Tienda. Las vidas se gastan cuando te equivocás en una lección.",
    infoBox:
      "Cada sección tiene su propia barra de números arriba. Siempre son los que importan en esa pantalla.",
    accentColor: colors.primary,
    preferredSide: "below",
  },
  {
    screen: "Home",
    targetId: "home-current-lesson",
    shape: "rect",
    title: "Tu próxima lección, siempre acá",
    description:
      "El recorrido va de abajo hacia arriba. Tocá Empezar en la lección que te toca. La ⓘ te dice qué señas vas a ver.",
    accentColor: colors.primary,
    preferredSide: "below",
  },
  {
    screen: "Home",
    targetId: "tab-Practice",
    shape: "circle",
    title: "Práctica libre, sin perder vidas",
    description:
      "Repasá lo que ya aprendiste: por ejercicio, por seña puntual o por tus errores — esa última opción también da XP.",
    accentColor: colors.courseTeal,
    preferredSide: "above",
    lisa: "arms",
  },
  {
    screen: "Home",
    targetId: "tab-Store",
    shape: "circle",
    title: "Gastá tus gemas acá",
    description:
      "Vidas, escudos para tu racha y potenciadores de XP. Arrancás con 100 gemas de regalo.",
    accentColor: colors.shopAmber,
    preferredSide: "above",
    lisa: "waving",
  },
  {
    screen: "Home",
    targetId: "tab-Social",
    shape: "circle",
    title: "No aprendas sola",
    description:
      "Agregá amigos y mirá su actividad en el feed. Ver que otros practican ayuda a no cortar la racha.",
    accentColor: colors.socialWine,
    preferredSide: "above",
    lisa: "arms",
  },
  {
    screen: "Home",
    targetId: "tab-Profile",
    shape: "circle",
    title: "Tu progreso y tus ajustes",
    description:
      "Arriba: racha, XP total y tu puesto en el ranking. Adentro: logros, inventario y meta diaria. ¿Te perdiste algo? Configuración → Volver a ver el tour.",
    accentColor: colors.primary,
    preferredSide: "above",
    lisa: "waving",
  },
];

export const TOUR_STEP_COUNT = TOUR_STEPS.length;
/** Phase number of the closing card. */
export const TOUR_CLOSING_STEP = TOUR_STEP_COUNT + 1;
