import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { ClassSessionItem, FinalClass, getTutorSessions } from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Timetable">;
interface Props { navigation: Nav }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function addMonths(d: Date, n: number): Date {
  const date = new Date(d);
  date.setMonth(date.getMonth() + n);
  date.setDate(1);
  return date;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function monthKey(year: number, month: number) {
  return `${year}-${month}`;
}

/** All calendar cells for a month grid (includes leading/trailing padding days) */
function monthGridDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = first.getDay();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < leadingBlanks; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function parseTime(timeSlot?: string): number {
  if (!timeSlot) return 0;
  const part = timeSlot.split("-")[0].trim();
  const [timePart, meridiem] = part.split(" ");
  if (!timePart) return 0;
  let [h, m] = timePart.split(":").map(Number);
  if (meridiem?.toUpperCase() === "PM" && h !== 12) h += 12;
  if (meridiem?.toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + (m || 0);
}

function subjectLabel(cls?: FinalClass): string {
  const raw = cls?.subject?.[0];
  if (!raw) return "—";
  if (typeof raw === "string") return raw;
  return raw.label ?? raw.name ?? raw.value ?? "—";
}

const MODE_COLOR: Record<string, string> = {
  ONLINE: T.success, OFFLINE: T.primary, HYBRID: T.warning,
};
const SESSION_STATUS_COLOR: Record<string, string> = {
  PLANNED: T.mutedFg, COMPLETED: T.success, CANCELLED: T.error,
};

type ViewMode = "week" | "month";

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  // sessionCache[monthKey(year, month)] = ClassSessionItem[]
  const [sessionCache, setSessionCache] = useState<Record<string, ClassSessionItem[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Build a flat list of all cached sessions for quick date lookup
  const allSessions = Object.values(sessionCache).flat();

  // Map dateKey → sessions for quick lookup
  const sessionsByDay = React.useMemo(() => {
    const map: Record<string, ClassSessionItem[]> = {};
    for (const s of allSessions) {
      const d = new Date(s.sessionDate);
      const k = toKey(d);
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    return map;
  }, [allSessions.length, sessionCache]);

  const sessionsForDay = (d: Date): ClassSessionItem[] => {
    const items = sessionsByDay[toKey(d)] ?? [];
    return [...items].sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));
  };

  const fetchMonth = useCallback(async (year: number, month: number, force = false) => {
    const key = monthKey(year, month);
    if (!force && (sessionCache[key] !== undefined || fetchingRef.current.has(key))) return;
    fetchingRef.current.add(key);
    try {
      const res = await getTutorSessions(month + 1, year); // API month is 1-indexed
      setSessionCache((prev) => ({ ...prev, [key]: res.data ?? [] }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load sessions");
      setSessionCache((prev) => ({ ...prev, [key]: [] }));
    } finally {
      fetchingRef.current.delete(key);
    }
  }, []);

  // Determine which months are needed for the current view
  const neededMonthKeys = React.useMemo(() => {
    const months = new Set<string>();
    if (viewMode === "week") {
      weekDays.forEach((d) => months.add(monthKey(d.getFullYear(), d.getMonth())));
    } else {
      months.add(monthKey(monthDate.getFullYear(), monthDate.getMonth()));
    }
    return months;
  }, [viewMode, weekStart, monthDate]);

  // Initial load
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const promises: Promise<void>[] = [];
      neededMonthKeys.forEach((k) => {
        const [y, m] = k.split("-").map(Number);
        promises.push(fetchMonth(y, m));
      });
      await Promise.all(promises);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    })();
  }, []);

  // Fetch when navigating to a new month/week
  useEffect(() => {
    neededMonthKeys.forEach((k) => {
      const [y, m] = k.split("-").map(Number);
      fetchMonth(y, m);
    });
  }, [neededMonthKeys]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    const promises: Promise<void>[] = [];
    neededMonthKeys.forEach((k) => {
      const [y, m] = k.split("-").map(Number);
      promises.push(fetchMonth(y, m, true));
    });
    await Promise.all(promises);
    setRefreshing(false);
  }, [neededMonthKeys, fetchMonth]);

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (viewMode === "week") setWeekStart(startOfWeek(day));
  };

  const goBack = () => {
    if (viewMode === "week") {
      const newStart = addDays(weekStart, -7);
      setWeekStart(newStart);
      setSelectedDay(addDays(newStart, selectedDay.getDay()));
    } else {
      setMonthDate((d) => addMonths(d, -1));
    }
  };

  const goForward = () => {
    if (viewMode === "week") {
      const newStart = addDays(weekStart, 7);
      setWeekStart(newStart);
      setSelectedDay(addDays(newStart, selectedDay.getDay()));
    } else {
      setMonthDate((d) => addMonths(d, 1));
    }
  };

  const daySessions = sessionsForDay(selectedDay);

  const weekDotMap: Record<string, boolean> = {};
  weekDays.forEach((d) => { if (sessionsForDay(d).length > 0) weekDotMap[toKey(d)] = true; });

  const countForDay = (d: Date) => sessionsForDay(d).length;

  const navLabel = viewMode === "week"
    ? (() => {
        const first = weekDays[0], last = weekDays[6];
        if (first.getMonth() === last.getMonth())
          return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
        if (first.getFullYear() === last.getFullYear())
          return `${MONTH_NAMES[first.getMonth()].slice(0,3)} – ${MONTH_NAMES[last.getMonth()].slice(0,3)} ${first.getFullYear()}`;
        return `${MONTH_NAMES[first.getMonth()].slice(0,3)} ${first.getFullYear()} – ${MONTH_NAMES[last.getMonth()].slice(0,3)} ${last.getFullYear()}`;
      })()
    : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  const dayHeaderLabel = isSameDay(selectedDay, today)
    ? "Today"
    : `${DAY_LABELS[selectedDay.getDay()]}, ${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()].slice(0,3)}`;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.headerTitle}>Timetable</Text>
          <Text style={s.headerSub}>{navLabel}</Text>
        </View>
        <View style={s.viewToggle}>
          <Pressable
            style={[s.toggleBtn, viewMode === "week" && s.toggleBtnActive]}
            onPress={() => setViewMode("week")}
          >
            <Ionicons name="list-outline" size={15} color={viewMode === "week" ? "#fff" : "rgba(255,255,255,0.4)"} />
          </Pressable>
          <Pressable
            style={[s.toggleBtn, viewMode === "month" && s.toggleBtnActive]}
            onPress={() => setViewMode("month")}
          >
            <Ionicons name="calendar-outline" size={15} color={viewMode === "month" ? "#fff" : "rgba(255,255,255,0.4)"} />
          </Pressable>
        </View>
      </View>

      {/* ── Navigator bar ──────────────────────────────────────────────── */}
      <View style={s.navBar}>
        <Pressable onPress={goBack} hitSlop={10} style={s.navArrow}>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
        <Text style={s.navBarLabel}>{navLabel}</Text>
        <Pressable onPress={goForward} hitSlop={10} style={s.navArrow}>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      {/* ── Calendar ───────────────────────────────────────────────────── */}
      {viewMode === "week" ? (
        <WeekStrip
          weekDays={weekDays}
          selectedDay={selectedDay}
          today={today}
          dotMap={weekDotMap}
          onSelect={selectDay}
        />
      ) : (
        <MonthGrid
          monthDate={monthDate}
          selectedDay={selectedDay}
          today={today}
          countForDay={countForDay}
          onSelect={selectDay}
        />
      )}

      {/* ── Day label ──────────────────────────────────────────────────── */}
      <View style={s.dayHeader}>
        <Text style={s.dayHeaderText}>{dayHeaderLabel}</Text>
        {daySessions.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeTxt}>
              {daySessions.length} class{daySessions.length > 1 ? "es" : ""}
            </Text>
          </View>
        )}
      </View>

      {/* ── Content ────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}><ActivityIndicator color={T.primary} size="large" /></View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={T.error} />
          <Text style={s.errTxt}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={onRefresh}>
            <Text style={s.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        >
          {daySessions.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color="rgba(255,255,255,0.1)" />
              <Text style={s.emptyTitle}>No classes on this day</Text>
              <Text style={s.emptySubtitle}>Free day — enjoy the break!</Text>
            </View>
          ) : (
            daySessions.map((session) => (
              <Pressable
                key={session._id}
                onPress={() => navigation.navigate("MyClasses", {
                  highlightClassId: String(session.finalClass?._id ?? ""),
                })}
                style={({ pressed }) => pressed && { opacity: 0.75 }}
              >
                <SessionCard session={session} />
              </Pressable>
            ))
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

// ─── Week Strip ───────────────────────────────────────────────────────────────

function WeekStrip({ weekDays, selectedDay, today, dotMap, onSelect }: {
  weekDays: Date[];
  selectedDay: Date;
  today: Date;
  dotMap: Record<string, boolean>;
  onSelect: (d: Date) => void;
}) {
  return (
    <View style={ws.strip}>
      {weekDays.map((day) => {
        const key = toKey(day);
        const isSelected = isSameDay(day, selectedDay);
        const isToday = isSameDay(day, today);
        return (
          <Pressable key={key} style={[ws.pill, isSelected && ws.pillActive]} onPress={() => onSelect(day)}>
            <Text style={[ws.label, isSelected && ws.labelActive]}>{DAY_LABELS[day.getDay()]}</Text>
            <Text style={[ws.num, isSelected && ws.numActive, isToday && !isSelected && ws.numToday]}>
              {day.getDate()}
            </Text>
            {dotMap[key]
              ? <View style={[ws.dot, isSelected && ws.dotActive]} />
              : <View style={ws.dotPlaceholder} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

const CELL_SIZE = (Dimensions.get("window").width - 32) / 7;

function MonthGrid({ monthDate, selectedDay, today, countForDay, onSelect }: {
  monthDate: Date;
  selectedDay: Date;
  today: Date;
  countForDay: (d: Date) => number;
  onSelect: (d: Date) => void;
}) {
  const cells = monthGridDays(monthDate.getFullYear(), monthDate.getMonth());

  return (
    <View style={mg.wrap}>
      <View style={mg.headerRow}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[mg.headerCell, (i === 0 || i === 6) && mg.headerWeekend]}>{l}</Text>
        ))}
      </View>
      <View style={mg.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`blank-${idx}`} style={mg.cell} />;
          const isSelected = isSameDay(day, selectedDay);
          const isToday = isSameDay(day, today);
          const count = countForDay(day);
          const isCurrentMonth = day.getMonth() === monthDate.getMonth();

          return (
            <Pressable key={toKey(day)} style={mg.cell} onPress={() => onSelect(day)}>
              <View style={[
                mg.dayCircle,
                isSelected && mg.dayCircleSelected,
                isToday && !isSelected && mg.dayCircleToday,
              ]}>
                <Text style={[
                  mg.dayNum,
                  isSelected && mg.dayNumSelected,
                  isToday && !isSelected && mg.dayNumToday,
                  !isCurrentMonth && mg.dayNumFaded,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={mg.dots}>
                {count > 0 && Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                  <View key={di} style={[mg.dot, isSelected && mg.dotSelected]} />
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({ session }: { session: ClassSessionItem }) {
  const cls = session.finalClass;
  const subject = subjectLabel(cls);
  const mode = cls?.mode ?? "OFFLINE";
  const modeColor = MODE_COLOR[mode] ?? T.primary;
  const statusColor = SESSION_STATUS_COLOR[session.status] ?? T.mutedFg;
  const startTime = session.timeSlot?.split("-")[0]?.trim() ?? "—";

  return (
    <View style={cc.card}>
      <View style={cc.timeCol}>
        <Text style={cc.startTime}>{startTime}</Text>
        <View style={[cc.bar, { backgroundColor: modeColor + "50" }]} />
      </View>
      <View style={cc.body}>
        <View style={cc.topRow}>
          <Text style={cc.subject} numberOfLines={1}>{subject}</Text>
          <View style={[cc.modeBadge, { backgroundColor: modeColor + "18" }]}>
            <Text style={[cc.modeTxt, { color: modeColor }]}>{mode}</Text>
          </View>
        </View>
        {cls?.studentName ? (
          <View style={cc.metaRow}>
            <Ionicons name="person-outline" size={12} color={T.mutedFg} />
            <Text style={cc.metaTxt} numberOfLines={1}>{cls.studentName}</Text>
          </View>
        ) : null}
        <View style={cc.metaRow}>
          <Ionicons name="time-outline" size={12} color={T.mutedFg} />
          <Text style={cc.metaTxt}>{session.timeSlot || "—"}</Text>
        </View>
        {(cls?.grade || cls?.board) ? (
          <View style={cc.metaRow}>
            <Ionicons name="school-outline" size={12} color={T.mutedFg} />
            <Text style={cc.metaTxt}>{[cls.grade, cls.board].filter(Boolean).join(" · ")}</Text>
          </View>
        ) : null}
        <View style={cc.footer}>
          <Text style={[cc.statusTxt, { color: statusColor }]}>{session.status}</Text>
          {session.sessionNumber > 0 && (
            <Text style={cc.sessCount}>Session #{session.sessionNumber}</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.darkBg },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 },

  viewToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 10, padding: 2, gap: 2 },
  toggleBtn: { width: 32, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toggleBtnActive: { backgroundColor: T.primary },

  navBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  navArrow: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  navBarLabel: { color: "#fff", fontSize: 14, fontWeight: "700" },

  dayHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 14, paddingBottom: 8, gap: 8 },
  dayHeaderText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  countBadge: { backgroundColor: `${T.primary}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeTxt: { color: T.primary, fontSize: 11, fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errTxt: { color: T.mutedFg, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { backgroundColor: T.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyBox: { alignItems: "center", paddingTop: 48, gap: 8 },
  emptyTitle: { color: "rgba(255,255,255,0.45)", fontSize: 15, fontWeight: "600", marginTop: 8 },
  emptySubtitle: { color: "rgba(255,255,255,0.22)", fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
});

const ws = StyleSheet.create({
  strip: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 8, paddingBottom: 10 },
  pill: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, marginHorizontal: 2 },
  pillActive: { backgroundColor: T.primary },
  label: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.35)", marginBottom: 4, letterSpacing: 0.3 },
  labelActive: { color: "rgba(255,255,255,0.9)" },
  num: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  numActive: { color: "#fff" },
  numToday: { color: T.primary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.primary, marginTop: 4 },
  dotActive: { backgroundColor: "#fff" },
  dotPlaceholder: { width: 5, height: 5, marginTop: 4 },
});

const mg = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  headerRow: { flexDirection: "row", marginBottom: 4 },
  headerCell: { width: CELL_SIZE, textAlign: "center", fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.35)", letterSpacing: 0.5 },
  headerWeekend: { color: `${T.primary}99` },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL_SIZE, alignItems: "center", paddingVertical: 4 },
  dayCircle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  dayCircleSelected: { backgroundColor: T.primary },
  dayCircleToday: { borderWidth: 1.5, borderColor: T.primary },
  dayNum: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.75)" },
  dayNumSelected: { color: "#fff", fontWeight: "700" },
  dayNumToday: { color: T.primary, fontWeight: "700" },
  dayNumFaded: { color: "rgba(255,255,255,0.2)" },
  dots: { flexDirection: "row", gap: 2, height: 6, marginTop: 2 },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: T.primary },
  dotSelected: { backgroundColor: "#fff" },
});

const cc = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", overflow: "hidden" },
  timeCol: { width: 62, alignItems: "center", paddingTop: 16, paddingBottom: 16, gap: 6 },
  startTime: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: "600", textAlign: "center" },
  bar: { flex: 1, width: 2, borderRadius: 1, minHeight: 20 },
  body: { flex: 1, paddingTop: 14, paddingBottom: 14, paddingRight: 14, gap: 5 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  subject: { flex: 1, color: "#fff", fontSize: 15, fontWeight: "700", letterSpacing: -0.2 },
  modeBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  modeTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  metaTxt: { color: T.mutedFg, fontSize: 12, flex: 1 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  statusTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  sessCount: { color: "rgba(255,255,255,0.2)", fontSize: 11 },
});
