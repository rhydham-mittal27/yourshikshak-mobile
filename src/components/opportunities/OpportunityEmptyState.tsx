import React, { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";

interface Props {
  onRefresh: () => void;
}

const TIPS = [
  "Top tutors check back every morning 🌅",
  "New leads are posted throughout the day",
  "YourShikshak is expanding Pan India — more leads coming! 🇮🇳",
];

const OpportunityEmptyState: React.FC<Props> = ({ onRefresh }) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -14,
          duration: 500,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 400,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(1200),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ]),
    ).start();

    const id = setInterval(() => setTipIdx((i) => (i + 1) % TIPS.length), 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <Animated.View style={[s.wrap, { opacity: fadeAnim }]}>
      <Animated.View style={{ transform: [{ translateY: bounceAnim }] }}>
        <View style={s.mascotRing}>
          <LinearGradient
            colors={[`${T.primary}20`, `${T.secondary}18`]}
            style={s.mascotGrad}
          >
            <Text style={s.mascotEmoji}>🦉</Text>
          </LinearGradient>
          <View style={[s.sparkle, { top: 2, right: 6 }]}>
            <Text style={s.sparkleTxt}>✨</Text>
          </View>
          <View style={[s.sparkle, { bottom: 4, left: 4 }]}>
            <Text style={[s.sparkleTxt, { fontSize: 10 }]}>⭐</Text>
          </View>
        </View>
      </Animated.View>

      <Text style={s.headline}>No opportunities yet!</Text>
      <Text style={s.sub}>
        The best opportunities will be{"\n"}uploaded for you shortly.
      </Text>

      <View style={s.tipCard}>
        <Ionicons name="bulb-outline" size={14} color={T.warning} />
        <Text style={s.tipTxt}>{TIPS[tipIdx]}</Text>
      </View>

      <View style={s.statRow}>
        {[
          { icon: "flame-outline", color: "#F97316", label: "Stay active" },
          { icon: "time-outline", color: T.primary, label: "Check daily" },
          { icon: "star-outline", color: T.warning, label: "500+ tutors" },
        ].map((stat) => (
          <View key={stat.label} style={s.statItem}>
            <View style={[s.statIcon, { backgroundColor: `${stat.color}15` }]}>
              <Ionicons name={stat.icon as any} size={18} color={stat.color} />
            </View>
            <Text style={s.statLbl}>{stat.label}</Text>
          </View>
        ))}
      </View>

      <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
        <Pressable style={s.btn} onPress={onRefresh}>
          <Ionicons name="refresh-outline" size={16} color="#fff" />
          <Text style={s.btnTxt}>Check for new leads</Text>
        </Pressable>
      </Animated.View>

      <Text style={s.foot}>We'll notify you the moment one drops 🔔</Text>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 32,
    gap: 16,
  },
  mascotRing: { position: "relative", marginBottom: 4 },
  mascotGrad: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: `${T.primary}20`,
  },
  mascotEmoji: { fontSize: 52 },
  sparkle: { position: "absolute" },
  sparkleTxt: { fontSize: 14 },
  headline: {
    fontSize: 22,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.4,
    textAlign: "center",
  },
  sub: { fontSize: 14, color: T.mutedFg, textAlign: "center", lineHeight: 22 },
  tipCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${T.warning}12`,
    borderWidth: 1,
    borderColor: `${T.warning}25`,
    borderRadius: T.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  tipTxt: { fontSize: 12, color: T.textSecondary, fontWeight: "600", flex: 1 },
  statRow: { flexDirection: "row", gap: 20, marginVertical: 4 },
  statItem: { alignItems: "center", gap: 6 },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  statLbl: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: T.primary,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: T.radiusFull,
    shadowColor: T.primary,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  btnTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
  foot: { fontSize: 12, color: T.textDisabled, textAlign: "center" },
});

export default OpportunityEmptyState;
