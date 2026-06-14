/**
 * RegisterScreen.tsx
 * Multi-step tutor registration for YourShikshak mobile app.
 * Design tokens mirror frontend/src/theme/theme.ts + global.css patterns.
 */

import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
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
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerTutor,
  getOptions,
  loginUser,
  setAuthToken,
  AUTH_STORAGE_KEY,
  getTutorProfile,
  updateTutorAvailabilitySettings,
  Option,
  sendRegistrationOtp,
  verifyRegistrationOtp,
} from "../api/client";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

const { width } = Dimensions.get("window");

// ─── Types ────────────────────────────────────────────────────────────────────

type Nav = StackNavigationProp<RootStackParamList, "Register">;
interface Props {
  navigation: Nav;
}

type Gender = "MALE" | "FEMALE" | "OTHER";
type TeachingMode = "OFFLINE" | "ONLINE" | "HYBRID";
type Exp = "Fresher" | "1-2 Years" | "3-5 Years" | "5-10 Years" | "10+ Years";

interface FormData {
  fullName: string;
  gender: Gender;
  phoneNumber: string;
  alternatePhone: string;
  email: string;
  qualification: string;
  experience: Exp | "";
  subjects: string[];
  extracurricularActivities: string[];
  password: string;
  confirmPassword: string;
  city: string;
  preferredAreas: string[];
  preferredMode: TeachingMode;
  permanentAddress: string;
  residentialAddress: string;
  bio: string;
  languagesKnown: string[];
  skills: string[];
  daysAvailable: string[];
  timeSlots: string[];
}

const INIT: FormData = {
  fullName: "",
  gender: "MALE",
  phoneNumber: "",
  alternatePhone: "",
  email: "",
  qualification: "",
  experience: "",
  subjects: [],
  extracurricularActivities: [],
  password: "",
  confirmPassword: "",
  city: "",
  preferredAreas: [],
  preferredMode: "OFFLINE",
  permanentAddress: "",
  residentialAddress: "",
  bio: "",
  languagesKnown: [],
  skills: [],
  daysAvailable: [],
  timeSlots: [],
};

const STEPS = [
  { id: 0, label: "Personal", icon: "person-circle-outline" as const },
  { id: 1, label: "Education", icon: "school-outline" as const },
  { id: 2, label: "Location", icon: "location-outline" as const },
  { id: 3, label: "Availability", icon: "calendar-outline" as const },
  { id: 4, label: "Security", icon: "shield-checkmark-outline" as const },
];

const DAY_OPTS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const TIME_SLOT_OPTS = [
  "6:00 AM - 8:00 AM",
  "8:00 AM - 10:00 AM",
  "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM",
  "2:00 PM - 4:00 PM",
  "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM",
  "8:00 PM - 10:00 PM",
];

const EXP_OPTS: Exp[] = [
  "Fresher",
  "1-2 Years",
  "3-5 Years",
  "5-10 Years",
  "10+ Years",
];
const LANG_OPTS = [
  "English",
  "Hindi",
  "Marathi",
  "Bengali",
  "Tamil",
  "Telugu",
  "Kannada",
  "Gujarati",
  "Punjabi",
  "Malayalam",
];
const SKILL_OPTS = [
  "Teaching",
  "Communication",
  "Online Tutoring",
  "Lesson Planning",
  "Subject Expertise",
  "Mentoring",
];

// ─── Reusable Primitives ──────────────────────────────────────────────────────

/** Labelled card-section header (matches frontend SectionHeader pattern) */
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

/** Text input with floating label + focus ring — matches MuiTextField override */
const FInput = ({
  label,
  value,
  onChange,
  placeholder,
  error,
  secure,
  keyboardType,
  icon,
  multiline,
  lines,
  maxLen,
  editable = true,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  secure?: boolean;
  keyboardType?: any;
  icon?: any;
  multiline?: boolean;
  lines?: number;
  maxLen?: number;
  editable?: boolean;
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
        style={[
          s.fieldBox,
          { borderColor: borderClr, borderWidth: borderW },
          !editable && s.fieldDisabled,
        ]}
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
            style={[
              s.fieldInput,
              multiline && {
                height: lines ? lines * 22 + 20 : 66,
                textAlignVertical: "top",
                paddingTop: 26,
              },
            ]}
            value={value}
            onChangeText={onChange}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={focused ? placeholder : ""}
            placeholderTextColor={T.textDisabled}
            secureTextEntry={secure && !revealed}
            keyboardType={keyboardType}
            multiline={multiline}
            maxLength={maxLen}
            editable={editable}
          />
        </View>
        {secure && (
          <Pressable
            style={s.eyeBtn}
            onPress={() => setRevealed(!revealed)}
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

/** Dropdown select — matches MuiSelect rounded override */
const FSelect = ({
  label,
  options,
  value,
  onPick,
  icon,
  error,
}: {
  label: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
  icon?: any;
  error?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={s.fieldWrap}>
      <Pressable
        style={[
          s.fieldBox,
          {
            borderColor: open ? T.primary : error ? T.error : T.border,
            borderWidth: open ? 1.5 : 1,
          },
        ]}
        onPress={() => setOpen(!open)}
      >
        {icon && (
          <View style={s.fieldIconSlot}>
            <Ionicons
              name={icon}
              size={17}
              color={open ? T.primary : T.textDisabled}
            />
          </View>
        )}
        <View style={[s.fieldInner, icon && { paddingLeft: 4 }]}>
          <Text style={s.selectLabel}>{label}</Text>
          <Text style={[s.selectVal, !value && { color: T.textDisabled }]}>
            {value || "Select…"}
          </Text>
        </View>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={15}
          color={T.textDisabled}
          style={{ marginRight: 14 }}
        />
      </Pressable>

      {open && (
        <View style={s.dropdown}>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 200 }}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[s.ddItem, value === opt && s.ddItemActive]}
                onPress={() => {
                  onPick(opt);
                  setOpen(false);
                }}
              >
                <Text style={[s.ddItemTxt, value === opt && s.ddItemTxtActive]}>
                  {opt}
                </Text>
                {value === opt && (
                  <Ionicons
                    name="checkmark-circle"
                    size={15}
                    color={T.primary}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {error ? (
        <View style={s.fieldError}>
          <Ionicons name="alert-circle" size={12} color={T.error} />
          <Text style={s.fieldErrorTxt}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

/** Chip multi-select — matches MuiChip outlined style */
const ChipSelect = ({
  label,
  options,
  selected,
  onToggle,
  error,
  accent = T.primary,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  error?: string;
  accent?: string;
}) => (
  <View style={s.fieldWrap}>
    {label ? <Text style={s.chipGroupLabel}>{label}</Text> : null}
    <View style={s.chipRow}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            style={[
              s.chip,
              on
                ? { backgroundColor: accent, borderColor: accent }
                : { backgroundColor: T.paper, borderColor: T.border },
            ]}
          >
            {on && (
              <Ionicons
                name="checkmark"
                size={11}
                color="#fff"
                style={{ marginRight: 3 }}
              />
            )}
            <Text style={[s.chipTxt, on && { color: "#fff" }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
    {error ? (
      <View style={s.fieldError}>
        <Ionicons name="alert-circle" size={12} color={T.error} />
        <Text style={s.fieldErrorTxt}>{error}</Text>
      </View>
    ) : null}
  </View>
);

/** Gender segmented control */
const GenderPicker = ({
  value,
  onPick,
}: {
  value: Gender;
  onPick: (g: Gender) => void;
}) => {
  const opts: { g: Gender; label: string; icon: any }[] = [
    { g: "MALE", label: "Male", icon: "male-outline" },
    { g: "FEMALE", label: "Female", icon: "female-outline" },
    { g: "OTHER", label: "Other", icon: "person-outline" },
  ];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.chipGroupLabel}>Gender</Text>
      <View style={s.segRow}>
        {opts.map(({ g, label, icon }) => {
          const active = value === g;
          return (
            <Pressable
              key={g}
              onPress={() => onPick(g)}
              style={[s.segItem, active ? s.segItemActive : s.segItemInactive]}
            >
              <Ionicons
                name={icon}
                size={15}
                color={active ? "#fff" : T.textSecondary}
              />
              <Text style={[s.segTxt, active && { color: "#fff" }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

/** Mode card selector */
const ModePicker = ({
  value,
  onPick,
}: {
  value: TeachingMode;
  onPick: (m: TeachingMode) => void;
}) => {
  const opts: { m: TeachingMode; label: string; desc: string; icon: any }[] = [
    {
      m: "OFFLINE",
      label: "Offline",
      desc: "Home tuition",
      icon: "home-outline",
    },
    {
      m: "ONLINE",
      label: "Online",
      desc: "Video classes",
      icon: "videocam-outline",
    },
    {
      m: "HYBRID",
      label: "Hybrid",
      desc: "Both modes",
      icon: "git-merge-outline",
    },
  ];
  return (
    <View style={s.fieldWrap}>
      <Text style={s.chipGroupLabel}>Preferred Teaching Mode</Text>
      <View style={s.modeRow}>
        {opts.map(({ m, label, desc, icon }) => {
          const active = value === m;
          return (
            <Pressable
              key={m}
              onPress={() => onPick(m)}
              style={[s.modeCard, active && s.modeCardActive]}
            >
              <View style={[s.modeIconWrap, active && s.modeIconWrapActive]}>
                <Ionicons
                  name={icon}
                  size={19}
                  color={active ? T.primary : T.textDisabled}
                />
              </View>
              <Text style={[s.modeLabel, active && { color: T.primary }]}>
                {label}
              </Text>
              <Text style={s.modeDesc}>{desc}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// ─── Password strength ────────────────────────────────────────────────────────

function pwScore(pw: string): number {
  let s = 0;
  if (pw.length >= 6) s++;
  if (pw.length >= 10) s++;
  if (/[A-Z]/.test(pw) || /[0-9]/.test(pw)) s++;
  if (/[!@#$%^&*]/.test(pw)) s++;
  return Math.min(s, 4);
}
const pwColor = (sc: number) =>
  sc <= 1 ? T.error : sc === 2 ? T.warning : sc === 3 ? T.info : T.success;
const pwLabel = (sc: number) =>
  ["Very Weak", "Weak", "Fair", "Strong", "Very Strong"][sc] ?? "Weak";

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RegisterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess } = useModal();
  const [form, setForm] = useState<FormData>(INIT);
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ── Email OTP verification ─────────────────────────────────────────────────
  const [emailVerified, setEmailVerified] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [otpError, setOtpError] = useState("");

  const [cityOpts, setCityOpts] = useState<string[]>([]);
  const [areaOpts, setAreaOpts] = useState<string[]>([]);
  const [extraOpts, setExtraOpts] = useState<string[]>([]);
  const [boards, setBoards] = useState<Option[]>([]);
  const [grades, setGrades] = useState<Option[]>([]);
  const [subjectOpts, setSubjectOpts] = useState<Option[]>([]);
  const [currModalOpen, setCurrModalOpen] = useState(false);
  const [activeBoardId, setActiveBoardId] = useState<string>("");

  // Animation
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    loadRemote();
  }, []);
  useEffect(() => {
    if (form.city) loadAreas(form.city);
  }, [form.city]);

  useEffect(() => {
    // Slide + fade on step change
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 100,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: Platform.OS !== "web",
        }),
      ]),
    ]).start();
  }, [step]);

  const loadRemote = async () => {
    try {
      const [cities, extras, boardsRes, gradesRes, subsRes] =
        await Promise.allSettled([
          getOptions("CITY"),
          getOptions("EXTRACURRICULAR_ACTIVITY"),
          getOptions("BOARD"),
          getOptions("GRADE"),
          getOptions("SUBJECT"),
        ]);
      if (cities.status === "fulfilled")
        setCityOpts((cities.value?.data || []).map((o: Option) => o.label));
      if (extras.status === "fulfilled")
        setExtraOpts((extras.value?.data || []).map((o: Option) => o.label));
      if (boardsRes.status === "fulfilled") {
        const b = boardsRes.value?.data || [];
        setBoards(b);
        if (b.length > 0) setActiveBoardId(b[0]._id);
      }
      if (gradesRes.status === "fulfilled")
        setGrades(gradesRes.value?.data || []);
      if (subsRes.status === "fulfilled")
        setSubjectOpts(subsRes.value?.data || []);
    } catch {
      /* silent */
    }
  };

  const loadAreas = async (city: string) => {
    try {
      const type = `AREA_${city.toUpperCase().replace(/\s+/g, "_")}`;
      const res = await getOptions(type);
      setAreaOpts((res?.data || []).map((o: Option) => o.label));
    } catch {
      setAreaOpts([]);
    }
  };

  const set = <K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((e) => ({ ...e, [k]: undefined }));
  };

  const toggle = (
    k:
      | "subjects"
      | "extracurricularActivities"
      | "preferredAreas"
      | "languagesKnown"
      | "skills"
      | "daysAvailable"
      | "timeSlots",
    v: string,
  ) => {
    setForm((p) => {
      const arr = p[k] as string[];
      return {
        ...p,
        [k]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v],
      };
    });
  };

  const handleSendOtp = async () => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setErrors((e) => ({ ...e, email: "Enter a valid email address first" }));
      return;
    }
    setOtpSending(true);
    setOtpError("");
    try {
      await sendRegistrationOtp(form.email);
      setOtpValue("");
      setOtpModalOpen(true);
    } catch (err: any) {
      showError(err?.response?.data?.message || "Failed to send OTP");
    } finally {
      setOtpSending(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      setOtpError("Enter the 6-digit OTP");
      return;
    }
    setOtpVerifying(true);
    setOtpError("");
    try {
      await verifyRegistrationOtp(form.email, otpValue);
      setEmailVerified(true);
      setOtpModalOpen(false);
    } catch (err: any) {
      setOtpError(err?.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setOtpVerifying(false);
    }
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (step === 0) {
      if (!form.fullName.trim()) e.fullName = "Full name is required";
      if (!/^\d{10}$/.test(form.phoneNumber))
        e.phoneNumber = "Enter a valid 10-digit number";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
        e.email = "Enter a valid email address";
      else if (!emailVerified)
        e.email = "Please verify your email before proceeding";
    }
    if (step === 1) {
      if (!form.qualification.trim())
        e.qualification = "Qualification is required";
      if (!form.experience)
        e.experience = "Please select your experience level";
      if (form.subjects.length === 0)
        e.subjects = "Select at least one subject";
    }
    if (step === 2) {
      if (
        (form.preferredMode === "OFFLINE" || form.preferredMode === "HYBRID") &&
        !form.city
      )
        e.city = "Please select your city";
      if (
        (form.preferredMode === "OFFLINE" || form.preferredMode === "HYBRID") &&
        form.preferredAreas.length === 0
      )
        e.preferredAreas = "Select at least one preferred area";
    }
    if (step === 4) {
      if (form.password.length < 6) e.password = "Minimum 6 characters";
      if (form.password !== form.confirmPassword)
        e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
      return;
    }
    submit();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await registerTutor({ ...form } as any);
      const loginRes = await loginUser({
        email: form.email,
        password: form.password,
      });
      const token = loginRes.data.tokens.accessToken;
      await AsyncStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({ token, user: loginRes.data.user }),
      );
      setAuthToken(token);

      // Save availability preferences if tutor selected any
      if (form.daysAvailable.length > 0 || form.timeSlots.length > 0) {
        try {
          const profileRes = await getTutorProfile();
          const tutorId = (profileRes?.data as any)?._id || (profileRes?.data as any)?.id;
          if (tutorId) {
            await updateTutorAvailabilitySettings(tutorId, {
              daysAvailable: form.daysAvailable,
              timeSlots: form.timeSlots,
            });
          }
        } catch {
          // Non-blocking — availability can be set later from profile
        }
      }

      navigation.reset({ index: 0, routes: [{ name: "TutorDashboard" }] });
    } catch (err: any) {
      showError(
        "Registration Failed",
        err?.message || "Please check your details and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const sc = pwScore(form.password);

  // ─── Render ────────────────────────────────────────────────────────────────

  const progressPct =
    `${Math.round((step / (STEPS.length - 1)) * 100)}%` as `${number}%`;

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Everything lives inside ONE ScrollView — header + card — so the whole page scrolls */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
        enabled={Platform.OS === "ios"}
      >
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces
        >
          {/* ── Dark hero header ── */}
          <LinearGradient
            colors={[T.darkBg, T.darkBgMid, "#162032"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
          >
            <View style={[s.glowA, { pointerEvents: "none" } as any]} />
            <View style={[s.glowB, { pointerEvents: "none" } as any]} />

            <View style={s.brandRow}>
              <Image
                source={require("../../assets/logo.jpg")}
                style={s.brandMarkImage}
              />
              <Text style={s.brandName}>YourShikshak</Text>
              <View style={s.liveBadge}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>BECOME A TEACHER</Text>
              </View>
            </View>

            <Text style={s.heroTitle}>
              {"Shape the Future\nwith Your Shikshak"}
            </Text>
            <Text style={s.heroSub}>
              Join India's most trusted network of expert home tutors. Share
              your passion for teaching and earn rewards while making a
              difference.
            </Text>

            <View style={s.stepRow}>
              {STEPS.map((st, i) => {
                const done = step > i;
                const active = step === i;
                return (
                  <View key={st.id} style={s.stepCell}>
                    <View
                      style={[
                        s.stepBubble,
                        done && s.stepDone,
                        active && s.stepActive,
                      ]}
                    >
                      {done ? (
                        <Ionicons name="checkmark" size={10} color="#fff" />
                      ) : (
                        <Text style={[s.stepNum, active && { color: "#fff" }]}>
                          {i + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        s.stepLbl,
                        active && { color: "#fff" },
                        done && { color: T.success },
                      ]}
                    >
                      {st.label}
                    </Text>
                    {i < STEPS.length - 1 && (
                      <View style={[s.stepLine, done && s.stepLineDone]} />
                    )}
                  </View>
                );
              })}
            </View>

            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: progressPct }] as any} />
            </View>
            <Text style={s.progressLbl}>
              Step {step + 1} of {STEPS.length} — {STEPS[step].label}
            </Text>
          </LinearGradient>

          {/* ── Form card ── */}
          <Animated.View
            style={[
              s.card,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* ── Step 0: Personal Info ── */}
            {step === 0 && (
              <>
                <SectionHead
                  icon="person-outline"
                  title="Personal Information"
                />
                <FInput
                  label="Full Name"
                  value={form.fullName}
                  onChange={(v) => set("fullName", v)}
                  icon="person-outline"
                  error={errors.fullName}
                  placeholder="Your full name"
                />
                <GenderPicker
                  value={form.gender}
                  onPick={(g) => set("gender", g)}
                />
                <FInput
                  label="Phone Number"
                  value={form.phoneNumber}
                  onChange={(v) => set("phoneNumber", v.replace(/\D/g, ""))}
                  icon="call-outline"
                  error={errors.phoneNumber}
                  keyboardType="phone-pad"
                  maxLen={10}
                  placeholder="10-digit mobile"
                />
                <FInput
                  label="Alternate Phone"
                  value={form.alternatePhone}
                  onChange={(v) => set("alternatePhone", v.replace(/\D/g, ""))}
                  icon="call-outline"
                  placeholder="Optional secondary contact"
                  keyboardType="phone-pad"
                  maxLen={10}
                />
                <FInput
                  label="Email Address"
                  value={form.email}
                  onChange={(v) => { set("email", v); setEmailVerified(false); }}
                  icon="mail-outline"
                  error={errors.email}
                  keyboardType="email-address"
                  placeholder="you@example.com"
                />
                {/* Email OTP verification */}
                {!emailVerified ? (
                  <TouchableOpacity
                    style={s.verifyEmailBtn}
                    onPress={handleSendOtp}
                    disabled={otpSending}
                    activeOpacity={0.8}
                  >
                    {otpSending ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="shield-checkmark-outline" size={16} color="#fff" />
                        <Text style={s.verifyEmailBtnText}>Verify Email</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View style={s.emailVerifiedBadge}>
                    <Ionicons name="checkmark-circle" size={18} color="#22c55e" />
                    <Text style={s.emailVerifiedText}>Email Verified</Text>
                  </View>
                )}
                <FInput
                  label="Bio (Optional)"
                  value={form.bio}
                  onChange={(v) => set("bio", v)}
                  icon="document-text-outline"
                  multiline
                  lines={3}
                  placeholder="Your teaching philosophy…"
                />
              </>
            )}

            {/* ── Step 1: Education ── */}
            {step === 1 && (
              <>
                <SectionHead
                  icon="school-outline"
                  title="Education & Expertise"
                />
                <FInput
                  label="Highest Qualification"
                  value={form.qualification}
                  onChange={(v) => set("qualification", v)}
                  icon="ribbon-outline"
                  error={errors.qualification}
                  placeholder="e.g. M.Sc Mathematics, B.Tech"
                />
                <FSelect
                  label="Teaching Experience"
                  options={EXP_OPTS}
                  value={form.experience}
                  onPick={(v) => set("experience", v as Exp)}
                  icon="briefcase-outline"
                  error={errors.experience}
                />
                <View style={s.infoCard}>
                  <View style={s.infoCardHeader}>
                    <Ionicons
                      name="library-outline"
                      size={15}
                      color={T.primary}
                    />
                    <Text style={s.infoCardTitle}>
                      Select Subjects You Teach
                    </Text>
                  </View>
                  <Text style={s.infoCardDesc}>
                    Choose all subjects you are comfortable teaching
                  </Text>
                  {boards.length === 0 ? (
                    <ActivityIndicator
                      color={T.primary}
                      style={{ marginTop: 12 }}
                    />
                  ) : (
                    <>
                      {form.subjects.length > 0 && (
                        <View
                          style={{
                            flexDirection: "row",
                            flexWrap: "wrap",
                            gap: 6,
                            marginTop: 8,
                            marginBottom: 8,
                          }}
                        >
                          {form.subjects.map((id) => {
                            const sub = subjectOpts.find((s) => s._id === id);
                            return sub ? (
                              <View key={id} style={s.selectedSubChip}>
                                <Text style={s.selectedSubChipTxt}>
                                  {sub.label}
                                </Text>
                                <Pressable
                                  onPress={() => toggle("subjects", id)}
                                  hitSlop={6}
                                >
                                  <Ionicons
                                    name="close-circle"
                                    size={14}
                                    color={T.primary}
                                  />
                                </Pressable>
                              </View>
                            ) : null;
                          })}
                        </View>
                      )}
                      <Pressable
                        onPress={() => setCurrModalOpen(true)}
                        style={[s.currPickerBtn, { justifyContent: "space-between" }]}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <Ionicons
                            name={form.subjects.length > 0 ? "create-outline" : "add-circle-outline"}
                            size={16}
                            color={T.primary}
                          />
                          <Text style={s.currPickerBtnTxt}>
                            {form.subjects.length > 0
                              ? `Modify Selection (${form.subjects.length})`
                              : "Choose Subjects"}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={14} color={T.primary} />
                      </Pressable>
                      {errors.subjects && (
                        <Text
                          style={{ color: T.error, fontSize: 12, marginTop: 4 }}
                        >
                          {errors.subjects}
                        </Text>
                      )}
                    </>
                  )}
                </View>
                {extraOpts.length > 0 && (
                  <ChipSelect
                    label="Extracurricular Activities (Optional)"
                    options={extraOpts}
                    selected={form.extracurricularActivities}
                    onToggle={(v) => toggle("extracurricularActivities", v)}
                  />
                )}
                <ChipSelect
                  label="Languages Known"
                  options={LANG_OPTS}
                  selected={form.languagesKnown}
                  onToggle={(v) => toggle("languagesKnown", v)}
                />
                <ChipSelect
                  label="Core Skills (Optional)"
                  options={SKILL_OPTS}
                  selected={form.skills}
                  onToggle={(v) => toggle("skills", v)}
                  accent={T.success}
                />
              </>
            )}

            {/* ── Step 2: Location ── */}
            {step === 2 && (
              <>
                <SectionHead icon="location-outline" title="Location Details" />
                <ModePicker
                  value={form.preferredMode}
                  onPick={(m) => {
                    set("preferredMode", m);
                    if (m === "ONLINE") {
                      set("city", "");
                      set("preferredAreas", []);
                    }
                  }}
                />
                {(form.preferredMode === "OFFLINE" ||
                  form.preferredMode === "HYBRID") && (
                  <>
                    <FSelect
                      label="Current City"
                      options={
                        cityOpts.length > 0
                          ? cityOpts
                          : [
                              "Mumbai",
                              "Delhi",
                              "Bangalore",
                              "Pune",
                              "Hyderabad",
                              "Chennai",
                            ]
                      }
                      value={form.city}
                      onPick={(v) => {
                        set("city", v);
                        set("preferredAreas", []);
                      }}
                      icon="location-outline"
                      error={errors.city}
                    />
                    {form.city && (
                      <ChipSelect
                        label="Preferred Areas"
                        options={
                          areaOpts.length > 0
                            ? areaOpts
                            : [
                                `${form.city} North`,
                                `${form.city} South`,
                                `${form.city} East`,
                                `${form.city} West`,
                                `${form.city} Central`,
                              ]
                        }
                        selected={form.preferredAreas}
                        onToggle={(v) => toggle("preferredAreas", v)}
                        error={errors.preferredAreas}
                      />
                    )}
                  </>
                )}
                <FInput
                  label="Permanent Address"
                  value={form.permanentAddress}
                  onChange={(v) => set("permanentAddress", v)}
                  icon="home-outline"
                  multiline
                  lines={2}
                  placeholder="Your permanent address"
                />
                <FInput
                  label="Residential Address (if diff.)"
                  value={form.residentialAddress}
                  onChange={(v) => set("residentialAddress", v)}
                  icon="location-outline"
                  multiline
                  lines={2}
                  placeholder="Current residential address (optional)"
                />
              </>
            )}

            {/* ── Step 3: Availability ── */}
            {step === 3 && (
              <>
                <SectionHead icon="calendar-outline" title="Availability" />
                <Text style={s.availHint}>
                  Help students find you at the right time. Select the days and time slots you're generally available to teach.
                </Text>
                <ChipSelect
                  label="Available Days"
                  options={DAY_OPTS}
                  selected={form.daysAvailable}
                  onToggle={(v) => toggle("daysAvailable", v)}
                />
                <ChipSelect
                  label="Preferred Time Slots"
                  options={TIME_SLOT_OPTS}
                  selected={form.timeSlots}
                  onToggle={(v) => toggle("timeSlots", v)}
                />
              </>
            )}

            {/* ── Step 4: Security ── */}
            {step === 4 && (
              <>
                <View style={s.secCard}>
                  <LinearGradient
                    colors={["#EFF6FF", "#DBEAFE"]}
                    style={s.secCardGrad}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <View style={s.secIconWrap}>
                      <Ionicons
                        name="shield-checkmark"
                        size={28}
                        color={T.primary}
                      />
                    </View>
                    <Text style={s.secTitle}>Secure Your Account</Text>
                    <Text style={s.secDesc}>
                      Protected with enterprise-grade encryption. Choose a
                      strong password.
                    </Text>
                  </LinearGradient>
                </View>
                <SectionHead icon="lock-closed-outline" title="Set Password" />
                <FInput
                  label="Choose Password"
                  value={form.password}
                  onChange={(v) => set("password", v)}
                  icon="lock-closed-outline"
                  secure
                  error={errors.password}
                  placeholder="Min. 6 characters"
                />
                <FInput
                  label="Confirm Password"
                  value={form.confirmPassword}
                  onChange={(v) => set("confirmPassword", v)}
                  icon="shield-outline"
                  secure
                  error={errors.confirmPassword}
                  placeholder="Re-enter password"
                />
                {form.password.length > 0 && (
                  <View style={s.strengthWrap}>
                    <View style={s.strengthBar}>
                      {[0, 1, 2, 3].map((i) => (
                        <View
                          key={i}
                          style={[
                            s.strengthSeg,
                            {
                              backgroundColor: i < sc ? pwColor(sc) : T.border,
                            },
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={[s.strengthLbl, { color: pwColor(sc) }]}>
                      {pwLabel(sc)}
                    </Text>
                  </View>
                )}
                <View style={s.termsRow}>
                  <Ionicons
                    name="information-circle-outline"
                    size={14}
                    color={T.mutedFg}
                  />
                  <Text style={s.termsTxt}>
                    By registering you agree to YourShikshak's{" "}
                    <Text style={{ color: T.primary, fontWeight: "600" }}>
                      Terms of Service
                    </Text>{" "}
                    and{" "}
                    <Text style={{ color: T.primary, fontWeight: "600" }}>
                      Privacy Policy
                    </Text>
                    .
                  </Text>
                </View>
              </>
            )}

            {/* ── Nav buttons ── */}
            <View style={s.navRow}>
              {step > 0 && (
                <Pressable
                  style={({ pressed }) => [
                    s.backBtn,
                    pressed && { opacity: 0.7 },
                  ]}
                  onPress={() => setStep((p) => p - 1)}
                  disabled={submitting}
                >
                  <Ionicons name="arrow-back" size={16} color={T.textPrimary} />
                  <Text style={s.backBtnTxt}>Back</Text>
                </Pressable>
              )}
              <Pressable
                style={({ pressed }) => [
                  s.nextBtn,
                  step === 0 && s.nextBtnFull,
                  submitting && { opacity: 0.6 },
                  pressed && { opacity: 0.85 },
                ]}
                onPress={next}
                disabled={submitting}
              >
                <LinearGradient
                  colors={[T.primary, T.primaryLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.nextBtnGrad}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={s.nextBtnTxt}>
                        {step === STEPS.length - 1
                          ? "Complete Registration"
                          : "Continue"}
                      </Text>
                      {step < STEPS.length - 1 && (
                        <Ionicons
                          name="arrow-forward"
                          size={16}
                          color="#fff"
                          style={{ marginLeft: 6 }}
                        />
                      )}
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={s.signinRow}>
              <Text style={s.signinTxt}>Already have an account? </Text>
              <Pressable
                hitSlop={8}
                onPress={() => navigation.navigate("Login")}
              >
                <Text style={s.signinLink}>Sign In</Text>
              </Pressable>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── Email OTP Modal ──────────────────────────────────────────────────── */}
      <Modal
        visible={otpModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setOtpModalOpen(false)}
      >
        <Pressable style={cp.backdrop} onPress={() => setOtpModalOpen(false)}>
          <Pressable style={[cp.sheet, { height: "auto", paddingBottom: 40 }]} onPress={() => {}}>
            <View style={cp.handle} />
            <View style={cp.header}>
              <Text style={cp.headerTitle}>Verify Your Email</Text>
              <TouchableOpacity onPress={() => setOtpModalOpen(false)}>
                <Ionicons name="close" size={22} color={T.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={s.otpSubtitle}>
              We sent a 6-digit code to{"\n"}
              <Text style={{ color: T.primary, fontWeight: "600" }}>{form.email}</Text>
            </Text>
            <TextInput
              style={s.otpInput}
              value={otpValue}
              onChangeText={(t) => { setOtpValue(t.replace(/\D/g, "").slice(0, 6)); setOtpError(""); }}
              keyboardType="number-pad"
              placeholder="• • • • • •"
              placeholderTextColor={T.textSecondary}
              maxLength={6}
            />
            {otpError ? <Text style={s.otpError}>{otpError}</Text> : null}
            <TouchableOpacity
              style={[s.verifyEmailBtn, { marginHorizontal: 20, marginTop: 12 }]}
              onPress={handleVerifyOtp}
              disabled={otpVerifying}
              activeOpacity={0.8}
            >
              {otpVerifying ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.verifyEmailBtnText}>Confirm OTP</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={s.resendOtpBtn} onPress={handleSendOtp} disabled={otpSending}>
              <Text style={s.resendOtpText}>
                {otpSending ? "Sending…" : "Resend OTP"}
              </Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Curriculum Picker Modal ─────────────────────────────────────────── */}
      <Modal
        visible={currModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCurrModalOpen(false)}
      >
        <Pressable style={cp.backdrop} onPress={() => setCurrModalOpen(false)}>
          <Pressable style={cp.sheet} onPress={() => {}}>
            {/* Handle */}
            <View style={cp.handle} />

            {/* Header */}
            <View style={cp.header}>
              <View>
                <Text style={cp.headerTitle}>Select Subjects</Text>
                <Text style={cp.headerSub}>
                  {form.subjects.length > 0
                    ? `${form.subjects.length} subject${form.subjects.length > 1 ? "s" : ""} selected`
                    : "Tap to select subjects you teach"}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setErrors((e) => ({ ...e, subjects: undefined }));
                  setCurrModalOpen(false);
                }}
                style={cp.doneBtn}
              >
                <Text style={cp.doneBtnTxt}>Done</Text>
              </Pressable>
            </View>

            {/* Board tabs */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={cp.boardBar}
              contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: "center" }}
            >
              {boards.map((board) => (
                <Pressable
                  key={board._id}
                  onPress={() => setActiveBoardId(board._id)}
                  style={[cp.boardTab, activeBoardId === board._id && cp.boardTabActive]}
                >
                  <Text style={[cp.boardTabTxt, activeBoardId === board._id && cp.boardTabTxtActive]}>
                    {board.label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            {/* Grades + subjects */}
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
              {grades
                .filter((g) => {
                  const pid = typeof g.parent === "object" ? (g.parent as any)?._id : g.parent;
                  return pid === activeBoardId;
                })
                .map((grade) => {
                  const gradeSubs = subjectOpts.filter((s) => {
                    const pid = typeof s.parent === "object" ? (s.parent as any)?._id : s.parent;
                    return pid === grade._id;
                  });
                  if (gradeSubs.length === 0) return null;
                  const allSelected  = gradeSubs.every((s) => form.subjects.includes(s._id));
                  const someSelected = gradeSubs.some((s) => form.subjects.includes(s._id));
                  const selectedCount = gradeSubs.filter((s) => form.subjects.includes(s._id)).length;
                  return (
                    <View key={grade._id} style={cp.gradeSection}>
                      <Pressable
                        onPress={() => {
                          const ids = gradeSubs.map((s) => s._id);
                          setForm((p) => ({
                            ...p,
                            subjects: allSelected
                              ? p.subjects.filter((id) => !ids.includes(id))
                              : Array.from(new Set([...p.subjects, ...ids])),
                          }));
                        }}
                        style={cp.gradeHeader}
                      >
                        <View style={[cp.gradeCheck, (allSelected || someSelected) && cp.gradeCheckActive]}>
                          {allSelected && <Ionicons name="checkmark" size={11} color="#fff" />}
                          {!allSelected && someSelected && (
                            <View style={{ width: 8, height: 2, backgroundColor: "#fff", borderRadius: 1 }} />
                          )}
                        </View>
                        <Text style={cp.gradeLabel}>{grade.label}</Text>
                        <View style={[cp.gradeCountBadge, selectedCount > 0 && cp.gradeCountBadgeActive]}>
                          <Text style={[cp.gradeCount, selectedCount > 0 && cp.gradeCountActive]}>
                            {selectedCount}/{gradeSubs.length}
                          </Text>
                        </View>
                      </Pressable>
                      <View style={cp.chipRow}>
                        {gradeSubs.map((sub) => {
                          const selected = form.subjects.includes(sub._id);
                          return (
                            <Pressable
                              key={sub._id}
                              onPress={() => toggle("subjects", sub._id)}
                              style={[cp.subChip, selected && cp.subChipSelected]}
                            >
                              {selected && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 2 }} />}
                              <Text style={[cp.subChipTxt, selected && cp.subChipTxtSelected]}>
                                {sub.label}
                              </Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>
                  );
                })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const HEADER_H = Platform.OS === "ios" ? 360 : 340;

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  // ── Header (inside ScrollView — no fixed height needed) ─────────────────────
  header: {
    minHeight: HEADER_H,
    paddingHorizontal: 24,
    paddingBottom: 28,
    overflow: "hidden",
  },
  glowA: {
    position: "absolute",
    top: "-60%",
    right: "-10%",
    width: width * 0.8,
    height: HEADER_H * 2.4,
    borderRadius: 999,
    backgroundColor: "rgba(99,102,241,0.14)",
    // No blur on native — replicate via opacity only
  },
  glowB: {
    position: "absolute",
    bottom: "-40%",
    left: "-15%",
    width: width * 0.5,
    height: HEADER_H * 1.8,
    borderRadius: 999,
    backgroundColor: "rgba(16,185,129,0.08)",
  },

  brandRow: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  brandMarkImage: {
    width: 32,
    height: 32,
    borderRadius: 8,
    marginRight: 9,
  },
  brandName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
    letterSpacing: -0.3,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveTxt: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  heroTitle: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "400",
    letterSpacing: -0.8,
    lineHeight: 36,
    marginBottom: 6,
  },
  heroSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 20,
  },

  // Step indicator
  stepRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 14 },
  stepCell: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    position: "relative",
  },
  stepBubble: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  stepActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  stepDone: { backgroundColor: T.success },
  stepNum: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontWeight: "700" },
  stepLbl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  stepLine: {
    position: "absolute",
    top: 13,
    left: "58%",
    right: "-40%",
    height: 1.5,
    backgroundColor: "rgba(255,255,255,0.12)",
  },
  stepLineDone: { backgroundColor: T.success },

  // Progress bar — matches MuiLinearProgress (h:6, r:8, bg:#E2E8F0)
  progressTrack: {
    height: 5,
    borderRadius: 99,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
    marginBottom: 6,
  },
  progressFill: { height: 5, borderRadius: 99, backgroundColor: T.primary },
  progressLbl: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "500",
  },

  // ── Scroll / card ────────────────────────────────────────────────────────────
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 0, paddingBottom: 80 },

  // glass-card pattern from global.css — sits below header, rounded top corners only
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
    marginTop: -24, // overlap with header bottom edge
    paddingTop: 28,
  },

  // Section header — thin left accent bar + icon pill + text
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 18,
    marginTop: 4,
  },
  availHint: {
    fontSize: 13,
    color: T.textSecondary,
    marginBottom: 16,
    lineHeight: 19,
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

  // ── Field styles — mirror MuiTextField + MuiOutlinedInput ───────────────────
  fieldWrap: { marginBottom: 14 },
  fieldBox: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderRadius: T.radiusMd, // 10px
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
  },
  fieldDisabled: { backgroundColor: T.muted, opacity: 0.7 },
  fieldIconSlot: { paddingLeft: 14, paddingRight: 2 },
  fieldInner: { flex: 1, paddingHorizontal: 14, paddingTop: 0 },
  floatLabel: {
    position: "absolute",
    left: 0,
    fontWeight: "500",
    letterSpacing: 0,
  },
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

  // Select
  selectLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: T.mutedFg,
    marginTop: 8,
  },
  selectVal: {
    fontSize: 15,
    color: T.textPrimary,
    fontWeight: "400",
    paddingBottom: 8,
  },
  dropdown: {
    marginTop: 4,
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  ddItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.muted,
  },
  ddItemActive: { backgroundColor: "#EFF6FF" },
  ddItemTxt: { fontSize: 14, color: T.textSecondary },
  ddItemTxtActive: { color: T.primary, fontWeight: "600" },

  // Chips — MuiChip outlined (r:8, borderWidth:1.2)
  chipGroupLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: T.mutedFg,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 0 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radiusSm, // 8px — MuiChip
    borderWidth: 1.2,
    marginRight: 7,
    marginBottom: 7,
  },
  chipTxt: { fontSize: 12, fontWeight: "500", color: T.textSecondary },

  // Gender segmented
  segRow: { flexDirection: "row", gap: 8 },
  segItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: T.radiusMd,
    borderWidth: 1.2,
  },
  segItemActive: { backgroundColor: T.primary, borderColor: T.primary },
  segItemInactive: { backgroundColor: T.paper, borderColor: T.border },
  segTxt: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  // Mode cards
  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: T.radiusLg, // 12px
    borderWidth: 1.2,
    borderColor: T.border,
    backgroundColor: T.paper,
  },
  modeCardActive: {
    borderColor: T.primary,
    backgroundColor: "#EFF6FF",
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  modeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  modeIconWrapActive: { backgroundColor: "#DBEAFE" },
  modeLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textSecondary,
    marginBottom: 2,
  },
  modeDesc: { fontSize: 11, color: T.textDisabled, textAlign: "center" },

  // Info card (subjects) — matches MuiAlert standardInfo style
  infoCard: {
    backgroundColor: "#EFF6FF",
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: "#BFDBFE",
    padding: 14,
    marginBottom: 14,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  infoCardTitle: { fontSize: 13, fontWeight: "700", color: T.primary },
  infoCardDesc: { fontSize: 11, color: "#1E40AF", marginBottom: 10 },
  emptyTxt: {
    fontSize: 13,
    color: T.textDisabled,
    fontStyle: "italic",
    paddingVertical: 8,
  },

  // Security card
  secCard: { borderRadius: T.radiusXl, overflow: "hidden", marginBottom: 20 },
  secCardGrad: { padding: 20, alignItems: "center" },
  secIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(45,104,196,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 4,
  },
  secDesc: {
    fontSize: 12,
    color: T.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },

  // Strength bar — matches MuiLinearProgress
  strengthWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  strengthBar: { flex: 1, flexDirection: "row", gap: 4, height: 6 },
  strengthSeg: { flex: 1, height: 6, borderRadius: 99 },
  strengthLbl: {
    fontSize: 11,
    fontWeight: "700",
    minWidth: 65,
    textAlign: "right",
  },

  // Terms
  termsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: T.muted,
    borderRadius: T.radiusSm,
    padding: 10,
    marginTop: 4,
  },
  termsTxt: { flex: 1, fontSize: 11, color: T.mutedFg, lineHeight: 17 },

  // Nav buttons — MuiButton sizing + gradient CTA
  navRow: { flexDirection: "row", gap: 10, marginTop: 24 },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: T.radiusMd, // 10px
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.paper,
  },
  backBtnTxt: { fontSize: 15, fontWeight: "600", color: T.textPrimary },

  nextBtn: { flex: 1, borderRadius: T.radiusMd, overflow: "hidden" },
  nextBtnFull: { flex: 1 },
  nextBtnGrad: {
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
  nextBtnTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.2,
  },

  // Sign in
  signinRow: { flexDirection: "row", justifyContent: "center", marginTop: 18 },
  signinTxt: { fontSize: 13, color: T.mutedFg },
  signinLink: { fontSize: 13, color: T.primary, fontWeight: "700" },

  // Subject picker trigger
  selectedSubChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${T.primary}15`,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${T.primary}40`,
  },
  selectedSubChipTxt: { fontSize: 12, color: T.primary, fontWeight: "600" },
  currPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: `${T.primary}10`,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: `${T.primary}30`,
    marginTop: 8,
  },
  currPickerBtnTxt: { fontSize: 13, color: T.primary, fontWeight: "600" },
  // Email OTP
  verifyEmailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.primary,
    borderRadius: 10,
    paddingVertical: 11,
    marginTop: 4,
    marginBottom: 4,
  },
  verifyEmailBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  emailVerifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#14532d22",
    borderRadius: 8,
    marginTop: 4,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#22c55e44",
    alignSelf: "flex-start",
  },
  emailVerifiedText: { color: "#22c55e", fontWeight: "600", fontSize: 13 },
  otpSubtitle: { color: T.textSecondary, fontSize: 14, textAlign: "center", marginVertical: 16, lineHeight: 22 },
  otpInput: {
    marginHorizontal: 20,
    borderWidth: 1.5,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 24,
    letterSpacing: 10,
    textAlign: "center",
    color: T.textPrimary,
    backgroundColor: T.background,
  },
  otpError: { color: "#ef4444", fontSize: 12, textAlign: "center", marginTop: 6 },
  resendOtpBtn: { alignSelf: "center", marginTop: 14 },
  resendOtpText: { color: T.primary, fontSize: 13, fontWeight: "600" },
});

// ─── Curriculum Picker Styles ─────────────────────────────────────────────────

const cp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    height: "60%",
    backgroundColor: T.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: "hidden",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  headerSub: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  doneBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
  },
  doneBtnTxt: { fontSize: 13, fontWeight: "700", color: "#fff" },
  boardBar: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  boardTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
  },
  boardTabActive: { backgroundColor: T.primary, borderColor: T.primary },
  boardTabTxt: { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  boardTabTxtActive: { color: "#fff" },
  gradeSection: { marginBottom: 16 },
  gradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  gradeCheck: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeCheckActive: { backgroundColor: T.primary, borderColor: T.primary },
  gradeLabel: { flex: 1, fontSize: 13, fontWeight: "700", color: T.textPrimary },
  gradeCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
  },
  gradeCountBadgeActive: { backgroundColor: `${T.primary}20`, borderColor: `${T.primary}50` },
  gradeCount: { fontSize: 11, color: T.textSecondary, fontWeight: "600" },
  gradeCountActive: { color: T.primary },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingTop: 8, paddingLeft: 30 },
  subChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.paper,
  },
  subChipSelected: { backgroundColor: T.primary, borderColor: T.primary },
  subChipTxt: { fontSize: 12, color: T.textSecondary, fontWeight: "500" },
  subChipTxtSelected: { color: "#fff", fontWeight: "600" },
});

export default RegisterScreen;
