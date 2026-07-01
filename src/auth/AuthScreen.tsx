/**
 * AuthScreen.tsx — YourShikshak
 * Combined Sign In + Create Account screen.
 * Register collects: name, email, phone, city, password — then hands off to RoleSelectScreen.
 * Login auto-detects role from backend (no role toggle).
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
  Platform,
  KeyboardAvoidingView,
  StatusBar,
  Pressable,
  Image,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  loginUser,
  restoreAccount,
  setAuthToken,
  AUTH_STORAGE_KEY,
} from "../api/client";
import { registerForPushNotifications } from "../services/pushNotifications";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Auth">;
interface Props {
  navigation: Nav;
}

type Tab = "signin" | "register";

const CITIES = ["Bhopal", "Indore", "Online"];

// ─── Floating-label input ─────────────────────────────────────────────────────

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

  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 5] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const labelClr = focused ? T.primary : T.mutedFg;
  const borderClr = error ? T.error : focused ? T.primary : T.border;
  const borderW = focused ? 1.5 : 1;

  return (
    <View style={s.fieldWrap}>
      <View style={[s.fieldBox, { borderColor: borderClr, borderWidth: borderW }]}>
        {icon && (
          <View style={s.fieldIconSlot}>
            <Ionicons name={icon} size={17} color={focused ? T.primary : T.textDisabled} />
          </View>
        )}
        <View style={[s.fieldInner, icon && { paddingLeft: 4 }]}>
          <Animated.Text style={[s.floatLabel, { top: labelTop, fontSize: labelSize, color: labelClr }]}>
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
          <Pressable style={s.eyeBtn} onPress={() => setRevealed(r => !r)} hitSlop={8}>
            <Ionicons name={revealed ? "eye-outline" : "eye-off-outline"} size={17} color={T.textDisabled} />
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

// ─── City chip row ────────────────────────────────────────────────────────────

const CityChips = ({ value, onSelect }: { value: string; onSelect: (v: string) => void }) => (
  <View style={s.fieldWrap}>
    <Text style={s.chipGroupLabel}>City</Text>
    <View style={s.chipRow}>
      {CITIES.map(city => {
        const active = value === city;
        return (
          <Pressable
            key={city}
            onPress={() => onSelect(city)}
            style={[s.chip, active ? { backgroundColor: T.primary, borderColor: T.primary } : { backgroundColor: T.paper, borderColor: T.border }]}
          >
            {active && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
            <Text style={[s.chipTxt, active && { color: "#fff" }]}>{city}</Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Main screen ──────────────────────────────────────────────────────────────

const AuthScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useModal();

  const [tab, setTab] = useState<Tab>("signin");

  // Sign-in state
  const [siEmail, setSiEmail] = useState("");
  const [siPassword, setSiPassword] = useState("");
  const [siErrors, setSiErrors] = useState<Record<string, string>>({});
  const [siLoading, setSiLoading] = useState(false);
  const [restoreModal, setRestoreModal] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const pendingCreds = useRef<{ email: string; password: string } | null>(null);

  // Register state
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regCity, setRegCity] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regErrors, setRegErrors] = useState<Record<string, string>>({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const tabSlide = useRef(new Animated.Value(tab === "signin" ? 0 : 1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay: 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const switchTab = (t: Tab) => {
    setTab(t);
    Animated.timing(tabSlide, {
      toValue: t === "signin" ? 0 : 1,
      duration: 220,
      useNativeDriver: false,
    }).start();
  };

  // ── Sign In ────────────────────────────────────────────────────────────────

  const validateSignIn = () => {
    const e: Record<string, string> = {};
    if (!siEmail.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(siEmail.trim())) e.email = "Enter a valid email";
    if (!siPassword) e.password = "Password is required";
    setSiErrors(e);
    return Object.keys(e).length === 0;
  };

  const signIn = async () => {
    if (!validateSignIn()) return;
    setSiLoading(true);
    try {
      const res = await loginUser({ email: siEmail.trim().toLowerCase(), password: siPassword });
      const { accessToken } = res.data.tokens;
      const user = res.data.user;
      setAuthToken(accessToken);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, user }));
      if (user.role === "TUTOR") registerForPushNotifications();
      if (user.role === "TUTOR") {
        navigation.reset({ index: 0, routes: [{ name: "TutorDashboard", params: { userId: user.id, name: user.name, role: user.role } }] });
      } else if (user.role === "PARENT") {
        navigation.reset({ index: 0, routes: [{ name: "ParentDashboard", params: { userId: user.id, name: user.name, role: user.role } }] });
      }
    } catch (err: any) {
      if (err?.message === "ACCOUNT_PENDING_DELETION") {
        pendingCreds.current = { email: siEmail.trim().toLowerCase(), password: siPassword };
        setRestoreModal(true);
        return;
      }
      showError("Login Failed", err?.message || "Invalid email or password.");
    } finally {
      setSiLoading(false);
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
      }
    } catch (err: any) {
      setRestoreError(err?.message || "Failed to restore account.");
    } finally {
      setRestoreLoading(false);
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────

  const validateRegister = () => {
    const e: Record<string, string> = {};
    if (!regName.trim()) e.name = "Full name is required";
    if (!regEmail.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) e.email = "Enter a valid email";
    if (!regPhone.trim()) e.phone = "Phone number is required";
    else if (!/^\d{10}$/.test(regPhone.trim())) e.phone = "Enter a valid 10-digit number";
    if (!regPassword) e.password = "Password is required";
    else if (regPassword.length < 6) e.password = "At least 6 characters";
    if (regPassword !== regConfirm) e.confirm = "Passwords do not match";
    setRegErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToRoleSelect = () => {
    if (!validateRegister()) return;
    navigation.navigate("RoleSelect", {
      name: regName.trim(),
      email: regEmail.trim().toLowerCase(),
      phone: regPhone.trim(),
      city: regCity,
      password: regPassword,
    });
  };

  const tabIndicatorLeft = tabSlide.interpolate({ inputRange: [0, 1], outputRange: ["2%", "51%"] });
  const heroTitle = tab === "signin" ? "Welcome\nBack" : "Create\nAccount";
  const heroSub = tab === "signin"
    ? "Sign in to access your dashboard, classes, and updates."
    : "Join YourShikshak — connect with tutors or start teaching today.";

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
          {/* ── Hero header ── */}
          <LinearGradient
            colors={[T.darkBg, T.darkBgMid, "#162032"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
          >
            <View style={[s.glowA, { pointerEvents: "none" } as any]} />
            <View style={[s.glowB, { pointerEvents: "none" } as any]} />

            <View style={s.brandRow}>
              <View style={s.brandCenter}>
                <Image source={require("../../assets/logo.jpg")} style={s.brandLogo} />
                <Text style={s.brandName}>YourShikshak</Text>
              </View>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>{tab === "signin" ? "SIGN IN" : "REGISTER"}</Text>
              </View>
            </View>

            <Text style={s.heroTitle}>{heroTitle}</Text>
            <Text style={s.heroSub}>{heroSub}</Text>
          </LinearGradient>

          {/* ── Card ── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Tab switcher */}
            <View style={s.tabBar}>
              <Animated.View style={[s.tabIndicator, { left: tabIndicatorLeft }]} />
              <Pressable style={s.tabItem} onPress={() => switchTab("signin")}>
                <Text style={[s.tabTxt, tab === "signin" && s.tabTxtActive]}>Sign In</Text>
              </Pressable>
              <Pressable style={s.tabItem} onPress={() => switchTab("register")}>
                <Text style={[s.tabTxt, tab === "register" && s.tabTxtActive]}>Create Account</Text>
              </Pressable>
            </View>

            {/* ── Sign In form ── */}
            {tab === "signin" && (
              <View>
                <FInput
                  label="Email Address"
                  value={siEmail}
                  onChange={v => { setSiEmail(v); setSiErrors(e => { const n = { ...e }; delete n.email; return n; }); }}
                  icon="mail-outline"
                  error={siErrors.email}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
                <FInput
                  label="Password"
                  value={siPassword}
                  onChange={v => { setSiPassword(v); setSiErrors(e => { const n = { ...e }; delete n.password; return n; }); }}
                  icon="lock-closed-outline"
                  error={siErrors.password}
                  secure
                  placeholder="Your password"
                />

                <Pressable style={s.forgotRow} hitSlop={8} onPress={() => navigation.navigate("ForgotPassword")}>
                  <Text style={s.forgotTxt}>Forgot password?</Text>
                </Pressable>

                <Pressable style={[s.ctaBtn, siLoading && { opacity: 0.65 }]} onPress={signIn} disabled={siLoading}>
                  <LinearGradient colors={[T.primaryDark, T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                    {siLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="log-in-outline" size={18} color="#fff" style={{ marginRight: 8 }} /><Text style={s.ctaTxt}>Sign In</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <View style={s.switchRow}>
                  <Text style={s.switchTxt}>New to YourShikshak? </Text>
                  <Pressable hitSlop={8} onPress={() => switchTab("register")}>
                    <Text style={s.switchLink}>Create an account</Text>
                  </Pressable>
                </View>
              </View>
            )}

            {/* ── Register form ── */}
            {tab === "register" && (
              <View>
                <FInput
                  label="Full Name"
                  value={regName}
                  onChange={v => { setRegName(v); setRegErrors(e => { const n = { ...e }; delete n.name; return n; }); }}
                  icon="person-outline"
                  error={regErrors.name}
                  placeholder="Your full name"
                />
                <FInput
                  label="Email Address"
                  value={regEmail}
                  onChange={v => { setRegEmail(v); setRegErrors(e => { const n = { ...e }; delete n.email; return n; }); }}
                  icon="mail-outline"
                  error={regErrors.email}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
                <FInput
                  label="Phone Number"
                  value={regPhone}
                  onChange={v => { setRegPhone(v.replace(/\D/g, "")); setRegErrors(e => { const n = { ...e }; delete n.phone; return n; }); }}
                  icon="call-outline"
                  error={regErrors.phone}
                  keyboardType="phone-pad"
                  placeholder="10-digit mobile"
                />

                <CityChips value={regCity} onSelect={setRegCity} />

                <FInput
                  label="Password"
                  value={regPassword}
                  onChange={v => { setRegPassword(v); setRegErrors(e => { const n = { ...e }; delete n.password; return n; }); }}
                  icon="lock-closed-outline"
                  error={regErrors.password}
                  secure
                  placeholder="Min. 6 characters"
                />
                <FInput
                  label="Confirm Password"
                  value={regConfirm}
                  onChange={v => { setRegConfirm(v); setRegErrors(e => { const n = { ...e }; delete n.confirm; return n; }); }}
                  icon="lock-closed-outline"
                  error={regErrors.confirm}
                  secure
                  placeholder="Re-enter password"
                />

                <View style={s.termsRow}>
                  <Ionicons name="information-circle-outline" size={13} color={T.mutedFg} />
                  <Text style={s.termsTxt}>
                    By continuing you agree to our{" "}
                    <Text style={s.termsLink}>Terms of Service</Text> and{" "}
                    <Text style={s.termsLink}>Privacy Policy</Text>.
                  </Text>
                </View>

                <Pressable style={s.ctaBtn} onPress={goToRoleSelect}>
                  <LinearGradient colors={[T.primaryDark, T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                    <Text style={s.ctaTxt}>Continue</Text>
                    <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </LinearGradient>
                </Pressable>

                <View style={s.switchRow}>
                  <Text style={s.switchTxt}>Already have an account? </Text>
                  <Pressable hitSlop={8} onPress={() => switchTab("signin")}>
                    <Text style={s.switchLink}>Sign In</Text>
                  </Pressable>
                </View>
              </View>
            )}
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
              You previously requested account deletion. Your data is still within the{" "}
              <Text style={rm.bold}>30-day retention period</Text> and can be fully recovered.
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
                  : <><Ionicons name="refresh-outline" size={15} color="#fff" /><Text style={rm.restoreTxt}>Restore & Login</Text></>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  header: { paddingHorizontal: 22, paddingBottom: 44, overflow: "hidden" },
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: `${T.primary}18` },
  glowB: { position: "absolute", bottom: -40, left: -30, width: 160, height: 160, borderRadius: 80, backgroundColor: `${T.secondary}12` },

  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 28, height: 28, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brandName: { color: "#fff", fontSize: 15, fontWeight: "700" },
  liveBadge: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(255,255,255,0.12)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 99, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveTxt: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "700", letterSpacing: 0.8 },

  heroTitle: { color: "#fff", fontSize: 36, fontWeight: "700", letterSpacing: -0.8, lineHeight: 42, marginBottom: 10 },
  heroSub: { color: "rgba(255,255,255,0.55)", fontSize: 13, lineHeight: 20 },

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

  // Tab bar
  tabBar: {
    flexDirection: "row",
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 3,
    marginBottom: 24,
    position: "relative",
    height: 44,
  },
  tabIndicator: {
    position: "absolute",
    top: 3,
    width: "48%",
    height: 38,
    backgroundColor: T.paper,
    borderRadius: T.radiusMd - 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 4,
    elevation: 2,
  },
  tabItem: { flex: 1, alignItems: "center", justifyContent: "center", zIndex: 1 },
  tabTxt: { fontSize: 13, fontWeight: "600", color: T.mutedFg },
  tabTxtActive: { color: T.textPrimary, fontWeight: "700" },

  // Fields
  fieldWrap: { marginBottom: 14 },
  fieldBox: { flexDirection: "row", alignItems: "center", minHeight: 56, borderRadius: T.radiusMd, backgroundColor: T.paper, borderWidth: 1, borderColor: T.border },
  fieldIconSlot: { paddingLeft: 14, paddingRight: 2 },
  fieldInner: { flex: 1, paddingHorizontal: 14 },
  floatLabel: { position: "absolute", left: 0, fontWeight: "500" },
  fieldInput: { color: T.textPrimary, fontSize: 15, fontWeight: "400", paddingTop: 22, paddingBottom: 8 },
  fieldError: { flexDirection: "row", alignItems: "center", marginTop: 4, paddingLeft: 2 },
  fieldErrorTxt: { color: T.error, fontSize: 12, marginLeft: 4 },
  eyeBtn: { paddingHorizontal: 14 },

  // City chips
  chipGroupLabel: { fontSize: 11, fontWeight: "700", color: T.mutedFg, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  chipRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1 },
  chipTxt: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  // Forgot
  forgotRow: { alignSelf: "flex-end", marginBottom: 20, marginTop: -4 },
  forgotTxt: { fontSize: 13, fontWeight: "600", color: T.primary },

  // CTA
  ctaBtn: { borderRadius: T.radiusMd, overflow: "hidden", marginBottom: 20, marginTop: 4 },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, paddingHorizontal: 20 },
  ctaTxt: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },

  // Terms
  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4, marginBottom: 14 },
  termsTxt: { color: T.mutedFg, fontSize: 11, lineHeight: 16, flex: 1 },
  termsLink: { color: T.primary, fontWeight: "600" },

  // Switch tab
  switchRow: { flexDirection: "row", justifyContent: "center", marginTop: 4 },
  switchTxt: { fontSize: 13, color: T.mutedFg },
  switchLink: { fontSize: 13, color: T.primary, fontWeight: "700" },
});

const rm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 24, paddingTop: 8, paddingBottom: 36, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 24, elevation: 20 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0", alignSelf: "center", marginBottom: 20 },
  iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FFFBEB", borderWidth: 1.5, borderColor: "#FDE68A", alignItems: "center", justifyContent: "center", alignSelf: "center", marginBottom: 14 },
  title: { color: "#0F172A", fontSize: 18, fontWeight: "800", textAlign: "center", marginBottom: 10, letterSpacing: -0.3 },
  body: { color: "#475569", fontSize: 13, lineHeight: 20, textAlign: "center", marginBottom: 14 },
  bold: { fontWeight: "700", color: "#0F172A" },
  infoRow: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#ECFDF5", borderRadius: 12, borderWidth: 1, borderColor: "#A7F3D0", padding: 12, marginBottom: 20 },
  infoText: { flex: 1, color: "#065F46", fontSize: 12.5, lineHeight: 18 },
  errorText: { color: "#EF4444", fontSize: 12, textAlign: "center", marginBottom: 10 },
  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F8FAFC", borderWidth: 1, borderColor: "#E2E8F0", alignItems: "center", justifyContent: "center" },
  cancelTxt: { color: "#64748B", fontSize: 14, fontWeight: "700" },
  restoreBtn: { flex: 1.4, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 14, borderRadius: 14, backgroundColor: "#F59E0B" },
  restoreBtnDisabled: { backgroundColor: "#FCD34D" },
  restoreTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default AuthScreen;
