import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Register">;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister() {
    setLoading(true);
    try {
      // /auth/register no devuelve tokens (201 vacio). Hay que verificar
      // el email antes de poder loguear.
      await register({ name, email, password });
      navigation.replace("VerifyEmail", { email });
    } catch (err: any) {
      Alert.alert("Error al registrarse", err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Crear cuenta</Text>

        <Input label="Nombre completo" value={name} onChangeText={setName} placeholder="Nombre y apellido" />
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@email.com"
        />
        <Input label="Contrasena" value={password} onChangeText={setPassword} secureTextEntry placeholder="********" />

        <Button label="Registrarme" onPress={handleRegister} loading={loading} style={styles.mt} />

        <Text style={styles.link} onPress={() => navigation.goBack()}>
          Ya tengo cuenta
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
    marginBottom: 28,
  },
  mt: { marginTop: 8 },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
    textAlign: "center",
    marginTop: 20,
  },
});
