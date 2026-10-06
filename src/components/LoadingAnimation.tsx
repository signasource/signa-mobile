import React, { useEffect, useRef } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import LottieView from "lottie-react-native";

// Signa-coloured bouncing dots, shown while a 3D sign or a screen is loading.
const SOURCE = require("@assets/animations/loading.json");

interface LoadingAnimationProps {
  /** Side of the square the dots animation is laid out in, in dp. */
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function LoadingAnimation({ size = 120, style }: LoadingAnimationProps) {
  const ref = useRef<LottieView>(null);

  // Pause before unmount so no in-flight play commands reach a detached native view.
  useEffect(() => () => { ref.current?.pause(); }, []);

  return (
    <View style={[{ width: size, height: size * 0.75 }, style]} pointerEvents="none">
      <LottieView ref={ref} source={SOURCE} autoPlay loop style={styles.fill} />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: "100%", height: "100%" },
});
