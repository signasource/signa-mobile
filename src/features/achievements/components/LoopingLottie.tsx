import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleProp, ViewStyle } from "react-native";
import LottieView, { AnimationObject } from "lottie-react-native";

const AnimatedLottie = Animated.createAnimatedComponent(LottieView);

interface LoopingLottieProps {
  source: AnimationObject;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lottie that loops by driving `progress` from JS instead of `autoPlay`. `autoPlay` dispatches a
 * native `play` command on Android, which crashes ("play on view with tag N, since the view does
 * not exist") when the screen unmounts or the view is recycled before the command lands.
 */
export function LoopingLottie({ source, style }: LoopingLottieProps) {
  const progress = useRef(new Animated.Value(0)).current;
  const { fr, ip, op } = source as { fr?: number; ip?: number; op?: number };
  const duration = fr && ip !== undefined && op !== undefined ? ((op - ip) / fr) * 1000 : 3000;

  useEffect(() => {
    progress.setValue(0);
    const loop = Animated.loop(
      Animated.timing(progress, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: false })
    );
    loop.start();
    return () => loop.stop();
  }, [progress, duration]);

  return <AnimatedLottie source={source} progress={progress} style={style} resizeMode="contain" />;
}
