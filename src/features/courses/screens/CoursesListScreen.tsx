import React, { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";
import { coursesApi } from "../api";
import { Course } from "../types";

/**
 * PLACEHOLDER: la UI ya esta armada para cuando el back exponga /courses,
 * pero hoy ese endpoint no existe, asi que esta pantalla va a mostrar el
 * error de "no se pudo cargar".
 */
export function CoursesListScreen() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    coursesApi
      .list()
      .then(({ data }) => setCourses(data))
      .catch((err) => setError(err?.response?.data?.message ?? err.message ?? "Error desconocido"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cursos</Text>

      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />}

      {!loading && error && (
        <Card>
          <Text style={styles.errorTitle}>Todavia no hay endpoint de cursos en el backend</Text>
          <Text style={styles.errorDetail}>{error}</Text>
        </Card>
      )}

      {!loading && !error && (
        <FlatList
          data={courses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.courseCard}>
              <Text style={styles.courseTitle}>{item.title}</Text>
              <Text style={styles.courseMeta}>{item.lessons.length} lecciones</Text>
            </Card>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  title: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text, marginBottom: 20 },
  errorTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.text, marginBottom: 6 },
  errorDetail: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted },
  courseCard: { marginBottom: 12 },
  courseTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.primary },
  courseMeta: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 4 },
});
