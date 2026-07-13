import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";

/**
 * PLACEHOLDER puro, sin react-native-vision-camera ni ningun runtime de
 * TFLite instalado. Esta
 * pantalla existe para que el flujo de navegacion ya tenga el lugar
 * reservado para practicar con la camara sin bloquear el resto del app.
 */
export function SignRecognitionScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Practicar con la camara</Text>
      <Card>
        <Text style={styles.text}>
          Aca va a vivir el reconocimiento de senas en vivo por camara. Todavia falta definir la libreria de camara, el
          runtime de inferencia (TFLite/ONNX) y el formato de salida del modelo entrenado en signa-ml. Ver
          src/features/ml/README.md.
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
