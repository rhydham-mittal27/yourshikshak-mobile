/**
 * RoleSelectScreen.tsx — YourShikshak
 * After basic registration, user picks their role: Teacher or Parent.
 * For parents: registers immediately and stores token so push notifications work.
 * For teachers: passes data to TutorCompleteProfile for full registration.
 */

import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  Animated,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { registerParent, setAuthToken, AUTH_STORAGE_KEY } from "../api/client";
import { registerForPushNotifications } from "../services/pushNotifications";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "RoleSelect">;
type Route = RouteProp<RootStackParamList, "RoleSelect">;

interface Props {
  navigation: Nav;
  route: Route;
}

const RoleSelectScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useModal();
  const { name, email, phone, city, password } = route.params;

  const [loadingRole, setLoadingRole] = useState<"tutor" | "parent" | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;
  const card1Scale = useRef(new Animated.Value(0.95)).current;
  const card2Scale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 340, useNativeDriver: true }),
    ]).start(() => {
      Animated.stagger(80, [
        Animated.spring(card1Scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
        Animated.spring(card2Scale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
      ]).start();
    });
  }, []);

  const selectTeacher = () => {
    // For tutors: pass all basic info to TutorCompleteProfile where full registration happens
    navigation.navigate("TutorCompleteProfile", { name, email, phone, city, password });
  };

  const selectParent = async () => {
    // For parents: register immediately to get token + enable push notifications early
    setLoadingRole("parent");
    try {
      const res = await registerParent({
        name,
        email,
        password,
        phone,
        userType: "PARENT",
        city: city || undefined,
      });
      if (res.data?.accessToken && res.data?.user) {
        setAuthToken(res.data.accessToken);
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({ accessToken: res.data.accessToken, user: res.data.user }),
        );
        // Register push notifications as soon as we have a token
        registerForPushNotifications().catch(() => {});
      }
      navigation.navigate("ParentCompleteProfile", { name, email, phone, city, password });
    } catch (err: any) {
      showError("Registration Failed", err?.message || "Please try again.");
    } finally {
      setLoadingRole(null);
    }
  };

  const isDisabled = loadingRole !== null;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
      >
        <View style={[s.glowA, { pointerEvents: "none" } as any]} />
        <View style={[s.glowB, { pointerEvents: "none" } as any]} />

        <View style={s.headerRow}>
          <Pressable style={s.backBtn} onPress={() => !isDisabled && navigation.goBack()} hitSlop={10}>
            <Ionicons name="arrow-back" size={17} color="rgba(255,255,255,0.7)" />
          </Pressable>
          <View style={s.brandCenter}>
            <Image source={require("../../assets/logo.jpg")} style={s.brandLogo} />
            <Text style={s.brandName}>YourShikshak</Text>
          </View>
          <View style={{ width: 34 }} />
        </View>

        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <View style={s.stepBadge}>
            <Text style={s.stepBadgeTxt}>STEP 2 OF 3</Text>
          </View>
          <Text style={s.heroTitle}>{"Who are\nyou joining as?"}</Text>
          <Text style={s.heroSub}>Choose your role — this shapes your profile and dashboard.</Text>
        </Animated.View>
      </LinearGradient>

      <View style={[s.content, { paddingBottom: Math.max(insets.bottom, 32) }]}>

        {/* Teacher card */}
        <Animated.View style={{ transform: [{ scale: card1Scale }] }}>
          <Pressable onPress={selectTeacher} disabled={isDisabled} style={[s.roleCardWrap, isDisabled && { opacity: 0.5 }]}>
            <LinearGradient
              colors={["#1E1B4B", "#312E81", "#4338CA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.roleCard}
            >
              <View style={s.roleIconBg}>
                <Ionicons name="school-outline" size={28} color="#fff" />
              </View>
              <View style={s.roleTextBlock}>
                <Text style={s.roleEyebrow}>FOR TUTORS</Text>
                <Text style={s.roleTitle}>I'm a Teacher</Text>
                <Text style={s.roleSub}>Set up your tutor profile, list subjects, and get matched with students.</Text>
              </View>
              <View style={s.roleArrow}>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        {/* Parent card */}
        <Animated.View style={{ transform: [{ scale: card2Scale }] }}>
          <Pressable onPress={selectParent} disabled={isDisabled} style={s.roleCardWrap}>
            <LinearGradient
              colors={["#0C4A6E", "#0369A1", "#0EA5E9"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.roleCard}
            >
              <View style={s.roleIconBg}>
                {loadingRole === "parent"
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <Ionicons name="people-outline" size={28} color="#fff" />
                }
              </View>
              <View style={s.roleTextBlock}>
                <Text style={s.roleEyebrow}>FOR PARENTS</Text>
                <Text style={s.roleTitle}>I'm a Parent</Text>
                <Text style={s.roleSub}>Find verified tutors for your child — free demo, fast matching.</Text>
              </View>
              <View style={s.roleArrow}>
                <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.8)" />
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={s.statsRow}>
          {[
            { val: "10K+", lbl: "Tutors" },
            { val: "4.8★", lbl: "Rating" },
            { val: "Free", lbl: "Demo" },
          ].map(({ val, lbl }) => (
            <View key={lbl} style={s.statItem}>
              <Text style={s.statVal}>{val}</Text>
              <Text style={s.statLbl}>{lbl}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header: { paddingHorizontal: 22, paddingBottom: 32, overflow: "hidden" },
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: `${T.primary}18` },
  glowB: { position: "absolute", bottom: -40, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: `${T.secondary}12` },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brandName: { color: "#fff", fontSize: 14, fontWeight: "700" },

  stepBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  stepBadgeTxt: { color: "rgba(255,255,255,0.8)", fontSize: 9.5, fontWeight: "800", letterSpacing: 1 },

  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "700", letterSpacing: -0.8, lineHeight: 38, marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 19 },

  content: { flex: 1, paddingHorizontal: 20, paddingTop: 28, gap: 14 },

  roleCardWrap: { borderRadius: 20, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 12, elevation: 6 },
  roleCard: { flexDirection: "row", alignItems: "center", padding: 20, gap: 16 },
  roleIconBg: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  roleTextBlock: { flex: 1 },
  roleEyebrow: { color: "rgba(255,255,255,0.6)", fontSize: 9.5, fontWeight: "800", letterSpacing: 1, marginBottom: 3 },
  roleTitle: { color: "#fff", fontSize: 18, fontWeight: "700", letterSpacing: -0.3, marginBottom: 4 },
  roleSub: { color: "rgba(255,255,255,0.65)", fontSize: 12, lineHeight: 17 },
  roleArrow: { width: 32, height: 32, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center", flexShrink: 0 },

  statsRow: { flexDirection: "row", justifyContent: "center", gap: 32, marginTop: 8 },
  statItem: { alignItems: "center", gap: 2 },
  statVal: { color: T.textPrimary, fontSize: 15, fontWeight: "700" },
  statLbl: { color: T.mutedFg, fontSize: 11, fontWeight: "500" },
});

export default RoleSelectScreen;
