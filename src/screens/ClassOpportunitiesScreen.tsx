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
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getTutorAnnouncements,
  getTutorMyInterests,
  getTutorProfile,
  expressInterest,
  LeadAnnouncement,
} from "../api/client";
import { T } from "../constants/colors";
import OpportunityCard from "../components/opportunities/OpportunityCard";
import OpportunityEmptyState from "../components/opportunities/OpportunityEmptyState";
import OpportunitySkeleton from "../components/opportunities/OpportunitySkeleton";

type Nav = StackNavigationProp<RootStackParamList, "ClassOpportunities">;
interface Props { navigation: Nav }

type Filter = "all" | "ONLINE" | "OFFLINE" | "HYBRID" | "match";

const FILTERS: { key: Filter; label: string; icon: any }[] = [
  { key: "all",     label: "All",        icon: "apps-outline"       },
  { key: "match",   label: "Top Match",  icon: "star-outline"       },
  { key: "ONLINE",  label: "Online",     icon: "videocam-outline"   },
  { key: "OFFLINE", label: "Offline",    icon: "home-outline"       },
  { key: "HYBRID",  label: "Hybrid",     icon: "git-merge-outline"  },
];

const { width: SCREEN_W } = Dimensions.get("window");

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
          Animated.spring(scale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 0 }).start()
        }
        onPressOut={() =>
          Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start()
        }
        style={[chip.pill, active && chip.pillActive]}
      >
        <Ionicons
          name={f.icon}
          size={11}
          color={active ? "#fff" : T.mutedFg}
          style={{ marginRight: 3 }}
        />
        <Text style={[chip.label, active && chip.labelActive]}>{f.label}</Text>
      </Pressable>
    </Animated.View>
  );
};

// ── Stat tile ─────────────────────────────────────────────────────────────────

const StatTile = ({
  icon,
  value,
  label,
  accent,
}: {
  icon: any;
  value: number;
  label: string;
  accent?: string;
}) => (
  <View style={stat.tile}>
    <View style={[stat.iconRing, accent && { backgroundColor: `${accent}22`, borderColor: `${accent}40` }]}>
      <Ionicons name={icon} size={14} color={accent ?? "rgba(255,255,255,0.6)"} />
    </View>
    <Text style={[stat.val, accent && { color: accent }]}>{value}</Text>
    <Text style={stat.lbl}>{label}</Text>
  </View>
);

// ── Skeleton ──────────────────────────────────────────────────────────────────

const Skeleton = ({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 12, paddingHorizontal: 16 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={s.skelCard}>
        <View style={{ flexDirection: "row", gap: 6, marginBottom: 12 }}>
          <OpportunitySkeleton w="22%" h={22} radius={99} />
          <OpportunitySkeleton w="30%" h={22} radius={99} />
          <OpportunitySkeleton w="18%" h={22} radius={99} />
        </View>
        <OpportunitySkeleton w={i % 2 ? "68%" : "80%"} h={22} radius={6} />
        <OpportunitySkeleton w="40%" h={13} radius={4} />
        <OpportunitySkeleton w="100%" h={56} radius={12} />
        <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
          <OpportunitySkeleton w="26%" h={26} radius={99} />
          <OpportunitySkeleton w="26%" h={26} radius={99} />
          <OpportunitySkeleton w="22%" h={26} radius={99} />
        </View>
      </View>
    ))}
  </View>
);

// ── Tab indicator (sliding pill) ──────────────────────────────────────────────

const TABS: { key: "browse" | "history"; label: string; icon: any }[] = [
  { key: "browse",  label: "Browse",       icon: "telescope-outline" },
  { key: "history", label: "My Interests", icon: "heart-outline"     },
];

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
  const tutorIdRef = useRef<string | null>(null);
  const [expressingId, setExpressingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Filter>("all");
  const [activeTab, setActiveTab] = useState<"browse" | "history">("browse");
  const [historyItems, setHistoryItems] = useState<LeadAnnouncement[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const fetchingRef = useRef(false);

  // Sliding tab indicator
  const tabSlide = useRef(new Animated.Value(0)).current;

  const handleTabChange = (tab: "browse" | "history") => {
    setActiveTab(tab);
    Animated.spring(tabSlide, {
      toValue: tab === "browse" ? 0 : 1,
      useNativeDriver: true,
      speed: 60,
      bounciness: 0,
    }).start();
    if (tab === "history") loadHistory();
  };

  // Header entrance
  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 520,
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
      const tid = tutorIdRef.current;
      const appliedInPage = new Set(
        valid
          .filter((a) =>
            a.isInterestedByMe ||
            (tid && a.interestedTutors?.some((t) => t.tutor === tid || t._id === tid || t === tid))
          )
          .map((a) => a._id),
      );
      if (!append) {
        setInterestedIds(appliedInPage);
      } else {
        setInterestedIds((prev) => {
          const next = new Set(prev);
          appliedInPage.forEach((id) => next.add(id));
          return next;
        });
      }
    } catch {}
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
    fetchingRef.current = false;
  }, []);

  useEffect(() => {
    getTutorProfile().then((res) => {
      const data = res.data as any;
      if (typeof data.interestCount === "number") setMyInterestCount(data.interestCount);
      if (data._id) tutorIdRef.current = data._id;
      loadPage(1);
    }).catch(() => { loadPage(1); });
  }, [loadPage]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await getTutorMyInterests();
      const valid = (res.data || []).filter((a) => a.classLead !== null);
      setHistoryItems(valid);
    } catch {}
    setHistoryLoading(false);
  }, []);

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
          colors={["#080f1e", "#0d1b33", "#0f2040"]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 10 }]}
        >
          {/* Orb decorations */}
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />

          {/* Nav */}
          <Animated.View
            style={[
              s.navRow,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-8, 0] }) }],
              },
            ]}
          >
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={12}
              style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.7, transform: [{ scale: 0.94 }] }]}
            >
              <Ionicons name="arrow-back" size={18} color="#fff" />
            </Pressable>

            <View style={{ flex: 1, paddingHorizontal: 14 }}>
              <Text style={s.navTitle}>Opportunities</Text>
              <Text style={s.navSub}>Find your next student</Text>
            </View>

            {total > 0 && (
              <View style={s.livePill}>
                <View style={s.liveDot} />
                <Text style={s.liveTxt}>{total} live</Text>
              </View>
            )}
          </Animated.View>

          {/* Stat tiles */}
          <Animated.View
            style={[
              s.statsRow,
              {
                opacity: headerAnim,
                transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
              },
            ]}
          >
            <StatTile icon="list-outline"      value={total}           label="Total leads"   />
            <View style={s.statDivider} />
            <StatTile icon="star-outline"      value={perfectCount}    label="Perfect match" accent="#10B981" />
            <View style={s.statDivider} />
            <StatTile icon="hand-left-outline" value={myInterestCount} label="Applied"       accent={T.secondary} />
          </Animated.View>
        </LinearGradient>

        {/* ── Body cap ───────────────────────────────────────────────────── */}
        <View style={s.bodyCap} />

        {/* ── Tab switcher ───────────────────────────────────────────────── */}
        <View style={s.tabTrack}>
          {TABS.map((tab) => {
            const active = activeTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                style={[s.tabBtn, active && s.tabBtnActive]}
                onPress={() => handleTabChange(tab.key)}
              >
                <Ionicons
                  name={tab.icon}
                  size={13}
                  color={active ? "#fff" : T.mutedFg}
                />
                <Text style={[s.tabLabel, active && s.tabLabelActive]}>{tab.label}</Text>
                {tab.key === "history" && myInterestCount > 0 && (
                  <View style={[s.tabBadge, active && s.tabBadgeActive]}>
                    <Text style={[s.tabBadgeTxt, active && { color: "#fff" }]}>{myInterestCount}</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {/* ── Browse tab ─────────────────────────────────────────────────── */}
        {activeTab === "browse" && (
          <>
            {/* Filter strip */}
            <View style={s.filterBar}>
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

            {/* Results header */}
            <View style={s.resultsRow}>
              <Text style={s.resultsLabel}>
                {activeFilter === "all"
                  ? "All opportunities"
                  : FILTERS.find((f) => f.key === activeFilter)?.label ?? "Results"}
              </Text>
              {!loading && filtered.length > 0 && (
                <View style={s.countPill}>
                  <Text style={s.countTxt}>{filtered.length}</Text>
                </View>
              )}
            </View>

            {/* Cards */}
            <View style={s.cardsList}>
              {loading && <Skeleton count={3} />}

              {!loading && filtered.length === 0 && items.length === 0 && (
                <View style={s.emptyWrap}>
                  <OpportunityEmptyState
                    onRefresh={() => { fetchingRef.current = false; loadPage(1); }}
                  />
                </View>
              )}

              {!loading && filtered.length === 0 && items.length > 0 && (
                <View style={s.emptyFilter}>
                  <View style={s.emptyIconBox}>
                    <Ionicons name="filter-outline" size={24} color={T.mutedFg} />
                  </View>
                  <Text style={s.emptyTitle}>No results</Text>
                  <Text style={s.emptyBody}>No leads match this filter right now.</Text>
                  <Pressable
                    onPress={() => setActiveFilter("all")}
                    style={({ pressed }) => [s.showAllBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                  >
                    <Text style={s.showAllTxt}>Show all</Text>
                  </Pressable>
                </View>
              )}

              {!loading && filtered.map((item, i) => (
                <View key={item._id} style={s.cardWrap}>
                  <OpportunityCard
                    item={item}
                    interested={interestedIds.has(item._id)}
                    expressing={expressingId === item._id}
                    onInterest={handleInterest}
                    revealDelay={Math.min(i * 45, 240)}
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
          </>
        )}

        {/* ── My Interests tab ───────────────────────────────────────────── */}
        {activeTab === "history" && (
          <>
            <View style={s.resultsRow}>
              <Text style={s.resultsLabel}>Leads I applied to</Text>
              {!historyLoading && historyItems.length > 0 && (
                <View style={s.countPill}>
                  <Text style={s.countTxt}>{historyItems.length}</Text>
                </View>
              )}
            </View>

            <View style={s.cardsList}>
              {historyLoading && <Skeleton count={3} />}

              {!historyLoading && historyItems.length === 0 && (
                <View style={s.emptyFilter}>
                  <View style={[s.emptyIconBox, { backgroundColor: "#FFF1F2" }]}>
                    <Ionicons name="heart-dislike-outline" size={24} color="#F43F5E" />
                  </View>
                  <Text style={s.emptyTitle}>No interests yet</Text>
                  <Text style={s.emptyBody}>Leads you apply to will appear here.</Text>
                  <Pressable
                    onPress={() => handleTabChange("browse")}
                    style={({ pressed }) => [s.showAllBtn, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                  >
                    <Text style={s.showAllTxt}>Browse opportunities</Text>
                  </Pressable>
                </View>
              )}

              {!historyLoading && historyItems.map((item, i) => (
                <View key={item._id} style={s.cardWrap}>
                  <OpportunityCard
                    item={item}
                    interested={true}
                    expressing={false}
                    onInterest={() => {}}
                    revealDelay={Math.min(i * 45, 240)}
                  />
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: Math.max(insets.bottom, 28) + 16 }} />
      </ScrollView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const BG = "#F4F7FC";

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },

  // ── Header
  header: {
    paddingHorizontal: 18,
    paddingBottom: 30,
    overflow: "hidden",
  },
  orbA: {
    position: "absolute",
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: `${T.primary}18`,
    top: -80,
    right: -60,
  },
  orbB: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${T.secondary}10`,
    bottom: 10,
    left: -40,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 22,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: {
    color: "#fff",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  navSub: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 11,
    marginTop: 1,
    fontWeight: "500",
  },
  livePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    backgroundColor: "rgba(16,185,129,0.15)",
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.30)",
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.success,
  },
  liveTxt: {
    color: T.success,
    fontSize: 11,
    fontWeight: "700",
  },

  // ── Stats row
  statsRow: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 16,
    paddingHorizontal: 6,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignSelf: "center",
  },

  // ── Body cap
  bodyCap: {
    height: 24,
    backgroundColor: BG,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -22,
  },

  // ── Tab switcher
  tabTrack: {
    flexDirection: "row",
    backgroundColor: BG,
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 99,
    backgroundColor: "#E8EDF5",
  },
  tabBtnActive: {
    backgroundColor: T.primaryDark,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: T.mutedFg,
  },
  tabLabelActive: {
    color: "#fff",
    fontWeight: "700",
  },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.08)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  tabBadgeActive: {
    backgroundColor: "rgba(255,255,255,0.22)",
  },
  tabBadgeTxt: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textSecondary,
  },

  // ── Filter bar
  filterBar: {
    backgroundColor: BG,
    paddingTop: 4,
    paddingBottom: 8,
  },
  filterContent: {
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 16,
  },

  // ── Results row
  resultsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  resultsLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
  },
  countPill: {
    backgroundColor: T.primary,
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  countTxt: { color: "#fff", fontSize: 11, fontWeight: "800" },

  // ── Cards
  cardsList: { gap: 0 },
  cardWrap: { paddingHorizontal: 16 },

  // ── Skeleton card
  skelCard: {
    backgroundColor: T.paper,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    padding: 16,
    marginBottom: 12,
    gap: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },

  // ── Empty states
  emptyWrap: { paddingHorizontal: 16 },
  emptyFilter: {
    alignItems: "center",
    paddingVertical: 52,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyIconBox: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
  },
  emptyBody: {
    fontSize: 13,
    color: T.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  showAllBtn: {
    marginTop: 8,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 99,
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  showAllTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },

  // ── End row
  endRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 28,
  },
  endLine: { flex: 1, height: 1, backgroundColor: T.border },
  endTxt: {
    fontSize: 11.5,
    color: T.textDisabled,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});

// ── Stat tile ─────────────────────────────────────────────────────────────────

const stat = StyleSheet.create({
  tile: { flex: 1, alignItems: "center", gap: 4 },
  iconRing: {
    width: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  val: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  lbl: {
    color: "rgba(255,255,255,0.38)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
});

// ── Filter chip ───────────────────────────────────────────────────────────────

const chip = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  pillActive: {
    backgroundColor: T.primary,
    borderColor: T.primaryDark,
    shadowColor: T.primary,
    shadowOpacity: 0.30,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { fontSize: 12.5, fontWeight: "600", color: T.textSecondary },
  labelActive: { color: "#fff", fontWeight: "700" },
});
