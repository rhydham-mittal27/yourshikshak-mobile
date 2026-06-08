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
  getSubjects,
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

// Cascaded Subject picker: Board → Grade → Subjects
const SubjectPickerModal = ({
  visible,
  subjects,
  selected,
  onToggle,
  onClose,
}: {
  visible: boolean;
  subjects: any[];
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) => {
  const [board, setBoard] = useState<string | null>(null);
  const [grade, setGrade] = useState<string | null>(null);

  // Reset steps when modal opens
  React.useEffect(() => {
    if (visible) { setBoard(null); setGrade(null); }
  }, [visible]);

  // Derive unique boards and grades from subject metadata
  const boards = React.useMemo(() => {
    const cats = subjects.map((s) => s.category).filter(Boolean);
    return [...new Set(cats)].sort();
  }, [subjects]);

  const grades = React.useMemo(() => {
    if (!board) return [];
    const subs = subjects.filter((s) => s.category === board);
    const subcats = subs.map((s) => s.subcategory).filter(Boolean);
    return [...new Set(subcats)].sort((a, b) => {
      const num = (s: string) => parseInt(s.replace(/\D/g, ""), 10) || 0;
      return num(a) - num(b);
    });
  }, [subjects, board]);

  const filteredSubjects = React.useMemo(() => {
    if (!board) return [];
    return subjects.filter(
      (s) => s.category === board && (!grade || s.subcategory === grade),
    );
  }, [subjects, board, grade]);

  const step = !board ? 0 : !grade && grades.length > 0 ? 1 : 2;

  const STEP_LABELS = ["Board", "Grade", "Subjects"];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={sp.backdrop}>
        <View style={sp.sheet}>
          <View style={sp.handle} />

          {/* Header */}
          <View style={sp.header}>
            <View style={sp.breadcrumb}>
              {STEP_LABELS.map((lbl, i) => (
                <React.Fragment key={lbl}>
                  <Text style={[sp.crumb, i <= step && sp.crumbActive]}>{lbl}</Text>
                  {i < 2 && <Ionicons name="chevron-forward" size={10} color={i < step ? T.primary : "#CBD5E1"} />}
                </React.Fragment>
              ))}
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={sp.closeBtn}>
              <Ionicons name="close" size={16} color="#64748B" />
            </Pressable>
          </View>

          {/* Step 0: Board */}
          {step === 0 && (
            <View style={sp.body}>
              <Text style={sp.stepTitle}>Select a Board</Text>
              {boards.length === 0 ? (
                <Text style={sp.emptyTxt}>No boards available</Text>
              ) : (
                <View style={sp.gridRow}>
                  {boards.map((b) => (
                    <Pressable key={b} onPress={() => setBoard(b)} style={sp.gridCard}>
                      <View style={sp.gridIconBg}>
                        <Ionicons name="ribbon-outline" size={20} color={T.primary} />
                      </View>
                      <Text style={sp.gridLabel}>{b}</Text>
                      <Ionicons name="chevron-forward" size={12} color="#94A3B8" />
                    </Pressable>
                  ))}
                </View>
              )}
              {/* fallback: show all if no categories */}
              {boards.length === 0 && (
                <Pressable onPress={() => { setBoard("ALL"); setGrade("ALL"); }} style={sp.fallbackBtn}>
                  <Text style={sp.fallbackTxt}>Browse all subjects</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Step 1: Grade */}
          {step === 1 && (
            <View style={sp.body}>
              <View style={sp.backRow}>
                <Pressable onPress={() => setBoard(null)} style={sp.backBtn} hitSlop={8}>
                  <Ionicons name="arrow-back" size={14} color={T.primary} />
                  <Text style={sp.backTxt}>Back</Text>
                </Pressable>
                <Text style={sp.stepTitle}>{board} — Select Grade</Text>
              </View>
              <View style={sp.gradeGrid}>
                {grades.map((g) => (
                  <Pressable key={g} onPress={() => setGrade(g)}
                    style={[sp.gradePill, selected.some((id) => subjects.find((s) => s._id === id && s.subcategory === g)) && sp.gradePillActive]}>
                    <Text style={sp.gradePillTxt}>{g}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setGrade("__all__")} style={[sp.gradePill, { borderColor: "#F59E0B30", backgroundColor: "#FFFBEB" }]}>
                  <Text style={[sp.gradePillTxt, { color: "#F59E0B" }]}>All Grades</Text>
                </Pressable>
              </View>
            </View>
          )}

          {/* Step 2: Subjects */}
          {step === 2 && (
            <>
              <View style={sp.body}>
                <View style={sp.backRow}>
                  <Pressable onPress={() => setGrade(null)} style={sp.backBtn} hitSlop={8}>
                    <Ionicons name="arrow-back" size={14} color={T.primary} />
                    <Text style={sp.backTxt}>Back</Text>
                  </Pressable>
                  <Text style={sp.stepTitle} numberOfLines={1}>
                    {board}{grade && grade !== "__all__" ? ` · ${grade}` : ""}
                  </Text>
                </View>
              </View>
              <FlatList
                data={filteredSubjects}
                keyExtractor={(s) => s._id}
                renderItem={({ item }) => {
                  const on = selected.includes(item._id);
                  return (
                    <Pressable onPress={() => onToggle(item._id)}
                      style={[sp.item, on && sp.itemActive]}>
                      <View style={[sp.itemCheck, on && sp.itemCheckOn]}>
                        {on && <Ionicons name="checkmark" size={11} color="#fff" />}
                      </View>
                      <Text style={[sp.itemTxt, on && { color: T.primary, fontWeight: "700" }]}>{item.name}</Text>
                      {item.subcategory && grade === "__all__" && (
                        <Text style={sp.itemGrade}>{item.subcategory}</Text>
                      )}
                    </Pressable>
                  );
                }}
                contentContainerStyle={{ paddingBottom: 32 }}
                showsVerticalScrollIndicator={false}
              />
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const EditProfileScreen = ({ navigation }: { navigation: Nav }) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showInfo } = useModal();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<EditProfileData | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [subjectModal, setSubjectModal] = useState(false);

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
      const [profileRes, subjectsRes] = await Promise.all([
        getMyProfileForEdit(),
        getSubjects(),
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
      setSubjects(subjectsRes.data ?? []);
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
                  const sub = subjects.find((s) => s._id === id);
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
                        {sub.name}
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

            <FieldLabel label="City" />
            <Field value={city} onChange={setCity} placeholder="Your city" />

            <FieldLabel label="Preferred Areas" />
            <TagInput
              tags={preferredAreas}
              onAdd={(v) => setPreferredAreas((p) => [...p, v])}
              onRemove={(v) =>
                setPreferredAreas((p) => p.filter((x) => x !== v))
              }
              placeholder="Add area and press enter"
              color="#E11D48"
            />

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

      <SubjectPickerModal
        visible={subjectModal}
        subjects={subjects}
        selected={selectedSubjects}
        onToggle={toggleSubject}
        onClose={() => setSubjectModal(false)}
      />
    </View>
  );
};

export default EditProfileScreen;

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

const sp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "82%",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  breadcrumb: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  crumb: { fontSize: 12, color: "#94A3B8", fontWeight: "500" },
  crumbActive: { color: T.primary, fontWeight: "700" },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 14,
    flex: 1,
  },
  emptyTxt: { fontSize: 13, color: T.mutedFg, textAlign: "center", marginTop: 32 },
  // Board grid
  gridRow: { gap: 10 },
  gridCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  gridIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${T.primary}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: { flex: 1, fontSize: 14, fontWeight: "600", color: T.textPrimary },
  fallbackBtn: {
    marginTop: 16,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: `${T.primary}15`,
    borderRadius: 20,
  },
  fallbackTxt: { fontSize: 13, color: T.primary, fontWeight: "600" },
  // Back row
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: `${T.primary}12`,
    borderRadius: 8,
  },
  backTxt: { fontSize: 12, color: T.primary, fontWeight: "600" },
  // Grade pills
  gradeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  gradePill: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  gradePillActive: {
    borderColor: T.primary,
    backgroundColor: `${T.primary}12`,
  },
  gradePillTxt: { fontSize: 13, fontWeight: "600", color: "#475569" },
  // Subject list items
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  itemActive: { backgroundColor: `${T.primary}07` },
  itemCheck: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  itemCheckOn: { backgroundColor: T.primary, borderColor: T.primary },
  itemTxt: { flex: 1, fontSize: 13, color: T.textPrimary },
  itemGrade: {
    fontSize: 11,
    color: T.mutedFg,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  // Legacy (unused but kept to avoid style-not-found warnings)
  title: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  searchRow: { flexDirection: "row" },
  searchInput: { flex: 1, fontSize: 13, color: T.textPrimary },
});
