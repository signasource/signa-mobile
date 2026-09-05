import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { FriendEvent } from "@/api/social";
import { eventSentence, eventVisual, relativeTime } from "@/features/social/people";
import { Avatar } from "./Avatar";

interface Props {
  event: FriendEvent;
  onToggleLike: () => void;
  onPressAvatar: () => void;
}

export function FeedCard({ event, onToggleLike, onPressAvatar }: Props) {
  const visual = eventVisual(event.eventType);
  const sentence = eventSentence(event);

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar
          id={event.friendId}
          name={event.friendName}
          username={event.friendUsername}
          size={42}
          onPress={onPressAvatar}
        />

        <View style={styles.identity}>
          <Text style={styles.name} numberOfLines={1}>
            {event.friendName}
          </Text>
          <Text style={styles.handle} numberOfLines={1}>
            @{event.friendUsername} · {relativeTime(event.createdAt)}
          </Text>
        </View>

        <View style={[styles.badge, { backgroundColor: visual.tint }]}>
          <Ionicons name={visual.icon} size={18} color={visual.tone} />
        </View>
      </View>

      <Text style={styles.sentence}>
        {sentence.pre} <Text style={styles.highlight}>{sentence.highlight}</Text>
        {sentence.post ? ` ${sentence.post}` : ""}
      </Text>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.like, event.liked && styles.likeOn]}
          onPress={onToggleLike}
          accessibilityRole="button"
          accessibilityLabel={event.liked ? "Quitar me gusta" : "Me gusta"}
        >
          <Ionicons
            name={event.liked ? "heart" : "heart-outline"}
            size={15}
            color={event.liked ? colors.socialWine : colors.textMuted}
          />
          <Text style={[styles.likeLabel, event.liked && styles.likeLabelOn]}>Me gusta</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14.5,
    color: colors.text,
  },
  handle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  sentence: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.text,
    marginTop: 11,
  },
  highlight: {
    fontFamily: fonts.bodyBold,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  like: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 11,
    paddingVertical: 9,
    paddingHorizontal: 13,
    backgroundColor: colors.fill,
  },
  likeOn: {
    backgroundColor: colors.socialWineLight,
  },
  likeLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  likeLabelOn: {
    color: colors.socialWine,
  },
});
