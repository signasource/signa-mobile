import { colors } from "@/theme";
import { AppliedEffectResponse, ShopItemResponse, ShopItemType } from "./types";

/**
 * signa-api no manda icono/color/pestaña para cada item — esa es una decision
 * de presentacion que vive solo en el cliente, derivada de ShopItemType.
 */
export type Tab = "vidas" | "potenciadores" | "especiales";
export type Tone = "danger" | "warning" | "success" | "amber";

export const TAB_LABEL: Record<Tab, string> = {
  vidas: "Vidas",
  potenciadores: "Potenciadores",
  especiales: "Especiales",
};

export const TONE_COLOR: Record<Tone, string> = {
  danger: colors.danger,
  warning: colors.warning,
  success: colors.success,
  amber: colors.amber,
};

export const TONE_TINT: Record<Tone, string> = {
  danger: "rgba(225,78,34,.12)",
  warning: "rgba(251,191,36,.18)",
  success: "rgba(76,166,92,.14)",
  amber: colors.amberTint,
};

interface TypeMeta {
  tab: Tab;
  icon: string;
  tone: Tone;
  featured?: boolean;
}

const TYPE_META: Record<ShopItemType, TypeMeta> = {
  LIFE: { tab: "vidas", icon: "heart", tone: "danger" },
  UNLIMITED_LIVES: { tab: "vidas", icon: "infinite", tone: "amber", featured: true },
  XP_MULTIPLIER: { tab: "potenciadores", icon: "flash", tone: "warning" },
  STREAK_SHIELD: { tab: "potenciadores", icon: "shield-half", tone: "success" },
  MYSTERY_CHEST: { tab: "especiales", icon: "gift", tone: "amber" },
  GEMS: { tab: "especiales", icon: "diamond", tone: "amber" },
};

export function metaFor(itemType: ShopItemType): TypeMeta {
  return TYPE_META[itemType];
}

function plural(n: number, word: string, wordPlural = word + "s") {
  return `${n} ${n === 1 ? word : wordPlural}`;
}

export function describeItem(item: ShopItemResponse): string {
  switch (item.itemType) {
    case "LIFE":
      return plural(item.quantity, "vida");
    case "UNLIMITED_LIVES":
      return `${item.durationMinutes} minutos`;
    case "XP_MULTIPLIER": {
      const value = (item.multiplierValue ?? 0).toString().replace(".", ",");
      return `x${value} · ${item.durationMinutes} minutos`;
    }
    case "STREAK_SHIELD":
      return plural(item.quantity, "escudo");
    case "MYSTERY_CHEST":
      return "1 recompensa";
    case "GEMS":
      return plural(item.quantity, "gema");
    default:
      return "";
  }
}

/**
 * Traduce el AppliedEffectResponse que devuelve /store/purchases (usado
 * sobre todo para el cofre sorpresa, cuyo premio se resuelve del lado del
 * servidor y solo se conoce con la respuesta) a lo que muestra la pantalla
 * de exito.
 */
export function rewardMeta(effect: AppliedEffectResponse): { icon: string; tone: Tone; label: string; note: string } {
  switch (effect.type) {
    case "GEMS":
      return {
        icon: "diamond",
        tone: "amber",
        label: plural(effect.gemsGranted ?? 0, "gema"),
        note: "Ya están sumadas a tu saldo.",
      };
    case "LIFE":
      return {
        icon: "heart",
        tone: "danger",
        label: plural(effect.livesGranted ?? 0, "vida"),
        note:
          (effect.livesGranted ?? 0) > 0
            ? "Ya están sumadas a tu inventario."
            : "Ya tenías las vidas al máximo — no se perdió ninguna gema.",
      };
    case "STREAK_SHIELD":
      return {
        icon: "shield-half",
        tone: "success",
        label: plural(effect.streakShieldsGranted ?? 0, "escudo de racha", "escudos de racha"),
        note: "Guardado en tu inventario, listo para cuidar tu racha.",
      };
    case "XP_MULTIPLIER": {
      const value = (effect.xpMultiplierValue ?? 0).toString().replace(".", ",");
      return {
        icon: "flash",
        tone: "warning",
        label: `Multiplicador de XP x${value} · ${effect.durationMinutes} min`,
        note: `Activo por ${effect.durationMinutes} minutos. Aprovechalo.`,
      };
    }
    case "UNLIMITED_LIVES":
      return {
        icon: "infinite",
        tone: "amber",
        label: `Vidas ilimitadas · ${effect.durationMinutes} min`,
        note: `Tenés vidas infinitas por ${effect.durationMinutes} minutos. Aprovechalas.`,
      };
    default:
      return { icon: "gift", tone: "amber", label: "", note: "" };
  }
}
