import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { InfoConfig } from "@/features/courses/lessonContent.types";
import { LessonButton } from "../LessonButton";
import { MythDeck } from "./MythDeck";
import { renderTextWithLinks } from "./richText";

interface InfoBlockProps {
  config: InfoConfig;
  onContinue: () => void;
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function isCitation(paragraph: string): boolean {
  return paragraph.startsWith("*") && paragraph.endsWith("*");
}

export function InfoBlock({ config, onContinue }: InfoBlockProps) {
  const paragraphs = splitParagraphs(config.text);
  const hasMyths = !!config.myths?.length;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.tag}>
          <Ionicons name={hasMyths ? "alert-circle-outline" : "book-outline"} size={13} color={colors.primaryDark} />
          <Text style={styles.tagText}>{hasMyths ? `MITOS · ${config.myths!.length}` : "LECTURA"}</Text>
        </View>

        <Text style={styles.title}>{config.title}</Text>

        <View style={styles.paragraphs}>
          {paragraphs.map((paragraph, index) =>
            isCitation(paragraph) ? (
              <Text key={index} style={styles.citation}>
                {renderTextWithLinks(paragraph.replace(/^\*|\*$/g, ""), styles.link)}
              </Text>
            ) : (
              <Text key={index} style={styles.paragraph}>
                {renderTextWithLinks(paragraph, styles.link)}
              </Text>
            )
          )}
        </View>

        {hasMyths && <MythDeck myths={config.myths!} onFinished={onContinue} />}
      </ScrollView>

      <View style={styles.footer}>
        <LessonButton label="Continuar" onPress={onContinue} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, gap: 14, paddingBottom: 12 },
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
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 27,
    lineHeight: 32,
    letterSpacing: -0.9,
    color: colors.text,
  },
  paragraphs: { gap: 14 },
  paragraph: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: "#3D332E",
    textAlign: "justify",
  },
  citation: {
    marginTop: 4,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.primaryMedallion,
    fontFamily: fonts.bodyRegular,
    fontStyle: "italic",
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: "justify",
  },
  link: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryDark,
    textDecorationLine: "underline",
  },
  footer: { padding: 20, paddingTop: 14 },
});
