/**
 * RequestTutorScreen.tsx
 * 4-step wizard with curriculum hierarchy driven by the Options API.
 *
 * Step 1 → Student name  +  Board (from GET /options/BOARD)
 * Step 2 → Grade         (from GET /options/GRADE?parent=boardId)
 *           Subjects      (multi-select, from GET /options/SUBJECT?parent=gradeId)
 * Step 3 → Mode (3D perspective cards)  +  Days  +  Time slot
 * Step 4 → Location / City (if offline/hybrid)  +  Budget  +  Notes
 *
 * Animations:
 *  • Step transitions : translateX slide ±30 + opacity fade (160ms out / 300ms in)
 *  • Chip selection   : Animated.spring bounce  (0.91 → 1.06 → 1.0)
 *  • Mode cards       : perspective rotateY tilt on unselected card
 *  • Progress bar     : Animated.timing fill width
 *  • Field stagger    : each block fades+slides in with 40–60 ms stagger
 *  • Next button      : scale(0.97) on press
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  TextInput,
  StatusBar,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getOptions,
  submitTeacherRequest,
  Option as OptionItem,
  AUTH_STORAGE_KEY,
} from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { T } from "../constants/colors";
import { useModal } from "../context/ModalContext";

const SCREEN_W = Dimensions.get("window").width;
const TOTAL_STEPS = 4;

type Nav = StackNavigationProp<RootStackParamList, "RequestTutor">;

// ─── Static data ──────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TIME_SLOTS = [
  { label: "Morning",    sub: "6 AM – 9 AM"   },
  { label: "Forenoon",   sub: "9 AM – 12 PM"  },
  { label: "Afternoon",  sub: "12 PM – 5 PM"  },
  { label: "Evening",    sub: "5 PM – 9 PM"   },
];

const BUDGETS = [
  "Under ₹500/mo",
  "₹500 – ₹1,000/mo",
  "₹1,000 – ₹2,000/mo",
  "₹2,000+/mo",
];

const STEP_META = [
  { icon: "person-outline",   title: "About the Student",  sub: "Tell us who needs tutoring" },
  { icon: "book-outline",     title: "Grade & Subjects",  sub: "What needs to be taught?"         },
  { icon: "calendar-outline", title: "Mode & Schedule",   sub: "How and when should classes run?" },
  { icon: "location-outline", title: "Location & Budget", sub: "Where and what's the budget?"    },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Bounce scale on press then spring-settle at 1 */
const useChipSpring = () => {
  const scale = useRef(new Animated.Value(1)).current;
  const fire = (selected: boolean) => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.91, useNativeDriver: true, speed: 60, bounciness: 0 }),
      Animated.spring(scale, { toValue: selected ? 1.06 : 1.04, useNativeDriver: true, speed: 28, bounciness: 10 }),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 50, bounciness: 3 }),
    ]).start();
  };
  return { scale, fire };
};

// ─── Chip ──────────────────────────────────────────────────────────────────────

const Chip = ({
  label,
  sub,
  selected,
  onPress,
  color = T.primary,
  small = false,
  loading = false,
}: {
  label: string;
  sub?: string;
  selected: boolean;
  onPress: () => void;
  color?: string;
  small?: boolean;
  loading?: boolean;
}) => {
  const { scale, fire } = useChipSpring();
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={() => { fire(!selected); onPress(); }}
        style={[
          ch.base,
          small && ch.small,
          selected
            ? { backgroundColor: color, borderColor: color }
            : { backgroundColor: T.paper, borderColor: T.border },
        ]}
      >
        {selected && <View style={[ch.dot, { backgroundColor: "rgba(255,255,255,0.65)" }]} />}
        <View>
          <Text style={[ch.label, small && ch.labelSm, { color: selected ? "#fff" : T.textSecondary }]}>
            {label}
          </Text>
          {sub && (
            <Text style={[ch.sub, { color: selected ? "rgba(255,255,255,0.7)" : T.textDisabled }]}>
              {sub}
            </Text>
          )}
        </View>
        {loading && <ActivityIndicator size="small" color={selected ? "#fff" : T.primary} style={{ marginLeft: 4 }} />}
      </Pressable>
    </Animated.View>
  );
};

// ─── Mode card ────────────────────────────────────────────────────────────────

const ModeCard = ({
  icon, title, desc, selected, onPress, delay = 0,
}: {
  icon: any; title: string; desc: string;
  selected: boolean; onPress: () => void; delay?: number;
}) => {
  const tilt   = useRef(new Animated.Value(selected ? 0 : 1)).current;
  const mount  = useRef(new Animated.Value(0)).current;
  const mountY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(mount,  { toValue: 1, duration: 320, delay, useNativeDriver: true }),
      Animated.timing(mountY, { toValue: 0, duration: 320, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.spring(tilt, { toValue: selected ? 0 : 1, useNativeDriver: true, speed: 18, bounciness: 4 }).start();
  }, [selected]);

  const rotateY = tilt.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "5deg"] });
  const sc      = tilt.interpolate({ inputRange: [0, 1], outputRange: [1, 0.965] });

  return (
    <Animated.View style={[{ flex: 1 }, { opacity: mount, transform: [{ translateY: mountY }, { scale: sc }, { perspective: 700 }, { rotateY }] }]}>
      <Pressable
        onPress={onPress}
        style={[
          mc.card,
          selected && { borderColor: T.primary, borderWidth: 2, backgroundColor: `${T.primary}07` },
        ]}
      >
        <View style={[mc.iconWrap, { backgroundColor: selected ? `${T.primary}16` : T.muted }]}>
          <Ionicons name={icon} size={24} color={selected ? T.primary : T.mutedFg} />
        </View>
        <Text style={[mc.title, { color: selected ? T.primary : T.textPrimary }]}>{title}</Text>
        <Text style={mc.desc}>{desc}</Text>
        {selected && (
          <View style={mc.check}>
            <Ionicons name="checkmark" size={10} color="#fff" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

// ─── Stagger-in wrapper ───────────────────────────────────────────────────────

const FadeIn = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => {
  const fade  = useRef(new Animated.Value(0)).current;
  const slideY= useRef(new Animated.Value(14)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade,   { toValue: 1, duration: 300, delay, useNativeDriver: true }),
      Animated.timing(slideY, { toValue: 0, duration: 300, delay, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slideY }] }}>
      {children}
    </Animated.View>
  );
};

// ─── Field label ──────────────────────────────────────────────────────────────

const FieldLabel = ({ icon, label, required }: { icon: any; label: string; required?: boolean }) => (
  <View style={fl.row}>
    <Ionicons name={icon} size={13} color={T.primary} />
    <Text style={fl.text}>
      {label}{required && <Text style={{ color: T.error }}> *</Text>}
    </Text>
  </View>
);

// ─── Loading chips skeleton ───────────────────────────────────────────────────

const ChipSkeleton = ({ count = 4 }: { count?: number }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1,   duration: 600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
      ]),
    ).start();
  }, []);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View
          key={i}
          style={{ width: 70 + (i % 3) * 20, height: 34, borderRadius: 999, backgroundColor: "#E2E8F0", opacity: pulse }}
        />
      ))}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RequestTutorScreen = () => {
  const insets = useSafeAreaInsets();
  const nav    = useNavigation<Nav>();
  const { showError } = useModal();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // ── Curriculum data ─────────────────────────────────────────────────────
  const [boards,   setBoards]   = useState<OptionItem[]>([]);
  const [grades,   setGrades]   = useState<OptionItem[]>([]);
  const [subjects, setSubjects] = useState<OptionItem[]>([]);

  const [loadingBoards,   setLoadingBoards]   = useState(true);
  const [loadingGrades,   setLoadingGrades]   = useState(false);
  const [loadingSubjects, setLoadingSubjects] = useState(false);

  // Location options
  const [cities,       setCities]       = useState<OptionItem[]>([]);
  const [areas,        setAreas]        = useState<OptionItem[]>([]);
  const [loadingCities,setLoadingCities]= useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // ── Form state ──────────────────────────────────────────────────────────
  const [studentName,    setStudentName]    = useState("");
  const [selectedBoard,  setSelectedBoard]  = useState<OptionItem | null>(null);
  const [selectedGrade,  setSelectedGrade]  = useState<OptionItem | null>(null);
  const [selectedSubjects, setSelectedSubjects] = useState<OptionItem[]>([]);
  const [mode,           setMode]           = useState<"ONLINE" | "OFFLINE" | "HYBRID">("ONLINE");
  const [days,           setDays]           = useState<string[]>([]);
  const [timeSlot,       setTimeSlot]       = useState("");
  const [selectedCity,   setSelectedCity]   = useState<OptionItem | null>(null);
  const [selectedArea,   setSelectedArea]   = useState<OptionItem | null>(null);
  const [address,        setAddress]        = useState("");
  const [budget,         setBudget]         = useState("");
  const [notes,          setNotes]          = useState("");

  // ── Submitter identity (read from stored auth) ──────────────────────────
  const [userType,      setUserType]      = useState<"PARENT" | "STUDENT">("PARENT");
  const [lockedName,    setLockedName]    = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const { user } = JSON.parse(raw);
        if (user?.userType === "STUDENT") {
          setUserType("STUDENT");
          setLockedName(user.name ?? "");
          setStudentName(user.name ?? "");
        }
      } catch (_) {}
    });
  }, []);

  // ── Load boards on mount ────────────────────────────────────────────────
  useEffect(() => {
    getOptions("BOARD")
      .then((res) => setBoards(res.data ?? []))
      .catch(() => showError("Error", "Could not load boards. Please check your connection."))
      .finally(() => setLoadingBoards(false));
  }, []);

  // ── Load grades when board changes ──────────────────────────────────────
  const onSelectBoard = useCallback((board: OptionItem) => {
    setSelectedBoard(board);
    setSelectedGrade(null);
    setSelectedSubjects([]);
    setGrades([]);
    setSubjects([]);
    setLoadingGrades(true);
    getOptions("GRADE", board._id)
      .then((res) => setGrades(res.data ?? []))
      .catch(() => showError("Error", "Could not load grades."))
      .finally(() => setLoadingGrades(false));
  }, []);

  // ── Load subjects when grade changes ────────────────────────────────────
  const onSelectGrade = useCallback((grade: OptionItem) => {
    setSelectedGrade(grade);
    setSelectedSubjects([]);
    setSubjects([]);
    setLoadingSubjects(true);
    getOptions("SUBJECT", grade._id)
      .then((res) => setSubjects(res.data ?? []))
      .catch(() => showError("Error", "Could not load subjects."))
      .finally(() => setLoadingSubjects(false));
  }, []);

  // ── Load cities when step 3 is first reached ────────────────────────────
  useEffect(() => {
    if (step === 3 && mode !== "ONLINE" && cities.length === 0 && !loadingCities) {
      setLoadingCities(true);
      getOptions("CITY")
        .then((res) => setCities(res.data ?? []))
        .catch(() => showError("Error", "Could not load cities."))
        .finally(() => setLoadingCities(false));
    }
  }, [step, mode]);

  const onSelectCity = useCallback((c: OptionItem) => {
    setSelectedCity(c);
    setSelectedArea(null);
    setAreas([]);
    setLoadingAreas(true);
    const areaType = `AREA_${c.value.toUpperCase().replace(/\s+/g, "_")}`;
    getOptions(areaType)
      .then((res) => setAreas(res.data ?? []))
      .catch(() => {})               // no areas for this city is fine
      .finally(() => setLoadingAreas(false));
  }, []);

  const toggleSubject = (item: OptionItem) => {
    setSelectedSubjects((prev) =>
      prev.some((s) => s._id === item._id)
        ? prev.filter((s) => s._id !== item._id)
        : [...prev, item],
    );
  };

  const toggleDay = (d: string) =>
    setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]));

  // ── Step transition ──────────────────────────────────────────────────────
  const stepKey   = useRef(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim  = useRef(new Animated.Value(1)).current;

  const progressAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (step + 1) / TOTAL_STEPS,
      duration: 380,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [step]);

  const progressWidth = progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] });

  const goToStep = (next: number, dir: "forward" | "back") => {
    const exitX  = dir === "forward" ? -28 : 28;
    const enterX = dir === "forward" ?  28 : -28;
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: exitX, duration: 150, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(fadeAnim,  { toValue: 0,     duration: 120, useNativeDriver: true }),
    ]).start(() => {
      stepKey.current++;
      setStep(next);
      slideAnim.setValue(enterX);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 290, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        Animated.timing(fadeAnim,  { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    });
  };

  const handleBack = () => (step > 0 ? goToStep(step - 1, "back") : nav.goBack());

  const validate = (): string | null => {
    if (step === 0) {
      if (!studentName.trim())  return "Please enter the student's name.";
      if (!selectedBoard)       return "Please select a board.";
    }
    if (step === 1) {
      if (!selectedGrade)              return "Please select a grade.";
      if (selectedSubjects.length < 1) return "Please select at least one subject.";
    }
    return null;
  };

  const handleNext = async () => {
    const err = validate();
    if (err) { showError("Required", err); return; }
    if (step < TOTAL_STEPS - 1) { goToStep(step + 1, "forward"); return; }
    await handleSubmit();
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await submitTeacherRequest({
        studentName:      studentName.trim(),
        board:            selectedBoard!._id,
        grade:            selectedGrade!._id,
        subjects:         selectedSubjects.map((s) => s._id),
        mode,
        preferredDays:    days,
        preferredTimeSlot: timeSlot || undefined,
        address:          [selectedArea?.label, address.trim()].filter(Boolean).join(", ") || undefined,
        city:             selectedCity?.label || undefined,
        budgetRange:      budget         || undefined,
        notes:            notes.trim()   || undefined,
      });
      const reqId   = res?.data?.requestId ?? res?.data?._id ?? "—";
      const subjStr = selectedSubjects.map((s) => s.label).join(", ");
      nav.replace("RequestConfirmation", {
        requestId: String(reqId),
        subject:   subjStr,
        grade:     selectedGrade?.label ?? "",
      });
    } catch (e: any) {
      showError("Submission Failed", e?.message ?? "Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return !!studentName.trim() && !!selectedBoard;
    if (step === 1) return !!selectedGrade && selectedSubjects.length > 0;
    return true;
  };

  const meta = STEP_META[step];

  // ── Step renderers ──────────────────────────────────────────────────────

  const renderStep0 = () => (
    <View key={stepKey.current}>
      <FadeIn delay={0}>
        <FieldLabel
          icon="person-outline"
          label={userType === "STUDENT" ? "Your Full Name" : "Student's Full Name"}
          required
        />
        <View style={{ position: "relative" }}>
          <TextInput
            style={[f.input, userType === "STUDENT" && { backgroundColor: T.muted, color: T.textSecondary }]}
            placeholder="e.g. Aarav Sharma"
            placeholderTextColor={T.textDisabled}
            value={studentName}
            onChangeText={userType === "PARENT" ? setStudentName : undefined}
            editable={userType === "PARENT"}
            autoFocus={userType === "PARENT"}
            returnKeyType="done"
          />
          {userType === "STUDENT" && (
            <View style={{ position: "absolute", right: 12, top: 0, bottom: 0, justifyContent: "center" }}>
              <Ionicons name="lock-closed-outline" size={14} color={T.textDisabled} />
            </View>
          )}
        </View>
        {userType === "STUDENT" ? (
          <Text style={f.helperTxt}>Auto-filled from your profile · cannot be changed</Text>
        ) : (
          <Text style={f.helperTxt}>Enter the student's name who needs tutoring</Text>
        )}
      </FadeIn>

      <FadeIn delay={120}>
        <FieldLabel icon="document-text-outline" label="Board" required />
        {loadingBoards ? (
          <ChipSkeleton count={5} />
        ) : (
          <View style={f.chipWrap}>
            {boards.map((b) => (
              <Chip
                key={b._id}
                label={b.label}
                selected={selectedBoard?._id === b._id}
                onPress={() => onSelectBoard(b)}
                small
              />
            ))}
            {boards.length === 0 && (
              <Text style={f.emptyTxt}>No boards found. Please check connection.</Text>
            )}
          </View>
        )}
      </FadeIn>
    </View>
  );

  const renderStep1 = () => (
    <View key={stepKey.current}>
      <FadeIn delay={30}>
        <FieldLabel icon="layers-outline" label="Grade / Class" required />
        {loadingGrades ? (
          <ChipSkeleton count={6} />
        ) : grades.length > 0 ? (
          <View style={f.chipWrap}>
            {grades.map((g) => (
              <Chip
                key={g._id}
                label={g.label}
                selected={selectedGrade?._id === g._id}
                onPress={() => onSelectGrade(g)}
                color={T.secondary}
                small
              />
            ))}
          </View>
        ) : (
          <Text style={f.emptyTxt}>
            {selectedBoard ? "No grades found for this board." : "Select a board first."}
          </Text>
        )}
      </FadeIn>

      <FadeIn delay={100}>
        <FieldLabel icon="book-outline" label="Subjects" required />
        <Text style={f.helperTxt}>Select all that apply</Text>
        {loadingSubjects ? (
          <ChipSkeleton count={8} />
        ) : subjects.length > 0 ? (
          <View style={f.chipWrap}>
            {subjects.map((s) => (
              <Chip
                key={s._id}
                label={s.label}
                selected={selectedSubjects.some((x) => x._id === s._id)}
                onPress={() => toggleSubject(s)}
                small
              />
            ))}
          </View>
        ) : (
          <Text style={f.emptyTxt}>
            {selectedGrade ? "No subjects found for this grade." : "Select a grade first."}
          </Text>
        )}
      </FadeIn>
    </View>
  );

  const renderStep2 = () => (
    <View key={stepKey.current}>
      <FadeIn delay={30}>
        <FieldLabel icon="swap-horizontal-outline" label="Preferred Mode" />
        <View style={f.modeRow}>
          <ModeCard icon="home-outline"     title="Home Tuition" desc="Tutor visits your home"   selected={mode === "OFFLINE"} onPress={() => setMode("OFFLINE")} delay={60}  />
          <ModeCard icon="videocam-outline" title="Online"       desc="Via video call"           selected={mode === "ONLINE"}  onPress={() => setMode("ONLINE")}  delay={110} />
        </View>
        <View style={[f.modeRow, { marginTop: 10 }]}>
          <ModeCard icon="git-merge-outline" title="Hybrid" desc="Mix of both" selected={mode === "HYBRID"} onPress={() => setMode("HYBRID")} delay={160} />
          <View style={{ flex: 1 }} />
        </View>
      </FadeIn>

      <FadeIn delay={140}>
        <FieldLabel icon="calendar-outline" label="Preferred Days" />
        <View style={f.chipWrap}>
          {DAYS.map((d) => (
            <Chip key={d} label={d} selected={days.includes(d)} onPress={() => toggleDay(d)} color="#7C3AED" small />
          ))}
        </View>
      </FadeIn>

      <FadeIn delay={200}>
        <FieldLabel icon="time-outline" label="Preferred Time" />
        <View style={f.chipWrap}>
          {TIME_SLOTS.map((ts) => (
            <Chip
              key={ts.label}
              label={ts.label}
              sub={ts.sub}
              selected={timeSlot === ts.label}
              onPress={() => setTimeSlot(timeSlot === ts.label ? "" : ts.label)}
            />
          ))}
        </View>
      </FadeIn>
    </View>
  );

  const renderStep3 = () => {
    const isOffline = mode !== "ONLINE";
    const d1 = 30;
    const d2 = isOffline ? 100 : 30;
    const d3 = isOffline ? 170 : 100;
    const d4 = isOffline ? 240 : 170;

    return (
      <View key={stepKey.current}>
        {isOffline && (
          <>
            {/* City — from Options */}
            <FadeIn delay={d1}>
              <FieldLabel icon="business-outline" label="City" />
              {loadingCities ? (
                <ChipSkeleton count={5} />
              ) : cities.length > 0 ? (
                <View style={f.chipWrap}>
                  {cities.map((c) => (
                    <Chip
                      key={c._id}
                      label={c.label}
                      selected={selectedCity?._id === c._id}
                      onPress={() => onSelectCity(c)}
                      color={T.secondary}
                      small
                    />
                  ))}
                </View>
              ) : (
                <Text style={f.emptyTxt}>No cities available.</Text>
              )}
            </FadeIn>

            {/* Area — from Options (parent = city type string) */}
            {selectedCity && (
              <FadeIn delay={d2 - 30}>
                <FieldLabel icon="map-outline" label="Area / Locality" />
                {loadingAreas ? (
                  <ChipSkeleton count={6} />
                ) : areas.length > 0 ? (
                  <View style={f.chipWrap}>
                    {areas.map((a) => (
                      <Chip
                        key={a._id}
                        label={a.label}
                        selected={selectedArea?._id === a._id}
                        onPress={() =>
                          setSelectedArea((prev) =>
                            prev?._id === a._id ? null : a,
                          )
                        }
                        color="#7C3AED"
                        small
                      />
                    ))}
                  </View>
                ) : (
                  <Text style={f.emptyTxt}>No areas listed for this city.</Text>
                )}
              </FadeIn>
            )}

            {/* Detailed address — free text */}
            <FadeIn delay={d2}>
              <FieldLabel icon="location-outline" label="Detailed Address" />
              <TextInput
                style={f.input}
                placeholder="House / flat no., street, landmark…"
                placeholderTextColor={T.textDisabled}
                value={address}
                onChangeText={setAddress}
                multiline
              />
            </FadeIn>
          </>
        )}

        <FadeIn delay={d3}>
          <FieldLabel icon="wallet-outline" label="Budget Range" />
          <View style={f.chipWrap}>
            {BUDGETS.map((b) => (
              <Chip
                key={b}
                label={b}
                selected={budget === b}
                onPress={() => setBudget(budget === b ? "" : b)}
                color={T.success}
                small
              />
            ))}
          </View>
        </FadeIn>

        <FadeIn delay={d4}>
          <FieldLabel icon="chatbubble-outline" label="Additional Notes" />
          <TextInput
            style={[f.input, { minHeight: 88, textAlignVertical: "top" }]}
            placeholder="Any specific requirements, learning goals, or preferences…"
            placeholderTextColor={T.textDisabled}
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={500}
          />
          <Text style={f.charCount}>{notes.length}/500</Text>
        </FadeIn>
      </View>
    );
  };

  const renderStep = () => {
    if (step === 0) return renderStep0();
    if (step === 1) return renderStep1();
    if (step === 2) return renderStep2();
    return renderStep3();
  };

  return (
    <KeyboardAvoidingView
      style={s.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Dark gradient header ──────────────────────────────────────── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}
      >
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        {/* Top row */}
        <View style={s.topRow}>
          <Pressable
            onPress={handleBack}
            style={({ pressed }) => [s.iconBtn, pressed && { opacity: 0.55 }]}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color="rgba(255,255,255,0.9)" />
          </Pressable>
          <Text style={s.stepCounter}>Step {step + 1} of {TOTAL_STEPS}</Text>
          <View style={s.iconBtn}>
            <Ionicons name={meta.icon as any} size={17} color="rgba(255,255,255,0.6)" />
          </View>
        </View>

        {/* Heading */}
        <Text style={s.title}>{meta.title}</Text>
        <Text style={s.sub}>{meta.sub}</Text>

        {/* Progress bar */}
        <View style={s.progressTrack}>
          <Animated.View style={[s.progressFill, { width: progressWidth }]} />
        </View>

        {/* Step dots */}
        <View style={s.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                s.dot,
                i === step ? s.dotActive : i < step ? s.dotDone : s.dotOff,
              ]}
            />
          ))}
        </View>
      </LinearGradient>

      {/* ── White card body ───────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.scrollContent, { paddingBottom: Math.max(insets.bottom + 40, 60) }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[s.card, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}
        >
          {renderStep()}

          {/* Nav buttons */}
          <View style={s.navRow}>
            {step > 0 && (
              <Pressable
                style={({ pressed }) => [s.backPill, pressed && { opacity: 0.65, transform: [{ scale: 0.97 }] }]}
                onPress={handleBack}
              >
                <Ionicons name="arrow-back" size={15} color={T.textSecondary} />
                <Text style={s.backTxt}>Back</Text>
              </Pressable>
            )}
            <Pressable
              style={({ pressed }) => [
                s.nextBtn,
                step === 0 && { flex: 1 },
                !canProceed() && { opacity: 0.4 },
                pressed && { transform: [{ scale: 0.97 }] },
              ]}
              onPress={handleNext}
              disabled={submitting}
            >
              <LinearGradient
                colors={[T.primary, T.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={s.nextGrad}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Text style={s.nextTxt}>
                      {step === TOTAL_STEPS - 1 ? "Submit Request" : "Continue"}
                    </Text>
                    <Ionicons
                      name={step === TOTAL_STEPS - 1 ? "send-outline" : "arrow-forward"}
                      size={16}
                      color="#fff"
                    />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  header:  { paddingHorizontal: 22, paddingBottom: 34, overflow: "hidden" },
  orbA:    { position: "absolute", width: 220, height: 220, borderRadius: 110, backgroundColor: `${T.primary}10`, top: -60, right: -60 } as any,
  orbB:    { position: "absolute", width: 140, height: 140, borderRadius: 70,  backgroundColor: `${T.secondary}08`, bottom: 0, left: -30 } as any,

  topRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 20 },
  iconBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  stepCounter:{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontWeight: "600", letterSpacing: 0.5 },

  title: { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.6, marginBottom: 3 },
  sub:   { fontSize: 13, color: "rgba(255,255,255,0.4)", marginBottom: 20 },

  progressTrack: { height: 4, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 2, overflow: "hidden", marginBottom: 10 },
  progressFill:  { height: 4, backgroundColor: T.secondary, borderRadius: 2 },

  dotsRow:  { flexDirection: "row", gap: 6 },
  dot:      { height: 6, borderRadius: 3 },
  dotActive:{ width: 22, backgroundColor: "#fff" },
  dotDone:  { width: 8,  backgroundColor: T.success },
  dotOff:   { width: 8,  backgroundColor: "rgba(255,255,255,0.18)" },

  card: {
    flexGrow: 1,
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 22,
    paddingTop: 24,
    minHeight: 460,
  },

  navRow:   { flexDirection: "row", gap: 10, marginTop: 28 },
  backPill: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: T.paper, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border },
  backTxt:  { fontSize: 14, fontWeight: "600", color: T.textSecondary },
  nextBtn:  { flex: 2, borderRadius: T.radiusMd, overflow: "hidden" },
  nextGrad: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  nextTxt:  { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// Chip
const ch = StyleSheet.create({
  base:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 13, paddingVertical: 9, borderRadius: T.radiusFull, borderWidth: 1.5, margin: 3 },
  small:   { paddingHorizontal: 11, paddingVertical: 6 },
  dot:     { width: 5, height: 5, borderRadius: 3 },
  label:   { fontSize: 13, fontWeight: "600" },
  labelSm: { fontSize: 12 },
  sub:     { fontSize: 10, fontWeight: "500", marginTop: 1 },
});

// Field label
const fl = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8, marginTop: 18 },
  text: { fontSize: 11, fontWeight: "700", color: T.textSecondary, letterSpacing: 0.4, textTransform: "uppercase" },
});

// Form elements
const f = StyleSheet.create({
  input:     { backgroundColor: T.paper, borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: T.textPrimary, fontWeight: "500" },
  chipWrap:  { flexDirection: "row", flexWrap: "wrap", margin: -3 },
  modeRow:   { flexDirection: "row", gap: 10 },
  helperTxt: { fontSize: 11, color: T.textDisabled, marginBottom: 6, marginTop: 4 },
  charCount: { fontSize: 10, color: T.textDisabled, textAlign: "right", marginTop: 4 },
  emptyTxt:  { fontSize: 13, color: T.textDisabled, fontStyle: "italic", marginTop: 8 },
  // Role selector
});

// Mode card
const mc = StyleSheet.create({
  card:    { backgroundColor: T.paper, borderRadius: T.radiusXl, padding: 14, borderWidth: 1.5, borderColor: T.border, alignItems: "center", gap: 7, position: "relative", overflow: "hidden" },
  iconWrap:{ width: 50, height: 50, borderRadius: T.radiusLg, alignItems: "center", justifyContent: "center" },
  title:   { fontSize: 13, fontWeight: "700", textAlign: "center" },
  desc:    { fontSize: 11, color: T.textSecondary, textAlign: "center", lineHeight: 15 },
  check:   { position: "absolute", top: 8, right: 8, width: 18, height: 18, borderRadius: 9, backgroundColor: T.primary, alignItems: "center", justifyContent: "center" },
});

export default RequestTutorScreen;
