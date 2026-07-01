import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

export const Sk = ({
  w,
  h,
  r = 8,
}: {
  w: number | string;
  h: number;
  r?: number;
}) => {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(a, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: r,
        backgroundColor: "#E2E8F0",
        opacity: a,
      }}
    />
  );
};

export default Sk;

