import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { authApi } from "@/api/auth";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "ResetPassword">;

/**
 *  Sin deep linking configurado.
 */
export function ResetPasswordScreen({ navigation, route }: Props) {
  const [token, setToken] = useState(route.params?.token ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await authApi.resetPassword({ newPassword }, token);
      Alert.alert("Contrasena actualizada", "Ya podes iniciar sesion con tu nueva contrasena.");
      navigation.navigate("Login");
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Nueva contrasena</Text>
        <Input label="Token" value={token} onChangeText={setToken} placeholder="Token recibido por email" />
        <Input
          label="Nueva contrasena"
          value={newPassword}
          onChangeText={setNewPassword}
          secureTextEntry
          placeholder="********"
        />
        <Button label="Guardar" onPress={handleSubmit} loading={loading} style={styles.mt} />
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
});
