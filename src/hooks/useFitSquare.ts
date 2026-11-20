import { useCallback, useState } from "react";
import { LayoutChangeEvent } from "react-native";

/**
 * Size for a square illustration that must fit the free space of a flex container.
 * Attach `onLayout` to that container; `size` is the largest square (capped at `max`,
 * never below `min`) that fits both its width and height. Before the first layout it is `max`.
 */
export function useFitSquare(max: number, min = 120, padding = 0) {
  const [size, setSize] = useState(max);
  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { width, height } = e.nativeEvent.layout;
      const fit = Math.floor(Math.min(width, height) - padding);
      setSize(Math.max(min, Math.min(max, fit)));
    },
    [max, min, padding],
  );
  return { size, onLayout };
}
