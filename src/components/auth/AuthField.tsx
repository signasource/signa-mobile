import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TextInputProps,
  Pressable,
  StyleSheet,
} from "react-native";
import { FieldIcon, FieldIconName } from "@/components/FieldIcon";
import { colors, fonts } from "@/theme";

type HintTone = "muted" | "success" | "danger";

interface AuthFieldProps extends Omit<TextInputProps, "secureTextEntry"> {
  icon: FieldIconName;
  /** Campo de contraseña: agrega el toggle de ojo y oculta el texto. */
  secure?: boolean;
  /** Aplica el resaltado de error al recuadro del campo. */
  invalid?: boolean;
  /** Texto de error (rojo) debajo del campo. */
  error?: string | null;
  /** Texto de ayuda con tono configurable debajo del campo. */
  hint?: string | null;
  hintTone?: HintTone;
  /** Nodo a la derecha dentro del campo (ej: estado de disponibilidad). */
  trailing?: React.ReactNode;
}

/**
 * Campo de formulario de auth: recuadro "pill" con ícono a la izquierda,
 * toggle de contraseña opcional, slot para estado a la derecha y texto de
 * error/ayuda debajo. Reemplaza ~9 copias del mismo bloque en las pantallas.
 */
export function AuthField({
  icon,
  secure = false,
  invalid = false,
  error,
  hint,
  hintTone = "muted",
  trailing,
  style,
  ...inputProps
}: AuthFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  const hasRightAdornment = secure || trailing != null;

  return (
    <View>
      <View style={[styles.fieldWrap, invalid && styles.fieldError]}>
        <View style={styles.fieldIcon}>
          <FieldIcon name={icon} />
        </View>
        <TextInput
          style={[styles.input, hasRightAdornment && styles.inputWithAdornment, style]}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={secure && !showSecret}
          {...inputProps}
        />
        {secure ? (
          <Pressable onPress={() => setShowSecret((v) => !v)} style={styles.eyeBtn}>
            <FieldIcon name={showSecret ? "eyeOff" : "eye"} size={20} />
          </Pressable>
        ) : null}
        {!secure && trailing ? <View style={styles.trailing}>{trailing}</View> : null}
      </View>

      {error ? (
        <Text style={[styles.hint, styles.hintDanger]}>{error}</Text>
      ) : hint ? (
        <Text style={[styles.hint, TONE_STYLE[hintTone]]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 17,
  },
  fieldError: {
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 3,
    elevation: 3,
  },
  fieldIcon: { width: 22, marginRight: 12, alignItems: "center", justifyContent: "center" },
  input: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
  },
  inputWithAdornment: { paddingRight: 44 },
  eyeBtn: { padding: 8 },
  trailing: { position: "absolute", right: 17 },
  hint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: 4,
    marginLeft: 6,
  },
  hintMuted: { color: colors.textMuted },
  hintSuccess: { color: colors.success },
  hintDanger: { color: colors.danger },
});

const TONE_STYLE: Record<HintTone, { color: string }> = {
  muted: styles.hintMuted,
  success: styles.hintSuccess,
  danger: styles.hintDanger,
};
