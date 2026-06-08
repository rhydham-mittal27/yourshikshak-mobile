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

const SectionHeader = ({
  icon,
  title,
  accent = T.primary,
}: {
  icon: any;
  title: string;
  accent?: string;
}) => (
  <View style={styles.sectionHead}>
    <View style={[styles.sectionIcon, { backgroundColor: `${accent}12` }]}>
      <Ionicons name={icon} size={13} color={accent} />
    </View>
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

// Locked field — label only, tap to reveal value as tooltip
const LockedField = ({ label, value }: { label: string; value: string }) => {
  const [show, setShow] = React.useState(false);
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const reveal = () => {
    setShow(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 2000);
  };

  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  return (
    <Pressable onPress={reveal} style={styles.lockedFieldWrap}>
      <View style={styles.fieldLabelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.lockBadge}>
          <Ionicons name="lock-closed" size={9} color="#7C3AED" />
          <Text style={styles.lockTxt}>Locked</Text>
        </View>
        <Ionicons name="eye-outline" size={12} color="#94A3B8" style={{ marginLeft: 4 }} />
      </View>
      {show && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipTxt} numberOfLines={1}>{value || "—"}</Text>
        </View>
      )}
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
        <Text style={cp.headerTitle}>Subjects ({selected.length} selected)</Text>
        <Pressable onPress={onClose}>
          <Text style={cp.doneBtn}>Done</Text>
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
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
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
            const allSelected = gradeSubs.every((s) => selected.includes(s._id));
            const someSelected = gradeSubs.some((s) => selected.includes(s._id));
            const selectedCount = gradeSubs.filter((s) => selected.includes(s._id)).length;
            return (
              <View key={grade._id} style={{ marginBottom: 20 }}>
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
                  <View style={[cp.gradeCheck, (allSelected || someSelected) && { backgroundColor: T.primary, borderColor: T.primary }]}>
                    {allSelected && <Ionicons name="checkmark" size={12} color="#fff" />}
                    {!allSelected && someSelected && (
                      <View style={{ width: 8, height: 2, backgroundColor: "#fff", borderRadius: 1 }} />
                    )}
                  </View>
                  <Text style={cp.gradeLabel}>{grade.label}</Text>
                  <Text style={cp.gradeCount}>{selectedCount}/{gradeSubs.length}</Text>
                </Pressable>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                  {gradeSubs.map((sub) => {
                    const on = selected.includes(sub._id);
                    return (
                      <Pressable
                        key={sub._id}
                        onPress={() => onToggle(sub._id)}
                        style={[cp.subChip, on && cp.subChipSelected]}
                      >
                        <Text style={[cp.subChipTxt, on && cp.subChipTxtSelected]}>{sub.label}</Text>
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
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={14} color="#94A3B8" />
      </Pressable>
      {open && (
        <View style={sel.dropdown}>
          <ScrollView nestedScrollEnabled style={{ maxHeight: 180 }} showsVerticalScrollIndicator={false}>
            {options.map((opt) => (
              <Pressable
                key={opt}
                style={[sel.item, value === opt && sel.itemActive]}
                onPress={() => { onPick(opt); setOpen(false); }}
              >
                <Text style={[sel.itemTxt, value === opt && sel.itemTxtActive]}>{opt}</Text>
                {value === opt && <Ionicons name="checkmark-circle" size={14} color={T.primary} />}
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
            style={[sel.chip, on && { backgroundColor: `${accent}15`, borderColor: `${accent}50` }]}
          >
            <Text style={[sel.chipTxt, on && { color: accent, fontWeight: "700" }]}>{opt}</Text>
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [profileRes, boardsRes, gradesRes, subsRes, citiesRes] = await Promise.all([
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
      showSuccess("Saved", "Profile updated successfully", () => navigation.goBack());
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
          backgroundColor: "#F1F5F9",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#F1F5F9" }}>
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
        <View style={styles.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Edit Profile</Text>
            {isVerified && (
              <Text style={styles.heroSub}>
                Some fields are locked after verification
              </Text>
            )}
          </View>
          <Pressable
            onPress={save}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveBtn,
              pressed && { opacity: 0.8 },
              saving && { opacity: 0.6 },
            ]}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnTxt}>Save</Text>
            )}
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + 32 },
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
              <LockedField label="Full Name" value={fullName} />
            ) : (
              <>
                <FieldLabel label="Full Name" />
                <Field value={fullName} onChange={setFullName} placeholder="Full name" />
              </>
            )}

            <LockedField label="Email" value={email} />

            {isVerified ? (
              <LockedField label="Phone Number" value={phoneNumber} />
            ) : (
              <>
                <FieldLabel label="Phone Number" />
                <Field value={phoneNumber} onChange={setPhoneNumber} placeholder="Phone" keyboardType="phone-pad" />
              </>
            )}

            <FieldLabel label="Alternate Phone" />
            <Field
              value={alternatePhone}
              onChange={setAlternatePhone}
              placeholder="Optional alternate number"
              keyboardType="phone-pad"
            />

            {isVerified ? (
              <LockedField label="Gender" value={gender} />
            ) : (
              <>
                <FieldLabel label="Gender" />
                <SingleSelect options={GENDERS} value={gender} onChange={setGender} color="#7C3AED" />
              </>
            )}
          </View>

          {/* ── Qualifications ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="school-outline"
              title="Qualifications & Experience"
              accent="#7C3AED"
            />

            {isVerified ? (
              <LockedField label="Highest Qualification" value={qualification} />
            ) : (
              <>
                <FieldLabel label="Highest Qualification" />
                <Field value={qualification} onChange={setQualification} placeholder="e.g. B.Ed, M.Sc" />
              </>
            )}

            {isVerified ? (
              <LockedField label="Experience" value={experience} />
            ) : (
              <>
                <FieldLabel label="Experience" />
                <SingleSelect options={EXP_OPTIONS} value={experience} onChange={setExperience} color="#7C3AED" />
              </>
            )}

            <FieldLabel label="Subjects" />
            <Pressable
              onPress={() => setSubjectModal(true)}
              style={styles.subjectPickerBtn}
            >
              <Text style={styles.subjectPickerTxt}>
                {selectedSubjects.length === 0
                  ? "Tap to select subjects"
                  : `${selectedSubjects.length} subject${selectedSubjects.length > 1 ? "s" : ""} selected`}
              </Text>
              <Ionicons name="chevron-down" size={15} color={T.mutedFg} />
            </Pressable>
            {selectedSubjects.length > 0 && (
              <View style={styles.pillRow}>
                {selectedSubjects.map((id) => {
                  const sub = subjectOpts.find((s) => s._id === id);
                  return sub ? (
                    <Pressable
                      key={id}
                      onPress={() => toggleSubject(id)}
                      style={[
                        styles.pill,
                        {
                          backgroundColor: `${T.primary}15`,
                          borderColor: `${T.primary}30`,
                        },
                      ]}
                    >
                      <Text style={[styles.pillTxt, { color: T.primary }]}>
                        {sub.label}
                      </Text>
                      <Ionicons
                        name="close"
                        size={10}
                        color={T.primary}
                        style={{ marginLeft: 3 }}
                      />
                    </Pressable>
                  ) : null;
                })}
              </View>
            )}
          </View>

          {/* ── Teaching ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="tv-outline"
              title="Teaching Preferences"
              accent="#F59E0B"
            />

            <FieldLabel label="Teaching Mode" />
            <SingleSelect
              options={MODES}
              value={preferredMode}
              onChange={setPreferredMode}
              color="#F59E0B"
            />
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
              options={cityOpts.length > 0 ? cityOpts : ["Mumbai", "Delhi", "Bangalore", "Pune", "Hyderabad", "Chennai"]}
              value={city}
              onPick={(v) => { setCity(v); setPreferredAreas([]); loadAreas(v); }}
            />

            {city ? (
              <ChipSelect
                label="Preferred Areas"
                options={areaOpts.length > 0 ? areaOpts : [`${city} North`, `${city} South`, `${city} East`, `${city} West`, `${city} Central`]}
                selected={preferredAreas}
                onToggle={toggleArea}
                accent="#E11D48"
              />
            ) : null}

            {isVerified ? (
              <LockedField label="Permanent Address" value={permanentAddress} />
            ) : (
              <>
                <FieldLabel label="Permanent Address" />
                <Field value={permanentAddress} onChange={setPermanentAddress} placeholder="Permanent address" multiline />
              </>
            )}

            {isVerified ? (
              <LockedField label="Residential Address" value={residentialAddress} />
            ) : (
              <>
                <FieldLabel label="Residential Address" />
                <Field value={residentialAddress} onChange={setResidentialAddress} placeholder="Residential address" multiline />
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

            <FieldLabel label="Bio" />
            <Field
              value={bio}
              onChange={setBio}
              placeholder="Tell students about yourself…"
              multiline
            />

            <FieldLabel label="Languages Known" />
            <PillSelect
              options={COMMON_LANGUAGES}
              selected={languagesKnown}
              onToggle={(l) =>
                setLanguagesKnown((p) =>
                  p.includes(l) ? p.filter((x) => x !== l) : [...p, l],
                )
              }
              color="#10B981"
            />

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
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#fff",
    marginTop: 4,
  },
  boxOpen: { borderColor: T.primary, borderWidth: 1.5 },
  val: { fontSize: 13, color: T.textPrimary, flex: 1 },
  placeholder: { color: "#94A3B8" },
  dropdown: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    backgroundColor: "#fff",
    marginTop: 2,
    overflow: "hidden",
    shadowColor: "#1A2540",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemActive: { backgroundColor: `${T.primary}08` },
  itemTxt: { fontSize: 13, color: T.textPrimary },
  itemTxtActive: { color: T.primary, fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  chipTxt: { fontSize: 12, color: "#64748B", fontWeight: "500" },
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  hero: { paddingHorizontal: 20, paddingBottom: 20 },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 18, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  saveBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },

  scroll: { padding: 14, gap: 10 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    gap: 4,
    shadowColor: "#1A2540",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 2,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
    marginTop: 0,
  },
  sectionIcon: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: T.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: T.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#F5F3FF",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  lockTxt: { fontSize: 9, color: "#7C3AED", fontWeight: "700" },

  input: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: T.textPrimary,
    backgroundColor: "#F8FAFC",
  },
  inputMulti: { height: 72, paddingTop: 9 },

  lockedFieldWrap: { marginTop: 6 },
  tooltip: {
    marginTop: 4,
    backgroundColor: "#1E293B",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
    alignSelf: "flex-start",
  },
  tooltipTxt: { fontSize: 12, color: "#fff", fontWeight: "500" },

  pillRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    backgroundColor: T.muted,
  },
  pillTxt: { fontSize: 12, fontWeight: "600", color: T.textPrimary },

  tagInputRow: { flexDirection: "row", gap: 8 },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: T.textPrimary,
    backgroundColor: "#F8FAFC",
  },
  tagAddBtn: {
    width: 42,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: T.border,
  },

  subjectPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    backgroundColor: "#F8FAFC",
  },
  subjectPickerTxt: { fontSize: 13, color: T.mutedFg },
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
  gradeLabel: { flex: 1, fontSize: 14, fontWeight: "700", color: T.textPrimary },
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
