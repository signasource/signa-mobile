import { useEffect, useRef } from "react";
import type { View } from "react-native";
import { useTour } from "./TourContext";

/**
 * Marks an element as something the welcome tour can spotlight. Attach the returned ref
 * to the element (with `collapsable={false}` so Android keeps a native view for it).
 * The overlay measures the real position, so the spotlight follows the layout on any
 * screen size instead of relying on hardcoded coordinates.
 */
export function useTourTarget(id: string, reveal?: () => void | Promise<void>) {
  const { registerTarget } = useTour();
  const ref = useRef<View>(null);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;

  useEffect(
    () => registerTarget(id, { ref, reveal: () => revealRef.current?.() }),
    [id, registerTarget],
  );

  return ref;
}
