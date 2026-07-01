import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getChildProfile, updateChildProfile, ChildProfileData } from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Editable Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const EditableField = ({
  label,
  value,
  onChange,
  placeholder,
  maxLength,
  multiline,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  multiline?: boolean;
  hint?: string;
}) => (
  <View style={ef.wrap}>
    <Text style={ef.label}>{label}</Text>
    <TextInput
      style={[ef.input, multiline && ef.inputMulti]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={T.textDisabled}
      maxLength={maxLength}
      multiline={multiline}
      textAlignVertical={multiline ? "top" : "center"}
    />
    {hint ? <Text style={ef.hint}>{hint}</Text> : null}
  </View>
);

const ef = StyleSheet.create({
  wrap: { gap: 6, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", color: T.textSecondary },
  input: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.borderFocus,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.textPrimary,
  },
  inputMulti: { minHeight: 80, paddingTop: 12 },
  hint: { fontSize: 11, color: T.textDisabled },
});

// â”€â”€â”€ Locked Field â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const LockedField = ({
  icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <View style={lf.row}>
    <View style={lf.iconBox}>
      <Ionicons name={icon} size={14} color={T.mutedFg} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={lf.label}>{label}</Text>
      <Text style={lf.value}>{value || "â€”"}</Text>
    </View>
    <Ionicons name="lock-closed" size={13} color={T.textDisabled} />
  </View>
);

const lf = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 11, color: T.textDisabled, fontWeight: "600", marginBottom: 1 },
  value: { fontSize: 13, fontWeight: "600", color: T.textSecondary },
});

// â”€â”€â”€ Section Label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionLabel = ({
  children,
  locked,
}: {
  children: string;
  locked?: boolean;
}) => (
  <View style={sl.row}>
    <Text style={sl.txt}>{children}</Text>
    {locked && (
      <View style={sl.lockBadge}>
        <Ionicons name="lock-closed" size={9} color={T.textDisabled} />
        <Text style={sl.lockTxt}>Managed by coordinator</Text>
      </View>
    )}
  </View>
);

const sl = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 24, marginBottom: 10 },
  txt: { fontSize: 10, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.8 },
  lockBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: T.muted, borderRadius: T.radiusFull, paddingHorizontal: 8, paddingVertical: 3 },
  lockTxt: { fontSize: 10, color: T.textDisabled, fontWeight: "600" },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  navigation?: any;
}

const ChildEditProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [profile, setProfile] = useState<ChildProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // editable fields
  const [studentName, setStudentName] = useState("");
  const [notes, setNotes] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await getChildProfile();
      const d = res.data;
      setProfile(d);
      setStudentName(d.primaryStudentName || "");
      setNotes(d.notes || "");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const handleSave = async () => {
    if (!studentName.trim()) {
      Alert.alert("Required", "Child's preferred name cannot be empty.");
      return;
    }
    setSaving(true);
    try {
      await updateChildProfile({
        primaryStudentName: studentName.trim(),
        notes: notes.trim(),
      });
      Alert.alert("Saved", "Profile updated successfully.", [
        { text: "OK", onPress: () => navigation?.goBack() },
      ]);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const modeLabel = (mode: string) =>
    mode === "ONLINE" ? "Online" : mode === "OFFLINE" ? "In-person" : mode;

  const scheduleLabel = (cls: NonNullable<ChildProfileData["activeClass"]>) => {
    const days = cls.schedule?.daysOfWeek?.join(", ") ?? "";
    const time = cls.schedule?.timeSlot ?? "";
    if (days && time) return `${days} Â· ${time}`;
    return days || time || "â€”";
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 16 }]}
        >
          <View style={s.headerRow}>
            {navigation && (
              <Pressable
                onPress={() => navigation.goBack()}
                style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
                hitSlop={12}
              >
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </Pressable>
            )}
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Child Profile</Text>
              <Text style={s.headerSub}>Some fields are locked by your coordinator</Text>
            </View>
            <Pressable
              onPress={handleSave}
              disabled={saving || loading}
              style={({ pressed }) => [
                s.saveBtn,
                (saving || loading) && { opacity: 0.5 },
                pressed && { opacity: 0.7 },
              ]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.saveBtnTxt}>Save</Text>
              )}
            </Pressable>
          </View>
        </LinearGradient>

        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {loading ? (
            <View style={s.loadingWrap}>
              <ActivityIndicator color={T.primary} />
            </View>
          ) : !profile ? null : (
            <>
              {/* â”€â”€ Editable: Child Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <SectionLabel>Child Info</SectionLabel>
              <EditableField
                label="Preferred Name"
                value={studentName}
                onChange={setStudentName}
                placeholder="e.g. Aarav"
                maxLength={100}
                hint="This is how we'll refer to your child in the app."
              />
              <EditableField
                label="Notes for Tutor"
                value={notes}
                onChange={setNotes}
                placeholder="Learning preferences, health notes, special instructionsâ€¦"
                maxLength={500}
                multiline
                hint="Max 500 characters Â· Shared with your assigned tutor"
              />

              {/* â”€â”€ Locked: Class Details â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              {profile.activeClass && (
                <>
                  <SectionLabel locked>Class Details</SectionLabel>
                  <View style={s.lockedCard}>
                    <LockedField icon="person-outline"      label="Enrolled Name"  value={profile.activeClass.studentName} />
                    <LockedField icon="school-outline"      label="Grade"          value={profile.activeClass.grade} />
                    <LockedField icon="documents-outline"   label="Board"          value={profile.activeClass.board} />
                    <LockedField icon="laptop-outline"      label="Mode"           value={modeLabel(profile.activeClass.mode)} />
                    <View style={[lf.row, { borderBottomWidth: 0 }]}>
                      <View style={lf.iconBox}>
                        <Ionicons name="calendar-outline" size={14} color={T.mutedFg} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={lf.label}>Schedule</Text>
                        <Text style={lf.value}>{scheduleLabel(profile.activeClass)}</Text>
                      </View>
                      <Ionicons name="lock-closed" size={13} color={T.textDisabled} />
                    </View>
                  </View>
                  <Text style={s.lockedNote}>
                    To change grade, board, or mode â€” contact your coordinator.
                  </Text>
                </>
              )}

              {/* â”€â”€ Locked: Parent Contact â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
              <SectionLabel locked>Parent Contact</SectionLabel>
              <View style={s.lockedCard}>
                <LockedField icon="person-circle-outline" label="Name"         value={profile.parentName} />
                <LockedField icon="mail-outline"          label="Email"        value={profile.parentEmail} />
                <LockedField icon="call-outline"          label="Phone"        value={profile.parentPhone} />
                <View style={[lf.row, { borderBottomWidth: 0 }]}>
                  <View style={lf.iconBox}>
                    <Ionicons name="location-outline" size={14} color={T.mutedFg} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={lf.label}>City</Text>
                    <Text style={lf.value}>{profile.parentCity || "â€”"}</Text>
                  </View>
                  <Ionicons name="lock-closed" size={13} color={T.textDisabled} />
                </View>
              </View>
              <Text style={s.lockedNote}>
                To update contact details â€” raise a support ticket or email us.
              </Text>
            </>
          )}
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header: { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  saveBtn: {
    backgroundColor: T.primary,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: T.radiusFull,
    minWidth: 60,
    alignItems: "center",
  },
  saveBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },

  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 52 },
  loadingWrap: { alignItems: "center", paddingVertical: 48 },

  lockedCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 16,
  },
  lockedNote: {
    fontSize: 11,
    color: T.textDisabled,
    marginTop: 6,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
});

export default ChildEditProfileScreen;

