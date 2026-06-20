import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  RefreshControl,
  Animated,
  Easing,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getTutorAnnouncements,
  expressInterest,
  LeadAnnouncement,
} from "../api/client";
import { T } from "../constants/colors";
import OpportunityCard from "../components/opportunities/OpportunityCard";
import OpportunityEmptyState from "../components/opportunities/OpportunityEmptyState";
import OpportunitySkeleton from "../components/opportunities/OpportunitySkeleton";

type Nav = StackNavigationProp<RootStackParamList, "ClassOpportunities">;
interface Props { navigation: Nav }

// ── Filter ────────────────────────────────────────────────────────────────────

type Filter = "all" | "ONLINE" | "OFFLINE" | "HYBRID" | "match";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all",     label: "All"       },
  { key: "match",   label: "Top Match" },
  { key: "ONLINE",  label: "Online"    },
  { key: "OFFLINE", label: "Offline"   },
  { key: "HYBRID",  label: "Hybrid"    },
];

// ── Filter chip ───────────────────────────────────────────────────────────────

const FilterChip = ({
  f,
  active,
  onPress,
}: {
  f: (typeof FILTERS)[0];
  active: boolean;
  onPress: () => void;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={() =>
          Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, speed: 60, bounciness: 0 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 5 }).start()
        }
        style={[chip.pill, active && chip.pillActive]}
      >
        <Text style={[chip.label, active && chip.labelActive]}>{f.label}</Text>
      </Pressable>
    </Animated.View>
  );
};

// ── Stat tile ─────────────────────────────────────────────────────────────────

const Stat = ({
  icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: number;
  label: string;
  color?: string;
}) => (
  <View style={stat.tile}>
    <Ionicons name={icon} size={13} color={color ?? "rgba(255,255,255,0.45)"} />
    <Text style={[stat.val, color ? { color } : {}]}>{value}</Text>
    <Text style={stat.lbl}>{label}</Text>
  </View>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = ({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 10, paddingHorizontal: 18 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={s.skelCard}>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
          <OpportunitySkeleton w="26%" h={18} radius={99} />
          <OpportunitySkeleton w="36%" h={18} radius={99} />
        </View>
        <OpportunitySkeleton w={i % 2 ? "62%" : "76%"} h={20} radius={6} />
        <OpportunitySkeleton w="38%" h={13} />
        <OpportunitySkeleton w="100%" h={50} radius={11} />
        <View style={{ flexDirection: "row", gap: 6 }}>
          <OpportunitySkeleton w="28%" h={24} radius={99} />
          <OpportunitySkeleton w="28%" h={24} radius={99} />
        </View>
      </View>
    ))}
  </View>
);

// ── Screen ────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function ClassOpportunitiesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems]               = useState<LeadAnnouncement[]>([]);
  const [loading, setLoading]           = useState(true);
  const [refreshing, setRefreshing]     = useState(false);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [total, setTotal]               = useState(0);
  const [page, setPage]                 = useState(1);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [myInterestCount, setMyInterestCount] = useState(0);
  const [expressingId, setExpressingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const fetchingRef = useRef(false);

  // Header fade-in
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 480,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, []);

  // Data
  const loadPage = useCallback(async (pageNum = 1, append = false) => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    if (append) setLoadingMore(true);
    else if (!refreshing) setLoading(true);
    try {
      const res = await getTutorAnnouncements(pageNum, PAGE_SIZE);
      const valid = res.data.filter((a) => a.classLead !== null);
      setItems((prev) => (append ? [...prev, ...valid] : valid));
      setTotal(res.pagination.total);
      setPage(pageNum);
      if (!append && res.myInterestCount !== undefined)
        setMyInterestCount(res.myInterestCount);
    } catch {}
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
    fetchingRef.current = false;
  }, []);

  useEffect(() => { loadPage(1); }, [loadPage]);

  const loadMore = () => {
    if (loadingMore || loading || items.length >= total) return;
    loadPage(page + 1, true);
  };

  const handleInterest = async (id: string) => {
    if (interestedIds.has(id) || expressingId === id) return;
    setExpressingId(id);
    try {
      await expressInterest(id);
      setInterestedIds((prev) => new Set(prev).add(id));
      setMyInterestCount((prev) => prev + 1);
      setItems((prev) =>
        prev.map((a) => a._id === id ? { ...a, interestCount: a.interestCount + 1 } : a),
      );
    } catch {}
    setExpressingId(null);
  };

  // Client-side filter
  const filtered = useMemo(() => {
    if (activeFilter === "all") return items;
    if (activeFilter === "match") return items.filter((i) => (i.matchPercentage ?? 0) >= 75);
    return items.filter((i) => i.classLead?.mode === activeFilter);
  }, [items, activeFilter]);

  const perfectCount = items.filter((i) => i.matchPercentage === 100).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              fetchingRef.current = false;
              setRefreshing(true);
              loadPage(1);
            }}
            tintColor={T.secondary}
          />
        }
        onScroll={({ nativeEvent: { contentOffset, layoutMeasurement, contentSize } }) => {
          if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 120)
            loadMore();
        }}
        scrollEventThrottle={300}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <LinearGradient
          colors={["#0a1628", "#0e1e3a", "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 14 }]}
        >
          {/* Nav row */}
          <Animated.View
            style={[
              s.navRow,
              {
                opacity: headerAnim,
                transform: [{
                  translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-6, 0] }),
                }],
              },
            ]}
          >
            <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backBtn}>
              <Ionicons name="arrow-back" size={19} color="#fff" />
            </Pressable>
            <View style={{ flex: 1, paddingHorizontal: 12 }}>
              <Text style={s.navTitle}>Class Opportunities</Text>
              <Text style={s.navSub}>Find your next student</Text>
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>{total} live</Text>
            </View>
          </Animated.View>

          {/* Stats */}
          <Animated.View
            style={[
              s.statsRow,
              {
                opacity: headerAnim,
                transform: [{
                  translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
                }],
              },
            ]}
          >
            <Stat icon="list-outline"      value={total}            label="Total leads"   />
            <View style={s.statDiv} />
            <Stat icon="star-outline"      value={perfectCount}     label="Perfect match" color="#10B981" />
            <View style={s.statDiv} />
            <Stat icon="hand-left-outline" value={myInterestCount}  label="Applied"       color={T.secondary} />
          </Animated.View>
        </LinearGradient>

        {/* ── Rounded cap (decorative only — no children so no clipping) ── */}
        <View style={s.bodyCap} />

        {/* ── Filter strip — lives OUTSIDE the rounded View so Android     */}
        {/*    border-radius clipping cannot touch it                       */}
        <View style={s.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.filterContent}
            decelerationRate="fast"
          >
            {FILTERS.map((f) => (
              <FilterChip
                key={f.key}
                f={f}
                active={activeFilter === f.key}
                onPress={() => setActiveFilter(f.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Body ───────────────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Results label */}
          <View style={s.resultsRow}>
            <Text style={s.resultsLabel}>
              {activeFilter === "all"
                ? "All opportunities"
                : FILTERS.find((f) => f.key === activeFilter)?.label}
            </Text>
            {!loading && (
              <View style={s.countPill}>
                <Text style={s.countTxt}>{filtered.length}</Text>
              </View>
            )}
          </View>

          {/* Cards */}
          <View style={s.cardsList}>
            {loading && <Skeleton count={3} />}

            {!loading && filtered.length === 0 && items.length === 0 && (
              <View style={{ paddingHorizontal: 18 }}>
                <OpportunityEmptyState
                  onRefresh={() => { fetchingRef.current = false; loadPage(1); }}
                />
              </View>
            )}

            {!loading && filtered.length === 0 && items.length > 0 && (
              <View style={s.emptyFilter}>
                <Ionicons name="filter-outline" size={30} color={T.textDisabled} />
                <Text style={s.emptyFilterTxt}>No results for this filter</Text>
                <Pressable onPress={() => setActiveFilter("all")} style={s.showAllBtn}>
                  <Text style={s.showAllTxt}>Show all</Text>
                </Pressable>
              </View>
            )}

            {!loading && filtered.map((item, i) => (
              <View key={item._id} style={{ paddingHorizontal: 18 }}>
                <OpportunityCard
                  item={item}
                  interested={interestedIds.has(item._id)}
                  expressing={expressingId === item._id}
                  onInterest={handleInterest}
                  revealDelay={Math.min(i * 50, 280)}
                />
              </View>
            ))}

            {loadingMore && <Skeleton count={2} />}
          </View>

          {!loading && !loadingMore && items.length > 0 && items.length >= total && (
            <View style={s.endRow}>
              <View style={s.endLine} />
              <Text style={s.endTxt}>All caught up</Text>
              <View style={s.endLine} />
            </View>
          )}
        </View>

        <View style={{ height: Math.max(insets.bottom, 32) }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#EEF2F8" },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { color: "#fff", fontSize: 20, fontWeight: "800", letterSpacing: -0.4 },
  navSub: { color: "rgba(255,255,255,0.46)", fontSize: 11, marginTop: 1 },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.09)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.13)",
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  liveTxt: { color: "rgba(255,255,255,0.88)", fontSize: 11, fontWeight: "700" },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.09)",
    paddingVertical: 14,
  },
  statDiv: { width: 1, height: 32, backgroundColor: "rgba(255,255,255,0.10)" },

  // Rounded cap — purely decorative, no children = no clipping on Android
  bodyCap: {
    height: 22,
    backgroundColor: "#EEF2F8",
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    marginTop: -20,
  },

  // Filter wrapper — full-width, sits between cap and body, no border radius
  filterWrapper: {
    backgroundColor: "#EEF2F8",
    paddingTop: 10,
    paddingBottom: 6,
  },
  filterContent: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 18,
  },

  // Body — plain, no border radius needed here
  body: {
    flexGrow: 1,
    backgroundColor: "#EEF2F8",
    paddingTop: 2,
  },

  // Results
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 10,
  },
  resultsLabel: { flex: 1, fontSize: 14, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  countPill: {
    backgroundColor: T.primary,
    borderRadius: T.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  countTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },

  // Cards wrapper — padding applied per-item so skeleton and cards align
  cardsList: { gap: 0 },

  // Skeleton card
  skelCard: {
    backgroundColor: T.paper,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    borderLeftWidth: 3,
    borderLeftColor: "#E2E8F0",
    padding: 16,
    marginBottom: 10,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },

  // Empty filter state
  emptyFilter: {
    alignItems: "center",
    paddingVertical: 48,
    paddingHorizontal: 18,
    gap: 10,
  },
  emptyFilterTxt: { fontSize: 14, fontWeight: "700", color: T.textSecondary },
  showAllBtn: {
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: T.radiusFull,
    backgroundColor: T.primary,
    marginTop: 4,
  },
  showAllTxt: { color: "#fff", fontSize: 13, fontWeight: "700" },

  // End
  endRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 18,
    paddingVertical: 24,
  },
  endLine: { flex: 1, height: 1, backgroundColor: T.border },
  endTxt: { fontSize: 11.5, color: T.textDisabled, fontWeight: "600" },
});

// ── Stat tile styles ──────────────────────────────────────────────────────────

const stat = StyleSheet.create({
  tile: { flex: 1, alignItems: "center", gap: 3 },
  val: { color: "#fff", fontSize: 21, fontWeight: "800", letterSpacing: -0.5 },
  lbl: {
    color: "rgba(255,255,255,0.40)",
    fontSize: 9.5,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
  },
});

// ── Filter chip styles ────────────────────────────────────────────────────────

const chip = StyleSheet.create({
  pill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: T.radiusFull,
    backgroundColor: T.paper,
    borderWidth: 1,
    borderColor: "#DDE3EE",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: T.primary,
    borderColor: T.primaryDark,
    shadowColor: T.primary,
    shadowOpacity: 0.28,
    shadowRadius: 6,
    elevation: 3,
  },
  label: { fontSize: 12.5, fontWeight: "600", color: T.textSecondary },
  labelActive: { color: "#fff", fontWeight: "700" },
});
