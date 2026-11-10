import React from "react";
import { StyleSheet, ViewStyle, StyleProp, useWindowDimensions } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BackButton } from "@/components/BackButton";
import { colors } from "@/theme";

/** Widest the form column grows on tablets / landscape; phones keep the 30dp gutter. */
const MAX_CONTENT_WIDTH = 480;
const MIN_GUTTER = 30;

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
 * no contemplaban dispositivos con notch. `KeyboardAwareScrollView` además
 * desplaza automáticamente el campo enfocado por encima del teclado en
 * ambas plataformas (antes Android no tenía ningún manejo de teclado acá).
 */
export function AuthScreen({ children, onBack, canGoBack = true, contentStyle }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const gutter = Math.max(MIN_GUTTER, (width - MAX_CONTENT_WIDTH) / 2);
  // Must be a flat object, not an array: on Android the library reads
  // `contentContainerStyle.paddingBottom` to append its own padding, and with an array it
  // reads undefined and overwrites ours with 0 (footer ended up under the system nav buttons).
  const contentContainerStyle = StyleSheet.flatten([
    styles.container,
    { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: gutter },
    contentStyle,
  ]);

  return (
    <KeyboardAwareScrollView
      style={styles.flex}
      contentContainerStyle={contentContainerStyle}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      enableOnAndroid
      extraScrollHeight={20}
    >
      {onBack ? <BackButton onPress={onBack} visible={canGoBack} /> : null}
      {children}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.background },
  container: { flexGrow: 1, paddingHorizontal: 30 },
});
