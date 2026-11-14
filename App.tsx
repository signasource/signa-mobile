import React, { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
} from "@expo-google-fonts/figtree";
import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from "@expo-google-fonts/bricolage-grotesque";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "@/context/AuthContext";
import { SettingsProvider } from "@/context/SettingsContext";
import { RootNavigator } from "@/navigation/RootNavigator";
import { initTelemetry } from "@/telemetry/telemetry";
// ESPIGA: mide MediaPipe nativo contra los números que ya tenemos del WebView.
import { BancoNativoPantalla } from "@/features/ml/BancoNativoPantalla";
import { hayNativo } from "./modules/signa-vision";
import { colors } from "@/theme";

/**
 * El banco del reconocedor nativo se abre antes que la app sólo si se pide
 * (`EXPO_PUBLIC_BANCO_NATIVO=1` al compilar): en un APK para usar estorba.
 */
const MOSTRAR_BANCO = process.env.EXPO_PUBLIC_BANCO_NATIVO === "1";

export default function App() {
  useEffect(() => initTelemetry(), []);
  // ETAPA 1: el reconocedor nativo se muestra antes que la app, para poder
  // verlo y medirlo sin tener que atravesar una lección.
  const [bancoListo, setBancoListo] = useState(!MOSTRAR_BANCO);

  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  // Dentro de SettingsProvider: el banco monta el ejercicio real, y los
  // componentes de la app leen el tamaño de letra de ahí.
  // El banco mide el reconocedor nativo: sin modulo (iOS) no hay nada que medir.
  if (fontsLoaded && !bancoListo && hayNativo) {
    return (
      <SafeAreaProvider>
        <SettingsProvider>
          <BancoNativoPantalla onSeguir={() => setBancoListo(true)} />
        </SettingsProvider>
      </SafeAreaProvider>
    );
  }

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <StatusBar style="dark" />
          <RootNavigator />
        </AuthProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
