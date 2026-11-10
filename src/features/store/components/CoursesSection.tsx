import React, { useCallback, useState } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { EmptyNote } from "@/components/EmptyState";
import { colors, fonts } from "@/theme";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { CourseSummary } from "@/features/courses/api";
import { fetchCatalog } from "@/features/courses/catalog";
import { PaidCourseRow } from "@/features/store/PaidCourseRow";

/**
 * Store's "Cursos" tab: the paid courses the user doesn't own yet. Each one opens its course
 * sheet (`CourseDetail`), where the purchase happens. Courses are paid with money, never gems.
 */
export function CoursesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);

  // Refetch on focus: coming back from a purchase, the bought course must disappear from the list.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchCatalog().then((catalog) => {
        if (active) setCourses(catalog.filter((c) => !c.owned && !c.isFree));
      });
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <View style={styles.section}>
      <Text style={styles.hint}>Se pagan con dinero, una sola vez. No usan gemas.</Text>
      {courses == null ? (
        <ActivityIndicator color={colors.courseIndigo} style={styles.loader} />
      ) : courses.length === 0 ? (
        <EmptyNote>Ya tenés todos los cursos disponibles.</EmptyNote>
      ) : (
        courses.map((course) => (
          <PaidCourseRow
            key={course.id}
            course={course}
            onOpen={(c) => navigation.navigate("CourseDetail", { courseId: c.id })}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 10 },
  hint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
  },
  loader: { marginVertical: 24 },
});
