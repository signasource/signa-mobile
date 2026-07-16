import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { useAuth } from "@/context/AuthContext";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Home">;

export function HomeScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.greeting}>Hola{user?.name ? `, ${user.name}` : ""} 👋</Text>
      <Text style={styles.subtitle}>Bienvenido/a a Signa</Text>

      <Card style={styles.card}>
        <Text style={styles.cardTitle}>Tu cuenta</Text>
        <Text style={styles.cardText}>Email: {user?.email ?? "-"}</Text>
      </Card>

      <Text style={styles.sectionLabel}>Aprender</Text>
      <Button label="Cursos" onPress={() => navigation.navigate("Courses")} style={styles.mt} />
      <Button
        label="Practicar con la camara"
        variant="secondary"
        onPress={() => navigation.navigate("SignRecognition")}
        style={styles.mt}
      />

      <Text style={styles.sectionLabel}>Cuenta</Text>
      <Button label="Ver perfil" variant="outline" onPress={() => navigation.navigate("Profile")} style={styles.mt} />
      <Button
        label="Cambiar contrasena"
        variant="outline"
        onPress={() => navigation.navigate("ChangePassword")}
        style={styles.mt}
      />
      <Button
        label="Probar conexion con el backend"
        variant="outline"
        onPress={() => navigation.navigate("ConnectionTest")}
        style={styles.mt}
      />
      <Button label="Cerrar sesion" variant="secondary" onPress={logout} style={styles.mt} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  greeting: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text },
  subtitle: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.md, color: colors.textMuted, marginBottom: 24 },
  card: { marginBottom: 8 },
  cardTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.primary, marginBottom: 8 },
  cardText: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.text, marginBottom: 2 },
  sectionLabel: {
    fontFamily: fonts.headingSemiBold,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 24,
    marginBottom: 4,
    textTransform: "uppercase",
  },
  mt: { marginTop: 12 },
});
