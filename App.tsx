import React, { useEffect, useState } from "react";
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
import { Banco3D, Medicion3D } from "@/features/animations/Banco3D";
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

        // Se manda al colector además de mostrarlo: leer un número de una foto
        // de la pantalla es la forma más lenta de medir algo.
        const destino = process.env.EXPO_PUBLIC_METRICS_URL;
        if (destino) {
          void fetch(destino, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sesion: "banco-nativo",
              evento: "banco",
              muestras: [{ t: Date.now(), gpu, cpu }],
            }),
          }).catch(() => {});
        }
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

  // ESPIGA: el banco del 3D corre antes que la app y avisa cuando termina.
  const [banco3dListo, setBanco3dListo] = useState(false);

  function reportar3D(m: Medicion3D) {
    const destino = process.env.EXPO_PUBLIC_METRICS_URL;
    if (destino) {
      void fetch(destino, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sesion: "banco-3d",
          evento: "banco3d",
          muestras: [{ t: Date.now(), ...m }],
        }),
      }).catch(() => {});
    }
    Alert.alert(
      "Avatar 3D",
      `WebView   carga ${m.webCargaMs ?? "?"} ms\n` +
        `Filament  carga ${m.nativoCargaMs ?? "?"} ms · ${(m.nativoFps ?? 0).toFixed(0)} fps`,
      [{ text: "Seguir", onPress: () => setBanco3dListo(true) }],
    );
  }

  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
    BricolageGrotesque_600SemiBold,
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
  });

  if (fontsLoaded && !banco3dListo) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, justifyContent: "center", backgroundColor: colors.background }}>
          <Banco3D onListo={reportar3D} />
        </View>
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
