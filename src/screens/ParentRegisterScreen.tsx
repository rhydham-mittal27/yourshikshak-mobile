/**
 * ParentRegisterScreen.tsx — YourShikshak
 *
 * Parent registration screen.
 * Design: vivid teal/cyan hero header, white scrollable form card,
 * colourful section badges, gradient chips, animated inputs.
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
  Dimensions,
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
import { registerParent, setAuthToken, AUTH_STORAGE_KEY } from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

const { width } = Dimensions.get("window");

type Nav = StackNavigationProp<RootStackParamList, "ParentRegister">;
interface Props {
  navigation: Nav;
}

// ─── Design tokens for this screen ───────────────────────────────────────────
const C = {
  heroTop: "#0095C1",
  heroMid: "#00B7EB",
  heroBtm: "#1E4A8C",
  teal: "#00B7EB",
  tealDark: "#0095C1",
  indigo: "#4F46E5",
  mint: "#10B981",
  amber: "#F59E0B",
};

// ─── Animated floating-label field ───────────────────────────────────────────

const Field = ({
  label,
  value,
  onChange,
  icon,
  placeholder,
  error,
  keyboardType,
  maxLen,
  multiline,
  lines,
  accent = T.primary,
  secureTextEntry,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  icon: any;
  placeholder?: string;
  error?: string;
  keyboardType?: any;
  maxLen?: number;
  multiline?: boolean;
  lines?: number;
  accent?: string;
  secureTextEntry?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const float = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(float, {
      toValue: focused || value ? 1 : 0,
      duration: 150,
      useNativeDriver: false,
    }).start();
  }, [focused, value]);

  const labelTop = float.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 4],
  });
  const labelSize = float.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 10],
  });

  const borderColor = error ? T.error : focused ? accent : T.border;
  const borderWidth = focused ? 1.8 : 1;
  const iconColor = focused ? accent : T.textDisabled;

  return (
    <View style={f.wrap}>
      <View style={[f.box, { borderColor, borderWidth }]}>
        <View style={f.iconSlot}>
          <Ionicons name={icon} size={18} color={iconColor} />
        </View>
        <View style={f.inner}>
          <Animated.Text
            style={[
              f.label,
              {
                top: labelTop,
                fontSize: labelSize,
                color: focused ? accent : T.mutedFg,
              },
            ]}
          >
            {label}
          </Animated.Text>
          <TextInput
            style={[
              f.input,
              multiline && {
                height: (lines ?? 3) * 22 + 20,
                textAlignVertical: "top",
                paddingTop: 22,
              },
            ]}
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? placeholder : ""}
            placeholderTextColor={T.textDisabled}
            keyboardType={keyboardType}
            maxLength={maxLen}
            multiline={multiline}
            secureTextEntry={secureTextEntry}
          />
        </View>
      </View>
      {error ? (
        <View style={f.errRow}>
          <Ionicons name="alert-circle" size={12} color={T.error} />
          <Text style={f.errTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

// ─── Colourful section badge ──────────────────────────────────────────────────

const SectionBadge = ({
  icon,
  label,
  color,
  gradColors,
}: {
  icon: any;
  label: string;
  color: string;
  gradColors: string[];
}) => (
  <View style={sb.row}>
    <LinearGradient
      colors={gradColors as any}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={sb.iconBox}
    >
      <Ionicons name={icon} size={14} color="#fff" />
    </LinearGradient>
    <Text style={[sb.label, { color }]}>{label}</Text>
    <View style={[sb.line, { backgroundColor: `${color}25` }]} />
  </View>
);

// ─── Chip selector ────────────────────────────────────────────────────────────

const ChipRow = ({
  label,
  options,
  selected,
  onSelect,
  activeGrad,
}: {
  label?: string;
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  activeGrad: string[];
}) => (
  <View style={ch.wrap}>
    {label ? <Text style={ch.label}>{label}</Text> : null}
    <View style={ch.row}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <Pressable
            key={opt}
            onPress={() => onSelect(active ? "" : opt)}
            style={active ? ch.chipPressable : [ch.chipPressable, ch.chipInactive]}
          >
            {active ? (
              <LinearGradient
                colors={activeGrad as any}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={ch.chipActive}
              >
                <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />
                <Text style={ch.chipTxtActive}>{opt}</Text>
              </LinearGradient>
            ) : (
              <Text style={ch.chipTxt}>{opt}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Success view ─────────────────────────────────────────────────────────────

const SuccessView = ({ onBack }: { onBack: () => void }) => {
  const scale = useRef(new Animated.Value(0.7)).current;
  const op = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 60,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(op, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[sv.wrap, { transform: [{ scale }], opacity: op }]}>
      <LinearGradient
        colors={["#EFF6FF", "#E0F2FE", "#DBEAFE"]}
        style={sv.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <LinearGradient colors={[C.tealDark, C.teal]} style={sv.iconCircle}>
          <Ionicons name="checkmark" size={36} color="#fff" />
        </LinearGradient>
        <Text style={sv.title}>Account Created! 🎉</Text>
        <Text style={sv.body}>
          {"Welcome! Your account is ready.\n\nYou can now sign in and browse verified tutors for your child."}
        </Text>
        <View style={sv.featureRow}>
          {["Verified Tutor", "Free Demo", "Instant Login"].map((f) => (
            <View key={f} style={sv.featureChip}>
              <Ionicons name="checkmark-circle" size={12} color={C.mint} />
              <Text style={sv.featureTxt}>{f}</Text>
            </View>
          ))}
        </View>
      </LinearGradient>
      <Pressable
        onPress={onBack}
        style={({ pressed }) => [sv.btn, pressed && { opacity: 0.85 }]}
      >
        <LinearGradient
          colors={[C.tealDark, C.teal]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={sv.btnGrad}
        >
          <Ionicons
            name="home-outline"
            size={16}
            color="#fff"
            style={{ marginRight: 8 }}
          />
          <Text style={sv.btnTxt}>Back to Home</Text>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
};

// ─── Grade options ────────────────────────────────────────────────────────────

const CITIES = ["Bhopal", "Indore", "Online"];

// ─── Main screen ──────────────────────────────────────────────────────────────

const ParentRegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useModal();

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [password, setPassword] = useState("");
  const [city, setCity] = useState("");
  const [notes, setNotes] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [succeeded, setSucceeded] = useState(false);

  // card entrance
  const cardY = useRef(new Animated.Value(30)).current;
  const cardOp = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(cardY, {
        toValue: 0,
        duration: 480,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.timing(cardOp, {
        toValue: 1,
        duration: 480,
        delay: 120,
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
    if (!parentName.trim()) e.parentName = "Parent name is required";
    if (!parentEmail.trim()) e.parentEmail = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parentEmail.trim()))
      e.parentEmail = "Enter a valid email address";
    if (!parentPhone.trim()) e.parentPhone = "Phone number is required";
    else if (!/^\d{10}$/.test(parentPhone.trim()))
      e.parentPhone = "Enter a valid 10-digit number";
    if (!password.trim()) e.password = "Password is required";
    else if (password.length < 6)
      e.password = "Password must be at least 6 characters";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const res = await registerParent({
        name: parentName.trim(),
        email: parentEmail.trim(),
        password,
        phone: parentPhone.trim(),
        userType: "PARENT",
        city: city || undefined,
        notes: notes.trim() || undefined,
      });
      if (res.data?.accessToken && res.data?.user) {
        setAuthToken(res.data.accessToken);
        await AsyncStorage.setItem(
          AUTH_STORAGE_KEY,
          JSON.stringify({
            accessToken: res.data.accessToken,
            user: { ...res.data.user, userType: "PARENT" },
          }),
        );
      }
      setSucceeded(true);
    } catch (err: any) {
      showError("Registration Failed", err?.message || "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          {/* ── Hero header ── */}
          <LinearGradient
            colors={[C.heroBtm, C.heroTop, C.heroMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 10 }]}
          >
            {/* Decorative circles */}
            <View style={s.decA} pointerEvents="none" />
            <View style={s.decB} pointerEvents="none" />

            {/* Back + brand */}
            <View style={s.heroTop}>
              <Pressable
                style={s.backBtn}
                onPress={() => navigation.goBack()}
                hitSlop={10}
              >
                <Ionicons
                  name="arrow-back"
                  size={18}
                  color="rgba(255,255,255,0.9)"
                />
              </Pressable>
              <View style={s.brandRow}>
                <Image
                  source={require("../../assets/logo.jpg")}
                  style={s.logoImg}
                />
                <Text style={s.brandName}>YourShikshak</Text>
              </View>
              <View style={{ width: 36 }} />
            </View>

            {/* Hero text */}
            <View style={s.heroTextBlock}>
              <View style={s.heroBadge}>
                <Ionicons name="people" size={13} color="#fff" />
                <Text style={s.heroBadgeTxt}>For Parents</Text>
              </View>
              <Text style={s.heroTitle}>{"Find the Perfect\nTutor Today"}</Text>
              <Text style={s.heroSub}>
                {"Tell us about your child and we'll match you with a verified expert within 24 hours."}
              </Text>
            </View>

            {/* Trust strip */}
            <View style={s.trustStrip}>
              {[
                { icon: "shield-checkmark", label: "Verified" },
                { icon: "flash", label: "24h Match" },
                { icon: "star", label: "4.8★ Rated" },
                { icon: "gift", label: "Free Demo" },
              ].map(({ icon, label }) => (
                <View key={label} style={s.trustItem}>
                  <Ionicons
                    name={icon as any}
                    size={14}
                    color="rgba(255,255,255,0.9)"
                  />
                  <Text style={s.trustLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* ── Form card ── */}
          <Animated.View
            style={[
              s.card,
              { transform: [{ translateY: cardY }], opacity: cardOp },
            ]}
          >
            {succeeded ? (
              <SuccessView onBack={() => navigation.navigate("Intro")} />
            ) : (
              <>
                {/* ── Account details ── */}
                <SectionBadge
                  icon="person"
                  label="Parent Details"
                  color={T.primary}
                  gradColors={[T.primaryDark, T.primary]}
                />

                <Field
                  label="Parent / Guardian Name"
                  value={parentName}
                  onChange={(v) => {
                    setParentName(v);
                    clearErr("parentName");
                  }}
                  icon="person-outline"
                  placeholder="Your full name"
                  error={errors.parentName}
                  accent={T.primary}
                />
                <Field
                  label="Email Address"
                  value={parentEmail}
                  onChange={(v) => {
                    setParentEmail(v);
                    clearErr("parentEmail");
                  }}
                  icon="mail-outline"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  error={errors.parentEmail}
                  accent={T.primary}
                />
                <Field
                  label="Phone Number"
                  value={parentPhone}
                  onChange={(v) => {
                    setParentPhone(v.replace(/\D/g, ""));
                    clearErr("parentPhone");
                  }}
                  icon="call-outline"
                  placeholder="10-digit mobile"
                  keyboardType="phone-pad"
                  maxLen={10}
                  error={errors.parentPhone}
                  accent={T.primary}
                />
                <Field
                  label="Password"
                  value={password}
                  onChange={(v) => {
                    setPassword(v);
                    clearErr("password");
                  }}
                  icon="lock-closed-outline"
                  placeholder="Min. 6 characters"
                  error={errors.password}
                  accent={T.primary}
                  secureTextEntry
                />

                {/* ── Location ── */}
                <SectionBadge
                  icon="location"
                  label="Location"
                  color={C.indigo}
                  gradColors={["#3730A3", C.indigo]}
                />

                <ChipRow
                  label="City"
                  options={CITIES}
                  selected={city}
                  onSelect={setCity}
                  activeGrad={["#3730A3", C.indigo]}
                />

                {/* ── Additional info ── */}
                <SectionBadge
                  icon="create"
                  label="Additional Info"
                  color={C.amber}
                  gradColors={["#D97706", C.amber]}
                />

                <Field
                  label="Subjects / Special Requirements (optional)"
                  value={notes}
                  onChange={setNotes}
                  icon="document-text-outline"
                  placeholder="e.g. Need Maths & Science for CBSE Class 10…"
                  multiline
                  lines={3}
                  accent={C.amber}
                />

                {/* Terms */}
                <View style={s.termsRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={13}
                    color={T.mutedFg}
                  />
                  <Text style={s.termsTxt}>
                    By submitting you agree to our{" "}
                    <Text style={s.termsLink}>Terms of Service</Text> and{" "}
                    <Text style={s.termsLink}>Privacy Policy</Text>.
                  </Text>
                </View>

                {/* CTA button */}
                <Pressable
                  onPress={submit}
                  disabled={submitting}
                  style={({ pressed }) => [
                    s.cta,
                    submitting && { opacity: 0.65 },
                    pressed && { opacity: 0.87 },
                  ]}
                >
                  <LinearGradient
                    colors={[C.tealDark, C.teal, "#33C9F0"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.ctaGrad}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <>
                        <Ionicons
                          name="search"
                          size={18}
                          color="#fff"
                          style={{ marginRight: 9 }}
                        />
                        <Text style={s.ctaTxt}>Find Me a Tutor</Text>
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="rgba(255,255,255,0.7)"
                          style={{ marginLeft: 9 }}
                        />
                      </>
                    )}
                  </LinearGradient>
                </Pressable>

                <View style={s.signinRow}>
                  <Text style={s.signinTxt}>Already have an account? </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => navigation.navigate("Login")}
                  >
                    <Text style={s.signinLink}>Sign In</Text>
                  </Pressable>
                </View>
              </>
            )}
          </Animated.View>

          <View style={{ height: Math.max(insets.bottom, 24) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: {},

  // ── Hero ─────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 32,
    overflow: "hidden",
  },
  decA: {
    position: "absolute",
    top: -60,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  decB: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: "rgba(255,255,255,0.06)",
  },

  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoImg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  brandName: { color: "#fff", fontSize: 15, fontWeight: "700" },

  heroTextBlock: { marginBottom: 20 },
  heroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    marginBottom: 10,
  },
  heroBadgeTxt: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.7,
    lineHeight: 35,
    marginBottom: 8,
  },
  heroSub: { color: "rgba(255,255,255,0.65)", fontSize: 13, lineHeight: 19 },

  trustStrip: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  trustItem: { flex: 1, alignItems: "center", gap: 4 },
  trustLabel: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 10,
    fontWeight: "600",
  },

  // ── Card ─────────────────────────────────────────────────────────────────
  card: {
    margin: 16,
    marginTop: -18,
    backgroundColor: T.paper,
    borderRadius: 22,
    padding: 20,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOpacity: 0.09,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 5,
  },

  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 4,
    marginBottom: 14,
  },
  termsTxt: { color: T.mutedFg, fontSize: 11, lineHeight: 16, flex: 1 },
  termsLink: { color: T.primary, fontWeight: "600" },

  cta: { borderRadius: 14, overflow: "hidden", marginBottom: 14 },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  ctaTxt: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  signinRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  signinTxt: { color: T.mutedFg, fontSize: 13 },
  signinLink: { color: C.tealDark, fontSize: 13, fontWeight: "700" },
});

// ─── Field styles ─────────────────────────────────────────────────────────────
const f = StyleSheet.create({
  wrap: { marginBottom: 14 },
  box: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: 12,
    backgroundColor: "#FAFBFC",
    minHeight: 54,
  },
  iconSlot: { width: 46, paddingTop: 17, alignItems: "center" },
  inner: { flex: 1, paddingRight: 12 },
  label: {
    position: "absolute",
    left: 0,
    fontWeight: "500",
  },
  input: {
    color: T.textPrimary,
    fontSize: 15,
    paddingTop: 22,
    paddingBottom: 8,
    minHeight: 54,
  },
  errRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    marginLeft: 4,
  },
  errTxt: { color: T.error, fontSize: 11 },
});

// ─── Section badge styles ─────────────────────────────────────────────────────
const sb = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
    marginTop: 6,
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: "700", letterSpacing: 0.1 },
  line: { flex: 1, height: 1.5, borderRadius: 99 },
});

// ─── Chip row styles ──────────────────────────────────────────────────────────
const ch = StyleSheet.create({
  wrap: { marginBottom: 14 },
  label: {
    color: T.textSecondary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  row: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chipPressable: {},
  chipActive: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
  },
  chipInactive: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.muted,
    borderRadius: 99,
  },
  chipTxt: { color: T.textSecondary, fontSize: 12, fontWeight: "600" },
  chipTxtActive: { color: "#fff", fontSize: 12, fontWeight: "700" },
});

// ─── Success view styles ──────────────────────────────────────────────────────
const sv = StyleSheet.create({
  wrap: { overflow: "hidden", borderRadius: 18 },
  card: { padding: 28, alignItems: "center", borderRadius: 18 },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
    shadowColor: C.teal,
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  title: {
    color: T.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.4,
    textAlign: "center",
    marginBottom: 12,
  },
  body: {
    color: T.textSecondary,
    fontSize: 14,
    lineHeight: 22,
    textAlign: "center",
    marginBottom: 18,
  },
  featureRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  featureTxt: { color: "#065F46", fontSize: 11, fontWeight: "600" },
  btn: { borderRadius: 13, overflow: "hidden", width: "100%" },
  btnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
  },
  btnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default ParentRegisterScreen;
