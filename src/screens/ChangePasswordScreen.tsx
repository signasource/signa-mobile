import React, { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { useAuth } from "@/context/AuthContext";
import { mapAuthError } from "@/utils/authErrors";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "ChangePassword">;

/**
 * PUT /users/password
 */
export function ChangePasswordScreen({ navigation }: Props) {
  const { changePassword } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword });
      Alert.alert("Listo", "Tu contrasena se actualizo correctamente.");
      navigation.goBack();
    } catch (err: unknown) {
      Alert.alert("Error", mapAuthError(err, "No se pudo cambiar la contraseña"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Cambiar contrasena</Text>
        <Input
          label="Contrasena actual"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secureTextEntry
          placeholder="********"
        />
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
  container: { flexGrow: 1, padding: 24, paddingTop: 64 },
  title: {
    fontFamily: fonts.headingBold,
    fontSize: fontSizes.xl,
    color: colors.text,
    marginBottom: 24,
  },
  mt: { marginTop: 8 },
});
