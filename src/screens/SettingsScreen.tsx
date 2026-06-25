import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";
import { deleteAccount, setAuthToken, AUTH_STORAGE_KEY } from "../api/client";

type Nav = StackNavigationProp<RootStackParamList, "Settings">;
interface Props { navigation: Nav }

const C = {
  bg:          "#F8FAFC",
  card:        "#FFFFFF",
  border:      "#E8EDF5",
  textPrimary: "#0F172A",
  textSecond:  "#64748B",
  textMuted:   "#94A3B8",
  danger:      "#EF4444",
  dangerBg:    "#FEF2F2",
  dangerBorder:"#FECACA",
};

// ─── Row types ────────────────────────────────────────────────────────────────

interface SettingRow {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBg: string;
  label: string;
  subtitle?: string;
  chevron?: boolean;
  danger?: boolean;
  onPress: () => void;
}

interface SettingSection {
  title: string;
  rows: SettingRow[];
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const sections: SettingSection[] = [
    {
      title: "Account",
      rows: [
        {
          id: "edit-profile",
          icon: "person-outline",
          iconColor: T.primary,
          iconBg: T.primary + "15",
          label: "Edit Profile",
          subtitle: "Update your name, photo, and bio",
          chevron: true,
          onPress: () => navigation.navigate("EditProfile"),
        },
      ],
    },
    {
      title: "Support",
      rows: [
        {
          id: "faq",
          icon: "help-circle-outline",
          iconColor: T.primary,
          iconBg: T.primary + "15",
          label: "Help & FAQ",
          subtitle: "Answers to common questions",
          chevron: true,
          onPress: () => navigation.navigate("FAQ"),
        },
        {
          id: "delete-account",
          icon: "trash-outline",
          iconColor: C.danger,
          iconBg: C.dangerBg,
          label: "Delete Account",
          subtitle: "Permanently remove your account and data",
          danger: true,
          chevron: true,
          onPress: () => setDeleteModalVisible(true),
        },
      ],
    },
  ];

  return (
    <View style={[s.root, { paddingTop: 0 }]}>
      {/* Hero */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top }]}
      >
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backWrap}>
            <View style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </Pressable>
          <View style={s.titleWrap}>
            <Text style={s.title}>Settings</Text>
            <Text style={s.titleSub}>Manage your account & preferences</Text>
          </View>
          {/* spacer to balance back button */}
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      {/* Content */}
      <ScrollView
        contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title.toUpperCase()}</Text>
            <View style={s.card}>
              {section.rows.map((row, idx) => (
                <React.Fragment key={row.id}>
                  {idx > 0 && <View style={s.divider} />}
                  <Pressable
                    style={({ pressed }) => [s.row, pressed && s.rowPressed]}
                    onPress={row.onPress}
                  >
                    <View style={[s.iconWrap, { backgroundColor: row.iconBg }]}>
                      <Ionicons name={row.icon} size={18} color={row.iconColor} />
                    </View>
                    <View style={s.rowText}>
                      <Text style={[s.rowLabel, row.danger && s.rowLabelDanger]}>
                        {row.label}
                      </Text>
                      {row.subtitle ? (
                        <Text style={s.rowSub}>{row.subtitle}</Text>
                      ) : null}
                    </View>
                    {row.chevron && (
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color={row.danger ? C.danger + "80" : C.textMuted}
                      />
                    )}
                  </Pressable>
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Delete account modal */}
      {deleteModalVisible && (
        <DeleteAccountModal
          onClose={() => setDeleteModalVisible(false)}
          onDeleted={() => {
            setDeleteModalVisible(false);
            navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
          }}
        />
      )}
    </View>
  );
}

// ─── Delete Account Modal ─────────────────────────────────────────────────────

function DeleteAccountModal({ onClose, onDeleted }: { onClose: () => void; onDeleted: () => void }) {
  const insets     = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [kbHeight, setKbHeight]       = useState(0);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0),
    );
    return () => { show.remove(); hide.remove(); };
  }, []);

  const confirmed = confirmText.trim() === "DELETE";

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  (_, g) => g.dy > 4,
      onPanResponderMove:   (_, g) => { if (g.dy > 0) translateY.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const handleDelete = async () => {
    if (!confirmed || loading) return;
    setError(null);
    setLoading(true);
    try {
      await deleteAccount();
      await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
      setAuthToken(null);
      onDeleted();
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={dm.backdrop} onPress={loading ? undefined : onClose}>
        <Animated.View
          style={[dm.sheet, { paddingBottom: Math.max(insets.bottom, 28), marginBottom: kbHeight, transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={dm.handle} />

          {/* Icon */}
          <View style={dm.iconCircle}>
            <Ionicons name="shield-outline" size={28} color={C.danger} />
          </View>

          {/* Title */}
          <Text style={dm.title}>Delete Your Account</Text>

          {/* Retention notice */}
          <View style={dm.retentionCard}>
            <Ionicons name="time-outline" size={16} color="#92400E" style={{ marginTop: 1 }} />
            <Text style={dm.retentionText}>
              Your account data will be securely retained for{" "}
              <Text style={dm.retentionBold}>30 days</Text> from the date of deletion. Should you change your mind within this period, please contact our support team to restore your account. After 30 days, all associated data will be{" "}
              <Text style={dm.retentionBold}>permanently and irreversibly erased</Text>.
            </Text>
          </View>

          {/* What gets deleted */}
          <Text style={dm.sectionLabel}>THE FOLLOWING WILL BE REMOVED</Text>
          <View style={dm.listCard}>
            {[
              { icon: "book-outline",     label: "All active and past classes" },
              { icon: "calendar-outline", label: "Scheduled & completed sessions" },
              { icon: "videocam-outline", label: "Demo history & feedback" },
              { icon: "person-outline",   label: "Profile, bio & documents" },
              { icon: "cash-outline",     label: "Earnings & payment records" },
            ].map((item) => (
              <View key={item.label} style={dm.listRow}>
                <View style={dm.listIconWrap}>
                  <Ionicons name={item.icon as any} size={13} color={C.danger} />
                </View>
                <Text style={dm.listLabel}>{item.label}</Text>
              </View>
            ))}
          </View>

          {/* Confirmation input */}
          <Text style={dm.confirmPrompt}>
            To confirm, type <Text style={dm.confirmWord}>DELETE</Text> below
          </Text>
          <TextInput
            style={[dm.confirmInput, confirmed && dm.confirmInputActive]}
            value={confirmText}
            onChangeText={setConfirmText}
            placeholder="Type DELETE to confirm"
            placeholderTextColor={C.textMuted}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!loading}
          />

          {error ? <Text style={dm.errorText}>{error}</Text> : null}

          {/* Actions */}
          <View style={dm.actions}>
            <Pressable style={dm.cancelBtn} onPress={onClose} disabled={loading}>
              <Text style={dm.cancelTxt}>Keep Account</Text>
            </Pressable>
            <Pressable
              style={[dm.deleteBtn, (!confirmed || loading) && dm.deleteBtnDisabled]}
              onPress={handleDelete}
              disabled={!confirmed || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                  <Text style={dm.deleteTxt}>Delete Account</Text>
                </>
              )}
            </Pressable>
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backWrap: { width: 36 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  titleWrap: { flex: 1, alignItems: "center" },
  title:     { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  titleSub:  { color: "rgba(255,255,255,0.65)", fontSize: 11, marginTop: 2 },

  list: { paddingHorizontal: 16, paddingTop: 24 },

  section:      { marginBottom: 24 },
  sectionTitle: {
    fontSize: 10, fontWeight: "800", letterSpacing: 1.2,
    color: C.textMuted, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  divider: { height: 1, backgroundColor: C.border, marginLeft: 60 },
  row: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14, gap: 12,
  },
  rowPressed:     { backgroundColor: "#F1F5F9" },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  rowText:        { flex: 1 },
  rowLabel:       { color: C.textPrimary, fontSize: 14, fontWeight: "600" },
  rowLabelDanger: { color: C.danger },
  rowSub:         { color: C.textMuted, fontSize: 11, marginTop: 2 },
});

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingHorizontal: 24, paddingTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 24, elevation: 20,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center", marginBottom: 20,
  },

  iconCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: C.dangerBg,
    borderWidth: 1.5, borderColor: C.dangerBorder,
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: 14,
  },
  title: {
    color: C.textPrimary, fontSize: 19, fontWeight: "800",
    textAlign: "center", marginBottom: 14, letterSpacing: -0.3,
  },

  retentionCard: {
    flexDirection: "row", gap: 10,
    backgroundColor: "#FFFBEB",
    borderWidth: 1, borderColor: "#FDE68A",
    borderRadius: 14, padding: 14, marginBottom: 18,
  },
  retentionText: {
    flex: 1, color: "#78350F", fontSize: 12.5, lineHeight: 19,
  },
  retentionBold: { fontWeight: "700", color: "#92400E" },

  sectionLabel: {
    fontSize: 9.5, fontWeight: "800", letterSpacing: 1.1,
    color: C.textMuted, marginBottom: 8,
  },
  listCard: {
    backgroundColor: C.dangerBg, borderRadius: 14,
    borderWidth: 1, borderColor: C.dangerBorder,
    padding: 14, gap: 10, marginBottom: 20,
  },
  listRow:      { flexDirection: "row", alignItems: "center", gap: 10 },
  listIconWrap: { width: 24, height: 24, borderRadius: 7, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  listLabel:    { color: "#B91C1C", fontSize: 12, fontWeight: "500" },

  confirmPrompt: {
    fontSize: 12.5, color: C.textSecond, marginBottom: 8,
  },
  confirmWord: { fontWeight: "700", color: C.danger, fontFamily: "monospace" },
  confirmInput: {
    borderWidth: 1.5, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, fontWeight: "600", color: C.textPrimary,
    letterSpacing: 1, marginBottom: 8,
  },
  confirmInputActive: { borderColor: C.danger, backgroundColor: "#FEF2F2" },

  errorText: {
    color: C.danger, fontSize: 12, marginBottom: 10, textAlign: "center",
  },

  actions:   { flexDirection: "row", gap: 10, marginTop: 8 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelTxt: { color: C.textSecond, fontSize: 14, fontWeight: "700" },
  deleteBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.danger,
  },
  deleteBtnDisabled: { backgroundColor: "#FCA5A5" },
  deleteTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
