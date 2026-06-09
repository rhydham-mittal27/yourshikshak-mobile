import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import {
  AUTH_STORAGE_KEY,
  ClassSession,
  getMyTutorSessions,
} from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Timetable">;
interface Props {
  navigation: Nav;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 = Sun
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function subjectLabel(cls: ClassSession["finalClass"]): string {
  if (!cls) return "—";
  const raw = cls.subject?.[0];
  if (!raw) return "—";
  if (typeof raw === "string") return raw;
  return raw.label ?? raw.name ?? raw.value ?? "—";
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

const MODE_COLOR: Record<string, string> = {
  ONLINE: T.success,
  OFFLINE: T.primary,
  HYBRID: T.warning,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState<Date>(today);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which months are already loaded
  const loadedMonths = useRef<Set<string>>(new Set());
  const allSessions = useRef<ClassSession[]>([]);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Sessions for selected day, sorted by time
  const dayKey = toDateKey(selectedDay);
  const daySessions = allSessions.current
    .filter((s) => isSameDay(new Date(s.sessionDate), selectedDay))
    .sort((a, b) => parseTime(a.timeSlot) - parseTime(b.timeSlot));

  // Dot indicators per day
  const sessionCountByDay: Record<string, number> = {};
  allSessions.current.forEach((s) => {
    const k = toDateKey(new Date(s.sessionDate));
    sessionCountByDay[k] = (sessionCountByDay[k] ?? 0) + 1;
  });

  const fetchMonth = useCallback(async (month: number, year: number, force = false) => {
    const key = `${year}-${month}`;
    if (!force && loadedMonths.current.has(key)) return;
    try {
      const res = await getMyTutorSessions(month, year);
      const incoming = res.data ?? [];
      // Merge — replace old entries for this month
      allSessions.current = [
        ...allSessions.current.filter(
          (s) => {
            const d = new Date(s.sessionDate);
            return !(d.getMonth() + 1 === month && d.getFullYear() === year);
          },
        ),
        ...incoming,
      ];
      loadedMonths.current.add(key);
      setSessions([...allSessions.current]);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load sessions");
    }
  }, []);

  const loadVisibleMonths = useCallback(
    async (force = false) => {
      const months = new Set<string>();
      weekDays.forEach((d) => {
        months.add(`${d.getMonth() + 1}-${d.getFullYear()}`);
      });
      months.add(
        `${selectedDay.getMonth() + 1}-${selectedDay.getFullYear()}`,
      );
      for (const mk of months) {
        const [m, y] = mk.split("-").map(Number);
        await fetchMonth(m, y, force);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekStart, selectedDay],
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      await loadVisibleMonths();
      setLoading(false);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    })();
  }, [weekStart]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    loadedMonths.current.clear();
    allSessions.current = [];
    await loadVisibleMonths(true);
    setRefreshing(false);
  }, [loadVisibleMonths]);

  // When week changes, ensure selected day is within the new week
  const goWeek = (dir: -1 | 1) => {
    const newStart = addDays(weekStart, dir * 7);
    setWeekStart(newStart);
    // Keep selected day in new week
    const newSelected = addDays(newStart, selectedDay.getDay());
    setSelectedDay(newSelected);
    fadeAnim.setValue(0);
  };

  const monthLabel = (() => {
    const months = new Set(weekDays.map((d) => d.getMonth()));
    if (months.size === 1) {
      return `${MONTH_NAMES[weekDays[0].getMonth()]} ${weekDays[0].getFullYear()}`;
    }
    const first = weekDays[0];
    const last = weekDays[6];
    if (first.getFullYear() === last.getFullYear()) {
      return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} – ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${first.getFullYear()}`;
    }
    return `${MONTH_NAMES[first.getMonth()].slice(0, 3)} ${first.getFullYear()} – ${MONTH_NAMES[last.getMonth()].slice(0, 3)} ${last.getFullYear()}`;
  })();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={s.headerTitle}>Timetable</Text>
          <Text style={s.headerSub}>{monthLabel}</Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ── Week Strip ─────────────────────────────────────────────────── */}
      <View style={s.weekStrip}>
        <Pressable onPress={() => goWeek(-1)} hitSlop={8} style={s.weekArrow}>
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <View style={s.dayRow}>
          {weekDays.map((day) => {
            const key = toDateKey(day);
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, today);
            const count = sessionCountByDay[key] ?? 0;
            return (
              <Pressable
                key={key}
                style={[s.dayPill, isSelected && s.dayPillActive]}
                onPress={() => setSelectedDay(day)}
              >
                <Text style={[s.dayLabel, isSelected && s.dayLabelActive]}>
                  {DAY_LABELS[day.getDay()]}
                </Text>
                <Text style={[s.dayNum, isSelected && s.dayNumActive, isToday && !isSelected && s.dayNumToday]}>
                  {day.getDate()}
                </Text>
                {count > 0 ? (
                  <View style={[s.dot, isSelected && s.dotActive]} />
                ) : (
                  <View style={s.dotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable onPress={() => goWeek(1)} hitSlop={8} style={s.weekArrow}>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.5)" />
        </Pressable>
      </View>

      {/* ── Day Label ──────────────────────────────────────────────────── */}
      <View style={s.dayHeader}>
        <Text style={s.dayHeaderText}>
          {isSameDay(selectedDay, today)
            ? "Today"
            : `${DAY_LABELS[selectedDay.getDay()]}, ${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()].slice(0, 3)}`}
        </Text>
        {daySessions.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeTxt}>{daySessions.length} class{daySessions.length > 1 ? "es" : ""}</Text>
          </View>
        )}
      </View>

      {/* ── Session List ───────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
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
          contentContainerStyle={[
            s.listContent,
            { paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={T.primary}
            />
          }
        >
          {daySessions.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={48} color={T.border} />
              <Text style={s.emptyTitle}>No classes scheduled</Text>
              <Text style={s.emptySubtitle}>Free day — enjoy the break!</Text>
            </View>
          ) : (
            daySessions.map((session, idx) => (
              <SessionCard key={session._id} session={session} index={idx} />
            ))
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

// ─── Session Card ─────────────────────────────────────────────────────────────

function SessionCard({
  session,
  index,
}: {
  session: ClassSession;
  index: number;
}) {
  const cls = session.finalClass;
  const subject = subjectLabel(cls);
  const modeColor = MODE_COLOR[cls?.mode ?? ""] ?? T.primary;

  return (
    <View style={sc.card}>
      {/* Time column */}
      <View style={sc.timeCol}>
        <Text style={sc.time}>{session.timeSlot?.split("-")[0]?.trim() ?? "—"}</Text>
        <View style={[sc.timeLine, { backgroundColor: modeColor + "40" }]} />
      </View>

      {/* Content */}
      <View style={sc.content}>
        {/* Subject + mode */}
        <View style={sc.row}>
          <Text style={sc.subject} numberOfLines={1}>
            {subject}
          </Text>
          <View style={[sc.modeBadge, { backgroundColor: modeColor + "18" }]}>
            <Text style={[sc.modeTxt, { color: modeColor }]}>
              {cls?.mode ?? "—"}
            </Text>
          </View>
        </View>

        {/* Student */}
        {cls?.studentName ? (
          <View style={sc.metaRow}>
            <Ionicons name="person-outline" size={12} color={T.mutedFg} />
            <Text style={sc.metaTxt} numberOfLines={1}>{cls.studentName}</Text>
          </View>
        ) : null}

        {/* Time slot full */}
        {session.timeSlot ? (
          <View style={sc.metaRow}>
            <Ionicons name="time-outline" size={12} color={T.mutedFg} />
            <Text style={sc.metaTxt}>{session.timeSlot}</Text>
          </View>
        ) : null}

        {/* Grade / board */}
        {(cls?.grade || cls?.board) ? (
          <View style={sc.metaRow}>
            <Ionicons name="school-outline" size={12} color={T.mutedFg} />
            <Text style={sc.metaTxt}>
              {[cls?.grade, cls?.board].filter(Boolean).join(" · ")}
            </Text>
          </View>
        ) : null}

        {/* Session number */}
        <View style={sc.footer}>
          <Text style={sc.sessionNum}>Session #{session.sessionNumber}</Text>
          <View style={[sc.statusDot, { backgroundColor: modeColor }]} />
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: T.darkBg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 12,
    marginTop: 1,
  },

  // Week strip
  weekStrip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.07)",
  },
  weekArrow: {
    width: 32,
    alignItems: "center",
  },
  dayRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayPill: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderRadius: 12,
    marginHorizontal: 2,
  },
  dayPillActive: {
    backgroundColor: T.primary,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  dayLabelActive: { color: "rgba(255,255,255,0.9)" },
  dayNum: {
    fontSize: 15,
    fontWeight: "700",
    color: "rgba(255,255,255,0.75)",
  },
  dayNumActive: { color: "#fff" },
  dayNumToday: { color: T.primary },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.primary,
    marginTop: 4,
  },
  dotActive: { backgroundColor: "#fff" },
  dotPlaceholder: { width: 5, height: 5, marginTop: 4 },

  // Day header
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  dayHeaderText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  countBadge: {
    backgroundColor: `${T.primary}22`,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countBadgeTxt: {
    color: T.primary,
    fontSize: 11,
    fontWeight: "600",
  },

  // States
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errTxt: {
    color: T.mutedFg,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 32,
  },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyBox: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
  },
  emptySubtitle: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 13,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});

const sc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  timeCol: {
    width: 60,
    alignItems: "center",
    paddingTop: 16,
    paddingBottom: 16,
    gap: 6,
  },
  time: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 10,
    fontWeight: "600",
    textAlign: "center",
  },
  timeLine: {
    flex: 1,
    width: 2,
    borderRadius: 1,
    minHeight: 20,
  },
  content: {
    flex: 1,
    paddingTop: 14,
    paddingBottom: 14,
    paddingRight: 14,
    gap: 5,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  subject: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  modeBadge: {
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  modeTxt: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  metaTxt: {
    color: T.mutedFg,
    fontSize: 12,
    flex: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sessionNum: {
    color: "rgba(255,255,255,0.25)",
    fontSize: 11,
    fontWeight: "500",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
