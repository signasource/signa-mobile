# Social

> Responsibility: the Social tab (feed + friends + search) and the notifications inbox.
> Update when: a social screen, action, or its backing endpoint changes.
> Sources: src/features/social/, src/api/social.ts, src/api/notifications.ts

**Real**, wired end to end to `signa-api`. Built from the `Modulo Social.dc.html` mockup.

Endpoints → [../api/endpoints.md](../api/endpoints.md). Routes → [../navigation.md](../navigation.md).

## Screens

| Screen | Route | File |
|---|---|---|
| Social | `Tabs → Social` | `features/social/screens/SocialScreen.tsx` |
| Notificaciones | `Notifications` (app stack) | `features/social/screens/NotificationsScreen.tsx` |
| Perfil de otra persona | `PublicProfile` (app stack) | `features/social/screens/PublicProfileScreen.tsx` |

There is no `screens/tabs/SocialTabScreen.tsx` any more — `TabNavigator` mounts `SocialScreen`
directly, like `LessonScreen` in `features/courses`.

## SocialScreen

Wine `ScreenHeader` (`tone={colors.socialWine}`) with the background-less bell (unread badge from
`notificationsApi.getUnreadCount()`) and two stat tiles: **Amigos** and **Solicitudes**. The header is
the shared one — same title size, description, top-right bubble and `minHeight` as every other screen.

> The mockup's second tile was a **Ranking** (`#3`). The backend has no leaderboard at all, and
> ranking was explicitly deferred to a later iteration, so the tile shows pending requests instead.

Two tabs below the header, rendered by the shared `SegmentedControl` (full width, black active
state); the **Mis amigos / Solicitudes** sub-selector uses `SubTabs`:

### Feed

`GET /friendships/events` → one `FeedCard` per event. Events are **not stored** server-side: they
are derived from each friend's recent achievements and learned signs, and identified by the pair
(`eventType`, `eventRefId`) — that pair is also the React key and what the like endpoints address.

The card composes its Spanish sentence from `subject` + `context` via `eventSentence()`; the backend
sends the raw pieces, not a rendered string, so the copy stays in the UI layer.

The like button is **stateless in the UI**: it has no counter, only on/off. Tapping it flips
`liked` optimistically, calls `POST`/`DELETE /friendships/events/{type}/{refId}/like`, and reverts
plus toasts **on failure only** — a successful like is silent, the filled heart is the feedback. The
like notifies the event's owner (`FRIEND_EVENT_LIKED`).

### Amigos

A search box on top; below it, either the search results or the browse view — never both, matching
the mockup.

- **Search** (`GET /users/search?query=`): debounced 350 ms, min 2 chars (the backend rejects
  shorter), previous request aborted via `AbortSignal`. Each result already carries `relation` and
  `mutualFriends`, so the row renders the right buttons without a second call.
- **Browse**: sub-tabs *Mis amigos* (`GET /friendships`) and *Solicitudes*, the latter split into
  *Recibidas* (`GET /friendships/requests`) and *Enviadas* (`GET /friendships/requests/sent`).

Friend rows show streak (flame) and total XP (bolt) — those come from the enriched `FriendResponse`.
Search and request rows show no stats, only the handle plus the relation or the mutual-friend count.

## Actions per relation

The buttons on a row are a pure function of the relation, identical to the mockup:

| Relation | Buttons |
|---|---|
| `FRIEND` | dejar de ser amigos · bloquear |
| `INCOMING` | aceptar · rechazar |
| `OUTGOING` | cancelar · bloquear |
| `BLOCKED` | desbloquear |
| `NONE` | agregar · bloquear |

`BLOCKED_BY` never reaches the client: the backend filters those users out of search results.

Destructive actions (*dejar de ser amigos*, *bloquear*) go through `ConfirmSheet`, a bottom sheet.
Every action shows a spinner on its own button (`busyAction` is keyed `"<userId>:<action>"`).

Toasts are for what the UI cannot show on its own: sending, cancelling or rejecting a request,
unblocking, and any failure. **Liking and accepting a request stay silent** — the filled heart and
the row moving into the friends list already say it happened.

State after an action is patched locally rather than refetching everything; accepting a request is
the exception — it refetches `GET /friendships` because the new friend's stats are only known
server-side.

## NotificationsScreen

`GET /notifications` (Spring page; the screen reads the first page). **Opening the inbox marks it
read**: if anything was unread it calls `PATCH /notifications/read-all`, so the bell badge clears
when the user comes back. An unread row is marked **only by the wine dot on its right** — no tinted
background, which read as noisy.

Icon and colors per `code` come from `notificationVisual()` in `features/social/people.ts`; unknown
codes fall back to a neutral bell, so a new backend code never breaks the list.

## PublicProfileScreen

Reached by **tapping anyone's avatar** — in a feed card, a friend row, a search result or a request
row. `Avatar` becomes touchable only when given an `onPress`, so the same component stays inert
where there is nowhere to go.

`GET /users/{username}` returns the whole screen in one call. It mirrors `ProfileScreen`'s layout —
tinted header with the user's own `profileHeaderColor`, avatar with streak badge, icon tab bar —
but is read-only and drops the **Inventario** section: gems, lives and boosters are the viewer's own
wallet, not public progress. Three sections remain: **General** (stats + weekly XP chart), **Cursos**
and **Logros**.

The header carries one friendship action, derived from `relation` exactly like a `PersonRow`:
agregar / cancelar solicitud / aceptar solicitud / desbloquear, and for an existing friend a
*Amigos* button that opens the same `ConfirmSheet` used elsewhere.

A private account the viewer isn't friends with comes back with `visible: false`. The screen then
shows identity plus the friendship action over an "esta cuenta es privada" state — deliberately not
a 404, so someone found through search can still be added.

Courses and achievements are typed against the **real** backend shapes (`PublicCourseProgress`,
`PublicAchievement`), not the mismatched `CourseProgress` / `Achievement` types in
`src/api/learning.ts` and `src/api/achievements.ts` — see [../status.md](../status.md). Course
colours are derived from list position since the backend sends none.

## Shared helpers — `features/social/people.ts`

`avatarColors()` (stable per user id, so the same person keeps their color across screens),
`initialsOf()`, `relativeTime()`, `formatXp()`, `eventVisual()`, `eventSentence()`,
`notificationVisual()`, `mutualLabel()`.

## Components — `features/social/components/`

`Avatar`, `PersonRow` (+ `RowAction`), `FeedCard`, `ConfirmSheet`, `Toast`.
`EmptyState` / `EmptyNote` now live in `@/components/EmptyState` (the local file only re-exports them);
the header comes from `@/components/ScreenHeader`.

## Not implemented

- **Ranking / leaderboard.** Deferred; no backend support exists.
- **Like counts.** Intentionally dropped — the button is on/off only.
