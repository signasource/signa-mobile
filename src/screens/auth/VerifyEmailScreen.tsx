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
  SecondaryButton,
  StatusText,
} from "@/components/auth";

type Props = NativeStackScreenProps<AuthStackParamList, "VerifyEmail">;

/**
 * El back manda el link/token de verificacion por mail (EmailService.java).
 * Sin deep linking configurado todavia.
 */
export function VerifyEmailScreen({ navigation, route }: Props) {
  const [token, setToken] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [tokenError, setTokenError] = useState("");
  const [generalError, setGeneralError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const email = route.params?.email ?? "";
  const busy = verifying || resending;

  async function handleVerify() {
    setTokenError("");
    setGeneralError("");
    setResendMessage("");
    if (!token.trim()) {
      setTokenError("Ingresá el token del mail");
      return;
    }
    setVerifying(true);
    try {
      await authApi.verifyEmail(token);
      navigation.replace("Login");
    } catch (err: any) {
      setGeneralError(err?.response?.data?.message ?? err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    setGeneralError("");
    setResendMessage("");
    if (!email) {
      setGeneralError("Volvé a la pantalla de registro para reenviar el mail de verificación.");
      return;
    }
    setResending(true);
    try {
      await authApi.resendVerificationEmail({ email });
      setResendMessage("Te reenviamos el mail de verificación.");
    } catch (err: any) {
      setGeneralError(err?.response?.data?.message ?? err.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()} canGoBack={navigation.canGoBack()}>
      <AuthIconBadge icon="email" />

      <AuthHeading
        title="Verificá tu email"
        subtitle={`Te mandamos un mail${email ? ` a ${email}` : ""} con un link de verificación. Pegá acá el token que viene en ese link.`}
        style={styles.textBlock}
      />

      <View style={styles.fieldGroup}>
        <AuthField
          icon="token"
          value={token}
          onChangeText={setToken}
          placeholder="Token del mail"
          autoCapitalize="none"
          autoCorrect={false}
          invalid={!!tokenError}
          error={tokenError || null}
        />

        <PrimaryButton label="Verificar cuenta" onPress={handleVerify} loading={verifying} disabled={busy} />
        <SecondaryButton
          label="Reenviar mail de verificación"
          onPress={handleResend}
          loading={resending}
          disabled={busy}
        />

        {generalError ? <StatusText>{generalError}</StatusText> : null}
        {resendMessage ? <StatusText tone="neutral">{resendMessage}</StatusText> : null}
      </View>

      <AuthFooter
        text="¿Ya verificaste?"
        linkLabel="Iniciar sesión"
        onPress={() => navigation.replace("Login")}
        pinToBottom
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  textBlock: { marginTop: 24 },
  fieldGroup: { marginTop: 26, gap: 14 },
});
