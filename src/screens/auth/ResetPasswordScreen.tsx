import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { authApi } from "@/api/auth";
import { useAuth } from "@/context/AuthContext";
import { Text } from "@/components/Text";
import {
  AuthScreen,
  AuthField,
  AuthHeading,
  AuthIconBadge,
  AuthFooter,
  PrimaryButton,
  StatusText,
} from "@/components/auth";
import { isPasswordValid, isValidEmail } from "@/utils/validation";
import { mapAuthError } from "@/utils/authErrors";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

// Mismo formato que valida ResetPasswordRequest.java (@Pattern \d{6}).
const CODE_LENGTH = 6;

/**
 * Restablece la contraseña con el código de 6 dígitos que llega por mail
 * (pedido en ForgotPassword). Si sale bien, inicia sesión con la contraseña nueva.
 */
export function ResetPasswordScreen({ navigation, route }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState(route.params.email);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [errors, setErrors] = useState<{
    email?: string;
    code?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!email.trim()) e.email = "Ingresá tu correo electrónico";
    else if (!isValidEmail(email)) e.email = "Ingresá un correo electrónico válido";
    if (code.length !== CODE_LENGTH) e.code = "Ingresá el código de 6 dígitos que te enviamos";
    if (!newPassword) e.newPassword = "Ingresá tu nueva contraseña";
    else if (!isPasswordValid(newPassword)) e.newPassword = "La contraseña debe tener entre 8 y 72 caracteres";
    if (!confirmPassword) e.confirmPassword = "Confirmá tu nueva contraseña";
    else if (newPassword !== confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setResent(false);
    setErrors({});
    try {
      await authApi.resetPassword({ email: email.trim(), code, newPassword });
    } catch (err: unknown) {
      setErrors({ general: mapAuthError(err, "No se pudo restablecer la contraseña") });
      setLoading(false);
      return;
    }
    try {
      // Al setear el usuario, RootNavigator cambia a la app y esta pantalla se desmonta.
      await login({ identifier: email.trim(), password: newPassword });
    } catch {
      // La contraseña ya cambió: si el login automático falla, que entre a mano.
      setLoading(false);
      navigation.navigate("Login");
    }
  }

  async function handleResend() {
    if (!isValidEmail(email)) {
      setErrors({ email: "Ingresá un correo electrónico válido" });
      return;
    }
    setResending(true);
    setResent(false);
    setErrors({});
    try {
      await authApi.forgotPassword({ email: email.trim() });
      setCode("");
      setResent(true);
    } catch (err: unknown) {
      setErrors({ general: mapAuthError(err, "No se pudo reenviar el código") });
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()} canGoBack={navigation.canGoBack()}>
      <AuthIconBadge icon="key" />

      <AuthHeading
        title="Nueva contraseña"
        subtitle="Ingresá el código de 6 dígitos que te enviamos por email y elegí una nueva contraseña."
        style={styles.textBlock}
      />

      <View style={styles.fieldGroup}>
        <AuthField
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          invalid={!!errors.email}
          error={errors.email ?? null}
        />
        <AuthField
          icon="token"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder="Código de 6 dígitos"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          invalid={!!errors.code}
          error={errors.code ?? null}
        />
        <AuthField
          icon="password"
          secure
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="Nueva contraseña"
          invalid={!!errors.newPassword}
          error={errors.newPassword ?? null}
        />
        <AuthField
          icon="password"
          secure
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirmá la contraseña"
          invalid={!!errors.confirmPassword}
          error={errors.confirmPassword ?? null}
        />

        <PrimaryButton label="Guardar contraseña" onPress={handleSubmit} loading={loading} />

        {errors.general ? <StatusText>{errors.general}</StatusText> : null}
        {resent ? <StatusText tone="neutral">Te enviamos un código nuevo.</StatusText> : null}

        <Text style={styles.resendHint}>
          ¿No te llegó?{" "}
          <Text
            style={styles.resendLink}
            onPress={resending ? undefined : handleResend}
            accessibilityRole="link"
            accessibilityLabel="Reenviar código"
          >
            {resending ? "Reenviando…" : "Reenviar código"}
          </Text>
        </Text>
      </View>

      <AuthFooter
        text="¿Te acordaste?"
        linkLabel="Volver"
        onPress={() => navigation.navigate("Login")}
        pinToBottom
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  textBlock: { marginTop: 24 },
  fieldGroup: { marginTop: 26, gap: 14 },
  resendHint: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted, textAlign: "center" },
  resendLink: { fontFamily: fonts.bodyBold, color: colors.primary },
});
