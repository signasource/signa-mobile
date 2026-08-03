import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { useAuth } from "@/context/AuthContext";
import {
  AuthScreen,
  AuthField,
  AuthHeading,
  AuthDivider,
  AuthFooter,
  PrimaryButton,
  StatusText,
} from "@/components/auth";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function validate() {
    if (!email.trim() || !password) {
      setError("Completá todos los campos para continuar");
      return false;
    }
    setError("");
    return true;
  }

  async function handleLogin() {
    if (!validate()) return;
    setLoading(true);
    setError("");
    try {
      await login({ identifier: email.trim(), password });
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen onBack={() => navigation.goBack()} canGoBack={navigation.canGoBack()}>
      <AuthHeading title="Hola de nuevo" subtitle="Seguí donde lo dejaste." style={styles.header} />

      <View style={styles.fields}>
        <AuthField
          icon="email"
          value={email}
          onChangeText={setEmail}
          placeholder="Correo o usuario"
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <AuthField
          icon="password"
          secure
          value={password}
          onChangeText={setPassword}
          placeholder="Contraseña"
        />

        <Pressable
          onPress={() => navigation.navigate("ForgotPassword")}
          accessibilityRole="link"
          accessibilityLabel="¿Olvidaste tu contraseña?"
          style={styles.forgotWrap}
        >
          <Text style={styles.forgotText}>¿Olvidaste tu contraseña?</Text>
        </Pressable>

        <PrimaryButton label="Iniciar sesión" onPress={handleLogin} loading={loading} />

        {error ? <StatusText>{error}</StatusText> : null}
      </View>

      <AuthDivider />

      <AuthFooter
        text="¿No tenés cuenta?"
        linkLabel="Registrate"
        onPress={() => navigation.navigate("Register")}
        pinToBottom
      />
    </AuthScreen>
  );
}

const styles = StyleSheet.create({
  header: { marginTop: 22 },
  fields: { marginTop: 28, gap: 14 },
  forgotWrap: { alignSelf: "flex-end" },
  forgotText: { fontFamily: fonts.bodyBold, fontSize: 14, color: colors.primary },
});
