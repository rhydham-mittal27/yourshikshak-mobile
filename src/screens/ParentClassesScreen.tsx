/**
 * ParentClassesScreen — Calendar + Attendance Verification
 * Plan: calendar dots, session detail on tap, monthly attendance verification panel, reschedule.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  RefreshControl,
  StatusBar,
  Modal,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getParentDashboard,
  getParentSessions,
  verifyParentAttendance,
  requestReschedule,
  ParentSession,
  ParentActiveClass,
} from "../api/client";
import { T } from "../constants/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const fmtMonthLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;

const getDaysInMonth = (year: number, month: number) =>
  new Date(year, month + 1, 0).getDate();

const getFirstDayOfMonth = (year: number, month: number) =>
  new Date(year, month, 1).getDay();

const isoDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const DAY_JS_INDEX: Record<string, number> = {
  SUNDAY: 0, MONDAY: 1, TUESDAY: 2, WEDNESDAY: 3,
  THURSDAY: 4, FRIDAY: 5, SATURDAY: 6,
};

/** Build synthetic SCHEDULED sessions from a weekly schedule when no backend sessions exist */
const buildScheduledSessions = (
  year: number,
  month: number,
  daysOfWeek: string[],
  timeSlot: string,
): ParentSession[] => {
  const sessions: ParentSession[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const indices = new Set(daysOfWeek.map((d) => DAY_JS_INDEX[d]).filter((n) => n != null));
  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(year, month, day);
    if (indices.has(d.getDay())) {
      sessions.push({
        _id: `synthetic-${isoDate(d)}`,
        sessionDate: isoDate(d),
        timeSlot,
        sessionNumber: day,
        status: "SCHEDULED",
      });
    }
  }
  return sessions;
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: w as any, height: h, borderRadius: radius, backgroundColor: "#E2E8F0", opacity: anim }} />;
};

// ─── Status dot config ────────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  COMPLETED:   T.success,
  SCHEDULED:   T.primary,
  PLANNED:     T.primary,
  MISSED:      T.error,
  RESCHEDULED: T.warning,
  CANCELLED:   T.mutedFg,
};

const STATUS_LABEL: Record<string, string> = {
  COMPLETED:   "Attended",
  SCHEDULED:   "Upcoming",
  PLANNED:     "Upcoming",
  MISSED:      "Missed",
  RESCHEDULED: "Rescheduled",
  CANCELLED:   "Cancelled",
};

// ─── Legend ───────────────────────────────────────────────────────────────────

const Legend = () => (
  <View style={leg.row}>
    {[
      { color: T.success,  label: "Attended" },
      { color: T.error,    label: "Missed" },
      { color: T.warning,  label: "Rescheduled" },
      { color: T.primary,  label: "Upcoming" },
      { color: T.mutedFg,  label: "No class" },
    ].map((item) => (
      <View key={item.label} style={leg.item}>
        <View style={[leg.dot, { backgroundColor: item.color }]} />
        <Text style={leg.txt}>{item.label}</Text>
      </View>
    ))}
  </View>
);

const leg = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12, marginBottom: 4 },
  item: { flexDirection: "row", alignItems: "center", gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  txt: { fontSize: 10, color: T.mutedFg, fontWeight: "500" },
});

// ─── Session Detail ───────────────────────────────────────────────────────────

const SessionDetail = ({
  session,
  onReschedule,
  onFlag,
}: {
  session: ParentSession;
  onReschedule: () => void;
  onFlag: () => void;
}) => {
  const color = STATUS_DOT[session.status] ?? T.mutedFg;
  return (
    <View style={sd.card}>
      <View style={sd.header}>
        <View style={[sd.statusDot, { backgroundColor: color }]} />
        <Text style={sd.statusTxt}>{STATUS_LABEL[session.status] ?? session.status}</Text>
        <Text style={sd.time}>{session.timeSlot}</Text>
      </View>

      {session.subject && (
        <Text style={sd.subject}>{session.subject}</Text>
      )}

      {session.topicsCovered && session.topicsCovered.length > 0 && (
        <View style={sd.topicsRow}>
          <Ionicons name="book-outline" size={13} color={T.mutedFg} />
          <View style={sd.chips}>
            {session.topicsCovered.map((t) => (
              <View key={t} style={sd.chip}>
                <Text style={sd.chipTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {session.tutorNote && (
        <View style={sd.noteBox}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={T.primary} />
          <Text style={sd.noteTxt}>"{session.tutorNote}"</Text>
        </View>
      )}

      <View style={sd.actions}>
        {session.status === "SCHEDULED" && (
          <Pressable style={sd.actionBtn} onPress={onReschedule}>
            <Ionicons name="calendar-outline" size={13} color={T.primary} />
            <Text style={[sd.actionTxt, { color: T.primary }]}>Reschedule</Text>
          </Pressable>
        )}
        {session.status === "COMPLETED" && (
          <Pressable style={[sd.actionBtn, { borderColor: T.error + "40" }]} onPress={onFlag}>
            <Ionicons name="flag-outline" size={13} color={T.error} />
            <Text style={[sd.actionTxt, { color: T.error }]}>Report issue</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

const sd = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, padding: 16, marginTop: 12, borderWidth: 1, borderColor: T.border, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusTxt: { fontSize: 12, fontWeight: "700", color: T.textPrimary, flex: 1 },
  time: { fontSize: 11, color: T.mutedFg },
  subject: { fontSize: 14, fontWeight: "600", color: T.textPrimary },
  topicsRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, marginTop: 2 },
  chips: { flex: 1, flexDirection: "row", flexWrap: "wrap", gap: 4 },
  chip: { backgroundColor: `${T.primary}10`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: T.radiusFull },
  chipTxt: { fontSize: 11, color: T.primary, fontWeight: "600" },
  noteBox: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: `${T.primary}08`, padding: 10, borderRadius: T.radiusMd },
  noteTxt: { flex: 1, fontSize: 12, color: T.textSecondary, fontStyle: "italic", lineHeight: 17 },
  actions: { flexDirection: "row", gap: 8, marginTop: 2 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: T.radiusFull, borderWidth: 1, borderColor: `${T.primary}40` },
  actionTxt: { fontSize: 11, fontWeight: "700" },
});

// ─── Reschedule Modal ─────────────────────────────────────────────────────────

const RescheduleModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
  rescheduleCredits,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (date: string, time: string) => void;
  submitting: boolean;
  rescheduleCredits: number;
}) => {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={rm.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={rm.sheet}>
          <View style={rm.handle} />
          <View style={rm.header}>
            <Ionicons name="calendar-outline" size={20} color={T.primary} />
            <View style={{ flex: 1 }}>
              <Text style={rm.title}>Request Reschedule</Text>
              <Text style={rm.sub}>{rescheduleCredits} of 2 reschedule credits available</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={T.mutedFg} />
            </Pressable>
          </View>

          <View style={rm.creditsRow}>
            {[0, 1].map((i) => (
              <View key={i} style={[rm.creditDot, i < rescheduleCredits && rm.creditDotActive]} />
            ))}
            <Text style={rm.creditsTxt}>{rescheduleCredits} credit{rescheduleCredits !== 1 ? "s" : ""} remaining this month</Text>
          </View>

          <Text style={rm.label}>Preferred Date (DD/MM/YYYY)</Text>
          <TextInput style={rm.input} placeholder="e.g. 25/07/2025" value={date} onChangeText={setDate} placeholderTextColor={T.textDisabled} />

          <Text style={rm.label}>Preferred Time</Text>
          <TextInput style={rm.input} placeholder="e.g. 5:00 PM" value={time} onChangeText={setTime} placeholderTextColor={T.textDisabled} />

          <Pressable
            style={[rm.btn, (!date.trim() || !time.trim() || submitting || rescheduleCredits === 0) && { opacity: 0.5 }]}
            onPress={() => onSubmit(date, time)}
            disabled={!date.trim() || !time.trim() || submitting || rescheduleCredits === 0}
          >
            {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={rm.btnTxt}>Submit Request</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

const rm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet: { backgroundColor: T.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: 4 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  title: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  sub: { fontSize: 12, color: T.mutedFg },
  creditsRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.muted, padding: 10, borderRadius: T.radiusMd },
  creditDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: T.border },
  creditDotActive: { backgroundColor: T.primary },
  creditsTxt: { fontSize: 12, color: T.textSecondary, fontWeight: "600" },
  label: { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  input: { borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, padding: 12, fontSize: 14, color: T.textPrimary, backgroundColor: T.muted },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, padding: 14, borderRadius: T.radiusMd },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ─── Timetable Panel ──────────────────────────────────────────────────────────

const DAY_ABBR: Record<string, string> = {
  MONDAY: "Mon", TUESDAY: "Tue", WEDNESDAY: "Wed",
  THURSDAY: "Thu", FRIDAY: "Fri", SATURDAY: "Sat", SUNDAY: "Sun",
};
const DAY_ORDER = ["MONDAY","TUESDAY","WEDNESDAY","THURSDAY","FRIDAY","SATURDAY","SUNDAY"];

const TimetablePanel = ({ activeClass }: { activeClass: ParentActiveClass }) => {
  const days = (activeClass.schedule?.daysOfWeek ?? [])
    .slice()
    .sort((a, b) => DAY_ORDER.indexOf(a) - DAY_ORDER.indexOf(b));
  const timeSlot = activeClass.schedule?.timeSlot ?? activeClass.nextSessionTime ?? "—";
  const subject  = activeClass.subject ?? "Class";

  if (!days.length && !timeSlot) return null;

  return (
    <View style={tt.card}>
      <View style={tt.header}>
        <Ionicons name="time-outline" size={15} color={T.primary} />
        <Text style={tt.title}>Weekly Timetable</Text>
        <Text style={tt.subject}>{subject}</Text>
      </View>
      <View style={tt.row}>
        {DAY_ORDER.map((d) => {
          const active = days.includes(d);
          return (
            <View key={d} style={[tt.dayBox, active && tt.dayBoxActive]}>
              <Text style={[tt.dayTxt, active && tt.dayTxtActive]}>{DAY_ABBR[d]}</Text>
            </View>
          );
        })}
      </View>
      {timeSlot !== "—" && (
        <View style={tt.timeRow}>
          <Ionicons name="alarm-outline" size={13} color={T.mutedFg} />
          <Text style={tt.timeTxt}>{timeSlot}</Text>
        </View>
      )}
      {activeClass.classesPerMonth != null && (
        <Text style={tt.freq}>{activeClass.classesPerMonth} sessions / month</Text>
      )}
    </View>
  );
};

const tt = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, padding: 16, borderWidth: 1, borderColor: T.border, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { fontSize: 13, fontWeight: "700", color: T.textPrimary, flex: 1 },
  subject: { fontSize: 11, color: T.primary, fontWeight: "600", backgroundColor: `${T.primary}10`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: T.radiusFull },
  row: { flexDirection: "row", gap: 6 },
  dayBox: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: T.radiusMd, backgroundColor: T.muted },
  dayBoxActive: { backgroundColor: T.primary },
  dayTxt: { fontSize: 10, fontWeight: "700", color: T.mutedFg },
  dayTxtActive: { color: "#fff" },
  timeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  timeTxt: { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  freq: { fontSize: 11, color: T.mutedFg },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ParentClassesScreen = ({ name }: { userId: string; name: string; role: string }) => {
  const insets = useSafeAreaInsets();
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [sessions, setSessions] = useState<ParentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleSession, setRescheduleSession] = useState<ParentSession | null>(null);
  const [submittingReschedule, setSubmittingReschedule] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<"PENDING" | "VERIFIED" | "NOT_REQUIRED">("NOT_REQUIRED");
  const [attendancePct, setAttendancePct] = useState<number | null>(null);
  const [rescheduleCredits] = useState(2);
  const [activeClass, setActiveClass] = useState<ParentActiveClass | null>(null);

  const monthKey = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;

  const loadSessions = useCallback(async () => {
    try {
      const [sessRes, dashRes] = await Promise.allSettled([
        getParentSessions(monthKey),
        getParentDashboard(),
      ]);
      if (sessRes.status === "fulfilled") {
        setSessions(sessRes.value.data.sessions ?? []);
        setVerificationStatus(sessRes.value.data.verificationStatus ?? "NOT_REQUIRED");
      }
      if (dashRes.status === "fulfilled") {
        const cls = dashRes.value.data.activeClass;
        if (cls) setActiveClass(cls);
        if (cls?.attendancePercentage != null) setAttendancePct(cls.attendancePercentage);
      }
      if (sessRes.status === "rejected") throw new Error("sessions failed");
    } catch {
      // Fallback: use dashboard sessions
      try {
        const dash = await getParentDashboard();
        const mapped: ParentSession[] = (dash.data.upcomingSessions ?? []).map((s) => ({
          _id: s._id,
          sessionDate: s.sessionDate,
          timeSlot: s.timeSlot,
          sessionNumber: s.sessionNumber,
          status: (s.status as any) ?? "SCHEDULED",
        }));
        setSessions(mapped);
        const cls = dash.data.activeClass;
        if (cls?.attendancePercentage != null) setAttendancePct(cls.attendancePercentage);
        if (cls) setActiveClass(cls);
      } catch { /* silent */ }
    }
  }, [monthKey]);

  const load = useCallback(async () => {
    setLoading(true);
    await loadSessions();
    setLoading(false);
  }, [loadSessions]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  // If no backend sessions but we have a schedule, generate planned ones
  const displaySessions = React.useMemo(() => {
    if (sessions.length > 0) return sessions;
    const days = activeClass?.schedule?.daysOfWeek;
    const slot = activeClass?.schedule?.timeSlot ?? activeClass?.nextSessionTime ?? "";
    if (!days?.length) return [];
    return buildScheduledSessions(viewDate.getFullYear(), viewDate.getMonth(), days, slot);
  }, [sessions, activeClass, viewDate]);

  // Build a map: dateStr → session
  const sessionMap = displaySessions.reduce<Record<string, ParentSession>>((acc, s) => {
    acc[s.sessionDate?.split("T")[0]] = s;
    return acc;
  }, {});

  const selectedSession = selectedDate ? sessionMap[selectedDate] : null;

  // Calendar grid
  const daysInMonth = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const firstDay    = getFirstDayOfMonth(viewDate.getFullYear(), viewDate.getMonth());

  const prevMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const handleVerifyAll = async () => {
    setVerifying(true);
    try {
      const completedIds = sessions.filter((s) => s.status === "COMPLETED").map((s) => s._id);
      await verifyParentAttendance({ month: monthKey, verifiedSessions: completedIds, flaggedSessions: [] });
      setVerificationStatus("VERIFIED");
    } catch { /* silent */ }
    setVerifying(false);
  };

  const handleRescheduleSubmit = async (date: string, time: string) => {
    if (!rescheduleSession) return;
    setSubmittingReschedule(true);
    try {
      await requestReschedule({ sessionId: rescheduleSession._id, preferredDate: date, preferredTime: time });
      setShowReschedule(false);
    } catch { /* silent */ }
    setSubmittingReschedule(false);
  };

  const attendedCount  = displaySessions.filter((s) => s.status === "COMPLETED").length;
  const totalCount     = displaySessions.filter((s) => s.status !== "CANCELLED").length;
  const consistencyPct = totalCount > 0 ? Math.round((attendedCount / totalCount) * 100) : (attendancePct ?? 0);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >
        {/* Hero Header */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <Text style={s.headerTitle}>My Classes</Text>
          <Text style={s.headerSub}>{fmtMonthLabel(viewDate)}</Text>

          {/* Consistency badge */}
          {totalCount > 0 && (
            <View style={s.consistencyBadge}>
              <Ionicons name="checkmark-circle-outline" size={14} color={T.success} />
              <Text style={s.consistencyTxt}>{consistencyPct}% Consistency · {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
            </View>
          )}
        </LinearGradient>

        <View style={s.body}>
          {/* ── Timetable ── */}
          {activeClass && <TimetablePanel activeClass={activeClass} />}

          {/* ── Calendar ── */}
          <View style={cal.card}>
            {/* Month nav */}
            <View style={cal.nav}>
              <Pressable onPress={prevMonth} hitSlop={12} style={cal.navBtn}>
                <Ionicons name="chevron-back" size={18} color={T.textPrimary} />
              </Pressable>
              <Text style={cal.monthLabel}>{fmtMonthLabel(viewDate)}</Text>
              <Pressable onPress={nextMonth} hitSlop={12} style={cal.navBtn}>
                <Ionicons name="chevron-forward" size={18} color={T.textPrimary} />
              </Pressable>
            </View>

            {/* Day headers */}
            <View style={cal.dayHeaders}>
              {DAYS.map((d) => (
                <Text key={d} style={cal.dayHdrTxt}>{d}</Text>
              ))}
            </View>

            {/* Grid */}
            {loading ? (
              <View style={cal.grid}>
                {Array.from({ length: 35 }).map((_, i) => (
                  <Skeleton key={i} w={32} h={36} radius={8} />
                ))}
              </View>
            ) : (
              <View style={cal.grid}>
                {/* Empty cells for first-day offset */}
                {Array.from({ length: firstDay }).map((_, i) => (
                  <View key={`empty-${i}`} style={cal.cell} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = isoDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day));
                  const session = sessionMap[dateStr];
                  const isToday = dateStr === isoDate(today);
                  const isSelected = dateStr === selectedDate;
                  const dotColor = session ? STATUS_DOT[session.status] : null;

                  return (
                    <Pressable
                      key={day}
                      style={[
                        cal.cell,
                        isToday && cal.cellToday,
                        isSelected && cal.cellSelected,
                      ]}
                      onPress={() => setSelectedDate(isSelected ? null : dateStr)}
                    >
                      <Text style={[cal.dayNum, isSelected && cal.dayNumSelected, isToday && !isSelected && cal.dayNumToday]}>
                        {day}
                      </Text>
                      {dotColor && (
                        <View style={[cal.dot, { backgroundColor: dotColor }]} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            )}

            <Legend />
          </View>

          {/* ── Session Detail ── */}
          {selectedSession && (
            <SessionDetail
              session={selectedSession}
              onReschedule={() => { setRescheduleSession(selectedSession); setShowReschedule(true); }}
              onFlag={() => { /* open concern sheet */ }}
            />
          )}
          {selectedDate && !selectedSession && (
            <View style={s.noSession}>
              <Ionicons name="calendar-outline" size={20} color={T.mutedFg} />
              <Text style={s.noSessionTxt}>No class on this day</Text>
            </View>
          )}

          {/* ── Attendance Verification ── */}
          {verificationStatus === "PENDING" && (
            <View style={av.card}>
              <View style={av.header}>
                <View style={[av.iconBox, { backgroundColor: `${T.warning}15` }]}>
                  <Ionicons name="shield-checkmark-outline" size={18} color={T.warning} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={av.title}>Attendance ready for review</Text>
                  <Text style={av.sub}>Please verify {MONTHS[viewDate.getMonth()]} attendance by the 5th</Text>
                </View>
              </View>

              <View style={av.statsRow}>
                <View style={av.stat}>
                  <Text style={av.statVal}>{attendedCount}</Text>
                  <Text style={av.statLbl}>Attended</Text>
                </View>
                <View style={av.stat}>
                  <Text style={[av.statVal, { color: T.error }]}>{totalCount - attendedCount}</Text>
                  <Text style={av.statLbl}>Missed</Text>
                </View>
                <View style={av.stat}>
                  <Text style={av.statVal}>{totalCount}</Text>
                  <Text style={av.statLbl}>Total</Text>
                </View>
              </View>

              <Pressable
                style={[av.btn, verifying && { opacity: 0.6 }]}
                onPress={handleVerifyAll}
                disabled={verifying}
              >
                {verifying ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done-outline" size={16} color="#fff" />
                    <Text style={av.btnTxt}>Approve All Sessions</Text>
                  </>
                )}
              </Pressable>
            </View>
          )}

          {verificationStatus === "VERIFIED" && (
            <View style={[av.card, av.cardVerified]}>
              <Ionicons name="checkmark-circle" size={18} color={T.success} />
              <Text style={av.verifiedTxt}>✓ Verified — {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}</Text>
            </View>
          )}

          {/* ── Summary ── */}
          <View style={s.summaryCard}>
            <Text style={s.summaryTitle}>This Month</Text>
            <View style={s.summaryRow}>
              <View style={s.summaryItem}>
                <Text style={s.summaryVal}>{attendedCount}</Text>
                <Text style={s.summaryLbl}>Attended</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryVal, { color: T.error }]}>{displaySessions.filter(s => s.status === "MISSED").length}</Text>
                <Text style={s.summaryLbl}>Missed</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryVal, { color: T.warning }]}>{displaySessions.filter(s => s.status === "RESCHEDULED").length}</Text>
                <Text style={s.summaryLbl}>Rescheduled</Text>
              </View>
              <View style={s.summaryItem}>
                <Text style={[s.summaryVal, { color: T.primary }]}>{displaySessions.filter(s => s.status === "SCHEDULED").length}</Text>
                <Text style={s.summaryLbl}>Upcoming</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <RescheduleModal
        visible={showReschedule}
        onClose={() => setShowReschedule(false)}
        onSubmit={handleRescheduleSubmit}
        submitting={submittingReschedule}
        rescheduleCredits={rescheduleCredits}
      />
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  consistencyBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${T.success}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: T.radiusFull, alignSelf: "flex-start", marginTop: 8 },
  consistencyTxt: { fontSize: 12, color: T.success, fontWeight: "700" },
  body: { padding: 16, gap: 12 },
  noSession: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.border },
  noSessionTxt: { fontSize: 13, color: T.mutedFg },
  summaryCard: { backgroundColor: T.paper, borderRadius: T.radiusLg, padding: 16, borderWidth: 1, borderColor: T.border },
  summaryTitle: { fontSize: 12, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between" },
  summaryItem: { alignItems: "center", gap: 2 },
  summaryVal: { fontSize: 22, fontWeight: "800", color: T.success },
  summaryLbl: { fontSize: 10, color: T.mutedFg, fontWeight: "500" },
});

const cal = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusXl, padding: 16, borderWidth: 1, borderColor: T.border },
  nav: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  navBtn: { padding: 6, borderRadius: T.radiusMd, backgroundColor: T.muted },
  monthLabel: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  dayHeaders: { flexDirection: "row", marginBottom: 8 },
  dayHdrTxt: { flex: 1, textAlign: "center", fontSize: 10, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "14.28%", aspectRatio: 0.9, alignItems: "center", justifyContent: "center", gap: 2, borderRadius: T.radiusMd },
  cellToday: { borderWidth: 1.5, borderColor: T.primary },
  cellSelected: { backgroundColor: T.primary },
  dayNum: { fontSize: 13, fontWeight: "500", color: T.textPrimary },
  dayNumSelected: { color: "#fff", fontWeight: "700" },
  dayNumToday: { color: T.primary, fontWeight: "700" },
  dot: { width: 5, height: 5, borderRadius: 3 },
});

const av = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, padding: 16, borderWidth: 1, borderColor: `${T.warning}40`, gap: 12 },
  cardVerified: { borderColor: `${T.success}40`, flexDirection: "row", alignItems: "center", gap: 8 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: T.radiusMd, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  sub: { fontSize: 12, color: T.mutedFg, marginTop: 2 },
  statsRow: { flexDirection: "row", justifyContent: "space-around", backgroundColor: T.muted, borderRadius: T.radiusMd, padding: 12 },
  stat: { alignItems: "center", gap: 2 },
  statVal: { fontSize: 20, fontWeight: "800", color: T.success },
  statLbl: { fontSize: 10, color: T.mutedFg, fontWeight: "500" },
  btn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, padding: 13, borderRadius: T.radiusMd },
  btnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
  verifiedTxt: { fontSize: 13, fontWeight: "700", color: T.success },
});

export default ParentClassesScreen;
