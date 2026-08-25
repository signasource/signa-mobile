import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme";

export function CoursesTabScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.placeholder}>Pantalla de Cursos</Text>
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
