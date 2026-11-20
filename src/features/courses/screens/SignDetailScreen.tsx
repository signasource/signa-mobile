import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { SignAnimation } from "@/features/courses/components/lesson/SignAnimation";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AppStackParamList, "SignDetail">;

export function SignDetailScreen({ navigation, route }: Props) {
  const { signMeaning } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
        <BackButton onPress={() => navigation.goBack()} color={colors.onDark} />
        <Text style={styles.headerTitle} numberOfLines={1}>
          {signMeaning}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.body}>
        <View style={styles.chip}>
          <Ionicons name="hand-left-outline" size={13} color={colors.primaryDark} />
          <Text style={styles.chipText}>SEÑA LSA</Text>
        </View>

        <Text style={styles.word}>{signMeaning}</Text>

        <SignAnimation meaning={signMeaning} label={signMeaning} height={320} cameraControls />

        <View style={styles.resolvedBadge}>
          <Ionicons name="shield-checkmark" size={15} color={colors.successDark} />
          <Text style={styles.resolvedText}>Tu reporte sobre esta seña fue resuelto</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 14,
    gap: 12,
  },
  headerTitle: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 17,
    color: colors.onDark,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  headerRight: {
    width: 32,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    gap: 14,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  chipText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.primaryDark,
  },
  word: {
    fontFamily: fonts.displayBold,
    fontSize: 36,
    letterSpacing: -1,
    color: colors.text,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    backgroundColor: colors.successLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  resolvedText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.successDark,
    flex: 1,
  },
});
