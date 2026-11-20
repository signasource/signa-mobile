import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import Candado from "@assets/ilus/candado.svg";

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "Administrador de Signa",
  ORG_ADMIN: "Representante de organización",
};

interface Props {
  role: string;
}

export function RoleBlockedScreen({ role }: Props) {
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();
  const roleLabel = ROLE_LABELS[role] ?? role;

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconWrap}>
        <Candado width={42} height={56} />
      </View>
      <Text style={styles.title}>Esta app es para estudiantes</Text>
      <Text style={styles.body}>
        Tu cuenta tiene el rol de <Text style={styles.bold}>{roleLabel}</Text>, que no puede usar la
        app móvil.{"\n\n"}
        Para acceder al contenido como estudiante, creá una cuenta nueva con un mail diferente.
      </Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
        onPress={() => logout()}
      >
        <Text style={styles.btnLabel}>Cerrar sesión</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 16,
  },
  iconWrap: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
  },
  body: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 23,
    color: colors.textMuted,
    textAlign: "center",
  },
  bold: { fontFamily: fonts.bodyBold, color: colors.text },
  btn: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: colors.text,
    borderRadius: 14,
  },
  btnPressed: { opacity: 0.85 },
  btnLabel: { fontFamily: fonts.bodySemiBold, fontSize: 16, color: colors.onDark },
});
