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
} from "@/components/auth";
import { isValidEmail } from "@/utils/validation";
import { mapAuthError } from "@/utils/authErrors";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    if (!email.trim()) {
      setError("Ingresá tu correo electrónico");
      return false;
    }
    if (!isValidEmail(email)) {
      setError("Ingresá un correo electrónico válido");
      return false;
    }
    return true;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await authApi.forgotPassword({ email: email.trim() });
      navigation.navigate("ForgotPasswordSent", { email: email.trim() });
    } catch (err: unknown) {
      setError(mapAuthError(err, "No se pudo enviar el correo"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()}>
      <AuthIconBadge icon="password" />

      <AuthHeading
        title="¿Olvidaste tu contraseña?"
        subtitle="Ingresá tu email y te mandamos un enlace para crear una nueva."
        style={styles.textBlock}
      />

      <View style={styles.fieldGroup}>
        <AuthField
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
          error={error || null}
        />
        <PrimaryButton label="Enviar enlace" onPress={handleSubmit} loading={loading} />
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
  fieldGroup: { marginTop: 26, gap: 18 },
});
