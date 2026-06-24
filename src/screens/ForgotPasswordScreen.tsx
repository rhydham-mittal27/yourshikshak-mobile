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
  ActivityIndicator,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import { forgotPassword, resetPassword } from "../api/client";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "ForgotPassword">;
interface Props { navigation: Nav }

// ─── Floating-label input ─────────────────────────────────────────────────────

const FInput = ({
  label, value, onChange, error, secure, keyboardType, icon, placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  error?: string; secure?: boolean; keyboardType?: any; icon?: any; placeholder?: string;
}) => {
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(floatAnim, { toValue: focused || value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [focused, value]);
  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 5] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  const borderClr = error ? T.error : focused ? T.primary : T.border;
  return (
    <View style={s.fieldWrap}>
      <View style={[s.fieldBox, { borderColor: borderClr, borderWidth: focused ? 1.5 : 1 }]}>
        {icon && <View style={s.fieldIconSlot}><Ionicons name={icon} size={17} color={focused ? T.primary : T.textDisabled} /></View>}
        <View style={[s.fieldInner, icon && { paddingLeft: 4 }]}>
          <Animated.Text style={[s.floatLabel, { top: labelTop, fontSize: labelSize, color: focused ? T.primary : T.mutedFg }]}>{label}</Animated.Text>
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

// ─── Screen ───────────────────────────────────────────────────────────────────

type Step = "email" | "reset";

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useModal();

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);

  const [token, setToken] = useState("");
  const [tokenError, setTokenError] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordError, setNewPasswordError] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [confirmPasswordError, setConfirmPasswordError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 380, delay: 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 380, delay: 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const animateStep = () => {
    fadeAnim.setValue(0);
    slideAnim.setValue(16);
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start();
  };

  const sendResetLink = async () => {
    if (!email.trim()) { setEmailError("Email is required"); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setEmailError("Enter a valid email address"); return; }
    setEmailError("");
    setEmailLoading(true);
    try {
      await forgotPassword(email.trim().toLowerCase());
      setStep("reset");
      animateStep();
    } catch (err: any) {
      showError("Error", err?.message || "Failed to send reset link. Please try again.");
    } finally {
      setEmailLoading(false);
    }
  };

  const submitReset = async () => {
    let valid = true;
    if (!token.trim()) { setTokenError("Reset token is required"); valid = false; }
    else setTokenError("");
    if (!newPassword) { setNewPasswordError("New password is required"); valid = false; }
    else if (newPassword.length < 6) { setNewPasswordError("At least 6 characters"); valid = false; }
    else setNewPasswordError("");
    if (newPassword !== confirmPassword) { setConfirmPasswordError("Passwords do not match"); valid = false; }
    else setConfirmPasswordError("");
    if (!valid) return;
    setResetLoading(true);
    try {
      await resetPassword(token.trim(), newPassword);
      setResetDone(true);
    } catch (err: any) {
      showError("Reset Failed", err?.message || "Invalid or expired token. Please request a new one.");
    } finally {
      setResetLoading(false);
    }
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
            colors={[T.darkBg, T.darkBgMid, "#162032"]}
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
              <Text style={s.stepBadgeTxt}>{step === "email" ? "STEP 1 OF 2 · FORGOT PASSWORD" : "STEP 2 OF 2 · RESET PASSWORD"}</Text>
            </View>
            <Text style={s.heroTitle}>{step === "email" ? "Forgot\nPassword?" : "Reset\nPassword"}</Text>
            <Text style={s.heroSub}>
              {step === "email"
                ? "Enter your registered email. We'll send a reset link."
                : `We sent a reset token to ${email}. Enter it below with your new password.`}
            </Text>
          </LinearGradient>

          {/* ── Card ── */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* ── Step 1: Email ── */}
            {step === "email" && (
              <View>
                <View style={s.infoBox}>
                  <Ionicons name="mail-outline" size={15} color={T.primary} />
                  <Text style={s.infoTxt}>We'll send a password reset token to your email address.</Text>
                </View>
                <FInput
                  label="Registered Email"
                  value={email}
                  onChange={v => { setEmail(v); setEmailError(""); }}
                  icon="mail-outline"
                  error={emailError}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
                <Pressable
                  style={[s.ctaBtn, emailLoading && { opacity: 0.65 }]}
                  onPress={sendResetLink}
                  disabled={emailLoading}
                >
                  <LinearGradient colors={[T.primaryDark, T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                    {emailLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="send-outline" size={17} color="#fff" style={{ marginRight: 8 }} /><Text style={s.ctaTxt}>Send Reset Link</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => navigation.goBack()} style={s.backToSignIn} hitSlop={8}>
                  <Ionicons name="arrow-back-outline" size={14} color={T.primary} />
                  <Text style={s.backToSignInTxt}>Back to Sign In</Text>
                </Pressable>
              </View>
            )}

            {/* ── Step 2: Reset ── */}
            {step === "reset" && !resetDone && (
              <View>
                <View style={s.successBanner}>
                  <Ionicons name="checkmark-circle" size={15} color={T.success} />
                  <Text style={s.successBannerTxt}>Reset token sent! Check your email inbox (and spam folder).</Text>
                </View>
                <FInput
                  label="Reset Token"
                  value={token}
                  onChange={v => { setToken(v); setTokenError(""); }}
                  icon="key-outline"
                  error={tokenError}
                  placeholder="Paste the token from your email"
                />
                <FInput
                  label="New Password"
                  value={newPassword}
                  onChange={v => { setNewPassword(v); setNewPasswordError(""); }}
                  icon="lock-closed-outline"
                  error={newPasswordError}
                  secure
                  placeholder="Min. 6 characters"
                />
                <FInput
                  label="Confirm New Password"
                  value={confirmPassword}
                  onChange={v => { setConfirmPassword(v); setConfirmPasswordError(""); }}
                  icon="lock-closed-outline"
                  error={confirmPasswordError}
                  secure
                  placeholder="Re-enter new password"
                />

                <Pressable
                  style={[s.ctaBtn, resetLoading && { opacity: 0.65 }]}
                  onPress={submitReset}
                  disabled={resetLoading}
                >
                  <LinearGradient colors={[T.primaryDark, T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                    {resetLoading
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <><Ionicons name="checkmark-circle-outline" size={17} color="#fff" style={{ marginRight: 8 }} /><Text style={s.ctaTxt}>Reset Password</Text></>
                    }
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={() => { setStep("email"); animateStep(); }} style={s.backToSignIn} hitSlop={8}>
                  <Ionicons name="refresh-outline" size={14} color={T.primary} />
                  <Text style={s.backToSignInTxt}>Resend token</Text>
                </Pressable>
              </View>
            )}

            {/* ── Done state ── */}
            {resetDone && (
              <View style={s.doneContainer}>
                <View style={s.doneIcon}>
                  <Ionicons name="checkmark-circle" size={48} color={T.success} />
                </View>
                <Text style={s.doneTitle}>Password Reset!</Text>
                <Text style={s.doneSub}>Your password has been updated successfully. You can now sign in with your new password.</Text>
                <Pressable style={s.ctaBtn} onPress={() => navigation.navigate("Auth")}>
                  <LinearGradient colors={[T.primaryDark, T.primary, T.primaryLight]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                    <Ionicons name="log-in-outline" size={17} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={s.ctaTxt}>Sign In</Text>
                  </LinearGradient>
                </Pressable>
              </View>
            )}
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
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: `${T.primary}18` },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brandName: { color: "#fff", fontSize: 14, fontWeight: "700" },

  stepBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  stepBadgeTxt: { color: "rgba(255,255,255,0.85)", fontSize: 9.5, fontWeight: "800", letterSpacing: 1 },

  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "700", letterSpacing: -0.8, lineHeight: 38, marginBottom: 8 },
  heroSub: { color: "rgba(255,255,255,0.6)", fontSize: 13, lineHeight: 19 },

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

  infoBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: `${T.primary}12`, borderRadius: T.radiusMd, borderWidth: 1, borderColor: `${T.primary}30`, padding: 12, marginBottom: 20 },
  infoTxt: { flex: 1, color: T.textSecondary, fontSize: 13, lineHeight: 19 },

  successBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#ECFDF5", borderRadius: T.radiusMd, borderWidth: 1, borderColor: "#A7F3D0", padding: 12, marginBottom: 20 },
  successBannerTxt: { flex: 1, color: "#065F46", fontSize: 13, lineHeight: 18 },

  fieldWrap: { marginBottom: 14 },
  fieldBox: { flexDirection: "row", alignItems: "center", minHeight: 56, borderRadius: T.radiusMd, backgroundColor: T.paper, borderWidth: 1, borderColor: T.border },
  fieldIconSlot: { paddingLeft: 14, paddingRight: 2 },
  fieldInner: { flex: 1, paddingHorizontal: 14 },
  floatLabel: { position: "absolute", left: 0, fontWeight: "500" },
  fieldInput: { color: T.textPrimary, fontSize: 15, fontWeight: "400", paddingTop: 22, paddingBottom: 8 },
  fieldError: { flexDirection: "row", alignItems: "center", marginTop: 4, paddingLeft: 2 },
  fieldErrorTxt: { color: T.error, fontSize: 12, marginLeft: 4 },
  eyeBtn: { paddingHorizontal: 14 },

  ctaBtn: { borderRadius: T.radiusMd, overflow: "hidden", marginBottom: 16, marginTop: 4 },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15 },
  ctaTxt: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },

  backToSignIn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 8 },
  backToSignInTxt: { fontSize: 13, color: T.primary, fontWeight: "600" },

  doneContainer: { alignItems: "center", paddingTop: 12, paddingBottom: 8 },
  doneIcon: { marginBottom: 16 },
  doneTitle: { fontSize: 22, fontWeight: "800", color: T.textPrimary, marginBottom: 10, letterSpacing: -0.3 },
  doneSub: { fontSize: 13, color: T.textSecondary, lineHeight: 20, textAlign: "center", marginBottom: 28 },
});

export default ForgotPasswordScreen;
