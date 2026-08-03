import React, { useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { onboardingStorage } from "../storage";
import { ExperienceLevel } from "../types";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Experience">;

const OPTIONS: { value: ExperienceLevel; emoji: string; label: string; sub: string }[] = [
  { value: "novice", emoji: "🌱", label: "Nunca lo vi", sub: "Empiezo desde cero" },
  { value: "some", emoji: "🌿", label: "Algo sé", sub: "Conozco algunas señas" },
  { value: "fluent", emoji: "🌳", label: "Ya lo uso", sub: "Me comunico en LSA" },
];

export function ExperienceScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<ExperienceLevel | null>(null);
  const [error, setError] = useState(false);

  async function handleContinue() {
    if (!selected) {
      setError(true);
      return;
    }
    await onboardingStorage.saveData({ level: selected });
    navigation.navigate("Motivation");
  }

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

        <View style={styles.textBlock}>
          <Text style={styles.overline}>Tu punto de partida</Text>
          <Text style={styles.heading}>¿Ya conocés la lengua de señas?</Text>
          <Text style={styles.body}>Nos interesa saber cuál es tu nivel.</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => { setSelected(opt.value); setError(false); }}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <View style={styles.optionText}>
                  <Text style={styles.optionLabel}>{opt.label}</Text>
                  <Text style={styles.optionSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text style={styles.errorText}>Elegí una opción para continuar</Text>
        )}

        <Pressable
          onPress={handleContinue}
          style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        >
          <Text style={styles.btnLabel}>Continuar</Text>
          <Text style={styles.btnArrow}>→</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 30 },
  progressSpacer: { height: 44 },
  textBlock: { marginTop: 26 },
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
    marginBottom: 8,
  },
  body: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  options: { marginTop: 22, gap: 11 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.fill,
    borderRadius: 18,
    paddingVertical: 17,
    paddingHorizontal: 18,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionPressed: { opacity: 0.88 },
  emoji: { fontSize: 26, lineHeight: 30 },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.text },
  optionSub: { fontFamily: fonts.bodyMedium, fontSize: 13.5, color: colors.textMuted, marginTop: 2 },
  check: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  checkMark: { color: colors.white, fontSize: 14, fontFamily: fonts.bodyBold },
  errorText: {
    marginTop: 12,
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    color: colors.primaryDark,
    textAlign: "center",
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
  btnPressed: { opacity: 0.88 },
  btnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  btnArrow: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onDark },
});
