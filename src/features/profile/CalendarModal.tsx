import React, { useState } from "react";
import { Modal, Pressable, StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { alpha, colors, fonts } from "@/theme";
import { fromIso, monthName, toIso } from "./dateRange";

const WEEKDAYS = ["L", "M", "M", "J", "V", "S", "D"];

interface CalendarModalProps {
  visible: boolean;
  title: string;
  /** Selected day, `YYYY-MM-DD`. */
  value: string;
  /** Latest selectable day, `YYYY-MM-DD` (inclusive). */
  max?: string;
  onSelect: (iso: string) => void;
  onClose: () => void;
}

export function CalendarModal({ visible, title, value, max, onSelect, onClose }: CalendarModalProps) {
  const selected = fromIso(value);
  const [cursor, setCursor] = useState({ y: selected.getFullYear(), m: selected.getMonth() });

  // Monday-first grid: leading blanks, then the days of the month.
  const first = new Date(cursor.y, cursor.m, 1);
  const lead = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(lead).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  function shift(delta: number) {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    setCursor({ y: d.getFullYear(), m: d.getMonth() });
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View style={styles.card} onStartShouldSetResponder={() => true}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.monthRow}>
            <TouchableOpacity onPress={() => shift(-1)} hitSlop={10} accessibilityLabel="Mes anterior">
              <Ionicons name="chevron-back" size={20} color={colors.neutral900} />
            </TouchableOpacity>
            <Text style={styles.month}>
              {monthName(cursor.m)} {cursor.y}
            </Text>
            <TouchableOpacity onPress={() => shift(1)} hitSlop={10} accessibilityLabel="Mes siguiente">
              <Ionicons name="chevron-forward" size={20} color={colors.neutral900} />
            </TouchableOpacity>
          </View>
          <View style={styles.grid}>
            {WEEKDAYS.map((w, i) => (
              <View key={`w${i}`} style={styles.cell}>
                <Text style={styles.weekday}>{w}</Text>
              </View>
            ))}
            {cells.map((day, i) => {
              if (day === null) return <View key={`b${i}`} style={styles.cell} />;
              const iso = toIso(new Date(cursor.y, cursor.m, day));
              const disabled = max != null && iso > max;
              const isSelected = iso === value;
              return (
                <View key={iso} style={styles.cell}>
                  <TouchableOpacity
                    style={[styles.day, isSelected && styles.daySelected]}
                    disabled={disabled}
                    onPress={() => onSelect(iso)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        disabled && styles.dayTextDisabled,
                        isSelected && styles.dayTextSelected,
                      ]}
                    >
                      {day}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: alpha(colors.black, 0.45),
    justifyContent: "center",
    padding: 24,
  },
  card: { backgroundColor: colors.surface, borderRadius: 20, padding: 18 },
  title: { fontFamily: fonts.displayBold, fontSize: 16, color: colors.neutral900, marginBottom: 12 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  month: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.neutral900, textTransform: "capitalize" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: `${100 / 7}%`, alignItems: "center", paddingVertical: 2 },
  weekday: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.neutral600 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  daySelected: { backgroundColor: colors.primary },
  dayText: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colors.neutral900 },
  dayTextDisabled: { color: colors.neutral400 },
  dayTextSelected: { color: colors.onColor },
});
