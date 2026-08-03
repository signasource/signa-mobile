import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AuthStackParamList } from "@/navigation/AuthNavigator";
import { FieldIcon } from "@/components/FieldIcon";
import { PrimaryButton } from "@/components/auth";
import { colors, fonts } from "@/theme";

type Props = NativeStackScreenProps<AuthStackParamList, "ForgotPasswordSent">;

export function ForgotPasswordSentScreen({ navigation, route }: Props) {
  const { email } = route.params;
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 24 }]}>
      {/* Email icon */}
      <View style={styles.iconSection}>
        <View style={styles.pulseOuter} />
        <View style={styles.pulseInner} />
        <View style={styles.iconCircle}>
          <FieldIcon name="email" size={46} color={colors.primary} />
        </View>
      </View>

      {/* Text */}
      <Text style={styles.heading}>Revisá tu correo</Text>
      <Text style={styles.body}>
        Te enviamos un enlace a{" "}
        <Text style={styles.emailHighlight}>{email}</Text>
        {" "}para restablecer tu contraseña.
      </Text>

      {/* Actions */}
      <View style={styles.actions}>
        <PrimaryButton
          label="Volver a iniciar sesión"
          onPress={() => navigation.navigate("Login")}
          style={styles.btn}
        />

        <Text style={styles.resendHint}>
          ¿No te llegó?{" "}
          <Text
            style={styles.resendLink}
            onPress={() => navigation.navigate("ForgotPassword")}
            accessibilityRole="link"
            accessibilityLabel="Reenviar"
          >
            Reenviar
          </Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  iconSection: {
    width: 128,
    height: 128,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  pulseOuter: {
    position: "absolute",
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  pulseInner: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    opacity: 0.16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 22 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  heading: {
    marginTop: 32,
    fontFamily: fonts.displaySemiBold,
    fontSize: 32,
    lineHeight: 34,
    color: colors.text,
    letterSpacing: -0.9,
    textAlign: "center",
    marginBottom: 10,
  },
  body: {
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    lineHeight: 25,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 290,
  },
  emailHighlight: {
    fontFamily: fonts.bodyBold,
    color: colors.text,
  },
  actions: {
    width: "100%",
    marginTop: "auto",
    gap: 16,
    alignItems: "center",
  },
  btn: { width: "100%" },
  resendHint: { fontFamily: fonts.bodyMedium, fontSize: 15, color: colors.textMuted },
  resendLink: { fontFamily: fonts.bodyBold, color: colors.primary },
});
