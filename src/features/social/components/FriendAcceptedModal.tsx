import React from "react";
import { Modal, View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts, fontSizes } from "@/theme";
import { PendingFriendAccepted } from "@/context/FriendAcceptedContext";
import Ovejas from "@assets/ilus/ovejas.svg";

const SKY_BLUE = "#D6EFFA";
// Aspect ratio of the OVEJAS.svg viewBox (width 1072.5 / height 932.23)
const OVEJAS_RATIO = 1072.5 / 932.23;

const CARD_WIDTH = 320;
const ILLUSTRATION_HEIGHT = Math.round(CARD_WIDTH / OVEJAS_RATIO);

interface Props {
  pending: PendingFriendAccepted | null;
  isInLesson: boolean;
  onDismiss: () => void;
  onSendGift: () => void;
  onViewProfile: (username: string) => void;
}

export function FriendAcceptedModal({
  pending,
  isInLesson,
  onDismiss,
  onSendGift,
  onViewProfile,
}: Props) {
  const insets = useSafeAreaInsets();
  const visible = pending !== null && !isInLesson;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={[styles.overlay, { paddingBottom: insets.bottom + 20 }]} onPress={onDismiss}>
        <Pressable style={styles.card} onPress={() => {}}>
          {/* Illustration section — sky blue top */}
          <View style={[styles.illustrationWrap, { height: ILLUSTRATION_HEIGHT }]}>
            <Ovejas width={CARD_WIDTH} height={ILLUSTRATION_HEIGHT} />
          </View>

          {/* Text + buttons section */}
          <View style={styles.body}>
            <Text style={styles.title}>{pending?.friendName} te aceptó</Text>
            <Text style={styles.subtitle}>
              Ahora son amigos. Podés mandarle un regalo o ver en qué anda.
            </Text>

            <Button
              label="Mandarle un regalo"
              onPress={() => {
                onDismiss();
                onSendGift();
              }}
              style={styles.button}
            />
            <Button
              label="Ver su perfil"
              variant="secondary"
              onPress={() => {
                onDismiss();
                onViewProfile(pending?.friendUsername ?? "");
              }}
              style={StyleSheet.flatten([styles.button, styles.buttonTransparent]) as ViewStyle}
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    paddingHorizontal: 20,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: colors.surface,
    borderRadius: 20,
    overflow: "hidden",
  },
  illustrationWrap: {
    width: CARD_WIDTH,
    backgroundColor: SKY_BLUE,
    overflow: "hidden",
  },
  body: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
    color: colors.text,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
  },
  button: {
    width: "100%",
    paddingVertical: 18,
    marginBottom: 10,
  },
  buttonTransparent: {
    backgroundColor: "transparent",
  },
});
