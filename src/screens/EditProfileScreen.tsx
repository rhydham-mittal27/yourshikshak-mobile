import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import {
  getMyProfileForEdit,
  updateMyProfile,
  getOptions,
  Option,
  EditProfileData,
} from "../api/client";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";
import { RootStackParamList } from "../navigation/AppNavigator";

type Nav = StackNavigationProp<RootStackParamList, "EditProfile">;

const MODES = ["ONLINE", "OFFLINE", "HYBRID"];
const GENDERS = ["MALE", "FEMALE", "OTHER"];
const EXP_OPTIONS = [
  "Fresher",
  "1-2 Years",
  "3-5 Years",
  "5-10 Years",
  "10+ Years",
];
const COMMON_LANGUAGES = [
  "Hindi",
  "English",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Urdu",
  "Gujarati",
  "Kannada",
  "Odia",
  "Punjabi",
  "Malayalam",
];

const LOCKED_FIELDS = new Set([
  "fullName",
  "email",
  "phoneNumber",
  "gender",
  "dob",
  "qualification",
  "experience",
  "permanentAddress",
  "residentialAddress",
  "extracurricularActivities",
]);

// ─── Sub-components ───────────────────────────────────────────────────────────

// Compact labeled input — label sits inside the box above the value
const LabeledField = ({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}) => (
  <View style={styles.labeledBox}>
    <Text style={styles.labeledLabel}>{label}</Text>
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor="#CBD5E1"
      style={[styles.labeledInput, multiline && styles.labeledInputMulti]}
      multiline={multiline}
      numberOfLines={multiline ? 2 : 1}
      textAlignVertical={multiline ? "top" : "center"}
      keyboardType={keyboardType}
    />
  </View>
);

// 2-column grid for locked fields — halves vertical space
const LockedGrid = ({
  fields,
}: {
  fields: { label: string; value: string }[];
}) => {
  const pairs: { label: string; value: string }[][] = [];
  for (let i = 0; i < fields.length; i += 2) pairs.push(fields.slice(i, i + 2));
  return (
    <View style={{ gap: 6, marginTop: 2 }}>
      {pairs.map((row, i) => (
        <View key={i} style={{ flexDirection: "row", gap: 6 }}>
          {row.map((f) => (
            <LockedField key={f.label} label={f.label} value={f.value} flex />
          ))}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
};

const SectionHeader = ({
  icon,
  title,
  accent,
}: {
  icon: any;
  title: string;
  accent?: string;
}) => (
  <View style={styles.sectionHead}>
    <Ionicons name={icon} size={13} color="#7c828a" />
    <Text style={styles.sectionTitle}>{title}</Text>
  </View>
);

const FieldLabel = ({ label, locked }: { label: string; locked?: boolean }) => (
  <View style={styles.fieldLabelRow}>
    <Text style={styles.fieldLabel}>{label}</Text>
    {locked && (
      <View style={styles.lockBadge}>
        <Ionicons name="lock-closed" size={9} color="#7C3AED" />
        <Text style={styles.lockTxt}>Locked</Text>
      </View>
    )}
  </View>
);

// Locked field — masked row, tap to toggle reveal
const LockedField = ({
  label,
  value,
  flex,
}: {
  label: string;
  value: string;
  flex?: boolean;
}) => {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = () => {
    setShow((s) => {
      const next = !s;
      if (next) {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setShow(false), 2500);
      }
      return next;
    });
  };

  React.useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    <Pressable
      onPress={reveal}
      style={[styles.lockedRow, flex && { flex: 1 }]}
      hitSlop={4}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.lockedLabel}>{label}</Text>
        <Text style={styles.lockedValue} numberOfLines={1}>
          {show ? value || "—" : "•  •  •  •  •  •"}
        </Text>
      </View>
      <View style={styles.lockedEye}>
        <Ionicons
          name={show ? "eye" : "eye-off-outline"}
          size={13}
          color="#7C3AED"
        />
      </View>
    </Pressable>
  );
};

const Field = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  keyboardType = "default",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
}) => (
  <TextInput
    value={value}
    onChangeText={onChange}
    placeholder={placeholder}
    placeholderTextColor={T.mutedFg}
    style={[styles.input, multiline && styles.inputMulti]}
    multiline={multiline}
    numberOfLines={multiline ? 3 : 1}
    textAlignVertical={multiline ? "top" : "center"}
    keyboardType={keyboardType}
  />
);

const PillSelect = ({
  options,
  selected,
  onToggle,
  color = T.primary,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  color?: string;
}) => (
  <View style={styles.pillRow}>
    {options.map((o) => {
      const active = selected.includes(o);
      return (
        <Pressable
          key={o}
          onPress={() => onToggle(o)}
          style={[
            styles.pill,
            active && { backgroundColor: color, borderColor: color },
          ]}
        >
          <Text style={[styles.pillTxt, active && { color: "#fff" }]}>{o}</Text>
        </Pressable>
      );
    })}
  </View>
);

const SingleSelect = ({
  options,
  value,
  onChange,
  color = T.primary,
}: {
  options: string[];
  value: string;
  onChange: (v: string) => void;
  color?: string;
}) => (
  <View style={styles.pillRow}>
    {options.map((o) => {
      const active = value === o;
      return (
        <Pressable
          key={o}
          onPress={() => onChange(o)}
          style={[
            styles.pill,
            active && { backgroundColor: color, borderColor: color },
          ]}
        >
          <Text style={[styles.pillTxt, active && { color: "#fff" }]}>{o}</Text>
        </Pressable>
      );
    })}
  </View>
);

// Tag input (free text comma-separated)
const TagInput = ({
  tags,
  onAdd,
  onRemove,
  placeholder,
  color = T.primary,
}: {
  tags: string[];
  onAdd: (v: string) => void;
  onRemove: (v: string) => void;
  placeholder?: string;
  color?: string;
}) => {
  const [text, setText] = useState("");
  const submit = () => {
    const val = text.trim();
    if (val && !tags.includes(val)) {
      onAdd(val);
      setText("");
    } else setText("");
  };
  return (
    <View>
      <View style={styles.tagInputRow}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={placeholder}
          placeholderTextColor={T.mutedFg}
          style={styles.tagInput}
          onSubmitEditing={submit}
          returnKeyType="done"
        />
        <Pressable
          onPress={submit}
          style={[styles.tagAddBtn, { backgroundColor: `${color}15` }]}
        >
          <Ionicons name="add" size={18} color={color} />
        </Pressable>
      </View>
      {tags.length > 0 && (
        <View style={styles.pillRow}>
          {tags.map((t) => (
            <Pressable
              key={t}
              onPress={() => onRemove(t)}
              style={[
                styles.pill,
                { backgroundColor: `${color}15`, borderColor: `${color}30` },
              ]}
            >
              <Text style={[styles.pillTxt, { color }]}>{t}</Text>
              <Ionicons
                name="close"
                size={10}
                color={color}
                style={{ marginLeft: 3 }}
              />
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
};

// Curriculum Picker Modal — same pattern as RegisterScreen
const CurriculumPickerModal = ({
  visible,
  boards,
  grades,
  subjectOpts,
  activeBoardId,
  setActiveBoardId,
  selected,
  onToggle,
  onClose,
}: {
  visible: boolean;
  boards: Option[];
  grades: Option[];
  subjectOpts: Option[];
  activeBoardId: string;
  setActiveBoardId: (id: string) => void;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
    <View style={cp.root}>
      {/* Header */}
      <View style={cp.header}>
        <Pressable onPress={onClose} hitSlop={10}>
          <Ionicons name="close" size={22} color={T.textPrimary} />
        </Pressable>
        <Text style={cp.headerTitle}>
          Subjects ({selected.length} selected)
        </Text>
        <Pressable onPress={onClose}>
          <Text style={cp.doneBtn}>Done</Text>
        </Pressable>
      </View>

      {/* Board tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={cp.boardBar}
        contentContainerStyle={{
          paddingHorizontal: 16,
          gap: 8,
          alignItems: "center",
        }}
      >
        {boards.map((board) => (
          <Pressable
            key={board._id}
            onPress={() => setActiveBoardId(board._id)}
            style={[
              cp.boardTab,
              activeBoardId === board._id && cp.boardTabActive,
            ]}
          >
            <Text
              style={[
                cp.boardTabTxt,
                activeBoardId === board._id && cp.boardTabTxtActive,
              ]}
            >
              {board.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Grades + subjects */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
        {grades
          .filter((g) => {
            const pid =
              typeof g.parent === "object" ? (g.parent as any)?._id : g.parent;
            return pid === activeBoardId;
          })
          .map((grade) => {
            const gradeSubs = subjectOpts.filter((s) => {
              const pid =
                typeof s.parent === "object"
                  ? (s.parent as any)?._id
                  : s.parent;
              return pid === grade._id;
            });
            if (gradeSubs.length === 0) return null;
            const allSelected = gradeSubs.every((s) =>
              selected.includes(s._id),
            );
            const someSelected = gradeSubs.some((s) =>
              selected.includes(s._id),
            );
            const selectedCount = gradeSubs.filter((s) =>
              selected.includes(s._id),
            ).length;
            return (
              <View key={grade._id} style={{ marginBottom: 14 }}>
                <Pressable
                  onPress={() => {
                    const ids = gradeSubs.map((s) => s._id);
                    ids.forEach((id) => {
                      const isOn = selected.includes(id);
                      if (allSelected ? isOn : !isOn) onToggle(id);
                    });
                  }}
                  style={cp.gradeHeader}
                >
                  <View
                    style={[
                      cp.gradeCheck,
                      (allSelected || someSelected) && {
                        backgroundColor: T.primary,
                        borderColor: T.primary,
                      },
                    ]}
                  >
                    {allSelected && (
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    )}
                    {!allSelected && someSelected && (
                      <View
                        style={{
                          width: 8,
                          height: 2,
                          backgroundColor: "#fff",
                          borderRadius: 1,
                        }}
                      />
                    )}
                  </View>
                  <Text style={cp.gradeLabel}>{grade.label}</Text>
                  <Text style={cp.gradeCount}>
                    {selectedCount}/{gradeSubs.length}
                  </Text>
                </Pressable>
                <View
                  style={{
                    flexDirection: "row",
                    flexWrap: "wrap",
                    gap: 8,
                    marginTop: 8,
                  }}
                >
                  {gradeSubs.map((sub) => {
                    const on = selected.includes(sub._id);
                    return (
                      <Pressable
                        key={sub._id}
                        onPress={() => onToggle(sub._id)}
                        style={[cp.subChip, on && cp.subChipSelected]}
                      >
                        <Text
                          style={[cp.subChipTxt, on && cp.subChipTxtSelected]}
                        >
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
    </View>
  </Modal>
);

// ─── FSelect — single-value dropdown ─────────────────────────────────────────
const FSelect = ({
  label,
  options,
  value,
  onPick,
}: {
  label: string;
  options: string[];
  value: string;
  onPick: (v: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        style={[sel.box, open && sel.boxOpen]}
      >
        <Text style={[sel.val, !value && sel.placeholder]}>
          {value || "Select…"}
        </Text>
        <Ionicons
          name={open ? "chevron-up" : "chevron-down"}
          size={14}
          color="#94A3B8"
        />
      </Pressable>
      {open && (
        <View style={sel.dropdown}>
          <ScrollView
            nestedScrollEnabled
            style={{ maxHeight: 180 }}
            showsVerticalScrollIndicator={false}
          >
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[sel.item, value === opt && sel.itemActive]}
                onPress={() => {
                  onPick(opt);
                  setOpen(false);
                }}
              >
                <Text style={[sel.itemTxt, value === opt && sel.itemTxtActive]}>
                  {opt}
                </Text>
                {value === opt && (
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={T.primary}
                  />
                )}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

// ─── ChipSelect — multi-value chip toggle ─────────────────────────────────────
const ChipSelect = ({
  label,
  options,
  selected,
  onToggle,
  accent = T.primary,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  accent?: string;
}) => (
  <View>
    {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
    <View style={sel.chipRow}>
      {options.map((opt) => {
        const on = selected.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => onToggle(opt)}
            style={[
              sel.chip,
              on && {
                backgroundColor: `${accent}15`,
                borderColor: `${accent}50`,
              },
            ]}
          >
            <Text
              style={[sel.chipTxt, on && { color: accent, fontWeight: "700" }]}
            >
              {opt}
            </Text>
          </Pressable>
        );
      })}
    </View>
  </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditProfileScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showInfo } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<EditProfileData | null>(null);
  const [boards, setBoards] = useState<Option[]>([]);
  const [grades, setGrades] = useState<Option[]>([]);
  const [subjectOpts, setSubjectOpts] = useState<Option[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string>("");
  const [subjectModal, setSubjectModal] = useState(false);
  const [cityOpts, setCityOpts] = useState<string[]>([]);
  const [areaOpts, setAreaOpts] = useState<string[]>([]);

  // form state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [gender, setGender] = useState("");
  const [qualification, setQualification] = useState("");
  const [experience, setExperience] = useState("");
  const [permanentAddress, setPermanentAddress] = useState("");
  const [residentialAddress, setResidentialAddress] = useState("");
  const [alternatePhone, setAlternatePhone] = useState("");
  const [bio, setBio] = useState("");
  const [preferredMode, setPreferredMode] = useState("OFFLINE");
  const [city, setCity] = useState("");
  const [preferredAreas, setPreferredAreas] = useState<string[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [languagesKnown, setLanguagesKnown] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  const isVerified = data?.verificationStatus === "VERIFIED";

  const parentId = (o?: Option): string | undefined =>
    o
      ? typeof o.parent === "object"
        ? (o.parent as any)?._id
        : o.parent
      : undefined;

  // Group the selected subjects into a Board → Class → Subjects tree
  const subjectTree = (() => {
    const boardMap = new Map<
      string,
      { board: Option; grades: Map<string, { grade: Option; subs: Option[] }> }
    >();
    selectedSubjects.forEach((id) => {
      const sub = subjectOpts.find((s) => s._id === id);
      if (!sub) return;
      const grade = grades.find((g) => g._id === parentId(sub));
      const board = grade
        ? boards.find((b) => b._id === parentId(grade))
        : undefined;
      const bKey = board?._id ?? "_";
      const gKey = grade?._id ?? "_";
      if (!boardMap.has(bKey))
        boardMap.set(bKey, {
          board: board ?? ({ _id: bKey, label: "Other" } as Option),
          grades: new Map(),
        });
      const bEntry = boardMap.get(bKey)!;
      if (!bEntry.grades.has(gKey))
        bEntry.grades.set(gKey, {
          grade: grade ?? ({ _id: gKey, label: "—" } as Option),
          subs: [],
        });
      bEntry.grades.get(gKey)!.subs.push(sub);
    });
    return Array.from(boardMap.values()).map((b) => ({
      board: b.board,
      grades: Array.from(b.grades.values()),
    }));
  })();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, boardsRes, gradesRes, subsRes, citiesRes] =
        await Promise.all([
          getMyProfileForEdit(),
          getOptions("BOARD"),
          getOptions("GRADE"),
          getOptions("SUBJECT"),
          getOptions("CITY"),
        ]);
      const p = profileRes.data;
      setData(p);
      setFullName(p.fullName);
      setEmail(p.email);
      setPhoneNumber(p.phoneNumber);
      setGender(p.gender);
      setQualification(p.qualification);
      setExperience(p.experience);
      setPermanentAddress(p.permanentAddress);
      setResidentialAddress(p.residentialAddress);
      setAlternatePhone(p.alternatePhone);
      setBio(p.bio);
      setPreferredMode(p.preferredMode);
      setCity(p.city);
      setPreferredAreas(p.preferredAreas);
      setLanguagesKnown(p.languagesKnown);
      setSkills(p.skills);
      const b = boardsRes?.data ?? [];
      setBoards(b);
      if (b.length > 0) setActiveBoardId(b[0]._id);
      setGrades(gradesRes?.data ?? []);
      setSubjectOpts(subsRes?.data ?? []);
      setCityOpts((citiesRes?.data ?? []).map((o: Option) => o.label));
      if (p.city) loadAreas(p.city);
      // subjects from profile are populated objects; extract IDs
      const ids = (p.subjects ?? [])
        .map((s: any) => (typeof s === "string" ? s : s._id))
        .filter(Boolean);
      setSelectedSubjects(ids);
    } catch (e: any) {
      showError("Error", e?.message ?? "Failed to load profile");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, []);

  const toggleSubject = (id: string) =>
    setSelectedSubjects((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );

  const toggleArea = (area: string) =>
    setPreferredAreas((prev) =>
      prev.includes(area) ? prev.filter((x) => x !== area) : [...prev, area],
    );

  const loadAreas = async (c: string) => {
    try {
      const type = `AREA_${c.toUpperCase().replace(/\s+/g, "_")}`;
      const res = await getOptions(type);
      setAreaOpts((res?.data ?? []).map((o: Option) => o.label));
    } catch {
      setAreaOpts([]);
    }
  };

  const save = async () => {
    if (!fullName.trim()) {
      showInfo("Validation", "Full name is required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        bio,
        alternatePhone,
        preferredMode,
        city,
        preferredAreas,
        languagesKnown,
        skills,
        subjects: selectedSubjects,
      };
      // Only send locked fields if NOT verified (backend will reject anyway, but let's be safe)
      if (!isVerified) {
        payload.fullName = fullName;
        payload.phoneNumber = phoneNumber;
        payload.gender = gender;
        payload.qualification = qualification;
        payload.experience = experience;
        payload.permanentAddress = permanentAddress;
        payload.residentialAddress = residentialAddress;
      }
      await updateMyProfile(payload);
      showSuccess("Saved", "Profile updated successfully", () =>
        navigation.goBack(),
      );
    } catch (e: any) {
      showError("Error", e?.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#f7f7f7",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f7f7f7" }}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Hero header */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        style={[styles.hero, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.heroTitle}>Edit Profile</Text>
          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.75 },
              saving && { opacity: 0.5 },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#7C3AED" />
            ) : (
              <Text style={styles.saveBtnTxt}>Save</Text>
            )}
          </Pressable>
        </View>

        {/* Avatar + identity row */}
        <View style={styles.heroBody}>
          <View style={styles.avatar}>
            <Text style={styles.avatarTxt}>
              {fullName
                ? fullName
                    .trim()
                    .split(/\s+/)
                    .map((w: string) => w[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "?"}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName} numberOfLines={1}>
              {fullName || "Your Profile"}
            </Text>
            {isVerified ? (
              <View style={styles.verifiedBadge}>
                <Ionicons name="shield-checkmark" size={10} color="#10B981" />
                <Text style={styles.verifiedTxt}>Verified Tutor</Text>
              </View>
            ) : (
              <Text style={styles.heroSub}>
                Complete your profile to get more students
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 20 },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Personal Info ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="person-outline"
              title="Personal Info"
              accent={T.primary}
            />

            {isVerified ? (
              <LockedGrid
                fields={[
                  { label: "Full Name", value: fullName },
                  { label: "Email", value: email },
                  { label: "Phone", value: phoneNumber },
                  { label: "Gender", value: gender },
                ]}
              />
            ) : (
              <>
                <LockedField label="Email" value={email} />
                <LabeledField
                  label="Full Name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Full name"
                />
                <LabeledField
                  label="Phone"
                  value={phoneNumber}
                  onChange={setPhoneNumber}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                />
                <FieldLabel label="Gender" />
                <SingleSelect
                  options={GENDERS}
                  value={gender}
                  onChange={setGender}
                  color="#7C3AED"
                />
              </>
            )}
            <LabeledField
              label="Alternate Phone"
              value={alternatePhone}
              onChange={setAlternatePhone}
              placeholder="Optional"
              keyboardType="phone-pad"
            />
          </View>

          {/* ── Qualifications & Teaching ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="school-outline"
              title="Qualifications & Teaching"
              accent="#7C3AED"
            />

            {isVerified ? (
              <LockedGrid
                fields={[
                  { label: "Qualification", value: qualification },
                  { label: "Experience", value: experience },
                ]}
              />
            ) : (
              <>
                <LabeledField
                  label="Qualification"
                  value={qualification}
                  onChange={setQualification}
                  placeholder="e.g. B.Ed, M.Sc"
                />
                <FieldLabel label="Experience" />
                <SingleSelect
                  options={EXP_OPTIONS}
                  value={experience}
                  onChange={setExperience}
                  color="#7C3AED"
                />
              </>
            )}

            <FieldLabel label="Teaching Mode" />
            <SingleSelect
              options={MODES}
              value={preferredMode}
              onChange={setPreferredMode}
              color="#F59E0B"
            />

            <Pressable
              onPress={() => setSubjectModal(true)}
              style={[styles.subjectPickerBtn, { marginTop: 4 }]}
            >
              <View style={styles.subjectPickerLeft}>
                <Ionicons name="book-outline" size={14} color="#7C3AED" />
                <Text style={styles.subjectPickerTxt}>
                  {selectedSubjects.length === 0
                    ? "Choose subjects you teach"
                    : `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? "s" : ""} selected`}
                </Text>
              </View>
              {selectedSubjects.length > 0 ? (
                <View style={styles.subjectCount}>
                  <Text style={styles.subjectCountTxt}>
                    {selectedSubjects.length}
                  </Text>
                </View>
              ) : (
                <Ionicons name="chevron-forward" size={14} color="#7C3AED" />
              )}
            </Pressable>
            {selectedSubjects.length > 0 && (
              <View style={styles.subjTree}>
                {subjectTree.map(({ board, grades: gs }) => (
                  <View key={board._id} style={styles.subjBoard}>
                    <View style={styles.subjBoardHead}>
                      <Ionicons
                        name="school-outline"
                        size={13}
                        color={T.primary}
                      />
                      <Text style={styles.subjBoardTxt}>{board.label}</Text>
                    </View>
                    {gs.map(({ grade, subs }) => (
                      <View key={grade._id} style={styles.subjGrade}>
                        <Text style={styles.subjGradeTxt}>{grade.label}</Text>
                        <View style={styles.subjChips}>
                          {subs.map((sub) => (
                            <View
                              key={sub._id}
                              style={[
                                styles.pill,
                                {
                                  backgroundColor: `${T.primary}15`,
                                  borderColor: `${T.primary}30`,
                                },
                              ]}
                            >
                              <Text
                                style={[styles.pillTxt, { color: T.primary }]}
                              >
                                {sub.label}
                              </Text>
                            </View>
                          ))}
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* ── Location ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="location-outline"
              title="Location"
              accent="#E11D48"
            />

            <FSelect
              label="City"
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
              value={city}
              onPick={(v) => {
                setCity(v);
                setPreferredAreas([]);
                loadAreas(v);
              }}
            />

            {city ? (
              <ChipSelect
                label="Preferred Areas"
                options={
                  areaOpts.length > 0
                    ? areaOpts
                    : [
                        `${city} North`,
                        `${city} South`,
                        `${city} East`,
                        `${city} West`,
                        `${city} Central`,
                      ]
                }
                selected={preferredAreas}
                onToggle={toggleArea}
                accent="#E11D48"
              />
            ) : null}

            {isVerified ? (
              <LockedGrid
                fields={[
                  { label: "Permanent Address", value: permanentAddress },
                  { label: "Residential Address", value: residentialAddress },
                ]}
              />
            ) : (
              <>
                <LabeledField
                  label="Permanent Address"
                  value={permanentAddress}
                  onChange={setPermanentAddress}
                  placeholder="Permanent address"
                  multiline
                />
                <LabeledField
                  label="Residential Address"
                  value={residentialAddress}
                  onChange={setResidentialAddress}
                  placeholder="Residential address"
                  multiline
                />
              </>
            )}
          </View>

          {/* ── Bio & Skills ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="flash-outline"
              title="Bio & Skills"
              accent="#10B981"
            />

            <LabeledField
              label="Bio"
              value={bio}
              onChange={setBio}
              placeholder="Tell students about yourself…"
              multiline
            />

            <FieldLabel label="Languages" />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 6, paddingVertical: 2 }}
            >
              {COMMON_LANGUAGES.map((l) => {
                const on = languagesKnown.includes(l);
                return (
                  <Pressable
                    key={l}
                    onPress={() =>
                      setLanguagesKnown((p) =>
                        p.includes(l) ? p.filter((x) => x !== l) : [...p, l],
                      )
                    }
                    style={[
                      styles.pill,
                      on && {
                        backgroundColor: "#10B98120",
                        borderColor: "#10B981",
                      },
                    ]}
                  >
                    <Text style={[styles.pillTxt, on && { color: "#10B981" }]}>
                      {l}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <FieldLabel label="Skills" />
            <TagInput
              tags={skills}
              onAdd={(v) => setSkills((p) => [...p, v])}
              onRemove={(v) => setSkills((p) => p.filter((x) => x !== v))}
              placeholder="Add a skill and press enter"
              color="#10B981"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <CurriculumPickerModal
        visible={subjectModal}
        boards={boards}
        grades={grades}
        subjectOpts={subjectOpts}
        activeBoardId={activeBoardId}
        setActiveBoardId={setActiveBoardId}
        selected={selectedSubjects}
        onToggle={toggleSubject}
        onClose={() => setSubjectModal(false)}
      />
    </View>
  );
};

export default EditProfileScreen;

// ─── Select / ChipSelect Styles ───────────────────────────────────────────────
const sel = StyleSheet.create({
  box: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f7f7f7",
    marginTop: 4,
  },
  boxOpen: {
    borderColor: T.primary,
    borderWidth: 1.5,
    backgroundColor: "#fff",
  },
  val: { fontSize: 14, color: "#0a0b0d", flex: 1, fontWeight: "400" },
  placeholder: { color: "#a8acb3" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 16,
    backgroundColor: "#fff",
    marginTop: 4,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f7f7f7",
  },
  itemActive: { backgroundColor: "#eef0f3" },
  itemTxt: { fontSize: 14, color: "#0a0b0d", fontWeight: "400" },
  itemTxtActive: { color: T.primary, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 6 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#dee1e6",
    backgroundColor: "#eef0f3",
  },
  chipTxt: { fontSize: 12, color: "#5b616e", fontWeight: "500" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: { paddingHorizontal: 20, paddingBottom: 16 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 100,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.2,
  },
  saveBtn: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 100, // pill
    backgroundColor: T.primary,
    minWidth: 64,
    alignItems: "center",
  },
  saveBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  // Hero identity row
  heroBody: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 100, // full circle
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
  heroName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    letterSpacing: -0.2,
  },
  heroSub: { fontSize: 11, color: "rgba(255,255,255,0.45)", marginTop: 2 },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    backgroundColor: "rgba(5,177,105,0.18)",
    borderRadius: 100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignSelf: "flex-start",
  },
  verifiedTxt: { fontSize: 10, fontWeight: "600", color: "#05b169" },

  // ── Scroll & Cards ─────────────────────────────────────────────────────────
  scroll: { padding: 12, gap: 8 },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 24, // rounded.xl from design.md
    padding: 14,
    gap: 6,
    borderWidth: 1,
    borderColor: "#dee1e6", // hairline from design.md
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04, // single shadow tier from design.md
    shadowRadius: 12,
    elevation: 2,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eef0f3", // hairline-soft from design.md
  },
  sectionIcon: {}, // unused but kept for TS compat
  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#5b616e", // body gray from design.md
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // ── Field label ────────────────────────────────────────────────────────────
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7c828a", // muted from design.md
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 4,
    marginBottom: 2,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#eef0f3",
    borderRadius: 100,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  lockTxt: { fontSize: 9, color: "#5b616e", fontWeight: "600" },

  // ── Inputs ─────────────────────────────────────────────────────────────────
  input: {
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 12, // rounded.md from design.md
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0a0b0d", // ink from design.md
    backgroundColor: "#f7f7f7", // surface-soft
  },
  inputMulti: { height: 64, paddingTop: 10 },

  // ── Locked field ───────────────────────────────────────────────────────────
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f7f7f7", // surface-soft — neutral, not purple
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#dee1e6", // hairline
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 2,
    flex: 0,
  },
  lockedLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7c828a", // muted
    textTransform: "uppercase",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  lockedValue: {
    fontSize: 13,
    color: "#0a0b0d",
    fontWeight: "500",
    letterSpacing: 1.5,
  },
  lockedEye: {
    width: 26,
    height: 26,
    borderRadius: 100,
    backgroundColor: "#eef0f3",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  // ── Pills ──────────────────────────────────────────────────────────────────
  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100, // pill shape from design.md
    borderWidth: 1,
    borderColor: "#dee1e6",
    backgroundColor: "#eef0f3", // surface-strong
  },
  pillTxt: { fontSize: 12, fontWeight: "500", color: "#5b616e" },

  // ── Tag input ──────────────────────────────────────────────────────────────
  tagInputRow: { flexDirection: "row", gap: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0a0b0d",
    backgroundColor: "#f7f7f7",
  },
  tagAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 100,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.primary,
  },

  // ── Subject picker ─────────────────────────────────────────────────────────
  subjectPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#f7f7f7",
    marginTop: 4,
  },
  subjectPickerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  subjectPickerTxt: {
    fontSize: 13,
    color: "#5b616e",
    fontWeight: "500",
    flex: 1,
  },
  subjectCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 100,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  subjectCountTxt: { fontSize: 11, color: "#fff", fontWeight: "700" },

  // ── Selected subjects tree (Board → Class → Subjects) ──────────────────────
  subjTree: { marginTop: 10, gap: 10 },
  subjBoard: {
    borderWidth: 1,
    borderColor: "#e6e8ec",
    borderRadius: 12,
    backgroundColor: "#fbfbfc",
    padding: 12,
    gap: 10,
  },
  subjBoardHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  subjBoardTxt: {
    fontSize: 12,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  subjGrade: {
    borderLeftWidth: 2,
    borderLeftColor: `${T.primary}30`,
    paddingLeft: 10,
    gap: 6,
  },
  subjGradeTxt: { fontSize: 12, fontWeight: "700", color: "#5b616e" },
  subjChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },

  // ── LabeledField ──────────────────────────────────────────────────────────
  labeledBox: {
    borderWidth: 1,
    borderColor: "#dee1e6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingTop: 7,
    paddingBottom: 8,
    backgroundColor: "#f7f7f7",
    marginTop: 4,
  },
  labeledLabel: {
    fontSize: 9,
    fontWeight: "600",
    color: "#7c828a",
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  labeledInput: {
    fontSize: 14,
    color: "#0a0b0d",
    padding: 0,
    margin: 0,
  },
  labeledInputMulti: { height: 44, textAlignVertical: "top" },

  // Legacy stubs
  lockedFieldWrap: {},
  tooltip: {},
  tooltipTxt: {},
});

const cp = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 56 : 40,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  doneBtn: { fontSize: 15, fontWeight: "700", color: T.primary },
  boardBar: {
    maxHeight: 52,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  boardTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: T.border,
  },
  boardTabActive: { backgroundColor: T.primary, borderColor: T.primary },
  boardTabTxt: { fontSize: 13, fontWeight: "600", color: T.textSecondary },
  boardTabTxtActive: { color: "#fff" },
  gradeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  gradeCheck: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  gradeLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
  },
  gradeCount: { fontSize: 12, color: T.textSecondary, fontWeight: "600" },
  subChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.paper,
  },
  subChipSelected: { backgroundColor: T.primary, borderColor: T.primary },
  subChipTxt: { fontSize: 13, color: T.textSecondary, fontWeight: "500" },
  subChipTxtSelected: { color: "#fff", fontWeight: "700" },
});
