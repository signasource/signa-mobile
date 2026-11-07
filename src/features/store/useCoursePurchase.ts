import { useCallback, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { courseOrdersApi, CourseOrder } from "@/api/courseOrders";
import { CourseSummary } from "@/features/courses/api";

export type CoursePurchaseStatus = "idle" | "buying" | "checking" | "pending" | "error";

interface Options {
  /** Called once the backend confirmed the payment and granted access to the course. */
  onPurchased: (order: CourseOrder) => void;
}

/** Deep link the API's return page hands the browser back to (`scheme` in app.json). */
const RETURN_URL = "signa://store";
const SYNC_ATTEMPTS = 4;
const SYNC_DELAY_MS = 2500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Buying permanent access to a paid course with real money through Mercado Pago Checkout Pro.
 *
 * Flow: `buy(course)` → `POST /store/course-orders` → checkout opened in an in-app browser → when
 * it closes, `POST /store/course-orders/{id}/sync` (the server re-reads the order from Mercado Pago
 * and grants access once). Access is never granted client-side. If the payment is still in process
 * the webhook grants it later, and screens refetch their enrollments on focus.
 */
export function useCoursePurchase({ onPurchased }: Options) {
  const [status, setStatus] = useState<CoursePurchaseStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [buyingCourseId, setBuyingCourseId] = useState<string | null>(null);
  const onPurchasedRef = useRef(onPurchased);
  onPurchasedRef.current = onPurchased;

  /** Asks the backend about an order, a few times: Mercado Pago can take seconds to approve. */
  const checkOrder = useCallback(async (orderId: string) => {
    setStatus("checking");
    for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt++) {
      const { data } = await courseOrdersApi.syncOrder(orderId);
      if (data.status === "PAID" || data.owned) {
        onPurchasedRef.current(data);
        setStatus("idle");
        return;
      }
      if (attempt < SYNC_ATTEMPTS - 1) await wait(SYNC_DELAY_MS);
    }
    setStatus("pending");
  }, []);

  const buy = useCallback(
    async (course: CourseSummary) => {
      setError(null);
      setBuyingCourseId(course.id);
      setStatus("buying");
      try {
        const { data } = await courseOrdersApi.createOrder(course.id);
        await WebBrowser.openAuthSessionAsync(data.checkoutUrl, RETURN_URL);
        // Whether the browser returned or was closed, the user may have paid: ask the server.
        await checkOrder(data.orderId);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "No pudimos completar la compra. Probá de nuevo.");
        setStatus("error");
      } finally {
        setBuyingCourseId(null);
      }
    },
    [checkOrder],
  );

  const reset = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  return { status, error, buyingCourseId, buy, reset };
}
