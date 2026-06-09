import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  RefreshControl,
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
  AUTH_STORAGE_KEY,
} from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { T } from "../constants/colors";
import OpportunityCard from "../components/opportunities/OpportunityCard";
import OpportunityEmptyState from "../components/opportunities/OpportunityEmptyState";
import OpportunitySkeleton from "../components/opportunities/OpportunitySkeleton";

type Nav = StackNavigationProp<RootStackParamList, "ClassOpportunities">;
interface Props {
  navigation: Nav;
}

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHead = ({
  icon,
  title,
  count,
}: {
  icon: any;
  title: string;
  count?: number;
}) => (
  <View style={s.sectionHead}>
    <View style={[s.sectionIconBg, { backgroundColor: `${T.primary}15` }]}>
      <Ionicons name={icon} size={15} color={T.primary} />
    </View>
    <Text style={s.sectionHeadTxt}>{title}</Text>
    {count !== undefined && (
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeTxt}>{count}</Text>
      </View>
    )}
  </View>
);

// ─── Skeleton rows ────────────────────────────────────────────────────────────

const SkeletonRows = ({ count = 3 }: { count?: number }) => (
  <View style={{ gap: 12 }}>
    {Array.from({ length: count }).map((_, i) => (
      <View key={i} style={s.skeletonCard}>
        <OpportunitySkeleton w="40%" h={20} radius={6} />
        <OpportunitySkeleton w="70%" h={16} />
        <OpportunitySkeleton w="50%" h={13} />
        <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
          <OpportunitySkeleton w="28%" h={26} radius={6} />
          <OpportunitySkeleton w="28%" h={26} radius={6} />
        </View>
      </View>
    ))}
  </View>
);

// ─── Screen ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 10;

export default function ClassOpportunitiesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<LeadAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [expressingId, setExpressingId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  // Load current user ID once on mount
  useEffect(() => {
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
      const uid = raw ? JSON.parse(raw)?.user?.id : null;
      setUserId(uid);
    }).catch(() => {});
  }, []);

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

      // Seed interestedIds from API — persist across reloads
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY).catch(() => null);
      const uid: string | null = raw ? JSON.parse(raw)?.user?.id : null;
      if (uid) {
        const alreadyInterested = new Set<string>(
          valid
            .filter((a) =>
              (a.interestedTutors ?? []).some(
                (t) => String(t.tutor) === uid,
              ),
            )
            .map((a) => a._id),
        );
        setInterestedIds((prev) =>
          append
            ? new Set([...prev, ...alreadyInterested])
            : alreadyInterested,
        );
      }
    } catch {}
    setLoading(false);
    setLoadingMore(false);
    setRefreshing(false);
    fetchingRef.current = false;
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

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
      setItems((prev) =>
        prev.map((a) =>
          a._id === id ? { ...a, interestCount: a.interestCount + 1 } : a,
        ),
      );
    } catch {}
    setExpressingId(null);
  };

  const interested = items.filter((i) => interestedIds.has(i._id)).length;
  const available = total - interested;

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
              fetchingRef.current = false;
              setRefreshing(true);
              loadPage(1);
            }}
            tintColor={T.primary}
          />
        }
        onScroll={({
          nativeEvent: { contentOffset, layoutMeasurement, contentSize },
        }) => {
          const nearBottom =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - 120;
          if (nearBottom) loadMore();
        }}
        scrollEventThrottle={300}
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

          <View style={s.topBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              hitSlop={10}
              style={s.backBtn}
            >
              <View style={s.backCircle}>
                <Ionicons name="arrow-back" size={20} color="#fff" />
              </View>
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={s.headerTitle}>Class Opportunities</Text>
              <Text style={s.headerSub}>Find your next student</Text>
            </View>
            <View style={s.livePill}>
              <View style={s.liveDot} />
              <Text style={s.liveTxt}>{total} live</Text>
            </View>
          </View>

          <View style={s.stripRow}>
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{total}</Text>
              <Text style={s.stripLbl}>Total{"\n"}leads</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{available}</Text>
              <Text style={s.stripLbl}>Still{"\n"}available</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Text style={s.stripVal}>{interested}</Text>
              <Text style={s.stripLbl}>You're{"\n"}interested</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ── White card body ──────────────────────────────────────────────── */}
        <View style={s.card}>
          <SectionHead
            icon="megaphone-outline"
            title="Available Opportunities"
            count={total > 0 ? total : undefined}
          />

          {loading && <SkeletonRows count={3} />}

          {!loading && items.length === 0 && (
            <OpportunityEmptyState
              onRefresh={() => {
                fetchingRef.current = false;
                loadPage(1);
              }}
            />
          )}

          {!loading &&
            items.map((item) => (
              <OpportunityCard
                key={item._id}
                item={item}
                interested={interestedIds.has(item._id)}
                expressing={expressingId === item._id}
                onInterest={handleInterest}
              />
            ))}

          {loadingMore && <SkeletonRows count={2} />}

          {!loading &&
            !loadingMore &&
            items.length > 0 &&
            items.length >= total && (
              <Text style={s.endTxt}>
                You've seen all available opportunities
              </Text>
            )}
        </View>

        <View style={{ height: Math.max(insets.bottom, 32) }} />
      </ScrollView>
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
  backBtn: {},
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
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    borderLeftColor: T.primary,
    paddingLeft: 10,
    marginBottom: 16,
    marginTop: 4,
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

  skeletonCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },

  endTxt: {
    textAlign: "center",
    color: T.textDisabled,
    fontSize: 11,
    paddingVertical: 16,
  },
});
