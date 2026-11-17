import { useEffect, useState, type RefObject } from "react";
import type { View } from "react-native";
import type { NavigationContainerRef } from "@react-navigation/native";
import { useTour, type TourRect } from "./TourContext";
import type { TourStepConfig } from "./steps";

/**
 * - `searching`: bringing the screen to the front / waiting for the element to hold still.
 * - `ready`: `rect` is the element, in the overlay's own coordinate space.
 * - `missing`: the element never showed up (still loading, or not rendered): show the popover
 *   without a highlight rather than highlighting the wrong place. It upgrades to `ready` on its
 *   own if the element appears later.
 */
export type TourSpotStatus = "searching" | "ready" | "missing";

export interface TourSpotState {
  /** Step this state belongs to: a stale state from the previous step is never shown. */
  stepIndex: number;
  status: TourSpotStatus;
  rect: TourRect | null;
}

const SCREEN_TIMEOUT_MS = 3000;
const SEARCH_TIMEOUT_MS = 6000;
/** Consecutive identical samples needed before a position is trusted (covers animations and scrolls). */
const STABLE_SAMPLES = 3;
const SEARCH_POLL_MS = 80;
const TRACK_POLL_MS = 200;
const LOST_AFTER_MS = 1200;
const EPSILON = 0.75;

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

function near(a: TourRect, b: TourRect): boolean {
  return (
    Math.abs(a.x - b.x) < EPSILON &&
    Math.abs(a.y - b.y) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  );
}

function measureRoot(node: View | null): Promise<TourRect | null> {
  if (!node) return Promise.resolve(null);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), 400);
    node.measureInWindow((x, y, width, height) => {
      clearTimeout(timer);
      resolve(width > 0 && height > 0 ? { x, y, width, height } : null);
    });
  });
}

/**
 * Tour engine for one coach mark: locates the step's element and keeps its rectangle current.
 *
 * Why it is robust where a single measurement is not:
 * - It first brings the step's screen to the front and waits for it, so it never measures a
 *   screen that is hidden behind another one.
 * - The element's position is converted to the *overlay's own* coordinate space (both are
 *   measured in the window, then subtracted), so status bar, notch, edge-to-edge and any
 *   offset of the overlay container cancel out on every device.
 * - A position is only trusted after several identical samples (navigation transitions and
 *   scroll animations are still moving otherwise).
 * - While the step is active it keeps sampling, so rotation, font scale, keyboard, late data
 *   and re-layouts move the highlight with the element.
 */
export function useTourSpot({
  stepIndex,
  step,
  rootRef,
  navigationRef,
}: {
  stepIndex: number;
  /** `null` when the tour is not on a coach mark (nothing to locate). */
  step: TourStepConfig | null;
  rootRef: RefObject<View | null>;
  navigationRef: RefObject<NavigationContainerRef<any> | null>;
}): TourSpotState {
  const { measureTarget, revealTarget } = useTour();
  const [state, setState] = useState<TourSpotState>({
    stepIndex,
    status: "searching",
    rect: null,
  });

  useEffect(() => {
    if (!step) return;
    let cancelled = false;
    const emit = (status: TourSpotStatus, rect: TourRect | null) => {
      if (!cancelled) setState({ stepIndex, status, rect });
    };
    emit("searching", null);

    /** Navigates to the step's screen and waits until it is the one in front. */
    async function bringScreenToFront() {
      const deadline = Date.now() + SCREEN_TIMEOUT_MS;
      let lastNavigate = 0;
      while (!cancelled && Date.now() < deadline) {
        const nav = navigationRef.current;
        if (nav?.isReady()) {
          if (nav.getCurrentRoute()?.name === step!.screen) return;
          if (Date.now() - lastNavigate > 700) {
            lastNavigate = Date.now();
            nav.navigate("Tabs", { screen: step!.screen });
          }
        }
        await sleep(60);
      }
    }

    /** Reveal is best-effort and must never hang the engine. */
    const reveal = () =>
      Promise.race([revealTarget(step.targetId), sleep(700)]).then(() => undefined);

    /** The element in overlay coordinates, if it is on screen. `found` = it exists but may be off-screen. */
    async function sample(): Promise<{ found: boolean; rect: TourRect | null }> {
      const [target, root] = await Promise.all([
        measureTarget(step!.targetId),
        measureRoot(rootRef.current),
      ]);
      if (!target || !root) return { found: false, rect: null };
      const rect = { x: target.x - root.x, y: target.y - root.y, width: target.width, height: target.height };
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      const onScreen = cx >= 0 && cx <= root.width && cy >= 0 && cy <= root.height;
      return { found: true, rect: onScreen ? rect : null };
    }

    (async () => {
      await bringScreenToFront();
      if (cancelled) return;

      let status: TourSpotStatus = "searching";
      let committed: TourRect | null = null;
      let last: TourRect | null = null;
      let stable = 0;
      let wasFound = false;
      let lastReveal = 0;
      let lostSince: number | null = null;
      const startedAt = Date.now();

      while (!cancelled) {
        const { found, rect } = await sample();
        if (cancelled) return;
        const now = Date.now();

        // The element just mounted (e.g. data arrived) or is off-screen: ask it to scroll into view.
        if (found && (!wasFound || (!rect && now - lastReveal > 500))) {
          lastReveal = now;
          await reveal();
          if (cancelled) return;
        }
        wasFound = found;

        if (rect) {
          lostSince = null;
          stable = last && near(last, rect) ? stable + 1 : 0;
          last = rect;
          if (stable >= STABLE_SAMPLES - 1 && (!committed || !near(committed, rect))) {
            committed = rect;
            status = "ready";
            emit("ready", rect);
          }
        } else {
          stable = 0;
          last = null;
          if (status === "ready") {
            lostSince ??= now;
            if (now - lostSince > LOST_AFTER_MS) {
              status = "missing";
              committed = null;
              emit("missing", null);
            }
          }
        }

        if (status === "searching" && now - startedAt > SEARCH_TIMEOUT_MS) {
          status = "missing";
          emit("missing", null);
        }

        await sleep(status === "ready" ? TRACK_POLL_MS : SEARCH_POLL_MS);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [step, stepIndex, measureTarget, revealTarget, rootRef, navigationRef]);

  return state.stepIndex === stepIndex ? state : { stepIndex, status: "searching", rect: null };
}
