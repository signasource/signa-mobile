/** Formats an ARS course price like "$2.900". Falls back to an empty string when unknown. */
export function formatPrice(price: number | null | undefined): string {
  if (price == null) return "";
  return `$${Math.round(price).toLocaleString("es-AR")}`;
}
