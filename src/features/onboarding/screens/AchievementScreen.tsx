import React from "react";
import { View, Text, Pressable, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { onboardingStorage } from "../storage";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Achievement">;

export function AchievementScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  async function handleCreateAccount() {
    try {
      await onboardingStorage.complete();
    } catch {
      // proceed even if storage fails; worst case onboarding re-shows on next cold start
    }
    navigation.navigate("Register");
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Blobs */}
      <View style={styles.blob} />

      <View style={[styles.content, { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 }]}>
        {/* Progress bar */}
        <View style={styles.progressRow}>
          {navigation.canGoBack() && (
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={8}
              style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
            >
              <View style={styles.backArrow} />
            </Pressable>
          )}
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <Text style={styles.progressLabel}>100%</Text>
        </View>

        {/* Achievement badge */}
        <View style={styles.badgeRow}>
          <Text style={styles.starIcon}>★</Text>
          <Text style={styles.badgeText}>Logro desbloqueado</Text>
        </View>

        {/* Streak fire */}
        <View style={styles.avatarSection}>
          <View style={styles.pulseRing} />
          <View style={styles.avatarCircle}>
            <Text style={styles.fireEmoji}>🔥</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>¡Lo lograste!</Text>
        <Text style={styles.subheading}>
          Completaste tu perfil de aprendizaje. Ahora creá tu cuenta para empezar a practicar.
        </Text>

        {/* CTA */}
        <Pressable
          onPress={handleCreateAccount}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnLabel}>Crear mi cuenta</Text>
          <Text style={styles.btnArrow}>→</Text>
        </Pressable>

        {/* Login link */}
        <Text style={styles.loginHint}>
          ¿Ya tenés cuenta?{" "}
          <Text style={styles.loginLink} onPress={() => navigation.reset({ index: 0, routes: [{ name: "Login" }] })}>
            Iniciá sesión
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primary,
  },
  blob: {
    position: "absolute",
    top: -80,
    left: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
    alignItems: "center",
  },
  progressRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  backBtnPressed: {
    backgroundColor: "rgba(255,255,255,0.32)",
  },
  backArrow: {
    width: 9,
    height: 9,
    borderLeftWidth: 2.2,
    borderBottomWidth: 2.2,
    borderColor: colors.onPrimary,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },
  progressTrack: {
    flex: 1,
    height: 9,
    backgroundColor: "rgba(255,255,255,0.28)",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: {
    width: "100%",
    height: "100%",
    backgroundColor: colors.onPrimary,
    borderRadius: 99,
  },
  progressLabel: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 14,
    color: colors.onPrimary,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    marginTop: 26,
    backgroundColor: colors.onPrimary,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 6,
  },
  starIcon: {
    fontSize: 15,
    color: colors.primaryDark,
  },
  badgeText: {
    fontFamily: fonts.bodyBold,
    fontSize: 13,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.primaryDark,
  },
  avatarSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 6,
  },
  pulseRing: {
    position: "absolute",
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 206,
    height: 206,
    borderRadius: 103,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fireEmoji: {
    fontSize: 120,
    lineHeight: 140,
    textAlign: "center",
  },
  headline: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    color: colors.onPrimary,
    letterSpacing: -1,
    textAlign: "center",
    marginBottom: 10,
  },
  subheading: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onPrimary,
    textAlign: "center",
    opacity: 0.9,
    marginBottom: 26,
  },
  btn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 58,
    backgroundColor: colors.text,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  btnPressed: { opacity: 0.88 },
  btnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  btnArrow: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onDark },
  loginHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.onPrimary,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.9,
  },
  loginLink: {
    fontFamily: fonts.bodyBold,
    textDecorationLine: "underline",
  },
});
