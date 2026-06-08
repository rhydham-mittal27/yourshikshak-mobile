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

const ReadonlyField = ({ value }: { value: string }) => (
  <View style={styles.readonlyField}>
    <Text style={styles.readonlyTxt} numberOfLines={1}>
      {value || "—"}
    </Text>
  </View>
);

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

// Subject picker modal
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
  const [q, setQ] = useState("");
  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={sp.backdrop}>
        <View style={sp.sheet}>
          <View style={sp.handle} />
          <View style={sp.header}>
            <Text style={sp.title}>Select Subjects</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={18} color={T.mutedFg} />
            </Pressable>
          </View>
          <View style={sp.searchRow}>
            <Ionicons name="search-outline" size={15} color={T.mutedFg} />
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="Search subjects…"
              placeholderTextColor={T.mutedFg}
              style={sp.searchInput}
            />
          </View>
          <FlatList
            data={filtered}
            keyExtractor={(s) => s._id}
            renderItem={({ item }) => {
              const on = selected.includes(item._id);
              return (
                <Pressable onPress={() => onToggle(item._id)} style={sp.item}>
                  <Text
                    style={[
                      sp.itemTxt,
                      on && { color: T.primary, fontWeight: "700" },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {on && (
                    <Ionicons
                      name="checkmark-circle"
                      size={18}
                      color={T.primary}
                    />
                  )}
                </Pressable>
              );
            }}
            contentContainerStyle={{ paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          />
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
          backgroundColor: T.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator size="large" color={T.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: T.background }}>
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

            <FieldLabel label="Full Name" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={fullName} />
            ) : (
              <Field
                value={fullName}
                onChange={setFullName}
                placeholder="Full name"
              />
            )}

            <FieldLabel label="Email" locked />
            <ReadonlyField value={email} />

            <FieldLabel label="Phone Number" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={phoneNumber} />
            ) : (
              <Field
                value={phoneNumber}
                onChange={setPhoneNumber}
                placeholder="Phone"
                keyboardType="phone-pad"
              />
            )}

            <FieldLabel label="Alternate Phone" />
            <Field
              value={alternatePhone}
              onChange={setAlternatePhone}
              placeholder="Optional alternate number"
              keyboardType="phone-pad"
            />

            <FieldLabel label="Gender" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={gender} />
            ) : (
              <SingleSelect
                options={GENDERS}
                value={gender}
                onChange={setGender}
                color="#7C3AED"
              />
            )}
          </View>

          {/* ── Qualifications ── */}
          <View style={styles.card}>
            <SectionHeader
              icon="school-outline"
              title="Qualifications & Experience"
              accent="#7C3AED"
            />

            <FieldLabel label="Highest Qualification" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={qualification} />
            ) : (
              <Field
                value={qualification}
                onChange={setQualification}
                placeholder="e.g. B.Ed, M.Sc"
              />
            )}

            <FieldLabel label="Experience" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={experience} />
            ) : (
              <SingleSelect
                options={EXP_OPTIONS}
                value={experience}
                onChange={setExperience}
                color="#7C3AED"
              />
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

            <FieldLabel label="Permanent Address" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={permanentAddress} />
            ) : (
              <Field
                value={permanentAddress}
                onChange={setPermanentAddress}
                placeholder="Permanent address"
                multiline
              />
            )}

            <FieldLabel label="Residential Address" locked={isVerified} />
            {isVerified ? (
              <ReadonlyField value={residentialAddress} />
            ) : (
              <Field
                value={residentialAddress}
                onChange={setResidentialAddress}
                placeholder="Residential address"
                multiline
              />
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

  scroll: { padding: 16, gap: 12 },

  card: {
    backgroundColor: T.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    gap: 6,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    marginTop: 2,
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
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 11,
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
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 13,
    color: T.textPrimary,
    backgroundColor: "#F8FAFC",
  },
  inputMulti: { height: 80, paddingTop: 11 },

  readonlyField: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F1F5F9",
    flexDirection: "row",
    alignItems: "center",
  },
  readonlyTxt: { fontSize: 13, color: T.mutedFg, flex: 1 },

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
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    borderColor: T.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: "#F8FAFC",
  },
  subjectPickerTxt: { fontSize: 13, color: T.mutedFg },
});

const sp = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "80%",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 13, color: T.textPrimary },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  itemTxt: { fontSize: 13, color: T.textPrimary },
});
