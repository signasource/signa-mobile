import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { CourseSummary } from "@/features/courses/api";
import { formatPrice } from "@/features/courses/price";

/**
 * A paid course the user doesn't own yet: shows its price and a "Ver" button that opens the
 * course sheet (`CourseDetail`), where the purchase is confirmed. Used in the home course
 * selector and the profile course catalog.
 */
export function PaidCourseRow({
  course,
  onOpen,
  dashed,
}: {
  course: CourseSummary;
  onOpen: (course: CourseSummary) => void;
  /** Dashed outline = "not yours yet" (Profile → Cursos). */
  dashed?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.row, dashed && styles.rowDashed]} onPress={() => onOpen(course)} activeOpacity={0.85}>
      <View style={styles.icon}>
        <Ionicons name="school" size={22} color={colors.onDark} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {course.name}
        </Text>
        <Text style={styles.price} numberOfLines={1}>
          {course.price != null ? `Pago único · ${formatPrice(course.price)}` : "Curso pago"}
        </Text>
      </View>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>Ver</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.text} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 18,
    padding: 12,
  },
  rowDashed: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.roadmapLockedBorder,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.courseIndigo,
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
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 10,
  },
  ctaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
});
