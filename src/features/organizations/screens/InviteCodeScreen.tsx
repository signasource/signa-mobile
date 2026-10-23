import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { organizationsApi } from "@/api/organizations";

type Props = NativeStackScreenProps<AppStackParamList, "InviteCode">;

export function InviteCodeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRedeem() {
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    try {
      const response = await organizationsApi.redeemInviteCode(trimmed);
      const { organizationName, courses, alreadyMember } = response.data;
      navigation.replace("OrganizationWelcome", { orgName: organizationName, courses, alreadyMember });
    } catch (err: any) {
      const message = err?.response?.data?.message;
      setError(message ?? "Código inválido o ya utilizado.");
    } finally {
      setLoading(false);
    }
  }

  const canSubmit = code.trim().length > 0 && !loading;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={colors.neutral900} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconWrap}>
          <Ionicons name="business-outline" size={40} color={colors.primary} />
        </View>

        <Text style={styles.title}>Código de invitación</Text>
        <Text style={styles.description}>
          Ingresá el código que te compartió tu organización para acceder a los cursos.
        </Text>

        <View style={[styles.inputWrap, error ? styles.inputWrapError : null]}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(text) => {
              setCode(text.toUpperCase());
              setError(null);
            }}
            placeholder="ej: ABC-1234"
            placeholderTextColor={colors.neutral600}
            autoCapitalize="characters"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={canSubmit ? handleRedeem : undefined}
          />
        </View>

        {error && (
          <View style={styles.errorRow}>
            <Ionicons name="alert-circle-outline" size={15} color={colors.danger} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
          onPress={handleRedeem}
          disabled={!canSubmit}
          activeOpacity={canSubmit ? 0.85 : 1}
        >
          {loading ? (
            <ActivityIndicator color={colors.onDark} size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Canjear código</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.neutral900,
    marginBottom: 10,
  },
  description: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    color: colors.neutral600,
    lineHeight: 22,
    marginBottom: 32,
  },
  inputWrap: {
    borderWidth: 1.5,
    borderColor: colors.neutral200,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 10,
  },
  inputWrapError: {
    borderColor: colors.danger,
  },
  input: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.neutral900,
    letterSpacing: 2,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  errorText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  submitBtnDisabled: {
    backgroundColor: colors.neutral200,
  },
  submitBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onDark,
  },
});
