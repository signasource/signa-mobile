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

export function CoursesSection() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [courses, setCourses] = useState<CourseSummary[] | null>(null);

  // Refetch on focus: coming back from a purchase, the bought course must move to "Mis cursos".
  useFocusEffect(
    useCallback(() => {
      let active = true;
      fetchCatalog().then((catalog) => {
        if (active) setCourses(catalog);
      });
      return () => {
        active = false;
      };
    }, []),
  );

  if (courses == null) {
    return <ActivityIndicator color={colors.courseIndigo} style={styles.loader} />;
  }

  const enrolled = courses.filter((c) => c.owned);
  const available = courses.filter((c) => !c.owned && (!c.status || c.status === "PUBLISHED"));

  const openCourse = (c: CourseSummary) => navigation.navigate("CourseDetail", { courseId: c.id });

  return (
    <View style={styles.section}>
      {enrolled.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Mis cursos</Text>
          {enrolled.map((course) => (
            <PaidCourseRow key={course.id} course={course} onOpen={openCourse} />
          ))}
        </View>
      )}

      {available.length > 0 && (
        <View style={styles.group}>
          <Text style={styles.groupTitle}>Explorar</Text>
          {available.map((course) => (
            <PaidCourseRow key={course.id} course={course} onOpen={openCourse} />
          ))}
        </View>
      )}

      {courses.length === 0 && <EmptyNote>No hay cursos disponibles.</EmptyNote>}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 16 },
  group: { gap: 8 },
  groupTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 14,
    color: colors.text,
  },
  loader: { marginVertical: 24 },
});
