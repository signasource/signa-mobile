import React, { useEffect, useState } from "react";
import { Image, StyleSheet } from "react-native";

interface Props {
  /** From `avatarUri()`; renders nothing when empty or when the image fails to load. */
  uri?: string | null;
}

/**
 * Profile photo that fills its (round) parent. Draw the initials underneath: they stay
 * visible while the photo loads and when there is none.
 */
export function AvatarPhoto({ uri }: Props) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);

  if (!uri || failed) return null;
  return (
    <Image
      source={{ uri }}
      style={styles.photo}
      resizeMode="cover"
      onError={() => setFailed(true)}
      accessibilityIgnoresInvertColors
    />
  );
}

const styles = StyleSheet.create({
  photo: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
  },
});
