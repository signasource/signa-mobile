import React, { useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, StatusBar } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { onboardingStorage } from "../storage";
import { MotivationReason } from "../types";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Motivation">;

const OPTIONS: { value: MotivationReason; emoji: string; label: string }[] = [
  { value: "family", emoji: "🤝", label: "Comunicarme con familia/amigos" },
  { value: "work", emoji: "💼", label: "Trabajo o estudio" },
  { value: "curiosity", emoji: "✨", label: "Solo quiero aprender" },
  { value: "inclusion", emoji: "❤️", label: "Inclusión y empatía" },
];

export function MotivationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<MotivationReason[]>([]);
  const [error, setError] = useState(false);

  function toggle(val: MotivationReason) {
    setError(false);
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((r) => r !== val) : [...prev, val]
    );
  }

  async function handleContinue() {
    if (selected.length === 0) {
      setError(true);
      return;
    }
    await onboardingStorage.saveData({ reasons: selected });
    navigation.navigate("Achievement");
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
          <Text style={styles.overline}>Tu porqué</Text>
          <Text style={styles.heading}>¿Qué te trae a Signa?</Text>
          <Text style={styles.body}>Elegí lo que quieras. Nos importa tu motivación.</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.value);
            return (
              <Pressable
                key={opt.value}
                onPress={() => toggle(opt.value)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text style={styles.emoji}>{opt.emoji}</Text>
                <Text style={styles.optionLabel}>{opt.label}</Text>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

        {error && (
          <Text style={styles.errorText}>Elegí al menos una opción</Text>
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
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  optionSelected: {
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionPressed: { opacity: 0.88 },
  emoji: { fontSize: 24, lineHeight: 28 },
  optionLabel: { flex: 1, fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.text },
  check: {
    width: 27,
    height: 27,
    borderRadius: 9,
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
  },
  btnPressed: { opacity: 0.88 },
  btnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  btnArrow: { fontFamily: fonts.bodyBold, fontSize: 18, color: colors.onDark },
});
