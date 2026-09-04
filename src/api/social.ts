import { apiClient } from "./client";

/** Relationship with another user, from the caller's point of view. */
export type RelationStatus =
  | "NONE"
  | "FRIEND"
  | "INCOMING"
  | "OUTGOING"
  | "BLOCKED"
  | "BLOCKED_BY";

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
 * Feed events are derived, not stored, so (`eventType`, `eventRefId`) is their identity.
 * `subject`/`context` are the raw pieces; the app composes the sentence.
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

  /** Contains-match on username or name. Rejects queries shorter than 2 characters. */
  searchUsers: (query: string, signal?: AbortSignal) =>
    apiClient.get<UserSearchResult[]>("/users/search", { params: { query }, signal }),
};

/** Mirrors `CourseProgressResponse`. Distinct from `CourseProgress` in `api/learning.ts`. */
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

/** Mirrors `AchievementResponse`. Distinct from `Achievement` in `api/achievements.ts`. */
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

/** With `visible: false` the account is private to the viewer: identity only, no progress. */
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
