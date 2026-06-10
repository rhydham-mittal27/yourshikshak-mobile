import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { width: SW, height: SH } = Dimensions.get("window");
const LOGO_SIZE = Math.min(SW * 0.28, 110);

export default function AppSplashScreen() {
  const logoScale   = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameY       = useRef(new Animated.Value(16)).current;
  const tagOpacity  = useRef(new Animated.Value(0)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo pops in
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, tension: 70, friction: 7, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 350, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start(() => {
      // Name slides up
      Animated.parallel([
        Animated.timing(nameY, { toValue: 0, duration: 300, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(nameOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
      // Tagline
      Animated.timing(tagOpacity, { toValue: 1, duration: 300, delay: 200, useNativeDriver: true }).start();
    });

    // Staggered dot bounce loop
    const makeDot = (anim: Animated.Value, delay: number) =>
      Animated.loop(Animated.sequence([
        Animated.delay(delay),
        Animated.timing(anim, { toValue: -8, duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0,  duration: 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.delay(500),
      ]));

    const loops = [makeDot(dot1, 0), makeDot(dot2, 150), makeDot(dot3, 300)];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, []);

  return (
    <View style={s.root}>

      {/* Soft top glow */}
      <View style={s.topGlow} />

      {/* Centre content */}
      <View style={s.centre}>

        {/* Logo tile */}
        <Animated.View style={[s.logoTile, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
          <Image
            source={require("../../assets/logo.jpg")}
            style={s.logoImg}
            resizeMode="cover"
          />
        </Animated.View>

        {/* App name */}
        <Animated.View style={{ opacity: nameOpacity, transform: [{ translateY: nameY }] }}>
          <Text style={s.appName}>
            Your<Text style={s.accent}>Shikshak</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          Learn · Grow · Succeed
        </Animated.Text>
      </View>

      {/* Loading dots */}
      <View style={s.dotsRow}>
        {[dot1, dot2, dot3].map((anim, i) => (
          <Animated.View
            key={i}
            style={[s.dot, i === 1 && s.dotActive, { transform: [{ translateY: anim }] }]}
          />
        ))}
      </View>

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0A1628",
    alignItems: "center",
    justifyContent: "center",
  },
  topGlow: {
    position: "absolute",
    top: -120,
    width: SW * 1.2,
    height: 360,
    borderRadius: SW * 0.6,
    backgroundColor: "#1A4DB0",
    opacity: 0.18,
  },
  centre: {
    alignItems: "center",
  },
  logoTile: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.22,
    overflow: "hidden",
    backgroundColor: "#1A3A8F",
    // shadow
    shadowColor: "#3B82F6",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 14,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },
  appName: {
    marginTop: 22,
    fontSize: 32,
    fontWeight: "800",
    color: "#E8F0FF",
    letterSpacing: -0.5,
  },
  accent: {
    color: "#5B9BFF",
  },
  tagline: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: "500",
    color: "#6B8FCC",
    letterSpacing: 2,
  },
  dotsRow: {
    position: "absolute",
    bottom: SH * 0.1,
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-end",
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2A4A7F",
  },
  dotActive: {
    backgroundColor: "#5B9BFF",
    width: 9,
    height: 9,
    borderRadius: 5,
  },
});
