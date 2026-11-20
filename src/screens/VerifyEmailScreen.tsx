import React, { useState } from "react";
import { View, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
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
import { mapAuthError } from "@/utils/authErrors";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AppStackParamList, "VerifyEmail">;

// Mismo formato que valida VerifyEmailRequest.java (@Pattern \d{6}).
const CODE_LENGTH = 6;

/**
 * Confirma el email con el código de 6 dígitos que llega por mail al registrarse.
 * Es opcional: "Más tarde" vuelve a la app, y se puede retomar desde Configuración.
 */
export function VerifyEmailScreen({ navigation }: Props) {
  const { user } = useAuth();
  const email = user?.email ?? "";
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);

  async function handleSubmit() {
    if (code.length !== CODE_LENGTH) {
      setCodeError("Ingresá el código de 6 dígitos que te enviamos");
      return;
    }
    setCodeError(null);
    setError(null);
    setResent(false);
    setLoading(true);
    try {
      await authApi.verifyEmail({ email, code });
      setVerified(true);
    } catch (err: unknown) {
      setError(mapAuthError(err, "No se pudo verificar la cuenta"));
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    setResending(true);
    setResent(false);
    setError(null);
    try {
      await authApi.resendVerificationEmail({ email });
      setCode("");
      setResent(true);
    } catch (err: unknown) {
      setError(mapAuthError(err, "No se pudo reenviar el código"));
    } finally {
      setResending(false);
    }
  }

  if (verified) {
    return (
      <AuthScreen>
        <AuthIconBadge icon="email" />
        <AuthHeading
          title="¡Cuenta verificada!"
          subtitle="Listo, tu email está confirmado. Ya podés seguir aprendiendo."
          style={styles.textBlock}
        />
        <View style={styles.fieldGroup}>
          <PrimaryButton label="Continuar" onPress={() => navigation.goBack()} />
        </View>
      </AuthScreen>
    );
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()}>
      <AuthIconBadge icon="email" />

      <AuthHeading
        title="Verificá tu cuenta"
        subtitle={`Te enviamos un código de 6 dígitos a ${email}. Ingresalo para confirmar tu email.`}
        style={styles.textBlock}
      />

      <View style={styles.fieldGroup}>
        <AuthField
          icon="token"
          value={code}
          onChangeText={(value) => setCode(value.replace(/\D/g, "").slice(0, CODE_LENGTH))}
          placeholder="Código de 6 dígitos"
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          invalid={!!codeError}
          error={codeError}
        />

        <PrimaryButton label="Verificar cuenta" onPress={handleSubmit} loading={loading} />

        {error ? <StatusText>{error}</StatusText> : null}
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
        text="¿Querés hacerlo después?"
        linkLabel="Más tarde"
        onPress={() => navigation.goBack()}
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
