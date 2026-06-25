/**
 * ParentPaymentsScreen — Value Summary → Next Payment → History → Referral
 * Plan: answer Q3 "Am I getting value for money?" — value renders BEFORE the fee.
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
  Share,
  Clipboard,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getParentPayments,
  getParentDashboard,
  ParentPayment,
  ParentPaymentSummary,
} from "../api/client";
import { T } from "../constants/colors";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

const fmtAmount = (n: number) => `₹${n.toLocaleString("en-IN")}`;

const daysUntil = (iso: string): number => {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
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

// ─── Status badge ─────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: ParentPayment["status"] }) => {
  const cfg: Record<string, { bg: string; color: string; label: string }> = {
    PAID:    { bg: `${T.success}15`, color: T.success, label: "Paid" },
    PENDING: { bg: `${T.warning}15`, color: T.warning, label: "Pending" },
    OVERDUE: { bg: `${T.error}15`,   color: T.error,   label: "Overdue" },
  };
  const c = cfg[status] ?? cfg.PENDING;
  return (
    <View style={[sb.badge, { backgroundColor: c.bg }]}>
      <Text style={[sb.txt, { color: c.color }]}>{c.label}</Text>
    </View>
  );
};

const sb = StyleSheet.create({
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: T.radiusFull },
  txt: { fontSize: 11, fontWeight: "700" },
});

// ─── Value Summary Card ───────────────────────────────────────────────────────

const ValueSummaryCard = ({
  classesCompleted,
  subjectsActive,
  amountSpent,
  progressGain,
  progressSubject,
}: {
  classesCompleted: number;
  subjectsActive: number;
  amountSpent: number;
  progressGain?: number;
  progressSubject?: string;
}) => (
  <View style={vs.card}>
    <View style={vs.leftBorder} />
    <View style={vs.content}>
      <View style={vs.header}>
        <Ionicons name="trending-up-outline" size={16} color={T.success} />
        <Text style={vs.headerTxt}>What you've received this month</Text>
      </View>
      <View style={vs.statsRow}>
        <View style={vs.stat}>
          <Text style={vs.statVal}>{classesCompleted}</Text>
          <Text style={vs.statLbl}>Classes</Text>
        </View>
        <View style={vs.divider} />
        <View style={vs.stat}>
          <Text style={vs.statVal}>{subjectsActive}</Text>
          <Text style={vs.statLbl}>Subjects</Text>
        </View>
        <View style={vs.divider} />
        <View style={vs.stat}>
          <Text style={vs.statVal}>{fmtAmount(amountSpent)}</Text>
          <Text style={vs.statLbl}>Invested</Text>
        </View>
        {progressGain != null && (
          <>
            <View style={vs.divider} />
            <View style={vs.stat}>
              <Text style={[vs.statVal, { color: T.success }]}>↑{progressGain}%</Text>
              <Text style={vs.statLbl}>{progressSubject ?? "Progress"}</Text>
            </View>
          </>
        )}
      </View>
    </View>
  </View>
);

const vs = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: `${T.success}30`, flexDirection: "row", overflow: "hidden" },
  leftBorder: { width: 4, backgroundColor: T.success },
  content: { flex: 1, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerTxt: { fontSize: 12, fontWeight: "700", color: T.success },
  statsRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  stat: { alignItems: "center", gap: 2, minWidth: 60 },
  statVal: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  statLbl: { fontSize: 10, color: T.mutedFg, fontWeight: "500" },
  divider: { width: 1, height: 28, backgroundColor: T.border },
});

// ─── Next Payment Card ────────────────────────────────────────────────────────

const NextPaymentCard = ({ payment }: { payment: ParentPayment }) => {
  const days = daysUntil(payment.dueDate);
  const urgent = days <= 3 && payment.status !== "PAID";
  return (
    <View style={[np.card, urgent && np.cardUrgent, payment.status === "PAID" && np.cardPaid]}>
      <View style={np.topRow}>
        <View>
          <Text style={np.label}>{payment.status === "PAID" ? "Last Payment" : "Next Payment Due"}</Text>
          <Text style={np.amount}>{fmtAmount(payment.amount)}</Text>
        </View>
        <StatusBadge status={payment.status} />
      </View>

      <Text style={np.due}>
        {payment.status === "PAID"
          ? `Paid on ${fmtDate(payment.paidDate!)}`
          : `Due ${fmtDate(payment.dueDate)}`}
      </Text>

      {urgent && payment.status !== "PAID" && (
        <View style={np.warningRow}>
          <Ionicons name="warning-outline" size={14} color={T.warning} />
          <Text style={np.warningTxt}>
            Pay by {fmtDate(payment.dueDate)} to keep your child's classes uninterrupted
          </Text>
        </View>
      )}

      {payment.status !== "PAID" && (
        <Pressable style={np.payBtn}>
          <Ionicons name="card-outline" size={16} color="#fff" />
          <Text style={np.payBtnTxt}>Pay Now</Text>
        </Pressable>
      )}
    </View>
  );
};

const np = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.border, padding: 16, gap: 10 },
  cardUrgent: { borderColor: `${T.warning}50`, backgroundColor: `${T.warning}06` },
  cardPaid: { borderColor: `${T.success}30` },
  topRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" },
  label: { fontSize: 11, color: T.mutedFg, fontWeight: "600", marginBottom: 2 },
  amount: { fontSize: 26, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.5 },
  due: { fontSize: 12, color: T.textSecondary },
  warningRow: { flexDirection: "row", alignItems: "flex-start", gap: 6, backgroundColor: `${T.warning}12`, padding: 10, borderRadius: T.radiusMd },
  warningTxt: { flex: 1, fontSize: 12, color: T.warning, fontWeight: "600", lineHeight: 17 },
  payBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, padding: 13, borderRadius: T.radiusMd },
  payBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ─── Payment History Row ──────────────────────────────────────────────────────

const PaymentRow = ({ payment }: { payment: ParentPayment }) => (
  <View style={ph.row}>
    <View style={ph.left}>
      <Text style={ph.month}>{payment.month}</Text>
      <Text style={ph.date}>{fmtDate(payment.dueDate)}</Text>
    </View>
    <Text style={ph.amount}>{fmtAmount(payment.amount)}</Text>
    <StatusBadge status={payment.status} />
    {payment.invoiceUrl && (
      <Pressable hitSlop={8}>
        <Ionicons name="document-outline" size={16} color={T.mutedFg} />
      </Pressable>
    )}
  </View>
);

const ph = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: T.border },
  left: { flex: 1, gap: 1 },
  month: { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  date: { fontSize: 11, color: T.mutedFg },
  amount: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
});

// ─── Referral Panel ───────────────────────────────────────────────────────────

const ReferralPanel = ({
  code,
  referredCount,
  savedAmount,
  rewardBalance,
}: {
  code: string;
  referredCount: number;
  savedAmount: number;
  rewardBalance: number;
}) => {
  const handleShare = async () => {
    try {
      await Share.share({ message: `Join YourShikshak with my referral code ${code} and get a discount on your first month! 🎓` });
    } catch { /* silent */ }
  };

  const handleCopy = () => {
    Clipboard.setString(code);
  };

  return (
    <View style={ref.card}>
      <View style={ref.header}>
        <View style={[ref.iconBox, { backgroundColor: `${T.primary}12` }]}>
          <Ionicons name="gift-outline" size={18} color={T.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={ref.title}>Referral & Rewards</Text>
          <Text style={ref.sub}>You've referred {referredCount} {referredCount === 1 ? "family" : "families"} · Saved {fmtAmount(savedAmount)} so far</Text>
        </View>
      </View>

      {rewardBalance > 0 && (
        <View style={ref.balanceRow}>
          <Ionicons name="wallet-outline" size={14} color={T.success} />
          <Text style={ref.balanceTxt}>Reward balance: {fmtAmount(rewardBalance)}</Text>
        </View>
      )}

      <View style={ref.codeRow}>
        <Text style={ref.codeLabel}>Your referral code</Text>
        <View style={ref.codePill}>
          <Text style={ref.codeValue}>{code}</Text>
          <Pressable onPress={handleCopy} hitSlop={8}>
            <Ionicons name="copy-outline" size={14} color={T.primary} />
          </Pressable>
        </View>
      </View>

      <Pressable style={ref.shareBtn} onPress={handleShare}>
        <Ionicons name="share-social-outline" size={16} color="#fff" />
        <Text style={ref.shareBtnTxt}>Share with friends</Text>
      </Pressable>
    </View>
  );
};

const ref = StyleSheet.create({
  card: { backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.border, padding: 16, gap: 12 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  iconBox: { width: 36, height: 36, borderRadius: T.radiusMd, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  sub: { fontSize: 12, color: T.mutedFg, marginTop: 2, lineHeight: 16 },
  balanceRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: `${T.success}10`, padding: 8, borderRadius: T.radiusMd },
  balanceTxt: { fontSize: 12, color: T.success, fontWeight: "700" },
  codeRow: { gap: 6 },
  codeLabel: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  codePill: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: `${T.primary}08`, paddingHorizontal: 14, paddingVertical: 10, borderRadius: T.radiusMd, borderWidth: 1, borderColor: `${T.primary}20` },
  codeValue: { fontSize: 16, fontWeight: "800", color: T.primary, letterSpacing: 2 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: T.primary, padding: 12, borderRadius: T.radiusMd },
  shareBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ParentPaymentsScreen = ({ name }: { userId: string; name: string; role: string }) => {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<ParentPaymentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await getParentPayments();
      setSummary(res.data);
    } catch {
      // Fallback: build minimal summary from dashboard data
      try {
        const dash = await getParentDashboard();
        const cls = dash.data.activeClass;
        setSummary({
          history: [],
          valueSummary: cls ? {
            classesCompleted: cls.completedSessions ?? 0,
            subjectsActive: 1,
            amountSpent: 0,
          } : undefined,
        });
      } catch { /* silent */ }
    }
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

  const vs = summary?.valueSummary;
  const nextPay = summary?.nextPayment;
  const history = summary?.history ?? [];
  const referral = summary?.referral;

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
          <Text style={s.headerTitle}>Payments</Text>
          <Text style={s.headerSub}>Transparent view of your investment</Text>
        </LinearGradient>

        <View style={s.body}>
          {loading ? (
            <View style={{ gap: 12 }}>
              <Skeleton w="100%" h={100} radius={12} />
              <Skeleton w="100%" h={140} radius={12} />
              <Skeleton w="100%" h={200} radius={12} />
            </View>
          ) : (
            <>
              {/* 1. Value Summary — renders FIRST */}
              {vs && (
                <ValueSummaryCard
                  classesCompleted={vs.classesCompleted}
                  subjectsActive={vs.subjectsActive}
                  amountSpent={vs.amountSpent}
                  progressGain={vs.progressGain}
                  progressSubject={vs.progressSubject}
                />
              )}

              {/* 2. Next Payment */}
              {nextPay ? (
                <NextPaymentCard payment={nextPay} />
              ) : (
                <View style={s.noPay}>
                  <Ionicons name="checkmark-circle-outline" size={20} color={T.success} />
                  <Text style={s.noPayTxt}>No payment due right now</Text>
                </View>
              )}

              {/* 3. Payment History */}
              {history.length > 0 && (
                <View style={s.sectionCard}>
                  <Text style={s.sectionTitle}>Payment History</Text>
                  {history.map((p) => <PaymentRow key={p._id} payment={p} />)}
                </View>
              )}

              {/* 4. Referral Panel */}
              {referral && (
                <ReferralPanel
                  code={referral.code}
                  referredCount={referral.referredCount}
                  savedAmount={referral.savedAmount}
                  rewardBalance={referral.rewardBalance}
                />
              )}

              {/* Empty state */}
              {!vs && !nextPay && history.length === 0 && (
                <View style={s.emptyState}>
                  <Ionicons name="wallet-outline" size={36} color={T.mutedFg} />
                  <Text style={s.emptyTitle}>No payment data yet</Text>
                  <Text style={s.emptySub}>Payment details will appear here once your class is active.</Text>
                </View>
              )}
            </>
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
  headerSub: { fontSize: 13, color: "rgba(255,255,255,0.6)" },
  body: { padding: 16, gap: 12 },
  sectionCard: { backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: T.border, padding: 16 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  noPay: { flexDirection: "row", alignItems: "center", gap: 8, padding: 16, backgroundColor: `${T.success}08`, borderRadius: T.radiusLg, borderWidth: 1, borderColor: `${T.success}20` },
  noPayTxt: { fontSize: 13, color: T.success, fontWeight: "600" },
  emptyState: { alignItems: "center", gap: 8, paddingVertical: 48 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: T.textPrimary },
  emptySub: { fontSize: 13, color: T.mutedFg, textAlign: "center", maxWidth: 260, lineHeight: 19 },
});

export default ParentPaymentsScreen;
