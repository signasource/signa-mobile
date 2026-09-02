import React, { useState } from "react";
import { View, Pressable, ScrollView, StyleSheet, StatusBar } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { onboardingStorage } from "../storage";
import { DailyGoalMinutes } from "../types";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "DailyGoal">;

const OPTIONS: { value: DailyGoalMinutes; label: string; sub: string; popular?: boolean }[] = [
  { value: 5, label: "5 min", sub: "Empezamos tranqui" },
  { value: 10, label: "10 min", sub: "Un ritmo constante", popular: true },
  { value: 15, label: "15 min", sub: "Aprendizaje intensivo" },
  { value: 20, label: "20 min", sub: "Totalmente dedicado/a" },
];

export function DailyGoalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<DailyGoalMinutes>(10);

  async function handleContinue() {
    await onboardingStorage.saveData({ dailyGoal: selected ?? 10 });
    navigation.navigate("Experience");
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
          <Text style={styles.overline}>Tu meta diaria</Text>
          <Text style={styles.heading}>¿Cuánto querés practicar por día?</Text>
          <Text style={styles.body}>Elegí una meta cómoda. La cambiás cuando quieras.</Text>
        </View>

        <View style={styles.options}>
          {OPTIONS.map((opt) => {
            const isSelected = selected === opt.value;
            return (
              <Pressable
                key={opt.value}
                onPress={() => setSelected(opt.value)}
                style={({ pressed }) => [
                  styles.option,
                  isSelected && styles.optionSelected,
                  pressed && styles.optionPressed,
                ]}
              >
                <View style={styles.optionText}>
                  <View style={styles.optionLabelRow}>
                    <Text style={styles.optionLabel}>{opt.label}</Text>
                    {opt.popular && (
                      <View style={styles.popularBadge}>
                        <Text style={styles.popularText}>★ Recomendado</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.optionSub}>{opt.sub}</Text>
                </View>
                <View style={[styles.check, isSelected && styles.checkSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </Pressable>
            );
          })}
        </View>

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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 0,
    elevation: 0,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  optionPressed: { opacity: 0.88 },
  optionText: { flex: 1 },
  optionLabelRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  optionLabel: { fontFamily: fonts.bodySemiBold, fontSize: 17, color: colors.text },
  popularBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 999,
  },
  popularText: {
    fontFamily: fonts.bodyBold,
    fontSize: 10.5,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    color: colors.primaryDark,
  },
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
