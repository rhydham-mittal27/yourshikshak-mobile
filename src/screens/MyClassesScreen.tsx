import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getMyClasses, FinalClass } from "../api/client";
import { T } from "../constants/colors";
import ClassCard from "../components/classes/ClassCard";
import AttendanceSheetModal from "../components/classes/AttendanceSheetModal";

type Nav = StackNavigationProp<RootStackParamList, "MyClasses">;
interface Props {
  navigation: Nav;
}

// ─── Status filter tabs ───────────────────────────────────────────────────────

const STATUSES = ["ACTIVE", "COMPLETED", "PAUSED", "ALL"] as const;
type StatusFilter = (typeof STATUSES)[number];

const STATUS_LABEL: Record<StatusFilter, string> = {
  ACTIVE: "Active",
  COMPLETED: "Completed",
  PAUSED: "Paused",
  ALL: "All",
};

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ status }: { status: StatusFilter }) => (
  <View style={es.wrap}>
    <View style={es.iconRing}>
      <Ionicons name="school-outline" size={36} color={T.primary} />
    </View>
    <Text style={es.title}>No {STATUS_LABEL[status]} Classes</Text>
    <Text style={es.sub}>
      {status === "ACTIVE"
        ? "You don't have any active classes yet.\nThey'll appear here once assigned."
        : "No classes found for this filter."}
    </Text>
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function MyClassesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();

  const [classes, setClasses] = useState<FinalClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ACTIVE");

  // Per-card cycle state: classId → selected cycle number
  const [cycleByClass, setCycleByClass] = useState<Record<string, number>>({});

  // Attendance modal
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetClass, setSheetClass] = useState<FinalClass | null>(null);
  const [sheetCycle, setSheetCycle] = useState(1);

  const fetchClasses = useCallback(
    async (filter: StatusFilter = statusFilter) => {
      setError(null);
      try {
        const status = filter === "ALL" ? undefined : filter;
        const res = await getMyClasses(status || "ACTIVE");
        // If ALL, fetch all statuses
        if (filter === "ALL") {
          const [active, completed, paused] = await Promise.all([
            getMyClasses("ACTIVE"),
            getMyClasses("COMPLETED"),
            getMyClasses("PAUSED"),
          ]);
          const all = [
            ...(active.data || []),
            ...(completed.data || []),
            ...(paused.data || []),
          ];
          // dedupe by id
          const seen = new Set<string>();
          const deduped = all.filter((c) => {
            const id = String((c as any)._id || c.id || "");
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
          });
          setClasses(deduped);
        } else {
          setClasses(res.data || []);
        }
      } catch (e: any) {
        setError(e?.message || "Failed to load classes");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    setLoading(true);
    fetchClasses(statusFilter);
  }, [statusFilter]);

  // Init cycle map when classes load
  useEffect(() => {
    setCycleByClass((prev) => {
      const next = { ...prev };
      classes.forEach((c) => {
        const id = String((c as any)._id || c.id || "");
        if (id && !next[id]) next[id] = 1;
      });
      return next;
    });
  }, [classes]);

  const handleCycleChange = (classId: string, delta: number, max: number) => {
    setCycleByClass((prev) => {
      const current = prev[classId] ?? 1;
      const next = Math.min(Math.max(1, current + delta), Math.max(1, max));
      return { ...prev, [classId]: next };
    });
  };

  const openAttendance = (cls: FinalClass) => {
    const id = String((cls as any)._id || cls.id || "");
    setSheetClass(cls);
    setSheetCycle(cycleByClass[id] ?? 1);
    setSheetVisible(true);
  };

  // Derived stats
  const activeCount = classes.filter((c) => c.status === "ACTIVE").length;
  const completedCount = classes.filter((c) => c.status === "COMPLETED").length;
  const totalSessions = classes.reduce(
    (sum, c) => sum + Number(c.completedSessions ?? 0),
    0,
  );

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchClasses(statusFilter);
            }}
            tintColor={T.primary}
          />
        }
      >
        {/* ── Hero header ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />

          {/* Top bar */}
          <View style={s.topBar}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <View style={s.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>My Classes</Text>
              <Text style={s.headerSub}>Track your assigned sessions</Text>
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>{activeCount} active</Text>
            </View>
          </View>

          {/* Stats strip */}
          <View style={s.stripRow}>
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{classes.length}</Text>
              <Text style={s.stripLbl}>Total{"\n"}Classes</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{activeCount}</Text>
              <Text style={s.stripLbl}>Active{"\n"}Now</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{completedCount}</Text>
              <Text style={s.stripLbl}>Completed</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{totalSessions}</Text>
              <Text style={s.stripLbl}>Sessions{"\n"}Done</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── White card body ──────────────────────────────────────────────── */}
        <View style={s.card}>
          {/* Status filter tabs */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={s.tabsScroll}
            contentContainerStyle={s.tabsContent}
          >
            {STATUSES.map((st) => (
              <Pressable
                key={st}
                onPress={() => setStatusFilter(st)}
                style={[s.tab, statusFilter === st && s.tabActive]}
              >
                <Text style={[s.tabTxt, statusFilter === st && s.tabTxtActive]}>
                  {STATUS_LABEL[st]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Section header */}
          <View style={s.sectionHead}>
            <View
              style={[s.sectionIconBg, { backgroundColor: `${T.primary}15` }]}
            >
              <Ionicons name="school-outline" size={14} color={T.primary} />
            </View>
            <Text style={s.sectionHeadTxt}>
              {STATUS_LABEL[statusFilter]} Classes
            </Text>
            {!loading && (
              <View style={s.sectionBadge}>
                <Text style={s.sectionBadgeTxt}>{classes.length}</Text>
              </View>
            )}
          </View>

          {/* Loading */}
          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={T.primary} size="large" />
              <Text style={s.centerTxt}>Loading classes…</Text>
            </View>
          )}

          {/* Error */}
          {!loading && error && (
            <View style={s.center}>
              <Ionicons name="alert-circle-outline" size={36} color={T.error} />
              <Text style={[s.centerTxt, { color: T.error }]}>{error}</Text>
              <Pressable
                onPress={() => fetchClasses(statusFilter)}
                style={s.retryBtn}
              >
                <Text style={s.retryTxt}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* Empty */}
          {!loading && !error && classes.length === 0 && (
            <EmptyState status={statusFilter} />
          )}

          {/* Class cards */}
          {!loading &&
            !error &&
            classes.map((cls) => {
              const id = String((cls as any)._id || cls.id || "");
              const maxCycle = Math.max(1, cls.sheetCount ?? 1);
              const selectedCycle = cycleByClass[id] ?? 1;
              return (
                <ClassCard
                  key={id}
                  cls={cls}
                  selectedCycle={selectedCycle}
                  maxCycle={maxCycle}
                  onCycleChange={(delta) =>
                    handleCycleChange(id, delta, maxCycle)
                  }
                  onViewAttendance={() => openAttendance(cls)}
                />
              );
            })}
        </View>

        <View style={{ height: Math.max(insets.bottom, 32) }} />
      </ScrollView>

      {/* Attendance Sheet Modal */}
      <AttendanceSheetModal
        visible={sheetVisible}
        cls={sheetClass}
        cycle={sheetCycle}
        onClose={() => setSheetVisible(false)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  header: { paddingHorizontal: 22, paddingBottom: 32, overflow: "hidden" },
  orbA: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${T.secondary}18`,
  },
  orbB: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${T.primary}14`,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 22,
  },
  backCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  headerSub: { color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 1 },

  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveTxt: { color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: "700" },

  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: T.radiusMd,
    paddingVertical: 10,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },
  stripSep: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.1)" },

  card: {
    flexGrow: 1,
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: T.border,
    marginTop: -24,
    padding: 20,
    paddingTop: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },

  tabsScroll: { marginBottom: 18, marginHorizontal: -4 },
  tabsContent: { gap: 8, paddingHorizontal: 4 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabActive: {
    backgroundColor: T.primary,
    borderColor: T.primary,
  },
  tabTxt: { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  tabTxtActive: { color: "#fff", fontWeight: "700" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: T.primary,
    paddingLeft: 10,
    marginBottom: 16,
  },
  sectionIconBg: {
    width: 26,
    height: 26,
    borderRadius: T.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionHeadTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: T.primary,
    borderRadius: T.radiusFull,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  sectionBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },

  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  centerTxt: { fontSize: 14, color: T.textSecondary, fontWeight: "600" },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
});

const es = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 28,
    gap: 12,
  },
  iconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20 },
});
