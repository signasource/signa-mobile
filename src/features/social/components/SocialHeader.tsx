import React from "react";
import { View, StyleSheet } from "react-native";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";

interface Props {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
  left?: React.ReactNode;
  children?: React.ReactNode;
  paddingTop: number;
}

export function SocialHeader({ title, subtitle, right, left, children, paddingTop }: Props) {
  return (
    <View style={[styles.header, { paddingTop }]}>
      <View style={styles.blob} />

      <View style={styles.row}>
        {left}
        <View style={styles.titles}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {right}
      </View>

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    // Vertical metrics match the Tienda header; horizontal stays at 20 to align with the content.
    backgroundColor: colors.socialWine,
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  blob: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.socialWineDeep,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  titles: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xxl,
    letterSpacing: -1,
    color: colors.onDark,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onDark,
    opacity: 0.88,
    marginTop: 8,
    maxWidth: 280,
  },
});
