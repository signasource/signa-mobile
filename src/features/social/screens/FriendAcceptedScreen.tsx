import React from "react";
import { View, ScrollView, StyleSheet, useWindowDimensions, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Pressable } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { Avatar } from "@/features/social/components/Avatar";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import Ovejas from "@assets/ilus/ovejas.svg";

type Props = NativeStackScreenProps<AppStackParamList, "FriendAccepted">;

const SKY_BLUE = "#D6EFFA";
const OVEJAS_RATIO = 1072.5 / 932.23;

export function FriendAcceptedScreen({ navigation, route }: Props) {
  const { friendId, friendName, friendUsername, friendStreak } = route.params;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const illustrationHeight = Math.round(width / OVEJAS_RATIO);

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.closeButton, { top: insets.top + 12 }]}
        onPress={() => navigation.goBack()}
        hitSlop={16}
        accessibilityRole="button"
        accessibilityLabel="Cerrar"
      >
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.illustrationWrap, { height: illustrationHeight }]}>
          <Ovejas width={width} height={illustrationHeight} />
        </View>

        <View style={styles.body}>
          <View style={styles.topContent}>
            <Text style={styles.title}>{friendName} y vos ya son amigos</Text>
            <Text style={styles.subtitle}>
              Vas a ver los logros de {friendName} en tu feed, y ella los tuyos.
            </Text>

            <View style={styles.card}>
              <Avatar id={friendId} name={friendName} username={friendUsername} size={44} />
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{friendName}</Text>
                <Text style={styles.cardUsername}>@{friendUsername}</Text>
              </View>
              <View style={styles.streak}>
                <Ionicons name="flame" size={16} color={colors.streakOrange} />
                <Text style={styles.streakLabel}>{friendStreak}</Text>
              </View>
            </View>
          </View>

          <View style={styles.buttons}>
            <Button
              label="Ver su perfil"
              onPress={() => navigation.navigate("PublicProfile", { username: friendUsername })}
              style={styles.button}
            />
            <Button
              label="Volver a notificaciones"
              variant="secondary"
              onPress={() => navigation.goBack()}
              style={StyleSheet.flatten([styles.button, styles.buttonTransparent]) as ViewStyle}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SKY_BLUE,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    zIndex: 10,
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flexGrow: 1,
  },
  illustrationWrap: {
    width: "100%",
    overflow: "hidden",
  },
  body: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 28,
    justifyContent: "space-between",
  },
  topContent: {
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 30,
    color: colors.text,
    textAlign: "center",
    lineHeight: 38,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
    opacity: 0.65,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  cardInfo: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.text,
  },
  cardUsername: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 1,
  },
  streak: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  streakLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
  },
  buttons: {
    gap: 10,
    marginTop: 28,
  },
  button: {
    width: "100%",
    paddingVertical: 18,
  },
  buttonTransparent: {
    backgroundColor: "transparent",
  },
});
