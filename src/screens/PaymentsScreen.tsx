import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";
import {
  getTutorPayoutSummary,
  getTutorVerificationFeeSummary,
  getTutorProfile,
  PaymentItem,
} from "../api/client";

type Nav = StackNavigationProp<RootStackParamList, "Payments">;
interface Props { navigation: Nav }

const C = {
  bg:          "#F8FAFC",
  card:        "#FFFFFF",
  border:      "#E8EDF5",
  textPrimary: "#0F172A",
  textSecond:  "#64748B",
  textMuted:   "#94A3B8",
  paid:        "#10B981",
  paidBg:      "#ECFDF5",
  paidBorder:  "#A7F3D0",
  pending:     "#F59E0B",
  pendingBg:   "#FFFBEB",
  pendingBorder:"#FDE68A",
  overdue:     "#EF4444",
  overdueBg:   "#FEF2F2",
  overdueBorder:"#FECACA",
};

const fmtRupee = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

const fmtDate = (d?: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const statusStyle = (status: string) => {
  if (status === "PAID")    return { bg: C.paidBg,    border: C.paidBorder,    text: C.paid,    label: "Paid" };
  if (status === "OVERDUE") return { bg: C.overdueBg, border: C.overdueBorder, text: C.overdue, label: "Overdue" };
  return { bg: C.pendingBg, border: C.pendingBorder, text: C.pending, label: "Pending" };
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function PaymentsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<"payouts" | "verification">("payouts");

  const [payouts, setPayouts]       = useState<PaymentItem[]>([]);
  const [payoutStats, setPayoutStats] = useState({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  const [verFee, setVerFee]         = useState<PaymentItem[]>([]);
  const [verStats, setVerStats]     = useState({ totalAmount: 0, paidAmount: 0, pendingAmount: 0 });
  const [verFeeStatus, setVerFeeStatus] = useState<string | null>(null);

  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setError(null);
    try {
      const [payoutRes, verRes, profileRes] = await Promise.all([
        getTutorPayoutSummary(),
        getTutorVerificationFeeSummary(),
        getTutorProfile().catch(() => null),
      ]);
      setPayouts(payoutRes.data.payments ?? []);
      setPayoutStats(payoutRes.data.statistics);
      setVerFee(verRes.data.payments ?? []);
      setVerStats(verRes.data.statistics);
      if (profileRes) setVerFeeStatus((profileRes as any).data?.verificationFeeStatus ?? null);
    } catch (err: any) {
      setError(err?.message || "Failed to load payment data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const onRefresh = () => { setRefreshing(true); fetchAll(); };

  // Total earned = all paid payouts
  const totalEarned  = payoutStats.paidAmount;
  const totalPending = payoutStats.pendingAmount;
  const thisMonth    = (() => {
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();
    return payouts
      .filter(p => {
        if (p.status !== "PAID") return false;
        if (p.cycleMonth != null && p.cycleYear != null)
          return p.cycleMonth === m && p.cycleYear === y;
        const d = new Date(p.paymentDate ?? p.createdAt);
        return d.getMonth() + 1 === m && d.getFullYear() === y;
      })
      .reduce((s, p) => s + p.amount, 0);
  })();

  return (
    <View style={[s.root, { paddingTop: 0 }]}>
      {/* Hero */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: insets.top }]}
      >
        <View style={s.heroHeader}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={s.backWrap}>
            <View style={s.backBtn}>
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </View>
          </Pressable>
          <View style={s.heroTitle}>
            <Text style={s.heroTitleTxt}>Payments</Text>
            <Text style={s.heroSubTxt}>Payouts & verification fees</Text>
          </View>
          <View style={{ width: 36 }} />
        </View>

        {/* Summary strip */}
        {!loading && (
          <View style={s.summaryStrip}>
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{fmtRupee(totalEarned)}</Text>
              <Text style={s.summaryLbl}>Total Earned</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryItem}>
              <Text style={s.summaryVal}>{fmtRupee(thisMonth)}</Text>
              <Text style={s.summaryLbl}>This Month</Text>
            </View>
            <View style={s.summarySep} />
            <View style={s.summaryItem}>
              <Text style={[s.summaryVal, totalPending > 0 && { color: "#FCD34D" }]}>{fmtRupee(totalPending)}</Text>
              <Text style={s.summaryLbl}>Pending</Text>
            </View>
          </View>
        )}
      </LinearGradient>

      {/* Tabs */}
      <View style={s.tabRow}>
        <Pressable
          style={[s.tab, tab === "payouts" && s.tabActive]}
          onPress={() => setTab("payouts")}
        >
          <Ionicons name="cash-outline" size={15} color={tab === "payouts" ? T.primary : C.textMuted} />
          <Text style={[s.tabTxt, tab === "payouts" && s.tabTxtActive]}>Payouts</Text>
        </Pressable>
        <Pressable
          style={[s.tab, tab === "verification" && s.tabActive]}
          onPress={() => setTab("verification")}
        >
          <Ionicons name="shield-checkmark-outline" size={15} color={tab === "verification" ? T.primary : C.textMuted} />
          <Text style={[s.tabTxt, tab === "verification" && s.tabTxtActive]}>Verification Fee</Text>
        </Pressable>
      </View>

      {/* Content */}
      {loading ? (
        <View style={s.center}>
          <ActivityIndicator color={T.primary} size="large" />
        </View>
      ) : error ? (
        <View style={s.center}>
          <Ionicons name="alert-circle-outline" size={40} color={C.textMuted} />
          <Text style={s.errorTxt}>{error}</Text>
          <Pressable onPress={fetchAll} style={s.retryBtn}>
            <Text style={s.retryTxt}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[s.list, { paddingBottom: insets.bottom + 32 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />}
        >
          {tab === "payouts" ? (
            <PayoutsTab payments={payouts} stats={payoutStats} />
          ) : (
            <VerificationTab payments={verFee} stats={verStats} feeStatus={verFeeStatus} />
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Payouts Tab ──────────────────────────────────────────────────────────────

function PayoutsTab({ payments, stats }: { payments: PaymentItem[]; stats: typeof dummyStats }) {
  if (!payments.length) {
    return (
      <EmptyState
        icon="cash-outline"
        title="No payouts yet"
        subtitle="Your monthly payouts from YourShikshak will appear here once processed."
      />
    );
  }

  return (
    <>
      <StatRow stats={stats} paidLabel="Total Received" hidePending />
      {payments.map(p => <PaymentCard key={p._id} payment={p} />)}
    </>
  );
}

// ─── Verification Tab ─────────────────────────────────────────────────────────

function VerificationTab({
  payments, stats, feeStatus,
}: { payments: PaymentItem[]; stats: typeof dummyStats; feeStatus: string | null }) {
  const st = statusStyle(feeStatus === "PAID" ? "PAID" : feeStatus ? "PENDING" : "PENDING");

  return (
    <>
      {/* Fee status card */}
      <View style={[vt.statusCard, { borderColor: st.border, backgroundColor: st.bg }]}>
        <View style={vt.statusRow}>
          <View style={[vt.statusDot, { backgroundColor: st.text }]} />
          <Text style={[vt.statusLabel, { color: st.text }]}>
            {feeStatus === "PAID"
              ? "Verification fee paid"
              : feeStatus === "DEDUCT_FROM_FIRST_MONTH"
              ? "To be deducted from first payout"
              : "Verification fee pending"}
          </Text>
        </View>
        <Text style={vt.statusDesc}>
          {feeStatus === "PAID"
            ? "Your one-time verification fee has been successfully processed. You are fully verified on YourShikshak."
            : feeStatus === "DEDUCT_FROM_FIRST_MONTH"
            ? "Your verification fee will be automatically deducted from your first monthly payout."
            : "A one-time verification fee is required to activate your tutor profile and receive payouts."}
        </Text>
      </View>

      {/* Info card */}
      <View style={vt.infoCard}>
        <Ionicons name="information-circle-outline" size={16} color={T.primary} style={{ marginTop: 1 }} />
        <Text style={vt.infoText}>
          The verification fee is a one-time charge that covers identity verification, document review, and profile activation on the YourShikshak platform.
        </Text>
      </View>

      {payments.length > 0 && (
        <>
          <StatRow stats={stats} paidLabel="Paid" hidePending />
          {payments.map(p => <PaymentCard key={p._id} payment={p} />)}
        </>
      )}

      {payments.length === 0 && (
        <EmptyState
          icon="shield-checkmark-outline"
          title="No fee records"
          subtitle="Verification fee transactions will appear here once created."
        />
      )}
    </>
  );
}

// ─── Shared Components ────────────────────────────────────────────────────────

const dummyStats = { totalAmount: 0, paidAmount: 0, pendingAmount: 0 };

function StatRow({ stats, paidLabel, pendingLabel, hidePending }: {
  stats: typeof dummyStats; paidLabel: string; pendingLabel?: string; hidePending?: boolean;
}) {
  return (
    <View style={sc.statRow}>
      <View style={[sc.statCard, { borderColor: C.paidBorder, backgroundColor: C.paidBg }]}>
        <Ionicons name="checkmark-circle-outline" size={18} color={C.paid} />
        <Text style={[sc.statVal, { color: C.paid }]}>{fmtRupee(stats.paidAmount)}</Text>
        <Text style={sc.statLbl}>{paidLabel}</Text>
      </View>
      {!hidePending && (
        <View style={[sc.statCard, { borderColor: C.pendingBorder, backgroundColor: C.pendingBg }]}>
          <Ionicons name="time-outline" size={18} color={C.pending} />
          <Text style={[sc.statVal, { color: C.pending }]}>{fmtRupee(stats.pendingAmount)}</Text>
          <Text style={sc.statLbl}>{pendingLabel}</Text>
        </View>
      )}
    </View>
  );
}

function PaymentCard({ payment: p }: { payment: PaymentItem }) {
  const st  = statusStyle(p.status);
  const cycle = p.cycleMonth && p.cycleYear
    ? `${MONTHS[p.cycleMonth - 1]} ${p.cycleYear}`
    : null;

  return (
    <View style={pc.card}>
      {/* Left accent */}
      <View style={[pc.accent, { backgroundColor: st.text }]} />

      <View style={pc.body}>
        {/* Top row */}
        <View style={pc.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={pc.studentName} numberOfLines={1}>
              {p.finalClass?.studentName ?? "Payout"}
            </Text>
            {cycle && <Text style={pc.cycle}>{cycle}</Text>}
          </View>
          <View style={[pc.badge, { backgroundColor: st.bg, borderColor: st.border }]}>
            <Text style={[pc.badgeTxt, { color: st.text }]}>{st.label}</Text>
          </View>
        </View>

        {/* Amount */}
        <Text style={[pc.amount, { color: st.text }]}>{fmtRupee(p.amount)}</Text>

        {/* Meta row */}
        <View style={pc.metaRow}>
          {p.paymentDate ? (
            <View style={pc.metaItem}>
              <Ionicons name="checkmark-done-outline" size={12} color={C.textMuted} />
              <Text style={pc.metaTxt}>Paid {fmtDate(p.paymentDate)}</Text>
            </View>
          ) : (
            <View style={pc.metaItem}>
              <Ionicons name="calendar-outline" size={12} color={C.textMuted} />
              <Text style={pc.metaTxt}>Due {fmtDate(p.dueDate)}</Text>
            </View>
          )}
          {p.paymentMethod && (
            <View style={pc.metaItem}>
              <Ionicons name="card-outline" size={12} color={C.textMuted} />
              <Text style={pc.metaTxt}>{p.paymentMethod.replace(/_/g, " ")}</Text>
            </View>
          )}
          {p.transactionId && (
            <View style={pc.metaItem}>
              <Ionicons name="receipt-outline" size={12} color={C.textMuted} />
              <Text style={pc.metaTxt} numberOfLines={1}>#{p.transactionId.slice(-8)}</Text>
            </View>
          )}
        </View>

        {p.notes ? <Text style={pc.notes} numberOfLines={2}>{p.notes}</Text> : null}
      </View>
    </View>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <View style={es.wrap}>
      <View style={es.iconCircle}>
        <Ionicons name={icon} size={32} color={C.textMuted} />
      </View>
      <Text style={es.title}>{title}</Text>
      <Text style={es.subtitle}>{subtitle}</Text>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },

  hero: {
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 10,
  },
  heroHeader: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backWrap: { width: 36 },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center", justifyContent: "center",
  },
  heroTitle:    { flex: 1, alignItems: "center" },
  heroTitleTxt: { color: "#fff", fontSize: 16, fontWeight: "700", letterSpacing: -0.3 },
  heroSubTxt:   { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },

  summaryStrip: {
    flexDirection: "row", marginHorizontal: 16, marginBottom: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  summaryItem: { flex: 1, alignItems: "center", paddingVertical: 12 },
  summarySep:  { width: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 8 },
  summaryVal:  { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  summaryLbl:  { color: "rgba(255,255,255,0.6)", fontSize: 10, marginTop: 2, fontWeight: "600" },

  tabRow: {
    flexDirection: "row", marginHorizontal: 16, marginTop: 16, marginBottom: 8,
    backgroundColor: "#EFF2F7", borderRadius: 14, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, paddingVertical: 9, borderRadius: 11,
  },
  tabActive:    { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabTxt:       { fontSize: 13, fontWeight: "600", color: C.textMuted },
  tabTxtActive: { color: T.primary },

  list:   { paddingHorizontal: 16, paddingTop: 8 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingTop: 80 },
  errorTxt: { color: C.textMuted, fontSize: 13, textAlign: "center" },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 9, backgroundColor: T.primary + "18", borderRadius: 10 },
  retryTxt: { color: T.primary, fontWeight: "700", fontSize: 13 },
});

const sc = StyleSheet.create({
  statRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 14, borderWidth: 1,
    padding: 14, alignItems: "center", gap: 4,
  },
  statVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: { fontSize: 11, color: C.textSecond, fontWeight: "600" },
});

const pc = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: C.card, borderRadius: 16,
    borderWidth: 1, borderColor: C.border,
    marginBottom: 10, overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  accent: { width: 4 },
  body:   { flex: 1, padding: 14, gap: 6 },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  studentName: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  cycle:       { fontSize: 11, color: C.textMuted, marginTop: 2 },
  badge: {
    paddingHorizontal: 9, paddingVertical: 3,
    borderRadius: 8, borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontWeight: "700" },
  amount:   { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  metaRow:  { flexDirection: "row", flexWrap: "wrap", gap: 12, marginTop: 2 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt:  { fontSize: 11, color: C.textMuted },
  notes:    { fontSize: 12, color: C.textSecond, fontStyle: "italic", marginTop: 2 },
});

const vt = StyleSheet.create({
  statusCard: {
    borderRadius: 16, borderWidth: 1,
    padding: 16, marginBottom: 12, gap: 8,
  },
  statusRow:  { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot:  { width: 8, height: 8, borderRadius: 4 },
  statusLabel:{ fontSize: 13, fontWeight: "700" },
  statusDesc: { fontSize: 12.5, color: C.textSecond, lineHeight: 19 },
  infoCard: {
    flexDirection: "row", gap: 10,
    backgroundColor: T.primary + "0D",
    borderRadius: 14, borderWidth: 1, borderColor: T.primary + "30",
    padding: 14, marginBottom: 16,
  },
  infoText: { flex: 1, color: T.primary, fontSize: 12.5, lineHeight: 19, fontWeight: "500" },
});

const es = StyleSheet.create({
  wrap: { alignItems: "center", paddingTop: 48, paddingHorizontal: 32, gap: 10 },
  iconCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#F1F5F9",
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  title:    { fontSize: 15, fontWeight: "700", color: C.textPrimary, textAlign: "center" },
  subtitle: { fontSize: 13, color: C.textMuted, textAlign: "center", lineHeight: 19 },
});
