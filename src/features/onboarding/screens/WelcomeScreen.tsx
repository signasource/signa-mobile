import React from "react";
import { View, Pressable, StyleSheet, StatusBar } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { SignaLogo } from "@/components/SignaLogo";
import { colors, fonts, fontSizes } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Welcome">;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Blobs */}
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />

      <View style={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }]}>
        {/* Logo */}
        <View style={styles.logoRow}>
          <SignaLogo size={38} barColor={colors.primary} bgColor={colors.onPrimary} />
          <Text style={styles.logoText}>Signa</Text>
        </View>

        {/* Lisa avatar */}
        <View style={styles.avatarContainer}>
          <View style={styles.pulseRing} />
          <View style={styles.avatarCircle}>
            {/* Placeholder de Lisa */}
            <Text style={styles.lisaPlaceholderText}>Lisa</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>Aprendé señas,{"\n"}jugando.{"\n"}</Text>

        {/* CTA */}
        <Pressable
          onPress={() => navigation.navigate("Intro")}
          style={({ pressed }) => [styles.ctaBtn, pressed && styles.ctaBtnPressed]}
        >
          <Text style={styles.ctaLabel}>Empezá tu aventura</Text>
          <View style={styles.ctaIcon}>
            <Text style={styles.ctaArrow}>→</Text>
          </View>
        </Pressable>

        {/* Login link */}
        <Text style={styles.loginHint}>
          ¿Ya tenés cuenta?{" "}
          <Text style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
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
  blobTop: {
    position: "absolute",
    top: -90,
    left: -70,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  blobBottom: {
    position: "absolute",
    bottom: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  content: {
    flex: 1,
    paddingHorizontal: 30,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
  },
  logoText: {
    fontFamily: fonts.displayBold,
    fontSize: 22,
    color: colors.onPrimary,
    letterSpacing: -0.4,
  },
  avatarContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 272,
    height: 272,
    borderRadius: 136,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
  },
  avatarCircle: {
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: colors.primaryMedallion,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 30 },
    shadowOpacity: 0.28,
    shadowRadius: 25,
    elevation: 12,
  },
  lisaPlaceholderText: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 34,
    color: colors.onPrimary,
    opacity: 0.85,
  },
  headline: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 40,
    lineHeight: 42,
    color: colors.onPrimary,
    letterSpacing: -1.2,
    marginBottom: 22,
  },
  ctaBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.text,
    borderRadius: 999,
    paddingLeft: 32,
    paddingRight: 9,
    paddingVertical: 9,
    minHeight: 66,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 10,
  },
  ctaBtnPressed: {
    opacity: 0.9,
  },
  ctaLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 17.5,
    color: colors.onDark,
  },
  ctaIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaArrow: {
    color: colors.text,
    fontSize: 20,
    fontFamily: fonts.bodyBold,
  },
  loginHint: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.onPrimary,
    textAlign: "center",
    marginTop: 16,
    opacity: 0.92,
  },
  loginLink: {
    fontFamily: fonts.bodyBold,
    textDecorationLine: "underline",
  },
});
