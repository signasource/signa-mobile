import React from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { CommonActions } from "@react-navigation/native";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";

type Props = NativeStackScreenProps<AppStackParamList, "OrganizationWelcome">;

const MAX_COURSES_SHOWN = 5;

export function OrganizationWelcomeScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { orgName, courses, alreadyMember } = route.params;

  const shownCourses = courses.slice(0, MAX_COURSES_SHOWN);
  const hiddenCount = courses.length - shownCourses.length;

  function handleStart() {
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Tabs" }],
      })
    );
  }

  return (
    <View style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconWrap}>
          <Ionicons name="business" size={44} color={colors.onDark} />
        </View>

        <Text style={styles.headline}>
          {alreadyMember ? `Ya sos parte de ${orgName}` : "¡Ya tenés acceso!"}
        </Text>

        {!alreadyMember && (
          <Text style={styles.subheadline}>
            La organización <Text style={styles.orgName}>{orgName}</Text> te habilitó el acceso a los siguientes cursos:
          </Text>
        )}

        {alreadyMember && (
          <Text style={styles.subheadline}>
            Tu organización tiene contratados los siguientes cursos para vos:
          </Text>
        )}

        <View style={styles.courseList}>
          {shownCourses.map((course) => (
            <View key={course.id} style={styles.courseItem}>
              <View style={styles.courseIconWrap}>
                <Ionicons name="school" size={20} color={colors.primary} />
              </View>
              <Text style={styles.courseName} numberOfLines={2}>
                {course.name}
              </Text>
            </View>
          ))}
          {hiddenCount > 0 && (
            <Text style={styles.moreText}>y {hiddenCount} más...</Text>
          )}
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={handleStart} activeOpacity={0.85}>
          <Text style={styles.startBtnText}>¡Empezar a aprender!</Text>
          <Ionicons name="arrow-forward" size={18} color={colors.primary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.primaryDark,
  },
  content: {
    paddingHorizontal: 28,
    alignItems: "center",
    paddingTop: 8,
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    backgroundColor: alpha(colors.onColor, 0.18),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 28,
  },
  headline: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    color: colors.onDark,
    textAlign: "center",
    lineHeight: 34,
    marginBottom: 14,
  },
  subheadline: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    color: alpha(colors.onColor, 0.75),
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
  orgName: {
    fontFamily: fonts.bodySemiBold,
    color: colors.onDark,
  },
  courseList: {
    width: "100%",
    gap: 10,
    marginBottom: 36,
  },
  courseItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: alpha(colors.onColor, 0.12),
    borderRadius: 16,
    padding: 14,
  },
  courseIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  courseName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
    flex: 1,
    lineHeight: 19,
  },
  moreText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: alpha(colors.onColor, 0.6),
    textAlign: "center",
    paddingTop: 4,
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.onDark,
    borderRadius: 18,
    paddingVertical: 18,
    paddingHorizontal: 28,
    width: "100%",
  },
  startBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.primary,
  },
});
