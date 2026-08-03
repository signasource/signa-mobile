import React from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Intro">;

export function IntroScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.wrapper}>
      <StatusBar barStyle="dark-content" />
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.progressSpacer} />

        {/* Lisa card */}
        <View style={styles.card}>
          <View style={styles.circleTopRight} />
          <View style={styles.circleTopLeft} />
          <View style={styles.lisaPlaceholder}>
            {/* Placeholder de Lisa */}
            <Text style={styles.lisaPlaceholderText}>Lisa</Text>
          </View>
          {/* Name badge */}
          <View style={styles.badge}>
            <View style={styles.badgeAvatar}>
              <Text style={styles.badgeAvatarText}>L</Text>
            </View>
            <View>
              <Text style={styles.badgeName}>Lisa</Text>
              <Text style={styles.badgeSub}>Tu guía en LSA</Text>
            </View>
          </View>
        </View>

        {/* Text content */}
        <View style={styles.textBlock}>
          <Text style={styles.overline}>Conocé a Lisa</Text>
          <Text style={styles.heading}>Tu guía 👋</Text>
          <Text style={styles.body}>
            Signa es la app para aprender{" "}
            <Text style={styles.bold}>Lengua de Señas Argentina</Text> jugando.
          </Text>
          <Text style={[styles.body, styles.bodySpacing]}>
            Y no estás solo/a:{" "}
            <Text style={styles.bold}>Lisa</Text>, tu guía en 3D, te acompaña y te enseña cada seña
            con animaciones.
          </Text>
        </View>

        {/* CTA */}
        <Pressable
          onPress={() => navigation.navigate("DailyGoal")}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnLabel}>Vamos</Text>
          <Text style={styles.btnArrow}>→</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 30,
  },
  progressSpacer: {
    height: 44,
  },
  card: {
    marginTop: 20,
    width: "100%",
    height: 306,
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: colors.primaryLight,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  circleTopRight: {
    position: "absolute",
    top: -42,
    right: -38,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.4)",
  },
  circleTopLeft: {
    position: "absolute",
    top: 22,
    left: -30,
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  lisaPlaceholder: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  lisaPlaceholderText: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 40,
    color: colors.white,
    opacity: 0.8,
  },
  badge: {
    position: "absolute",
    left: 16,
    bottom: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 15,
    borderRadius: 999,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 6,
  },
  badgeAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeAvatarText: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.white,
  },
  badgeName: {
    fontFamily: fonts.bodyBold,
    fontSize: 15,
    color: colors.text,
    lineHeight: 18,
  },
  badgeSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 14,
  },
  textBlock: {
    marginTop: 20,
  },
  overline: {
    fontFamily: fonts.bodyBold,
    fontSize: 12,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    color: colors.primary,
    marginBottom: 8,
  },
  heading: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 30,
    lineHeight: 32,
    color: colors.text,
    letterSpacing: -0.9,
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15.5,
    lineHeight: 24,
    color: colors.textMuted,
  },
  bodySpacing: {
    marginTop: 12,
  },
  bold: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  btn: {
    marginTop: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    minHeight: 58,
    backgroundColor: colors.text,
    borderRadius: 18,
    paddingHorizontal: 16,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 6,
  },
  btnPressed: {
    opacity: 0.88,
  },
  btnLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },
  btnArrow: {
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.onDark,
  },
});
