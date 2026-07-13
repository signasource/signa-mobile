import React, { useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { pingBackend } from "@/api/health";
import { API_URL } from "@/api/client";

/**
 * Pantalla provisoria para validar,
 */
export function ConnectionTestScreen() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ reachable: boolean; status?: number; detail: string } | null>(null);

  async function handleTest() {
    setLoading(true);
    setResult(null);
    const res = await pingBackend();
    setResult(res);
    setLoading(false);
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Test de conexion</Text>
      <Text style={styles.subtitle}>URL configurada:</Text>
      <Text style={styles.url}>{API_URL}</Text>

      <Button label="Probar conexion" onPress={handleTest} loading={loading} style={styles.mt} />

      {loading && <ActivityIndicator color={colors.primary} style={styles.mt} />}

      {result && (
        <Card style={styles.mt}>
          <View style={styles.row}>
            <View style={[styles.dot, { backgroundColor: result.reachable ? colors.verde : colors.danger }]} />
            <Text style={styles.resultTitle}>{result.reachable ? "Backend alcanzable" : "Sin conexion"}</Text>
          </View>
          {result.status !== undefined && <Text style={styles.detail}>Status HTTP: {result.status}</Text>}
          <Text style={styles.detail}>{result.detail}</Text>
        </Card>
      )}

      <Card style={styles.mt}>
        <Text style={styles.hint}>
          Tip: si estas en un emulador de Android, "localhost" no apunta a tu PC. Usa 10.0.2.2 en el .env. En un
          dispositivo fisico, usa la IP local de tu PC (misma red WiFi).
        </Text>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  title: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text },
  subtitle: { fontFamily: fonts.bodyMedium, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 16 },
  url: { fontFamily: fonts.bodySemiBold, fontSize: fontSizes.md, color: colors.primary, marginTop: 4 },
  mt: { marginTop: 16 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  resultTitle: { fontFamily: fonts.headingSemiBold, fontSize: fontSizes.md, color: colors.text },
  detail: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted, marginTop: 2 },
  hint: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.xs, color: colors.textMuted },
});
