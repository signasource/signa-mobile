import React from "react";
import { Modal, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";
import { colors, fonts, fontSizes } from "@/theme";
import Candado from "@assets/ilus/candado.svg";

interface SessionExpiredModalProps {
  visible: boolean;
  onLogin: () => void;
  onExit: () => void;
}

/**
 * Aviso modal que tapa la pantalla actual cuando la sesión se cierra sola
 * (inactividad / refresh fallido), en vez de saltar directo a la pantalla
 * de auth y dejar ver un instante estados vacíos (p. ej. "No tenés amigos").
 */
export function SessionExpiredModal({ visible, onLogin, onExit }: SessionExpiredModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={styles.overlay}>
        <View style={[styles.card, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.handle} />

          <View style={styles.iconWrap}>
            <Candado width={90} height={120} />
          </View>

          <Text style={styles.title}>Se cerró tu sesión</Text>
          <Text style={styles.subtitle}>
            Pasó demasiado tiempo sin actividad. Volvé a entrar y seguís donde lo dejaste: tu
            progreso está guardado.
          </Text>

          <Button label="Iniciar sesión" onPress={onLogin} style={styles.button} />
          <Button label="Salir" variant="secondary" onPress={onExit} style={styles.button} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  card: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: "center",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    marginBottom: 24,
  },
  iconWrap: {
    marginBottom: 20,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: fontSizes.xl,
    color: colors.neutral900,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.sm,
    lineHeight: 20,
    color: colors.neutral600,
    textAlign: "center",
    marginTop: 10,
    marginBottom: 24,
  },
  button: {
    width: "100%",
    marginTop: 0,
    marginBottom: 12,
  },
});
