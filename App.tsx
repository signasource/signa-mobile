import React, { useEffect } from "react";
import { ActivityIndicator, Alert, View } from "react-native";
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
// ESPIGA: mide MediaPipe nativo contra los números que ya tenemos del WebView.
import { banco } from "./modules/signa-vision";
import { colors } from "@/theme";

export default function App() {
  // ESPIGA — temporal, rama perf/reconocimiento-nativo.
  // Corre al arrancar porque lo único que se quiere es el número, y así no hay
  // que navegar a ningún lado ni construir pantalla para obtenerlo.
  useEffect(() => {
    let vivo = true;
    (async () => {
      try {
        const gpu = await banco(30, true);
        const cpu = await banco(30, false);
        if (!vivo) return;
        Alert.alert(
          "MediaPipe nativo",
          `GPU   manos ${gpu.manosMs.toFixed(1)} ms · pose ${gpu.poseMs.toFixed(1)} ms\n` +
            `      mínimos ${gpu.manosMsMin.toFixed(1)} / ${gpu.poseMsMin.toFixed(1)}\n` +
            `      calentamiento ${gpu.calentamientoManosMs.toFixed(0)} / ${gpu.calentamientoPoseMs.toFixed(0)} ms\n\n` +
            `CPU   manos ${cpu.manosMs.toFixed(1)} ms · pose ${cpu.poseMs.toFixed(1)} ms\n\n` +
            `Hoy en el WebView: manos 70-136, pose 50-112`,
        );
      } catch (e) {
        Alert.alert("MediaPipe nativo", "falló: " + String(e));
      }
    })();
    return () => {
      vivo = false;
    };
  }, []);

  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

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
