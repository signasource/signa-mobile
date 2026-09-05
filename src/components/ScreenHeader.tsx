import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";
import { isLightColor } from "@/utils/color";

/** One metric inside the header strip: uppercase label on top, icon + value below. */
export interface HeaderStat {
  key: string;
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface ScreenHeaderProps {
  title: string;
  /** One-line description under the title. Omitted on compact headers. */
  description?: string;
  /** Safe-area top inset already added by the caller. */
  paddingTop: number;
  /** Header background. Foreground and tints are derived from it. */
  tone: string;
  stats?: HeaderStat[];
  left?: React.ReactNode;
  right?: React.ReactNode;
  children?: React.ReactNode;
  /**
   * Drops the shared minimum height so the header hugs its content. Used by
   * secondary screens (Configuración, Notificaciones), which show only a title
   * and therefore all end up at the same compact height.
   */
  compact?: boolean;
}

/**
 * Colored hero header shared by every top-level screen: same title size, a
 * description, a bubble in the top-right corner, and an optional stats strip.
 * `MIN_CONTENT_HEIGHT` keeps all of them at the same height even when a screen
 * has no stats to show; `compact` opts out of it for title-only headers.
 */
const MIN_CONTENT_HEIGHT = 186;

export function ScreenHeader({
  title,
  description,
  paddingTop,
  tone,
  stats,
  left,
  right,
  children,
  compact = false,
}: ScreenHeaderProps) {
  const light = isLightColor(tone);
  const fg = light ? colors.neutral900 : colors.onDark;
  const tint = light ? "rgba(0,0,0,0.06)" : "rgba(255,255,255,0.16)";
  const bubble = light ? "rgba(0,0,0,0.04)" : "rgba(255,255,255,0.09)";

  return (
    <View
      style={[
        styles.header,
        { backgroundColor: tone, paddingTop },
        compact
          ? styles.headerCompact
          : { minHeight: paddingTop + MIN_CONTENT_HEIGHT },
      ]}
    >
      <View style={[styles.bubble, { backgroundColor: bubble }]} />

      <View style={styles.row}>
        {left}
        <View style={styles.titles}>
          <Text style={[styles.title, { color: fg }]} numberOfLines={1}>
            {title}
          </Text>
          {!!description && (
            <Text style={[styles.description, { color: fg }]} numberOfLines={2}>
              {description}
            </Text>
          )}
        </View>
        {right}
      </View>

      {stats && stats.length > 0 && (
        <View style={styles.stats}>
          {stats.map((stat) => (
            <View key={stat.key} style={[styles.statCard, { backgroundColor: tint }]}>
              <Text style={[styles.statLabel, { color: fg }]} numberOfLines={1}>
                {stat.label.toUpperCase()}
              </Text>
              <View style={styles.statValueRow}>
                <Ionicons name={stat.icon} size={17} color={fg} />
                <Text style={[styles.statValue, { color: fg }]} numberOfLines={1}>
                  {stat.value}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    overflow: "hidden",
  },
  bubble: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
  },
  headerCompact: {
    paddingBottom: 14,
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
    lineHeight: 38,
    letterSpacing: -1,
  },
  description: {
    fontFamily: fonts.bodyMedium,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.88,
    marginTop: 6,
    minHeight: 40,
    maxWidth: 300,
  },
  stats: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 11,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 0.8,
    opacity: 0.75,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  statValue: {
    fontFamily: fonts.displayBold,
    fontSize: 21,
  },
});
