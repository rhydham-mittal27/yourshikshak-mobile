import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getClassAttendance,
  submitAttendance,
  ClassAttendanceRecord,
  FinalClass,
} from "../../api/client";
import { T } from "../../constants/colors";

interface Props {
  visible: boolean;
  cls: FinalClass | null;
  cycle: number;
  onClose: () => void;
  onSubmitSuccess?: () => void;
}

type Tab = "submit" | "history";

const STATUS_META: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  PRESENT: { color: T.success, bg: "#ECFDF5", icon: "checkmark-circle", label: "Present" },
  ABSENT: { color: T.error, bg: "#FEF2F2", icon: "close-circle", label: "Absent" },
  HOLIDAY: { color: "#F59E0B", bg: "#FFFBEB", icon: "sunny", label: "Holiday" },
  CANCELLED: { color: "#94A3B8", bg: "#F8FAFC", icon: "ban", label: "Cancelled" },
  LATE: { color: "#8B5CF6", bg: "#F5F3FF", icon: "time", label: "Late" },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const dayName = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });

const todayStr = () => {
  const d = new Date();
  return `${d.getDate().toString().padStart(2, "0")} ${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
};

const isTodayClassDay = (cls: FinalClass | null): boolean => {
  const schedule = (cls as any)?.schedule;
  if (!schedule || !Array.isArray(schedule.daysOfWeek) || !schedule.daysOfWeek.length) return true;
  const days = ["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  return schedule.daysOfWeek.includes(days[new Date().getDay()]);
};

const subjectLabel = (cls: FinalClass | null) => {
  if (!cls || !cls.subject?.length) return "—";
  return (Array.isArray(cls.subject) ? cls.subject : [cls.subject])
    .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
    .filter(Boolean)
    .join(", ");
};

const AttendanceSheetModal: React.FC<Props> = ({ visible, cls, cycle, onClose, onSubmitSuccess }) => {
  const [tab, setTab] = useState<Tab>("submit");

  // History state
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [histLoading, setHistLoading] = useState(false);
  const [histError, setHistError] = useState<string | null>(null);

  // Submit state
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [studentStatus, setStudentStatus] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [alreadyMarked, setAlreadyMarked] = useState(false);
  const [checkingMark, setCheckingMark] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const classDay = isTodayClassDay(cls);

  // Load history
  useEffect(() => {
    if (!visible || !cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    if (!id) return;
    setHistLoading(true);
    setHistError(null);
    setRecords([]);
    getClassAttendance(id)
      .then((res) => {
        const all = res.data || [];
        const filtered = all.filter((r) => {
          const sc = Number(r._sheetCycle);
          return Number.isFinite(sc) ? sc === cycle : true;
        });
        setRecords(
          filtered.slice().sort((a, b) =>
            new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime(),
          ),
        );

        // Check if today already marked
        setCheckingMark(true);
        const today = new Date();
        const marked = all.some((r) => {
          const d = new Date(r.sessionDate);
          return d.toDateString() === today.toDateString();
        });
        setAlreadyMarked(marked);
        setCheckingMark(false);
      })
      .catch((e) => setHistError(e?.message || "Failed to load attendance"))
      .finally(() => setHistLoading(false));
  }, [visible, cls, cycle]);

  // Reset submit form on open
  useEffect(() => {
    if (visible) {
      setTopic("");
      setNotes("");
      setStudentStatus("PRESENT");
      setSubmitError(null);
      setSubmitSuccess(false);
      setTab("submit");
    }
  }, [visible]);

  const handleSubmit = async () => {
    if (!cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitAttendance(id, {
        studentAttendanceStatus: studentStatus,
        sessionDate: new Date().toISOString(),
        topicCovered: topic || undefined,
      });
      setSubmitSuccess(true);
      setAlreadyMarked(true);
      setTimeout(() => {
        onSubmitSuccess?.();
        onClose();
      }, 1800);
    } catch (e: any) {
      setSubmitError(e?.message || "Failed to submit attendance");
    } finally {
      setSubmitting(false);
    }
  };

  const present = records.filter((r) => r.studentAttendanceStatus === "PRESENT").length;
  const absent = records.filter((r) => r.studentAttendanceStatus === "ABSENT").length;
  const rate = records.length ? Math.round((present / records.length) * 100) : 0;

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={s.kav}
      >
        <Pressable style={s.overlay} onPress={onClose} />
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.dragHandle} />
            <View style={s.headerRow}>
              <View style={s.headerIconBg}>
                <Ionicons name="clipboard-outline" size={18} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.headerTitle}>{cls?.studentName || "Attendance"}</Text>
                <Text style={s.headerSub}>Cycle {cycle}  ·  {subjectLabel(cls)}</Text>
              </View>
              <Pressable onPress={onClose} style={s.closeBtn} hitSlop={12}>
                <Ionicons name="close" size={18} color="#64748B" />
              </Pressable>
            </View>
          </View>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(["submit", "history"] as Tab[]).map((t) => (
              <Pressable key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
                <Ionicons
                  name={t === "submit" ? "add-circle-outline" : "list-outline"}
                  size={13}
                  color={tab === t ? T.primary : "#94A3B8"}
                />
                <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>
                  {t === "submit" ? "Submit" : "History"}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ── Submit Tab ── */}
          {tab === "submit" && (
            <ScrollView style={s.body} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
              {/* Date strip */}
              <View style={s.dateStrip}>
                <Ionicons name="calendar-outline" size={13} color="#64748B" />
                <Text style={s.dateTxt}>Today: {todayStr()}</Text>
              </View>

              {/* Warnings */}
              {!classDay && (
                <View style={[s.alertBox, { backgroundColor: "#FFFBEB", borderColor: "#FDE68A" }]}>
                  <Ionicons name="warning-outline" size={15} color="#D97706" />
                  <Text style={[s.alertTxt, { color: "#92400E" }]}>
                    Today is not a scheduled day for this class.
                  </Text>
                </View>
              )}
              {alreadyMarked && (
                <View style={[s.alertBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
                  <Ionicons name="information-circle-outline" size={15} color="#2563EB" />
                  <Text style={[s.alertTxt, { color: "#1E40AF" }]}>
                    Attendance for today has already been marked.
                  </Text>
                </View>
              )}
              {submitSuccess && (
                <View style={[s.alertBox, { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" }]}>
                  <Ionicons name="checkmark-circle-outline" size={15} color={T.success} />
                  <Text style={[s.alertTxt, { color: "#065F46" }]}>
                    Attendance submitted successfully!
                  </Text>
                </View>
              )}

              {/* Class info */}
              <View style={s.formCard}>
                <Text style={s.formLabel}>CLASS</Text>
                <Text style={s.formValue}>{cls?.studentName}</Text>
                <Text style={s.formSub}>
                  {cls ? subjectLabel(cls) : "—"} · Grade {cls?.grade} · {cls?.completedSessions ?? 0}/{cls?.classesPerMonth ?? cls?.totalSessions ?? "?"} sessions
                </Text>
              </View>

              {/* Topic */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Topic Covered</Text>
                <TextInput
                  style={[s.input, alreadyMarked && s.inputDisabled]}
                  placeholder="e.g., Trigonometry — Heights & Distances"
                  placeholderTextColor="#94A3B8"
                  value={topic}
                  onChangeText={setTopic}
                  editable={!alreadyMarked}
                  multiline
                  numberOfLines={2}
                />
                <Text style={s.inputHint}>Briefly describe what was taught</Text>
              </View>

              {/* Student status */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Student Attendance</Text>
                <View style={s.statusToggleRow}>
                  {(["PRESENT", "ABSENT"] as const).map((st) => {
                    const meta = STATUS_META[st];
                    const active = studentStatus === st;
                    return (
                      <Pressable
                        key={st}
                        onPress={() => !alreadyMarked && setStudentStatus(st)}
                        style={[
                          s.statusToggle,
                          active && { backgroundColor: meta.bg, borderColor: meta.color },
                        ]}
                      >
                        <Ionicons name={meta.icon} size={16} color={active ? meta.color : "#CBD5E1"} />
                        <Text style={[s.statusToggleTxt, active && { color: meta.color, fontWeight: "700" }]}>
                          {meta.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Notes */}
              <View style={s.inputGroup}>
                <Text style={s.inputLabel}>Notes (Optional)</Text>
                <TextInput
                  style={[s.input, { height: 72 }, alreadyMarked && s.inputDisabled]}
                  placeholder="Any additional remarks about this session"
                  placeholderTextColor="#94A3B8"
                  value={notes}
                  onChangeText={setNotes}
                  editable={!alreadyMarked}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Error */}
              {submitError && (
                <View style={[s.alertBox, { backgroundColor: "#FEF2F2", borderColor: "#FECACA" }]}>
                  <Ionicons name="alert-circle-outline" size={15} color={T.error} />
                  <Text style={[s.alertTxt, { color: "#991B1B", flex: 1 }]}>{submitError}</Text>
                </View>
              )}

              {/* Submit button */}
              <Pressable
                onPress={handleSubmit}
                disabled={submitting || checkingMark || alreadyMarked || !classDay || submitSuccess}
                style={[
                  s.submitBtn,
                  (submitting || alreadyMarked || !classDay || submitSuccess) && s.submitBtnDisabled,
                ]}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                )}
                <Text style={s.submitBtnTxt}>
                  {submitting ? "Submitting…" : checkingMark ? "Checking…" : alreadyMarked ? "Already Marked" : submitSuccess ? "Submitted!" : "Submit Attendance"}
                </Text>
              </Pressable>
            </ScrollView>
          )}

          {/* ── History Tab ── */}
          {tab === "history" && (
            <>
              {/* Stats */}
              {!histLoading && records.length > 0 && (
                <View style={s.statsRow}>
                  {[
                    { label: "Present", value: present, color: T.success, bg: "#ECFDF5" },
                    { label: "Absent", value: absent, color: T.error, bg: "#FEF2F2" },
                    { label: "Total", value: records.length, color: T.primary, bg: "#EFF6FF" },
                    {
                      label: "Rate",
                      value: `${rate}%`,
                      color: rate >= 75 ? T.success : rate >= 50 ? "#F59E0B" : T.error,
                      bg: "#F8FAFC",
                    },
                  ].map((st) => (
                    <View key={st.label} style={[s.statBox, { backgroundColor: st.bg }]}>
                      <Text style={[s.statVal, { color: st.color }]}>{st.value}</Text>
                      <Text style={s.statLbl}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              )}

              {histLoading && (
                <View style={s.center}>
                  <ActivityIndicator color={T.primary} size="large" />
                  <Text style={s.centerTxt}>Loading attendance…</Text>
                </View>
              )}
              {!histLoading && histError && (
                <View style={s.center}>
                  <View style={[s.emptyIconBg, { backgroundColor: "#FEF2F2" }]}>
                    <Ionicons name="alert-circle-outline" size={28} color={T.error} />
                  </View>
                  <Text style={[s.centerTxt, { color: T.error }]}>{histError}</Text>
                </View>
              )}
              {!histLoading && !histError && records.length === 0 && (
                <View style={s.center}>
                  <View style={s.emptyIconBg}>
                    <Ionicons name="calendar-outline" size={28} color={T.primary} />
                  </View>
                  <Text style={s.centerTxt}>No records for Cycle {cycle}</Text>
                  <Text style={s.centerSub}>
                    Attendance will appear here once sessions are marked.
                  </Text>
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
                        <Text style={[s.tdMuted, { flex: 0.6 }]}>{r.durationHours ?? "—"}</Text>
                        <Text style={[s.tdTopic, { flex: 1.8 }]} numberOfLines={1}>
                          {r.topicCovered || "—"}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={{ height: 20 }} />
                </ScrollView>
              )}
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const s = StyleSheet.create({
  kav: { flex: 1, justifyContent: "flex-end" },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(2,8,23,0.6)" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: "70%",
    overflow: "hidden",
  },
  dragHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: "#E2E8F0",
    alignSelf: "center", marginTop: 10, marginBottom: 12,
  },
  header: {
    paddingHorizontal: 16, paddingBottom: 14,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: `${T.primary}12`, alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "700", color: "#0F172A", letterSpacing: -0.2 },
  headerSub: { fontSize: 11, color: "#94A3B8", marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center",
  },
  infoStrip: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  infoChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: `${T.primary}0E`, borderRadius: 100, paddingHorizontal: 9, paddingVertical: 4,
  },
  infoChipTxt: { fontSize: 11, color: T.primary, fontWeight: "600" },

  tabRow: {
    flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#E2E8F0", backgroundColor: "#fff",
  },
  tabBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: "transparent",
  },
  tabBtnActive: { borderBottomColor: T.primary },
  tabTxt: { fontSize: 12, fontWeight: "600", color: "#94A3B8" },
  tabTxtActive: { color: T.primary },

  body: { flex: 1, paddingHorizontal: 16, paddingTop: 14 },

  dateStrip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: "#F8FAFC", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
    marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0",
  },
  dateTxt: { fontSize: 12, color: "#64748B", fontWeight: "600" },

  alertBox: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, borderWidth: 1,
  },
  alertTxt: { fontSize: 12, fontWeight: "500", lineHeight: 17 },

  formCard: {
    backgroundColor: "#F8FAFC", borderRadius: 12, padding: 14,
    marginBottom: 14, borderWidth: 1, borderColor: "#E2E8F0",
  },
  formLabel: { fontSize: 9, fontWeight: "800", color: "#94A3B8", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  formValue: { fontSize: 14, fontWeight: "700", color: "#0F172A" },
  formSub: { fontSize: 11, color: "#64748B", marginTop: 3 },

  inputGroup: { marginBottom: 14 },
  inputLabel: { fontSize: 11, fontWeight: "700", color: "#374151", marginBottom: 6 },
  input: {
    borderWidth: 1, borderColor: "#E2E8F0", borderRadius: 10,
    paddingHorizontal: 13, paddingVertical: 10, fontSize: 13,
    color: "#0F172A", backgroundColor: "#fff", minHeight: 44,
  },
  inputDisabled: { backgroundColor: "#F8FAFC", color: "#94A3B8" },
  inputHint: { fontSize: 10, color: "#94A3B8", marginTop: 4 },

  statusToggleRow: { flexDirection: "row", gap: 10 },
  statusToggle: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 12, borderRadius: 12,
    borderWidth: 1.5, borderColor: "#E2E8F0", backgroundColor: "#F8FAFC",
  },
  statusToggleTxt: { fontSize: 13, fontWeight: "600", color: "#CBD5E1" },

  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, backgroundColor: T.primary, borderRadius: 100,
    paddingVertical: 14, marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },

  statsRow: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 12,
    gap: 8, borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  statBox: { flex: 1, alignItems: "center", paddingVertical: 10, borderRadius: 12 },
  statVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: { fontSize: 9, color: "#94A3B8", fontWeight: "600", marginTop: 3, textTransform: "uppercase", letterSpacing: 0.3 },

  center: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIconBg: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: `${T.primary}10`, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  centerTxt: { fontSize: 14, color: "#475569", fontWeight: "700", textAlign: "center" },
  centerSub: { fontSize: 12, color: "#94A3B8", textAlign: "center", paddingHorizontal: 32, lineHeight: 18 },

  tableWrap: { flex: 1 },
  tableHead: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
    backgroundColor: "#F8FAFC", borderBottomWidth: 1, borderBottomColor: "#E2E8F0",
  },
  thTxt: { fontSize: 9, fontWeight: "800", color: "#94A3B8", textTransform: "uppercase", letterSpacing: 0.6 },
  row: {
    flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10,
    alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#F8FAFC",
  },
  rowAlt: { backgroundColor: "#FAFAFA" },
  tdDate: { fontSize: 11, color: "#0F172A", fontWeight: "600" },
  tdMuted: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  tdTopic: { fontSize: 11, color: "#475569", fontWeight: "500" },
  statusBadge: { justifyContent: "center" },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 3, borderRadius: 100, alignSelf: "flex-start",
  },
  statusPillTxt: { fontSize: 9, fontWeight: "700" },
});

export default AttendanceSheetModal;
