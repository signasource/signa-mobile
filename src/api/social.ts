import { apiClient } from "./client";

/** Relación del usuario autenticado con otra persona, desde su propio punto de vista. */
export type RelationStatus =
  | "NONE"
  | "FRIEND"
  | "INCOMING"
  | "OUTGOING"
  | "BLOCKED"
  | "BLOCKED_BY";

/** Tipo de actividad de un amigo que aparece en el feed. */
export type FriendEventType = "ACHIEVEMENT" | "SIGN_LEARNED";

export interface Friend {
  id: string;
  username: string;
  name: string;
  acceptedAt: string;
  currentStreak: number;
  totalXp: number;
  learnedSignsCount: number;
}

export interface FriendRequest {
  requesterId: string;
  requesterUsername: string;
  requesterName: string;
  requestedAt: string;
}

export interface SentFriendRequest {
  addresseeId: string;
  addresseeUsername: string;
  addresseeName: string;
  requestedAt: string;
}

/**
 * Un evento del feed. No se persiste: el backend lo deriva de los logros y señas aprendidas
 * del amigo, y lo identifica con el par (`eventType`, `eventRefId`).
 *
 * `subject` y `context` son las piezas crudas (título del logro y su descripción, o la seña y
 * su curso); la frase la arma la app para que la copy quede en el idioma de la UI.
 */
export interface FriendEvent {
  friendId: string;
  friendUsername: string;
  friendName: string;
  eventType: FriendEventType;
  eventRefId: string;
  subject: string;
  context: string | null;
  liked: boolean;
  createdAt: string;
}

export interface UserSearchResult {
  id: string;
  username: string;
  name: string;
  relation: RelationStatus;
  mutualFriends: number;
}

export const socialApi = {
  getFriends: () => apiClient.get<Friend[]>("/friendships"),

  getReceivedRequests: () => apiClient.get<FriendRequest[]>("/friendships/requests"),

  getSentRequests: () => apiClient.get<SentFriendRequest[]>("/friendships/requests/sent"),

  getEvents: (limit = 50) =>
    apiClient.get<FriendEvent[]>("/friendships/events", { params: { limit } }),

  sendRequest: (addresseeId: string) =>
    apiClient.post<void>(`/friendships/request/${addresseeId}`),

  cancelRequest: (addresseeId: string) =>
    apiClient.delete<void>(`/friendships/request/${addresseeId}`),

  acceptRequest: (requesterId: string) =>
    apiClient.patch<void>(`/friendships/accept/${requesterId}`),

  rejectRequest: (requesterId: string) =>
    apiClient.patch<void>(`/friendships/reject/${requesterId}`),

  removeFriend: (userId: string) => apiClient.delete<void>(`/friendships/${userId}`),

  blockUser: (userId: string) => apiClient.patch<void>(`/friendships/block/${userId}`),

  unblockUser: (userId: string) => apiClient.patch<void>(`/friendships/unblock/${userId}`),

  likeEvent: (eventType: FriendEventType, eventRefId: string) =>
    apiClient.post<void>(`/friendships/events/${eventType}/${eventRefId}/like`),

  unlikeEvent: (eventType: FriendEventType, eventRefId: string) =>
    apiClient.delete<void>(`/friendships/events/${eventType}/${eventRefId}/like`),

  /** Búsqueda por nombre o usuario. Acepta `AbortSignal` para cancelar al seguir tipeando. */
  searchUsers: (query: string, signal?: AbortSignal) =>
    apiClient.get<UserSearchResult[]>("/users/search", { params: { query }, signal }),
};

/** Progreso de un curso, tal como lo devuelve `CourseProgressResponse` del backend. */
export interface PublicCourseProgress {
  courseName: string;
  status: "ENROLLED" | "COMPLETED" | "DROPPED";
  totalLessons: number;
  completedLessons: number;
  progressPercentage: number;
  signsLearned: number;
  currentTopic: {
    title: string;
    totalLessons: number;
    completedLessons: number;
    progressPercentage: number;
  } | null;
}

/** Logro, tal como lo devuelve `AchievementResponse` del backend. */
export interface PublicAchievement {
  id: string;
  code: string;
  title: string;
  description: string;
  iconUrl: string | null;
  criteriaType: string;
  criteriaValue: number;
  active: boolean;
  earned: boolean;
  earnedAt: string | null;
}

export interface PublicUserStats {
  currentStreak: number;
  longestStreak: number;
  totalXp: number;
  weeklyXp: number;
  learnedSignsCount: number;
}

/**
 * Perfil de otra persona. Cuando `visible` es `false` la cuenta es privada y quien mira no es
 * amigo: llegan la identidad y la `relation` — para poder mandarle solicitud — pero ningún dato
 * de progreso.
 */
export interface PublicUserProfile {
  id: string;
  username: string;
  name: string;
  profileHeaderColor: string | null;
  relation: RelationStatus;
  visible: boolean;
  stats: PublicUserStats;
  weeklyXp: { date: string; xpEarned: number }[];
  achievements: PublicAchievement[];
  courses: PublicCourseProgress[];
}

export const publicProfileApi = {
  getByUsername: (username: string) =>
    apiClient.get<PublicUserProfile>(`/users/${encodeURIComponent(username)}`),
};
