import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { CourseSummary } from "@/features/courses/api";
import { formatPrice } from "@/features/courses/price";

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
  const enrolled = course.owned;
  const free = !enrolled && course.isFree;

  let subtitle: string;
  if (enrolled) {
    subtitle = "Inscripto";
  } else if (free) {
    subtitle = "Gratis";
  } else {
    subtitle = course.price != null ? `Pago único · ${formatPrice(course.price)}` : "Curso pago";
  }

  const ctaLabel = free ? "Empezar" : "Ver";

  return (
    <TouchableOpacity
      style={[styles.row, dashed && styles.rowDashed, enrolled && styles.rowEnrolled]}
      onPress={() => onOpen(course)}
      activeOpacity={0.85}
    >
      <View style={[styles.icon, enrolled && styles.iconEnrolled]}>
        <Ionicons name="school" size={22} color={colors.onDark} />
      </View>
      <View style={styles.text}>
        <Text style={styles.name} numberOfLines={1}>
          {course.name}
        </Text>
        <Text
          style={[
            styles.price,
            enrolled && styles.subtitleEnrolled,
            free && styles.subtitleFree,
          ]}
          numberOfLines={1}
        >
          {subtitle}
        </Text>
      </View>
      <View style={[styles.cta, free && styles.ctaFree]}>
        <Text style={[styles.ctaText, free && styles.ctaTextFree]}>{ctaLabel}</Text>
        <Ionicons
          name="chevron-forward"
          size={15}
          color={free ? colors.primaryDark : colors.text}
        />
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
  rowEnrolled: {
    backgroundColor: colors.successLight,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.courseIndigo,
  },
  iconEnrolled: {
    backgroundColor: colors.successDark,
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
  subtitleEnrolled: {
    color: colors.successDark,
    fontFamily: fonts.bodySemiBold,
  },
  subtitleFree: {
    color: colors.primaryDark,
    fontFamily: fonts.bodySemiBold,
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
  ctaFree: {
    backgroundColor: colors.primaryLight,
  },
  ctaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  ctaTextFree: {
    color: colors.primaryDark,
  },
});
