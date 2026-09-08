import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import ManoCelularClave from "@assets/ilus/mano-celular-clave.svg";

type Props = NativeStackScreenProps<AppStackParamList, "ChangePassword">;

export function ChangePasswordScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { changePassword } = useAuth();

  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwRepeat, setPwRepeat] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pwLenOk = pwNext.length >= 8;
  const pwRepeatMismatch = pwRepeat.length > 0 && pwRepeat !== pwNext;
  const ready =
    pwCurrent.length > 0 && pwLenOk && pwRepeat === pwNext && pwRepeat.length > 0 && !saving;

  async function handleSave() {
    if (!ready) return;
    setError(null);
    setSaving(true);
    try {
      await changePassword({ currentPassword: pwCurrent, newPassword: pwNext });
      navigation.navigate("Configuration", { passwordChanged: true });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo cambiar la contraseña");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <BackButton
        onPress={() => navigation.goBack()}
        style={{ marginTop: insets.top + 8, marginLeft: 8 }}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.illustrationWrap}>
          <ManoCelularClave width={200} height={200} />
        </View>

        <Text style={styles.title}>Cambiar contraseña</Text>
        <Text style={styles.subtitle}>
          Vas a necesitar tu contraseña actual. Después de guardar seguís con la sesión abierta
          en este dispositivo.
        </Text>

        <Text style={styles.fieldLabel}>Contraseña actual</Text>
        <View style={styles.fieldWrap}>
          <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={pwCurrent}
            onChangeText={setPwCurrent}
            placeholder="••••••••"
            placeholderTextColor={colors.neutral600}
            secureTextEntry={!showCur}
          />
          <TouchableOpacity onPress={() => setShowCur((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showCur ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.fieldLabel}>Nueva contraseña</Text>
        <View style={styles.fieldWrap}>
          <Ionicons name="key-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={pwNext}
            onChangeText={setPwNext}
            placeholder="••••••••"
            placeholderTextColor={colors.neutral600}
            secureTextEntry={!showNext}
          />
          <TouchableOpacity onPress={() => setShowNext((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showNext ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.ruleRow}>
          <Text
            style={[
              styles.ruleMark,
              {
                color: pwLenOk
                  ? colors.success
                  : pwNext.length === 0
                    ? colors.neutral600
                    : colors.danger,
              },
            ]}
          >
            {pwLenOk ? "✓" : "✗"}
          </Text>
          <Text
            style={[
              styles.ruleText,
              {
                color: pwLenOk
                  ? colors.success
                  : pwNext.length === 0
                    ? colors.neutral600
                    : colors.danger,
              },
            ]}
          >
            Al menos 8 caracteres
          </Text>
        </View>

        <Text style={styles.fieldLabel}>Repetir nueva contraseña</Text>
        <View style={[styles.fieldWrap, pwRepeatMismatch && styles.fieldWrapError]}>
          <Ionicons name="key-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={pwRepeat}
            onChangeText={setPwRepeat}
            placeholder="••••••••"
            placeholderTextColor={colors.neutral600}
            secureTextEntry={!showRepeat}
          />
          <TouchableOpacity onPress={() => setShowRepeat((v) => !v)} style={styles.eyeBtn}>
            <Ionicons
              name={showRepeat ? "eye-off-outline" : "eye-outline"}
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        </View>
        {(pwRepeatMismatch || (pwRepeat.length > 0 && !pwRepeatMismatch)) && (
          <Text
            style={[styles.fieldHint, { color: pwRepeatMismatch ? colors.danger : colors.success }]}
          >
            {pwRepeatMismatch ? "Las contraseñas no coinciden" : "Coinciden"}
          </Text>
        )}

        {error && <Text style={[styles.fieldHint, { color: colors.danger, marginTop: 4 }]}>{error}</Text>}

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: ready ? colors.text : colors.neutral200 }]}
          onPress={handleSave}
          activeOpacity={ready ? 0.85 : 1}
        >
          <Text style={[styles.primaryBtnText, { color: ready ? colors.onDark : colors.neutral600 }]}>
            {saving ? "Guardando…" : "Guardar contraseña"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancelText}>Cancelar</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 4 },

  illustrationWrap: { alignItems: "center", marginBottom: 8 },

  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.neutral900,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.neutral600,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 24,
  },

  fieldLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    marginBottom: 4,
    marginLeft: 6,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 0,
  },
  fieldWrapError: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  fieldHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 6,
    minHeight: 18,
  },
  eyeBtn: { padding: 8 },

  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -6,
    marginBottom: 14,
    marginLeft: 6,
  },
  ruleMark: { fontFamily: fonts.bodySemiBold, fontSize: 12, width: 14 },
  ruleText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  primaryBtn: {
    borderRadius: 14,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  cancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral600,
  },
});
