import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  TouchableOpacity,
  Switch,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "PauseClass">;
type Route = RouteProp<RootStackParamList, "PauseClass">;

const PAUSE_REASONS = [
  { id: "vacation", label: "Vacation / Travel", icon: "airplane-outline" },
  { id: "exams", label: "Exams / School Event", icon: "document-text-outline" },
  { id: "health", label: "Health / Illness", icon: "medkit-outline" },
  { id: "financial", label: "Financial Reason", icon: "wallet-outline" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal-outline" },
];

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// ─── Mini Calendar ─────────────────────────────────────────────────────────────

const MiniCalendar = ({
  label,
  selected,
  minDate,
  onSelect,
}: {
  label: string;
  selected: Date | null;
  minDate?: Date;
  onSelect: (d: Date) => void;
}) => {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <View style={pc.calOuter}>
      <Text style={pc.calLabel}>{label}</Text>
      <View style={pc.calWrap}>
        <View style={pc.calHeader}>
          <TouchableOpacity
            onPress={() => setViewMonth(new Date(year, month - 1, 1))}
            style={pc.calNav}
          >
            <Ionicons name="chevron-back" size={15} color={T.textPrimary} />
          </TouchableOpacity>
          <Text style={pc.calTitle}>
            {MONTH_NAMES[month]} {year}
          </Text>
          <TouchableOpacity
            onPress={() => setViewMonth(new Date(year, month + 1, 1))}
            style={pc.calNav}
          >
            <Ionicons name="chevron-forward" size={15} color={T.textPrimary} />
          </TouchableOpacity>
        </View>
        <View style={pc.calDayRow}>
          {DAYS_SHORT.map((d) => (
            <Text key={d} style={pc.calDayLabel}>
              {d}
            </Text>
          ))}
        </View>
        <View style={pc.calGrid}>
          {cells.map((day, idx) => {
            if (!day) return <View key={`e${idx}`} style={pc.calCell} />;
            const date = new Date(year, month, day);
            date.setHours(0, 0, 0, 0);
            const isPast = minDate ? date < minDate : date < today;
            const isSel =
              selected &&
              selected.getFullYear() === year &&
              selected.getMonth() === month &&
              selected.getDate() === day;
            return (
              <TouchableOpacity
                key={day}
                style={pc.calCell}
                onPress={() => !isPast && onSelect(date)}
                disabled={isPast}
              >
                <View
                  style={[
                    pc.calDayWrap,
                    isSel && { backgroundColor: T.primary },
                  ]}
                >
                  <Text
                    style={[
                      pc.calDayNum,
                      isPast && { color: T.textDisabled },
                      isSel && { color: "#fff" },
                    ]}
                  >
                    {day}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      {selected && (
        <View style={pc.selPill}>
          <Ionicons name="calendar" size={12} color={T.primary} />
          <Text style={pc.selPillTxt}>
            {selected.toLocaleDateString("en-IN", {
              weekday: "short",
              day: "numeric",
              month: "short",
            })}
          </Text>
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const PauseClassScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { classId, subject = "Class" } = route.params ?? {};

  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [untilFurtherNotice, setUntilFurtherNotice] = useState(false);
  const [reason, setReason] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, []);

  const canSubmit = startDate && (untilFurtherNotice || endDate) && reason;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    Animated.timing(successAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  };

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });

  return (
    <View style={pc.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={["#451a03", "#78350f"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[pc.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={pc.orbA} pointerEvents="none" />
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={pc.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={pc.backBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>
          </View>
          <View style={pc.heroIcon}>
            <Ionicons name="pause-circle" size={28} color={T.warning} />
          </View>
          <Text style={pc.heroTitle}>Pause Class</Text>
          <Text style={pc.heroSub}>{subject}</Text>
        </Animated.View>
      </LinearGradient>

      {submitted ? (
        <Animated.View
          style={[
            pc.successWrap,
            {
              opacity: successAnim,
              transform: [
                {
                  scale: successAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.95, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <Ionicons name="pause-circle" size={56} color={T.warning} />
          <Text style={pc.successTitle}>Pause Requested</Text>
          <Text style={pc.successSub}>
            Your class has been paused{"\n"}from{" "}
            <Text style={{ fontWeight: "800" }}>{fmt(startDate!)}</Text>
            {untilFurtherNotice
              ? " until further notice"
              : ` to ${fmt(endDate!)}`}
            .
          </Text>
          <View style={pc.noteCard}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={T.info}
            />
            <Text style={pc.noteTxt}>
              Billing is adjusted for the pause period. You'll receive a
              confirmation from our team.
            </Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={pc.doneBtn}>
            <Text style={pc.doneBtnTxt}>Done</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            pc.content,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Billing note */}
          <View style={pc.billingNote}>
            <Ionicons
              name="information-circle-outline"
              size={15}
              color={T.info}
            />
            <Text style={pc.billingTxt}>
              Classes during the pause period will not be billed. Billing
              resumes automatically when classes resume.
            </Text>
          </View>

          {/* Reason */}
          <View style={pc.section}>
            <Text style={pc.sectionHead}>Reason for Pause</Text>
            <View style={pc.reasonGrid}>
              {PAUSE_REASONS.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    pc.reasonCard,
                    reason === r.id && pc.reasonCardActive,
                  ]}
                  onPress={() => setReason(r.id)}
                >
                  <View
                    style={[
                      pc.reasonIcon,
                      reason === r.id && { backgroundColor: `${T.warning}20` },
                    ]}
                  >
                    <Ionicons
                      name={r.icon as any}
                      size={18}
                      color={reason === r.id ? T.warning : T.textSecondary}
                    />
                  </View>
                  <Text
                    style={[
                      pc.reasonLabel,
                      reason === r.id && {
                        color: T.warning,
                        fontWeight: "700",
                      },
                    ]}
                  >
                    {r.label}
                  </Text>
                  {reason === r.id && (
                    <View style={pc.reasonCheck}>
                      <Ionicons name="checkmark" size={10} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Start date */}
          <MiniCalendar
            label="Pause Start Date"
            selected={startDate}
            onSelect={setStartDate}
          />

          {/* Until further notice toggle */}
          <View style={pc.section}>
            <View style={pc.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={pc.toggleLabel}>Until Further Notice</Text>
                <Text style={pc.toggleSub}>
                  Resume only when you request it
                </Text>
              </View>
              <Switch
                value={untilFurtherNotice}
                onValueChange={setUntilFurtherNotice}
                trackColor={{ false: T.border, true: `${T.warning}60` }}
                thumbColor={untilFurtherNotice ? T.warning : "#fff"}
              />
            </View>
          </View>

          {/* End date (if not until-further-notice) */}
          {!untilFurtherNotice && (
            <MiniCalendar
              label="Pause End Date"
              selected={endDate}
              minDate={startDate ?? undefined}
              onSelect={setEndDate}
            />
          )}

          {/* Summary */}
          {startDate && (untilFurtherNotice || endDate) && reason && (
            <View style={pc.summaryCard}>
              <Text style={pc.summaryHead}>Summary</Text>
              <View style={pc.summaryRow}>
                <Ionicons
                  name="pause-circle-outline"
                  size={14}
                  color={T.warning}
                />
                <Text style={pc.summaryTxt}>
                  Pause from{" "}
                  <Text style={{ fontWeight: "800" }}>{fmt(startDate)}</Text>
                  {untilFurtherNotice
                    ? " until you resume"
                    : ` to ${fmt(endDate!)}`}
                </Text>
              </View>
              <View style={pc.summaryRow}>
                <Ionicons
                  name="information-circle-outline"
                  size={14}
                  color={T.warning}
                />
                <Text style={pc.summaryTxt}>
                  Reason:{" "}
                  <Text style={{ fontWeight: "800" }}>
                    {PAUSE_REASONS.find((r) => r.id === reason)?.label}
                  </Text>
                </Text>
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {!submitted && (
        <View style={[pc.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [
              pc.submitBtn,
              !canSubmit && pc.submitBtnDisabled,
              pressed && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={
                canSubmit
                  ? [T.warning, "#d97706"]
                  : [T.textDisabled, T.textDisabled]
              }
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={pc.submitGrad}
            >
              <Ionicons name="pause-circle-outline" size={16} color="#fff" />
              <Text style={pc.submitTxt}>Confirm Pause</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const pc = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  hero: { paddingHorizontal: T.base, paddingBottom: T.lg, overflow: "hidden" },
  orbA: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: "rgba(251,191,36,0.08)",
    top: -50,
    right: -40,
  } as any,
  heroTop: { flexDirection: "row", marginBottom: T.sm },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroIcon: { marginBottom: 8 },
  heroTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 3,
    fontWeight: "600",
  },

  content: { padding: T.base, gap: 14 },

  billingNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${T.info}08`,
    borderRadius: T.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: `${T.info}18`,
  },
  billingTxt: {
    flex: 1,
    fontSize: 12,
    color: T.info,
    fontWeight: "600",
    lineHeight: 18,
  },

  section: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    padding: T.base,
    borderWidth: 1,
    borderColor: T.border,
  },
  sectionHead: {
    fontSize: 13,
    fontWeight: "800",
    color: T.textDisabled,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: T.sm,
  },

  reasonGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  reasonCard: {
    width: "47%",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    position: "relative",
  },
  reasonCardActive: {
    backgroundColor: `${T.warning}08`,
    borderColor: T.warning,
  },
  reasonIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  reasonLabel: {
    flex: 1,
    fontSize: 11,
    color: T.textSecondary,
    fontWeight: "600",
    lineHeight: 15,
  },
  reasonCheck: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.warning,
    alignItems: "center",
    justifyContent: "center",
  } as any,

  calOuter: { gap: 8 },
  calLabel: {
    fontSize: 13,
    fontWeight: "800",
    color: T.textDisabled,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    paddingHorizontal: 2,
  },
  calWrap: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    padding: T.base,
    borderWidth: 1,
    borderColor: T.border,
    gap: 8,
  },
  calHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  calNav: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: T.muted,
  },
  calTitle: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  calDayRow: { flexDirection: "row" },
  calDayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "700",
    color: T.textDisabled,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  calCell: { width: "14.28%", alignItems: "center", paddingVertical: 2 },
  calDayWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  calDayNum: { fontSize: 12, fontWeight: "600", color: T.textPrimary },
  selPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: `${T.primary}10`,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  selPillTxt: { fontSize: 11, color: T.primary, fontWeight: "700" },

  toggleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleLabel: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  toggleSub: { fontSize: 11, color: T.textSecondary, marginTop: 2 },

  summaryCard: {
    backgroundColor: `${T.warning}08`,
    borderRadius: T.radiusXl,
    padding: T.base,
    borderWidth: 1,
    borderColor: `${T.warning}25`,
    gap: 8,
  },
  summaryHead: {
    fontSize: 12,
    fontWeight: "800",
    color: T.warning,
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  summaryRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  summaryTxt: {
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: "500",
    flex: 1,
    lineHeight: 19,
  },

  footer: {
    backgroundColor: T.paper,
    paddingHorizontal: T.base,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: T.border,
  },
  submitBtn: { borderRadius: T.radiusLg, overflow: "hidden" },
  submitBtnDisabled: { opacity: 0.5 },
  submitGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
  },
  submitTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },

  successWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: T.xl,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 8,
    marginTop: 12,
    letterSpacing: -0.4,
  },
  successSub: {
    fontSize: 14,
    color: T.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: T.lg,
  },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    backgroundColor: `${T.info}08`,
    borderRadius: T.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: `${T.info}18`,
    marginBottom: T.xl,
  },
  noteTxt: {
    flex: 1,
    fontSize: 12,
    color: T.info,
    fontWeight: "600",
    lineHeight: 18,
  },
  doneBtn: {
    backgroundColor: T.warning,
    borderRadius: T.radiusFull,
    paddingHorizontal: 36,
    paddingVertical: 13,
  },
  doneBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default PauseClassScreen;
