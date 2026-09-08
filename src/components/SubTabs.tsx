import React from "react";
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

export interface SubTab<K extends string> {
  key: K;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  count?: number;
}

interface SubTabsProps<K extends string> {
  options: ReadonlyArray<SubTab<K>>;
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}

export function SubTabs<K extends string>({ options, value, onChange, style }: SubTabsProps<K>) {
  return (
    <View style={[styles.container, style]}>
      {options.map((option) => {
        const active = option.key === value;
        return (
          <TouchableOpacity
            key={option.key}
            style={[styles.tab, active && styles.tabActive]}
            onPress={() => onChange(option.key)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]} numberOfLines={1}>
              {option.label}
            </Text>
            {option.count != null && (
              <Text style={[styles.count, active && styles.countActive]}>{option.count}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.neutral100,
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 36,
    paddingHorizontal: 10,
    borderRadius: 11,
  },
  tabActive: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 1,
  },
  labelActive: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  count: {
    fontFamily: fonts.bodyBold,
    fontSize: 11.5,
    color: colors.textMuted,
    opacity: 0.7,
  },
  countActive: {
    color: colors.text,
    opacity: 1,
  },
});
