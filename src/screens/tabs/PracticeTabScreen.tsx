import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

export function PracticeTabScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Pantalla de Práctica</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    fontFamily: fonts.bodyRegular,
    fontSize: 18,
    color: colors.textMuted,
  },
});
