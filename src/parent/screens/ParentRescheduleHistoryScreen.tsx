import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Animated,
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getParentRescheduleHistory, ParentRescheduleHistoryItem } from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Status badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STATUS: Record<string, { bg: string; fg: string; label: string; icon: string }> = {
  PENDING:  { bg: `${T.warning}18`, fg: T.warning, label: "Pending",  icon: "time-outline"            },
  APPROVED: { bg: `${T.success}18`, fg: T.success, label: "Approved", icon: "checkmark-circle-outline" },
  REJECTED: { bg: `${T.error}15`,   fg: T.error,   label: "Rejected", icon: "close-circle-outline"     },
};

const StatusBadge = ({ status }: { status: string }) => {
  const cfg = STATUS[status] ?? STATUS.PENDING;
  return (
    <View style={[badge.wrap, { backgroundColor: cfg.bg }]}>
      <Ionicons name={cfg.icon as any} size={11} color={cfg.fg} />
      <Text style={[badge.txt, { color: cfg.fg }]}>{cfg.label}</Text>
    </View>
  );
};
const badge = StyleSheet.create({
  wrap: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 4, borderRadius: T.radiusFull },
  txt:  { fontSize: 11, fontWeight: "700" },
});

// â”€â”€â”€ Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const Card = ({ item }: { item: ParentRescheduleHistoryItem }) => (
  <View style={c.card}>
    <View style={c.top}>
      <View style={{ flex: 1 }}>
        {item.subject && <Text style={c.subject}>{item.subject}</Text>}
        {item.studentName && <Text style={c.student}>{item.studentName}</Text>}
      </View>
      <StatusBadge status={item.status} />
    </View>

    <View style={c.datesRow}>
      <View style={c.dateBox}>
        <Text style={c.dateLabel}>FROM</Text>
        <Text style={c.dateVal}>{fmtDate(item.fromDate)}</Text>
      </View>
      <Ionicons name="arrow-forward" size={14} color={T.textDisabled} style={{ marginTop: 14 }} />
      <View style={c.dateBox}>
        <Text style={c.dateLabel}>TO</Text>
        <Text style={c.dateVal}>{fmtDate(item.toDate)}</Text>
      </View>
    </View>

    {item.timeSlot && (
      <View style={c.slotRow}>
        <Ionicons name="time-outline" size={13} color={T.textDisabled} />
        <Text style={c.slotTxt}>{item.timeSlot}</Text>
      </View>
    )}

    {item.rejectionReason && (
      <View style={c.rejectBox}>
        <Ionicons name="information-circle-outline" size={13} color={T.error} />
        <Text style={c.rejectTxt}>{item.rejectionReason}</Text>
      </View>
    )}

    <Text style={c.reqAt}>Requested {fmtDate(item.requestedAt)}</Text>
  </View>
);

const c = StyleSheet.create({
  card:       { backgroundColor: T.paper, borderRadius: T.radiusXl, borderWidth: 1, borderColor: T.border, padding: 16, marginBottom: 12, gap: 10 },
  top:        { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  subject:    { fontSize: 13, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  student:    { fontSize: 11, color: T.textSecondary, marginTop: 2 },
  datesRow:   { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dateBox:    { flex: 1, gap: 3 },
  dateLabel:  { fontSize: 9, fontWeight: "800", color: T.textDisabled, letterSpacing: 0.8 },
  dateVal:    { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  slotRow:    { flexDirection: "row", alignItems: "center", gap: 6 },
  slotTxt:    { fontSize: 12, color: T.textSecondary },
  rejectBox:  { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: `${T.error}10`, borderRadius: 8, padding: 10 },
  rejectTxt:  { flex: 1, fontSize: 12, color: T.error, lineHeight: 17 },
  reqAt:      { fontSize: 11, color: T.textDisabled },
});

// â”€â”€â”€ Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props { navigation?: any; }

export default function ParentRescheduleHistoryScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [items, setItems] = useState<ParentRescheduleHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async (isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const res = await getParentRescheduleHistory();
      setItems(res.data ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load reschedule history.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
    }
  };

  useEffect(() => { load(); }, []);

  const pending  = items.filter((i) => i.status === "PENDING");
  const rest     = items.filter((i) => i.status !== "PENDING");

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 20 }]}
      >
        <View style={s.headerRow}>
          {navigation && (
            <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
          )}
          <View style={{ flex: 1 }}>
            <Text style={s.headerTitle}>Reschedule History</Text>
            <Text style={s.headerSub}>All your session reschedule requests</Text>
          </View>
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={T.primary} style={{ marginTop: 48 }} />
      ) : error ? (
        <View style={s.errorBox}>
          <Ionicons name="alert-circle-outline" size={28} color={T.error} />
          <Text style={s.errorTxt}>{error}</Text>
          <Pressable style={s.retryBtn} onPress={() => load()}>
            <Text style={s.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <Animated.ScrollView
          style={{ opacity: fadeAnim }}
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(true); }} tintColor={T.primary} />}
        >
          {items.length === 0 ? (
            <View style={s.emptyBox}>
              <Ionicons name="calendar-outline" size={40} color={T.textDisabled} />
              <Text style={s.emptyTitle}>No Requests Yet</Text>
              <Text style={s.emptyTxt}>Your reschedule requests will appear here once submitted.</Text>
            </View>
          ) : (
            <>
              {pending.length > 0 && (
                <>
                  <Text style={s.sectionLabel}>PENDING Â· {pending.length}</Text>
                  {pending.map((item) => <Card key={item.requestId} item={item} />)}
                </>
              )}
              {rest.length > 0 && (
                <>
                  <Text style={[s.sectionLabel, pending.length > 0 && { marginTop: 8 }]}>HISTORY Â· {rest.length}</Text>
                  {rest.map((item) => <Card key={item.requestId} item={item} />)}
                </>
              )}
            </>
          )}
        </Animated.ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: T.background },
  header:      { paddingHorizontal: 20, paddingBottom: 24 },
  headerRow:   { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn:     { width: 36, height: 36, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.13)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#fff", letterSpacing: -0.4 },
  headerSub:   { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 2 },
  content:     { paddingHorizontal: 16, paddingTop: 20, paddingBottom: 52 },
  sectionLabel:{ fontSize: 10, fontWeight: "800", color: T.textDisabled, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 },
  errorBox:    { alignItems: "center", gap: 12, paddingTop: 64, paddingHorizontal: 32 },
  errorTxt:    { fontSize: 13, color: T.textSecondary, textAlign: "center", lineHeight: 20 },
  retryBtn:    { backgroundColor: T.primary, paddingHorizontal: 24, paddingVertical: 10, borderRadius: T.radiusFull },
  retryTxt:    { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyBox:    { alignItems: "center", gap: 10, paddingTop: 80, paddingHorizontal: 32 },
  emptyTitle:  { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  emptyTxt:    { fontSize: 13, color: T.textDisabled, textAlign: "center", lineHeight: 20 },
});

