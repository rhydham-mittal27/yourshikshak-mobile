import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getParentDashboard, getParentProgress, ParentActiveClass } from "../../api/client";
import { T } from "../../constants/colors";

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtDay = (day: string) => {
  const m: Record<string, string> = {
    Mon: "Mon", Tue: "Tue", Wed: "Wed", Thu: "Thu",
    Fri: "Fri", Sat: "Sat", Sun: "Sun",
    Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed", Thursday: "Thu",
    Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
  };
  return m[day] ?? day;
};

// â”€â”€â”€ Info Row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const InfoRow = ({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: any;
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={ir.row}>
    <View style={ir.iconBox}>
      <Ionicons name={icon} size={15} color={T.primary} />
    </View>
    <Text style={ir.label}>{label}</Text>
    <Text style={[ir.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: `${T.primary}10`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  label: { fontSize: 13, color: T.mutedFg, flex: 1 },
  value: { fontSize: 13, fontWeight: "700", color: T.textPrimary, textAlign: "right", flexShrink: 0 },
});

// â”€â”€â”€ Stat Chip â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const StatChip = ({
  icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: string | number;
  label: string;
  color: string;
}) => (
  <View style={[ch.chip, { borderColor: `${color}22`, backgroundColor: `${color}08` }]}>
    <View style={[ch.iconBox, { backgroundColor: `${color}18` }]}>
      <Ionicons name={icon} size={16} color={color} />
    </View>
    <Text style={[ch.value, { color }]}>{value}</Text>
    <Text style={ch.label}>{label}</Text>
  </View>
);

const ch = StyleSheet.create({
  chip: {
    flex: 1,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 22, fontWeight: "800", letterSpacing: -0.5 },
  label: { fontSize: 10, color: T.mutedFg, fontWeight: "600", textAlign: "center" },
});

// â”€â”€â”€ Section Label â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionLabel = ({ children }: { children: string }) => (
  <Text style={sl.txt}>{children}</Text>
);
const sl = StyleSheet.create({
  txt: {
    fontSize: 10,
    fontWeight: "800",
    color: T.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 24,
    marginBottom: 10,
  },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  navigation?: any;
}

const ChildProfileScreen = ({ navigation }: Props) => {
  const insets = useSafeAreaInsets();
  const [cls, setCls] = useState<ParentActiveClass | null>(null);
  const [overallTrend, setOverallTrend] = useState<string | null>(null);
  const [attendanceRate, setAttendanceRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [dashRes, progRes] = await Promise.allSettled([
        getParentDashboard(),
        getParentProgress(),
      ]);
      if (dashRes.status === "fulfilled") {
        setCls(dashRes.value.data.activeClass ?? null);
      }
      if (progRes.status === "fulfilled") {
        setOverallTrend(progRes.value.data.overallTrend ?? null);
        setAttendanceRate(progRes.value.data.attendanceRate ?? null);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const initials = cls?.studentName
    ? cls.studentName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  const attendanceColor =
    attendanceRate == null ? T.mutedFg :
    attendanceRate >= 80 ? T.success :
    attendanceRate >= 60 ? T.warning : T.error;

  const trendLabel =
    overallTrend === "IMPROVING" ? "Improving ðŸ“ˆ" :
    overallTrend === "NEEDS_ATTENTION" ? "Needs Attention ðŸŽ¯" :
    overallTrend === "STEADY" ? "Steady ðŸ“Š" : "â€”";

  const trendColor =
    overallTrend === "IMPROVING" ? T.success :
    overallTrend === "NEEDS_ATTENTION" ? T.error : T.warning;

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 20 }]}
      >
        {/* Back */}
        {navigation && (
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [s.backBtn, pressed && { opacity: 0.6 }]}
            hitSlop={12}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
        )}

        {/* Avatar + name */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}>
            <Text style={s.avatarTxt}>{initials}</Text>
          </View>
          {cls && (
            <View style={s.activeDot} />
          )}
        </View>
        <Text style={s.studentName}>
          {cls?.studentName ?? "Child Profile"}
        </Text>
        {cls?.grade && (
          <Text style={s.gradeLabel}>
            Grade {cls.grade}{cls.board ? ` Â· ${cls.board}` : ""}
          </Text>
        )}
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.loadingWrap}>
            <ActivityIndicator color={T.primary} />
          </View>
        ) : !cls ? (
          <View style={s.emptyWrap}>
            <View style={s.emptyIcon}>
              <Ionicons name="person-outline" size={32} color={T.textDisabled} />
            </View>
            <Text style={s.emptyTitle}>No active class</Text>
            <Text style={s.emptySub}>
              Your child's profile will appear here once a tutor is assigned.
            </Text>
          </View>
        ) : (
          <>
            {/* â”€â”€ Stats row â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionLabel>Overview</SectionLabel>
            <View style={s.statsRow}>
              <StatChip
                icon="checkmark-circle-outline"
                value={attendanceRate != null ? `${Math.round(attendanceRate)}%` : "â€”"}
                label="Attendance"
                color={attendanceColor}
              />
              <StatChip
                icon="book-outline"
                value={cls.completedSessions ?? 0}
                label="Sessions Done"
                color={T.primary}
              />
              <StatChip
                icon="trending-up-outline"
                value={overallTrend === "IMPROVING" ? "ðŸ“ˆ" : overallTrend === "NEEDS_ATTENTION" ? "ðŸŽ¯" : "ðŸ“Š"}
                label="Trend"
                color={trendColor}
              />
            </View>

            {/* â”€â”€ Class info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            <SectionLabel>Class Details</SectionLabel>
            <View style={s.card}>
              <InfoRow icon="person-outline" label="Student" value={cls.studentName} />
              <InfoRow icon="school-outline" label="Subject" value={cls.subject} />
              {cls.grade && (
                <InfoRow icon="library-outline" label="Grade" value={`Grade ${cls.grade}`} />
              )}
              {cls.board && (
                <InfoRow icon="documents-outline" label="Board" value={cls.board} />
              )}
              <InfoRow
                icon="laptop-outline"
                label="Mode"
                value={cls.mode === "ONLINE" ? "Online" : cls.mode === "OFFLINE" ? "In-person" : cls.mode}
              />
              <InfoRow
                icon="pulse-outline"
                label="Trend"
                value={trendLabel}
                valueColor={trendColor}
              />
            </View>

            {/* â”€â”€ Schedule â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {cls.schedule && (
              <>
                <SectionLabel>Weekly Schedule</SectionLabel>
                <View style={s.card}>
                  {cls.schedule.daysOfWeek && cls.schedule.daysOfWeek.length > 0 && (
                    <View style={s.daysRow}>
                      {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
                        const active = cls.schedule!.daysOfWeek!.some(
                          (day) => fmtDay(day) === d
                        );
                        return (
                          <View
                            key={d}
                            style={[s.dayPill, active && s.dayPillActive]}
                          >
                            <Text style={[s.dayTxt, active && s.dayTxtActive]}>
                              {d}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                  {cls.schedule.timeSlot && (
                    <View style={[ir.row, { borderBottomWidth: 0, marginTop: 10 }]}>
                      <View style={ir.iconBox}>
                        <Ionicons name="time-outline" size={15} color={T.primary} />
                      </View>
                      <Text style={ir.label}>Time</Text>
                      <Text style={ir.value}>{cls.schedule.timeSlot}</Text>
                    </View>
                  )}
                </View>
              </>
            )}

            {/* â”€â”€ Tutor â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
            {cls.tutor && (
              <>
                <SectionLabel>Assigned Tutor</SectionLabel>
                <View style={s.tutorCard}>
                  <View style={s.tutorAvatar}>
                    <Text style={s.tutorAvatarTxt}>
                      {cls.tutor.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tutorName}>{cls.tutor.name}</Text>
                    {cls.tutor.rating != null && (
                      <View style={s.ratingRow}>
                        <Ionicons name="star" size={12} color={T.warning} />
                        <Text style={s.ratingTxt}>{cls.tutor.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  {navigation && (
                    <Pressable
                      style={({ pressed }) => [s.viewProfileBtn, pressed && { opacity: 0.7 }]}
                      onPress={() => navigation.navigate("TutorProfile", { viewerRole: "PARENT" })}
                    >
                      <Text style={s.viewProfileTxt}>View Profile</Text>
                      <Ionicons name="chevron-forward" size={13} color={T.primary} />
                    </Pressable>
                  )}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    alignItems: "center",
  },
  backBtn: {
    alignSelf: "flex-start",
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.13)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  avatarWrap: { position: "relative", marginBottom: 14 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${T.primary}30`,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 30, fontWeight: "800", color: "#fff" },
  activeDot: {
    position: "absolute",
    bottom: 3,
    right: 3,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.success,
    borderWidth: 2,
    borderColor: T.darkBgMid,
  },
  studentName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  gradeLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
    textAlign: "center",
  },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 48 },

  loadingWrap: { alignItems: "center", paddingVertical: 48 },
  emptyWrap: { alignItems: "center", paddingVertical: 56, gap: 12, paddingHorizontal: 24 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  emptySub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20 },

  statsRow: { flexDirection: "row", gap: 8 },

  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: 16,
    overflow: "hidden",
  },

  daysRow: { flexDirection: "row", gap: 6, paddingTop: 14, flexWrap: "wrap" },
  dayPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  dayPillActive: { backgroundColor: T.primary, borderColor: T.primary },
  dayTxt: { fontSize: 11, fontWeight: "700", color: T.mutedFg },
  dayTxtActive: { color: "#fff" },

  tutorCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  tutorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: `${T.primary}18`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tutorAvatarTxt: { fontSize: 18, fontWeight: "800", color: T.primary },
  tutorName: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 3, marginTop: 3 },
  ratingTxt: { fontSize: 12, fontWeight: "600", color: T.warning },
  viewProfileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: `${T.primary}10`,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: T.radiusFull,
  },
  viewProfileTxt: { fontSize: 12, fontWeight: "700", color: T.primary },
});

export default ChildProfileScreen;

