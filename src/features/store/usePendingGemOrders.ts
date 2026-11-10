import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { gemOrdersApi, PendingGemOrder } from "@/api/gemOrders";

/**
 * Gem orders whose payment is in process at Mercado Pago (cash, transfer, review). Refetched on
 * every focus; failures read as "nothing pending" since this only decorates the UI.
 */
export function usePendingGemOrders(): PendingGemOrder[] {
  const [pending, setPending] = useState<PendingGemOrder[]>([]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      gemOrdersApi
        .getPending()
        .then((res) => !cancelled && setPending(res.data))
        .catch(() => !cancelled && setPending([]));
      return () => {
        cancelled = true;
      };
    }, []),
  );

  return pending;
}
