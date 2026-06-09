import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import { RootStackParamList } from "../navigation/AppNavigator";
import { AUTH_STORAGE_KEY, FinalClass, getMyClasses } from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Timetable">;
interface Props { navigation: Nav }

// ─── Helpers ─────────────────────────────────────────────────────────────────

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const JS_DAY_TO_API: Record<number, string> = {
  0: "SUNDAY", 1: "MONDAY", 2: "TUESDAY", 3: "WEDNESDAY",
  4: "THURSDAY", 5: "FRIDAY", 6: "SATURDAY",
};
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

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

function toKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function classesForDay(classes: FinalClass[], day: Date): FinalClass[] {
  const apiDay = JS_DAY_TO_API[day.getDay()];
  return classes.filter((cls) => {
    const days: string[] = cls.schedule?.daysOfWeek ?? [];
    return days.includes(apiDay);
  });
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

function subjectLabel(cls: FinalClass): string {
  const raw = cls.subject?.[0];
  if (!raw) return "—";
  if (typeof raw === "string") return raw;
  return raw.label ?? raw.name ?? raw.value ?? "—";
}

const MODE_COLOR: Record<string, string> = {
  ONLINE: T.success, OFFLINE: T.primary, HYBRID: T.warning,
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: T.success, COMPLETED: T.mutedFg, PAUSED: T.warning, CANCELLED: T.error,
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function TimetableScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const today = new Date(); today.setHours(0, 0, 0, 0);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(today));
  const [selectedDay, setSelectedDay] = useState(today);
  const [classes, setClasses] = useState<FinalClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const load = useCallback(async (userId?: string) => {
    setError(null);
    try {
      // Fetch all statuses so completed/paused classes also show
      const [active, completed, paused] = await Promise.all([
        getMyClasses("ACTIVE", userId),
        getMyClasses("COMPLETED", userId),
        getMyClasses("PAUSED", userId),
      ]);
      const all = [
        ...(active.data ?? []),
        ...(completed.data ?? []),
        ...(paused.data ?? []),
      ];
      setClasses(all);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load classes");
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      const userId = raw ? JSON.parse(raw)?.user?.id : undefined;
      await load(userId);
      setLoading(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }).start();
    })();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
    const userId = raw ? JSON.parse(raw)?.user?.id : undefined;
    await load(userId);
    setRefreshing(false);
  }, [load]);

  const goWeek = (dir: -1 | 1) => {
    const newStart = addDays(weekStart, dir * 7);
    const newSelected = addDays(newStart, selectedDay.getDay());
    setWeekStart(newStart);
    setSelectedDay(newSelected);
  };

  const daySessions = classesForDay(classes, selectedDay)
    .sort((a, b) => parseTime(a.schedule?.timeSlot) - parseTime(b.schedule?.timeSlot));

  // Dot map: days in week that have any class
  const dotMap: Record<string, boolean> = {};
  weekDays.forEach((d) => {
    if (classesForDay(classes, d).length > 0) dotMap[toKey(d)] = true;
  });

  const monthLabel = (() => {
    const first = weekDays[0], last = weekDays[6];
    if (first.getMonth() === last.getMonth())
      return `${MONTH_NAMES[first.getMonth()]} ${first.getFullYear()}`;
    if (first.getFullYear() === last.getFullYear())
      return `${MONTH_NAMES[first.getMonth()].slice(0,3)} – ${MONTH_NAMES[last.getMonth()].slice(0,3)} ${first.getFullYear()}`;
    return `${MONTH_NAMES[first.getMonth()].slice(0,3)} ${first.getFullYear()} – ${MONTH_NAMES[last.getMonth()].slice(0,3)} ${last.getFullYear()}`;
  })();

  return (
    <View style={[s.root, { paddingTop: insets.top }]}>
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
          <Ionicons name="chevron-back" size={18} color="rgba(255,255,255,0.4)" />
        </Pressable>
        <View style={s.dayRow}>
          {weekDays.map((day) => {
            const key = toKey(day);
            const isSelected = isSameDay(day, selectedDay);
            const isToday = isSameDay(day, today);
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
                {dotMap[key]
                  ? <View style={[s.dot, isSelected && s.dotActive]} />
                  : <View style={s.dotPlaceholder} />}
              </Pressable>
            );
          })}
        </View>
        <Pressable onPress={() => goWeek(1)} hitSlop={8} style={s.weekArrow}>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
        </Pressable>
      </View>

      {/* ── Day label ──────────────────────────────────────────────────── */}
      <View style={s.dayHeader}>
        <Text style={s.dayHeaderText}>
          {isSameDay(selectedDay, today)
            ? "Today"
            : `${DAY_LABELS[selectedDay.getDay()]}, ${selectedDay.getDate()} ${MONTH_NAMES[selectedDay.getMonth()].slice(0,3)}`}
        </Text>
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
            daySessions.map((cls) => (
              <Pressable
                key={cls._id}
                onPress={() =>
                  navigation.navigate("MyClasses", {
                    highlightClassId: String((cls as any)._id || cls.id),
                  })
                }
                style={({ pressed }) => pressed && { opacity: 0.75 }}
              >
                <ClassCard cls={cls} />
              </Pressable>
            ))
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

// ─── Class Card ───────────────────────────────────────────────────────────────

function ClassCard({ cls }: { cls: FinalClass }) {
  const subject = subjectLabel(cls);
  const modeColor = MODE_COLOR[cls.mode] ?? T.primary;
  const statusColor = STATUS_COLOR[cls.status] ?? T.mutedFg;
  const timeSlot = cls.schedule?.timeSlot;
  const startTime = timeSlot?.split("-")[0]?.trim() ?? "—";

  return (
    <View style={cc.card}>
      {/* Left time bar */}
      <View style={cc.timeCol}>
        <Text style={cc.startTime}>{startTime}</Text>
        <View style={[cc.bar, { backgroundColor: modeColor + "50" }]} />
      </View>

      {/* Body */}
      <View style={cc.body}>
        <View style={cc.topRow}>
          <Text style={cc.subject} numberOfLines={1}>{subject}</Text>
          <View style={[cc.modeBadge, { backgroundColor: modeColor + "18" }]}>
            <Text style={[cc.modeTxt, { color: modeColor }]}>{cls.mode}</Text>
          </View>
        </View>

        {cls.studentName ? (
          <View style={cc.metaRow}>
            <Ionicons name="person-outline" size={12} color={T.mutedFg} />
            <Text style={cc.metaTxt} numberOfLines={1}>{cls.studentName}</Text>
          </View>
        ) : null}

        {timeSlot ? (
          <View style={cc.metaRow}>
            <Ionicons name="time-outline" size={12} color={T.mutedFg} />
            <Text style={cc.metaTxt}>{timeSlot}</Text>
          </View>
        ) : null}

        {(cls.grade || cls.board) ? (
          <View style={cc.metaRow}>
            <Ionicons name="school-outline" size={12} color={T.mutedFg} />
            <Text style={cc.metaTxt}>{[cls.grade, cls.board].filter(Boolean).join(" · ")}</Text>
          </View>
        ) : null}

        <View style={cc.footer}>
          <Text style={[cc.statusTxt, { color: statusColor }]}>{cls.status}</Text>
          {cls.completedSessions > 0 && (
            <Text style={cc.sessCount}>{cls.completedSessions} sessions done</Text>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.darkBg },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  headerTitle: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  headerSub: { color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 1 },

  weekStrip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 4, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)" },
  weekArrow: { width: 32, alignItems: "center" },
  dayRow: { flex: 1, flexDirection: "row", justifyContent: "space-between" },
  dayPill: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 12, marginHorizontal: 2 },
  dayPillActive: { backgroundColor: T.primary },
  dayLabel: { fontSize: 10, fontWeight: "600", color: "rgba(255,255,255,0.35)", marginBottom: 4, letterSpacing: 0.3 },
  dayLabelActive: { color: "rgba(255,255,255,0.9)" },
  dayNum: { fontSize: 15, fontWeight: "700", color: "rgba(255,255,255,0.7)" },
  dayNumActive: { color: "#fff" },
  dayNumToday: { color: T.primary },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.primary, marginTop: 4 },
  dotActive: { backgroundColor: "#fff" },
  dotPlaceholder: { width: 5, height: 5, marginTop: 4 },

  dayHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, gap: 8 },
  dayHeaderText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  countBadge: { backgroundColor: `${T.primary}22`, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  countBadgeTxt: { color: T.primary, fontSize: 11, fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  errTxt: { color: T.mutedFg, fontSize: 14, textAlign: "center", paddingHorizontal: 32 },
  retryBtn: { backgroundColor: T.primary, borderRadius: 20, paddingHorizontal: 24, paddingVertical: 10 },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },

  emptyBox: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { color: "rgba(255,255,255,0.45)", fontSize: 16, fontWeight: "600", marginTop: 8 },
  emptySubtitle: { color: "rgba(255,255,255,0.22)", fontSize: 13 },

  list: { paddingHorizontal: 16, paddingTop: 8 },
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
