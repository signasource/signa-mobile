import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { TabParamList } from "@/navigation/TabNavigator";
import { AppStackParamList } from "@/navigation/AppNavigator";
import {
  Friend,
  FriendEvent,
  FriendRequest,
  RelationStatus,
  SentFriendRequest,
  socialApi,
  UserSearchResult,
} from "@/api/social";
import { notificationsApi } from "@/api/notifications";
import { formatXp, mutualLabel } from "@/features/social/people";
import { SocialHeader } from "@/features/social/components/SocialHeader";
import { PersonRow, PersonStat } from "@/features/social/components/PersonRow";
import { RowActionSpec, ROW_ACTION_STYLE } from "@/features/social/components/RowAction";
import { FeedCard } from "@/features/social/components/FeedCard";
import { EmptyNote, EmptyState } from "@/features/social/components/EmptyState";
import { ConfirmSheet, ConfirmSpec } from "@/features/social/components/ConfirmSheet";
import { Toast } from "@/features/social/components/Toast";

type SocialNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Social">,
  NativeStackNavigationProp<AppStackParamList>
>;
type Props = BottomTabScreenProps<TabParamList, "Social"> & { navigation: SocialNavigation };

type Tab = "feed" | "amigos";
type Section = "amigos" | "solicitudes";
type ConfirmKind = "remove" | "block";

interface PendingConfirm {
  kind: ConfirmKind;
  id: string;
  name: string;
}

/** El backend exige al menos 2 caracteres, y esperamos a que el usuario deje de tipear. */
const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 350;

const CONFIRM_SPEC: Record<ConfirmKind, (name: string) => ConfirmSpec> = {
  remove: () => ({
    icon: "person-remove",
    tone: colors.text,
    tint: colors.fill,
    title: "¿Dejar de ser amigos?",
    description:
      "Van a dejar de ver la actividad del otro en el feed. Podés volver a agregarlo cuando quieras.",
    label: "Dejar de ser amigos",
  }),
  block: (name) => ({
    icon: "ban",
    tone: colors.danger,
    tint: colors.dangerLight,
    title: `¿Bloquear a ${name}?`,
    description:
      "No va a poder verte ni enviarte solicitudes, y se elimina de tu lista de amigos.",
    label: "Bloquear",
  }),
};

/** Línea secundaria de una fila de búsqueda, según la relación con esa persona. */
function searchSub(result: UserSearchResult): string {
  const handle = `@${result.username}`;
  switch (result.relation) {
    case "FRIEND":
      return `${handle} · ya son amigos`;
    case "INCOMING":
      return `${handle} · te mandó una solicitud`;
    case "OUTGOING":
      return `${handle} · solicitud pendiente`;
    case "BLOCKED":
      return `${handle} · bloqueado`;
    default:
      return `${handle} · ${mutualLabel(result.mutualFriends)}`;
  }
}

export function SocialScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [events, setEvents] = useState<FriendEvent[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<SentFriendRequest[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [tab, setTab] = useState<Tab>("feed");
  const [section, setSection] = useState<Section>("amigos");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<PendingConfirm | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchAbort = useRef<AbortController | null>(null);

  const notify = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  }, []);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [eventsRes, friendsRes, incomingRes, outgoingRes, unreadRes] = await Promise.all([
        socialApi.getEvents(),
        socialApi.getFriends(),
        socialApi.getReceivedRequests(),
        socialApi.getSentRequests(),
        notificationsApi.getUnreadCount(),
      ]);
      setEvents(eventsRes.data);
      setFriends(friendsRes.data);
      setIncoming(incomingRes.data);
      setOutgoing(outgoingRes.data);
      setUnreadCount(unreadRes.data.unreadCount);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar tu actividad social.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
      searchAbort.current?.abort();
    },
    []
  );

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;

  // Búsqueda con debounce: cada tecla cancela la petición anterior.
  useEffect(() => {
    searchAbort.current?.abort();

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setSearchLoading(false);
      return;
    }

    setSearchLoading(true);
    const controller = new AbortController();
    searchAbort.current = controller;

    const timer = setTimeout(async () => {
      try {
        const { data } = await socialApi.searchUsers(trimmedQuery, controller.signal);
        setResults(data);
      } catch {
        if (!controller.signal.aborted) setResults([]);
      } finally {
        if (!controller.signal.aborted) setSearchLoading(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [trimmedQuery]);

  /** Refleja en los resultados de búsqueda la relación que acaba de cambiar. */
  const patchRelation = useCallback((userId: string, relation: RelationStatus) => {
    setResults((prev) =>
      prev.map((r) => (r.id === userId ? { ...r, relation } : r))
    );
  }, []);

  const run = useCallback(
    async (key: string, action: () => Promise<void>, fallback: string) => {
      setBusy(key);
      try {
        await action();
      } catch (err: any) {
        notify(err?.response?.data?.message ?? fallback);
      } finally {
        setBusy(null);
      }
    },
    [notify]
  );

  const sendRequest = useCallback(
    (userId: string, name: string, username: string) =>
      run(
        `${userId}:add`,
        async () => {
          await socialApi.sendRequest(userId);
          patchRelation(userId, "OUTGOING");
          setOutgoing((prev) => [
            ...prev,
            {
              addresseeId: userId,
              addresseeName: name,
              addresseeUsername: username,
              requestedAt: new Date().toISOString(),
            },
          ]);
          notify(`Solicitud enviada a ${name}`);
        },
        "No pudimos enviar la solicitud."
      ),
    [run, patchRelation, notify]
  );

  const cancelRequest = useCallback(
    (userId: string) =>
      run(
        `${userId}:cancel`,
        async () => {
          await socialApi.cancelRequest(userId);
          patchRelation(userId, "NONE");
          setOutgoing((prev) => prev.filter((r) => r.addresseeId !== userId));
          notify("Cancelaste la solicitud");
        },
        "No pudimos cancelar la solicitud."
      ),
    [run, patchRelation, notify]
  );

  const acceptRequest = useCallback(
    (userId: string) =>
      run(
        `${userId}:accept`,
        async () => {
          await socialApi.acceptRequest(userId);
          setIncoming((prev) => prev.filter((r) => r.requesterId !== userId));
          patchRelation(userId, "FRIEND");
          const { data } = await socialApi.getFriends();
          setFriends(data);
        },
        "No pudimos aceptar la solicitud."
      ),
    [run, patchRelation, notify]
  );

  const rejectRequest = useCallback(
    (userId: string) =>
      run(
        `${userId}:reject`,
        async () => {
          await socialApi.rejectRequest(userId);
          setIncoming((prev) => prev.filter((r) => r.requesterId !== userId));
          patchRelation(userId, "NONE");
          notify("Rechazaste la solicitud");
        },
        "No pudimos rechazar la solicitud."
      ),
    [run, patchRelation, notify]
  );

  const unblockUser = useCallback(
    (userId: string, name: string) =>
      run(
        `${userId}:unblock`,
        async () => {
          await socialApi.unblockUser(userId);
          patchRelation(userId, "NONE");
          notify(`Desbloqueaste a ${name}`);
        },
        "No pudimos desbloquear a esta persona."
      ),
    [run, patchRelation, notify]
  );

  const runConfirm = useCallback(async () => {
    if (!confirm) return;
    const { kind, id, name } = confirm;

    await run(
      `${id}:${kind}`,
      async () => {
        if (kind === "remove") {
          await socialApi.removeFriend(id);
          patchRelation(id, "NONE");
          notify(`Ya no son amigos con ${name}`);
        } else {
          await socialApi.blockUser(id);
          patchRelation(id, "BLOCKED");
          setIncoming((prev) => prev.filter((r) => r.requesterId !== id));
          setOutgoing((prev) => prev.filter((r) => r.addresseeId !== id));
          notify(`Bloqueaste a ${name}`);
        }
        setFriends((prev) => prev.filter((f) => f.id !== id));
        setEvents((prev) => prev.filter((e) => e.friendId !== id));
      },
      "No pudimos completar la acción."
    );

    setConfirm(null);
  }, [confirm, run, patchRelation, notify]);

  const toggleLike = useCallback(
    async (event: FriendEvent) => {
      const liked = !event.liked;
      const matches = (e: FriendEvent) =>
        e.eventType === event.eventType && e.eventRefId === event.eventRefId;

      setEvents((prev) => prev.map((e) => (matches(e) ? { ...e, liked } : e)));

      try {
        if (liked) {
          await socialApi.likeEvent(event.eventType, event.eventRefId);
        } else {
          await socialApi.unlikeEvent(event.eventType, event.eventRefId);
        }
      } catch (err: any) {
        setEvents((prev) => prev.map((e) => (matches(e) ? { ...e, liked: !liked } : e)));
        notify(err?.response?.data?.message ?? "No pudimos registrar tu me gusta.");
      }
    },
    [notify]
  );

  /** Botones de una fila, según la relación con esa persona (idéntico al diseño). */
  const actionsFor = useCallback(
    (userId: string, name: string, username: string, relation: RelationStatus): RowActionSpec[] => {
      const add: RowActionSpec = {
        key: `${userId}:add`,
        icon: "person-add",
        label: "Enviar solicitud",
        ...ROW_ACTION_STYLE.add,
        onPress: () => sendRequest(userId, name, username),
      };
      const cancel: RowActionSpec = {
        key: `${userId}:cancel`,
        icon: "close",
        label: "Cancelar solicitud",
        ...ROW_ACTION_STYLE.neutral,
        onPress: () => cancelRequest(userId),
      };
      const accept: RowActionSpec = {
        key: `${userId}:accept`,
        icon: "checkmark",
        label: "Aceptar",
        ...ROW_ACTION_STYLE.accept,
        onPress: () => acceptRequest(userId),
      };
      const reject: RowActionSpec = {
        key: `${userId}:reject`,
        icon: "close",
        label: "Rechazar",
        ...ROW_ACTION_STYLE.reject,
        onPress: () => rejectRequest(userId),
      };
      const remove: RowActionSpec = {
        key: `${userId}:remove`,
        icon: "person-remove-outline",
        label: "Dejar de ser amigos",
        ...ROW_ACTION_STYLE.neutral,
        onPress: () => setConfirm({ kind: "remove", id: userId, name }),
      };
      const block: RowActionSpec = {
        key: `${userId}:block`,
        icon: "ban-outline",
        label: "Bloquear",
        ...ROW_ACTION_STYLE.muted,
        onPress: () => setConfirm({ kind: "block", id: userId, name }),
      };
      const unblock: RowActionSpec = {
        key: `${userId}:unblock`,
        icon: "lock-open-outline",
        label: "Desbloquear",
        ...ROW_ACTION_STYLE.neutral,
        onPress: () => unblockUser(userId, name),
      };

      switch (relation) {
        case "FRIEND":
          return [remove, block];
        case "INCOMING":
          return [accept, reject];
        case "OUTGOING":
          return [cancel, block];
        case "BLOCKED":
          return [unblock];
        default:
          return [add, block];
      }
    },
    [sendRequest, cancelRequest, acceptRequest, rejectRequest, unblockUser]
  );

  const openProfile = useCallback(
    (username: string) => navigation.navigate("PublicProfile", { username }),
    [navigation]
  );

  const friendStats = (friend: Friend): PersonStat[] => [
    {
      key: "streak",
      icon: "flame",
      tone: colors.streakOrange,
      label: String(friend.currentStreak),
    },
    { key: "xp", icon: "flash", tone: colors.shopAmber, label: formatXp(friend.totalXp) },
  ];

  const headerPaddingTop = insets.top + 14;
  const isFeed = tab === "feed";

  return (
    <View style={styles.container}>
      <SocialHeader
        title="Social"
        subtitle="Mirá qué están logrando tus amigos y sumá los tuyos."
        paddingTop={headerPaddingTop}
        right={
          <TouchableOpacity
            style={styles.bell}
            onPress={() => navigation.navigate("Notifications")}
            accessibilityRole="button"
            accessibilityLabel="Notificaciones"
          >
            <Ionicons name="notifications-outline" size={21} color={colors.onDark} />
            {unreadCount > 0 && (
              <View style={styles.bellBadge}>
                <Text style={styles.bellBadgeLabel}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        }
      >
        <View style={styles.stats}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>AMIGOS</Text>
            <Text style={styles.statValue}>{friends.length}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>SOLICITUDES</Text>
            <Text style={styles.statValue}>{incoming.length}</Text>
          </View>
        </View>
      </SocialHeader>

      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, isFeed && styles.tabActive]}
          onPress={() => setTab("feed")}
        >
          <Text style={[styles.tabLabel, isFeed && styles.tabLabelActive]}>Feed</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, !isFeed && styles.tabActive]}
          onPress={() => setTab("amigos")}
        >
          <Text style={[styles.tabLabel, !isFeed && styles.tabLabelActive]}>Amigos</Text>
          {incoming.length > 0 && (
            <View style={[styles.tabBadge, !isFeed && styles.tabBadgeActive]}>
              <Text style={styles.tabBadgeLabel}>{incoming.length}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.socialWine} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <EmptyState icon="cloud-offline-outline" title="No pudimos cargar" description={error} />
          <TouchableOpacity style={styles.retry} onPress={load}>
            <Text style={styles.retryLabel}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isFeed ? (
            <View style={styles.feed}>
              <Text style={styles.sectionLabel}>ACTIVIDAD RECIENTE</Text>
              {events.length === 0 ? (
                <EmptyState
                  icon="pulse-outline"
                  title="Todavía no hay actividad"
                  description="Cuando tus amigos completen lecciones o desbloqueen logros, lo vas a ver acá."
                />
              ) : (
                events.map((event) => (
                  <FeedCard
                    key={`${event.eventType}:${event.eventRefId}`}
                    event={event}
                    onToggleLike={() => toggleLike(event)}
                    onPressAvatar={() => openProfile(event.friendUsername)}
                  />
                ))
              )}
            </View>
          ) : (
            <View style={styles.friendsTab}>
              <View style={styles.search}>
                <Ionicons name="search" size={17} color={colors.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Buscar por nombre o usuario"
                  placeholderTextColor={colors.textMuted}
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                />
                {searchLoading && <ActivityIndicator size="small" color={colors.textMuted} />}
                {searching && !searchLoading && (
                  <TouchableOpacity
                    style={styles.clear}
                    onPress={() => setQuery("")}
                    accessibilityRole="button"
                    accessibilityLabel="Limpiar búsqueda"
                  >
                    <Ionicons name="close" size={14} color={colors.textMuted} />
                  </TouchableOpacity>
                )}
              </View>

              {searching ? (
                <View>
                  {trimmedQuery.length < MIN_QUERY_LENGTH ? (
                    <Text style={styles.sectionLabel}>ESCRIBÍ AL MENOS 2 LETRAS</Text>
                  ) : (
                    <Text style={styles.sectionLabel}>
                      {results.length === 1 ? "1 RESULTADO" : `${results.length} RESULTADOS`}
                    </Text>
                  )}

                  {results.map((result) => (
                    <PersonRow
                      key={result.id}
                      id={result.id}
                      name={result.name}
                      username={result.username}
                      sub={searchSub(result)}
                      actions={actionsFor(
                        result.id,
                        result.name,
                        result.username,
                        result.relation
                      )}
                      busyAction={busy}
                      onPressAvatar={() => openProfile(result.username)}
                    />
                  ))}

                  {!searchLoading &&
                    results.length === 0 &&
                    trimmedQuery.length >= MIN_QUERY_LENGTH && (
                      <EmptyState
                        icon="search"
                        title="Sin resultados"
                        description="Probá con el nombre completo o el usuario exacto."
                      />
                    )}
                </View>
              ) : (
                <View>
                  <View style={styles.sectionTabs}>
                    <TouchableOpacity
                      style={[
                        styles.sectionTab,
                        section === "amigos" && styles.sectionTabActive,
                      ]}
                      onPress={() => setSection("amigos")}
                    >
                      <Text
                        style={[
                          styles.sectionTabLabel,
                          section === "amigos" && styles.sectionTabLabelActive,
                        ]}
                      >
                        Mis amigos
                      </Text>
                      <Text
                        style={[
                          styles.sectionTabCount,
                          section === "amigos" && styles.sectionTabCountActive,
                        ]}
                      >
                        {friends.length}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.sectionTab,
                        section === "solicitudes" && styles.sectionTabActive,
                      ]}
                      onPress={() => setSection("solicitudes")}
                    >
                      <Text
                        style={[
                          styles.sectionTabLabel,
                          section === "solicitudes" && styles.sectionTabLabelActive,
                        ]}
                      >
                        Solicitudes
                      </Text>
                      <Text
                        style={[
                          styles.sectionTabCount,
                          section === "solicitudes" && styles.sectionTabCountActive,
                        ]}
                      >
                        {incoming.length + outgoing.length}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {section === "amigos" ? (
                    friends.length === 0 ? (
                      <EmptyState
                        icon="people-outline"
                        title="Todavía no tenés amigos"
                        description="Buscá a alguien por su usuario y mandale una solicitud."
                      />
                    ) : (
                      friends.map((friend) => (
                        <PersonRow
                          key={friend.id}
                          id={friend.id}
                          name={friend.name}
                          username={friend.username}
                          sub={`@${friend.username}`}
                          stats={friendStats(friend)}
                          actions={actionsFor(
                            friend.id,
                            friend.name,
                            friend.username,
                            "FRIEND"
                          )}
                          busyAction={busy}
                          onPressAvatar={() => openProfile(friend.username)}
                        />
                      ))
                    )
                  ) : (
                    <View>
                      <Text style={styles.sectionLabel}>RECIBIDAS · {incoming.length}</Text>
                      {incoming.length === 0 ? (
                        <EmptyNote>No tenés solicitudes pendientes.</EmptyNote>
                      ) : (
                        incoming.map((request) => (
                          <PersonRow
                            key={request.requesterId}
                            id={request.requesterId}
                            name={request.requesterName}
                            username={request.requesterUsername}
                            sub={`@${request.requesterUsername} · te mandó una solicitud`}
                            actions={actionsFor(
                              request.requesterId,
                              request.requesterName,
                              request.requesterUsername,
                              "INCOMING"
                            )}
                            busyAction={busy}
                            onPressAvatar={() => openProfile(request.requesterUsername)}
                          />
                        ))
                      )}

                      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
                        ENVIADAS · {outgoing.length}
                      </Text>
                      {outgoing.length === 0 ? (
                        <EmptyNote>No enviaste solicitudes.</EmptyNote>
                      ) : (
                        outgoing.map((request) => (
                          <PersonRow
                            key={request.addresseeId}
                            id={request.addresseeId}
                            name={request.addresseeName}
                            username={request.addresseeUsername}
                            sub={`@${request.addresseeUsername} · solicitud pendiente`}
                            actions={actionsFor(
                              request.addresseeId,
                              request.addresseeName,
                              request.addresseeUsername,
                              "OUTGOING"
                            )}
                            busyAction={busy}
                            onPressAvatar={() => openProfile(request.addresseeUsername)}
                          />
                        ))
                      )}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>
      )}

      <Toast message={toast} bottom={16} />

      <ConfirmSheet
        spec={confirm ? CONFIRM_SPEC[confirm.kind](confirm.name) : null}
        busy={confirm !== null && busy === `${confirm.id}:${confirm.kind}`}
        onConfirm={runConfirm}
        onClose={() => setConfirm(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadge: {
    position: "absolute",
    top: -5,
    right: -5,
    minWidth: 19,
    height: 19,
    paddingHorizontal: 5,
    borderRadius: 7,
    backgroundColor: colors.onDark,
    borderWidth: 2,
    borderColor: colors.socialWine,
    alignItems: "center",
    justifyContent: "center",
  },
  bellBadgeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.socialWine,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 9.5,
    letterSpacing: 0.8,
    color: colors.onDark,
    opacity: 0.75,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.onDark,
    marginTop: 3,
  },
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.fill,
  },
  tabActive: {
    backgroundColor: colors.socialWine,
  },
  tabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.onDark,
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.socialWine,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  tabBadgeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.onDark,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 24,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  retry: {
    marginTop: 4,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 20,
    backgroundColor: colors.socialWine,
  },
  retryLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
  feed: {
    gap: 12,
  },
  friendsTab: {
    gap: 14,
    paddingTop: 6,
  },
  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  sectionLabelSpaced: {
    paddingTop: 18,
  },
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    padding: 0,
  },
  clear: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTabs: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  sectionTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 13,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTabActive: {
    borderColor: colors.socialWine,
    backgroundColor: colors.surface,
  },
  sectionTabLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  sectionTabLabelActive: {
    color: colors.socialWine,
  },
  sectionTabCount: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
    opacity: 0.7,
  },
  sectionTabCountActive: {
    color: colors.socialWine,
  },
});
