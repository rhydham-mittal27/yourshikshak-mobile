import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  TouchableOpacity,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "ClassCalendar">;
type Route = RouteProp<RootStackParamList, "ClassCalendar">;

// ─── Types ────────────────────────────────────────────────────────────────────

type SessionStatus = "SCHEDULED" | "COMPLETED" | "RESCHEDULED" | "PAUSED" | "CANCELLED";

interface Session {
  id: string;
  date: string; // ISO
  time: string;
  duration: number;
  status: SessionStatus;
  teacher: string;
  topic?: string;
  note?: string;
}

const STATUS_META: Record<SessionStatus, { color: string; bg: string; icon: string; label: string }> = {
  SCHEDULED:   { color: T.primary,  bg: `${T.primary}18`,  icon: "calendar-outline",        label: "Scheduled"   },
  COMPLETED:   { color: T.success,  bg: `${T.success}15`,  icon: "checkmark-circle-outline", label: "Completed"   },
  RESCHEDULED: { color: T.info,     bg: `${T.info}15`,     icon: "refresh-outline",          label: "Rescheduled" },
  PAUSED:      { color: T.warning,  bg: `${T.warning}15`,  icon: "pause-circle-outline",     label: "Paused"      },
  CANCELLED:   { color: T.error,    bg: `${T.error}12`,    icon: "close-circle-outline",     label: "Cancelled"   },
};

// Mock sessions — replace with API
const MOCK_SESSIONS: Session[] = (() => {
  const today = new Date();
  const results: Session[] = [];
  const statuses: SessionStatus[] = ["COMPLETED","COMPLETED","COMPLETED","SCHEDULED","SCHEDULED","RESCHEDULED","PAUSED","CANCELLED"];
  const topics = ["Algebra - Quadratic Equations","Geometry - Circles","Trigonometry","Calculus Intro","Statistics","Number Theory","Polynomials","Probability"];
  let dayOffset = -18;
  for (let i = 0; i < 8; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + dayOffset);
    results.push({
      id: `s${i}`,
      date: d.toISOString().split("T")[0],
      time: "5:00 PM",
      duration: 60,
      status: statuses[i],
      teacher: "Priya Sharma",
      topic: topics[i],
      note: i === 5 ? "Rescheduled from Mon to Wed due to teacher unavailability" : undefined,
    });
    dayOffset += i % 2 === 0 ? 3 : 4;
  }
  return results;
})();

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAYS_SHORT  = ["Su","Mo","Tu","We","Th","Fr","Sa"];

// ─── Session Detail Modal ─────────────────────────────────────────────────────

const SessionModal = ({
  session,
  onClose,
}: {
  session: Session | null;
  onClose: () => void;
}) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (session) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(300);
      opacityAnim.setValue(0);
    }
  }, [session]);

  if (!session) return null;
  const meta = STATUS_META[session.status];
  const dateObj = new Date(session.date);
  const fmtDate = dateObj.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <Modal transparent visible={!!session} onRequestClose={onClose} animationType="none">
      <Animated.View style={[cc.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity style={{ flex: 1 }} onPress={onClose} activeOpacity={1} />
        <Animated.View style={[cc.sheet, { transform: [{ translateY: slideAnim }] }]}>
          {/* handle */}
          <View style={cc.sheetHandle} />

          {/* status badge */}
          <View style={[cc.sheetBadge, { backgroundColor: meta.bg, borderColor: `${meta.color}30` }]}>
            <Ionicons name={meta.icon as any} size={14} color={meta.color} />
            <Text style={[cc.sheetBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
          </View>

          {/* date */}
          <Text style={cc.sheetDate}>{fmtDate}</Text>

          {/* topic */}
          {session.topic && <Text style={cc.sheetTopic}>{session.topic}</Text>}

          {/* info rows */}
          <View style={cc.sheetInfoWrap}>
            {[
              { icon: "time-outline",    val: session.time                },
              { icon: "timer-outline",   val: `${session.duration} min`  },
              { icon: "person-outline",  val: session.teacher             },
            ].map((row, i) => (
              <View key={i} style={cc.sheetInfoRow}>
                <View style={cc.sheetInfoIcon}>
                  <Ionicons name={row.icon as any} size={13} color={T.primary} />
                </View>
                <Text style={cc.sheetInfoTxt}>{row.val}</Text>
              </View>
            ))}
          </View>

          {/* note */}
          {session.note && (
            <View style={cc.sheetNote}>
              <Ionicons name="information-circle-outline" size={13} color={T.warning} />
              <Text style={cc.sheetNoteTxt}>{session.note}</Text>
            </View>
          )}

          <TouchableOpacity style={cc.closeBtn} onPress={onClose}>
            <Text style={cc.closeBtnTxt}>Close</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ClassCalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const today = new Date(); today.setHours(0,0,0,0);
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [view, setView] = useState<"month" | "list">("month");

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, []);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Index sessions by date string
  const sessionsByDate = MOCK_SESSIONS.reduce<Record<string, Session[]>>((acc, s) => {
    (acc[s.date] ??= []).push(s);
    return acc;
  }, {});

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  // Stats
  const monthSessions = MOCK_SESSIONS.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth;
  });
  const counts = {
    completed:   monthSessions.filter(s => s.status === "COMPLETED").length,
    scheduled:   monthSessions.filter(s => s.status === "SCHEDULED").length,
    rescheduled: monthSessions.filter(s => s.status === "RESCHEDULED").length,
    cancelled:   monthSessions.filter(s => s.status === "CANCELLED").length,
  };

  return (
    <View style={cc.root}>
      <StatusBar barStyle="light-content" />

      {/* Hero */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[cc.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={cc.orbA} pointerEvents="none" />
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={cc.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={cc.backBtn}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
            {/* view toggle */}
            <View style={cc.viewToggle}>
              {(["month","list"] as const).map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[cc.viewToggleBtn, view === v && cc.viewToggleBtnActive]}
                  onPress={() => setView(v)}
                >
                  <Ionicons
                    name={v === "month" ? "calendar-outline" : "list-outline"}
                    size={14}
                    color={view === v ? T.primary : "rgba(255,255,255,0.5)"}
                  />
                  <Text style={[cc.viewToggleTxt, view === v && { color: T.primary }]}>
                    {v === "month" ? "Month" : "List"}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={cc.heroTitle}>Schedule</Text>

          {/* Stats strip */}
          <View style={cc.statsStrip}>
            {[
              { label: "Done",     val: counts.completed,   color: T.success },
              { label: "Upcoming", val: counts.scheduled,   color: T.primary },
              { label: "Moved",    val: counts.rescheduled, color: T.info    },
              { label: "Missed",   val: counts.cancelled,   color: T.error   },
            ].map((s) => (
              <View key={s.label} style={cc.statItem}>
                <Text style={[cc.statVal, { color: s.color }]}>{s.val}</Text>
                <Text style={cc.statLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[cc.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Month nav */}
        <View style={cc.monthNav}>
          <TouchableOpacity onPress={prevMonth} style={cc.monthNavBtn}>
            <Ionicons name="chevron-back" size={18} color={T.textPrimary} />
          </TouchableOpacity>
          <Text style={cc.monthNavTitle}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
          <TouchableOpacity onPress={nextMonth} style={cc.monthNavBtn}>
            <Ionicons name="chevron-forward" size={18} color={T.textPrimary} />
          </TouchableOpacity>
        </View>

        {view === "month" ? (
          <View style={cc.calCard}>
            {/* Day headers */}
            <View style={cc.dayRow}>
              {DAYS_SHORT.map((d) => <Text key={d} style={cc.dayLabel}>{d}</Text>)}
            </View>

            {/* Grid */}
            <View style={cc.grid}>
              {cells.map((day, idx) => {
                if (!day) return <View key={`e${idx}`} style={cc.cell} />;
                const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const sessions = sessionsByDate[dateStr] ?? [];
                const d = new Date(viewYear, viewMonth, day); d.setHours(0,0,0,0);
                const isToday = d.getTime() === today.getTime();

                return (
                  <TouchableOpacity
                    key={day}
                    style={cc.cell}
                    onPress={() => sessions[0] && setSelectedSession(sessions[0])}
                    activeOpacity={sessions.length ? 0.7 : 1}
                  >
                    <View style={[cc.cellInner, isToday && cc.cellToday, sessions.length > 0 && cc.cellHasSession]}>
                      <Text style={[cc.cellNum, isToday && cc.cellNumToday]}>
                        {day}
                      </Text>
                      {sessions.length > 0 && (
                        <View style={cc.dotsRow}>
                          {sessions.slice(0, 3).map((s, i) => (
                            <View
                              key={i}
                              style={[cc.dot, { backgroundColor: STATUS_META[s.status].color }]}
                            />
                          ))}
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Legend */}
            <View style={cc.legend}>
              {(Object.entries(STATUS_META) as [SessionStatus, typeof STATUS_META[SessionStatus]][]).map(([key, meta]) => (
                <View key={key} style={cc.legendItem}>
                  <View style={[cc.legendDot, { backgroundColor: meta.color }]} />
                  <Text style={cc.legendTxt}>{meta.label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* List view */
          <View style={cc.listWrap}>
            {MOCK_SESSIONS.sort((a, b) => a.date.localeCompare(b.date)).map((s, i) => {
              const meta = STATUS_META[s.status];
              const d = new Date(s.date);
              const isPast = d < today;
              return (
                <TouchableOpacity
                  key={s.id}
                  style={[cc.listItem, { opacity: isPast && s.status === "CANCELLED" ? 0.5 : 1 }]}
                  onPress={() => setSelectedSession(s)}
                  activeOpacity={0.75}
                >
                  {/* date column */}
                  <View style={cc.listDateCol}>
                    <Text style={cc.listDay}>{d.getDate()}</Text>
                    <Text style={cc.listMonth}>{MONTH_NAMES[d.getMonth()].slice(0,3)}</Text>
                  </View>

                  {/* connector */}
                  <View style={cc.listConnectorWrap}>
                    <View style={[cc.listDot2, { backgroundColor: meta.color }]} />
                    {i < MOCK_SESSIONS.length - 1 && <View style={cc.listLine} />}
                  </View>

                  {/* content */}
                  <View style={[cc.listContent, { borderColor: `${meta.color}20`, backgroundColor: meta.bg }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                      <Text style={cc.listTopic} numberOfLines={1}>
                        {s.topic ?? s.teacher}
                      </Text>
                      <View style={[cc.listBadge, { backgroundColor: `${meta.color}20` }]}>
                        <Text style={[cc.listBadgeTxt, { color: meta.color }]}>{meta.label}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", gap: 12, marginTop: 5 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="time-outline" size={11} color={T.textSecondary} />
                        <Text style={cc.listMeta}>{s.time} · {s.duration}min</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <SessionModal session={selectedSession} onClose={() => setSelectedSession(null)} />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const CELL_SIZE = 46;

const cc = StyleSheet.create({
  root:           { flex: 1, backgroundColor: T.background },
  hero:           { paddingHorizontal: T.base, paddingBottom: T.lg, overflow: "hidden" },
  orbA:           { position: "absolute", width: 200, height: 200, borderRadius: 100, backgroundColor: `${T.primary}10`, top: -60, right: -50 } as any,
  heroTop:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: T.base },
  backBtn:        { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  heroTitle:      { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5, marginBottom: T.base },
  viewToggle:     { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 99, padding: 3, gap: 2 },
  viewToggleBtn:  { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99 },
  viewToggleBtnActive: { backgroundColor: "rgba(255,255,255,0.12)" },
  viewToggleTxt:  { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.5)" },
  statsStrip:     { flexDirection: "row", gap: 0 },
  statItem:       { flex: 1, alignItems: "center" },
  statVal:        { fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  statLabel:      { fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: "600", marginTop: 1 },

  content:        { padding: T.base, gap: 12 },

  monthNav:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  monthNavBtn:    { width: 36, height: 36, borderRadius: 18, backgroundColor: T.paper, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: T.border },
  monthNavTitle:  { fontSize: 15, fontWeight: "800", color: T.textPrimary },

  calCard:        { backgroundColor: T.paper, borderRadius: T.radiusXl, padding: T.base, borderWidth: 1, borderColor: T.border },
  dayRow:         { flexDirection: "row", marginBottom: 6 },
  dayLabel:       { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: T.textDisabled },
  grid:           { flexDirection: "row", flexWrap: "wrap" },
  cell:           { width: "14.28%", alignItems: "center", paddingVertical: 2 },
  cellInner:      { width: CELL_SIZE - 10, minHeight: CELL_SIZE - 10, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingVertical: 4, gap: 2 },
  cellToday:      { borderWidth: 1.5, borderColor: T.primary },
  cellHasSession: { backgroundColor: T.muted },
  cellNum:        { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  cellNumToday:   { color: T.primary, fontWeight: "800" },
  dotsRow:        { flexDirection: "row", gap: 2 },
  dot:            { width: 5, height: 5, borderRadius: 2.5 },

  legend:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  legendItem:     { flexDirection: "row", alignItems: "center", gap: 4 },
  legendDot:      { width: 8, height: 8, borderRadius: 4 },
  legendTxt:      { fontSize: 11, color: T.textSecondary, fontWeight: "600" },

  // list view
  listWrap:       { gap: 0 },
  listItem:       { flexDirection: "row", gap: 10, marginBottom: 12 },
  listDateCol:    { width: 36, alignItems: "center", paddingTop: 4 },
  listDay:        { fontSize: 16, fontWeight: "800", color: T.textPrimary, lineHeight: 20 },
  listMonth:      { fontSize: 10, fontWeight: "700", color: T.textSecondary, textTransform: "uppercase" },
  listConnectorWrap: { alignItems: "center", width: 16 },
  listDot2:       { width: 12, height: 12, borderRadius: 6, marginTop: 6 },
  listLine:       { flex: 1, width: 1.5, backgroundColor: T.border, marginTop: 4 },
  listContent:    { flex: 1, borderRadius: T.radiusMd, padding: 10, borderWidth: 1 },
  listTopic:      { fontSize: 13, fontWeight: "700", color: T.textPrimary, flex: 1 },
  listBadge:      { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 99 },
  listBadgeTxt:   { fontSize: 10, fontWeight: "700" },
  listMeta:       { fontSize: 11, color: T.textSecondary, fontWeight: "600" },

  // modal
  overlay:        { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheet:          { backgroundColor: T.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: T.lg, paddingBottom: 32 },
  sheetHandle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: T.md },
  sheetBadge:     { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 99, borderWidth: 1, alignSelf: "flex-start", marginBottom: 12 },
  sheetBadgeTxt:  { fontSize: 12, fontWeight: "700" },
  sheetDate:      { fontSize: 18, fontWeight: "800", color: T.textPrimary, marginBottom: 4, letterSpacing: -0.3 },
  sheetTopic:     { fontSize: 14, color: T.primary, fontWeight: "700", marginBottom: T.base },
  sheetInfoWrap:  { gap: 8, marginBottom: T.base },
  sheetInfoRow:   { flexDirection: "row", alignItems: "center", gap: 10 },
  sheetInfoIcon:  { width: 28, height: 28, borderRadius: 14, backgroundColor: `${T.primary}10`, alignItems: "center", justifyContent: "center" },
  sheetInfoTxt:   { fontSize: 13, color: T.textPrimary, fontWeight: "600" },
  sheetNote:      { flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: `${T.warning}08`, borderRadius: T.radiusMd, padding: 10, borderWidth: 1, borderColor: `${T.warning}20`, marginBottom: T.base },
  sheetNoteTxt:   { flex: 1, fontSize: 12, color: T.textSecondary, lineHeight: 18 },
  closeBtn:       { backgroundColor: T.muted, borderRadius: T.radiusFull, paddingVertical: 13, alignItems: "center", borderWidth: 1, borderColor: T.border },
  closeBtnTxt:    { fontSize: 14, fontWeight: "700", color: T.textPrimary },
});

export default ClassCalendarScreen;
