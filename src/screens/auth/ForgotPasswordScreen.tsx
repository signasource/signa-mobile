import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { authApi } from "@/api/auth";
import { AuthStackParamList } from "@/navigation/AuthNavigator";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPassword">;

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await authApi.forgotPassword({ email });
      Alert.alert("Listo", "Si el email existe, te enviamos instrucciones para resetear la contrasena.");
      navigation.goBack();
    } catch (err: any) {
      Alert.alert("Error", err?.response?.data?.message ?? err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Recuperar contrasena</Text>
        <Input
          label="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tu@email.com"
        />
        <Button label="Enviar instrucciones" onPress={handleSubmit} loading={loading} style={styles.mt} />
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
