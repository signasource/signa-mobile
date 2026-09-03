import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { Text } from "@/components/Text";
import { fonts } from "@/theme";
import { avatarColors, initialsOf } from "@/features/social/people";

interface Props {
  /** Drives the avatar colour; stable across screens. */
  id: string;
  name: string;
  username: string;
  size?: number;
  /** When given, the avatar becomes tappable. */
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
