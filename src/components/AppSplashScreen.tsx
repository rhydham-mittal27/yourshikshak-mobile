import React, { useEffect, useRef } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Image,
  StyleSheet,
  View,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const { width: SW, height: SH } = Dimensions.get("window");

const DOT_COUNT = 3;
const DOT_SIZE = 7;

export default function AppSplashScreen() {
  // Logo: scale + fade in
  const logoScale   = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  // App name: slide up + fade in
  const nameY       = useRef(new Animated.Value(24)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;

  // Tagline: fade in after name
  const tagOpacity  = useRef(new Animated.Value(0)).current;

  // Ring pulse around logo
  const ringScale   = useRef(new Animated.Value(0.85)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;

  // Dots
  const dotAnims = useRef(
    Array.from({ length: DOT_COUNT }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    // ── Phase 1: logo entrance ───────────────────────────
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 60,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(() => {
      // ── Phase 2: ring pulse ──────────────────────────
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.35, duration: 220, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.22, tension: 55, friction: 6, useNativeDriver: true }),
      ]).start(() => {
        Animated.parallel([
          Animated.timing(ringOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
          Animated.timing(ringScale, { toValue: 1.45, duration: 400, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      });

      // ── Phase 3: name slides up ──────────────────────
      Animated.parallel([
        Animated.timing(nameY, {
          toValue: 0,
          duration: 380,
          delay: 60,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(nameOpacity, {
          toValue: 1,
          duration: 380,
          delay: 60,
          useNativeDriver: true,
        }),
      ]).start();

      // ── Phase 4: tagline fades in ────────────────────
      Animated.timing(tagOpacity, {
        toValue: 1,
        duration: 340,
        delay: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    });

    // ── Dots: staggered infinite bounce ─────────────────
    const buildDotLoop = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: -10,
            duration: 340,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 340,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.delay(300),
        ])
      );

    const dotLoops = dotAnims.map((a, i) => buildDotLoop(a, i * 130));
    dotLoops.forEach((l) => l.start());

    return () => dotLoops.forEach((l) => l.stop());
  }, []);

  const LOGO_SIZE = Math.min(SW * 0.32, 120);

  return (
    <View style={s.root}>
      {/* Background gradient */}
      <LinearGradient
        colors={["#060D1F", "#0A1628", "#060D1F"]}
        locations={[0, 0.5, 1]}
        start={{ x: 0.3, y: 0 }}
        end={{ x: 0.7, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Subtle radial glow behind logo */}
      <View
        style={[
          s.glow,
          { width: LOGO_SIZE * 3.2, height: LOGO_SIZE * 3.2, borderRadius: LOGO_SIZE * 1.6 },
        ]}
      />

      {/* Centre stack */}
      <View style={s.centre}>

        {/* Pulsing ring */}
        <Animated.View
          style={[
            s.ring,
            {
              width: LOGO_SIZE + 24,
              height: LOGO_SIZE + 24,
              borderRadius: (LOGO_SIZE + 24) / 2,
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
            },
          ]}
        />

        {/* Logo container */}
        <Animated.View
          style={[
            s.logoWrap,
            {
              width: LOGO_SIZE,
              height: LOGO_SIZE,
              borderRadius: LOGO_SIZE * 0.26,
              opacity: logoOpacity,
              transform: [{ scale: logoScale }],
            },
          ]}
        >
          <LinearGradient
            colors={["#1A3A8F", "#0052FF", "#0038CC"]}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={[StyleSheet.absoluteFill, { borderRadius: LOGO_SIZE * 0.26 }]}
          />
          <Image
            source={require("../../assets/logo.jpg")}
            style={[
              s.logoImg,
              { width: LOGO_SIZE * 0.68, height: LOGO_SIZE * 0.68, borderRadius: LOGO_SIZE * 0.12 },
            ]}
            resizeMode="cover"
          />
        </Animated.View>

        {/* App name */}
        <Animated.Text
          style={[
            s.appName,
            { opacity: nameOpacity, transform: [{ translateY: nameY }] },
          ]}
        >
          Your<Animated.Text style={s.appNameAccent}>Shikshak</Animated.Text>
        </Animated.Text>

        {/* Tagline */}
        <Animated.Text style={[s.tagline, { opacity: tagOpacity }]}>
          Learn · Grow · Succeed
        </Animated.Text>
      </View>

      {/* Dots at bottom */}
      <View style={s.dotsRow}>
        {dotAnims.map((anim, i) => (
          <Animated.View
            key={i}
            style={[
              s.dot,
              i === 1 && s.dotMid,
              { transform: [{ translateY: anim }] },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#060D1F",
    alignItems: "center",
    justifyContent: "center",
  },
  glow: {
    position: "absolute",
    backgroundColor: "#0052FF",
    opacity: 0.07,
  },
  centre: {
    alignItems: "center",
  },
  ring: {
    position: "absolute",
    borderWidth: 2,
    borderColor: "#0052FF",
  },
  logoWrap: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    // subtle shadow
    shadowColor: "#0052FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 16,
  },
  logoImg: {
    zIndex: 1,
  },
  appName: {
    marginTop: 24,
    fontSize: 30,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: -0.5,
  },
  appNameAccent: {
    color: "#4D8EFF",
  },
  tagline: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "500",
    color: "#4A6FA5",
    letterSpacing: 1.6,
  },
  dotsRow: {
    position: "absolute",
    bottom: SH * 0.1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: "#1E3A6E",
  },
  dotMid: {
    backgroundColor: "#0052FF",
    width: DOT_SIZE + 2,
    height: DOT_SIZE + 2,
    borderRadius: (DOT_SIZE + 2) / 2,
  },
});
