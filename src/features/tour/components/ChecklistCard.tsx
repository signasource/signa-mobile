import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { ChecklistItems } from "../TourContext";

interface ChecklistItem {
  key: keyof ChecklistItems;
  label: string;
  onPress: () => void;
}

interface Props {
  items: ChecklistItems;
  onItemPress: (key: keyof ChecklistItems) => void;
}

export function ChecklistCard({ items, onItemPress }: Props) {
  const completedCount = Object.values(items).filter(Boolean).length;
  const allDone = completedCount === 4;

  const rows: ChecklistItem[] = [
    { key: "lesson", label: "Completá tu primera lección", onPress: () => onItemPress("lesson") },
    { key: "practice", label: "Probá la cámara en Práctica", onPress: () => onItemPress("practice") },
    { key: "friend", label: "Sumá tu primer amigo en Social", onPress: () => onItemPress("friend") },
    { key: "streak", label: "Volvé mañana y hacé racha de 2 días", onPress: () => onItemPress("streak") },
  ];

  return (
    <View style={[styles.card, allDone && styles.cardDone]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Primeros pasos</Text>
        <Text style={styles.count}>
          {completedCount} / 4
        </Text>
      </View>

      {allDone ? (
        <Text style={styles.allDoneText}>¡Completaste todo! 🎉</Text>
      ) : (
        <Text style={styles.subtitle}>
          {completedCount === 0 ? "Cuatro pasos para arrancar" : `Vas la mitad. Te faltan ${4 - completedCount}.`}
        </Text>
      )}

      {/* Rows */}
      <View style={styles.rows}>
        {rows.map(({ key, label, onPress }) => {
          const done = items[key];
          return (
            <TouchableOpacity
              key={key}
              style={styles.row}
              onPress={onPress}
              activeOpacity={done ? 1 : 0.75}
              disabled={done}
            >
              <View style={[styles.rowCheck, done && styles.rowCheckDone]}>
                {done ? (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                ) : null}
              </View>
              <Text style={[styles.rowLabel, done && styles.rowLabelDone]}>
                {label}
              </Text>
              {!done && (
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: colors.text,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  cardDone: {
    backgroundColor: colors.successLight,
  },
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 17,
    color: colors.text,
  },
  count: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 13,
    color: colors.textMuted,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 4,
  },
  allDoneText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.successDark,
    marginTop: 4,
  },
  rows: {
    marginTop: 14,
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  rowCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.roadmapLockedBorder,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowCheckDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  rowLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  rowLabelDone: {
    color: colors.textMuted,
    textDecorationLine: "line-through",
  },
});
