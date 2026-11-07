import { apiClient } from "./client";

export interface CourseCheckout {
  orderId: string;
  /** Mercado Pago Checkout Pro URL to open in the browser. */
  checkoutUrl: string;
}

export type CourseOrderStatus = "PENDING" | "PAID" | "REFUNDED";

export interface CourseOrder {
  id: string;
  status: CourseOrderStatus;
  courseId: string;
  /** `true` once the backend granted permanent access to the course. */
  owned: boolean;
}

/**
 * One-time purchase of permanent access to a paid course through Mercado Pago. Mirrors the gem
 * order flow (`@/api/gemOrders`): create an order, open its checkout, then sync to confirm.
 */
export const courseOrdersApi = {
  createOrder: (courseId: string) =>
    apiClient.post<CourseCheckout>("/store/course-orders", { courseId }),
  /** Server re-reads the order from Mercado Pago and grants access once if it was paid. */
  syncOrder: (orderId: string) =>
    apiClient.post<CourseOrder>(`/store/course-orders/${orderId}/sync`),
};
