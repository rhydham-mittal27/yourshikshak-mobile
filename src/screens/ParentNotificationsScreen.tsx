/**
 * ParentNotificationsScreen — 2 tabs: "Needs Your Action" and "Updates"
 * Plan: simplify to two states — needs response vs informational.
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  RefreshControl,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMyNotifications,
  markNotificationRead,
  AppNotification,
} from "../api/client";
import { T } from "../constants/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

// Classify notifications into "action" vs "update"
const ACTION_TYPES = new Set([
  "ATTENDANCE_VERIFICATION",
  "PAYMENT_DUE",
  "INTERVENTION_ALERT",
  "DEMO_FEEDBACK",
  "RESCHEDULE_REQUEST",
]);

const isActionRequired = (n: AppNotification) =>
  ACTION_TYPES.has(n.type) || n.title?.toLowerCase().includes("verify") || n.title?.toLowerCase().includes("due") || n.title?.toLowerCase().includes("pending");

// Icon + color per notification type
const notifStyle = (n: AppNotification): { icon: string; color: string } => {
  const t = n.type ?? "";
  if (t.includes("PAYMENT") || t.includes("FEE"))   return { icon: "wallet-outline",          color: T.warning };
  if (t.includes("TEST") || t.includes("SCORE"))    return { icon: "school-outline",           color: T.primary };
  if (t.includes("ATTEND"))                          return { icon: "checkmark-circle-outline", color: T.success };
  if (t.includes("RESCHEDULE"))                      return { icon: "calendar-outline",         color: T.info };
  if (t.includes("ALERT") || t.includes("INTERV"))  return { icon: "warning-outline",          color: T.error };
  if (t.includes("REPORT") || t.includes("PDF"))    return { icon: "document-text-outline",    color: T.primary };
  if (t.includes("REFERRAL") || t.includes("REWARD")) return { icon: "gift-outline",          color: "#7C3AED" };
  return { icon: "notifications-outline", color: T.mutedFg };
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({ w, h, radius = 8 }: { w: number | string; h: number; radius?: number }) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={{ width: w as any, height: h, borderRadius: radius, backgroundColor: "#E2E8F0", opacity: anim }} />;
};

// ─── Notification Row ─────────────────────────────────────────────────────────

const NotifRow = ({
  notif,
  showCta,
  onPress,
}: {
  notif: AppNotification;
  showCta: boolean;
  onPress: (n: AppNotification) => void;
}) => {
  const { icon, color } = notifStyle(notif);
  const unread = !notif.isRead;

  return (
    <Pressable
      style={[nr.row, unread && nr.rowUnread]}
      onPress={() => onPress(notif)}
    >
      {unread && <View style={nr.unreadBar} />}
      <View style={[nr.iconBox, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon as any} size={18} color={color} />
      </View>
      <View style={nr.content}>
        <View style={nr.titleRow}>
          <Text style={[nr.title, unread && nr.titleUnread]} numberOfLines={2}>
            {notif.title}
          </Text>
          <Text style={nr.time}>{timeAgo(notif.createdAt)}</Text>
        </View>
        {notif.message && (
          <Text style={nr.body} numberOfLines={3}>{notif.message}</Text>
        )}
        {showCta && (
          <View style={nr.ctaBtn}>
            <Text style={nr.ctaTxt}>Take action</Text>
            <Ionicons name="arrow-forward" size={12} color={color} />
          </View>
        )}
      </View>
    </Pressable>
  );
};

const nr = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start", gap: 12, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.border },
  rowUnread: { backgroundColor: `${T.primary}04` },
  unreadBar: { position: "absolute", left: 0, top: 0, bottom: 0, width: 3, backgroundColor: T.primary, borderTopLeftRadius: T.radiusMd, borderBottomLeftRadius: T.radiusMd },
  iconBox: { width: 38, height: 38, borderRadius: T.radiusMd, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  content: { flex: 1, gap: 4 },
  titleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  title: { flex: 1, fontSize: 13, fontWeight: "600", color: T.textPrimary, lineHeight: 18 },
  titleUnread: { fontWeight: "700" },
  time: { fontSize: 11, color: T.mutedFg, flexShrink: 0, marginTop: 1 },
  body: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
  ctaBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4, alignSelf: "flex-start" },
  ctaTxt: { fontSize: 12, fontWeight: "700", color: T.primary },
});

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TabPill = ({
  active,
  label,
  count,
  onPress,
}: {
  active: boolean;
  label: string;
  count?: number;
  onPress: () => void;
}) => (
  <Pressable style={[tp.tab, active && tp.tabActive]} onPress={onPress}>
    <Text style={[tp.label, active && tp.labelActive]}>{label}</Text>
    {count != null && count > 0 && (
      <View style={[tp.badge, active && tp.badgeActive]}>
        <Text style={[tp.badgeTxt, active && tp.badgeTxtActive]}>{count}</Text>
      </View>
    )}
  </Pressable>
);

const tp = StyleSheet.create({
  tab: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 14, paddingVertical: 7, borderRadius: T.radiusFull, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  tabActive: { backgroundColor: "#fff", borderColor: "#fff" },
  label: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.7)" },
  labelActive: { color: T.textPrimary },
  badge: { backgroundColor: "rgba(255,255,255,0.25)", minWidth: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  badgeActive: { backgroundColor: T.primary },
  badgeTxt: { fontSize: 10, fontWeight: "800", color: "#fff" },
  badgeTxtActive: { color: "#fff" },
});

// ─── Empty State ──────────────────────────────────────────────────────────────

const EmptyState = ({ isAction }: { isAction: boolean }) => (
  <View style={es.wrap}>
    <Ionicons name={isAction ? "checkmark-circle-outline" : "notifications-outline"} size={40} color={T.border} />
    <Text style={es.title}>
      {isAction ? "Nothing needs your attention right now." : "No new updates."}
    </Text>
    <Text style={es.sub}>
      {isAction
        ? "When something requires action, it'll appear here."
        : "We'll let you know when something changes."}
    </Text>
  </View>
);

const es = StyleSheet.create({
  wrap: { alignItems: "center", gap: 10, paddingVertical: 60, paddingHorizontal: 32 },
  title: { fontSize: 14, fontWeight: "700", color: T.textSecondary, textAlign: "center" },
  sub: { fontSize: 12, color: T.mutedFg, textAlign: "center", lineHeight: 18 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ParentNotificationsScreen = ({ }: { userId: string; name: string; role: string }) => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"action" | "updates">("action");
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await getMyNotifications();
      setNotifications(res.data ?? []);
    } catch { /* silent */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await loadData();
    setLoading(false);
  }, [loadData]);

  useEffect(() => { void load(); }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePress = async (n: AppNotification) => {
    if (!n.isRead) {
      try { await markNotificationRead(n._id); } catch { /* silent */ }
      setNotifications((prev) =>
        prev.map((x) => x._id === n._id ? { ...x, isRead: true } : x)
      );
    }
  };

  const actionNotifs  = notifications.filter(isActionRequired);
  const updateNotifs  = notifications.filter((n) => !isActionRequired(n));
  const displayed     = tab === "action" ? actionNotifs : updateNotifs;
  const unreadActions = actionNotifs.filter((n) => !n.isRead).length;
  const unreadUpdates = updateNotifs.filter((n) => !n.isRead).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ScrollView
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
      >
        {/* Hero */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <Text style={s.headerTitle}>Notifications</Text>
          <Text style={s.headerSub}>Only what matters</Text>

          {/* Tab pills */}
          <View style={s.tabRow}>
            <TabPill
              active={tab === "action"}
              label="Needs Your Action"
              count={unreadActions}
              onPress={() => setTab("action")}
            />
            <TabPill
              active={tab === "updates"}
              label="Updates"
              count={unreadUpdates}
              onPress={() => setTab("updates")}
            />
          </View>
        </LinearGradient>

        {/* List */}
        <View style={s.list}>
          {loading ? (
            <View style={{ gap: 1 }}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={{ padding: 16, backgroundColor: T.paper, borderBottomWidth: 1, borderBottomColor: T.border, flexDirection: "row", gap: 12 }}>
                  <Skeleton w={38} h={38} radius={10} />
                  <View style={{ flex: 1, gap: 6 }}>
                    <Skeleton w="80%" h={13} />
                    <Skeleton w="60%" h={11} />
                  </View>
                </View>
              ))}
            </View>
          ) : displayed.length === 0 ? (
            <EmptyState isAction={tab === "action"} />
          ) : (
            displayed.map((n) => (
              <NotifRow
                key={n._id}
                notif={n}
                showCta={tab === "action"}
                onPress={handlePress}
              />
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scrollContent: { paddingBottom: 24 },
  header: { paddingHorizontal: 20, paddingBottom: 20, gap: 4 },
  headerTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)", marginBottom: 4 },
  tabRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  list: { backgroundColor: T.paper },
});

export default ParentNotificationsScreen;
