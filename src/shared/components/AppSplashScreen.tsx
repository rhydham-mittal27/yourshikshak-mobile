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
const LOGO_SIZE = 100;
const RING_SIZE  = LOGO_SIZE + 32;
const GLOW_SIZE  = LOGO_SIZE + 64;

export default function AppSplashScreen() {
  // â”€â”€ Entrance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const logoScale    = useRef(new Animated.Value(0.45)).current;
  const logoOpacity  = useRef(new Animated.Value(0)).current;
  const ringOpacity  = useRef(new Animated.Value(0)).current;
  const nameOpacity  = useRef(new Animated.Value(0)).current;
  const nameY        = useRef(new Animated.Value(22)).current;
  const tagOpacity   = useRef(new Animated.Value(0)).current;
  const tagY         = useRef(new Animated.Value(10)).current;
  const badgeOpacity = useRef(new Animated.Value(0)).current;

  // â”€â”€ Continuous â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const arcRotate  = useRef(new Animated.Value(0)).current;
  const glowPulse  = useRef(new Animated.Value(0.25)).current;
  const ringScale  = useRef(new Animated.Value(1)).current;
  const progressW  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Logo pop-in
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1, tension: 55, friction: 7, useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
      }),
      Animated.timing(ringOpacity, {
        toValue: 1, duration: 500, delay: 180, easing: Easing.out(Easing.quad), useNativeDriver: true,
      }),
    ]).start();

    // Name
    Animated.sequence([
      Animated.delay(380),
      Animated.parallel([
        Animated.timing(nameOpacity, {
          toValue: 1, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(nameY, {
          toValue: 0, duration: 420, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Tagline
    Animated.sequence([
      Animated.delay(580),
      Animated.parallel([
        Animated.timing(tagOpacity, {
          toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
        Animated.timing(tagY, {
          toValue: 0, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: true,
        }),
      ]),
    ]).start();

    // Badge
    Animated.timing(badgeOpacity, {
      toValue: 1, duration: 350, delay: 820, useNativeDriver: true,
    }).start();

    // Spinning arc
    Animated.loop(
      Animated.timing(arcRotate, {
        toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true,
      })
    ).start();

    // Soft glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 0.5, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 0.2, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    ).start();

    // Ring breathe
    Animated.loop(
      Animated.sequence([
        Animated.timing(ringScale, {
          toValue: 1.07, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
        Animated.timing(ringScale, {
          toValue: 1.0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
        }),
      ])
    ).start();

    // Progress bar fills over 3 s
    Animated.timing(progressW, {
      toValue: SW * 0.58, duration: 3000, easing: Easing.inOut(Easing.cubic), useNativeDriver: false,
    }).start();
  }, []);

  const spin = arcRotate.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={s.root}>

      {/* â”€â”€ Soft background blobs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Animated.View style={[s.blobTopLeft,     { opacity: glowPulse }]} />
      <Animated.View style={[s.blobBottomRight, { opacity: glowPulse }]} />

      {/* â”€â”€ Center content â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={s.center}>

        {/* Logo cluster */}
        <View style={s.logoCluster}>
          {/* Soft halo */}
          <Animated.View style={[s.logoGlow, { opacity: glowPulse, transform: [{ scale: ringScale }] }]} />

          {/* Spinning arc */}
          <Animated.View style={[s.arcRing, { opacity: ringOpacity, transform: [{ rotate: spin }] }]} />

          {/* Static decorative ring */}
          <Animated.View style={[s.staticRing, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />

          {/* Logo tile */}
          <Animated.View style={[s.logoTile, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <Image
              source={require("../../../assets/logo.jpg")}
              style={s.logoImg}
              resizeMode="cover"
            />
          </Animated.View>
        </View>

        {/* App name */}
        <Animated.View style={[s.nameRow, { opacity: nameOpacity, transform: [{ translateY: nameY }] }]}>
          <Text style={s.appName}>
            Your<Text style={s.accent}>Shikshak</Text>
          </Text>
        </Animated.View>

        {/* Tagline */}
        <Animated.View style={{ opacity: tagOpacity, transform: [{ translateY: tagY }] }}>
          <Text style={s.tagline}>Empowering Education</Text>
        </Animated.View>

        {/* Badge */}
        <Animated.View style={[s.badge, { opacity: badgeOpacity }]}>
          <View style={s.badgeDot} />
          <Text style={s.badgeText}>India's Trusted Tutor Network</Text>
          <View style={s.badgeDot} />
        </Animated.View>

      </View>

      {/* â”€â”€ Progress bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: progressW }]} />
      </View>

      {/* â”€â”€ Version â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <Animated.Text style={[s.versionTag, { opacity: badgeOpacity }]}>v1.0</Animated.Text>

    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // Background blobs â€” very soft blue tints
  blobTopLeft: {
    position: "absolute",
    top: -SH * 0.18,
    left: -SW * 0.3,
    width: SW * 1.1,
    height: SW * 1.1,
    borderRadius: SW * 0.55,
    backgroundColor: "#BFDBFE",
  },
  blobBottomRight: {
    position: "absolute",
    bottom: -SH * 0.2,
    right: -SW * 0.35,
    width: SW * 0.95,
    height: SW * 0.95,
    borderRadius: SW * 0.48,
    backgroundColor: "#C7D2FE",
  },

  // Logo cluster
  center: {
    alignItems: "center",
    zIndex: 10,
  },
  logoCluster: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logoGlow: {
    position: "absolute",
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: GLOW_SIZE / 2,
    backgroundColor: "#BFDBFE",
  },
  arcRing: {
    position: "absolute",
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: RING_SIZE / 2,
    borderWidth: 2.5,
    borderTopColor: "#2563EB",
    borderRightColor: "#2563EB50",
    borderBottomColor: "transparent",
    borderLeftColor: "transparent",
  },
  staticRing: {
    position: "absolute",
    width: RING_SIZE + 14,
    height: RING_SIZE + 14,
    borderRadius: (RING_SIZE + 14) / 2,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  logoTile: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_SIZE * 0.24,
    overflow: "hidden",
    backgroundColor: "#EFF6FF",
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 12,
  },
  logoImg: {
    width: "100%",
    height: "100%",
  },

  // Text
  nameRow: {
    marginBottom: 8,
  },
  appName: {
    fontSize: 36,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.8,
  },
  accent: {
    color: "#2563EB",
  },
  tagline: {
    fontSize: 12,
    fontWeight: "600",
    color: "#94A3B8",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: 20,
  },

  // Badge
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    backgroundColor: "#EFF6FF",
  },
  badgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB",
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.3,
  },

  // Progress bar
  progressTrack: {
    position: "absolute",
    bottom: SH * 0.1,
    width: SW * 0.58,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
    backgroundColor: "#2563EB",
  },

  // Version
  versionTag: {
    position: "absolute",
    bottom: SH * 0.06,
    fontSize: 11,
    color: "#CBD5E1",
    fontWeight: "600",
    letterSpacing: 1,
  },
});

