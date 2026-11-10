import type { GemPack } from "@/api/gemOrders";

/** `1.234`, the way Argentines read numbers. */
export const fmt = (n: number) => n.toLocaleString("es-AR");

/** Price as the buyer reads it, e.g. `$ 3.300`. */
export function formatPrice({ price, currency }: Pick<GemPack, "price" | "currency">): string {
  return currency === "ARS" ? `$ ${fmt(price)}` : `${fmt(price)} ${currency}`;
}

/** Smallest pack covering `missing` gems (or the biggest one if none does). `packs` sorted by size. */
export function suggestedPack(packs: GemPack[], missing: number | undefined): GemPack | undefined {
  if (!missing || packs.length === 0) return undefined;
  return packs.find((p) => p.gems >= missing) ?? packs[packs.length - 1];
}
