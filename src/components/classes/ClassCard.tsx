import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { FinalClass } from "../../api/client";
import { T } from "../../constants/colors";

interface Props {
  cls: FinalClass;
  selectedCycle: number;
  maxCycle: number;
  onCycleChange: (delta: number) => void;
  onViewAttendance: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: T.success,
  COMPLETED: T.primary,
  PAUSED: "#F59E0B",
  CANCELLED: T.error,
};

const STATUS_BG: Record<string, string> = {
  ACTIVE: "#ECFDF5",
  COMPLETED: "#EFF6FF",
  PAUSED: "#FFFBEB",
  CANCELLED: "#FEF2F2",
};

const MODE_COLOR: Record<string, string> = {
  ONLINE: T.primary,
  OFFLINE: T.secondary,
  HYBRID: "#7C3AED",
};

const MODE_ICON: Record<string, any> = {
  ONLINE: "videocam",
  OFFLINE: "home",
  HYBRID: "git-merge",
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const subjectLabel = (subjects: FinalClass["subject"]) => {
  if (!subjects?.length) return [];
  return (Array.isArray(subjects) ? subjects : [subjects])
    .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
    .filter(Boolean);
};

const AVATAR_COLORS = [
  ["#667EEA", "#764BA2"],
  ["#F093FB", "#F5576C"],
  ["#4FACFE", "#00F2FE"],
  ["#43E97B", "#38F9D7"],
  ["#FA709A", "#FEE140"],
  ["#A18CD1", "#FBC2EB"],
];

const getAvatarGradient = (name: string): [string, string] => {
  if (!name) return AVATAR_COLORS[0] as [string, string];
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] as [string, string];
};

const ClassCard: React.FC<Props> = ({
  cls,
  selectedCycle,
  maxCycle,
  onCycleChange,
  onViewAttendance,
}) => {
  const statusColor = STATUS_COLOR[cls.status] ?? T.mutedFg;
  const statusBg = STATUS_BG[cls.status] ?? T.muted;
  const modeColor = MODE_COLOR[cls.mode] ?? T.primary;
  const modeIcon = MODE_ICON[cls.mode] ?? "school";
  const subjects = subjectLabel(cls.subject);
  const avatarGrad = getAvatarGradient(cls.studentName || "");

  const totalSessions = Number(
    cls.classLead?.classesPerMonth ?? cls.totalSessions ?? 0,
  );
  const completed = Number(cls.completedSessions ?? 0);
  const progress =
    totalSessions > 0 ? Math.min((completed / totalSessions) * 100, 100) : 0;
  const progressColor =
    progress >= 75 ? T.success : progress >= 40 ? T.primary : "#F59E0B";

  return (
    <View style={s.card}>
      {/* Accent bar */}
      <View style={[s.accentBar, { backgroundColor: statusColor }]} />

      <View style={s.inner}>
        {/* ── Top row ─────────────────────────────────────────────────────── */}
        <View style={s.topRow}>
          {/* Avatar */}
          <LinearGradient
            colors={avatarGrad}
            style={s.avatar}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Text style={s.avatarTxt}>{getInitials(cls.studentName || "")}</Text>
          </LinearGradient>

          {/* Name + grade */}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={s.studentName} numberOfLines={1}>
              {cls.studentName || "Unknown Student"}
            </Text>
            {(cls.grade || cls.board) ? (
              <Text style={s.gradeBoard}>
                {[cls.grade && `Grade ${cls.grade}`, cls.board]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            ) : null}
          </View>

          {/* Status pill */}
          <View style={[s.statusPill, { backgroundColor: statusBg }]}>
            <View style={[s.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[s.statusTxt, { color: statusColor }]}>
              {cls.status}
            </Text>
          </View>
        </View>

        {/* ── Chips ─────────────────────────────────────────────────────────── */}
        <View style={s.chipsRow}>
          <View
            style={[
              s.chip,
              { backgroundColor: `${modeColor}12`, borderColor: `${modeColor}30` },
            ]}
          >
            <Ionicons name={modeIcon} size={11} color={modeColor} />
            <Text style={[s.chipTxt, { color: modeColor }]}>{cls.mode}</Text>
          </View>
          {subjects.slice(0, 3).map((sub, i) => (
            <View
              key={i}
              style={[
                s.chip,
                {
                  backgroundColor: `${T.primary}0A`,
                  borderColor: `${T.primary}20`,
                },
              ]}
            >
              <Text style={[s.chipTxt, { color: T.primary }]}>{sub}</Text>
            </View>
          ))}
        </View>

        {/* ── Progress ─────────────────────────────────────────────────────── */}
        <View style={s.progressSection}>
          <View style={s.progressHeader}>
            <Text style={s.progressLbl}>
              Session Progress
            </Text>
            <View style={s.progressRightGroup}>
              <Text style={s.progressCount}>
                {completed}/{totalSessions || "?"}
              </Text>
              <Text style={[s.progressPct, { color: progressColor }]}>
                {Math.round(progress)}%
              </Text>
            </View>
          </View>
          <View style={s.progressTrack}>
            <View
              style={[
                s.progressFill,
                { width: `${progress}%` as any, backgroundColor: progressColor },
              ]}
            />
          </View>
        </View>

        {/* ── Meta ─────────────────────────────────────────────────────────── */}
        {(cls.schedule?.timeSlot || cls.coordinator?.name) ? (
          <View style={s.metaRow}>
            {cls.schedule?.timeSlot ? (
              <View style={s.metaItem}>
                <View style={s.metaIconBg}>
                  <Ionicons name="time-outline" size={11} color={T.primary} />
                </View>
                <Text style={s.metaTxt}>{cls.schedule.timeSlot}</Text>
              </View>
            ) : null}
            {cls.coordinator?.name ? (
              <View style={s.metaItem}>
                <View style={s.metaIconBg}>
                  <Ionicons
                    name="person-circle-outline"
                    size={11}
                    color={T.primary}
                  />
                </View>
                <Text style={s.metaTxt}>{cls.coordinator.name}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <View style={s.footerDivider} />
        <View style={s.footer}>
          {/* Cycle picker */}
          <View style={s.cyclePicker}>
            <Pressable
              onPress={() => onCycleChange(-1)}
              disabled={selectedCycle <= 1}
              style={[s.cycleBtn, selectedCycle <= 1 && { opacity: 0.35 }]}
              hitSlop={10}
            >
              <Ionicons name="chevron-back" size={15} color={T.primary} />
            </Pressable>
            <Text style={s.cycleTxt}>Cycle {selectedCycle}</Text>
            <Pressable
              onPress={() => onCycleChange(1)}
              disabled={selectedCycle >= maxCycle}
              style={[s.cycleBtn, selectedCycle >= maxCycle && { opacity: 0.35 }]}
              hitSlop={10}
            >
              <Ionicons name="chevron-forward" size={15} color={T.primary} />
            </Pressable>
          </View>

          {/* View attendance */}
          <Pressable
            onPress={onViewAttendance}
            style={({ pressed }) => [s.attendBtn, pressed && { opacity: 0.82 }]}
          >
            <LinearGradient
              colors={[T.primary, `${T.primary}CC`]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.attendBtnGrad}
            >
              <Ionicons name="clipboard-outline" size={14} color="#fff" />
              <Text style={s.attendBtnTxt}>Attendance</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: "#1A2540",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    overflow: "hidden",
  },
  accentBar: { width: 4, borderTopLeftRadius: 16, borderBottomLeftRadius: 16 },
  inner: { flex: 1, padding: 16, paddingLeft: 14 },

  topRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  gradeBoard: { fontSize: 11, color: "#64748B", marginTop: 2, fontWeight: "500" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 100,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.2 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  chipTxt: { fontSize: 10, fontWeight: "700" },

  progressSection: { marginBottom: 12 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 7,
  },
  progressLbl: { fontSize: 11, color: "#64748B", fontWeight: "600" },
  progressRightGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  progressCount: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  progressPct: { fontSize: 12, fontWeight: "800" },
  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 4 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  metaIconBg: {
    width: 20,
    height: 20,
    borderRadius: 6,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  metaTxt: { fontSize: 11, color: "#475569", fontWeight: "500" },

  footerDivider: { height: 1, backgroundColor: "#F1F5F9", marginBottom: 12 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  cyclePicker: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: `${T.primary}08`,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: `${T.primary}18`,
  },
  cycleBtn: { padding: 3 },
  cycleTxt: {
    fontSize: 12,
    fontWeight: "700",
    color: T.primary,
    minWidth: 60,
    textAlign: "center",
  },

  attendBtn: { borderRadius: 10, overflow: "hidden" },
  attendBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  attendBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default ClassCard;
