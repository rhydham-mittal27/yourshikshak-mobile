import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Dimensions,
  Animated,
  PanResponder,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getClassAttendance,
  submitAttendance,
  ClassAttendanceRecord,
  FinalClass,
  createShiftRequest,
  getShiftRequestsForClass,
  ShiftRequest,
} from "../../../api/client";
import { T } from "../../../constants/colors";

const { height: SCREEN_H } = Dimensions.get("window");
const SNAP_COLLAPSED  = SCREEN_H * 0.55;
const SNAP_EXPANDED   = SCREEN_H * 0.92;
const CLOSE_THRESHOLD = SCREEN_H * 0.3;

interface Props {
  visible: boolean;
  cls: FinalClass | null;
  cycle: number;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

type Tab = "history" | "shift";

const STATUS_META: Record<string, { color: string; bg: string; icon: any; label: string }> = {
  PRESENT:   { color: T.success,   bg: "#ECFDF5", icon: "checkmark-circle", label: "Present" },
  ABSENT:    { color: T.error,     bg: "#FEF2F2", icon: "close-circle",     label: "Absent" },
  HOLIDAY:   { color: "#F59E0B",   bg: "#FFFBEB", icon: "sunny",            label: "Holiday" },
  CANCELLED: { color: "#94A3B8",   bg: "#F8FAFC", icon: "ban",              label: "Cancelled" },
  LATE:      { color: "#8B5CF6",   bg: "#F5F3FF", icon: "time",             label: "Late" },
};

const fmt     = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
const dayName = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });

const todayStr = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
};

const isTodayClassDay = (cls: FinalClass | null): boolean => {
  const schedule = (cls as any)?.schedule;
  if (!schedule || !Array.isArray(schedule.daysOfWeek) || !schedule.daysOfWeek.length) return true;
  const days = ["SUNDAY","MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY"];
  return schedule.daysOfWeek.includes(days[new Date().getDay()]);
};

const subjectLabel = (cls: FinalClass | null) => {
  if (!cls || !cls.subject?.length) return "â€”";
  return (Array.isArray(cls.subject) ? cls.subject : [cls.subject])
    .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
    .filter(Boolean).join(", ");
};

const AttendanceSheetModal: React.FC<Props> = ({ visible, cls, cycle, onClose, onSubmitSuccess }) => {
  const [tab, setTab] = useState<Tab>("history");
  const [kbHeight, setKbHeight] = useState(0);
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

  const [records, setRecords]         = useState<ClassAttendanceRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError]     = useState<string | null>(null);

  const [topic, setTopic]                   = useState("");
  const [notes, setNotes]                   = useState("");
  const [studentStatus, setStudentStatus]   = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [submitting, setSubmitting]         = useState(false);
  const [submitError, setSubmitError]       = useState<string | null>(null);
  const [alreadyMarked, setAlreadyMarked]   = useState(false);
  const [checkingMark, setCheckingMark]     = useState(false);
  const [submitSuccess, setSubmitSuccess]   = useState(false);

  // Shift request state
  const [shiftDays, setShiftDays]             = useState("");
  const [shiftReason, setShiftReason]         = useState("");
  const [shiftRequests, setShiftRequests]     = useState<ShiftRequest[]>([]);
  const [shiftLoading, setShiftLoading]       = useState(false);
  const [shiftError, setShiftError]           = useState<string | null>(null);
  const [shiftSubmitting, setShiftSubmitting] = useState(false);
  const [shiftSuccess, setShiftSuccess]       = useState(false);

  const classDay = isTodayClassDay(cls);

  // â”€â”€ Animation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const sheetH  = useRef(new Animated.Value(0)).current;
  const startH  = useRef(SNAP_COLLAPSED);

  const open = () =>
    Animated.spring(sheetH, { toValue: SNAP_COLLAPSED, useNativeDriver: false, damping: 22, stiffness: 280, mass: 0.8 }).start();

  const close = () =>
    Animated.timing(sheetH, { toValue: 0, duration: 220, useNativeDriver: false }).start(onClose);

  useEffect(() => { if (visible) { sheetH.setValue(0); open(); } }, [visible]);

  // â”€â”€ PanResponder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 5,
      onPanResponderGrant: () => { (sheetH as any)._value !== undefined && (startH.current = (sheetH as any)._value); },
      onPanResponderMove: (_, g) => {
        const next = startH.current - g.dy;
        sheetH.setValue(Math.max(80, Math.min(SNAP_EXPANDED, next)));
      },
      onPanResponderRelease: (_, g) => {
        const cur = (sheetH as any)._value as number;
        if (cur < CLOSE_THRESHOLD || g.vy > 0.8) {
          close();
        } else if (g.vy < -0.6 || cur > SCREEN_H * 0.78) {
          Animated.spring(sheetH, { toValue: SNAP_EXPANDED, useNativeDriver: false, damping: 22, stiffness: 280 }).start();
        } else {
          Animated.spring(sheetH, { toValue: SNAP_COLLAPSED, useNativeDriver: false, damping: 22, stiffness: 280 }).start();
        }
      },
    })
  ).current;

  // â”€â”€ Data loading â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  useEffect(() => {
    if (!visible || !cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    if (!id) return;
    setHistLoading(true); setHistError(null); setRecords([]);
    getClassAttendance(id)
      .then((res) => {
        const all = res.data || [];
        const filtered = all.filter((r) => {
          const sc = Number(r._sheetCycle);
          return Number.isFinite(sc) ? sc === cycle : true;
        });
        setRecords(filtered.slice().sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime()));
        const today = new Date();
        setAlreadyMarked(all.some((r) => new Date(r.sessionDate).toDateString() === today.toDateString()));
      })
      .catch((e) => setHistError(e?.message || "Failed to load attendance"))
      .finally(() => setHistLoading(false));
  }, [visible, cls, cycle]);

  useEffect(() => {
    if (visible) {
      setTopic(""); setNotes(""); setStudentStatus("PRESENT");
      setSubmitError(null); setSubmitSuccess(false); setTab("history");
      setShiftDays(""); setShiftReason(""); setShiftError(null); setShiftSuccess(false);
      setShiftRequests([]);
    }
  }, [visible]);

  // Load shift requests when shift tab is opened
  useEffect(() => {
    if (tab !== "shift" || !cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    if (!id) return;
    setShiftLoading(true); setShiftError(null);
    getShiftRequestsForClass(id)
      .then((res) => {
        const all = res.data || [];
        setShiftRequests(all.filter((r) => r.cycleNumber === cycle));
      })
      .catch((e) => setShiftError(e?.message || "Failed to load requests"))
      .finally(() => setShiftLoading(false));
  }, [tab, cls, cycle]);

  const handleSubmit = async () => {
    if (!cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    setSubmitting(true); setSubmitError(null);
    try {
      await submitAttendance(id, { studentAttendanceStatus: studentStatus, sessionDate: new Date().toISOString(), topicCovered: topic || undefined });
      setSubmitSuccess(true); setAlreadyMarked(true);
      setTimeout(() => { onSubmitSuccess?.(); close(); }, 1800);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const handleShiftSubmit = async () => {
    if (!cls) return;
    const days = parseInt(shiftDays, 10);
    if (!days || days === 0) { setShiftError("Enter a non-zero number of days"); return; }
    if (!shiftReason.trim()) { setShiftError("Reason is required"); return; }
    const id = String((cls as any)._id || (cls as any).id || "");
    setShiftSubmitting(true); setShiftError(null);
    try {
      const res = await createShiftRequest({ finalClassId: id, cycleNumber: cycle, shiftDays: days, reason: shiftReason.trim() });
      setShiftRequests((prev) => [res.data, ...prev]);
      setShiftSuccess(true); setShiftDays(""); setShiftReason("");
    } catch (e: any) {
      setShiftError(e?.message || "Failed to submit request");
    } finally {
      setShiftSubmitting(false);
    }
  };

  const present = records.filter((r) => r.studentAttendanceStatus === "PRESENT").length;
  const absent  = records.filter((r) => r.studentAttendanceStatus === "ABSENT").length;
  const rate    = records.length ? Math.round((present / records.length) * 100) : 0;

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={close}>
      <Pressable style={s.container} onPress={close} activeOpacity={1}>

        {/* Gesture-driven sheet */}
        <Animated.View style={[s.sheet, { height: sheetH, marginBottom: kbHeight }]} {...pan.panHandlers}>
            {/* Drag handle */}
            <View style={s.dragHandle} />

            {/* Header */}
            <View style={s.header}>
              <View style={s.headerRow}>
                <View style={s.headerIconBg}>
                  <Ionicons name="clipboard-outline" size={18} color={T.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.headerTitle} numberOfLines={1}>{cls?.studentName || "Attendance"}</Text>
                  <Text style={s.headerSub}>Cycle {cycle}  Â·  {subjectLabel(cls)}</Text>
                </View>
                <Pressable onPress={close} style={s.closeBtn} hitSlop={12}>
                  <Ionicons name="close" size={18} color="#64748B" />
                </Pressable>
              </View>
            </View>

            {/* Tabs */}
            <View style={s.tabRow}>
              {(["history", "shift"] as Tab[]).map((t) => {
                const icon = t === "history" ? "list-outline" : "calendar-outline";
                const label = t === "history" ? "History" : "Permanent Shift";
                return (
                  <Pressable key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
                    <Ionicons name={icon} size={13} color={tab === t ? T.primary : "#94A3B8"} />
                    <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>

            {/* â”€â”€ History Tab â”€â”€ */}
            {tab === "history" && (
              <>
                {!histLoading && records.length > 0 && (
                  <View style={s.statsRow}>
                    {[
                      { label: "Present", value: present, color: T.success, bg: "#ECFDF5" },
                      { label: "Absent",  value: absent,  color: T.error,   bg: "#FEF2F2" },
                      { label: "Total",   value: records.length, color: T.primary, bg: "#EFF6FF" },
                      { label: "Rate", value: `${rate}%`, color: rate >= 75 ? T.success : rate >= 50 ? "#F59E0B" : T.error, bg: "#F8FAFC" },
                    ].map((st) => (
                      <View key={st.label} style={[s.statBox, { backgroundColor: st.bg }]}>
                        <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                        <Text style={s.statLbl}>{st.label}</Text>
                      </View>
                    ))}
                  </View>
                )}
                {histLoading && <View style={s.center}><ActivityIndicator color={T.primary} size="large" /><Text style={s.centerTxt}>Loadingâ€¦</Text></View>}
                {!histLoading && histError && (
                  <View style={s.center}>
                    <View style={[s.emptyIconBg, { backgroundColor: "#FEF2F2" }]}><Ionicons name="alert-circle-outline" size={28} color={T.error} /></View>
                    <Text style={[s.centerTxt, { color: T.error }]}>{histError}</Text>
                  </View>
                )}
                {!histLoading && !histError && records.length === 0 && (
                  <View style={s.center}>
                    <View style={s.emptyIconBg}><Ionicons name="calendar-outline" size={28} color={T.primary} /></View>
                    <Text style={s.centerTxt}>No records for Cycle {cycle}</Text>
                    <Text style={s.centerSub}>Attendance will appear here once sessions are marked.</Text>
                  </View>
                )}
                {!histLoading && records.length > 0 && (
                  <ScrollView style={s.tableWrap} showsVerticalScrollIndicator={false}>
                    <View style={s.tableHead}>
                      <Text style={[s.thTxt, { flex: 1.3 }]}>Date</Text>
                      <Text style={[s.thTxt, { flex: 0.7 }]}>Day</Text>
                      <Text style={[s.thTxt, { flex: 1.1 }]}>Status</Text>
                      <Text style={[s.thTxt, { flex: 0.6 }]}>Hrs</Text>
                      <Text style={[s.thTxt, { flex: 1.8 }]}>Topic</Text>
                    </View>
                    {records.map((r, i) => {
                      const meta = STATUS_META[r.studentAttendanceStatus] ?? STATUS_META.CANCELLED;
                      return (
                        <View key={r._id || i} style={[s.row, i % 2 === 0 && s.rowAlt]}>
                          <Text style={[s.tdDate, { flex: 1.3 }]}>{fmt(r.sessionDate)}</Text>
                          <Text style={[s.tdMuted, { flex: 0.7 }]}>{dayName(r.sessionDate)}</Text>
                          <View style={[s.statusBadge, { flex: 1.1 }]}>
                            <View style={[s.statusPill, { backgroundColor: meta.bg }]}>
                              <Ionicons name={meta.icon} size={10} color={meta.color} />
                              <Text style={[s.statusPillTxt, { color: meta.color }]}>{meta.label}</Text>
                            </View>
                          </View>
                          <Text style={[s.tdMuted, { flex: 0.6 }]}>{r.durationHours ?? "â€”"}</Text>
                          <Text style={[s.tdTopic, { flex: 1.8 }]} numberOfLines={1}>{r.topicCovered || "â€”"}</Text>
                        </View>
                      );
                    })}
                    <View style={{ height: 20 }} />
                  </ScrollView>
                )}
              </>
            )}
            {/* â”€â”€ Shift Tab â”€â”€ */}
            {tab === "shift" && (
              <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
                {/* Info */}
                <View style={[s.alertBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE", marginBottom: 16 }]}>
                  <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
                  <Text style={[s.alertTxt, { color: "#1E40AF", flex: 1 }]}>
                    Request a shift for remaining <Text style={{ fontWeight: "700" }}>PLANNED</Text> sessions in Cycle {cycle}. Your coordinator will approve or reject it.
                  </Text>
                </View>

                {shiftSuccess && (
                  <View style={[s.alertBox, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0", marginBottom: 16 }]}>
                    <Ionicons name="checkmark-circle-outline" size={15} color={T.success} />
                    <Text style={[s.alertTxt, { color: "#065F46" }]}>Shift request submitted! Awaiting coordinator approval.</Text>
                  </View>
                )}

                {/* Form */}
                {!shiftSuccess && (
                  <View style={s.shiftFormCard}>
                    <Text style={s.formLabel}>SHIFT BY (DAYS)</Text>
                    <View style={s.shiftDaysRow}>
                      <Pressable
                        onPress={() => setShiftDays((v) => String((parseInt(v || "0", 10) || 0) - 1))}
                        style={s.shiftStepBtn}
                      >
                        <Ionicons name="remove" size={18} color="#475569" />
                      </Pressable>
                      <TextInput
                        style={s.shiftDaysInput}
                        keyboardType="numeric"
                        value={shiftDays}
                        onChangeText={setShiftDays}
                        placeholder="0"
                        placeholderTextColor="#94A3B8"
                        textAlign="center"
                      />
                      <Pressable
                        onPress={() => setShiftDays((v) => String((parseInt(v || "0", 10) || 0) + 1))}
                        style={s.shiftStepBtn}
                      >
                        <Ionicons name="add" size={18} color="#475569" />
                      </Pressable>
                    </View>
                    <Text style={s.inputHint}>
                      {parseInt(shiftDays || "0", 10) > 0
                        ? `Sessions will move forward by ${shiftDays} day(s)`
                        : parseInt(shiftDays || "0", 10) < 0
                        ? `Sessions will move back by ${Math.abs(parseInt(shiftDays, 10))} day(s)`
                        : "Positive = forward, negative = backward"}
                    </Text>

                    <Text style={[s.inputLabel, { marginTop: 14 }]}>REASON</Text>
                    <TextInput
                      style={[s.input, { height: 72, marginTop: 6 }]}
                      placeholder="e.g., Festival holiday, exam week..."
                      placeholderTextColor="#94A3B8"
                      value={shiftReason}
                      onChangeText={setShiftReason}
                      multiline
                      textAlignVertical="top"
                    />

                    {shiftError && (
                      <View style={[s.alertBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA", marginTop: 10 }]}>
                        <Ionicons name="alert-circle-outline" size={15} color={T.error} />
                        <Text style={[s.alertTxt, { color: "#991B1B", flex: 1 }]}>{shiftError}</Text>
                      </View>
                    )}

                    <Pressable
                      onPress={handleShiftSubmit}
                      disabled={shiftSubmitting}
                      style={[s.submitBtn, { marginTop: 14 }, shiftSubmitting && s.submitBtnDisabled]}
                    >
                      {shiftSubmitting
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Ionicons name="swap-horizontal" size={18} color="#fff" />}
                      <Text style={s.submitBtnTxt}>
                        {shiftSubmitting ? "Submittingâ€¦" : "Request Shift"}
                      </Text>
                    </Pressable>
                  </View>
                )}

                {/* Past requests for this cycle */}
                {shiftRequests.length > 0 && (
                  <>
                    <Text style={s.shiftHistTitle}>Past Requests â€” Cycle {cycle}</Text>
                    {shiftRequests.map((r, i) => {
                      const isPending  = r.status === "PENDING";
                      const isApproved = r.status === "APPROVED";
                      const color  = isPending ? "#D97706" : isApproved ? T.success : T.error;
                      const bg     = isPending ? "#FFFBEB" : isApproved ? "#ECFDF5" : "#FEF2F2";
                      const border = isPending ? "#FDE68A" : isApproved ? "#A7F3D0" : "#FECACA";
                      const icon: any = isPending ? "time-outline" : isApproved ? "checkmark-circle-outline" : "close-circle-outline";
                      return (
                        <View key={r._id || i} style={[s.shiftReqCard, { backgroundColor: bg, borderColor: border }]}>
                          <View style={s.shiftReqTop}>
                            <Ionicons name={icon} size={16} color={color} />
                            <Text style={[s.shiftReqStatus, { color }]}>{r.status}</Text>
                            <Text style={s.shiftReqDays}>
                              {r.shiftDays > 0 ? "+" : ""}{r.shiftDays} day{Math.abs(r.shiftDays) !== 1 ? "s" : ""}
                            </Text>
                          </View>
                          <Text style={s.shiftReqReason} numberOfLines={2}>{r.reason}</Text>
                          {r.rejectionReason && (
                            <Text style={s.shiftReqReject}>Rejected: {r.rejectionReason}</Text>
                          )}
                          <Text style={s.shiftReqDate}>{new Date(r.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</Text>
                        </View>
                      );
                    })}
                  </>
                )}

                {shiftLoading && (
                  <View style={s.center}><ActivityIndicator color={T.primary} /></View>
                )}
              </ScrollView>
            )}

          </Animated.View>
      </Pressable>
    </Modal>
  );
};

const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(2,8,23,0.75)",
  },
  sheet: {
    backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden",
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0",
    alignSelf: "center", marginTop: 10, marginBottom: 12,
  },
  header: { paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconBg: { width: 40, height: 40, borderRadius: 12, backgroundColor: `${T.primary}12`, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  tabRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  tabBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent" },
  tabBtnActive: { borderBottomColor: T.primary },
  tabTxt: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  tabTxtActive: { color: T.primary },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  dateStrip: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  dateTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  alertBox: { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1 },
  alertTxt: { fontSize: 12, fontWeight: "500", lineHeight: 17 },

  formCard: { backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0" },
  formLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  formValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  formSub: { fontSize: 11, color: "#64748B", marginTop: 3 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: { borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 10, fontSize: 13, color: "#0F172A", backgroundColor: "#fff", minHeight: 44 },
  inputDisabled: { backgroundColor: "#F8FAFC", color: "#94A3B8" },
  inputHint: { fontSize: 10, color: "#94A3B8", marginTop: 4 },

  statusToggleRow: { flexDirection: "row", gap: 10 },
  statusToggle: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC" },
  statusToggleTxt: { fontSize: 13, fontWeight: "600", color: "#CBD5E1" },

  submitBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, borderRadius: 100, paddingVertical: 14, marginTop: 4 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },

  statsRow: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  statVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: { fontSize: 9, color: "#94A3B8", fontWeight: "600", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 },

  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyIconBg: { width: 64, height: 64, borderRadius: 20, backgroundColor: `${T.primary}10`, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  centerTxt: { fontSize: 14, color: "#475569", fontWeight: "700", textAlign: "center" },
  centerSub: { fontSize: 12, color: "#94A3B8", textAlign: "center", paddingHorizontal: 32, lineHeight: 18 },

  tableWrap: { flex: 1 },
  tableHead: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
  thTxt: { fontSize: 9, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6 },
  row: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F8FAFC" },
  rowAlt: { backgroundColor: "#FAFAFA" },
  tdDate: { fontSize: 11, color: "#0F172A", fontWeight: "600" },
  tdMuted: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  tdTopic: { fontSize: 11, color: "#475569", fontWeight: "500" },
  statusBadge: { justifyContent: "center" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start" },
  statusPillTxt: { fontSize: 9, fontWeight: "700" },

  // Shift tab
  shiftFormCard: { backgroundColor: "#F8FAFC", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#E2E8F0", marginBottom: 20 },
  shiftDaysRow: { flexDirection: "row", alignItems: "center", gap: 0, borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 12, overflow: "hidden", marginTop: 8 },
  shiftStepBtn: { width: 48, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#F1F5F9" },
  shiftDaysInput: { flex: 1, height: 48, fontSize: 18, fontWeight: "700", color: "#0F172A", backgroundColor: "#fff" },
  shiftHistTitle: { fontSize: 11, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 10 },
  shiftReqCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  shiftReqTop: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  shiftReqStatus: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5, textTransform: "uppercase" },
  shiftReqDays: { marginLeft: "auto", fontSize: 12, fontWeight: "700", color: "#475569" },
  shiftReqReason: { fontSize: 12, color: "#475569", lineHeight: 17 },
  shiftReqReject: { fontSize: 11, color: "#991B1B", marginTop: 4, fontStyle: "italic" },
  shiftReqDate: { fontSize: 10, color: "#94A3B8", marginTop: 6 },
});

export default AttendanceSheetModal;

