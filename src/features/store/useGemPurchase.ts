import { useCallback, useEffect, useRef, useState } from "react";
import * as WebBrowser from "expo-web-browser";
import { gemOrdersApi, GemOrder, GemPack } from "@/api/gemOrders";

export type GemPurchaseStatus = "loading" | "idle" | "buying" | "checking" | "pending" | "error";

interface Options {
  /** Called once the backend confirmed the payment; carries the refreshed inventory. */
  onCredited: (order: GemOrder) => void;
}

/** Deep link the API's return page hands the browser back to (`scheme` in app.json). */
const RETURN_URL = "signa://store";
const SYNC_ATTEMPTS = 4;
const SYNC_DELAY_MS = 2500;

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Buying gem packs with real money through Mercado Pago Checkout Pro.
 *
 * Flow: `buy(pack)` → `POST /store/gem-orders` → checkout opened in an in-app browser → when it
 * closes, `POST /store/gem-orders/{id}/sync` (the server re-reads the order from Mercado Pago and
 * credits the gems once). Gems are never credited client-side. If the payment is still in
 * process the webhook credits it later, and other tabs refetch the inventory on focus.
 */
export function useGemPurchase({ onCredited }: Options) {
  const [status, setStatus] = useState<GemPurchaseStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [packs, setPacks] = useState<GemPack[]>([]);
  const onCreditedRef = useRef(onCredited);
  onCreditedRef.current = onCredited;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await gemOrdersApi.getPacks();
        if (cancelled) return;
        setPacks([...data].sort((a, b) => a.sortOrder - b.sortOrder));
        setStatus("idle");
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? "No pudimos cargar los packs de gemas.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Asks the backend about an order, a few times: Mercado Pago can take seconds to approve. */
  const checkOrder = useCallback(async (orderId: string) => {
    setStatus("checking");
    for (let attempt = 0; attempt < SYNC_ATTEMPTS; attempt++) {
      const { data } = await gemOrdersApi.syncOrder(orderId);
      if (data.status === "PAID") {
        onCreditedRef.current(data);
        setStatus("idle");
        return;
      }
      if (attempt < SYNC_ATTEMPTS - 1) await wait(SYNC_DELAY_MS);
    }
    setStatus("pending");
  }, []);

  const buy = useCallback(
    async (pack: GemPack) => {
      setError(null);
      setStatus("buying");
      try {
        const { data } = await gemOrdersApi.createOrder(pack.id);
        await WebBrowser.openAuthSessionAsync(data.checkoutUrl, RETURN_URL);
        // Whether the browser returned or was closed, the user may have paid: ask the server.
        await checkOrder(data.orderId);
      } catch (err: any) {
        setError(err?.response?.data?.message ?? "No pudimos completar la compra. Probá de nuevo.");
        setStatus("error");
      }
    },
    [checkOrder],
  );

  const reset = useCallback(() => {
    setError(null);
    setStatus("idle");
  }, []);

  return { status, error, packs, buy, reset };
}
