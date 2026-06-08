/**
 * IntroScreen.tsx — YourShikshak
 *
 * Layout:
 *   • Dark LinearGradient hero (fixed proportional height, same palette as other screens)
 *   • Two vivid gradient role cards that fill remaining space equally
 *
 * Design system: T tokens from constants/colors.ts
 * Consistent with RegisterScreen / LoginScreen / ParentRegisterScreen
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Dimensions,
  StatusBar,
  Animated,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

const { width, height } = Dimensions.get("window");
const sm = height < 700;

type Nav = StackNavigationProp<RootStackParamList, "Intro">;
interface Props {
  navigation: Nav;
}

// ─── Stat strip item ──────────────────────────────────────────────────────────

const Stat = ({ val, lbl }: { val: string; lbl: string }) => (
  <View style={s.statItem}>
    <Text style={s.statVal}>{val}</Text>
    <Text style={s.statLbl}>{lbl}</Text>
  </View>
);

// ─── Role card ────────────────────────────────────────────────────────────────

const RoleCard = ({
  colors,
  icon,
  eyebrow,
  title,
  subtitle,
  ctaLabel,
  onPress,
  delay,
}: {
  colors: string[];
  icon: any;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onPress: () => void;
  delay: number;
}) => {
  const translateY = useRef(new Animated.Value(32)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 480,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 480,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const onIn = () =>
    Animated.spring(pressScale, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start();
  const onOut = () =>
    Animated.spring(pressScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View
      style={[
        rc.outer,
        { opacity, transform: [{ translateY }, { scale: pressScale }] },
      ]}
    >
      <Pressable
        onPress={onPress}
        onPressIn={onIn}
        onPressOut={onOut}
        style={rc.pressable}
      >
        <LinearGradient
          colors={colors as any}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={rc.card}
        >
          {/* Top row: icon + eyebrow pill */}
          <View style={rc.topRow}>
            <View style={rc.iconBox}>
              <Ionicons name={icon} size={sm ? 22 : 26} color="#fff" />
            </View>
            <View style={rc.eyebrowPill}>
              <Text style={rc.eyebrowTxt}>{eyebrow}</Text>
            </View>
          </View>

          {/* Title + subtitle */}
          <View style={rc.bodyBlock}>
            <Text style={[rc.title, sm && { fontSize: 19, lineHeight: 24 }]}>
              {title}
            </Text>
            <Text style={[rc.subtitle, sm && { fontSize: 11, lineHeight: 16 }]}>
              {subtitle}
            </Text>
          </View>

          {/* Bottom CTA row */}
          <View style={rc.ctaRow}>
            <Text style={[rc.ctaLabel, sm && { fontSize: 12 }]}>
              {ctaLabel}
            </Text>
            <View style={rc.ctaArrow}>
              <Ionicons name="arrow-forward" size={14} color="#fff" />
            </View>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const IntroScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();

  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const headY = useRef(new Animated.Value(16)).current;
  const headOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(logoOp, {
          toValue: 1,
          duration: 360,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(headY, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(headOp, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const headerPadTop = Math.max(insets.top, 16) + 10;

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero header ───────────────────────────────────────────────────── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: headerPadTop }]}
      >
        {/* Glow orbs (decorative) */}
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        {/* Brand row */}
        <Animated.View
          style={[
            s.brandRow,
            { opacity: logoOp, transform: [{ scale: logoScale }] },
          ]}
        >
          <View style={s.logoRing}>
            <Image
              source={require("../../assets/logo.jpg")}
              style={s.logoImg}
            />
          </View>

          <View style={s.brandMid}>
            <Text style={s.brandName} numberOfLines={1}>
              YourShikshak
            </Text>
            <View style={s.verifiedRow}>
              <Ionicons name="shield-checkmark" size={9} color={T.success} />
              <Text style={s.verifiedTxt} numberOfLines={1}>
                India's No.1 Tutoring Platform
              </Text>
            </View>
          </View>

          <View style={s.liveChip}>
            <View style={s.liveDot} />
            <Text style={s.liveChipTxt}>10K+ Tutors</Text>
          </View>

          <Pressable
            onPress={() => navigation.navigate("Login")}
            style={s.signInBtn}
            hitSlop={8}
          >
            <Ionicons name="log-in-outline" size={13} color="#fff" />
            <Text style={s.signInTxt}>Sign In</Text>
          </Pressable>
        </Animated.View>

        {/* Headline */}
        <Animated.View
          style={{ opacity: headOp, transform: [{ translateY: headY }] }}
        >
          <Text style={s.heroTitle}>{"Shape your child's\nfuture today"}</Text>
          <Text style={s.heroSub}>
            Expert home tutors · JEE · NEET · Classes 1–12
          </Text>
        </Animated.View>

        {/* Stats strip */}
        <View style={s.statsStrip}>
          <Stat val="10K+" lbl="Tutors" />
          <View style={s.statSep} />
          <Stat val="4.8★" lbl="Rating" />
          <View style={s.statSep} />
          <Stat val="2K+" lbl="Reviews" />
          <View style={s.statSep} />
          <Stat val="FREE" lbl="Demo" />
        </View>
      </LinearGradient>

      {/* ── Cards area ────────────────────────────────────────────────────── */}
      <View
        style={[s.cardsArea, { paddingBottom: Math.max(insets.bottom, 16) }]}
      >
        <View style={s.dividerRow}>
          <View style={s.divLine} />
          <Text style={s.divTxt}>Continue as</Text>
          <View style={s.divLine} />
        </View>

        <RoleCard
          colors={["#1E4A8C", "#2D68C4", "#4A80CC"]}
          icon="school"
          eyebrow="FOR TUTORS"
          title="I'm a Teacher"
          subtitle="Register, get verified & start earning with flexible home tuition"
          ctaLabel="Register as Tutor"
          delay={80}
          onPress={() => navigation.navigate("Register")}
        />

        <RoleCard
          colors={["#0095C1", "#00B7EB", "#33C9F0"]}
          icon="people"
          eyebrow="FOR PARENTS"
          title="I'm a Parent"
          subtitle="Find a verified expert tutor for your child within 24 hours"
          ctaLabel="Find a Tutor"
          delay={180}
          onPress={() => navigation.navigate("ParentRegister")}
        />

        <Text style={s.footer}>yourshikshak.in · Bhopal & Indore</Text>
      </View>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.darkBg },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingBottom: sm ? 14 : 22,
    overflow: "hidden",
    height: sm ? height * 0.38 : height * 0.43,
    justifyContent: "space-between",
  },
  orbA: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: `${T.secondary}18`,
  },
  orbB: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${T.primary}14`,
  },

  // Brand row
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoRing: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    marginRight: 10,
  },
  logoImg: { width: 40, height: 40 },
  brandMid: { flex: 1, marginRight: 10 },
  brandName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 1,
  },
  verifiedTxt: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "500",
  },
  liveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.success },
  liveChipTxt: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "700",
  },

  // Hero text
  heroTitle: {
    color: "#fff",
    fontSize: sm ? 22 : 28,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: sm ? 28 : 35,
    marginBottom: 6,
  },
  heroSub: {
    color: "rgba(255,255,255,0.48)",
    fontSize: sm ? 10 : 12,
    lineHeight: sm ? 14 : 17,
  },

  // Stats strip
  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: T.radiusMd,
    paddingVertical: sm ? 6 : 10,
  },
  statItem: { flex: 1, alignItems: "center" },
  statVal: {
    color: "#fff",
    fontSize: sm ? 13 : 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statLbl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: sm ? 9 : 10,
    fontWeight: "500",
    marginTop: 2,
  },
  statSep: {
    width: 1,
    height: sm ? 22 : 28,
    backgroundColor: "rgba(255,255,255,0.1)",
  },

  // Cards area
  cardsArea: {
    flex: 1,
    backgroundColor: T.background,
    paddingHorizontal: 14,
    paddingTop: sm ? 10 : 16,
    gap: 0,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: sm ? 8 : 12,
  },
  divLine: { flex: 1, height: 1, backgroundColor: T.border },
  divTxt: {
    color: T.mutedFg,
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  footer: {
    textAlign: "center",
    color: T.textDisabled,
    fontSize: 10,
    letterSpacing: 0.3,
    marginTop: 6,
    paddingBottom: 2,
  },
  signInBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    marginLeft: 8,
  },
  signInTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
});

// ─── Role card styles ─────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  outer: { flex: 1, marginBottom: 10 },
  pressable: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: sm ? 14 : 18,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  iconBox: {
    width: sm ? 38 : 48,
    height: sm ? 38 : 48,
    borderRadius: sm ? 10 : 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  eyebrowPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  eyebrowTxt: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },

  // Body
  bodyBlock: {
    flex: 1,
    justifyContent: "center",
    paddingVertical: sm ? 6 : 10,
  },
  title: {
    color: "#fff",
    fontSize: sm ? 20 : 23,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: sm ? 25 : 29,
    marginBottom: 4,
  },
  subtitle: {
    color: "rgba(255,255,255,0.72)",
    fontSize: sm ? 12 : 13,
    lineHeight: sm ? 17 : 19,
  },

  // CTA row
  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: sm ? 8 : 12,
  },
  ctaLabel: {
    color: "#fff",
    fontSize: sm ? 13 : 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  ctaArrow: {
    width: sm ? 26 : 32,
    height: sm ? 26 : 32,
    borderRadius: sm ? 8 : 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
});

export default IntroScreen;
