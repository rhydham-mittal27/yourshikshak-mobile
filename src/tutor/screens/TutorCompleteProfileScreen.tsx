/**
 * TutorCompleteProfileScreen.tsx â€” YourShikshak
 * Step 3 for tutors: 2-step profile completion.
 * Step 0: Education & Expertise
 * Step 1: Location & Availability
 * Basic info (name, email, phone, city, password) comes from route.params.
 */

import React, { useState, useEffect, useRef } from "react";
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
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  registerTutor,
  loginUser,
  setAuthToken,
  AUTH_STORAGE_KEY,
  getOptions,
  getTutorProfile,
  updateTutorAvailabilitySettings,
  Option,
} from "../../api/client";
import { registerForPushNotifications } from "../../services/pushNotifications";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { useModal } from "../../context/ModalContext";
import { T } from "../../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "TutorCompleteProfile">;
type Route = RouteProp<RootStackParamList, "TutorCompleteProfile">;

interface Props {
  navigation: Nav;
  route: Route;
}

type Gender = "MALE" | "FEMALE" | "OTHER";
type TeachingMode = "OFFLINE" | "ONLINE" | "HYBRID";
type Exp = "Fresher" | "1-2 Years" | "3-5 Years" | "5-10 Years" | "10+ Years";

interface ProfileForm {
  gender: Gender;
  bio: string;
  qualification: string;
  experience: Exp | "";
  subjects: string[];
  extracurricularActivities: string[];
  languagesKnown: string[];
  skills: string[];
  preferredMode: TeachingMode;
  city: string;
  preferredAreas: string[];
  permanentAddress: string;
  residentialAddress: string;
  daysAvailable: string[];
  timeSlots: string[];
}

const INIT_FORM: ProfileForm = {
  gender: "MALE",
  bio: "",
  qualification: "",
  experience: "",
  subjects: [],
  extracurricularActivities: [],
  languagesKnown: [],
  skills: [],
  preferredMode: "OFFLINE",
  city: "",
  preferredAreas: [],
  permanentAddress: "",
  residentialAddress: "",
  daysAvailable: [],
  timeSlots: [],
};

const STEPS = [
  { id: 0, label: "Education", icon: "school-outline" as const },
  { id: 1, label: "Location", icon: "location-outline" as const },
];

const EXP_OPTS: Exp[] = ["Fresher", "1-2 Years", "3-5 Years", "5-10 Years", "10+ Years"];
const DAY_OPTS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const TIME_SLOT_OPTS = [
  "6:00 AM - 8:00 AM", "8:00 AM - 10:00 AM", "10:00 AM - 12:00 PM",
  "12:00 PM - 2:00 PM", "2:00 PM - 4:00 PM", "4:00 PM - 6:00 PM",
  "6:00 PM - 8:00 PM", "8:00 PM - 10:00 PM",
];
const LANG_OPTS = ["English", "Hindi", "Marathi", "Bengali", "Tamil", "Telugu", "Kannada", "Gujarati", "Punjabi", "Malayalam"];
const SKILL_OPTS = ["Teaching", "Communication", "Online Tutoring", "Lesson Planning", "Subject Expertise", "Mentoring"];

// â”€â”€â”€ Shared UI primitives â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionHead = ({ icon, title, accent = T.primary }: { icon: any; title: string; accent?: string }) => (
  <View style={[u.sectionHead, { borderLeftColor: accent }]}>
    <View style={[u.sectionIconBg, { backgroundColor: `${accent}15` }]}>
      <Ionicons name={icon} size={16} color={accent} />
    </View>
    <Text style={u.sectionHeadText}>{title}</Text>
  </View>
);

const FInput = ({
  label, value, onChange, placeholder, error, icon, multiline, lines, editable = true,
}: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  error?: string; icon?: any; multiline?: boolean; lines?: number; editable?: boolean;
}) => {
  const [focused, setFocused] = useState(false);
  const floatAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(floatAnim, { toValue: focused || value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [focused, value]);
  const labelTop = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [17, 5] });
  const labelSize = floatAnim.interpolate({ inputRange: [0, 1], outputRange: [15, 11] });
  return (
    <View style={u.fieldWrap}>
      <View style={[u.fieldBox, { borderColor: error ? T.error : focused ? T.primary : T.border, borderWidth: focused ? 1.5 : 1 }, !editable && u.fieldDisabled]}>
        {icon && <View style={u.fieldIconSlot}><Ionicons name={icon} size={17} color={focused ? T.primary : T.textDisabled} /></View>}
        <View style={[u.fieldInner, icon && { paddingLeft: 4 }]}>
          <Animated.Text style={[u.floatLabel, { top: labelTop, fontSize: labelSize, color: focused ? T.primary : T.mutedFg }]}>{label}</Animated.Text>
          <TextInput
            style={[u.fieldInput, multiline && { height: (lines ?? 3) * 22 + 20, textAlignVertical: "top", paddingTop: 26 }]}
            value={value} onChangeText={onChange}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            placeholder={focused ? placeholder : ""} placeholderTextColor={T.textDisabled}
            multiline={multiline} editable={editable} autoCapitalize="none" autoCorrect={false}
          />
        </View>
      </View>
      {error ? <View style={u.fieldError}><Ionicons name="alert-circle" size={12} color={T.error} /><Text style={u.fieldErrorTxt}>{error}</Text></View> : null}
    </View>
  );
};

const FSelect = ({ label, options, value, onPick, icon, error }: {
  label: string; options: string[]; value: string; onPick: (v: string) => void; icon?: any; error?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={u.fieldWrap}>
      <Pressable style={[u.fieldBox, { borderColor: open ? T.primary : error ? T.error : T.border, borderWidth: open ? 1.5 : 1 }]} onPress={() => setOpen(o => !o)}>
        {icon && <View style={u.fieldIconSlot}><Ionicons name={icon} size={17} color={open ? T.primary : T.textDisabled} /></View>}
        <View style={[u.fieldInner, icon && { paddingLeft: 4 }]}>
          <Text style={u.selectLabel}>{label}</Text>
          <Text style={[u.selectVal, !value && { color: T.textDisabled }]}>{value || "Selectâ€¦"}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={15} color={T.textDisabled} style={{ marginRight: 14 }} />
      </Pressable>
      {open && (
        <View style={u.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
            {options.map(opt => (
              <Pressable key={opt} style={[u.ddItem, value === opt && u.ddItemActive]} onPress={() => { onPick(opt); setOpen(false); }}>
                <Text style={[u.ddItemTxt, value === opt && u.ddItemTxtActive]}>{opt}</Text>
                {value === opt && <Ionicons name="checkmark-circle" size={15} color={T.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
      {error ? <View style={u.fieldError}><Ionicons name="alert-circle" size={12} color={T.error} /><Text style={u.fieldErrorTxt}>{error}</Text></View> : null}
    </View>
  );
};

const ChipSelect = ({ label, options, selected, onToggle, error, accent = T.primary }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; error?: string; accent?: string;
}) => (
  <View style={u.fieldWrap}>
    {label ? <Text style={u.chipGroupLabel}>{label}</Text> : null}
    <View style={u.chipRow}>
      {options.map(opt => {
        const on = selected.includes(opt);
        return (
          <Pressable key={opt} onPress={() => onToggle(opt)} style={[u.chip, on ? { backgroundColor: accent, borderColor: accent } : { backgroundColor: T.paper, borderColor: T.border }]}>
            {on && <Ionicons name="checkmark" size={11} color="#fff" style={{ marginRight: 3 }} />}
            <Text style={[u.chipTxt, on && { color: "#fff" }]}>{opt}</Text>
          </Pressable>
        );
      })}
    </View>
    {error ? <View style={u.fieldError}><Ionicons name="alert-circle" size={12} color={T.error} /><Text style={u.fieldErrorTxt}>{error}</Text></View> : null}
  </View>
);

const SearchableMultiSelect = ({ label, options, selected, onToggle, accent = T.primary, placeholder = "Searchâ€¦", hint }: {
  label: string; options: string[]; selected: string[]; onToggle: (v: string) => void; accent?: string; placeholder?: string; hint?: string;
}) => {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const filtered = query.trim() ? options.filter(o => o.toLowerCase().includes(query.toLowerCase())) : options;
  return (
    <View style={u.fieldWrap}>
      <Text style={u.chipGroupLabel}>{label}</Text>
      {selected.length > 0 && (
        <View style={u.smsTagRow}>
          {selected.map(v => (
            <Pressable key={v} style={[u.smsTag, { borderColor: accent, backgroundColor: `${accent}12` }]} onPress={() => onToggle(v)}>
              <Text style={[u.smsTagTxt, { color: accent }]}>{v}</Text>
              <Ionicons name="close" size={11} color={accent} style={{ marginLeft: 3 }} />
            </Pressable>
          ))}
        </View>
      )}
      <Pressable style={[u.smsInputWrap, open && { borderColor: accent }]} onPress={() => setOpen(true)}>
        <Ionicons name="search-outline" size={15} color={open ? accent : T.mutedFg} style={{ marginRight: 8 }} />
        <TextInput
          style={u.smsInput}
          value={query}
          onChangeText={t => { setQuery(t); setOpen(true); }}
          placeholder={placeholder}
          placeholderTextColor={T.textDisabled}
          onFocus={() => setOpen(true)}
        />
        {query.length > 0 && <Pressable onPress={() => setQuery("")} hitSlop={8}><Ionicons name="close-circle" size={15} color={T.mutedFg} /></Pressable>}
      </Pressable>
      {open && filtered.length > 0 && (
        <ScrollView style={u.smsDropdown} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
          {filtered.map(opt => {
            const on = selected.includes(opt);
            return (
              <Pressable key={opt} style={({ pressed }) => [u.smsOption, pressed && { backgroundColor: `${accent}08` }]} onPress={() => { onToggle(opt); setQuery(""); }}>
                <Text style={[u.smsOptionTxt, on && { color: accent, fontWeight: "700" }]}>{opt}</Text>
                {on && <Ionicons name="checkmark-circle" size={15} color={accent} />}
              </Pressable>
            );
          })}
        </ScrollView>
      )}
      {open && <Pressable style={u.smsDismiss} onPress={() => { setOpen(false); setQuery(""); }} />}
      {hint && <Text style={u.smsHint}>{hint}</Text>}
    </View>
  );
};

const GenderPicker = ({ value, onPick }: { value: Gender; onPick: (g: Gender) => void }) => {
  const opts: { g: Gender; label: string; icon: any }[] = [
    { g: "MALE", label: "Male", icon: "male-outline" },
    { g: "FEMALE", label: "Female", icon: "female-outline" },
    { g: "OTHER", label: "Other", icon: "person-outline" },
  ];
  return (
    <View style={u.fieldWrap}>
      <Text style={u.chipGroupLabel}>Gender</Text>
      <View style={u.segRow}>
        {opts.map(({ g, label, icon }) => {
          const active = value === g;
          return (
            <Pressable key={g} onPress={() => onPick(g)} style={[u.segItem, active ? u.segItemActive : u.segItemInactive]}>
              <Ionicons name={icon} size={15} color={active ? "#fff" : T.textSecondary} />
              <Text style={[u.segTxt, active && { color: "#fff" }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const ModePicker = ({ value, onPick }: { value: TeachingMode; onPick: (m: TeachingMode) => void }) => {
  const opts: { m: TeachingMode; label: string; icon: any }[] = [
    { m: "OFFLINE", label: "Offline", icon: "home-outline" },
    { m: "ONLINE", label: "Online", icon: "videocam-outline" },
    { m: "HYBRID", label: "Hybrid", icon: "git-merge-outline" },
  ];
  return (
    <View style={u.fieldWrap}>
      <Text style={u.chipGroupLabel}>Preferred Teaching Mode</Text>
      <View style={u.modeRow}>
        {opts.map(({ m, label, icon }) => {
          const active = value === m;
          return (
            <Pressable key={m} onPress={() => onPick(m)} style={[u.modeCard, active && u.modeCardActive]}>
              <Ionicons name={icon} size={15} color={active ? T.primary : T.textDisabled} style={{ marginRight: 5 }} />
              <Text style={[u.modeLabel, active && { color: T.primary }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

// â”€â”€â”€ Main screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TutorCompleteProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const { showError } = useModal();
  const { name, email, phone, city: initialCity, password } = route.params;

  const [form, setForm] = useState<ProfileForm>({ ...INIT_FORM, city: initialCity });
  const [errors, setErrors] = useState<Partial<Record<string, string>>>({});
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [cityOpts, setCityOpts] = useState<string[]>([]);
  const [areaOpts, setAreaOpts] = useState<string[]>([]);
  const [extraOpts, setExtraOpts] = useState<string[]>([]);
  const [subjectOpts, setSubjectOpts] = useState<Option[]>([]);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => { loadRemote(); }, []);
  useEffect(() => { if (form.city) loadAreas(form.city); }, [form.city]);
  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -20, duration: 100, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]),
    ]).start();
  }, [step]);

  const loadRemote = async () => {
    try {
      const [cities, extras, subs] = await Promise.allSettled([
        getOptions("CITY"),
        getOptions("EXTRACURRICULAR_ACTIVITY"),
        getOptions("SUBJECT"),
      ]);
      if (cities.status === "fulfilled") setCityOpts((cities.value?.data || []).map((o: Option) => o.label));
      if (extras.status === "fulfilled") setExtraOpts((extras.value?.data || []).map((o: Option) => o.label));
      if (subs.status === "fulfilled") setSubjectOpts(subs.value?.data || []);
    } catch { /* silent */ }
  };

  const loadAreas = async (city: string) => {
    try {
      const type = `AREA_${city.toUpperCase().replace(/\s+/g, "_")}`;
      const res = await getOptions(type);
      setAreaOpts((res?.data || []).map((o: Option) => o.label));
    } catch { setAreaOpts([]); }
  };

  const set = <K extends keyof ProfileForm>(k: K, v: ProfileForm[K]) => {
    setForm(p => ({ ...p, [k]: v }));
    setErrors(e => ({ ...e, [k]: undefined }));
  };

  const toggle = (k: "subjects" | "extracurricularActivities" | "preferredAreas" | "languagesKnown" | "skills" | "daysAvailable" | "timeSlots", v: string) => {
    setForm(p => {
      const arr = p[k] as string[];
      const isSelected = arr.includes(v);
      if (!isSelected && k === "preferredAreas" && arr.length >= 10) return p;
      return { ...p, [k]: isSelected ? arr.filter(x => x !== v) : [...arr, v] };
    });
  };

  const validate = (): boolean => {
    const e: typeof errors = {};
    if (step === 0) {
      if (!form.qualification.trim()) e.qualification = "Qualification is required";
      if (!form.experience) e.experience = "Please select your experience level";
      if (form.subjects.length === 0) e.subjects = "Select at least one subject";
      if (form.languagesKnown.length === 0) e.languagesKnown = "Select at least one language";
    }
    if (step === 1) {
      if ((form.preferredMode === "OFFLINE" || form.preferredMode === "HYBRID") && !form.city) e.city = "Please select your city";
      if ((form.preferredMode === "OFFLINE" || form.preferredMode === "HYBRID") && form.preferredAreas.length === 0) e.preferredAreas = "Select at least one area";
      if (form.daysAvailable.length === 0) e.daysAvailable = "Select at least one available day";
      if (form.timeSlots.length === 0) e.timeSlots = "Select at least one time slot";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (!validate()) return;
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    submit();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      await registerTutor({
        fullName: name,
        gender: form.gender,
        phoneNumber: phone,
        email,
        bio: form.bio,
        qualification: form.qualification,
        experience: form.experience as string,
        subjects: form.subjects,
        extracurricularActivities: form.extracurricularActivities,
        languagesKnown: form.languagesKnown,
        skills: form.skills,
        preferredMode: form.preferredMode,
        city: form.city || undefined,
        preferredAreas: form.preferredAreas,
        permanentAddress: form.permanentAddress,
        residentialAddress: form.residentialAddress,
        password,
        confirmPassword: password,
        daysAvailable: form.daysAvailable,
        timeSlots: form.timeSlots,
      } as any);

      const loginRes = await loginUser({ email, password });
      const { accessToken } = loginRes.data.tokens;
      const user = loginRes.data.user;
      setAuthToken(accessToken);
      await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify({ accessToken, user }));
      registerForPushNotifications();

      // Save availability settings (non-blocking)
      if (form.daysAvailable.length > 0 || form.timeSlots.length > 0) {
        try {
          const profileRes = await getTutorProfile();
          const tutorId = (profileRes?.data as any)?._id || (profileRes?.data as any)?.id;
          if (tutorId) {
            await updateTutorAvailabilitySettings(tutorId, { daysAvailable: form.daysAvailable, timeSlots: form.timeSlots });
          }
        } catch { /* non-blocking */ }
      }

      navigation.reset({
        index: 0,
        routes: [{ name: "TutorDashboard", params: { userId: user.id, name: user.name, role: user.role } }],
      });
    } catch (err: any) {
      showError("Registration Failed", err?.message || "Please check your details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const subjectNames = subjectOpts.map(s => s.label);
  const progressPct = step / (STEPS.length - 1);

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
          {/* â”€â”€ Header â”€â”€ */}
          <LinearGradient
            colors={["#1E1B4B", "#312E81", "#4338CA"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
          >
            <View style={[s.glowA, { pointerEvents: "none" } as any]} />

            <View style={s.headerRow}>
              <Pressable style={s.backBtn} onPress={() => step > 0 ? setStep(s => s - 1) : navigation.goBack()} hitSlop={10}>
                <Ionicons name="arrow-back" size={17} color="rgba(255,255,255,0.7)" />
              </Pressable>
              <View style={s.brandCenter}>
                <Image source={require("../../../assets/logo.jpg")} style={s.brandLogo} />
                <Text style={s.brandName}>YourShikshak</Text>
              </View>
              <View style={{ width: 34 }} />
            </View>

            {/* Step indicator */}
            <View style={s.stepRow}>
              {STEPS.map((st, i) => (
                <View key={st.id} style={s.stepItem}>
                  <View style={[s.stepDot, i <= step && s.stepDotActive]}>
                    {i < step
                      ? <Ionicons name="checkmark" size={12} color="#fff" />
                      : <Text style={[s.stepDotTxt, i === step && { color: "#fff" }]}>{i + 1}</Text>
                    }
                  </View>
                  <Text style={[s.stepLbl, i <= step && s.stepLblActive]}>{st.label}</Text>
                  {i < STEPS.length - 1 && (
                    <View style={[s.stepLine, i < step && s.stepLineActive]} />
                  )}
                </View>
              ))}
            </View>

            {/* Progress bar */}
            <View style={s.progressTrack}>
              <View style={[s.progressFill, { width: `${Math.round(progressPct * 100)}%` as any }]} />
            </View>

            <View style={s.stepBadge}>
              <Text style={s.stepBadgeTxt}>STEP 3 OF 3 Â· TEACHER â€” {STEPS[step].label.toUpperCase()}</Text>
            </View>
            <Text style={s.heroTitle}>{step === 0 ? "Education &\nExpertise" : "Location &\nAvailability"}</Text>
          </LinearGradient>

          {/* â”€â”€ Form card â”€â”€ */}
          <Animated.View style={[s.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>

            {/* Step 0: Education */}
            {step === 0 && (
              <>
                <SectionHead icon="person-circle-outline" title="Your Profile" />
                <GenderPicker value={form.gender} onPick={v => set("gender", v)} />
                <FInput label="Bio (optional)" value={form.bio} onChange={v => set("bio", v)} icon="document-text-outline" placeholder="A short intro about yourselfâ€¦" multiline lines={3} />

                <SectionHead icon="school-outline" title="Education & Experience" accent="#6366F1" />
                <FInput label="Highest Qualification" value={form.qualification} onChange={v => set("qualification", v)} icon="ribbon-outline" placeholder="e.g. M.Sc Mathematics" error={errors.qualification} />
                <FSelect label="Teaching Experience" options={EXP_OPTS} value={form.experience} onPick={v => set("experience", v as Exp)} icon="time-outline" error={errors.experience} />

                <SectionHead icon="book-outline" title="Subjects & Skills" accent="#8B5CF6" />
                <SearchableMultiSelect
                  label="Subjects You Teach *"
                  options={subjectNames}
                  selected={form.subjects}
                  onToggle={v => toggle("subjects", v)}
                  accent="#8B5CF6"
                  hint={errors.subjects}
                />
                <SearchableMultiSelect
                  label="Extracurricular Activities (optional)"
                  options={extraOpts}
                  selected={form.extracurricularActivities}
                  onToggle={v => toggle("extracurricularActivities", v)}
                  accent={T.secondary}
                />
                <SearchableMultiSelect
                  label="Languages Known *"
                  options={LANG_OPTS}
                  selected={form.languagesKnown}
                  onToggle={v => toggle("languagesKnown", v)}
                  accent="#0EA5E9"
                  hint={errors.languagesKnown}
                />
                <ChipSelect
                  label="Core Skills (optional)"
                  options={SKILL_OPTS}
                  selected={form.skills}
                  onToggle={v => toggle("skills", v)}
                  accent={T.primary}
                />
              </>
            )}

            {/* Step 1: Location & Availability */}
            {step === 1 && (
              <>
                <SectionHead icon="location-outline" title="Teaching Mode & Location" />
                <ModePicker value={form.preferredMode} onPick={v => set("preferredMode", v)} />

                {(form.preferredMode === "OFFLINE" || form.preferredMode === "HYBRID") && (
                  <>
                    <FSelect
                      label="City *"
                      options={cityOpts.length > 0 ? cityOpts : ["Bhopal", "Indore", "Online"]}
                      value={form.city}
                      onPick={v => set("city", v)}
                      icon="business-outline"
                      error={errors.city}
                    />
                    <SearchableMultiSelect
                      label="Preferred Areas *"
                      options={areaOpts}
                      selected={form.preferredAreas}
                      onToggle={v => toggle("preferredAreas", v)}
                      accent={T.primary}
                      hint={errors.preferredAreas ? errors.preferredAreas : areaOpts.length === 0 ? "Select a city above to load areas" : "Up to 10 areas"}
                    />
                  </>
                )}

                <FInput label="Permanent Address (optional)" value={form.permanentAddress} onChange={v => set("permanentAddress", v)} icon="home-outline" placeholder="Address as on govt. ID" />
                <FInput label="Residential Address (optional)" value={form.residentialAddress} onChange={v => set("residentialAddress", v)} icon="navigate-outline" placeholder="If different from permanent" />

                <SectionHead icon="calendar-outline" title="Availability" accent="#6366F1" />
                <ChipSelect
                  label="Available Days *"
                  options={DAY_OPTS}
                  selected={form.daysAvailable}
                  onToggle={v => toggle("daysAvailable", v)}
                  accent="#6366F1"
                  error={errors.daysAvailable}
                />
                <SearchableMultiSelect
                  label="Preferred Time Slots *"
                  options={TIME_SLOT_OPTS}
                  selected={form.timeSlots}
                  onToggle={v => toggle("timeSlots", v)}
                  accent="#8B5CF6"
                  hint={errors.timeSlots}
                />
              </>
            )}

            {/* Terms */}
            <View style={s.termsRow}>
              <Ionicons name="information-circle-outline" size={13} color={T.mutedFg} />
              <Text style={s.termsTxt}>
                By submitting you agree to our{" "}
                <Text style={s.termsLink}>Terms of Service</Text> and{" "}
                <Text style={s.termsLink}>Privacy Policy</Text>.
              </Text>
            </View>

            {/* CTA */}
            <Pressable style={[s.ctaBtn, submitting && { opacity: 0.65 }]} onPress={next} disabled={submitting}>
              <LinearGradient colors={["#1E1B4B", "#4338CA", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.ctaGrad}>
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Text style={s.ctaTxt}>{step < STEPS.length - 1 ? "Continue" : "Complete Profile"}</Text>
                      <Ionicons name={step < STEPS.length - 1 ? "arrow-forward" : "checkmark-circle-outline"} size={18} color="#fff" style={{ marginLeft: 8 }} />
                    </>
                }
              </LinearGradient>
            </Pressable>
          </Animated.View>

          <View style={{ height: Math.max(insets.bottom, 40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  header: { paddingHorizontal: 22, paddingBottom: 28, overflow: "hidden" },
  glowA: { position: "absolute", top: -60, right: -40, width: 220, height: 220, borderRadius: 110, backgroundColor: "rgba(255,255,255,0.06)" },

  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  backBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  brandCenter: { flexDirection: "row", alignItems: "center", gap: 8 },
  brandLogo: { width: 26, height: 26, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  brandName: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // Step indicator
  stepRow: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 0 },
  stepItem: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  stepDotActive: { backgroundColor: T.primary, borderColor: T.primary },
  stepDotTxt: { color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: "700" },
  stepLbl: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: "600", marginLeft: 6 },
  stepLblActive: { color: "rgba(255,255,255,0.9)" },
  stepLine: { width: 28, height: 1.5, backgroundColor: "rgba(255,255,255,0.2)", marginHorizontal: 6 },
  stepLineActive: { backgroundColor: T.primary },

  progressTrack: { height: 3, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 99, marginBottom: 16, overflow: "hidden" },
  progressFill: { height: "100%", backgroundColor: T.primary, borderRadius: 99 },

  stepBadge: { alignSelf: "flex-start", backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  stepBadgeTxt: { color: "rgba(255,255,255,0.8)", fontSize: 9.5, fontWeight: "800", letterSpacing: 0.8 },

  heroTitle: { color: "#fff", fontSize: 28, fontWeight: "700", letterSpacing: -0.6, lineHeight: 34 },

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
    marginTop: -20,
    paddingTop: 28,
  },

  termsRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 4, marginBottom: 14 },
  termsTxt: { color: T.mutedFg, fontSize: 11, lineHeight: 16, flex: 1 },
  termsLink: { color: T.primary, fontWeight: "600" },

  ctaBtn: { borderRadius: T.radiusMd, overflow: "hidden" },
  ctaGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 15, paddingHorizontal: 20 },
  ctaTxt: { color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
});

// â”€â”€â”€ Shared primitive styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const u = StyleSheet.create({
  sectionHead: { flexDirection: "row", alignItems: "center", borderLeftWidth: 3, paddingLeft: 10, marginBottom: 16, marginTop: 8 },
  sectionIconBg: { width: 28, height: 28, borderRadius: T.radiusSm, alignItems: "center", justifyContent: "center", marginRight: 8 },
  sectionHeadText: { fontSize: 15, fontWeight: "700", color: T.textPrimary, letterSpacing: -0.2 },

  fieldWrap: { marginBottom: 14 },
  fieldBox: { flexDirection: "row", alignItems: "center", minHeight: 56, borderRadius: T.radiusMd, backgroundColor: T.paper, borderWidth: 1, borderColor: T.border },
  fieldDisabled: { backgroundColor: T.muted },
  fieldIconSlot: { paddingLeft: 14, paddingRight: 2 },
  fieldInner: { flex: 1, paddingHorizontal: 14 },
  floatLabel: { position: "absolute", left: 0, fontWeight: "500" },
  fieldInput: { color: T.textPrimary, fontSize: 15, fontWeight: "400", paddingTop: 22, paddingBottom: 8 },
  fieldError: { flexDirection: "row", alignItems: "center", marginTop: 4, paddingLeft: 2 },
  fieldErrorTxt: { color: T.error, fontSize: 12, marginLeft: 4 },

  selectLabel: { fontSize: 11, fontWeight: "700", color: T.mutedFg, marginBottom: 1, marginTop: 8 },
  selectVal: { color: T.textPrimary, fontSize: 15, paddingBottom: 8 },
  dropdown: { borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, backgroundColor: T.paper, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, zIndex: 100 },
  ddItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.muted },
  ddItemActive: { backgroundColor: `${T.primary}08` },
  ddItemTxt: { color: T.textPrimary, fontSize: 14 },
  ddItemTxtActive: { color: T.primary, fontWeight: "700" },

  chipGroupLabel: { fontSize: 11, fontWeight: "700", color: T.mutedFg, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.6 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, borderWidth: 1 },
  chipTxt: { fontSize: 12.5, fontWeight: "600", color: T.textSecondary },

  segRow: { flexDirection: "row", gap: 8 },
  segItem: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: T.radiusMd, borderWidth: 1.2 },
  segItemActive: { backgroundColor: T.primary, borderColor: T.primary },
  segItemInactive: { backgroundColor: T.paper, borderColor: T.border },
  segTxt: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  modeRow: { flexDirection: "row", gap: 8 },
  modeCard: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 11, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, backgroundColor: T.paper },
  modeCardActive: { borderColor: T.primary, backgroundColor: `${T.primary}08` },
  modeLabel: { fontSize: 13, fontWeight: "600", color: T.textSecondary },

  smsTagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  smsTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, borderWidth: 1 },
  smsTagTxt: { fontSize: 12, fontWeight: "600" },
  smsInputWrap: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, paddingHorizontal: 12, paddingVertical: 10 },
  smsInput: { flex: 1, color: T.textPrimary, fontSize: 14 },
  smsDropdown: { maxHeight: 200, borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, backgroundColor: T.paper, marginTop: 4, zIndex: 99 },
  smsOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: T.muted },
  smsOptionTxt: { color: T.textPrimary, fontSize: 14 },
  smsDismiss: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 98 },
  smsHint: { fontSize: 11, color: T.error, marginTop: 4 },
});

export default TutorCompleteProfileScreen;

