/**
 * LoginScreen.tsx — YourShikshak
 * Design mirrors RegisterScreen.tsx exactly:
 *  • Dark LinearGradient hero header
 *  • White card with rounded top corners overlapping the header
 *  • Floating-label FInput fields
 *  • Gradient CTA button
 *  • Segmented role toggle
 */

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Pressable,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser, restoreAccount, setAuthToken, AUTH_STORAGE_KEY } from "../api/client";
import { registerForPushNotifications } from "../services/pushNotifications";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Login">;
interface Props {
  navigation: Nav;
  route: { params?: { email?: string } };
}

type Role = "PARENT" | "TUTOR";

// ─── Floating-label input (identical to RegisterScreen FInput) ────────────────

const FInput = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  secure,
  keyboardType,
  icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  secure?: boolean;
  keyboardType?: any;
  icon?: any;
}) => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(floatAnim, {
      toValue: focused || value ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [17, 5],
  });
  const labelSize = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });
  const labelClr = focused ? T.primary : T.mutedFg;
  const borderClr = error ? T.error : focused ? T.primary : T.border;
  const borderW = focused ? 1.5 : 1;

  return (
    <View style={s.fieldWrap}>
      <View
        style={[s.fieldBox, { borderColor: borderClr, borderWidth: borderW }]}
      >
        {icon && (
          <View style={s.fieldIconSlot}>
            <Ionicons
              name={icon}
              size={17}
              color={focused ? T.primary : T.textDisabled}
            />
          </View>
        )}
        <View style={[s.fieldInner, icon && { paddingLeft: 4 }]}>
          <Animated.Text
            style={[
              s.floatLabel,
              { top: labelTop, fontSize: labelSize, color: labelClr },
            ]}
          >
            {label}
          </Animated.Text>
          <TextInput
            style={s.fieldInput}
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? placeholder : ""}
            placeholderTextColor={T.textDisabled}
            secureTextEntry={secure && !revealed}
            keyboardType={keyboardType}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
        {secure && (
          <Pressable
            style={s.eyeBtn}
            onPress={() => setRevealed((r) => !r)}
            hitSlop={8}
          >
            <Ionicons
              name={revealed ? "eye-outline" : "eye-off-outline"}
              size={17}
              color={T.textDisabled}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <View style={s.fieldError}>
          <Ionicons name="alert-circle" size={12} color={T.error} />
          <Text style={s.fieldErrorTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ─── Section header (identical to RegisterScreen SectionHead) ─────────────────

const SectionHead = ({
  icon,
  title,
  accent = T.primary,
}: {
  icon: any;
  title: string;
  accent?: string;
}) => (
  <View style={[s.sectionHead, { borderLeftColor: accent }]}>
    <View style={[s.sectionIconBg, { backgroundColor: `${accent}15` }]}>
      <Ionicons name={icon} size={16} color={accent} />
    </View>
    <Text style={s.sectionHeadText}>{title}</Text>
  </View>
);

// ─── Role segmented control (matches GenderPicker pattern) ───────────────────

const ROLES: { value: Role; label: string; icon: any }[] = [
  { value: "PARENT", label: "Parent / Student", icon: "people-outline" },
  { value: "TUTOR", label: "Tutor", icon: "school-outline" },
];

const RolePicker = ({
  value,
  onPick,
}: {
  value: Role;
  onPick: (r: Role) => void;
}) => (
  <View style={s.fieldWrap}>
    <Text style={s.segGroupLabel}>I am a</Text>
    <View style={s.segRow}>
      {ROLES.map((r) => {
        const active = value === r.value;
        return (
          <Pressable
            key={r.value}
            onPress={() => onPick(r.value)}
            style={[s.segItem, active ? s.segItemActive : s.segItemInactive]}
          >
            <Ionicons
              name={r.icon}
              size={15}
              color={active ? "#fff" : T.textSecondary}
            />
            <Text style={[s.segTxt, active && { color: "#fff" }]}>
              {r.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const LoginScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { showError, showWarning } = useModal();

  const [role, setRole] = useState<Role>("PARENT");
  const [email, setEmail] = useState(route?.params?.email ?? "");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const pendingCreds = useRef<{ email: string; password: string } | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay: 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay: 60,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const clearErr = (k: string) =>
    setErrors((e) => {
      const n = { ...e };
      delete n[k];
      return n;
    });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      e.email = "Enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await loginUser({
        email: email.trim().toLowerCase(),
        password,
      });
      const { accessToken } = res.data.tokens;
      const user = res.data.user;
      setAuthToken(accessToken);
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ accessToken, user }),
      );

      // Register device for push notifications (fire-and-forget, non-blocking)
      if (user.role === "TUTOR") registerForPushNotifications();

      // Role mismatch check — backend doesn't filter by role at login
      if (role === "PARENT" && user.role !== "PARENT") {
        setAuthToken(null);
        showWarning(
          "Wrong account type",
          "This email is registered as a Tutor. Please select Tutor and try again.",
        );
        return;
      }
      if (role === "TUTOR" && user.role !== "TUTOR") {
        setAuthToken(null);
        showWarning(
          "Wrong account type",
          "This email is registered as a Parent. Please select Parent and try again.",
        );
        return;
      }

      if (user.role === "TUTOR") {
        navigation.reset({
          index: 0,
          routes: [{ name: "TutorDashboard", params: { userId: user.id, name: user.name, role: user.role } }],
        });
      } else if (user.role === "PARENT") {
        navigation.reset({
          index: 0,
          routes: [{ name: "ParentDashboard", params: { userId: user.id, name: user.name, role: user.role } }],
        });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Intro" }] });
      }
    } catch (err: any) {
      if (err?.message === "ACCOUNT_PENDING_DELETION") {
        pendingCreds.current = { email: email.trim().toLowerCase(), password };
        setRestoreModal(true);
        return;
      }
      showError("Login Failed", err?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async () => {
    if (!pendingCreds.current || restoreLoading) return;
    setRestoreError(null);
    setRestoreLoading(true);
    try {
      const res = await restoreAccount(pendingCreds.current.email, pendingCreds.current.password);
      const { accessToken } = res.data.tokens;
      const user = res.data.user;
      setAuthToken(accessToken);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, user }));
      setRestoreModal(false);
      if (user.role === "TUTOR") {
        navigation.reset({ index: 0, routes: [{ name: "TutorDashboard", params: { userId: user.id, name: user.name, role: user.role } }] });
      } else if (user.role === "PARENT") {
        navigation.reset({ index: 0, routes: [{ name: "ParentDashboard", params: { userId: user.id, name: user.name, role: user.role } }] });
      } else {
        navigation.reset({ index: 0, routes: [{ name: "Intro" }] });
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Failed to restore account. Please try again.");
    } finally {
      setRestoreLoading(false);
    }
  };

  const goRegister = () =>
    role === "PARENT"
      ? navigation.navigate("ParentRegister")
      : navigation.navigate("Register");

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          {/* ── Dark gradient hero header ── */}
          <LinearGradient
            colors={[T.darkBg, T.darkBgMid, "#162032"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
          >
            <View style={[s.glowA, { pointerEvents: "none" } as any]} />
            <View style={[s.glowB, { pointerEvents: "none" } as any]} />

            {/* Brand row */}
            <View style={s.brandRow}>
              <Pressable
                style={s.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={10}
              >
                <Ionicons
                  name="arrow-back"
                  size={17}
                  color="rgba(255,255,255,0.7)"
                />
              </Pressable>
              <View style={s.brandCenter}>
                <Image
                  source={require("../../assets/logo.jpg")}
                  style={s.brandMarkImage}
                />
                <Text style={s.brandName}>YourShikshak</Text>
              </View>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>SIGN IN</Text>
              </View>
            </View>

            <Text style={s.heroTitle}>{"Welcome\nBack"}</Text>
            <Text style={s.heroSub}>
              Sign in to your account to access your dashboard, classes, and
              earnings.
            </Text>
          </LinearGradient>

          {/* ── Form card ── */}
          <Animated.View
            style={[
              s.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            <SectionHead
              icon="log-in-outline"
              title="Sign In to Your Account"
            />

            <RolePicker
              value={role}
              onPick={(r) => {
                setRole(r);
                setErrors({});
              }}
            />

            <FInput
              label="Email Address"
              value={email}
              onChange={(v) => {
                setEmail(v);
                clearErr("email");
              }}
              icon="mail-outline"
              error={errors.email}
              keyboardType="email-address"
              placeholder="you@example.com"
            />
            <FInput
              label="Password"
              value={password}
              onChange={(v) => {
                setPassword(v);
                clearErr("password");
              }}
              icon="lock-closed-outline"
              error={errors.password}
              secure
              placeholder="Your password"
            />

            {/* Forgot password */}
            <Pressable style={s.forgotRow} hitSlop={8}>
              <Text style={s.forgotTxt}>Forgot password?</Text>
            </Pressable>

            {/* CTA — gradient button matching RegisterScreen nextBtn */}
            <View style={s.ctaWrap}>
              <Pressable
                style={[s.ctaBtn, loading && { opacity: 0.65 }]}
                onPress={submit}
                disabled={loading}
              >
                <LinearGradient
                  colors={[T.primaryDark, T.primary, T.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.ctaGrad}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Ionicons
                        name="log-in-outline"
                        size={18}
                        color="#fff"
                        style={{ marginRight: 8 }}
                      />
                      <Text style={s.ctaTxt}>Sign In</Text>
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Divider */}
            <View style={s.divider}>
              <View style={s.dividerLine} />
              <Text style={s.dividerTxt}>or</Text>
              <View style={s.dividerLine} />
            </View>

            {/* Sign up link */}
            <View style={s.signinRow}>
              <Text style={s.signinTxt}>Don't have an account? </Text>
              <Pressable hitSlop={8} onPress={goRegister}>
                <Text style={s.signinLink}>
                  {role === "PARENT" ? "Register as Parent / Student" : "Join as Tutor"}
                </Text>
              </Pressable>
            </View>
          </Animated.View>

          <View style={{ height: Math.max(insets.bottom, 40) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Restore account modal */}
      <Modal visible={restoreModal} transparent animationType="slide" onRequestClose={() => !restoreLoading && setRestoreModal(false)}>
        <Pressable style={rm.backdrop} onPress={() => !restoreLoading && setRestoreModal(false)}>
          <Pressable style={rm.sheet} onPress={() => {}}>
            <View style={rm.handle} />

            <View style={rm.iconCircle}>
              <Ionicons name="refresh-circle-outline" size={30} color="#F59E0B" />
            </View>

            <Text style={rm.title}>Account Deletion Pending</Text>
            <Text style={rm.body}>
              You previously submitted a request to delete this account. Your data is still within the{" "}
              <Text style={rm.bold}>30-day retention period</Text> and can be fully recovered.{"\n\n"}
              Would you like to restore your account and continue?
            </Text>

            <View style={rm.infoRow}>
              <Ionicons name="shield-checkmark-outline" size={14} color="#065F46" />
              <Text style={rm.infoText}>All your classes, sessions, and profile data remain intact.</Text>
            </View>

            {restoreError ? <Text style={rm.errorText}>{restoreError}</Text> : null}

            <View style={rm.actions}>
              <Pressable style={rm.cancelBtn} onPress={() => setRestoreModal(false)} disabled={restoreLoading}>
                <Text style={rm.cancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable style={[rm.restoreBtn, restoreLoading && rm.restoreBtnDisabled]} onPress={handleRestore} disabled={restoreLoading}>
                {restoreLoading
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <>
                      <Ionicons name="refresh-outline" size={15} color="#fff" />
                      <Text style={rm.restoreTxt}>Restore & Login</Text>
                    </>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ─── Styles (mirrors RegisterScreen exactly) ──────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 22,
    paddingBottom: 44,
    overflow: "hidden",
  },
  glowA: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${T.primary}18`,
  },
  glowB: {
    position: "absolute",
    bottom: -40,
    left: -30,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${T.secondary}12`,
  },

  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandMarkImage: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  brandName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveTxt: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "700",
    letterSpacing: -0.8,
    lineHeight: 42,
    marginBottom: 10,
  },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20 },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
    padding: 20,
    marginTop: -24,
    paddingTop: 28,
  },

  // ── Section header ────────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  sectionIconBg: {
    width: 28,
    height: 28,
    borderRadius: T.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionHeadText: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },

  // ── Fields ────────────────────────────────────────────────────────────────────
  fieldWrap: { marginBottom: 14 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: T.radiusMd,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
  },
  fieldIconSlot: { paddingLeft: 14, paddingRight: 2 },
  fieldInner: { flex: 1, paddingHorizontal: 14 },
  floatLabel: { position: "absolute", left: 0, fontWeight: "500" },
  fieldInput: {
    color: T.textPrimary,
    fontSize: 15,
    fontWeight: "400",
    paddingTop: 22,
    paddingBottom: 8,
  },
  fieldError: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    paddingLeft: 2,
  },
  fieldErrorTxt: { color: T.error, fontSize: 12, marginLeft: 4 },
  eyeBtn: { paddingHorizontal: 14 },

  // ── Role segmented control ────────────────────────────────────────────────────
  segGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.mutedFg,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  segRow: { flexDirection: "row", gap: 8 },
  segItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: T.radiusMd,
    borderWidth: 1.2,
  },
  segItemActive: { backgroundColor: T.primary, borderColor: T.primary },
  segItemInactive: { backgroundColor: T.paper, borderColor: T.border },
  segTxt: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  // ── Forgot password ───────────────────────────────────────────────────────────
  forgotRow: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotTxt: { fontSize: 13, fontWeight: "600", color: T.primary },

  // ── CTA button ────────────────────────────────────────────────────────────────
  ctaWrap: { marginTop: 4, marginBottom: 20 },
  ctaBtn: { borderRadius: T.radiusMd, overflow: "hidden" },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: T.border },
  dividerTxt: { color: T.mutedFg, fontSize: 13 },

  // ── Sign up row ───────────────────────────────────────────────────────────────
  signinRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  signinTxt: { fontSize: 13, color: T.mutedFg },
  signinLink: { fontSize: 13, color: T.primary, fontWeight: "700" },
});

const rm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 8, paddingBottom: 36,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 20,
  },
  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: "#FFFBEB",
    borderWidth: 1.5, borderColor: "#FDE68A",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 14,
  },
  title: {
    color: "#0F172A", fontSize: 18, fontWeight: "800",
    textAlign: "center", marginBottom: 10, letterSpacing: -0.3,
  },
  body: {
    color: "#475569", fontSize: 13, lineHeight: 20,
    textAlign: "center", marginBottom: 14,
  },
  bold: { fontWeight: "700", color: "#0F172A" },
  infoRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    backgroundColor: "#ECFDF5", borderRadius: 12,
    borderWidth: 1, borderColor: "#A7F3D0",
    padding: 12, marginBottom: 20,
  },
  infoText: { flex: 1, color: "#065F46", fontSize: 12.5, lineHeight: 18 },
  errorText: { color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0",
    alignItems: "center", justifyContent: "center",
  },
  cancelTxt: { color: "#64748B", fontSize: 14, fontWeight: "700" },
  restoreBtn: {
    flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 14, borderRadius: 14,
    backgroundColor: "#F59E0B",
  },
  restoreBtnDisabled: { backgroundColor: "#FCD34D" },
  restoreTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default LoginScreen;
