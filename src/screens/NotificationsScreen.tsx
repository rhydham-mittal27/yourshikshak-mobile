import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  AppNotification,
  getMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../api/client";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "Notifications">;
interface Props {
  navigation: Nav;
}

const TYPE_META: Record<
  string,
  { icon: string; grad: [string, string]; label: string }
> = {
  ANNOUNCEMENT: {
    icon: "megaphone",
    grad: [T.primary, T.primaryDark],
    label: "Opportunity",
  },
  DEMO_ASSIGNED: {
    icon: "calendar",
    grad: ["#10B981", "#059669"],
    label: "Demo",
  },
  PAYMENT: { icon: "cash", grad: ["#F59E0B", "#D97706"], label: "Payment" },
  VERIFICATION: {
    icon: "shield-checkmark",
    grad: ["#7C3AED", "#5B21B6"],
    label: "Verification",
  },
  ATTENDANCE: {
    icon: "checkmark-circle",
    grad: [T.info, "#1D6FBF"],
    label: "Attendance",
  },
  GENERAL: {
    icon: "notifications",
    grad: ["#64748B", "#475569"],
    label: "General",
  },
};

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
};

const NotificationCard = React.memo(
  ({
    item,
    onPress,
  }: {
    item: AppNotification;
    onPress: (id: string) => void;
    index: number;
  }) => {
    const meta = TYPE_META[item.type] ?? TYPE_META.GENERAL;
    return (
      <Pressable
        style={({ pressed }) => [
          s.row,
          !item.isRead && s.rowUnread,
          pressed && s.rowPressed,
        ]}
        onPress={() => onPress(item._id)}
      >
        {/* Icon circle */}
        <LinearGradient
          colors={meta.grad}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.iconCircle}
        >
          <Ionicons name={meta.icon as any} size={22} color="#fff" />
        </LinearGradient>

        {/* Text */}
        <View style={s.textCol}>
          <Text style={s.rowTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={s.rowMsg} numberOfLines={2}>
            {item.message}
          </Text>
          <Text style={s.rowTime}>{timeAgo(item.createdAt)}</Text>
        </View>

        {/* Unread dot */}
        {!item.isRead && (
          <View style={[s.unreadDot, { backgroundColor: meta.grad[0] }]} />
        )}
      </Pressable>
    );
  },
);

export default function NotificationsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await getMyNotifications(1, 50);
      setItems(res.data ?? []);
    } catch {}
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePress = async (id: string) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    try {
      await markNotificationRead(id);
    } catch {}
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems([]);
    } catch {}
    setMarkingAll(false);
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor={T.darkBg} />

      {/* ── Hero header matching dashboard ─────────────────────────────── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 10 }]}
      >
        {/* Orbs */}
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        {/* Top bar */}
        <View style={s.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={s.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </Pressable>
          <Text style={s.heroTitle}>Notifications</Text>
          <Pressable
            onPress={handleMarkAll}
            style={[s.markAllBtn, unreadCount === 0 && { opacity: 0.4 }]}
            disabled={markingAll || unreadCount === 0}
          >
            {markingAll ? (
              <ActivityIndicator size={12} color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-done-outline"
                  size={13}
                  color="#fff"
                />
                <Text style={s.markAllTxt}>Mark all read</Text>
              </>
            )}
          </Pressable>
        </View>

        {/* Count pill */}
        <View style={s.countRow}>
          <View style={s.countPill}>
            <View style={s.countDot} />
            <Text style={s.countTxt}>
              {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.primary} size="large" />
          <Text style={s.loadingTxt}>Loading notifications…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconWrap}>
            <Ionicons
              name="notifications-off-outline"
              size={36}
              color={T.primary}
            />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyTxt}>
            No new notifications right now.{"\n"}Check back later.
          </Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(n) => n._id}
          contentContainerStyle={s.list}
          renderItem={({ item, index }) => (
            <NotificationCard item={item} onPress={handlePress} index={index} />
          )}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => load(true)}
              tintColor={T.primary}
            />
          }
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  // Hero
  hero: { paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden" },
  orbA: {
    position: "absolute",
    top: -60,
    right: -40,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: `${T.secondary}18`,
  },
  orbB: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: `${T.primary}14`,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  backBtn: { marginRight: 10, padding: 2 },
  heroTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.2,
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  markAllTxt: { fontSize: 12, color: "#fff", fontWeight: "600" },
  countRow: { flexDirection: "row" },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  countDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: T.success,
  },
  countTxt: { fontSize: 12, color: "rgba(255,255,255,0.8)", fontWeight: "500" },

  // List
  list: { paddingBottom: 40 },

  // Row (Instagram style)
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
    backgroundColor: T.paper,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rowUnread: { backgroundColor: "#EFF6FF" },
  rowPressed: { backgroundColor: "#E8F0FE" },

  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  textCol: { flex: 1 },
  rowTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    lineHeight: 20,
    marginBottom: 2,
  },
  rowMsg: {
    fontSize: 13,
    color: T.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  rowTime: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  // States
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    padding: 24,
  },
  loadingTxt: { fontSize: 14, color: T.mutedFg, marginTop: 4 },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${T.primary}12`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: T.textPrimary },
  emptyTxt: {
    fontSize: 14,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 22,
  },
});
