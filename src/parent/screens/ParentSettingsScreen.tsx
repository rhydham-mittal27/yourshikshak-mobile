import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Switch,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { requestTutorChange } from "../../api/client";
import { T } from "../../constants/colors";

type SettingsNavProps = {
  navigation?: any;
  userId?: string;
  name?: string;
  role?: string;
  route?: any;
  [key: string]: any;
};

type SectionItem = {
  icon: string;
  label: string;
  sub?: string;
  onPress?: () => void;
  toggle?: boolean;
  toggleValue?: boolean;
  onToggle?: (v: boolean) => void;
  chevron?: boolean;
  danger?: boolean;
};

const SectionBlock = ({ title, items }: { title: string; items: SectionItem[] }) => (
  <View style={s.section}>
    <Text style={s.sectionTitle}>{title}</Text>
    <View style={s.sectionCard}>
      {items.map((item, i) => (
        <Pressable
          key={i}
          style={[s.row, i < items.length - 1 && s.rowBorder]}
          onPress={item.onPress}
          disabled={item.toggle}
          android_ripple={{ color: "#0001" }}
        >
          <View style={[s.iconBox, { backgroundColor: item.danger ? `${T.error}12` : `${T.primary}10` }]}>
            <Ionicons
              name={item.icon as any}
              size={18}
              color={item.danger ? T.error : T.primary}
            />
          </View>
          <View style={s.rowContent}>
            <Text style={[s.rowLabel, item.danger && { color: T.error }]}>{item.label}</Text>
            {item.sub ? <Text style={s.rowSub}>{item.sub}</Text> : null}
          </View>
          {item.toggle ? (
            <Switch
              value={item.toggleValue}
              onValueChange={item.onToggle}
              trackColor={{ true: T.primary, false: T.muted }}
              thumbColor="#fff"
            />
          ) : item.chevron !== false ? (
            <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
          ) : null}
        </Pressable>
      ))}
    </View>
  </View>
);

const ParentSettingsScreen = ({ navigation, name }: SettingsNavProps = {}) => {
  const insets = useSafeAreaInsets();
  const [classNotifs, setClassNotifs] = useState(true);
  const [progressNotifs, setProgressNotifs] = useState(true);

  // Tutor change modal
  const [tutorChangeVisible, setTutorChangeVisible] = useState(false);
  const [tutorChangeReason, setTutorChangeReason] = useState("");
  const [tutorChangeSubmitting, setTutorChangeSubmitting] = useState(false);
  const [tutorChangeError, setTutorChangeError] = useState<string | null>(null);
  const [tutorChangeDone, setTutorChangeDone] = useState(false);

  const APP_VERSION = "1.0.0";

  const handleRaiseTicket = () => {
    // placeholder
  };

  const handleContactCoordinator = () => {
    // placeholder
  };

  const openTutorChangeModal = () => {
    setTutorChangeReason("");
    setTutorChangeError(null);
    setTutorChangeDone(false);
    setTutorChangeVisible(true);
  };

  const submitTutorChange = async () => {
    if (!tutorChangeReason.trim()) { setTutorChangeError("Please explain why you'd like a tutor change."); return; }
    setTutorChangeError(null);
    setTutorChangeSubmitting(true);
    try {
      await requestTutorChange({ reason: tutorChangeReason.trim() });
      setTutorChangeDone(true);
    } catch (e: any) {
      setTutorChangeError(e?.message ?? "Failed to submit. Please try again.");
    } finally {
      setTutorChangeSubmitting(false);
    }
  };

  const childProfileItems: SectionItem[] = [
    {
      icon: "person-outline",
      label: "Edit Child Profile",
      sub: "Name, grade, board preferences",
      onPress: () => navigation.navigate("ChildEditProfile"),
      chevron: true,
    },
  ];

  const classManagementItems: SectionItem[] = [
    {
      icon: "swap-horizontal-outline",
      label: "Request Class Shift",
      sub: "Move a cycle's sessions to earlier or later dates",
      onPress: () => navigation.navigate("ParentShiftRequest"),
      chevron: true,
    },
    {
      icon: "swap-horizontal-outline",
      label: "Reschedule History",
      sub: "View all reschedule requests",
      onPress: () => navigation.navigate("ParentRescheduleHistory"),
      chevron: true,
    },
    {
      icon: "people-outline",
      label: "Request Tutor Change",
      sub: "Ask coordinator for a different tutor",
      onPress: openTutorChangeModal,
      chevron: true,
    },
    {
      icon: "calendar-outline",
      label: "Class Frequency",
      sub: "3 sessions/week Â· Contact coordinator to change",
      chevron: false,
    },
  ];

  const notifItems: SectionItem[] = [
    {
      icon: "notifications-outline",
      label: "Class Reminders",
      sub: "Get notified before each session",
      toggle: true,
      toggleValue: classNotifs,
      onToggle: setClassNotifs,
    },
    {
      icon: "bar-chart-outline",
      label: "Progress Updates",
      sub: "Weekly progress summary",
      toggle: true,
      toggleValue: progressNotifs,
      onToggle: setProgressNotifs,
    },
  ];

  const supportItems: SectionItem[] = [
    {
      icon: "headset-outline",
      label: "Contact Coordinator",
      sub: "Reach your assigned coordinator",
      onPress: handleContactCoordinator,
      chevron: true,
    },
    {
      icon: "alert-circle-outline",
      label: "Raise a Support Ticket",
      sub: "Report an issue or complaint",
      onPress: handleRaiseTicket,
      chevron: true,
    },
    {
      icon: "gift-outline",
      label: "Referral Code",
      sub: "Invite friends and earn rewards",
      onPress: () => navigation.goBack(),
      chevron: true,
    },
    {
      icon: "information-circle-outline",
      label: "App Version",
      sub: `v${APP_VERSION}`,
      chevron: false,
    },
  ];

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        style={[s.header, { paddingTop: insets.top + 16 }]}
      >
        <Pressable style={s.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <View>
          <Text style={s.headerTitle}>Settings</Text>
          <Text style={s.headerSub}>Manage your account & preferences</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SectionBlock title="My Child's Profile" items={childProfileItems} />
        <SectionBlock title="Class Management" items={classManagementItems} />
        <SectionBlock title="Notification Preferences" items={notifItems} />
        <SectionBlock title="Account & Support" items={supportItems} />
        <Text style={s.footer}>YourShikshak Â· {name}</Text>
      </ScrollView>

      {/* â”€â”€ Tutor Change Modal â”€â”€ */}
      <Modal visible={tutorChangeVisible} transparent animationType="fade" onRequestClose={() => setTutorChangeVisible(false)}>
        <Pressable style={m.overlay} onPress={() => !tutorChangeSubmitting && setTutorChangeVisible(false)}>
          <Pressable style={m.box} onPress={(e) => e.stopPropagation()}>
            {tutorChangeDone ? (
              <>
                <View style={m.successIcon}>
                  <Ionicons name="checkmark-circle" size={36} color={T.success} />
                </View>
                <Text style={m.title}>Request Sent!</Text>
                <Text style={m.sub}>Your coordinator and admin have been notified by email and in-app notification. They will reach out to you within 24 hours.</Text>
                <Pressable style={m.primaryBtn} onPress={() => setTutorChangeVisible(false)}>
                  <Text style={m.primaryTxt}>Done</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={m.title}>Request Tutor Change</Text>
                <Text style={m.sub}>Your coordinator and admin will be notified immediately via email and notification.</Text>
                {tutorChangeError && (
                  <View style={m.errorBox}>
                    <Ionicons name="alert-circle-outline" size={13} color={T.error} />
                    <Text style={m.errorTxt}>{tutorChangeError}</Text>
                  </View>
                )}
                <Text style={m.label}>Reason for change</Text>
                <TextInput
                  style={m.input}
                  value={tutorChangeReason}
                  onChangeText={(v) => { setTutorChangeReason(v); setTutorChangeError(null); }}
                  placeholder="e.g. Teaching style doesn't match, scheduling conflictsâ€¦"
                  placeholderTextColor={T.textDisabled}
                  multiline
                  textAlignVertical="top"
                  maxLength={1000}
                  editable={!tutorChangeSubmitting}
                />
                <Text style={m.charCount}>{tutorChangeReason.length}/1000</Text>
                <View style={m.btns}>
                  <Pressable style={m.cancelBtn} onPress={() => setTutorChangeVisible(false)} disabled={tutorChangeSubmitting}>
                    <Text style={m.cancelTxt}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[m.primaryBtn, { flex: 1 }, (tutorChangeSubmitting || !tutorChangeReason.trim()) && { opacity: 0.5 }]}
                    onPress={submitTutorChange}
                    disabled={tutorChangeSubmitting || !tutorChangeReason.trim()}
                  >
                    {tutorChangeSubmitting
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={m.primaryTxt}>Submit Request</Text>}
                  </Pressable>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  header: { paddingHorizontal: 20, paddingBottom: 28, flexDirection: "row", alignItems: "center", gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 2 },

  scrollContent: { padding: 16, paddingBottom: 40, gap: 20 },

  section: { gap: 6 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.6, paddingLeft: 4 },
  sectionCard: { backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.border, overflow: "hidden" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: T.border },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600", color: T.textPrimary },
  rowSub: { fontSize: 12, color: T.mutedFg, marginTop: 1 },

  footer: { textAlign: "center", fontSize: 11, color: T.textDisabled, marginTop: 8 },
});

const m = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 24 },
  box:         { backgroundColor: T.paper, borderRadius: 20, padding: 24, width: "100%", gap: 12, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  successIcon: { alignItems: "center", marginBottom: 4 },
  title:       { fontSize: 17, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  sub:         { fontSize: 13, color: T.textSecondary, lineHeight: 19 },
  errorBox:    { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${T.error}12`, borderRadius: 10, padding: 10 },
  errorTxt:    { flex: 1, fontSize: 12, color: T.error, fontWeight: "600" },
  label:       { fontSize: 11, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.7 },
  input:       { backgroundColor: T.background, borderRadius: 10, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: T.textPrimary, minHeight: 100 },
  charCount:   { fontSize: 10, color: T.textDisabled, textAlign: "right", marginTop: -8 },
  btns:        { flexDirection: "row", gap: 10, marginTop: 4 },
  cancelBtn:   { flex: 1, paddingVertical: 13, borderRadius: T.radiusFull, backgroundColor: T.muted, alignItems: "center" },
  cancelTxt:   { fontSize: 14, fontWeight: "700", color: T.textSecondary },
  primaryBtn:  { paddingVertical: 13, borderRadius: T.radiusFull, backgroundColor: T.primary, alignItems: "center", justifyContent: "center" },
  primaryTxt:  { fontSize: 14, fontWeight: "700", color: "#fff" },
});

export default ParentSettingsScreen;

