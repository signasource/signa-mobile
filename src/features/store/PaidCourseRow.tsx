import React from "react";
import { View, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { CourseSummary } from "@/features/courses/api";
import { formatPrice } from "@/features/courses/price";

/**
 * A paid course the user doesn't own yet: shows its price and a "Comprar" button that starts the
 * Mercado Pago checkout. Used in the home course selector and the profile course catalog.
 */
export function PaidCourseRow({
  course,
  buying,
  disabled,
  onBuy,
}: {
  course: CourseSummary;
  buying: boolean;
  disabled: boolean;
  onBuy: (course: CourseSummary) => void;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.icon}>
        <Ionicons name="lock-closed" size={20} color={colors.onDark} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {course.name}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {course.price != null ? `Pago único · ${formatPrice(course.price)}` : "Curso pago"}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.buyBtn, disabled && styles.buyBtnDisabled]}
        onPress={() => onBuy(course)}
        disabled={disabled}
        activeOpacity={0.85}
      >
        {buying ? (
          <ActivityIndicator color={colors.onDark} size="small" />
        ) : (
          <Text style={styles.buyBtnText}>Comprar</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: "transparent",
    padding: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.textMuted,
  },
  text: { flex: 1, minWidth: 0 },
  name: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 16,
    color: colors.text,
  },
  price: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 2,
  },
  buyBtn: {
    minWidth: 92,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.text,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  buyBtnDisabled: { opacity: 0.6 },
  buyBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
});
