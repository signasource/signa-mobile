import { useCallback, useEffect, useRef, useState } from "react";
import { ErrorCode, useIAP, type Product, type Purchase } from "expo-iap";
import { gemPurchasesApi, GemPack, GemPurchaseResult } from "@/api/gemPurchases";

/** A backend pack paired with its Google Play product (localized price, title). */
export interface GemOffer {
  pack: GemPack;
  product: Product;
}

export type GemPurchaseStatus =
  | "loading"
  | "idle"
  | "buying"
  | "redeeming"
  | "success"
  | "pending"
  | "error";

interface Options {
  /** Called once the backend confirmed the credit; carries the refreshed inventory. */
  onCredited: (result: GemPurchaseResult) => void;
}

type FinishTransaction = (args: { purchase: Purchase; isConsumable?: boolean }) => Promise<void>;

/**
 * Buying gem packs with real money through Google Play. Android only — mount the caller
 * conditionally; this hook opens the Play Billing connection on mount.
 *
 * Flow: `buy(offer)` → Play sheet → `onPurchaseSuccess` → `POST /store/gem-purchases` (the server
 * verifies the token with Google and credits the gems) → `finishTransaction(isConsumable)`.
 * Gems are never credited client-side. On connect, unfinished purchases are re-submitted through
 * the same path — the backend is idempotent by token — so a crash between paying and crediting
 * never loses a purchase.
 */
export function useGemPurchase({ onCredited }: Options) {
  const [status, setStatus] = useState<GemPurchaseStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [offers, setOffers] = useState<GemOffer[]>([]);
  const [lastResult, setLastResult] = useState<GemPurchaseResult | null>(null);
  const packsRef = useRef<GemPack[]>([]);
  const onCreditedRef = useRef(onCredited);
  onCreditedRef.current = onCredited;
  const finishRef = useRef<FinishTransaction | null>(null);
  // Tokens already sent to the backend in this session, so the restore pass never re-sends one.
  const submittedRef = useRef(new Set<string>());

  const redeemAndFinish = useCallback(async (purchase: Purchase) => {
    const token = purchase.purchaseToken;
    if (!token) {
      setError("Google Play no devolvió el comprobante de la compra.");
      setStatus("error");
      return;
    }
    if (submittedRef.current.has(token)) return;
    submittedRef.current.add(token);
    setStatus("redeeming");
    try {
      const { data } = await gemPurchasesApi.redeem(purchase.productId, token);
      // Only tell Play the item was consumed once our backend has the credit on record.
      await finishRef.current?.({ purchase, isConsumable: true });
      setLastResult(data);
      onCreditedRef.current(data);
      setStatus("success");
    } catch (err: any) {
      submittedRef.current.delete(token);
      setError(
        err?.response?.data?.message ??
          "No pudimos acreditar las gemas. Volvé a abrir la tienda para reintentar.",
      );
      setStatus("error");
    }
  }, []);

  const {
    connected,
    products,
    availablePurchases,
    fetchProducts,
    requestPurchase,
    finishTransaction,
    getAvailablePurchases,
  } = useIAP({
    onPurchaseSuccess: (purchase) => {
      if (purchase.purchaseState === "pending") {
        setStatus("pending");
        return;
      }
      void redeemAndFinish(purchase);
    },
    onPurchaseError: (err) => {
      if (err.code === ErrorCode.UserCancelled) {
        setStatus("idle");
        return;
      }
      setError(err.message || "No pudimos completar la compra en Google Play.");
      setStatus("error");
    },
    onError: (err) => {
      setError(err.message || "No pudimos conectar con Google Play.");
      setStatus("error");
    },
  });
  finishRef.current = finishTransaction;

  // 1. Load the backend packs, ask Play for their localized prices and for unfinished purchases.
  useEffect(() => {
    if (!connected) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await gemPurchasesApi.getPacks();
        if (cancelled) return;
        packsRef.current = data;
        await fetchProducts({ skus: data.map((p) => p.productId), type: "in-app" });
        await getAvailablePurchases();
        if (!cancelled) setStatus((s) => (s === "loading" ? "idle" : s));
      } catch (err: any) {
        if (cancelled) return;
        setError(err?.response?.data?.message ?? "No pudimos cargar los packs de gemas.");
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // fetchProducts / getAvailablePurchases are stable for the hook's lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  // 2. Pair packs with products as soon as Play answers.
  useEffect(() => {
    const byId = new Map(products.map((p) => [p.id, p]));
    const paired = packsRef.current
      .map((pack) => ({ pack, product: byId.get(pack.productId) }))
      .filter((o): o is GemOffer => o.product != null)
      .sort((a, b) => a.pack.sortOrder - b.pack.sortOrder);
    setOffers(paired);
  }, [products]);

  // 3. Recover purchases that were paid but never credited (app killed mid-flow).
  useEffect(() => {
    const known = new Set(packsRef.current.map((p) => p.productId));
    for (const purchase of availablePurchases) {
      if (!known.has(purchase.productId) || purchase.purchaseState !== "purchased") continue;
      void redeemAndFinish(purchase);
    }
  }, [availablePurchases, redeemAndFinish]);

  const buy = useCallback(
    async (offer: GemOffer) => {
      setError(null);
      setStatus("buying");
      try {
        await requestPurchase({
          request: { google: { skus: [offer.pack.productId] } },
          type: "in-app",
        });
        // The outcome arrives through onPurchaseSuccess / onPurchaseError.
      } catch (err: any) {
        if (err?.code === ErrorCode.UserCancelled) {
          setStatus("idle");
          return;
        }
        setError(err?.message ?? "No pudimos abrir Google Play.");
        setStatus("error");
      }
    },
    [requestPurchase],
  );

  const reset = useCallback(() => {
    setError(null);
    setLastResult(null);
    setStatus("idle");
  }, []);

  return { connected, status, error, offers, lastResult, buy, reset };
}
