import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "Login">;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login({ email, password });
    } catch (err: any) {
      Alert.alert("Error al iniciar sesion", err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Signa</Text>
        <Text style={styles.subtitle}>Iniciar sesion</Text>

        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@email.com"
        />
        <Input
          label="Contrasena"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="********"
        />

        <Button label="Ingresar" onPress={handleLogin} loading={loading} style={styles.mt} />

        <View style={styles.links}>
          <Text style={styles.link} onPress={() => navigation.navigate("ForgotPassword")}>
            Olvide mi contrasena
          </Text>
          <Text style={styles.link} onPress={() => navigation.navigate("Register")}>
            Crear cuenta
          </Text>
        </View>

        <Button
          label="Probar conexion con el backend"
          variant="outline"
          onPress={() => navigation.navigate("ConnectionTest")}
          style={styles.mt}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, padding: 24, justifyContent: "center" },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: fontSizes.xxl,
    color: colors.primary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.headingMedium,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
    marginBottom: 28,
  },
  mt: { marginTop: 8 },
  links: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  link: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.accent,
  },
});
