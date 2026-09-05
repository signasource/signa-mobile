import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { IntroduceSignConfig } from "@/features/courses/lessonContent.types";
import { SignAnimation } from "../SignAnimation";
import { LessonButton } from "../LessonButton";

interface IntroduceSignBlockProps {
  config: IntroduceSignConfig;
  onContinue: () => void;
}

export function IntroduceSignBlock({ config, onContinue }: IntroduceSignBlockProps) {
  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.tag}>
          <Ionicons name="hand-left-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.tagText}>NUEVA SEÑA</Text>
        </View>

        <Text style={styles.word}>{config.word}</Text>

        <SignAnimation meaning={config.meaning} label={config.word} height={340} />
      </View>

      <View style={styles.footer}>
        <LessonButton label="Continuar" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: colors.primaryLight,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.primaryDark,
  },
  word: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -1,
    color: colors.text,
  },
  footer: { padding: 20, paddingTop: 14 },
});
