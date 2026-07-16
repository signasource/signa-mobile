import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { authApi } from "@/api/auth";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

/**
 * El back manda el link/token de verificacion por mail (EmailService.java).
 * Sin deep linking configurado todavia.
 */
export function VerifyEmailScreen({ navigation, route }: Props) {
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const email = route.params?.email ?? "";

  async function handleVerify() {
    setVerifying(true);
    try {
      await authApi.verifyEmail(token);
      Alert.alert("Cuenta verificada", "Ya podes iniciar sesion.");
      navigation.replace("Login");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (!email) {
      Alert.alert("Falta el email", "Volve a la pantalla de registro para reenviar el mail de verificacion.");
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerificationEmail({ email });
      Alert.alert("Listo", "Te reenviamos el mail de verificacion.");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Verifica tu email</Text>
        <Text style={styles.subtitle}>
          Te mandamos un mail{email ? ` a ${email}` : ""} con un link de verificacion. Pega aca el token que viene en
          ese link.
        </Text>

        <Input label="Token de verificacion" value={token} onChangeText={setToken} placeholder="Token del mail" />

        <Button label="Verificar cuenta" onPress={handleVerify} loading={verifying} style={styles.mt} />
        <Button
          label="Reenviar mail de verificacion"
          variant="outline"
          onPress={handleResend}
          loading={resending}
          style={styles.mt}
        />

        <Text style={styles.link} onPress={() => navigation.replace("Login")}>
          Ya verifique, ir a iniciar sesion
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: fontSizes.xl,
    color: colors.primary,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 24,
  },
  mt: { marginTop: 12 },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
    textAlign: "center",
    marginTop: 20,
  },
});
