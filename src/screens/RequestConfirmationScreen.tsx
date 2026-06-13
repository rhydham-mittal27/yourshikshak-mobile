/**
 * RequestConfirmationScreen.tsx
 *
 * Same visual language as TutorDashboard / ParentDashboard:
 *  • Dark LinearGradient header  →  3D orbital rings + spring checkmark
 *  • "#F4F7FB" card pulls up (marginTop: -28, borderTopRadius: 28)
 *  • Light-mode detail cards matching KPI/list-card style
 *  • Staggered content reveal, shimmer on Reference ID
 *  • scale(0.97) press on every interactive element
 *
 * Animations (all rare / first-time → delight is appropriate):
 *  • 3 orbital rings: perspective + rotateX tilt + looping rotateZ
 *  • Checkmark: spring  0 → 1.18 → 1
 *  • Card: spring translateY 40 → 0  (after 500ms)
 *  • Each section: staggered fade + translateY
 *  • Reference ID shimmer: looping translateX gradient overlay
 */

import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

type Nav   = StackNavigationProp<RootStackParamList, "RequestConfirmation">;
type Route = RouteProp<RootStackParamList, "RequestConfirmation">;

const SCREEN_W = Dimensions.get("window").width;

// ─── Orbital Ring ─────────────────────────────────────────────────────────────

const OrbitalRing = ({
  size,
  color,
  rotateXDeg,
  rotateYDeg = "0deg",
  duration,
  direction = "cw",
  delay = 0,
  dashed = false,
}: {
  size: number;
  color: string;
  rotateXDeg: string;
  rotateYDeg?: string;
  duration: number;
  direction?: "cw" | "ccw";
  delay?: number;
  dashed?: boolean;
}) => {
  const spin = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 500, delay, useNativeDriver: true }).start();
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange:  [0, 1],
    outputRange: direction === "cw" ? ["0deg", "360deg"] : ["360deg", "0deg"],
  });

  return (
    <Animated.View
      style={{
        position: "absolute",
        width: size, height: size,
        borderRadius: size / 2,
        borderWidth: 1.5,
        borderColor: color,
        borderStyle: dashed ? "dashed" : "solid",
        opacity: fade,
        transform: [
          { perspective: 500 },
          { rotateX: rotateXDeg },
          { rotateY: rotateYDeg },
          { rotateZ: rotate },
        ],
      }}
    >
      <View
        style={{
          position: "absolute",
          width: 7, height: 7, borderRadius: 3.5,
          backgroundColor: color,
          top: -3.5, left: size / 2 - 3.5,
          shadowColor: color,
          shadowOpacity: 1,
          shadowRadius: 5,
          shadowOffset: { width: 0, height: 0 },
          elevation: 6,
        }}
      />
    </Animated.View>
  );
};

// ─── Reference ID card with shimmer ──────────────────────────────────────────

const RefIdCard = ({ requestId }: { requestId: string }) => {
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 1600,
        delay: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();
  }, []);

  const tx = shimmer.interpolate({
    inputRange:  [-1, 1],
    outputRange: [-SCREEN_W * 0.55, SCREEN_W * 0.55],
  });

  return (
    <View style={rc.card}>
      <View style={rc.left}>
        <View style={rc.iconBox}>
          <Ionicons name="receipt-outline" size={18} color={T.primary} />
        </View>
        <View>
          <Text style={rc.eyebrow}>Reference ID</Text>
          <Text style={rc.id}>{requestId}</Text>
        </View>
      </View>
      <View style={rc.copyBtn}>
        <Ionicons name="copy-outline" size={14} color={T.primary} />
      </View>
      {/* Shimmer sweep */}
      <Animated.View
        style={[StyleSheet.absoluteFill, { borderRadius: T.radiusLg, overflow: "hidden", transform: [{ translateX: tx }] }]}
        pointerEvents="none"
      >
        <LinearGradient
          colors={["transparent", "rgba(255,255,255,0.55)", "transparent"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ flex: 1, width: "50%" }}
        />
      </Animated.View>
    </View>
  );
};

// ─── Stagger wrapper ──────────────────────────────────────────────────────────

const FadeUp = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fade  = useRef(new Animated.Value(0)).current;
  const slideY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 380, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slideY }] }}>
      {children}
    </Animated.View>
  );
};

// ─── Section head (matches dashboard SectionHead) ─────────────────────────────

const SectionHead = ({ icon, title }: { icon: any; title: string }) => (
  <View style={sh.row}>
    <View style={sh.iconBg}>
      <Ionicons name={icon} size={14} color={T.primary} />
    </View>
    <Text style={sh.txt}>{title}</Text>
  </View>
);

// ─── Info row ─────────────────────────────────────────────────────────────────

const InfoRow = ({ icon, label, value, iconColor = T.primary, iconBg }: {
  icon: any; label: string; value: string;
  iconColor?: string; iconBg?: string;
}) => (
  <View style={ir.row}>
    <View style={[ir.iconBox, { backgroundColor: iconBg ?? `${iconColor}14` }]}>
      <Ionicons name={icon} size={15} color={iconColor} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={ir.label}>{label}</Text>
      <Text style={ir.value}>{value}</Text>
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RequestConfirmationScreen = () => {
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();
  const route  = useRoute<Route>();
  const { requestId, subject, grade } = route.params;

  // Checkmark entrance
  const checkScale   = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;

  // White card spring
  const cardY       = useRef(new Animated.Value(50)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Checkmark — spring after 280ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(checkOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.sequence([
          Animated.spring(checkScale, { toValue: 1.18, useNativeDriver: true, speed: 16, bounciness: 0 }),
          Animated.spring(checkScale, { toValue: 1.0,  useNativeDriver: true, speed: 12, bounciness: 14 }),
        ]),
      ]).start();
    }, 280);

    // Card slide up — after 500ms
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(cardOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 3 }),
      ]).start();
    }, 500);
  }, []);

  const goToDashboard = () =>
    nav.navigate("ParentDashboard", { userId: "", name: "", role: "PARENT" });

  const TIMELINE = [
    { label: "Request received",            done: true,  color: T.success },
    { label: "Manager reviews & calls you", done: false, color: T.primary },
    { label: "Tutor shortlisted",           done: false, color: T.mutedFg },
    { label: "Demo class scheduled",        done: false, color: T.mutedFg },
    { label: "Classes begin 🎉",            done: false, color: T.mutedFg },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom + 24, 36) }}
      >
        {/* ── Dark gradient header ─────────────────────────────────────── */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 20) + 12 }]}
        >
          {/* Decorative orbs */}
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />

          {/* Close / back button */}
          <Pressable
            onPress={goToDashboard}
            style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.55 }]}
            hitSlop={12}
          >
            <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
          </Pressable>

          {/* 3D orbit zone */}
          <View style={s.orbitZone}>
            <OrbitalRing size={88}  color={`${T.secondary}CC`} rotateXDeg="66deg"                   duration={3000} direction="cw"  delay={300} />
            <OrbitalRing size={132} color={`${T.primary}99`}   rotateXDeg="60deg" rotateYDeg="18deg" duration={5200} direction="ccw" delay={400} />
            <OrbitalRing size={176} color={`${T.primaryLight}44`} rotateXDeg="72deg" rotateYDeg="-12deg" duration={8200} direction="cw" delay={500} dashed />

            {/* Central checkmark */}
            <Animated.View style={[s.checkWrap, { opacity: checkOpacity, transform: [{ scale: checkScale }] }]}>
              <LinearGradient
                colors={[T.success, "#059669"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.checkGrad}
              >
                <Ionicons name="checkmark" size={32} color="#fff" />
              </LinearGradient>
            </Animated.View>
          </View>

          {/* Title inside header */}
          <Text style={s.heroTitle}>Request Submitted!</Text>
          <Text style={s.heroSub}>
            Our team will reach out within{" "}
            <Text style={{ color: T.secondary, fontWeight: "700" }}>24 hours</Text>
          </Text>
        </LinearGradient>

        {/* ── White card (same pull-up as dashboard) ───────────────────── */}
        <Animated.View
          style={[s.card, { opacity: cardOpacity, transform: [{ translateY: cardY }] }]}
        >
          {/* Reference ID */}
          <FadeUp delay={560}>
            <RefIdCard requestId={requestId} />
          </FadeUp>

          {/* Request summary */}
          <FadeUp delay={630}>
            <SectionHead icon="document-text-outline" title="Request Summary" />
            <View style={s.infoCard}>
              <InfoRow icon="book-outline"   label="Subjects"  value={subject} iconColor={T.primary}   />
              <View style={s.divider} />
              <InfoRow icon="school-outline" label="Grade"     value={grade}   iconColor={T.secondary} iconBg={`${T.secondary}14`} />
              <View style={s.divider} />
              <InfoRow icon="time-outline"   label="Expected response" value="Within 24 hours" iconColor={T.success} iconBg={`${T.success}14`} />
            </View>
          </FadeUp>

          {/* What happens next */}
          <FadeUp delay={720}>
            <SectionHead icon="arrow-forward-circle-outline" title="What happens next?" />
            <View style={s.timelineCard}>
              {TIMELINE.map((item, i) => (
                <View key={i} style={tl.row}>
                  <View style={tl.lineCol}>
                    <View style={[
                      tl.dot,
                      {
                        backgroundColor: item.done
                          ? T.success
                          : item.color === T.primary
                            ? `${T.primary}18`
                            : T.muted,
                        borderWidth: item.done ? 0 : 2,
                        borderColor: item.color === T.primary ? T.primary : T.border,
                      },
                    ]}>
                      {item.done && <Ionicons name="checkmark" size={9} color="#fff" />}
                    </View>
                    {i < TIMELINE.length - 1 && (
                      <View style={[tl.line, { backgroundColor: item.done ? T.success : T.border }]} />
                    )}
                  </View>
                  <Text style={[
                    tl.label,
                    item.done && { color: T.success, fontWeight: "700" },
                    item.color === T.primary && !item.done && { color: T.primary, fontWeight: "600" },
                  ]}>
                    {item.label}
                  </Text>
                </View>
              ))}
            </View>
          </FadeUp>

          {/* CTA buttons */}
          <FadeUp delay={820}>
            <Pressable
              style={({ pressed }) => [
                s.primaryBtn,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.88 },
              ]}
              onPress={goToDashboard}
            >
              <LinearGradient
                colors={[T.primary, T.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.primaryBtnGrad}
              >
                <Ionicons name="grid-outline" size={17} color="#fff" />
                <Text style={s.primaryBtnTxt}>View Dashboard</Text>
                <Ionicons name="arrow-forward" size={15} color="rgba(255,255,255,0.55)" />
              </LinearGradient>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                s.secondaryBtn,
                pressed && { transform: [{ scale: 0.97 }], opacity: 0.7 },
              ]}
              onPress={() => nav.replace("RequestTutor")}
            >
              <Ionicons name="add-circle-outline" size={16} color={T.textSecondary} />
              <Text style={s.secondaryBtnTxt}>Request Another Subject</Text>
            </Pressable>
          </FadeUp>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },

  header: {
    paddingHorizontal: 22,
    paddingBottom: 52,
    overflow: "hidden",
    alignItems: "center",
  },
  orbA: {
    position: "absolute", width: 200, height: 200, borderRadius: 100,
    backgroundColor: `${T.primary}10`, top: -50, right: -60,
  } as any,
  orbB: {
    position: "absolute", width: 130, height: 130, borderRadius: 65,
    backgroundColor: `${T.secondary}08`, bottom: 20, left: -30,
  } as any,

  closeBtn: {
    alignSelf: "flex-start",
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginBottom: 20,
  },

  orbitZone: {
    width: 190, height: 190,
    alignItems: "center", justifyContent: "center",
    marginBottom: 22,
  },

  checkWrap: {
    width: 64, height: 64, borderRadius: 32,
    shadowColor: T.success,
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  checkGrad: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: "center", justifyContent: "center",
  },

  heroTitle: {
    fontSize: 26, fontWeight: "800", color: "#fff",
    letterSpacing: -0.6, marginBottom: 6, textAlign: "center",
  },
  heroSub: {
    fontSize: 14, color: "rgba(255,255,255,0.5)",
    textAlign: "center", lineHeight: 21,
  },

  // The pull-up card — exact same as dashboard
  card: {
    flexGrow: 1,
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 20,
    paddingTop: 22,
  },

  infoCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 14,
    marginBottom: 4,
  },
  timelineCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 16,
    marginBottom: 4,
  },

  divider: {
    height: 1, backgroundColor: T.border,
    marginVertical: 10, marginHorizontal: -2,
  },

  primaryBtn:     { borderRadius: T.radiusMd, overflow: "hidden", marginTop: 20, marginBottom: 10 },
  primaryBtnGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, paddingVertical: 15, paddingHorizontal: 20 },
  primaryBtnTxt:  { fontSize: 15, fontWeight: "700", color: "#fff", flex: 1, textAlign: "center" },

  secondaryBtn:    {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 13,
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1, borderColor: T.border,
  },
  secondaryBtnTxt: { fontSize: 14, fontWeight: "600", color: T.textSecondary },
});

// Section head
const sh = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, marginTop: 20, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: T.border },
  iconBg:{ width: 26, height: 26, borderRadius: 8, backgroundColor: `${T.primary}14`, alignItems: "center", justifyContent: "center" },
  txt:   { fontSize: 13, fontWeight: "700", color: T.textPrimary, flex: 1 },
});

// Reference ID card
const rc = StyleSheet.create({
  card:    {
    flexDirection: "row", alignItems: "center",
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5, borderColor: "#CBD5E1",
    padding: 14, marginBottom: 2, overflow: "hidden",
  },
  left:    { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  iconBox: { width: 38, height: 38, borderRadius: 10, backgroundColor: `${T.primary}12`, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 10, color: T.textDisabled, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 },
  id:      { fontSize: 17, fontWeight: "800", color: T.textPrimary, letterSpacing: 0.3 },
  copyBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: `${T.primary}10`, alignItems: "center", justifyContent: "center" },
});

// Info row
const ir = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "center", gap: 10 },
  iconBox: { width: 34, height: 34, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  label:   { fontSize: 10, color: T.textDisabled, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  value:   { fontSize: 13, color: T.textPrimary, fontWeight: "600", lineHeight: 18 },
});

// Timeline
const tl = StyleSheet.create({
  row:     { flexDirection: "row", alignItems: "flex-start", gap: 12, minHeight: 28 },
  lineCol: { alignItems: "center", width: 20 },
  dot:     { width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  line:    { width: 2, flex: 1, marginTop: 3, marginBottom: -3, minHeight: 10 },
  label:   { fontSize: 13, color: T.textSecondary, flex: 1, paddingTop: 2, lineHeight: 19, fontWeight: "500" },
});

export default RequestConfirmationScreen;
