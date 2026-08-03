import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { colors, fonts } from "@/theme";

/** Separador "— o —" entre el formulario y los accesos alternativos. */
export function AuthDivider() {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerText}>o</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

interface AuthFooterProps {
  text: string;
  linkLabel: string;
  onPress: () => void;
  /** Empuja el pie al fondo de la pantalla (marginTop auto). */
  pinToBottom?: boolean;
}

/** Pie con texto + link (ej: "¿Ya tenés cuenta? Iniciá sesión"). */
export function AuthFooter({ text, linkLabel, onPress, pinToBottom }: AuthFooterProps) {
  return (
    <View style={[styles.footer, pinToBottom && styles.footerBottom]}>
      <Text style={styles.footerText}>
        {text}{" "}
        <Text
          style={styles.footerLink}
          onPress={onPress}
          accessibilityRole="link"
          accessibilityLabel={linkLabel}
        >
          {linkLabel}
        </Text>
      </Text>
    </View>
  );
}

type StatusTone = "danger" | "neutral";

/** Mensaje centrado de error o confirmación debajo de los botones. */
export function StatusText({ children, tone = "danger" }: { children: React.ReactNode; tone?: StatusTone }) {
  return <Text style={[styles.status, tone === "danger" ? styles.statusDanger : styles.statusNeutral]}>{children}</Text>;
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginVertical: 22,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  footer: { alignItems: "center", marginTop: 18 },
  footerBottom: { marginTop: "auto", paddingTop: 26 },
  footerText: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  footerLink: { fontFamily: fonts.bodyBold, color: colors.primary },
  status: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13.5,
    textAlign: "center",
  },
  statusDanger: { color: colors.danger },
  statusNeutral: { color: colors.text },
});
