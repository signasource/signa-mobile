import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { mapAuthError } from "@/utils/authErrors";
import ManoCandado from "@assets/manos/mano-con-candado.svg";

type Props = NativeStackScreenProps<AppStackParamList, "ChangePassword">;

const MIN_PASSWORD_LENGTH = 8;

export function ChangePasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { changePassword } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const newPasswordValid = newPassword.length >= MIN_PASSWORD_LENGTH;
  const passwordsMatch = newPassword === repeatPassword && repeatPassword.length > 0;
  const canSave =
    currentPassword.length > 0 &&
    newPasswordValid &&
    passwordsMatch &&
    !loading;

  async function handleSave() {
    if (!canSave) return;
    setError(null);
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      navigation.goBack();
    } catch (err: unknown) {
      setError(mapAuthError(err, "No se pudo cambiar la contraseña."));
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 28) },
        ]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* Back */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={styles.backArrow} />
        </TouchableOpacity>

        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <ManoCandado height={168} width={140} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Cambiar contraseña</Text>
        <Text style={styles.subtitle}>Tu contraseña debe tener al menos {MIN_PASSWORD_LENGTH} caracteres.</Text>

        {/* Fields */}
        <View style={styles.fields}>
          {/* Current password */}
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Contraseña actual"
              placeholderTextColor={colors.neutral600}
              secureTextEntry={!showCurrent}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showCurrent ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.neutral600}
              />
            </TouchableOpacity>
          </View>

          {/* New password */}
          <View style={styles.field}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Nueva contraseña"
              placeholderTextColor={colors.neutral600}
              secureTextEntry={!showNew}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowNew((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showNew ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.neutral600}
              />
            </TouchableOpacity>
          </View>

          {/* Password strength indicator */}
          {newPassword.length > 0 && (
            <View style={styles.strengthRow}>
              <View style={[styles.strengthBar, newPasswordValid && styles.strengthBarFull]} />
              <Text style={[styles.strengthLabel, { color: newPasswordValid ? colors.success : colors.neutral600 }]}>
                {newPasswordValid ? "Contraseña válida" : `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`}
              </Text>
            </View>
          )}

          {/* Repeat new password */}
          <View style={[
            styles.field,
            repeatPassword.length > 0 && !passwordsMatch && styles.fieldError,
          ]}>
            <Ionicons name="lock-closed-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={repeatPassword}
              onChangeText={setRepeatPassword}
              placeholder="Repetir nueva contraseña"
              placeholderTextColor={colors.neutral600}
              secureTextEntry={!showRepeat}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity onPress={() => setShowRepeat((v) => !v)} hitSlop={8}>
              <Ionicons
                name={showRepeat ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.neutral600}
              />
            </TouchableOpacity>
          </View>

          {repeatPassword.length > 0 && !passwordsMatch && (
            <View style={styles.hintRow}>
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={[styles.hint, { color: colors.danger }]}>Las contraseñas no coinciden.</Text>
            </View>
          )}

          {error && (
            <View style={styles.hintRow}>
              <Ionicons name="close-circle" size={15} color={colors.danger} />
              <Text style={[styles.hint, { color: colors.danger }]}>{error}</Text>
            </View>
          )}

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={canSave ? 0.85 : 1}
          >
            {loading ? (
              <ActivityIndicator color={colors.onDark} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancel}>Cancelar</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 30,
    flexGrow: 1,
  },

  backBtn: {
    marginTop: 8,
    marginLeft: 6,
    padding: 6,
    alignSelf: "flex-start",
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    borderColor: colors.text,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },

  illustrationWrap: {
    alignItems: "center",
    marginTop: 18,
  },

  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: colors.text,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.neutral600,
    marginTop: 10,
  },

  fields: {
    marginTop: 24,
    gap: 14,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 17,
  },
  fieldError: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  fieldIcon: {
    marginRight: 12,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
  },

  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: -6,
  },
  strengthBar: {
    width: 52,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
  },
  strengthBarFull: {
    backgroundColor: colors.success,
  },
  strengthLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
  },
  hint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },

  saveBtn: {
    minHeight: 58,
    backgroundColor: colors.text,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: colors.neutral200,
  },
  saveBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },

  spacer: { flex: 1, minHeight: 24 },

  cancel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.neutral600,
    textAlign: "center",
    paddingVertical: 8,
  },
});
