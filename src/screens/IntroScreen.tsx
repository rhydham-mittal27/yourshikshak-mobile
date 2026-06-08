import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
  useWindowDimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

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
  compact,
}: {
  colors: string[];
  icon: any;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  onPress: () => void;
  delay: number;
  compact: boolean;
}) => {
  const translateY = useRef(new Animated.Value(28)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const pressScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 460,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 460,
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
          style={[rc.card, compact && rc.cardCompact]}
        >
          {/* Top row */}
          <View style={rc.topRow}>
            <View style={[rc.iconBox, compact && rc.iconBoxCompact]}>
              <Ionicons name={icon} size={compact ? 20 : 24} color="#fff" />
            </View>
            <View style={rc.eyebrowPill}>
              <Text style={rc.eyebrowTxt}>{eyebrow}</Text>
            </View>
          </View>

          {/* Body */}
          <View style={[rc.bodyBlock, compact && rc.bodyBlockCompact]}>
            <Text
              style={[rc.title, compact && rc.titleCompact]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {title}
            </Text>
            <Text
              style={[rc.subtitle, compact && rc.subtitleCompact]}
              numberOfLines={2}
            >
              {subtitle}
            </Text>
          </View>

          {/* CTA */}
          <View style={[rc.ctaRow, compact && rc.ctaRowCompact]}>
            <Text
              style={[rc.ctaLabel, compact && rc.ctaLabelCompact]}
              numberOfLines={1}
            >
              {ctaLabel}
            </Text>
            <View style={[rc.ctaArrow, compact && rc.ctaArrowCompact]}>
              <Ionicons name="arrow-forward" size={13} color="#fff" />
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
  const { height } = useWindowDimensions();
  // compact mode for small phones (< 700px) or very tall notches eating into space
  const compact = height < 700;

  const logoScale = useRef(new Animated.Value(0.82)).current;
  const logoOp = useRef(new Animated.Value(0)).current;
  const headY = useRef(new Animated.Value(14)).current;
  const headOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, useNativeDriver: true }),
        Animated.timing(logoOp, {
          toValue: 1,
          duration: 340,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.timing(headY, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(headOp, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero header — no fixed height, content-driven ─────────────────── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
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
          style={[
            s.headlineBlock,
            { opacity: headOp, transform: [{ translateY: headY }] },
          ]}
        >
          <Text style={[s.heroTitle, compact && s.heroTitleCompact]}>
            {"Shape your child's\nfuture today"}
          </Text>
          <Text style={[s.heroSub, compact && s.heroSubCompact]}>
            Expert home tutors · JEE · NEET · Classes 1–12
          </Text>
        </Animated.View>

        {/* Stats strip */}
        <View style={[s.statsStrip, compact && s.statsStripCompact]}>
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
        style={[s.cardsArea, { paddingBottom: Math.max(insets.bottom, 12) }]}
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
          compact={compact}
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
          compact={compact}
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

  header: {
    // No fixed height — let content size it naturally
    paddingHorizontal: 22,
    paddingBottom: 20,
    overflow: "hidden",
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

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  logoRing: {
    width: 40,
    height: 40,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
    marginRight: 10,
    flexShrink: 0,
  },
  logoImg: { width: 40, height: 40 },
  brandMid: { flex: 1, marginRight: 8, minWidth: 0 },
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
    flexShrink: 1,
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
    flexShrink: 0,
  },
  liveDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.success },
  liveChipTxt: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 10,
    fontWeight: "700",
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
    flexShrink: 0,
  },
  signInTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },

  headlineBlock: { marginBottom: 16 },
  heroTitle: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.6,
    lineHeight: 33,
    marginBottom: 6,
  },
  heroTitleCompact: { fontSize: 21, lineHeight: 27 },
  heroSub: { color: "rgba(255,255,255,0.48)", fontSize: 12, lineHeight: 17 },
  heroSubCompact: { fontSize: 11, lineHeight: 15 },

  statsStrip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: T.radiusMd,
    paddingVertical: 10,
  },
  statsStripCompact: { paddingVertical: 7 },
  statItem: { flex: 1, alignItems: "center" },
  statVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  statLbl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "500",
    marginTop: 2,
  },
  statSep: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.1)" },

  cardsArea: {
    flex: 1,
    backgroundColor: T.background,
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
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
    marginTop: 4,
  },
});

// ─── Role card styles ─────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  outer: { flex: 1, marginBottom: 10 },
  pressable: { flex: 1 },
  card: {
    flex: 1,
    borderRadius: 18,
    padding: 18,
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  cardCompact: { padding: 14 },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  iconBoxCompact: { width: 36, height: 36, borderRadius: 10 },
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

  bodyBlock: { flex: 1, justifyContent: "center", paddingVertical: 10 },
  bodyBlockCompact: { paddingVertical: 6 },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    lineHeight: 28,
    marginBottom: 4,
  },
  titleCompact: { fontSize: 18, lineHeight: 23 },
  subtitle: { color: "rgba(255,255,255,0.72)", fontSize: 13, lineHeight: 19 },
  subtitleCompact: { fontSize: 11, lineHeight: 16 },

  ctaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.18)",
    paddingTop: 12,
  },
  ctaRowCompact: { paddingTop: 8 },
  ctaLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  ctaLabelCompact: { fontSize: 12 },
  ctaArrow: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  ctaArrowCompact: { width: 26, height: 26, borderRadius: 8 },
});

export default IntroScreen;
