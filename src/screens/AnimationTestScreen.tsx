import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { signsApi } from "@/api/signs";
import { GlbAnimationView } from "@/features/animations/GlbAnimationView";

// Demo sign meaning from .env (the backend's local TestSignSeeder creates "test"), editable below.
const DEFAULT_SIGN_MEANING = process.env.EXPO_PUBLIC_TEST_SIGN_MEANING ?? "test";

export function AnimationTestScreen() {
  const [meaning, setMeaning] = useState(DEFAULT_SIGN_MEANING);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [animationUrl, setAnimationUrl] = useState<string | null>(null);
  const [clipNames, setClipNames] = useState<string[]>([]);
  const [paused, setPaused] = useState(false);

  async function handleLoad() {
    setError(null);
    setAnimationUrl(null);
    setClipNames([]);
    setPaused(false);

    if (!meaning.trim()) {
      setError("Ingresá el meaning de una seña con animación.");
      return;
    }

    setLoading(true);
    try {
      const { data } = await signsApi.getAnimation(meaning.trim());
      setAnimationUrl(data.animationUrl);
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 404) {
        setError("La seña no existe o no tiene animación (404).");
      } else {
        setError(err?.response?.data?.message ?? "No se pudo obtener la animación.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Test de animación 3D</Text>

      <Text style={styles.subtitle}>Meaning de la seña</Text>
      <TextInput
        style={styles.input}
        value={meaning}
        onChangeText={setMeaning}
        placeholder="test"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Button label="Cargar animación" onPress={handleLoad} loading={loading} style={styles.mt} />

      {error && (
        <Card style={styles.mt}>
          <Text style={styles.error}>{error}</Text>
        </Card>
      )}

      {animationUrl && (
        <>
          <View style={styles.viewer}>
            <GlbAnimationView
              url={animationUrl}
              paused={paused}
              onLoaded={setClipNames}
              onError={setError}
            />
          </View>
          <Button
            label={paused ? "Reproducir" : "Pausar"}
            variant="outline"
            onPress={() => setPaused((p) => !p)}
            style={styles.mt}
          />
          <Text style={styles.hint}>
            {clipNames.length > 0
              ? `Clips: ${clipNames.join(", ")}`
              : "El modelo no contiene animaciones."}
          </Text>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: colors.background, padding: 24, paddingTop: 64 },
  title: { fontFamily: fonts.displayBold, fontSize: fontSizes.xl, color: colors.text },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: fontSizes.sm,
    color: colors.textMuted,
    marginTop: 16,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  mt: { marginTop: 16 },
  viewer: {
    height: 320,
    marginTop: 20,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: colors.fill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: { fontFamily: fonts.bodyRegular, fontSize: fontSizes.sm, color: colors.danger },
  hint: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.xs,
    color: colors.textMuted,
    marginTop: 12,
    textAlign: "center",
  },
});
