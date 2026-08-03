import React, { useState, useMemo } from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { useAuth } from "@/context/AuthContext";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import {
  AuthScreen,
  AuthField,
  AuthHeading,
  AuthDivider,
  AuthFooter,
  PrimaryButton,
  PasswordChecklist,
  StatusText,
} from "@/components/auth";
import { checkPassword, isPasswordValid, isValidUsername } from "@/utils/validation";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [passwordTouched, setPasswordTouched] = useState(false);

  const passwordRules = useMemo(() => checkPassword(password), [password]);
  const passwordValid = isPasswordValid(password);

  const usernameAvailability = useUsernameAvailability(username);
  const usernameTaken = usernameAvailability.status === "taken";
  const usernameChecking = usernameAvailability.status === "checking";

  function validate() {
    if (!name.trim() || !username.trim() || !email.trim() || !password) {
      setError("Completá todos los campos para continuar");
      return false;
    }
    if (!isValidUsername(username)) {
      setError("El usuario solo puede tener letras, números y _ (mínimo 3 caracteres)");
      return false;
    }
    if (usernameTaken) {
      setError("Ese usuario ya está en uso");
      return false;
    }
    if (!passwordValid) {
      setError("La contraseña no cumple los requisitos");
      return false;
    }
    setError("");
    return true;
  }

  async function handleRegister() {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await register({ name: name.trim(), username: username.trim(), email: email.trim(), password });
      navigation.replace("VerifyEmail", { email: email.trim() });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo crear la cuenta");
    } finally {
      setLoading(false);
    }
  }

  const usernameTone =
    usernameAvailability.status === "available"
      ? "success"
      : usernameTaken ||
        usernameAvailability.status === "invalid" ||
        usernameAvailability.status === "error"
      ? "danger"
      : "muted";

  return (
    <AuthScreen onBack={() => navigation.goBack()} canGoBack={navigation.canGoBack()}>
      <AuthHeading
        title="Creá tu cuenta"
        subtitle="Último paso antes de tu primera racha."
        style={styles.header}
      />

      <View style={styles.fields}>
        <AuthField
          icon="name"
          value={name}
          onChangeText={setName}
          placeholder="Nombre"
          autoCapitalize="words"
        />

        <AuthField
          icon="user"
          value={username}
          onChangeText={setUsername}
          placeholder="Usuario"
          autoCapitalize="none"
          autoCorrect={false}
          hint={usernameAvailability.message}
          hintTone={usernameTone}
          trailing={
            usernameChecking ? (
              <ActivityIndicator size="small" color={colors.textMuted} />
            ) : usernameAvailability.status === "available" ? (
              <StatusIcon symbol="✓" color={colors.success} />
            ) : usernameTaken ? (
              <StatusIcon symbol="✕" color={colors.danger} />
            ) : null
          }
        />

        <AuthField
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder="Correo electrónico"
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <AuthField
          icon="password"
          secure
          value={password}
          onChangeText={(t) => {
            setPassword(t);
            setPasswordTouched(true);
          }}
          placeholder="Contraseña"
        />
        {passwordTouched && !passwordValid ? <PasswordChecklist rules={passwordRules} /> : null}

        <PrimaryButton
          label="Crear cuenta y empezar"
          onPress={handleRegister}
          loading={loading}
          disabled={usernameChecking || usernameTaken}
        />

        {error ? <StatusText>{error}</StatusText> : null}
      </View>

      <AuthDivider />

      <AuthFooter
        text="¿Ya tenés cuenta?"
        linkLabel="Iniciá sesión"
        onPress={() => navigation.navigate("Login")}
      />
    </AuthScreen>
  );
}

function StatusIcon({ symbol, color }: { symbol: string; color: string }) {
  return <Text style={[styles.statusIcon, { color }]}>{symbol}</Text>;
}

const styles = StyleSheet.create({
  header: { marginTop: 22 },
  fields: { marginTop: 20, gap: 13 },
  statusIcon: { fontSize: 16, fontFamily: fonts.bodyBold },
});
