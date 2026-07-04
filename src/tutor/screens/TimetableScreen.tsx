import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "../../navigation/AppNavigator";
import { ClassSessionItem, FinalClass, getTutorSessions, requestTutorReschedule } from "../../api/client";
import { T } from "../../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Timetable">;
interface Props { navigation: Nav }

const { width: SCREEN_W } = Dimensions.get("window");

// â”€â”€â”€ Design tokens (light theme) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const C = {
  bg:          "#F8FAFC",
  headerBg:    "#FFFFFF",
  cardBg:      "#FFFFFF",
  border:      "#E8EDF5",
  textPrimary: "#0F172A",
  textSecond:  "#64748B",
  textMuted:   "#94A3B8",
  accent:      T.primary,
};

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
  if (!raw) return —”";
  if (typeof raw === "string") return raw;
  return raw.label ?? raw.name ?? raw.value ?? —”";
}

function formatDate(d: Date): string {
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

const MODE_COLOR: Record<string, string> = {
  ONLINE: "#10B981", OFFLINE: T.primary, HYBRID: "#F59E0B",
};
const STATUS_CONFIG: Record<string, { color: string; label: string; bg: string }> = {
  PLANNED:   { color: "#64748B", label: "Scheduled", bg: "#F1F5F9" },
  COMPLETED: { color: "#10B981", label: "Completed",  bg: "#ECFDF5" },
  CANCELLED: { color: "#EF4444", label: "Cancelled",  bg: "#FEF2F2" },
};

type ViewMode = "week" | "month";

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [viewMode, setViewMode]   = useState<ViewMode>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [monthDate, setMonthDate] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(today);

  const [sessionCache, setSessionCache] = useState<Record<string, ClassSessionItem[]>>({});
  const fetchingRef = useRef<Set<string>>(new Set());

  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(14)).current;

  const [rescheduleTarget, setRescheduleTarget] = useState<ClassSessionItem | null>(null);

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
        Animated.timing(fadeAnim,  { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
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
      setWeekStart(s); setSelectedDay(addDays(s, selectedDay.getDay()));
    } else { setMonthDate((d) => addMonths(d, -1)); }
  };
  const goForward = () => {
    if (viewMode === "week") {
      const s = addDays(weekStart, 7);
      setWeekStart(s); setSelectedDay(addDays(s, selectedDay.getDay()));
    } else { setMonthDate((d) => addMonths(d, 1)); }
  };

  const daySessions = sessionsForDay(selectedDay);
  const weekDotMap: Record<string, number> = {};
  weekDays.forEach((d) => { weekDotMap[toKey(d)] = sessionsForDay(d).length; });
  const countForDay = (d: Date) => sessionsForDay(d).length;

  const navLabel = viewMode === "week"
    ? (() => {
        const [f, l] = [weekDays[0], weekDays[6]];
        if (f.getMonth() === l.getMonth()) return `${MONTH_NAMES[f.getMonth()]} ${f.getFullYear()}`;
        if (f.getFullYear() === l.getFullYear()) return `${MONTH_SHORT[f.getMonth()]} "“ ${MONTH_SHORT[l.getMonth()]} ${f.getFullYear()}`;
        return `${MONTH_SHORT[f.getMonth()]} ${f.getFullYear()} "“ ${MONTH_SHORT[l.getMonth()]} ${l.getFullYear()}`;
      })()
    : `${MONTH_NAMES[monthDate.getMonth()]} ${monthDate.getFullYear()}`;

  const isToday  = isSameDay(selectedDay, today);
  const dayLabel = isToday
    ? "Today"
    : `${DAY_LABELS[selectedDay.getDay()]}, ${formatDate(selectedDay)}`;

  return (
    <View style={s.root}>

      {/* â”€â”€ Hero header (branded gradient) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <LinearGradient colors={[T.darkBg, T.darkBgMid, "#162032"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[s.hero, { paddingTop: insets.top }]}>
        {/* Top row: back + title + toggle */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backWrap}>
            <View style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </Pressable>

          <View style={s.titleWrap}>
            <Text style={s.title}>Schedule</Text>
            <Text style={s.titleSub}>{navLabel}</Text>
          </View>

          <View style={s.viewToggle}>
            <Pressable style={[s.toggleBtn, viewMode === "week" && s.toggleActive]} onPress={() => setViewMode("week")}>
              <Ionicons name="list-outline" size={16} color={viewMode === "week" ? T.primary : "rgba(255,255,255,0.6)"} />
            </Pressable>
            <Pressable style={[s.toggleBtn, viewMode === "month" && s.toggleActive]} onPress={() => setViewMode("month")}>
              <Ionicons name="calendar-outline" size={16} color={viewMode === "month" ? T.primary : "rgba(255,255,255,0.6)"} />
            </Pressable>
          </View>
        </View>

        {/* Month navigator */}
        <View style={s.navRow}>
          <Pressable onPress={goBack} hitSlop={12} style={s.navBtn}>
            <Ionicons name="chevron-back" size={17} color="rgba(255,255,255,0.8)" />
          </Pressable>
          <Text style={s.navLabel}>{navLabel}</Text>
          <Pressable onPress={goForward} hitSlop={12} style={s.navBtn}>
            <Ionicons name="chevron-forward" size={17} color="rgba(255,255,255,0.8)" />
          </Pressable>
        </View>

        {/* Calendar */}
        <View style={s.calendarCard}>
        {viewMode === "week" ? (
          <WeekStrip weekDays={weekDays} selectedDay={selectedDay} today={today} dotMap={weekDotMap} onSelect={selectDay} />
        ) : (
          <MonthGrid monthDate={monthDate} selectedDay={selectedDay} today={today} countForDay={countForDay} onSelect={selectDay} />
        )}
      </View>
      </LinearGradient>

      {/* â”€â”€ Day bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <View style={s.dayBar}>
        <View style={s.dayBarLeft}>
          {isToday && <LinearGradient colors={[C.accent, T.primaryLight]} style={s.todayPill}>
            <Text style={s.todayPillTxt}>TODAY</Text>
          </LinearGradient>}
          <Text style={s.dayLabel}>{isToday ? formatDate(selectedDay) : dayLabel}</Text>
        </View>
        {daySessions.length > 0 && (
          <View style={s.countChip}>
            <Text style={s.countChipTxt}>{daySessions.length} class{daySessions.length > 1 ? "es" : —}</Text>
          </View>
        )}
      </View>

      {/* â”€â”€ Session list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={C.accent} size="large" />
          <Text style={s.loadingTxt}>Loading sessions…</Text>
        </View>
      ) : error ? (
        <View style={s.center}>
          <View style={s.errorIcon}>
            <Ionicons name="alert-circle-outline" size={30} color={T.error} />
          </View>
          <Text style={s.errorTitle}>Something went wrong</Text>
          <Text style={s.errorSub}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={onRefresh}>
            <Ionicons name="refresh-outline" size={14} color="#fff" />
            <Text style={s.retryTxt}>Try again</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.accent} colors={[C.accent]} />}
        >
          {daySessions.length === 0 ? (
            <EmptyState isToday={isToday} />
          ) : (
            daySessions.map((session, index) => (
              <Pressable
                key={session._id}
                onPress={() => navigation.navigate("MyClasses", { highlightClassId: String(session.finalClass?._id ?? —) })}
                style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.98 : 1 }] })}
              >
                <SessionCard session={session} index={index} onReschedule={() => setRescheduleTarget(session)} />
              </Pressable>
            ))
          )}
        </Animated.ScrollView>
      )}

      {/* â”€â”€ Reschedule modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {rescheduleTarget && (
        <RescheduleModal
          session={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSuccess={(updated) => {
            setSessionCache((prev) => {
              const next = { ...prev };
              for (const k of Object.keys(next)) {
                next[k] = next[k].map((s) => s._id === updated._id ? { ...s, ...updated } : s);
              }
              return next;
            });
            setRescheduleTarget(null);
          }}
        />
      )}
    </View>
  );
}

// â”€â”€â”€ Week Strip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function WeekStrip({ weekDays, selectedDay, today, dotMap, onSelect }: {
  weekDays: Date[]; selectedDay: Date; today: Date;
  dotMap: Record<string, number>; onSelect: (d: Date) => void;
}) {
  return (
    <View style={ws.row}>
      {weekDays.map((day) => {
        const key = toKey(day);
        const isSel   = isSameDay(day, selectedDay);
        const isToday = isSameDay(day, today);
        const count   = dotMap[key] ?? 0;
        return (
          <Pressable key={key} onPress={() => onSelect(day)} style={ws.cell}>
            <Text style={[ws.dayLbl, isSel && ws.dayLblSel, isToday && !isSel && ws.dayLblToday]}>
              {DAY_SHORT[day.getDay()]}
            </Text>
            <View style={[ws.numWrap, isSel && ws.numWrapSel, isToday && !isSel && ws.numWrapToday]}>
              <Text style={[ws.num, isSel && ws.numSel, isToday && !isSel && ws.numToday]}>
                {day.getDate()}
              </Text>
            </View>
            <View style={ws.dotsRow}>
              {count > 0
                ? Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                    <View key={i} style={[ws.dot, isSel ? ws.dotSel : ws.dotNorm]} />
                  ))
                : <View style={ws.dotEmpty} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

// â”€â”€â”€ Month Grid â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CELL_W = (SCREEN_W - 32) / 7;

function MonthGrid({ monthDate, selectedDay, today, countForDay, onSelect }: {
  monthDate: Date; selectedDay: Date; today: Date;
  countForDay: (d: Date) => number; onSelect: (d: Date) => void;
}) {
  const cells = monthGridDays(monthDate.getFullYear(), monthDate.getMonth());
  return (
    <View style={mg.wrap}>
      <View style={mg.header}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[mg.hCell, (i === 0 || i === 6) && mg.hWeekend]}>{l}</Text>
        ))}
      </View>
      <View style={mg.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`b${idx}`} style={mg.cell} />;
          const isSel = isSameDay(day, selectedDay);
          const isT   = isSameDay(day, today);
          const count = countForDay(day);
          const isCur = day.getMonth() === monthDate.getMonth();
          return (
            <Pressable key={toKey(day)} style={mg.cell} onPress={() => onSelect(day)}>
              <View style={[mg.circle, isSel && mg.circleSel, isT && !isSel && mg.circleToday]}>
                <Text style={[mg.num, isSel && mg.numSel, isT && !isSel && mg.numToday, !isCur && mg.numFaded]}>
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

// â”€â”€â”€ Session Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function SessionCard({ session, index, onReschedule }: {
  session: ClassSessionItem; index: number; onReschedule: () => void;
}) {
  const cls         = session.finalClass;
  const subject     = subjectLabel(cls);
  const mode        = cls?.mode ?? "OFFLINE";
  const modeColor   = MODE_COLOR[mode] ?? T.primary;
  const statusConf  = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.PLANNED;
  const startTime   = session.timeSlot?.split("(")[0]?.trim() ?? —”";
  const duration    = session.timeSlot?.match(/\(([^)]+)\)/)?.[1];
  const canReschedule = session.status === "PLANNED" && new Date(session.sessionDate) > new Date();

  return (
    <View style={cc.card}>
      <View style={cc.body}>
        {/* Session chip */}
        <View style={[cc.sessionChip, { backgroundColor: modeColor + "18", borderColor: modeColor + "30" }]}>
          <Text style={[cc.sessionChipTxt, { color: modeColor }]}>#{session.sessionNumber}</Text>
        </View>

        {/* Subject + mode */}
        <View style={cc.topRow}>
          <Text style={cc.subject} numberOfLines={1}>{subject}</Text>
          <View style={[cc.modeBadge, { backgroundColor: modeColor + "15", borderColor: modeColor + "30" }]}>
            <View style={[cc.modeDot, { backgroundColor: modeColor }]} />
            <Text style={[cc.modeTxt, { color: modeColor }]}>{mode}</Text>
          </View>
        </View>

        {/* Time */}
        <View style={cc.timeRow}>
          <View style={[cc.timeIconWrap, { backgroundColor: modeColor + "12" }]}>
            <Ionicons name="time-outline" size={13} color={modeColor} />
          </View>
          <Text style={[cc.timeTxt, { color: modeColor }]}>{startTime}</Text>
          {duration && <Text style={cc.durationTxt}>{duration}</Text>}
        </View>

        <View style={cc.divider} />

        {/* Meta */}
        <View style={cc.meta}>
          {cls?.studentName ? (
            <View style={cc.metaRow}>
              <Ionicons name="person-outline" size={13} color={C.textMuted} />
              <Text style={cc.metaTxt} numberOfLines={1}>{cls.studentName}</Text>
            </View>
          ) : null}
          {(cls?.grade || cls?.board) ? (
            <View style={cc.metaRow}>
              <Ionicons name="school-outline" size={13} color={C.textMuted} />
              <Text style={cc.metaTxt}>{[cls?.grade, cls?.board].filter(Boolean).join(" · ")}</Text>
            </View>
          ) : null}
        </View>

        {/* Footer */}
        <View style={cc.footer}>
          <View style={[cc.statusBadge, { backgroundColor: statusConf.bg }]}>
            <View style={[cc.statusDot, { backgroundColor: statusConf.color }]} />
            <Text style={[cc.statusTxt, { color: statusConf.color }]}>{statusConf.label}</Text>
          </View>
          {canReschedule && (
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onReschedule(); }}
              style={({ pressed }) => [cc.rescheduleBtn, { borderColor: modeColor + "50" }, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name="calendar-outline" size={12} color={modeColor} />
              <Text style={[cc.rescheduleTxt, { color: modeColor }]}>Reschedule</Text>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

// â”€â”€â”€ Modal Calendar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const CAL_CELL = (SCREEN_W - 64) / 7;

function ModalCalendar({ selected, calMonth, modeColor, onSelect, onMonthChange }: {
  selected: Date; calMonth: Date; modeColor: string;
  onSelect: (d: Date) => void; onMonthChange: (d: Date) => void;
}) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const cells = monthGridDays(calMonth.getFullYear(), calMonth.getMonth());
  const prevMonth = () => onMonthChange(addMonths(calMonth, -1));
  const nextMonth = () => onMonthChange(addMonths(calMonth, 1));

  return (
    <View style={cal.wrap}>
      {/* Month nav */}
      <View style={cal.navRow}>
        <Pressable onPress={prevMonth} style={cal.navBtn} hitSlop={10}>
          <Ionicons name="chevron-back" size={16} color={C.textSecond} />
        </Pressable>
        <Text style={cal.navTitle}>
          {MONTH_NAMES[calMonth.getMonth()]} {calMonth.getFullYear()}
        </Text>
        <Pressable onPress={nextMonth} style={cal.navBtn} hitSlop={10}>
          <Ionicons name="chevron-forward" size={16} color={C.textSecond} />
        </Pressable>
      </View>

      {/* Day-of-week header */}
      <View style={cal.headerRow}>
        {DAY_LETTERS.map((l, i) => (
          <Text key={i} style={[cal.headerCell, (i === 0 || i === 6) && cal.headerWeekend]}>{l}</Text>
        ))}
      </View>

      {/* Day grid */}
      <View style={cal.grid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e${idx}`} style={cal.cell} />;
          const isSel  = isSameDay(day, selected);
          const isT    = isSameDay(day, today);
          const isPast = day < today;
          const isCur  = day.getMonth() === calMonth.getMonth();
          return (
            <Pressable
              key={toKey(day)}
              style={cal.cell}
              onPress={() => { if (isCur) onSelect(new Date(day)); }}
              disabled={!isCur}
            >
              <View style={[
                cal.circle,
                isSel && [cal.circleSel, { backgroundColor: modeColor }],
                isT && !isSel && [cal.circleToday, { borderColor: modeColor }],
              ]}>
                <Text style={[
                  cal.num,
                  isSel && cal.numSel,
                  isT && !isSel && [cal.numToday, { color: modeColor }],
                  !isCur && cal.numFaded,
                  isPast && isCur && !isSel && cal.numPast,
                ]}>
                  {day.getDate()}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// â”€â”€â”€ Reschedule Modal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function RescheduleModal({ session, onClose, onSuccess }: {
  session: ClassSessionItem;
  onClose: () => void;
  onSuccess: (updated: ClassSessionItem) => void;
}) {
  const insets   = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 4,
      onPanResponderMove: (_, g) => {
        if (g.dy > 0) translateY.setValue(g.dy);
      },
      onPanResponderRelease: (_, g) => {
        if (g.dy > 80 || g.vy > 0.5) {
          Animated.timing(translateY, { toValue: 600, duration: 220, useNativeDriver: true }).start(onClose);
        } else {
          Animated.spring(translateY, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  const [date, setDate]       = useState(new Date(session.sessionDate));
  const [calMonth, setCalMonth] = useState(new Date(session.sessionDate));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);

  const subject   = subjectLabel(session.finalClass);
  const mode      = session.finalClass?.mode ?? "OFFLINE";
  const modeColor = MODE_COLOR[mode] ?? T.primary;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "long", year: "numeric" });

  const handleConfirm = async () => {
    setSubmitting(true); setError(null);
    try {
      await requestTutorReschedule(session._id, date.toISOString());
      setSubmitted(true);
    } catch (e: any) {
      setError(e?.message ?? "Failed to submit reschedule request");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={rm.backdrop} onPress={onClose}>
        <Animated.View
          style={[rm.sheet, { paddingBottom: Math.max(insets.bottom, 24), transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={rm.handle} />

          {/* Header */}
          <View style={rm.header}>
            <View style={[rm.iconWrap, { backgroundColor: modeColor + "15" }]}>
              <Ionicons name="calendar-outline" size={20} color={modeColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={rm.title}>Reschedule Session</Text>
              <Text style={rm.sub} numberOfLines={1}>{subject} · {session.finalClass?.studentName ?? —}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={rm.closeBtn}>
              <Ionicons name="close" size={17} color={C.textMuted} />
            </Pressable>
          </View>

          {/* Current â†’ New date row */}
          <View style={rm.dateTransferRow}>
            <View style={rm.dateTransferBox}>
              <Text style={rm.dateTransferLabel}>FROM</Text>
              <Text style={rm.dateTransferVal} numberOfLines={1}>{fmt(new Date(session.sessionDate))}</Text>
            </View>
            <View style={[rm.dateTransferArrow, { backgroundColor: modeColor + "18" }]}>
              <Ionicons name="arrow-forward" size={14} color={modeColor} />
            </View>
            <View style={[rm.dateTransferBox, rm.dateTransferBoxTo, { borderColor: modeColor + "50", backgroundColor: modeColor + "08" }]}>
              <Text style={[rm.dateTransferLabel, { color: modeColor }]}>TO</Text>
              <Text style={[rm.dateTransferVal, { color: modeColor, fontWeight: "800" }]} numberOfLines={1}>{fmt(date)}</Text>
            </View>
          </View>

          {/* Inline custom calendar */}
          <ModalCalendar
            selected={date}
            calMonth={calMonth}
            modeColor={modeColor}
            onSelect={(d) => setDate(d)}
            onMonthChange={(d) => setCalMonth(d)}
          />

          {submitted ? (
            <View style={{ alignItems: "center", paddingVertical: 16, gap: 6 }}>
              <Ionicons name="checkmark-circle" size={40} color={T.success} />
              <Text style={{ fontWeight: "800", fontSize: 15, color: T.textPrimary }}>Request Sent</Text>
              <Text style={{ fontSize: 12, color: T.textSecondary, textAlign: "center", lineHeight: 18 }}>
                Pending coordinator approval. The session will only move once approved.
              </Text>
            </View>
          ) : (
            <>
              {error ? <Text style={rm.errTxt}>{error}</Text> : null}
            </>
          )}

          {/* Actions */}
          <View style={rm.actions}>
            <Pressable style={rm.cancelBtn} onPress={onClose}>
              <Text style={rm.cancelTxt}>{submitted ? "Close" : "Cancel"}</Text>
            </Pressable>
            {!submitted && (
              <Pressable
                style={[rm.confirmBtn, { backgroundColor: modeColor }, submitting && { opacity: 0.6 }]}
                onPress={handleConfirm}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#fff" size="small" />
                  : <>
                      <Ionicons name="send-outline" size={16} color="#fff" />
                      <Text style={rm.confirmTxt}>Send Request</Text>
                    </>
                }
              </Pressable>
            )}
          </View>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

// â”€â”€â”€ Empty State â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function EmptyState({ isToday }: { isToday: boolean }) {
  return (
    <View style={es.wrap}>
      <View style={es.iconCircle}>
        <Ionicons name="calendar-outline" size={36} color={T.primary + "60"} />
      </View>
      <Text style={es.title}>{isToday ? "Nothing today" : "No classes"}</Text>
      <Text style={es.sub}>
        {isToday ? "You have a free day "” enjoy the break!" : "No sessions scheduled for this day."}
      </Text>
    </View>
  );
}

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    paddingBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },

  header: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  backWrap: { width: 74, alignItems: "flex-start", justifyContent: "center" },
  backBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  titleWrap: { flex: 1, alignItems: "center" },
  title:     { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.5 },
  titleSub:  { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },

  viewToggle: {
    width: 74, flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 10,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
    padding: 3, gap: 2, justifyContent: "flex-end",
  },
  toggleBtn:    { width: 30, height: 28, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  toggleActive: { backgroundColor: "#fff" },

  navRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 8,
  },
  navBtn:   { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  navLabel: { color: "#fff", fontSize: 13, fontWeight: "700" },

  calendarCard: { paddingTop: 8, paddingBottom: 12 },

  dayBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingVertical: 14,
  },
  dayBarLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  todayPill:  { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 },
  todayPillTxt: { color: "#fff", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  dayLabel:   { color: C.textPrimary, fontSize: 15, fontWeight: "800", letterSpacing: -0.2 },
  countChip:  {
    backgroundColor: C.accent + "14", borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1, borderColor: C.accent + "25",
  },
  countChipTxt: { color: C.accent, fontSize: 11, fontWeight: "700" },

  center:     { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingTxt: { color: C.textMuted, fontSize: 13, marginTop: 4 },
  errorIcon:  { width: 64, height: 64, borderRadius: 32, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  errorTitle: { color: C.textPrimary, fontSize: 16, fontWeight: "800" },
  errorSub:   { color: C.textSecond, fontSize: 13, textAlign: "center", paddingHorizontal: 32 },
  retryBtn:   { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: C.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10, marginTop: 4 },
  retryTxt:   { color: "#fff", fontWeight: "700", fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
});

const ws = StyleSheet.create({
  row: { flexDirection: "row", paddingHorizontal: 8, paddingBottom: 8 },
  cell: { flex: 1, alignItems: "center", gap: 4 },

  dayLbl:      { fontSize: 9, fontWeight: "700", letterSpacing: 0.8, color: "rgba(255,255,255,0.55)", marginBottom: 2 },
  dayLblSel:   { color: "#fff" },
  dayLblToday: { color: "#fff" },

  numWrap:       { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  numWrapSel:    { backgroundColor: "#fff" },
  numWrapToday:  { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" },

  num:      { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.85)" },
  numSel:   { color: T.primary, fontWeight: "800" },
  numToday: { color: "#fff", fontWeight: "800" },

  dotsRow:  { flexDirection: "row", gap: 3, height: 6 },
  dot:      { width: 4, height: 4, borderRadius: 2 },
  dotNorm:  { backgroundColor: "rgba(255,255,255,0.5)" },
  dotSel:   { backgroundColor: T.primary },
  dotEmpty: { width: 4, height: 4 },
});

const mg = StyleSheet.create({
  wrap:   { paddingHorizontal: 16, paddingBottom: 6 },
  header: { flexDirection: "row", marginBottom: 4 },
  hCell:    { width: CELL_W, textAlign: "center", fontSize: 10, fontWeight: "700", color: "rgba(255,255,255,0.55)", letterSpacing: 0.6 },
  hWeekend: { color: "rgba(255,255,255,0.75)" },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: CELL_W, alignItems: "center", paddingVertical: 3 },
  circle:       { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  circleSel:    { backgroundColor: "#fff" },
  circleToday:  { borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" },
  num:       { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" },
  numSel:    { color: T.primary, fontWeight: "800" },
  numToday:  { color: "#fff", fontWeight: "800" },
  numFaded:  { color: "rgba(255,255,255,0.35)" },
  dots: { flexDirection: "row", gap: 2, height: 5, marginTop: 2 },
  dot:    { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)" },
  dotSel: { backgroundColor: T.primary },
});

const cc = StyleSheet.create({
  card: {
    backgroundColor: C.cardBg,
    borderRadius: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
  },
  body: { padding: 16 },

  sessionChip: {
    position: "absolute", top: 14, right: 14,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  sessionChipTxt: { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },

  topRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, paddingRight: 52 },
  subject: { flex: 1, color: C.textPrimary, fontSize: 16, fontWeight: "800", letterSpacing: -0.3, lineHeight: 22 },

  modeBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 7, borderWidth: 1, paddingHorizontal: 7, paddingVertical: 3, alignSelf: "flex-start" },
  modeDot:   { width: 5, height: 5, borderRadius: 3 },
  modeTxt:   { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },

  timeRow:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8 },
  timeIconWrap:{ width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center" },
  timeTxt:     { fontSize: 13, fontWeight: "700" },
  durationTxt: { color: C.textMuted, fontSize: 12, marginLeft: 2 },

  divider: { height: 1, backgroundColor: "#E2E8F0", marginVertical: 12 },

  meta:    { gap: 6 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 7 },
  metaTxt: { color: C.textSecond, fontSize: 12, flex: 1 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },

  statusBadge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 8, paddingHorizontal: 9, paddingVertical: 4 },
  statusDot:   { width: 5, height: 5, borderRadius: 3 },
  statusTxt:   { fontSize: 11, fontWeight: "700" },

  rescheduleBtn: {
    flexDirection: "row", alignItems: "center", gap: 5,
    borderRadius: 8, borderWidth: 1,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: "#F8FAFC",
  },
  rescheduleTxt: { fontSize: 11, fontWeight: "700" },
});

const rm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(15,23,42,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 8,
    shadowColor: "#000", shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08, shadowRadius: 20, elevation: 16,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#CBD5E1",
    alignSelf: "center", marginBottom: 20,
  },
  header: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 },
  iconWrap: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  title: { color: C.textPrimary, fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  sub:   { color: C.textSecond, fontSize: 12, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },

  currentRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 20,
  },
  currentLabel: { color: C.textMuted, fontSize: 12, fontWeight: "600" },
  currentVal:   { color: C.textSecond, fontSize: 12, fontWeight: "600" },

  actions: { flexDirection: "row", gap: 10 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  cancelTxt:  { color: C.textSecond, fontSize: 14, fontWeight: "700" },
  confirmBtn: { flex: 2, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 14 },
  confirmTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },

  // date transfer row
  dateTransferRow: {
    flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16,
  },
  dateTransferBox: {
    flex: 1, backgroundColor: C.bg, borderRadius: 12,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  dateTransferBoxTo: { borderWidth: 1.5 },
  dateTransferArrow: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },
  dateTransferLabel: {
    fontSize: 9, fontWeight: "800", letterSpacing: 1,
    color: C.textMuted, marginBottom: 3,
  },
  dateTransferVal: {
    color: C.textPrimary, fontSize: 11, fontWeight: "600", lineHeight: 15,
  },

  errTxt: { color: T.error, fontSize: 12, fontWeight: "600", marginBottom: 12 },
});

const cal = StyleSheet.create({
  wrap: {
    backgroundColor: C.bg, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 8, paddingBottom: 10, marginBottom: 16,
  },
  navRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 6, paddingVertical: 12,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: C.headerBg, borderWidth: 1, borderColor: C.border,
    alignItems: "center", justifyContent: "center",
  },
  navTitle: { color: C.textPrimary, fontSize: 14, fontWeight: "700" },

  headerRow: { flexDirection: "row", marginBottom: 4, paddingHorizontal: 2 },
  headerCell: {
    width: CAL_CELL, textAlign: "center",
    fontSize: 10, fontWeight: "700",
    color: C.textMuted, letterSpacing: 0.5,
  },
  headerWeekend: { color: C.accent },

  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 2 },
  cell: { width: CAL_CELL, alignItems: "center", paddingVertical: 3 },

  circle: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  circleSel:   { },
  circleToday: { borderWidth: 1.5 },

  num:      { fontSize: 13, fontWeight: "600", color: C.textSecond },
  numSel:   { color: "#fff", fontWeight: "800" },
  numToday: { fontWeight: "800" },
  numFaded: { color: C.textMuted, opacity: 0.4 },
  numPast:  { color: C.textMuted },
});

const es = StyleSheet.create({
  wrap:       { alignItems: "center", paddingTop: 64, paddingHorizontal: 32, gap: 12 },
  iconCircle: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: T.primary + "10",
    borderWidth: 1.5, borderColor: T.primary + "20",
    alignItems: "center", justifyContent: "center", marginBottom: 8,
  },
  title: { color: C.textPrimary, fontSize: 18, fontWeight: "800", letterSpacing: -0.3 },
  sub:   { color: C.textSecond, fontSize: 13, textAlign: "center", lineHeight: 21, maxWidth: 240 },
});

