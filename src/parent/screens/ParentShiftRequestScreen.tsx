import React, { useCallback, useEffect, useRef, useState } from "react";
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
  Animated,
  Modal,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  createParentShiftRequest,
  getParentShiftRequests,
  ParentShiftRequest,
} from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ToastType = "success" | "error";
const TOAST_CFG: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: T.success, icon: "checkmark-circle" },
  error:   { bg: T.error,   icon: "alert-circle"     },
};

const Toast = ({
  visible,
  type,
  message,
  onHide,
}: {
  visible: boolean;
  type: ToastType;
  message: string;
  onHide: () => void;
}) => {
  if (!visible) return null;
  const cfg = TOAST_CFG[type];
  return (
    <Pressable onPress={onHide} style={[ts.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={18} color="#fff" />
      <Text style={ts.msg}>{message}</Text>
    </Pressable>
  );
};
const ts = StyleSheet.create({
  wrap: { position: "absolute", bottom: 32, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, zIndex: 9999, elevation: 8 },
  msg:  { flex: 1, fontSize: 14, fontWeight: "600", color: "#fff" },
});

// â”€â”€â”€ Status Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS_COLORS: Record<string, { bg: string; fg: string; label: string }> = {
  PENDING:  { bg: `${T.warning}18`, fg: T.warning, label: "Pending"  },
  APPROVED: { bg: `${T.success}18`, fg: T.success, label: "Approved" },
  REJECTED: { bg: `${T.error}15`,   fg: T.error,   label: "Rejected" },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS_COLORS[status] ?? STATUS_COLORS.PENDING;
  return (
    <View style={[sb.badge, { backgroundColor: cfg.bg }]}>
      <Text style={[sb.txt, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};
const sb = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: T.radiusFull },
  txt:   { fontSize: 11, fontWeight: "700" },
});

// â”€â”€â”€ History Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const HistoryCard = ({ item }: { item: ParentShiftRequest }) => {
  const submitted = new Date(item.createdAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
  const effective = new Date(item.effectiveDate).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  return (
    <View style={hc.card}>
      <View style={hc.top}>
        <View style={{ flex: 1 }}>
          <Text style={hc.cycle}>Cycle {item.cycleNumber} Â· +{item.shiftDays} day{item.shiftDays !== 1 ? "s" : ""}</Text>
          <Text style={hc.effective}>Effective from {effective}</Text>
        </View>
        <StatusBadge status={item.status} />
      </View>
      <Text style={hc.reason} numberOfLines={2}>{item.reason}</Text>
      {item.rejectionReason ? (
        <View style={hc.rejectBox}>
          <Ionicons name="close-circle-outline" size={13} color={T.error} />
          <Text style={hc.rejectTxt}>{item.rejectionReason}</Text>
        </View>
      ) : null}
      <Text style={hc.date}>Submitted {submitted}</Text>
    </View>
  );
};

const hc = StyleSheet.create({
  card:      { backgroundColor: T.paper, borderRadius: T.radiusXl, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 10, gap: 6 },
  top:       { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  cycle:     { fontSize: 13, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  effective: { fontSize: 12, color: T.textSecondary, marginTop: 2 },
  reason:    { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
  rejectBox: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
  rejectTxt: { fontSize: 11, color: T.error, flex: 1, lineHeight: 15 },
  date:      { fontSize: 11, color: T.textDisabled, marginTop: 2 },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  navigation?: any;
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtDate = (d: Date) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

// â”€â”€â”€ Days Stepper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Stepper = ({ value, onChange }: { value: number; onChange: (v: number) => void }) => (
  <View style={st.row}>
    <Pressable style={[st.btn, value <= 1 && { opacity: 0.4 }]} onPress={() => onChange(Math.max(1, value - 1))} disabled={value <= 1}>
      <Ionicons name="remove" size={18} color={T.textPrimary} />
    </Pressable>
    <View style={st.mid}>
      <Text style={st.val}>{value}</Text>
      <Text style={st.unit}>day{value !== 1 ? "s" : ""} later</Text>
    </View>
    <Pressable style={[st.btn, value >= 30 && { opacity: 0.4 }]} onPress={() => onChange(Math.min(30, value + 1))} disabled={value >= 30}>
      <Ionicons name="add" size={18} color={T.textPrimary} />
    </Pressable>
  </View>
);
const st = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", backgroundColor: T.paper, borderRadius: T.radiusXl, borderWidth: 1, borderColor: T.border, overflow: "hidden" },
  btn: { width: 52, height: 52, alignItems: "center", justifyContent: "center" },
  mid: { flex: 1, alignItems: "center" },
  val:  { fontSize: 22, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.5 },
  unit: { fontSize: 11, color: T.textDisabled, fontWeight: "600" },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ParentShiftRequestScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();

  const [effectiveDate, setEffectiveDate] = useState<Date>(tomorrow());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [shiftDays, setShiftDays] = useState(1);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false, type: "success", message: "",
  });
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (type: ToastType, message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ visible: true, type, message });
    toastTimer.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  };

  const [history, setHistory] = useState<ParentShiftRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 320, useNativeDriver: true }).start();
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const res = await getParentShiftRequests();
      setHistory(res.data ?? []);
    } catch (_) {
      // non-fatal
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!reason.trim()) { setFormError("Please enter a reason for the shift request."); return; }
    setFormError(null);
    setSubmitting(true);
    try {
      await createParentShiftRequest({
        effectiveDate: effectiveDate.toISOString().split("T")[0],
        shiftDays,
        reason: reason.trim(),
      });
      setReason("");
      setShiftDays(1);
      setEffectiveDate(tomorrow());
      loadHistory();
      showToast("success", "Request submitted â€” coordinator will review shortly.");
    } catch (e: any) {
      showToast("error", e?.message || "Failed to submit. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [effectiveDate, shiftDays, reason]);

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <View style={s.root}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 20 }]}
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
              <Text style={s.headerTitle}>Shift Class</Text>
              <Text style={s.headerSub}>Request to push the current cycle's sessions forward</Text>
            </View>
          </View>
        </LinearGradient>

        <Animated.ScrollView
          style={[s.scroll, { opacity: fadeAnim }]}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* â”€â”€ Form Card â”€â”€ */}
          <View style={s.formCard}>

            {formError && (
              <View style={s.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={T.error} />
                <Text style={s.errorTxt}>{formError}</Text>
              </View>
            )}

            {/* Effective Date */}
            <Text style={s.fieldLabel}>Effective From</Text>
            <Text style={s.fieldHint}>The date from which you want the shift to start</Text>
            <Pressable style={s.datePicker} onPress={() => setShowDatePicker(true)}>
              <Ionicons name="calendar-outline" size={18} color={T.primary} />
              <Text style={s.dateVal}>{fmtDate(effectiveDate)}</Text>
              <Ionicons name="chevron-forward" size={14} color={T.textDisabled} />
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={effectiveDate}
                mode="date"
                minimumDate={tomorrow()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) setEffectiveDate(date);
                }}
              />
            )}

            {/* Shift Days */}
            <Text style={[s.fieldLabel, { marginTop: 20 }]}>Shift By</Text>
            <Text style={s.fieldHint}>How many days forward should the sessions move?</Text>
            <Stepper value={shiftDays} onChange={setShiftDays} />

            {/* Reason */}
            <Text style={[s.fieldLabel, { marginTop: 20 }]}>Reason</Text>
            <TextInput
              style={s.reasonInput}
              value={reason}
              onChangeText={(v) => { setReason(v); if (formError) setFormError(null); }}
              placeholder="e.g. Family travel planned, exams that weekâ€¦"
              placeholderTextColor={T.textDisabled}
              multiline
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={s.charCount}>{reason.length}/500</Text>

            {/* Submit */}
            <Pressable
              style={[s.submitBtn, (submitting || !reason.trim()) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={submitting || !reason.trim()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="send-outline" size={16} color="#fff" />
                  <Text style={s.submitTxt}>Submit Request</Text>
                </>
              )}
            </Pressable>
          </View>

          {/* â”€â”€ History â”€â”€ */}
          <Text style={s.sectionLabel}>PAST REQUESTS</Text>
          {loadingHistory ? (
            <ActivityIndicator color={T.primary} style={{ marginVertical: 24 }} />
          ) : history.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="swap-horizontal-outline" size={32} color={T.textDisabled} />
              <Text style={s.emptyTxt}>No shift requests yet</Text>
            </View>
          ) : (
            history.map((item) => <HistoryCard key={item._id} item={item} />)
          )}
        </Animated.ScrollView>

        <Toast
          visible={toast.visible}
          type={toast.type}
          message={toast.message}
          onHide={() => setToast((t) => ({ ...t, visible: false }))}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header:    { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:   { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  headerSub:   { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 52 },

  formCard: { backgroundColor: T.paper, borderRadius: T.radiusXl, borderWidth: 1, borderColor: T.border, padding: 18, marginBottom: 24 },

  errorBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${T.error}12`, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt: { flex: 1, fontSize: 13, color: T.error, fontWeight: "600" },

  fieldLabel: { fontSize: 11, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 6 },
  fieldHint:  { fontSize: 11, color: T.textDisabled, marginBottom: 10 },

  datePicker: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.muted, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 14 },
  dateVal:    { flex: 1, fontSize: 14, fontWeight: "700", color: T.textPrimary },

  reasonInput: { backgroundColor: T.background, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.borderFocus, paddingHorizontal: 14, paddingVertical: 12, fontSize: 13, color: T.textPrimary, minHeight: 90 },
  charCount:   { fontSize: 10, color: T.textDisabled, textAlign: "right", marginTop: 4 },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, borderRadius: T.radiusFull, paddingVertical: 14, marginTop: 18 },
  submitTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  sectionLabel: { fontSize: 10, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  emptyBox:     { alignItems: "center", gap: 10, paddingVertical: 36 },
  emptyTxt:     { fontSize: 13, color: T.textDisabled, fontWeight: "600" },
});

export default ParentShiftRequestScreen;

