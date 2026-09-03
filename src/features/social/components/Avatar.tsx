import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { fonts } from "@/theme";
import { avatarColors, initialsOf } from "@/features/social/people";

interface Props {
  /** Id del usuario: define el color, estable entre pantallas. */
  id: string;
  name: string;
  username: string;
  size?: number;
  /** Cuando se pasa, el avatar se vuelve tocable (lleva al perfil de esa persona). */
  onPress?: () => void;
}

export function Avatar({ id, name, username, size = 40, onPress }: Props) {
  const { bg, fg } = avatarColors(id);
  const fontSize = Math.round(size * 0.325);

  const circle = (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: bg },
      ]}
    >
      <Text style={[styles.initials, { color: fg, fontSize }]}>
        {initialsOf(name, username)}
      </Text>
    </View>
  );

  if (!onPress) return circle;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Ver el perfil de ${name}`}
    >
      {circle}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    fontFamily: fonts.displayExtraBold,
  },
});
