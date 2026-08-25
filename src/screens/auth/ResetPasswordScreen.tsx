import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { authApi } from "@/api/auth";
import {
  AuthScreen,
  AuthField,
  AuthHeading,
  AuthIconBadge,
  AuthFooter,
  PrimaryButton,
  StatusText,
} from "@/components/auth";
import { mapAuthError } from "@/utils/authErrors";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

/**
 * Sin deep linking configurado.
 */
export function ResetPasswordScreen({ navigation, route }: Props) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    token?: string;
    newPassword?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  function validate() {
    const e: typeof errors = {};
    if (!token.trim()) e.token = "Ingresá el token recibido por email";
    if (!newPassword) e.newPassword = "Ingresá tu nueva contraseña";
    else if (newPassword.length < 8) e.newPassword = "La contraseña debe tener al menos 8 caracteres";
    if (!confirmPassword) e.confirmPassword = "Confirmá tu nueva contraseña";
    else if (newPassword !== confirmPassword) e.confirmPassword = "Las contraseñas no coinciden";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      await authApi.resetPassword({ newPassword }, token);
      navigation.navigate("Login");
    } catch (err: unknown) {
      setErrors({ general: mapAuthError(err, "No se pudo restablecer la contraseña") });
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()} canGoBack={navigation.canGoBack()}>
      <AuthIconBadge icon="key" />

      <AuthHeading
        title="Nueva contraseña"
        subtitle="Ingresá el token que recibiste por email y elegí una nueva contraseña."
        style={styles.textBlock}
      />

      <View style={styles.fieldGroup}>
        <AuthField
          icon="token"
          value={token}
          onChangeText={setToken}
          placeholder="Token recibido por email"
          autoCapitalize="none"
          autoCorrect={false}
          invalid={!!errors.token}
          error={errors.token ?? null}
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
});
