import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "@/theme";

/**
 * Set de íconos monocromáticos (Ionicons, línea "outline") usado en toda la app
 * para los campos de formulario. Un solo estilo, un solo color.
 *
 * Uso: <FieldIcon name="user" /> — accesible globalmente desde cualquier pantalla.
 */
export type FieldIconName =
  | "name"
  | "user"
  | "email"
  | "password"
  | "token"
  | "key"
  | "eye"
  | "eyeOff";

const ICONS: Record<FieldIconName, keyof typeof Ionicons.glyphMap> = {
  name: "person-outline",
  user: "at-outline",
  email: "mail-outline",
  password: "lock-closed-outline",
  token: "keypad-outline",
  key: "key-outline",
  eye: "eye-outline",
  eyeOff: "eye-off-outline",
};

interface FieldIconProps {
  name: FieldIconName;
  size?: number;
  color?: string;
}

export function FieldIcon({ name, size = 20, color = colors.textMuted }: FieldIconProps) {
  return <Ionicons name={ICONS[name]} size={size} color={color} />;
}
