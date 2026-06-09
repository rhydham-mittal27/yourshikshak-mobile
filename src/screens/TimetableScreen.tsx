import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "../navigation/AppNavigator";
import { ClassSessionItem, FinalClass, getTutorSessions } from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Timetable">;
interface Props { navigation: Nav }

const { width: SCREEN_W } = Dimensions.get("window");

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS  = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_SHORT   = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  date.setDate(date.getDate() - date.getDay());
  date.setHours(0, 0, 0, 0);
  return date;
}
function addDays(d: Date, n: number): Date {
  const date = new Date(d); date.setDate(date.getDate() + n); return date;
}
function addMonths(d: Date, n: number): Date {
  const date = new Date(d); date.setMonth(date.getMonth() + n); date.setDate(1); return date;
}
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function toKey(d: Date) { return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`; }
function monthKey(year: number, month: number) { return `${year}-${month}`; }

function monthGridDays(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
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

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

const MODE_COLOR: Record<string, string> = {
  ONLINE: "#10B981", OFFLINE: "#2D68C4", HYBRID: "#F59E0B",
};
const MODE_GRADIENT: Record<string, [string, string]> = {
  ONLINE:  ["#0f3d2e", "#0f172a"],
  OFFLINE: ["#0f2450", "#0f172a"],
  HYBRID:  ["#3d2a0a", "#0f172a"],
};
const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  PLANNED:   { color: "#64748B", label: "Scheduled" },
  COMPLETED: { color: "#10B981", label: "Completed" },
  CANCELLED: { color: "#EF4444", label: "Cancelled" },
};

type ViewMode = "week" | "month";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [viewMode, setViewMode]   = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  const [sessionCache, setSessionCache] = useState<Record<string, ClassSessionItem[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const [loading, setLoading]     = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(12)).current;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const allSessions = Object.values(sessionCache).flat();

  const sessionsByDay = React.useMemo(() => {
    const map: Record<string, ClassSessionItem[]> = {};
    for (const s of allSessions) {
      const k = toKey(new Date(s.sessionDate));
      if (!map[k]) map[k] = [];
      map[k].push(s);
    }
    return map;
  }, [allSessions.length, sessionCache]);

  const sessionsForDay = (d: Date): ClassSessionItem[] =>
    [...(sessionsByDay[toKey(d)] ?? [])].sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));

  const fetchMonth = useCallback(async (year: number, month: number, force = false) => {
    const key = monthKey(year, month);
    if (!force && (sessionCache[key] !== undefined || fetchingRef.current.has(key))) return;
    fetchingRef.current.add(key);
    try {
      const res = await getTutorSessions(month + 1, year);
      setSessionCache((prev) => ({ ...prev, [key]: res.data ?? [] }));
    } catch (e: any) {
      setError(e?.message ?? "Failed to load sessions");
      setSessionCache((prev) => ({ ...prev, [key]: [] }));
    } finally {
      fetchingRef.current.delete(key);
    }
  }, []);

  const neededMonthKeys = React.useMemo(() => {
    const months = new Set<string>();
    if (viewMode === "week") {
      weekDays.forEach((d) => months.add(monthKey(d.getFullYear(), d.getMonth())));
    } else {
      months.add(monthKey(monthDate.getFullYear(), monthDate.getMonth()));
    }
    return months;
  }, [viewMode, weekStart, monthDate]);

  useEffect(() => {
    (async () => {
      setLoading(true); setError(null);
      await Promise.all([...neededMonthKeys].map((k) => {
        const [y, m] = k.split("-").map(Number);
        return fetchMonth(y, m);
      }));
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim,  { toValue: 1, duration: 320, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
      ]).start();
    })();
  }, []);

  useEffect(() => {
    neededMonthKeys.forEach((k) => {
      const [y, m] = k.split("-").map(Number);
      fetchMonth(y, m);
    });
  }, [neededMonthKeys]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true); setError(null);
    await Promise.all([...neededMonthKeys].map((k) => {
      const [y, m] = k.split("-").map(Number);
      return fetchMonth(y, m, true);
    }));
    setRefreshing(false);
  }, [neededMonthKeys, fetchMonth]);

  const selectDay = (day: Date) => {
    setSelectedDay(day);
    if (viewMode === "week") setWeekStart(startOfWeek(day));
  };

  const goBack = () => {
    if (viewMode === "week") {
      const s = addDays(weekStart, -7);
      setWeekStart(s);
      setSelectedDay(addDays(s, selectedDay.getDay()));
    } else {
      setMonthDate((d) => addMonths(d, -1));
    }
  };
  const goForward = () => {
    if (viewMode === "week") {
      const s = addDays(weekStart, 7);
      setWeekStart(s);
      setSelectedDay(addDays(s, selectedDay.getDay()));
    } else {
      setMonthDate((d) => addMonths(d, 1));
    }
  };

  const daySessions = sessionsForDay(selectedDay);
  const weekDotMap: Record<string, number> = {};
  weekDays.forEach((d) => { weekDotMap[toKey(d)] = sessionsForDay(d).length; });
  const countForDay = (d: Date) => sessionsForDay(d).length;

  const navLabel = viewMode === "week"
    ? (() => {
        const [f, l] = [weekDays[0], weekDays[6]];
        if (f.getMonth() === l.getMonth()) return `${MONTH_NAMES[f.getMonth()]} ${f.getFullYear()}`;
        if (f.getFullYear() === l.getFullYear()) return `${MONTH_SHORT[f.getMonth()]} – ${MONTH_SHORT[l.getMonth()]} ${f.getFullYear()}`;
        return `${MONTH_SHORT[f.getMonth()]} ${f.getFullYear()} – ${MONTH_SHORT[l.getMonth()]} ${l.getFullYear()}`;
      })()
    : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  const isToday = isSameDay(selectedDay, today);
  const dayLabel = isToday
    ? "Today"
    : `${DAY_LABELS[selectedDay.getDay()]}, ${formatDate(selectedDay)}`;

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <LinearGradient
        colors={["#162040", "#0f172a"]}
        style={s.hero}
      >
        {/* Top row: back + title + toggle */}
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backBtn}>
            <View style={s.backBtnInner}>
              <Ionicons name="chevron-back" size={20} color="rgba(255,255,255,0.9)" />
            </View>
          </Pressable>

          <View style={s.titleWrap}>
            <Text style={s.heroTitle}>Schedule</Text>
            <Text style={s.heroSub}>{navLabel}</Text>
          </View>

          <View style={s.viewToggle}>
            <Pressable
              style={[s.toggleBtn, viewMode === "week" && s.toggleActive]}
              onPress={() => setViewMode("week")}
            >
              <Ionicons name="list-outline" size={16} color={viewMode === "week" ? "#fff" : "rgba(255,255,255,0.35)"} />
            </Pressable>
            <Pressable
              style={[s.toggleBtn, viewMode === "month" && s.toggleActive]}
              onPress={() => setViewMode("month")}
            >
              <Ionicons name="calendar-outline" size={16} color={viewMode === "month" ? "#fff" : "rgba(255,255,255,0.35)"} />
            </Pressable>
          </View>
        </View>

        {/* Month navigator */}
        <View style={s.navRow}>
          <Pressable onPress={goBack} hitSlop={12} style={s.navBtn}>
            <Ionicons name="chevron-back" size={16} color="rgba(255,255,255,0.45)" />
          </Pressable>
          <Text style={s.navLabel}>{navLabel}</Text>
          <Pressable onPress={goForward} hitSlop={12} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.45)" />
          </Pressable>
        </View>

        {/* Calendar (week strip or month grid) */}
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
      </LinearGradient>

      {/* ── Day bar ─────────────────────────────────────────────────────── */}
      <View style={s.dayBar}>
        <View style={s.dayBarLeft}>
          {isToday && <View style={s.todayDot} />}
          <Text style={s.dayBarLabel}>{dayLabel}</Text>
        </View>
        {daySessions.length > 0 && (
          <View style={s.countChip}>
            <Text style={s.countChipTxt}>{daySessions.length}</Text>
          </View>
        )}
      </View>

      {/* ── Session list ────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.primary} size="large" />
          <Text style={s.loadingTxt}>Loading sessions…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <View style={s.errorIcon}>
            <Ionicons name="alert-circle-outline" size={32} color={T.error} />
          </View>
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorSub}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={15} color="#fff" />
            <Text style={s.retryTxt}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.primary}
              colors={[T.primary]}
            />
          }
        >
          {daySessions.length === 0 ? (
            <EmptyState isToday={isToday} />
          ) : (
            <>
              {daySessions.map((session, index) => (
                <Pressable
                  key={session._id}
                  onPress={() => navigation.navigate("MyClasses", {
                    highlightClassId: String(session.finalClass?._id ?? ""),
                  })}
                  style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                >
                  <SessionCard session={session} index={index} />
                </Pressable>
              ))}
            </>
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
  dotMap: Record<string, number>;
  onSelect: (d: Date) => void;
}) {
  return (
    <View style={ws.row}>
      {weekDays.map((day) => {
        const key = toKey(day);
        const isSelected = isSameDay(day, selectedDay);
        const isToday    = isSameDay(day, today);
        const count      = dotMap[key] ?? 0;

        return (
          <Pressable key={key} onPress={() => onSelect(day)} style={ws.cell}>
            <Text style={[ws.dayLbl, isSelected && ws.dayLblActive, isToday && !isSelected && ws.dayLblToday]}>
              {DAY_SHORT[day.getDay()]}
            </Text>

            <View style={[
              ws.numWrap,
              isSelected && ws.numWrapSelected,
              isToday && !isSelected && ws.numWrapToday,
            ]}>
              <Text style={[ws.num, isSelected && ws.numSelected, isToday && !isSelected && ws.numToday]}>
                {day.getDate()}
              </Text>
            </View>

            <View style={ws.dotsRow}>
              {count > 0
                ? Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <View key={i} style={[ws.dot, isSelected ? ws.dotSelected : ws.dotNormal]} />
                  ))
                : <View style={ws.dotEmpty} />
              }
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Month Grid ───────────────────────────────────────────────────────────────

const CELL_W = (SCREEN_W - 32) / 7;

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
      {/* Day-of-week header */}
      <View style={mg.header}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[mg.hCell, (i === 0 || i === 6) && mg.hWeekend]}>{l}</Text>
        ))}
      </View>

      <View style={mg.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`b${idx}`} style={mg.cell} />;
          const isSel   = isSameDay(day, selectedDay);
          const isT     = isSameDay(day, today);
          const count   = countForDay(day);
          const isCur   = day.getMonth() === monthDate.getMonth();

          return (
            <Pressable key={toKey(day)} style={mg.cell} onPress={() => onSelect(day)}>
              <View style={[mg.circle, isSel && mg.circleSelected, isT && !isSel && mg.circleToday]}>
                <Text style={[
                  mg.num,
                  isSel && mg.numSelected,
                  isT && !isSel && mg.numToday,
                  !isCur && mg.numFaded,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
              <View style={mg.dots}>
                {count > 0 && Array.from({ length: Math.min(count, 3) }).map((_, di) => (
                  <View key={di} style={[mg.dot, isSel && mg.dotSel]} />
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

function SessionCard({ session, index }: { session: ClassSessionItem; index: number }) {
  const cls        = session.finalClass;
  const subject    = subjectLabel(cls);
  const mode       = cls?.mode ?? "OFFLINE";
  const modeColor  = MODE_COLOR[mode] ?? T.primary;
  const gradColors = MODE_GRADIENT[mode] ?? MODE_GRADIENT.OFFLINE;
  const statusConf = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PLANNED;
  const startTime  = session.timeSlot?.split("(")[0]?.trim() ?? "—";
  const duration   = session.timeSlot?.match(/\(([^)]+)\)/)?.[1];

  return (
    <View style={cc.card}>
      {/* Left accent */}
      <View style={[cc.accent, { backgroundColor: modeColor }]} />

      <LinearGradient
        colors={[gradColors[0] + "cc", gradColors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={cc.inner}
      >
        {/* Session number chip (top-right) */}
        <View style={[cc.sessionChip, { backgroundColor: modeColor + "22", borderColor: modeColor + "44" }]}>
          <Text style={[cc.sessionChipTxt, { color: modeColor }]}>#{session.sessionNumber}</Text>
        </View>

        {/* Subject + mode badge */}
        <View style={cc.topRow}>
          <Text style={cc.subject} numberOfLines={1}>{subject}</Text>
          <View style={[cc.modeBadge, { backgroundColor: modeColor + "20", borderColor: modeColor + "40" }]}>
            <View style={[cc.modeDot, { backgroundColor: modeColor }]} />
            <Text style={[cc.modeTxt, { color: modeColor }]}>{mode}</Text>
          </View>
        </View>

        {/* Time block */}
        <View style={cc.timeBlock}>
          <Ionicons name="time-outline" size={13} color={modeColor} />
          <Text style={[cc.timeTxt, { color: modeColor }]}>{startTime}</Text>
          {duration && <Text style={cc.durationTxt}>· {duration}</Text>}
        </View>

        {/* Divider */}
        <View style={[cc.divider, { backgroundColor: "rgba(255,255,255,0.06)" }]} />

        {/* Meta rows */}
        <View style={cc.metaGrid}>
          {cls?.studentName ? (
            <View style={cc.metaItem}>
              <Ionicons name="person-circle-outline" size={14} color="rgba(255,255,255,0.35)" />
              <Text style={cc.metaTxt} numberOfLines={1}>{cls.studentName}</Text>
            </View>
          ) : null}
          {(cls?.grade || cls?.board) ? (
            <View style={cc.metaItem}>
              <Ionicons name="ribbon-outline" size={14} color="rgba(255,255,255,0.35)" />
              <Text style={cc.metaTxt}>{[cls?.grade, cls?.board].filter(Boolean).join(" · ")}</Text>
            </View>
          ) : null}
        </View>

        {/* Status bar */}
        <View style={cc.statusRow}>
          <View style={[cc.statusDot, { backgroundColor: statusConf.color }]} />
          <Text style={[cc.statusTxt, { color: statusConf.color }]}>{statusConf.label}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ isToday }: { isToday: boolean }) {
  return (
    <View style={es.wrap}>
      <LinearGradient
        colors={["rgba(45,104,196,0.12)", "rgba(45,104,196,0.04)"]}
        style={es.iconCircle}
      >
        <Ionicons name="calendar-outline" size={36} color="rgba(45,104,196,0.5)" />
      </LinearGradient>
      <Text style={es.title}>{isToday ? "Nothing today" : "No classes"}</Text>
      <Text style={es.sub}>
        {isToday
          ? "You have a free day — time to recharge!"
          : "No sessions scheduled for this day."}
      </Text>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0b1120" },

  // Hero
  hero: { paddingHorizontal: 0, paddingBottom: 4 },

  headerRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingTop: 6, paddingBottom: 10,
  },
  backBtn: {
    width: 74, height: 36, borderRadius: 18,
    alignItems: "flex-start", justifyContent: "center",
    paddingLeft: 0,
  },
  backBtnInner: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center", justifyContent: "center",
  },
  titleWrap: { flex: 1, alignItems: "center" },
  heroTitle: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.4 },
  heroSub:   { color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 1, letterSpacing: 0.2 },

  viewToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 11, padding: 3, gap: 2,
  },
  toggleBtn: { width: 34, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: T.primary },

  navRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  navBtn:   { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  navLabel: { color: "rgba(255,255,255,0.75)", fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },

  // Day bar
  dayBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)",
  },
  dayBarLeft:  { flexDirection: "row", alignItems: "center", gap: 8 },
  dayBarLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  todayDot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: T.primary,
  },
  countChip: {
    minWidth: 26, height: 26, borderRadius: 13,
    backgroundColor: T.primary,
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 8,
  },
  countChipTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },

  // States
  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingTxt: { color: "rgba(255,255,255,0.3)", fontSize: 13, marginTop: 4 },

  errorIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(239,68,68,0.1)", alignItems: "center", justifyContent: "center" },
  errorTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  errorSub:   { color: "rgba(255,255,255,0.4)", fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  retryBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: T.primary, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryTxt:   { color: "#fff", fontWeight: "700", fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 12 },
});

const ws = StyleSheet.create({
  row: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  cell: { flex: 1, alignItems: "center", gap: 4 },

  dayLbl: {
    fontSize: 9, fontWeight: "700", letterSpacing: 0.8,
    color: "rgba(255,255,255,0.28)", marginBottom: 2,
  },
  dayLblActive: { color: "rgba(255,255,255,0.9)" },
  dayLblToday:  { color: T.primaryLight },

  numWrap: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: "center", justifyContent: "center",
  },
  numWrapSelected: { backgroundColor: T.primary },
  numWrapToday:    { borderWidth: 1.5, borderColor: T.primary },

  num:         { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.6)" },
  numSelected: { color: "#fff" },
  numToday:    { color: T.primary, fontWeight: "800" },

  dotsRow:    { flexDirection: "row", gap: 3, height: 6 },
  dot:        { width: 4, height: 4, borderRadius: 2 },
  dotNormal:  { backgroundColor: T.primary + "90" },
  dotSelected:{ backgroundColor: "#fff" },
  dotEmpty:   { width: 4, height: 4 },
});

const mg = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 8 },
  header: { flexDirection: "row", marginBottom: 6 },
  hCell:    { width: CELL_W, textAlign: "center", fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.28)", letterSpacing: 0.8 },
  hWeekend: { color: T.primary + "90" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL_W, alignItems: "center", paddingVertical: 3 },
  circle: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  circleSelected: { backgroundColor: T.primary },
  circleToday:    { borderWidth: 1.5, borderColor: T.primary },
  num:         { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  numSelected: { color: "#fff", fontWeight: "700" },
  numToday:    { color: T.primary, fontWeight: "800" },
  numFaded:    { color: "rgba(255,255,255,0.18)" },
  dots: { flexDirection: "row", gap: 2, height: 5, marginTop: 2 },
  dot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: T.primary + "90" },
  dotSel: { backgroundColor: "#fff" },
});

const cc = StyleSheet.create({
  card: {
    flexDirection: "row",
    borderRadius: 18,
    marginBottom: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  accent: { width: 4 },
  inner:  { flex: 1, padding: 16 },

  sessionChip: {
    position: "absolute", top: 14, right: 14,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sessionChipTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.4 },

  topRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingRight: 52 },
  subject: { flex: 1, color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.4, lineHeight: 22 },

  modeBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: "flex-start",
  },
  modeDot:  { width: 5, height: 5, borderRadius: 3 },
  modeTxt:  { fontSize: 9, fontWeight: "800", letterSpacing: 0.8 },

  timeBlock: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  timeTxt:   { fontSize: 14, fontWeight: "700" },
  durationTxt: { color: "rgba(255,255,255,0.35)", fontSize: 13 },

  divider: { height: 1, marginVertical: 12 },

  metaGrid: { gap: 6 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaTxt:  { color: "rgba(255,255,255,0.5)", fontSize: 12, flex: 1 },

  statusRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 12 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
});

const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 56, gap: 12 },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  title: { color: "rgba(255,255,255,0.6)", fontSize: 17, fontWeight: "700" },
  sub:   { color: "rgba(255,255,255,0.25)", fontSize: 13, textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
});
