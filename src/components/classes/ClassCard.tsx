import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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

const MODE_COLOR: Record<string, string> = {
  ONLINE: T.primary,
  OFFLINE: T.secondary,
  HYBRID: "#7C3AED",
};

const MODE_ICON: Record<string, any> = {
  ONLINE: "videocam-outline",
  OFFLINE: "home-outline",
  HYBRID: "git-merge-outline",
};

const subjectLabel = (subjects: FinalClass["subject"]) => {
  if (!subjects?.length) return "—";
  return (Array.isArray(subjects) ? subjects : [subjects])
    .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
    .filter(Boolean)
    .join(", ");
};

const ClassCard: React.FC<Props> = ({
  cls,
  selectedCycle,
  maxCycle,
  onCycleChange,
  onViewAttendance,
}) => {
  const statusColor = STATUS_COLOR[cls.status] ?? T.mutedFg;
  const modeColor = MODE_COLOR[cls.mode] ?? T.primary;
  const modeIcon = MODE_ICON[cls.mode] ?? "school-outline";

  const totalSessions =
    Number(cls.classLead?.classesPerMonth ?? cls.totalSessions ?? 0);
  const completed = Number(cls.completedSessions ?? 0);
  const progress = totalSessions > 0 ? Math.min((completed / totalSessions) * 100, 100) : 0;
  const progressColor = progress >= 75 ? T.success : progress >= 40 ? T.primary : "#F59E0B";

  return (
    <View style={s.card}>
      {/* Top row: student + status */}
      <View style={s.topRow}>
        <View style={s.avatar}>
          <Ionicons name="person" size={18} color={T.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.studentName}>{cls.studentName}</Text>
          {(cls.grade || cls.board) ? (
            <Text style={s.gradeBoard}>
              {[cls.grade && `Grade ${cls.grade}`, cls.board].filter(Boolean).join(" · ")}
            </Text>
          ) : null}
        </View>
        <View style={[s.statusPill, { backgroundColor: `${statusColor}15`, borderColor: `${statusColor}30` }]}>
          <View style={[s.statusDot, { backgroundColor: statusColor }]} />
          <Text style={[s.statusTxt, { color: statusColor }]}>{cls.status}</Text>
        </View>
      </View>

      {/* Chips row */}
      <View style={s.chipsRow}>
        <View style={[s.chip, { backgroundColor: `${modeColor}12`, borderColor: `${modeColor}25` }]}>
          <Ionicons name={modeIcon} size={10} color={modeColor} />
          <Text style={[s.chipTxt, { color: modeColor }]}>{cls.mode}</Text>
        </View>
        {subjectLabel(cls.subject).split(", ").slice(0, 2).map((sub, i) => (
          <View key={i} style={[s.chip, { backgroundColor: `${T.primary}08`, borderColor: `${T.primary}18` }]}>
            <Text style={[s.chipTxt, { color: T.primary }]}>{sub}</Text>
          </View>
        ))}
      </View>

      {/* Progress */}
      <View style={s.progressSection}>
        <View style={s.progressHeader}>
          <Text style={s.progressLbl}>Progress  {completed}/{totalSessions || "?"} sessions</Text>
          <Text style={[s.progressPct, { color: progressColor }]}>{Math.round(progress)}%</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressBar, { width: `${progress}%` as any, backgroundColor: progressColor }]} />
        </View>
      </View>

      {/* Meta info */}
      <View style={s.metaRow}>
        {cls.schedule?.timeSlot ? (
          <View style={s.metaItem}>
            <Ionicons name="time-outline" size={12} color={T.mutedFg} />
            <Text style={s.metaTxt}>{cls.schedule.timeSlot}</Text>
          </View>
        ) : null}
        {cls.coordinator?.name ? (
          <View style={s.metaItem}>
            <Ionicons name="person-circle-outline" size={12} color={T.mutedFg} />
            <Text style={s.metaTxt}>{cls.coordinator.name}</Text>
          </View>
        ) : null}
        {cls.coordinator?.phone ? (
          <View style={s.metaItem}>
            <Ionicons name="call-outline" size={12} color={T.mutedFg} />
            <Text style={s.metaTxt}>{cls.coordinator.phone}</Text>
          </View>
        ) : null}
      </View>

      {/* Divider */}
      <View style={s.divider} />

      {/* Attendance controls */}
      <View style={s.footer}>
        {/* Cycle picker */}
        <View style={s.cyclePicker}>
          <Pressable
            onPress={() => onCycleChange(-1)}
            disabled={selectedCycle <= 1}
            style={[s.cycleArrow, selectedCycle <= 1 && { opacity: 0.3 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-back" size={14} color={T.primary} />
          </Pressable>
          <Text style={s.cycleTxt}>Cycle {selectedCycle}</Text>
          <Pressable
            onPress={() => onCycleChange(1)}
            disabled={selectedCycle >= maxCycle}
            style={[s.cycleArrow, selectedCycle >= maxCycle && { opacity: 0.3 }]}
            hitSlop={8}
          >
            <Ionicons name="chevron-forward" size={14} color={T.primary} />
          </Pressable>
        </View>

        {/* View attendance button */}
        <Pressable
          onPress={onViewAttendance}
          style={({ pressed }) => [s.attendanceBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="clipboard-outline" size={14} color="#fff" />
          <Text style={s.attendanceBtnTxt}>View Attendance</Text>
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  avatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: `${T.primary}12`,
    alignItems: "center", justifyContent: "center",
  },
  studentName: { fontSize: 14, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  gradeBoard: { fontSize: 11, color: T.mutedFg, marginTop: 1 },
  statusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: T.radiusFull, borderWidth: 1,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusTxt: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },

  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 14 },
  chip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: T.radiusFull, borderWidth: 1,
  },
  chipTxt: { fontSize: 10, fontWeight: "700" },

  progressSection: { marginBottom: 12 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 5 },
  progressLbl: { fontSize: 11, color: T.textSecondary, fontWeight: "500" },
  progressPct: { fontSize: 11, fontWeight: "800" },
  progressBg: {
    height: 5, borderRadius: 3,
    backgroundColor: T.muted, overflow: "hidden",
  },
  progressBar: { height: "100%", borderRadius: 3 },

  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 12 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaTxt: { fontSize: 11, color: T.textSecondary },

  divider: { height: 1, backgroundColor: T.border, marginBottom: 12 },

  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cyclePicker: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: `${T.primary}08`,
    borderRadius: T.radiusMd, paddingHorizontal: 10, paddingVertical: 7,
    borderWidth: 1, borderColor: `${T.primary}18`,
  },
  cycleArrow: { padding: 2 },
  cycleTxt: { fontSize: 12, fontWeight: "700", color: T.primary, minWidth: 56, textAlign: "center" },
  attendanceBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 14, paddingVertical: 9,
  },
  attendanceBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default ClassCard;
