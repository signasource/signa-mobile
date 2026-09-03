import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";
import { FriendEvent, FriendEventType } from "@/api/social";
import { NotificationCode } from "@/api/notifications";

/** Par de colores de un avatar: fondo tenue + iniciales. */
export interface AvatarColors {
  bg: string;
  fg: string;
}

const AVATAR_PALETTE: AvatarColors[] = [
  { bg: colors.primaryLight, fg: colors.primaryDark },
  { bg: colors.avatarTealLight, fg: colors.avatarTealDark },
  { bg: colors.avatarWineLight, fg: colors.socialWine },
  { bg: colors.avatarAmberLight, fg: colors.shopAmberDark },
  { bg: colors.avatarBlueLight, fg: colors.gemsBlueDark },
  { bg: colors.avatarGreenLight, fg: colors.successDark },
];

/**
 * Color estable por persona: se deriva del id, así el mismo usuario mantiene su color entre
 * pantallas y entre sesiones.
 */
export function avatarColors(seed: string): AvatarColors {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

/** Iniciales a partir del nombre; cae al usuario si el nombre viene vacío. */
export function initialsOf(name: string, username: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return username.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** "hace 12 min", "hace 2 h", "ayer", "hace 3 d", o la fecha si es más viejo que una semana. */
export function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";

  const minutes = Math.floor((Date.now() - then) / 60000);
  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} d`;

  return new Date(iso).toLocaleDateString("es-AR", { day: "numeric", month: "short" });
}

export function formatXp(xp: number): string {
  return xp.toLocaleString("es-AR");
}

interface EventVisual {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  tint: string;
}

const EVENT_VISUAL: Record<FriendEventType, EventVisual> = {
  ACHIEVEMENT: { icon: "trophy", tone: colors.warning, tint: colors.warningLight },
  SIGN_LEARNED: { icon: "school", tone: colors.courseTeal, tint: colors.avatarTealLight },
};

export function eventVisual(type: FriendEventType): EventVisual {
  return EVENT_VISUAL[type];
}

/**
 * Arma la frase del feed en tres partes para poder resaltar el sujeto en negrita, igual que el
 * diseño: "Desbloqueó el logro **Manos rápidas** — 50 señas sin errores."
 */
export function eventSentence(event: FriendEvent): {
  pre: string;
  highlight: string;
  post: string;
} {
  if (event.eventType === "ACHIEVEMENT") {
    return {
      pre: "Desbloqueó el logro",
      highlight: event.subject,
      post: event.context ? `— ${event.context}` : "",
    };
  }
  return {
    pre: "Aprendió la seña",
    highlight: event.subject,
    post: event.context ? `del curso ${event.context}.` : "",
  };
}

const NOTIFICATION_VISUAL: Record<string, EventVisual> = {
  FRIEND_EVENT_LIKED: { icon: "heart", tone: colors.socialWine, tint: colors.socialWineLight },
  FRIEND_REQUEST_RECEIVED: {
    icon: "person-add",
    tone: colors.primary,
    tint: colors.primaryLight,
  },
  FRIEND_REQUEST_ACCEPTED: {
    icon: "checkmark-circle",
    tone: colors.successDark,
    tint: colors.successLight,
  },
  COURSE_COMPLETED: { icon: "trophy", tone: colors.warning, tint: colors.warningLight },
  STREAK_REMINDER: { icon: "flame", tone: colors.streakOrange, tint: colors.avatarAmberLight },
};

const DEFAULT_NOTIFICATION_VISUAL: EventVisual = {
  icon: "notifications",
  tone: colors.textMuted,
  tint: colors.fill,
};

export function notificationVisual(code: NotificationCode): EventVisual {
  return NOTIFICATION_VISUAL[code] ?? DEFAULT_NOTIFICATION_VISUAL;
}

export function mutualLabel(count: number): string {
  if (count === 0) return "Sin amigos en común";
  if (count === 1) return "1 amigo en común";
  return `${count} amigos en común`;
}
