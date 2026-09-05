import React from "react";
import { View, TouchableOpacity, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

export interface SubTab<K extends string> {
  key: K;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  count?: number;
}

interface SubTabsProps<K extends string> {
  options: ReadonlyArray<SubTab<K>>;
  value: K;
  onChange: (key: K) => void;
  style?: StyleProp<ViewStyle>;
}

/**
 * Secondary selector (Mis amigos/Solicitudes, Logros conseguidos/bloqueados).
 * Outlined pills like Social, plus the icon used in the Logros screen.
 */
export function SubTabs<K extends string>({ options, value, onChange, style }: SubTabsProps<K>) {
  return (
    <View style={[styles.row, style]}>
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
            <Ionicons
              name={option.icon}
              size={14}
              color={active ? colors.text : colors.textMuted}
            />
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
  row: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 14,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 34,
    paddingHorizontal: 10,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    borderColor: colors.text,
    backgroundColor: colors.surface,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.textMuted,
    flexShrink: 1,
  },
  labelActive: {
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
