import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
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
import { RouteProp } from "@react-navigation/native";
import { RootStackParamList } from "../navigation/AppNavigator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getMyClasses, FinalClass, AUTH_STORAGE_KEY } from "../api/client";
import { T } from "../constants/colors";
import ClassCard from "../components/classes/ClassCard";
import AttendanceSheetModal from "../components/classes/AttendanceSheetModal";

type Nav = StackNavigationProp<RootStackParamList, "MyClasses">;
type Route = RouteProp<RootStackParamList, "MyClasses">;
interface Props {
  navigation: Nav;
  route: Route;
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

export default function MyClassesScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const highlightClassId = route.params?.highlightClassId;

  const scrollRef = useRef<ScrollView>(null);
  const cardOffsets = useRef<Record<string, number>>({});
  const highlightAnim = useRef(new Animated.Value(0)).current;
  const [highlightedId, setHighlightedId] = useState<string | null>(null);

  const [userId, setUserId] = useState<string | null>(null);
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
    async (filter: StatusFilter = statusFilter, uid?: string | null) => {
      const resolvedUid = uid ?? userId;
      setError(null);
      try {
        const status = filter === "ALL" ? undefined : filter;
        const res = await getMyClasses(
          status || "ACTIVE",
          resolvedUid ?? undefined,
        );
        // If ALL, fetch all statuses
        if (filter === "ALL") {
          const [active, completed, paused] = await Promise.all([
            getMyClasses("ACTIVE", resolvedUid ?? undefined),
            getMyClasses("COMPLETED", resolvedUid ?? undefined),
            getMyClasses("PAUSED", resolvedUid ?? undefined),
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
    [statusFilter, userId],
  );

  // Load userId from auth storage, then fetch
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        const uid = raw ? JSON.parse(raw)?.user?.id : null;
        setUserId(uid);
        // If we need to highlight a specific class, load ALL statuses
        const filter = highlightClassId ? "ALL" : statusFilter;
        if (highlightClassId) setStatusFilter("ALL");
        fetchClasses(filter, uid);
      } catch {
        fetchClasses(statusFilter);
      }
    })();
  }, [statusFilter]);

  // Scroll to + highlight + open modal after classes load
  useEffect(() => {
    if (!highlightClassId || loading || classes.length === 0) return;
    const target = classes.find(
      (c) => String((c as any)._id || c.id) === highlightClassId,
    );
    if (!target) return;

    setTimeout(() => {
      const yOffset = cardOffsets.current[highlightClassId];
      if (yOffset !== undefined) {
        scrollRef.current?.scrollTo({ y: yOffset - 20, animated: true });
      }
      setHighlightedId(highlightClassId);
      highlightAnim.setValue(0);
      Animated.sequence([
        Animated.timing(highlightAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.delay(800),
        Animated.timing(highlightAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start(() => setHighlightedId(null));

      setTimeout(() => openAttendance(target), 500);
    }, 400);
  }, [loading, classes]);

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
        ref={scrollRef}
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
          <View style={s.tabsContainer}>
            {STATUSES.map((st) => {
              const isActive = statusFilter === st;
              return (
                <Pressable
                  key={st}
                  onPress={() => setStatusFilter(st)}
                  style={({ pressed }) => [
                    s.tab,
                    isActive && s.tabActive,
                    pressed && !isActive && { opacity: 0.7 },
                  ]}
                >
                  <Text style={[s.tabTxt, isActive && s.tabTxtActive]}>
                    {STATUS_LABEL[st]}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Section header */}
          <View style={s.sectionHead}>
            <View style={s.sectionIconBg}>
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
              const isHighlighted = highlightedId === id;
              return (
                <View
                  key={id}
                  onLayout={(e) => {
                    cardOffsets.current[id] = e.nativeEvent.layout.y;
                  }}
                  style={{ position: "relative" }}
                >
                  <ClassCard
                    cls={cls}
                    selectedCycle={selectedCycle}
                    maxCycle={maxCycle}
                    onCycleChange={(delta) =>
                      handleCycleChange(id, delta, maxCycle)
                    }
                    onViewAttendance={() => openAttendance(cls)}
                  />
                  {isHighlighted && (
                    <Animated.View
                      pointerEvents="none"
                      style={[
                        StyleSheet.absoluteFillObject,
                        {
                          borderRadius: 16,
                          borderWidth: 2,
                          borderColor: T.primary,
                          opacity: highlightAnim,
                        },
                      ]}
                    />
                  )}
                </View>
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
        onSubmitSuccess={() => fetchClasses(statusFilter)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  header: { paddingHorizontal: 22, paddingBottom: 44, overflow: "hidden" },
  orbA: { position: "absolute", width: 0, height: 0 },
  orbB: { position: "absolute", width: 0, height: 0 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 24,
  },
  backCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  headerSub: { color: "rgba(255,255,255,0.55)", fontSize: 11, marginTop: 2 },

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
  liveTxt: { color: "rgba(255,255,255,0.9)", fontSize: 11, fontWeight: "700" },

  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 3,
    letterSpacing: 0.2,
  },
  stripSep: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },

  card: {
    flexGrow: 1,
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    marginTop: -28,
    padding: 20,
    paddingTop: 24,
  },

  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#DDE8F5",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 11,
    alignItems: "center",
  },
  tabActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  tabTxt: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  tabTxtActive: { color: "#fff", fontWeight: "700" },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 8,
  },
  sectionIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHeadTxt: {
    flex: 1,
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  sectionBadge: {
    backgroundColor: T.primary,
    borderRadius: T.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  sectionBadgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },

  center: { alignItems: "center", paddingVertical: 48, gap: 10 },
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
    paddingVertical: 56,
    paddingHorizontal: 32,
    gap: 12,
  },
  iconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: `${T.primary}10`,
    borderWidth: 1.5,
    borderColor: `${T.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 240,
  },
});
