/**
 * ParentCompleteProfileScreen.tsx — YourShikshak
 * Step 3 for parents: optional notes about child's requirements.
 * User is already registered (token stored from RoleSelectScreen).
 * This screen reads stored user data and navigates to the dashboard.
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  Animated,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AUTH_STORAGE_KEY } from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "ParentCompleteProfile">;
type Route = RouteProp<RootStackParamList, "ParentCompleteProfile">;

interface Props {
  navigation: Nav;
  route: Route;
}

const ParentCompleteProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { name } = route.params;

  const [notes, setNotes] = useState("");

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay: 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const goToDashboard = async () => {
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const { user } = JSON.parse(raw);
    navigation.reset({
      index: 0,
      routes: [{ name: "ParentDashboard", params: { userId: user.id, name: user.name, role: user.role } }],
    });
  };

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          {/* ── Header ── */}
          <LinearGradient
            colors={["#0C4A6E", "#0369A1", "#0EA5E9"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
          >
            <View style={[s.glowA, { pointerEvents: "none" } as any]} />

            <View style={s.headerRow}>
              <Pressable style={s.backBtn} onPress={() => navigation.goBack()} hitSlop={10}>
                <Ionicons name="arrow-back" size={17} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <View style={s.brandCenter}>
                <Image source={require("../../assets/logo.jpg")} style={s.brandLogo} />
                <Text style={s.brandName}>YourShikshak</Text>
              </View>
              <View style={{ width: 34 }} />
            </View>

            <View style={s.stepBadge}>
              <Text style={s.stepBadgeTxt}>STEP 3 OF 3 · PARENT</Text>
            </View>
            <Text style={s.heroTitle}>{"Tell us about\nyour child"}</Text>
            <Text style={s.heroSub}>Almost done, {name.split(" ")[0]}! This helps us match you faster.</Text>
          </LinearGradient>

          {/* ── Form card ── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            <View style={s.successBanner}>
              <Ionicons name="checkmark-circle" size={16} color={T.success} />
              <Text style={s.successBannerTxt}>Account created — you're in! Add details to get matched faster.</Text>
            </View>

            <View style={s.sectionHead}>
              <View style={s.sectionIconBg}>
                <Ionicons name="create-outline" size={16} color={T.primary} />
              </View>
              <Text style={s.sectionHeadText}>Subjects & Requirements</Text>
            </View>

            <Text style={s.fieldHint}>
              What subjects does your child need help with? Any special requirements? (Optional — you can add this from your dashboard later.)
            </Text>

            <View style={s.notesBox}>
              <Ionicons name="document-text-outline" size={17} color={T.mutedFg} style={s.notesIcon} />
              <TextInput
                style={s.notesInput}
                value={notes}
                onChangeText={setNotes}
                placeholder={"e.g. Need Maths & Science for CBSE Class 10, prefer evening slots…"}
                placeholderTextColor={T.textDisabled}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={s.featureRow}>
              {["Free Demo Class", "Verified Tutors", "24h Matching"].map(f => (
                <View key={f} style={s.featureChip}>
                  <Ionicons name="checkmark-circle" size={12} color={T.success} />
                  <Text style={s.featureTxt}>{f}</Text>
                </View>
              ))}
            </View>

            <Pressable style={s.ctaBtn} onPress={goToDashboard}>
              <LinearGradient
                colors={["#0369A1", "#0EA5E9", "#38BDF8"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.ctaGrad}
              >
                <Ionicons name="search-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <Text style={s.ctaTxt}>Find Me a Tutor</Text>
              </LinearGradient>
            </Pressable>

            <Pressable onPress={goToDashboard} style={s.skipBtn} hitSlop={8}>
              <Text style={s.skipTxt}>Skip for now</Text>
            </Pressable>
          </Animated.View>

          <View style={{ height: Math.max(insets.bottom, 40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  header: { paddingHorizontal: 22, paddingBottom: 44, overflow: "hidden" },
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.08)" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brandName: { color: "#fff", fontSize: 14, fontWeight: "700" },

  stepBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  stepBadgeTxt: { color: "rgba(255,255,255,0.85)", fontSize: 9.5, fontWeight: "800", letterSpacing: 1 },

  heroTitle: { color: "#fff", fontSize: 30, fontWeight: "700", letterSpacing: -0.8, lineHeight: 36, marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 19 },

  card: {
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: T.border,
    padding: 20,
    marginTop: -24,
    paddingTop: 28,
  },

  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", borderRadius: T.radiusMd, borderWidth: 1, borderColor: "#A7F3D0", padding: 12, marginBottom: 20 },
  successBannerTxt: { flex: 1, color: "#065F46", fontSize: 13, lineHeight: 18 },

  sectionHead: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, borderLeftColor: T.primary, paddingLeft: 10, marginBottom: 12, marginTop: 4 },
  sectionIconBg: { width: 28, height: 28, borderRadius: T.radiusSm, backgroundColor: `${T.primary}15`, alignItems: "center", justifyContent: "center", marginRight: 8 },
  sectionHeadText: { fontSize: 15, fontWeight: "700", color: T.textPrimary, letterSpacing: -0.2 },

  fieldHint: { fontSize: 13, color: T.textSecondary, lineHeight: 19, marginBottom: 14 },

  notesBox: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, backgroundColor: T.paper, padding: 12, marginBottom: 20, minHeight: 100 },
  notesIcon: { marginRight: 8, marginTop: 2 },
  notesInput: { flex: 1, color: T.textPrimary, fontSize: 14, lineHeight: 21 },

  featureRow: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginBottom: 20 },
  featureChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  featureTxt: { color: "#065F46", fontSize: 11, fontWeight: "600" },

  ctaBtn: { borderRadius: T.radiusMd, overflow: "hidden", marginBottom: 12 },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  ctaTxt: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },

  skipBtn: { alignItems: "center", paddingVertical: 8 },
  skipTxt: { fontSize: 13, color: T.mutedFg, fontWeight: "600" },
});

export default ParentCompleteProfileScreen;
