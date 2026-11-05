import { AppState, Platform } from "react-native";
import { API_URL } from "@/api/client";

/**
 * Lightweight client telemetry for signa-mobile: animation load latency, screen load times and
 * client/API errors. Batches events and posts them to signa-api `POST /telemetry/events` (public,
 * best-effort), which records bounded Micrometer metrics for the admin usage dashboard.
 *
 * Deliberately NOT routed through `apiClient`: no auth, no 401-refresh machinery, and snake_case on
 * the wire (the shared client would convert it, but telemetry stays independent). Errors are
 * swallowed, exactly like `useActivityTracker`.
 */
type WireEvent = {
  platform: string;
  type: "animation_load" | "screen_load" | "client_error" | "api_error";
  name?: string;
  value_ms?: number;
  status?: "ok" | "error";
};

const MAX_BATCH = 50;
const FLUSH_MS = 30_000;
const PLATFORM = Platform.OS === "ios" ? "ios" : "android";

let queue: WireEvent[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let started = false;

function scheduleFlush(): void {
  if (timer) return;
  timer = setTimeout(flush, FLUSH_MS);
}

function flush(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
  if (queue.length === 0) return;
  const events = queue.slice(0, MAX_BATCH);
  queue = queue.slice(MAX_BATCH);
  fetch(`${API_URL}/telemetry/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ events }),
  }).catch(() => {});
  if (queue.length > 0) scheduleFlush();
}

function enqueue(event: Omit<WireEvent, "platform">): void {
  queue.push({ platform: PLATFORM, ...event });
  scheduleFlush();
}

/** Time a sign animation (GLB) took to load, and whether it succeeded. */
export function trackAnimationLoad(success: boolean, valueMs: number): void {
  enqueue({
    type: "animation_load",
    value_ms: Math.max(0, Math.round(valueMs)),
    status: success ? "ok" : "error",
  });
}

/** Time a named screen took to become ready, in ms. */
export function trackScreenLoad(name: string, valueMs: number): void {
  enqueue({ type: "screen_load", name, value_ms: Math.max(0, Math.round(valueMs)) });
}

/** A failed API call, by HTTP status class. */
export function trackApiError(status: number): void {
  enqueue({
    type: "api_error",
    name: status >= 500 ? "http_5xx" : "http_4xx",
    status: "error",
  });
}

/** A client-side error, bucketed to a bounded category by the backend. */
export function trackClientError(category = "unknown"): void {
  enqueue({ type: "client_error", name: category, status: "error" });
}

/** Flushes pending telemetry when the app goes to the background. Idempotent. */
export function initTelemetry(): void {
  if (started) return;
  started = true;
  AppState.addEventListener("change", (state) => {
    if (state !== "active") flush();
  });
}
