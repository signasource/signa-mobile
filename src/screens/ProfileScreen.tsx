import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";

/**
 * signa-api no expone GET /users/me y el JWT 
 * SOLO lleva el email. Por eso aca solo se
 * puede mostrar con certeza el email. el nombre viene de un cache local
 * best-effort (ver src/utils/profileCache.ts) que se llena al registrarse
 * en este mismo dispositivo, y puede no estar disponible.
 */
export function ProfileScreen() {
  const { user } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil</Text>

      <Card>
        <Text style={styles.row}>Email: {user?.email ?? "-"}</Text>
        <Text style={styles.row}>Nombre: {user?.name ?? "(no disponible en este dispositivo)"}</Text>
      </Card>

      <Card style={styles.mt}>
        <Text style={styles.hint}>
          El backend todavia no expone un endpoint de perfil. El email sale del token; el nombre es un cache local
          que se guarda cuando te registras desde este mismo dispositivo. Rol y otros datos de la cuenta no estan
          disponibles en el front por ahora.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  title: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text, marginBottom: 20 },
  row: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.md, color: colors.text, marginBottom: 8 },
  mt: { marginTop: 16 },
  hint: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.xs, color: colors.textMuted },
});
