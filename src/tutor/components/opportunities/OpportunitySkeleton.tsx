import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";

interface Props {
  w: number | string;
  h: number;
  radius?: number;
}

const OpportunitySkeleton: React.FC<Props> = ({ w, h, radius = 8 }) => {
  const anim = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
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
        borderRadius: radius,
        backgroundColor: "#E2E8F0",
        opacity: anim,
      }}
    />
  );
};

export default OpportunitySkeleton;

