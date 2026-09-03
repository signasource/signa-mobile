import React, { useCallback, useEffect, useState } from "react";
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { AppNotification, notificationsApi } from "@/api/notifications";
import { notificationVisual, relativeTime } from "@/features/social/people";
import { SocialHeader } from "@/features/social/components/SocialHeader";
import { EmptyState } from "@/features/social/components/EmptyState";

type Props = NativeStackScreenProps<AppStackParamList, "Notifications">;

export function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const { data } = await notificationsApi.getInbox();
      setNotifications(data.content);
      // Opening the inbox counts as reading it, so the bell badge clears.
      if (data.content.some((n) => !n.read)) {
        await notificationsApi.markAllAsRead();
      }
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos cargar tus notificaciones.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <View style={styles.container}>
      <SocialHeader
        title="Notificaciones"
        subtitle="Me gusta, logros de tus amigos y solicitudes."
        paddingTop={insets.top + 14}
        left={
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="Volver"
          >
            <Ionicons name="arrow-back" size={21} color={colors.onDark} />
          </TouchableOpacity>
        }
      />

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
      ) : notifications.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="notifications-outline"
            title="Sin notificaciones"
            description="Acá vas a ver los me gusta, las solicitudes y los logros de tus amigos."
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
        >
          {notifications.map((notification) => {
            const visual = notificationVisual(notification.code);
            const unread = !notification.read;

            return (
              <View key={notification.id} style={styles.row}>
                <View style={[styles.iconBox, { backgroundColor: visual.tint }]}>
                  <Ionicons name={visual.icon} size={17} color={visual.tone} />
                </View>

                <View style={styles.body}>
                  <Text style={styles.title}>{notification.title}</Text>
                  <Text style={styles.text}>{notification.body}</Text>
                  <Text style={styles.time}>{relativeTime(notification.sentAt)}</Text>
                </View>

                {unread && <View style={styles.dot} />}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  back: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 6,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 11,
    paddingVertical: 13,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  text: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.text,
  },
  time: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 3,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.socialWine,
    marginTop: 6,
  },
});
