import type { TourRect } from "./TourContext";
import type { TourShape } from "./steps";

/** Highlight cutout in overlay coordinates. */
export interface Spot {
  x: number;
  y: number;
  width: number;
  height: number;
  circular: boolean;
  radius: number;
}

export type BubbleSide = "above" | "below" | "center";

export interface BubblePlacement {
  side: BubbleSide;
  top: number;
  /** Whether the arrow still touches the highlight (false when the bubble had to overlap it). */
  showArrow: boolean;
}

/** Space reserved at the top for the "Saltear" button. */
export const SKIP_ROW_HEIGHT = 56;
const EDGE = 4;
const MARGIN = 12;
const GAP = 14;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(v, max));

/**
 * Turns a measured element into the cutout: a little breathing room around it, a circle for
 * icon-sized targets, and always fully inside the overlay (a target half scrolled off-screen
 * still gets a visible highlight).
 */
export function spotFromRect(
  rect: TourRect,
  shape: TourShape,
  bounds: { width: number; height: number },
): Spot {
  let { x, y, width, height } = rect;
  const circular = shape === "circle";
  if (circular) {
    const d = Math.max(width, height) + 28;
    x = x + width / 2 - d / 2;
    y = y + height / 2 - d / 2;
    width = d;
    height = d;
  } else {
    const pad = 6;
    x -= pad;
    y -= pad;
    width += pad * 2;
    height += pad * 2;
  }
  width = Math.min(width, bounds.width - EDGE * 2);
  height = Math.min(height, bounds.height - EDGE * 2);
  x = clamp(x, EDGE, bounds.width - width - EDGE);
  y = clamp(y, EDGE, bounds.height - height - EDGE);
  return { x, y, width, height, circular, radius: circular ? width / 2 : Math.min(16, height / 2) };
}

/**
 * Picks the side of the highlight with room for the popover (preferred side first, flipping
 * when it doesn't fit) and keeps it inside the safe area on any screen size.
 */
export function placeBubble({
  spot,
  preferred,
  bubbleHeight,
  height,
  insetTop,
  insetBottom,
}: {
  spot: Spot | null;
  preferred: "above" | "below";
  bubbleHeight: number;
  height: number;
  insetTop: number;
  insetBottom: number;
}): BubblePlacement {
  const minTop = insetTop + SKIP_ROW_HEIGHT;
  const maxBottom = height - insetBottom - MARGIN;
  const h = Math.min(bubbleHeight, Math.max(0, maxBottom - minTop));

  if (!spot) {
    return { side: "center", top: minTop + (maxBottom - minTop - h) / 2, showArrow: false };
  }

  const spaceAbove = spot.y - GAP - minTop;
  const spaceBelow = maxBottom - (spot.y + spot.height + GAP);
  const fits = (side: "above" | "below") => (side === "above" ? spaceAbove : spaceBelow) >= h;
  const other = preferred === "above" ? "below" : "above";

  let side: "above" | "below" = preferred;
  if (!fits(preferred)) {
    side = fits(other) ? other : spaceAbove >= spaceBelow ? "above" : "below";
  }

  const rawTop = side === "below" ? spot.y + spot.height + GAP : spot.y - GAP - h;
  const top = clamp(rawTop, minTop, Math.max(minTop, maxBottom - h));
  const showArrow = side === "below" ? top >= spot.y + spot.height : top + h <= spot.y;
  return { side, top, showArrow };
}
