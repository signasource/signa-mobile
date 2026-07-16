import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";

/**
 * PLACEHOLDER. Aca va a vivir el player de la leccion.
 * Todavia no esta conectado a nada real.
 */
export function LessonScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Leccion</Text>
      <Card>
        <Text style={styles.text}>
          Aca va el reproductor de la sena (animacion/video) y los bloques de la leccion. Falta definir con el back
          como se van a servir los assets de animacion antes de construir esto.
        </Text>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  title: { fontFamily: fonts.headingBold, fontSize: fontSizes.xl, color: colors.text, marginBottom: 20 },
  text: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.textMuted },
});
