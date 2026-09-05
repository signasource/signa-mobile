import React from "react";
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

export interface Segment<K extends string> {
  key: K;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Small counter drawn next to the label (hidden when 0). */
  badge?: number;
}

interface SegmentedControlProps<K extends string> {
  options: ReadonlyArray<Segment<K>>;
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Primary selector (Vidas/Potenciadores/Especiales, Feed/Amigos, …).
 * The group always spans the full width; rounded rectangles like Social, black
 * active state like the Tienda.
 */
export function SegmentedControl<K extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<K>) {
  return (
    <View style={[styles.row, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.segment, active && styles.segmentActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            {option.icon && (
              <Ionicons
                name={option.icon}
                size={15}
                color={active ? colors.onDark : colors.textMuted}
              />
            )}
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
            {!!option.badge && (
              <View style={[styles.badge, active && styles.badgeActive]}>
                <Text style={[styles.badgeLabel, active && styles.badgeLabelActive]}>
                  {option.badge}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 8,
  },
  segment: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 38,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: colors.fill,
  },
  segmentActive: {
    backgroundColor: colors.text,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 1,
  },
  labelActive: {
    color: colors.onDark,
  },
  badge: {
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
  },
  badgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  badgeLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 11,
    color: colors.onDark,
  },
  badgeLabelActive: {
    color: colors.onDark,
  },
});
