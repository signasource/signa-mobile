import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { colors } from "@/theme";

interface AuthScreenProps {
  children: React.ReactNode;
  /** Muestra la flecha de volver. Por defecto sí, salvo que no haya a dónde volver. */
  onBack?: () => void;
  canGoBack?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/**
 * Shell común de las pantallas de auth: teclado + scroll + botón de volver,
 * respetando el área segura (notch / status bar / home indicator). Antes este
 * bloque estaba copiado textualmente en cada pantalla, con paddings fijos que
 * no contemplaban dispositivos con notch.
 */
export function AuthScreen({ children, onBack, canGoBack = true, contentStyle }: AuthScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 },
          contentStyle,
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {onBack ? <BackButton onPress={onBack} visible={canGoBack} /> : null}
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 30 },
});
