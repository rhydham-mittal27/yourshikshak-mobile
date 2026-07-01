import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  StatusBar,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Animated,
  RefreshControl,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getTutorTests,
  getTutorCompliance,
  scheduleTest,
  submitTestReport,
  updateTestStatus,
  getMyClasses,
  getOptions,
  TestDoc,
  TestCompliance,
  FinalClass,
  Option,
} from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Constants â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEST_TYPES = [
  { value: "UNIT_TEST",    label: "Unit Test"   },
  { value: "CHAPTER_TEST", label: "Chapter Test" },
  { value: "MOCK_EXAM",    label: "Mock Exam"   },
  { value: "WEEKLY_QUIZ",  label: "Weekly Quiz" },
  { value: "PRACTICE",     label: "Practice"    },
];

const TEST_STATUS_CFG: Record<string, { bg: string; fg: string; label: string }> = {
  SCHEDULED:        { bg: `${T.info}18`,    fg: T.info,    label: "Scheduled"       },
  COMPLETED:        { bg: `${T.success}18`, fg: T.success, label: "Completed"       },
  REPORT_SUBMITTED: { bg: `${T.primary}15`, fg: T.primary, label: "Report Submitted"},
  CANCELLED:        { bg: `${T.error}15`,   fg: T.error,   label: "Cancelled"       },
};

// â”€â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ToastType = "success" | "error" | "info";
interface ToastState { visible: boolean; type: ToastType; message: string; }

const useToast = () => {
  const [toast, setToast] = useState<ToastState>({ visible: false, type: "info", message: "" });
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((type: ToastType, message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ visible: true, type, message });
    timerRef.current = setTimeout(() => setToast((t) => ({ ...t, visible: false })), 3000);
  }, []);

  const hide = useCallback(() => setToast((t) => ({ ...t, visible: false })), []);
  return { toast, show, hide };
};

const TOAST_CFG: Record<ToastType, { bg: string; icon: string; fg: string }> = {
  success: { bg: T.success, icon: "checkmark-circle",   fg: "#fff" },
  error:   { bg: T.error,   icon: "alert-circle",       fg: "#fff" },
  info:    { bg: T.primary, icon: "information-circle", fg: "#fff" },
};

const Toast = ({ state, onHide }: { state: ToastState; onHide: () => void }) => {
  const cfg = TOAST_CFG[state.type];
  if (!state.visible) return null;
  return (
    <Pressable onPress={onHide} style={[ts.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={18} color={cfg.fg} />
      <Text style={[ts.msg, { color: cfg.fg }]}>{state.message}</Text>
      <Ionicons name="close" size={14} color={cfg.fg} style={{ opacity: 0.7 }} />
    </Pressable>
  );
};
const ts = StyleSheet.create({
  wrap: { position: "absolute", bottom: 32, left: 16, right: 16, flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 14, zIndex: 9999, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 8 },
  msg:  { flex: 1, fontSize: 14, fontWeight: "600" },
});

// â”€â”€â”€ Confirm Dialog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ConfirmState {
  visible: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
}

const useConfirm = () => {
  const [dialog, setDialog] = useState<ConfirmState>({ visible: false, title: "", message: "", onConfirm: () => {} });
  const confirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setDialog({ visible: true, title, message, onConfirm });
  }, []);
  const close = useCallback(() => setDialog((d) => ({ ...d, visible: false })), []);
  return { dialog, confirm, close };
};

const ConfirmDialog = ({ state, onClose }: { state: ConfirmState; onClose: () => void }) => (
  <Modal visible={state.visible} transparent animationType="fade" onRequestClose={onClose}>
    <Pressable style={cd.overlay} onPress={onClose}>
      <Pressable style={cd.box} onPress={(e) => e.stopPropagation()}>
        <Text style={cd.title}>{state.title}</Text>
        <Text style={cd.msg}>{state.message}</Text>
        <View style={cd.btns}>
          <Pressable style={cd.cancel} onPress={onClose}>
            <Text style={cd.cancelTxt}>Cancel</Text>
          </Pressable>
          <Pressable style={cd.confirm} onPress={() => { onClose(); state.onConfirm(); }}>
            <Text style={cd.confirmTxt}>Confirm</Text>
          </Pressable>
        </View>
      </Pressable>
    </Pressable>
  </Modal>
);
const cd = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", padding: 32 },
  box:        { backgroundColor: T.paper, borderRadius: 20, padding: 24, width: "100%", shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  title:      { fontSize: 17, fontWeight: "800", color: T.textPrimary, marginBottom: 8, letterSpacing: -0.3 },
  msg:        { fontSize: 14, color: T.textSecondary, lineHeight: 20, marginBottom: 24 },
  btns:       { flexDirection: "row", gap: 10 },
  cancel:     { flex: 1, paddingVertical: 13, borderRadius: T.radiusFull, backgroundColor: T.muted, alignItems: "center" },
  cancelTxt:  { fontSize: 14, fontWeight: "700", color: T.textSecondary },
  confirm:    { flex: 1, paddingVertical: 13, borderRadius: T.radiusFull, backgroundColor: T.primary, alignItems: "center" },
  confirmTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },
});

// â”€â”€â”€ Tiny helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = TEST_STATUS_CFG[status] ?? TEST_STATUS_CFG.SCHEDULED;
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <Text style={[badge.txt, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};
const badge = StyleSheet.create({
  wrap: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: T.radiusFull },
  txt:  { fontSize: 10, fontWeight: "800", letterSpacing: 0.2 },
});

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={sl.txt}>{children}</Text>
);
const sl = StyleSheet.create({
  txt: { fontSize: 10, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 10, marginTop: 20 },
});

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const scoreColor = (pct: number) =>
  pct >= 75 ? T.success : pct >= 50 ? T.warning : T.error;

// â”€â”€â”€ Compliance Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ComplianceCard = ({
  item,
  onSchedule,
}: {
  item: TestCompliance;
  onSchedule: (item: TestCompliance) => void;
}) => {
  const pct = item.required > 0 ? item.scheduled / item.required : 1;
  const color = item.compliant ? T.success : pct > 0 ? T.warning : T.error;
  return (
    <View style={cc.card}>
      <View style={cc.dot_row}>
        <View style={[cc.dot, { backgroundColor: color }]} />
        <Text style={cc.cycle}>Cycle {item.currentCycle}</Text>
      </View>
      <Text style={cc.name} numberOfLines={1}>{item.studentName}</Text>
      <Text style={cc.grade}>{item.grade} Â· {item.board}</Text>
      <Text style={[cc.count, { color }]}>
        {item.scheduled}/{item.required} tests
      </Text>
      {!item.compliant && (
        <Pressable
          style={cc.scheduleBtn}
          onPress={() => onSchedule(item)}
        >
          <Text style={cc.scheduleBtnTxt}>+ Schedule</Text>
        </Pressable>
      )}
    </View>
  );
};
const cc = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    width: 150,
    marginRight: 10,
    gap: 3,
  },
  dot_row:      { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot:          { width: 8, height: 8, borderRadius: 4 },
  cycle:        { fontSize: 10, fontWeight: "700", color: T.textDisabled },
  name:         { fontSize: 13, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  grade:        { fontSize: 11, color: T.textSecondary },
  count:        { fontSize: 12, fontWeight: "700", marginTop: 4 },
  scheduleBtn:  { marginTop: 8, backgroundColor: `${T.primary}12`, borderRadius: T.radiusFull, paddingVertical: 5, alignItems: "center" },
  scheduleBtnTxt: { fontSize: 11, fontWeight: "800", color: T.primary },
});

// â”€â”€â”€ Test Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TestCard = ({
  item,
  onMarkDone,
  onSubmitReport,
}: {
  item: TestDoc;
  onMarkDone: (id: string) => void;
  onSubmitReport: (item: TestDoc) => void;
}) => {
  const cls = typeof item.finalClass === "object" ? item.finalClass : null;
  const pct = item.totalMarks && item.obtainedMarks != null
    ? Math.round((item.obtainedMarks / item.totalMarks) * 100)
    : null;
  const typeLabel = TEST_TYPES.find((t) => t.value === item.testType)?.label ?? item.testType ?? "Test";
  const isScheduled = item.status === "SCHEDULED";
  const isCompleted = item.status === "COMPLETED";

  return (
    <View style={tc.card}>
      <View style={tc.top}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={tc.type}>{typeLabel}</Text>
          {cls && <Text style={tc.student}>{cls.studentName}</Text>}
          <Text style={tc.date}>{fmtDate(item.testDate)} Â· {item.testTime}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 6 }}>
          <StatusBadge status={item.status} />
          {pct != null && (
            <Text style={[tc.pct, { color: scoreColor(pct) }]}>{pct}%</Text>
          )}
        </View>
      </View>

      {item.topicName ? (
        <Text style={tc.topic} numberOfLines={1}>
          <Text style={tc.topicLabel}>Topic: </Text>{item.topicName}
        </Text>
      ) : null}

      {item.totalMarks != null && item.obtainedMarks != null ? (
        <Text style={tc.marks}>
          {item.obtainedMarks} / {item.totalMarks} marks
        </Text>
      ) : item.totalMarks != null ? (
        <Text style={tc.marks}>Max: {item.totalMarks} marks</Text>
      ) : null}

      <Text style={tc.cycle}>Cycle {item.cycleNumber}</Text>

      {(isScheduled || isCompleted) && (
        <View style={tc.actions}>
          {isScheduled && (
            <Pressable
              style={[tc.actionBtn, { borderColor: T.success, backgroundColor: `${T.success}12` }]}
              onPress={() => onMarkDone(item._id)}
            >
              <Ionicons name="checkmark-circle-outline" size={14} color={T.success} />
              <Text style={[tc.actionTxt, { color: T.success }]}>Mark Done</Text>
            </Pressable>
          )}
          <Pressable
            style={[tc.actionBtn, { borderColor: T.primary, backgroundColor: `${T.primary}10` }]}
            onPress={() => onSubmitReport(item)}
          >
            <Ionicons name="document-text-outline" size={14} color={T.primary} />
            <Text style={[tc.actionTxt, { color: T.primary }]}>
              {item.status === "REPORT_SUBMITTED" ? "View Report" : "Submit Report"}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
};
const tc = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 10,
    gap: 5,
  },
  top:        { flexDirection: "row", gap: 10, marginBottom: 2 },
  type:       { fontSize: 11, fontWeight: "800", color: T.primary, textTransform: "uppercase", letterSpacing: 0.4 },
  student:    { fontSize: 14, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  date:       { fontSize: 11, color: T.textDisabled },
  pct:        { fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  topic:      { fontSize: 12, color: T.textSecondary },
  topicLabel: { fontWeight: "700" },
  marks:      { fontSize: 12, color: T.textSecondary },
  cycle:      { fontSize: 11, color: T.textDisabled },
  actions:    { flexDirection: "row", gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: T.border },
  actionBtn:  { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 9, borderRadius: T.radiusFull, borderWidth: 1.5 },
  actionTxt:  { fontSize: 12, fontWeight: "700" },
});

// â”€â”€â”€ Pill selector â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Pill = ({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) => (
  <Pressable style={[pill.btn, active && pill.active]} onPress={onPress}>
    <Text style={[pill.txt, active && pill.activeTxt]}>{label}</Text>
  </Pressable>
);
const pill = StyleSheet.create({
  btn:       { paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.radiusFull, backgroundColor: T.muted },
  active:    { backgroundColor: T.primary },
  txt:       { fontSize: 12, fontWeight: "700", color: T.textSecondary },
  activeTxt: { color: "#fff" },
});

// â”€â”€â”€ Chapter chip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ChapterChip = ({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) => (
  <Pressable
    style={[chp.chip, selected && chp.selected]}
    onPress={onPress}
  >
    {selected && <Ionicons name="checkmark" size={11} color="#fff" />}
    <Text style={[chp.txt, selected && chp.selectedTxt]} numberOfLines={1}>{label}</Text>
  </Pressable>
);
const chp = StyleSheet.create({
  chip:        { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: T.radiusFull, backgroundColor: T.muted, borderWidth: 1, borderColor: T.border },
  selected:    { backgroundColor: T.primary, borderColor: T.primary },
  txt:         { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  selectedTxt: { color: "#fff" },
});

// â”€â”€â”€ Field components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <View style={f.wrap}>
    <Text style={f.label}>{label}</Text>
    {children}
    {hint ? <Text style={f.hint}>{hint}</Text> : null}
  </View>
);
const f = StyleSheet.create({
  wrap:  { marginBottom: 16 },
  label: { fontSize: 11, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8 },
  hint:  { fontSize: 11, color: T.textDisabled, marginTop: 4 },
});

const StyledInput = ({
  value,
  onChangeText,
  placeholder,
  multiline,
  keyboardType,
  maxLength,
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: any;
  maxLength?: number;
}) => (
  <TextInput
    style={[si.input, multiline && si.multi]}
    value={value}
    onChangeText={onChangeText}
    placeholder={placeholder}
    placeholderTextColor={T.textDisabled}
    multiline={multiline}
    textAlignVertical={multiline ? "top" : "center"}
    keyboardType={keyboardType}
    maxLength={maxLength}
  />
);
const si = StyleSheet.create({
  input: {
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: T.textPrimary,
  },
  multi: { minHeight: 80, paddingTop: 12 },
});

// â”€â”€â”€ Schedule Test Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// â”€â”€â”€ Date/Time picker row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PickerRow = ({
  icon,
  label,
  value,
  onPress,
}: {
  icon: string;
  label: string;
  value: string;
  onPress: () => void;
}) => (
  <Pressable style={pr.row} onPress={onPress}>
    <Ionicons name={icon as any} size={16} color={T.primary} />
    <Text style={pr.label}>{label}</Text>
    <Text style={pr.value}>{value}</Text>
    <Ionicons name="chevron-forward" size={14} color={T.textDisabled} />
  </Pressable>
);
const pr = StyleSheet.create({
  row:   { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: T.muted, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13 },
  label: { flex: 1, fontSize: 13, color: T.textSecondary, fontWeight: "600" },
  value: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
});

// â”€â”€â”€ Schedule Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ScheduleForm {
  classId: string;
  subjectId: string;
  testType: string;
  dateObj: Date;
  timeObj: Date;
  totalMarks: string;
  testSyllabus: string;
  notes: string;
  selectedChapters: string[];
}

const mkDefaultTime = () => { const d = new Date(); d.setHours(10, 0, 0, 0); return d; };
const mkBlank = (): ScheduleForm => ({
  classId: "", subjectId: "", testType: "UNIT_TEST",
  dateObj: new Date(), timeObj: mkDefaultTime(),
  totalMarks: "", testSyllabus: "", notes: "", selectedChapters: [],
});

const fmtDateDisplay = (d: Date) =>
  d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" });

const fmtTimeDisplay = (d: Date) =>
  d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });

const ScheduleModal = ({
  visible,
  onClose,
  classes,
  preselectedClassId,
  onSuccess,
  showToast,
}: {
  visible: boolean;
  onClose: () => void;
  classes: FinalClass[];
  preselectedClassId?: string;
  onSuccess: () => void;
  showToast: (type: ToastType, msg: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ScheduleForm>(mkBlank());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Reset when modal opens
  useEffect(() => {
    if (visible) {
      const blank = mkBlank();
      setForm({ ...blank, classId: preselectedClassId ?? "" });
      setChapters([]);
      setSubmitError(null);
    }
  }, [visible, preselectedClassId]);

  // Derive subjects from selected class
  const selectedClass = useMemo(
    () => classes.find((c) => (c._id ?? c.id) === form.classId),
    [form.classId, classes]
  );

  const subjects = useMemo(() => {
    if (!selectedClass) return [];
    return (selectedClass.subject ?? []).map((s: any) =>
      typeof s === "string"
        ? { id: s, label: s }
        : { id: s._id ?? s.id ?? "", label: s.label ?? s.name ?? s.value ?? "" }
    ).filter((s: any) => s.id);
  }, [selectedClass]);

  // Auto-select first subject when class changes
  useEffect(() => {
    setForm((prev) => ({ ...prev, subjectId: subjects[0]?.id ?? "", selectedChapters: [] }));
    setChapters([]);
  }, [form.classId]);

  // Load chapters when subject changes
  useEffect(() => {
    if (!form.subjectId) { setChapters([]); return; }
    setLoadingChapters(true);
    getOptions("CHAPTER", form.subjectId)
      .then((res: any) => setChapters(res.data ?? []))
      .catch(() => setChapters([]))
      .finally(() => setLoadingChapters(false));
  }, [form.subjectId]);

  // Auto-fill duration from class data
  const classDurationMins = useMemo(() => {
    const hrs = (selectedClass as any)?.classLead?.classDurationHours;
    return hrs ? Math.round(hrs * 60) : null;
  }, [selectedClass]);

  const set = <K extends keyof ScheduleForm>(key: K, val: ScheduleForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleChapter = (id: string) =>
    set("selectedChapters", form.selectedChapters.includes(id)
      ? form.selectedChapters.filter((c) => c !== id)
      : [...form.selectedChapters, id]);

  const handleSubmit = async () => {
    if (!form.classId) { setSubmitError("Please select a class."); return; }
    setSubmitError(null);
    setSaving(true);
    try {
      const dateISO = form.dateObj.toISOString().split("T")[0];
      const timeStr = fmtTimeDisplay(form.timeObj);
      await scheduleTest({
        finalClassId:    form.classId,
        testDate:        dateISO,
        testTime:        timeStr,
        testType:        form.testType,
        testSyllabus:    form.testSyllabus || undefined,
        totalMarks:      form.totalMarks ? Number(form.totalMarks) : undefined,
        durationMinutes: classDurationMins ?? undefined,
        coveredChapters: form.selectedChapters.length ? form.selectedChapters : undefined,
        notes:           form.notes || undefined,
      });
      onClose();
      onSuccess();
      showToast("success", "Test scheduled successfully!");
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to schedule test.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <View style={sm.root}>
          <View style={[sm.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
            <Text style={sm.title}>Schedule Test</Text>
            <Pressable onPress={onClose} hitSlop={12} style={sm.closeBtn}>
              <Ionicons name="close" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={sm.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* Error banner */}
            {submitError && (
              <View style={sm.errorBanner}>
                <Ionicons name="alert-circle-outline" size={14} color={T.error} />
                <Text style={sm.errorTxt}>{submitError}</Text>
              </View>
            )}

            {/* Class */}
            <Field label="Class">
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {classes.map((cls) => (
                    <Pill
                      key={cls._id ?? cls.id}
                      label={cls.studentName}
                      active={form.classId === (cls._id ?? cls.id)}
                      onPress={() => set("classId", cls._id ?? cls.id)}
                    />
                  ))}
                </View>
              </ScrollView>
            </Field>

            {/* Subject â€” only shown when class has >1 subject */}
            {subjects.length > 1 && (
              <Field label="Subject">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {subjects.map((s: any) => (
                    <Pill
                      key={s.id}
                      label={s.label}
                      active={form.subjectId === s.id}
                      onPress={() => {
                        set("subjectId", s.id);
                        set("selectedChapters", []);
                      }}
                    />
                  ))}
                </View>
              </Field>
            )}

            {/* Test Type */}
            <Field label="Test Type">
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {TEST_TYPES.map((t) => (
                  <Pill
                    key={t.value}
                    label={t.label}
                    active={form.testType === t.value}
                    onPress={() => set("testType", t.value)}
                  />
                ))}
              </View>
            </Field>

            {/* Date + Time */}
            <Field label="Date & Time">
              <View style={{ gap: 8 }}>
                <PickerRow
                  icon="calendar-outline"
                  label="Date"
                  value={fmtDateDisplay(form.dateObj)}
                  onPress={() => setShowDatePicker(true)}
                />
                <PickerRow
                  icon="time-outline"
                  label="Time"
                  value={fmtTimeDisplay(form.timeObj)}
                  onPress={() => setShowTimePicker(true)}
                />
              </View>
            </Field>

            {showDatePicker && (
              <DateTimePicker
                value={form.dateObj}
                mode="date"
                minimumDate={new Date()}
                display={Platform.OS === "ios" ? "inline" : "default"}
                onChange={(_, date) => {
                  setShowDatePicker(Platform.OS === "ios");
                  if (date) set("dateObj", date);
                }}
              />
            )}
            {showTimePicker && (
              <DateTimePicker
                value={form.timeObj}
                mode="time"
                is24Hour={false}
                display={Platform.OS === "ios" ? "spinner" : "default"}
                onChange={(_, date) => {
                  setShowTimePicker(Platform.OS === "ios");
                  if (date) set("timeObj", date);
                }}
              />
            )}

            {/* Marks + Duration */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Field label="Total Marks">
                  <StyledInput
                    value={form.totalMarks}
                    onChangeText={(v) => set("totalMarks", v)}
                    placeholder="100"
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              <View style={{ flex: 1 }}>
                <Field label="Duration">
                  <View style={sm.durationBox}>
                    <Ionicons name="time-outline" size={14} color={T.mutedFg} />
                    <Text style={sm.durationTxt}>
                      {classDurationMins ? `${classDurationMins} min` : "Set by class"}
                    </Text>
                    <Ionicons name="lock-closed-outline" size={11} color={T.textDisabled} />
                  </View>
                </Field>
              </View>
            </View>

            {/* Chapters â€” filtered by selected subject */}
            {form.classId && (
              <Field label="Chapters" hint="Select which chapters this test will cover">
                {loadingChapters ? (
                  <ActivityIndicator color={T.primary} style={{ alignSelf: "flex-start" }} />
                ) : chapters.length === 0 ? (
                  <Text style={sm.noChapters}>
                    {form.subjectId ? "No chapters found for this subject." : "Select a subject first."}
                  </Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {chapters.map((ch: any) => (
                      <ChapterChip
                        key={ch._id}
                        label={ch.label}
                        selected={form.selectedChapters.includes(ch._id)}
                        onPress={() => toggleChapter(ch._id)}
                      />
                    ))}
                  </View>
                )}
              </Field>
            )}

            {/* Syllabus notes */}
            <Field label="Notes" hint="Any additional context â€” specific topics, question typesâ€¦">
              <StyledInput
                value={form.testSyllabus}
                onChangeText={(v) => set("testSyllabus", v)}
                placeholder="e.g. Focus on numericals from Ch 5â€“7, MCQ formatâ€¦"
                multiline
                maxLength={1000}
              />
            </Field>

            <Pressable
              style={[sm.submitBtn, (saving || !form.classId) && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={saving || !form.classId}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={sm.submitTxt}>Schedule Test</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
const sm = StyleSheet.create({
  root:        { flex: 1, backgroundColor: T.background },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  title:       { fontSize: 17, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  closeBtn:    { width: 32, height: 32, borderRadius: 10, backgroundColor: T.muted, alignItems: "center", justifyContent: "center" },
  content:     { padding: 20, paddingBottom: 120 },
  submitBtn:   { backgroundColor: T.primary, borderRadius: T.radiusFull, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  submitTxt:   { color: "#fff", fontWeight: "800", fontSize: 15 },
  errorBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${T.error}15`, borderRadius: 10, padding: 12, marginBottom: 16 },
  errorTxt:    { flex: 1, fontSize: 13, color: T.error, fontWeight: "600" },
  durationBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: T.muted, borderRadius: T.radiusMd, borderWidth: 1, borderColor: T.border, paddingHorizontal: 14, paddingVertical: 13 },
  durationTxt: { flex: 1, fontSize: 14, fontWeight: "700", color: T.textDisabled },
  noChapters:  { fontSize: 12, color: T.textDisabled, fontStyle: "italic" },
});

// â”€â”€â”€ Submit Report Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ReportForm {
  obtainedMarks: string;
  feedback: string;
  strengths: string;
  areasOfImprovement: string;
  studentPerformance: string;
  recommendations: string;
  selectedChapters: string[];
}

const BLANK_REPORT: ReportForm = {
  obtainedMarks: "", feedback: "", strengths: "",
  areasOfImprovement: "", studentPerformance: "", recommendations: "",
  selectedChapters: [],
};

const ReportModal = ({
  visible,
  test,
  chapters,
  onClose,
  onSuccess,
  showToast,
}: {
  visible: boolean;
  test: TestDoc | null;
  chapters: Option[];
  onClose: () => void;
  onSuccess: () => void;
  showToast: (type: ToastType, msg: string) => void;
}) => {
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<ReportForm>({ ...BLANK_REPORT });
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (visible && test) {
      const existingReport = test.report;
      setForm({
        obtainedMarks:      test.obtainedMarks != null ? String(test.obtainedMarks) : "",
        feedback:           existingReport?.feedback ?? "",
        strengths:          existingReport?.strengths ?? "",
        areasOfImprovement: existingReport?.areasOfImprovement ?? "",
        studentPerformance: existingReport?.studentPerformance ?? "",
        recommendations:    existingReport?.recommendations ?? "",
        selectedChapters:   (test.coveredChapters as string[] | undefined) ?? [],
      });
    }
  }, [visible, test]);

  const set = <K extends keyof ReportForm>(key: K, val: ReportForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const toggleChapter = (id: string) =>
    set("selectedChapters", form.selectedChapters.includes(id)
      ? form.selectedChapters.filter((c) => c !== id)
      : [...form.selectedChapters, id]);

  const handleSubmit = async () => {
    if (!test) return;
    const required: (keyof ReportForm)[] = ["feedback", "strengths", "areasOfImprovement", "studentPerformance", "recommendations"];
    for (const key of required) {
      if (!String(form[key]).trim()) {
        setSubmitError(`Please fill in the "${key.replace(/([A-Z])/g, " $1").toLowerCase()}" field.`);
        return;
      }
    }
    setSubmitError(null);
    setSaving(true);
    try {
      await submitTestReport(test._id, {
        report: {
          feedback:           form.feedback.trim(),
          strengths:          form.strengths.trim(),
          areasOfImprovement: form.areasOfImprovement.trim(),
          studentPerformance: form.studentPerformance.trim(),
          recommendations:    form.recommendations.trim(),
        },
        totalMarks:      test.totalMarks,
        obtainedMarks:   form.obtainedMarks ? Number(form.obtainedMarks) : undefined,
        coveredChapters: form.selectedChapters.length ? form.selectedChapters : undefined,
      });
      onClose();
      onSuccess();
      showToast("success", "Report submitted successfully!");
    } catch (e: any) {
      setSubmitError(e?.message ?? "Failed to submit report.");
    } finally {
      setSaving(false);
    }
  };

  if (!test) return null;

  const cls = typeof test.finalClass === "object" ? test.finalClass : null;
  const pct = test.totalMarks && form.obtainedMarks
    ? Math.round((Number(form.obtainedMarks) / test.totalMarks) * 100)
    : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={rm.root}>
        <View style={[rm.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}>
          <View style={{ flex: 1 }}>
            <Text style={rm.title}>Submit Report</Text>
            {cls && <Text style={rm.sub}>{cls.studentName} Â· {fmtDate(test.testDate)}</Text>}
          </View>
          <Pressable onPress={onClose} hitSlop={12} style={rm.closeBtn}>
            <Ionicons name="close" size={20} color={T.textPrimary} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding">
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={rm.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >
            {submitError && (
              <View style={sm.errorBanner}>
                <Ionicons name="alert-circle-outline" size={14} color={T.error} />
                <Text style={sm.errorTxt}>{submitError}</Text>
              </View>
            )}
            {/* Marks */}
            <View style={rm.marksRow}>
              <View style={{ flex: 1 }}>
                <Field label="Marks Obtained">
                  <StyledInput
                    value={form.obtainedMarks}
                    onChangeText={(v) => set("obtainedMarks", v)}
                    placeholder={test.totalMarks ? `Max ${test.totalMarks}` : "e.g. 78"}
                    keyboardType="numeric"
                  />
                </Field>
              </View>
              {test.totalMarks && (
                <View style={rm.maxMarks}>
                  <Text style={rm.maxLabel}>/ {test.totalMarks}</Text>
                  {pct != null && (
                    <Text style={[rm.pct, { color: scoreColor(pct) }]}>{pct}%</Text>
                  )}
                </View>
              )}
            </View>

            {/* Chapters covered */}
            {chapters.length > 0 && (
              <Field label="Chapters Covered" hint="Confirm which chapters this test assessed">
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {chapters.map((ch: any) => (
                    <ChapterChip
                      key={ch._id}
                      label={ch.label}
                      selected={form.selectedChapters.includes(ch._id)}
                      onPress={() => toggleChapter(ch._id)}
                    />
                  ))}
                </View>
              </Field>
            )}

            {/* Report fields */}
            {([
              ["feedback",           "Overall Feedback",          "How did the test go overall?"],
              ["strengths",          "Student Strengths",          "What did the student do well?"],
              ["areasOfImprovement", "Areas of Improvement",      "What needs more work?"],
              ["studentPerformance", "Performance Assessment",    "Rate the student's preparation level"],
              ["recommendations",    "Recommendations",           "What should the student focus on next?"],
            ] as [keyof ReportForm, string, string][]).map(([key, label, hint]) => (
              <Field key={key} label={label} hint={hint}>
                <StyledInput
                  value={String(form[key])}
                  onChangeText={(v) => set(key, v)}
                  multiline
                  maxLength={2000}
                />
              </Field>
            ))}

            <Pressable
              style={[rm.submitBtn, saving && { opacity: 0.5 }]}
              onPress={handleSubmit}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={rm.submitTxt}>Submit Report</Text>}
            </Pressable>
        </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};
const rm = StyleSheet.create({
  root:      { flex: 1, backgroundColor: T.background },
  header:    { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: T.border },
  title:     { fontSize: 17, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  sub:       { fontSize: 11, color: T.textDisabled, marginTop: 2 },
  closeBtn:  { width: 32, height: 32, borderRadius: 10, backgroundColor: T.muted, alignItems: "center", justifyContent: "center" },
  content:   { padding: 20, paddingBottom: 120 },
  marksRow:  { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  maxMarks:  { paddingBottom: 16, alignItems: "center", gap: 2 },
  maxLabel:  { fontSize: 14, color: T.textSecondary, fontWeight: "700" },
  pct:       { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  submitBtn: { backgroundColor: T.primary, borderRadius: T.radiusFull, paddingVertical: 15, alignItems: "center", marginTop: 8 },
  submitTxt: { color: "#fff", fontWeight: "800", fontSize: 15 },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TABS = ["Upcoming", "History"] as const;
type Tab = typeof TABS[number];

interface Props {
  navigation?: any;
}

export default function TutorTestsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const { toast, show: showToast, hide: hideToast } = useToast();
  const { dialog, confirm, close: closeConfirm } = useConfirm();

  const [tab, setTab] = useState<Tab>("Upcoming");
  const [tests, setTests] = useState<TestDoc[]>([]);
  const [compliance, setCompliance] = useState<TestCompliance[]>([]);
  const [classes, setClasses] = useState<FinalClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [scheduleVisible, setScheduleVisible] = useState(false);
  const [preselectedClassId, setPreselectedClassId] = useState<string | undefined>();
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedTest, setSelectedTest] = useState<TestDoc | null>(null);
  const [reportChapters, setReportChapters] = useState<Option[]>([]);

  const load = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const [testsRes, complianceRes, classesRes] = await Promise.all([
        getTutorTests({ limit: 200 }),
        getTutorCompliance(),
        getMyClasses("ACTIVE"),
      ]);
      setTests(testsRes.data ?? []);
      setCompliance(complianceRes.data ?? []);
      setClasses(classesRes.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load tests. Pull down to retry.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleMarkDone = (testId: string) => {
    confirm(
      "Mark as Done",
      "Confirm the test has been conducted offline and mark it as completed?",
      async () => {
        try {
          await updateTestStatus(testId, "COMPLETED");
          load(true);
          showToast("success", "Test marked as completed.");
        } catch (e: any) {
          showToast("error", e?.message ?? "Failed to update status.");
        }
      }
    );
  };

  const handleOpenReport = async (test: TestDoc) => {
    setSelectedTest(test);
    // Load chapters for the test's class
    const cls = typeof test.finalClass === "object" ? test.finalClass : null;
    if (cls) {
      const fullClass = classes.find((c) => (c._id ?? c.id) === cls._id);
      if (fullClass) {
        const subjectIds = (fullClass.subject ?? [])
          .map((s: any) => (typeof s === "string" ? s : s._id ?? s.id))
          .filter(Boolean);
        if (subjectIds.length) {
          const results = await Promise.all(
            subjectIds.map((id: string) => getOptions("CHAPTER", id).catch(() => ({ data: [] })))
          );
          setReportChapters(results.flatMap((r: any) => r.data ?? []));
        }
      }
    }
    setReportVisible(true);
  };

  const handleScheduleFromCompliance = (item: TestCompliance) => {
    setPreselectedClassId(item.classId);
    setScheduleVisible(true);
  };

  // Filter tests by tab
  const upcoming = tests.filter((t) => t.status === "SCHEDULED").sort(
    (a, b) => new Date(a.testDate).getTime() - new Date(b.testDate).getTime()
  );
  const history = tests.filter((t) => t.status !== "SCHEDULED" && t.status !== "CANCELLED").sort(
    (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime()
  );

  const displayedTests = tab === "Upcoming" ? upcoming : history;

  const nonCompliant = compliance.filter((c) => !c.compliant);

  return (
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
            <Text style={s.headerTitle}>Tests</Text>
            <Text style={s.headerSub}>
              {compliance.length > 0
                ? `${compliance.filter((c) => c.compliant).length}/${compliance.length} classes compliant this cycle`
                : "Manage & track student tests"}
            </Text>
          </View>
          <Pressable
            style={s.scheduleBtn}
            onPress={() => { setPreselectedClassId(undefined); setScheduleVisible(true); }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={s.scheduleBtnTxt}>Schedule</Text>
          </Pressable>
        </View>
      </LinearGradient>

      <Animated.ScrollView
        style={[s.scroll, { opacity: fadeAnim }]}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); load(true); }}
            tintColor={T.primary}
          />
        }
      >
        {loading ? (
          <ActivityIndicator color={T.primary} style={{ marginTop: 48 }} />
        ) : error ? (
          <View style={s.errorBox}>
            <View style={s.errorIcon}>
              <Ionicons name="cloud-offline-outline" size={28} color={T.error} />
            </View>
            <Text style={s.errorTitle}>Something went wrong</Text>
            <Text style={s.errorMsg}>{error}</Text>
            <Pressable style={s.retryBtn} onPress={() => load()}>
              <Ionicons name="refresh-outline" size={14} color={T.primary} />
              <Text style={s.retryTxt}>Retry</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Compliance strip */}
            {nonCompliant.length > 0 && (
              <>
                <View style={s.alertBanner}>
                  <Ionicons name="warning-outline" size={15} color={T.warning} />
                  <Text style={s.alertTxt}>
                    {nonCompliant.length} class{nonCompliant.length > 1 ? "es are" : " is"} missing required tests for this cycle
                  </Text>
                </View>
              </>
            )}

            {compliance.length > 0 && (
              <>
                <SectionLabel>Cycle Compliance</SectionLabel>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 4 }}
                  contentContainerStyle={{ paddingBottom: 4 }}
                >
                  {compliance.map((item) => (
                    <ComplianceCard
                      key={item.classId}
                      item={item}
                      onSchedule={handleScheduleFromCompliance}
                    />
                  ))}
                </ScrollView>
              </>
            )}

            {/* Tab bar */}
            <View style={s.tabRow}>
              {TABS.map((t) => (
                <Pressable
                  key={t}
                  style={[s.tabBtn, tab === t && s.tabBtnActive]}
                  onPress={() => setTab(t)}
                >
                  <Text style={[s.tabTxt, tab === t && s.tabTxtActive]}>{t}</Text>
                  {t === "Upcoming" && upcoming.length > 0 && (
                    <View style={[s.tabBadge, tab === t && s.tabBadgeActive]}>
                      <Text style={[s.tabBadgeTxt, tab === t && { color: "#fff" }]}>{upcoming.length}</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Test list */}
            {displayedTests.length === 0 ? (
              <View style={s.emptyBox}>
                <Ionicons name="document-text-outline" size={36} color={T.textDisabled} />
                <Text style={s.emptyTitle}>
                  {tab === "Upcoming" ? "No Upcoming Tests" : "No Test History"}
                </Text>
                <Text style={s.emptySub}>
                  {tab === "Upcoming"
                    ? "Schedule a test using the button above."
                    : "Completed tests will appear here."}
                </Text>
              </View>
            ) : (
              displayedTests.map((test) => (
                <TestCard
                  key={test._id}
                  item={test}
                  onMarkDone={handleMarkDone}
                  onSubmitReport={handleOpenReport}
                />
              ))
            )}
          </>
        )}
      </Animated.ScrollView>

      {/* Modals */}
      <ScheduleModal
        visible={scheduleVisible}
        onClose={() => setScheduleVisible(false)}
        classes={classes}
        preselectedClassId={preselectedClassId}
        onSuccess={() => load(true)}
        showToast={showToast}
      />

      <ReportModal
        visible={reportVisible}
        test={selectedTest}
        chapters={reportChapters}
        onClose={() => { setReportVisible(false); setSelectedTest(null); setReportChapters([]); }}
        onSuccess={() => load(true)}
        showToast={showToast}
      />

      <ConfirmDialog state={dialog} onClose={closeConfirm} />
      <Toast state={toast} onHide={hideToast} />
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.background },

  header:      { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  headerSub:   { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  scheduleBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: T.radiusFull },
  scheduleBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 13 },

  scroll:  { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 52 },

  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${T.warning}15`,
    borderRadius: T.radiusMd,
    padding: 12,
    marginBottom: 4,
  },
  alertTxt: { fontSize: 12, color: T.warning, fontWeight: "600", flex: 1 },

  tabRow:        { flexDirection: "row", gap: 4, marginBottom: 16, marginTop: 6 },
  tabBtn:        { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 16, paddingVertical: 9, borderRadius: T.radiusFull, backgroundColor: T.muted },
  tabBtnActive:  { backgroundColor: T.primary },
  tabTxt:        { fontSize: 13, fontWeight: "700", color: T.textSecondary },
  tabTxtActive:  { color: "#fff" },
  tabBadge:      { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: T.border, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  tabBadgeActive: { backgroundColor: "rgba(255,255,255,0.3)" },
  tabBadgeTxt:   { fontSize: 10, fontWeight: "800", color: T.textSecondary },

  emptyBox:   { alignItems: "center", gap: 10, paddingVertical: 52 },
  emptyTitle: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  emptySub:   { fontSize: 13, color: T.textDisabled, textAlign: "center", lineHeight: 19 },

  errorBox:   { alignItems: "center", gap: 10, paddingVertical: 52, paddingHorizontal: 24 },
  errorIcon:  { width: 60, height: 60, borderRadius: 30, backgroundColor: `${T.error}12`, alignItems: "center", justifyContent: "center" },
  errorTitle: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  errorMsg:   { fontSize: 13, color: T.textDisabled, textAlign: "center", lineHeight: 19 },
  retryBtn:   { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingHorizontal: 20, paddingVertical: 10, borderRadius: T.radiusFull, backgroundColor: `${T.primary}12` },
  retryTxt:   { fontSize: 13, fontWeight: "700", color: T.primary },
});

