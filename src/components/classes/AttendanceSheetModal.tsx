import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  getClassAttendance,
  ClassAttendanceRecord,
  FinalClass,
} from "../../api/client";
import { T } from "../../constants/colors";

interface Props {
  visible: boolean;
  cls: FinalClass | null;
  cycle: number;
  onClose: () => void;
}

const STATUS_META: Record<
  string,
  { color: string; bg: string; icon: any; label: string }
> = {
  PRESENT: {
    color: T.success,
    bg: "#ECFDF5",
    icon: "checkmark-circle",
    label: "Present",
  },
  ABSENT: {
    color: T.error,
    bg: "#FEF2F2",
    icon: "close-circle",
    label: "Absent",
  },
  HOLIDAY: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    icon: "sunny",
    label: "Holiday",
  },
  CANCELLED: {
    color: "#94A3B8",
    bg: "#F8FAFC",
    icon: "ban",
    label: "Cancelled",
  },
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const dayName = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });

const subjectLabel = (cls: FinalClass) => {
  if (!cls.subject?.length) return "—";
  return (Array.isArray(cls.subject) ? cls.subject : [cls.subject])
    .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
    .filter(Boolean)
    .join(", ");
};

const AttendanceSheetModal: React.FC<Props> = ({
  visible,
  cls,
  cycle,
  onClose,
}) => {
  const [records, setRecords] = useState<ClassAttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !cls) return;
    const id = String((cls as any)._id || (cls as any).id || "");
    if (!id) return;

    setLoading(true);
    setError(null);
    setRecords([]);

    getClassAttendance(id)
      .then((res) => {
        const all = res.data || [];
        const filtered = all.filter((r) => {
          const sc = Number(r._sheetCycle);
          return Number.isFinite(sc) ? sc === cycle : true;
        });
        setRecords(
          filtered
            .slice()
            .sort(
              (a, b) =>
                new Date(a.sessionDate).getTime() -
                new Date(b.sessionDate).getTime(),
            ),
        );
      })
      .catch((e) => setError(e?.message || "Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [visible, cls, cycle]);

  const present = records.filter(
    (r) => r.studentAttendanceStatus === "PRESENT",
  ).length;
  const absent = records.filter(
    (r) => r.studentAttendanceStatus === "ABSENT",
  ).length;
  const rate = records.length
    ? Math.round((present / records.length) * 100)
    : 0;

  const stats = [
    { label: "Present", value: present, color: T.success, bg: "#ECFDF5" },
    { label: "Absent", value: absent, color: T.error, bg: "#FEF2F2" },
    { label: "Total", value: records.length, color: T.primary, bg: "#EFF6FF" },
    {
      label: "Rate",
      value: `${rate}%`,
      color: rate >= 75 ? T.success : rate >= 50 ? "#F59E0B" : T.error,
      bg: "#F8FAFC",
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Drag handle */}
          <View style={s.dragHandle} />

          {/* Header */}
          <LinearGradient
            colors={[T.darkBg, T.darkBgMid]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.header}
          >
            <View style={s.headerLeft}>
              <View style={s.headerIconBg}>
                <Ionicons name="clipboard" size={16} color="#fff" />
              </View>
              <View>
                <Text style={s.headerTitle}>Attendance Sheet</Text>
                <Text style={s.headerSub}>
                  {cls?.studentName}  ·  Cycle {cycle}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={10}>
              <Ionicons name="close" size={18} color="rgba(255,255,255,0.7)" />
            </Pressable>
          </LinearGradient>

          {/* Class info strip */}
          {cls && (
            <View style={s.infoStrip}>
              {subjectLabel(cls) !== "—" && (
                <View style={s.infoChip}>
                  <Ionicons name="book-outline" size={11} color={T.primary} />
                  <Text style={s.infoChipTxt}>{subjectLabel(cls)}</Text>
                </View>
              )}
              {cls.grade && (
                <View style={s.infoChip}>
                  <Ionicons name="layers-outline" size={11} color={T.primary} />
                  <Text style={s.infoChipTxt}>Grade {cls.grade}</Text>
                </View>
              )}
              {cls.board && (
                <View style={s.infoChip}>
                  <Ionicons name="ribbon-outline" size={11} color={T.primary} />
                  <Text style={s.infoChipTxt}>{cls.board}</Text>
                </View>
              )}
            </View>
          )}

          {/* Stats row */}
          {!loading && records.length > 0 && (
            <View style={s.statsRow}>
              {stats.map((st) => (
                <View
                  key={st.label}
                  style={[s.statBox, { backgroundColor: st.bg }]}
                >
                  <Text style={[s.statVal, { color: st.color }]}>
                    {st.value}
                  </Text>
                  <Text style={s.statLbl}>{st.label}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Body */}
          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={T.primary} size="large" />
              <Text style={s.centerTxt}>Loading attendance…</Text>
            </View>
          )}

          {!loading && error && (
            <View style={s.center}>
              <View style={[s.emptyIconBg, { backgroundColor: "#FEF2F2" }]}>
                <Ionicons
                  name="alert-circle-outline"
                  size={28}
                  color={T.error}
                />
              </View>
              <Text style={[s.centerTxt, { color: T.error }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && records.length === 0 && (
            <View style={s.center}>
              <View style={s.emptyIconBg}>
                <Ionicons name="calendar-outline" size={28} color={T.primary} />
              </View>
              <Text style={s.centerTxt}>No records for Cycle {cycle}</Text>
              <Text style={s.centerSub}>
                Attendance will appear here once sessions are marked.
              </Text>
            </View>
          )}

          {!loading && records.length > 0 && (
            <ScrollView
              style={s.tableWrap}
              showsVerticalScrollIndicator={false}
            >
              {/* Table header */}
              <View style={s.tableHead}>
                <Text style={[s.thTxt, { flex: 1.3 }]}>Date</Text>
                <Text style={[s.thTxt, { flex: 0.7 }]}>Day</Text>
                <Text style={[s.thTxt, { flex: 1.1 }]}>Status</Text>
                <Text style={[s.thTxt, { flex: 0.6 }]}>Hrs</Text>
                <Text style={[s.thTxt, { flex: 1.8 }]}>Topic</Text>
              </View>

              {records.map((r, i) => {
                const meta =
                  STATUS_META[r.studentAttendanceStatus] ??
                  STATUS_META.CANCELLED;
                return (
                  <View
                    key={r._id || i}
                    style={[s.row, i % 2 === 0 && s.rowAlt]}
                  >
                    <Text style={[s.tdDate, { flex: 1.3 }]}>
                      {fmt(r.sessionDate)}
                    </Text>
                    <Text style={[s.tdMuted, { flex: 0.7 }]}>
                      {dayName(r.sessionDate)}
                    </Text>
                    <View style={[s.statusBadge, { flex: 1.1 }]}>
                      <View
                        style={[
                          s.statusPill,
                          { backgroundColor: meta.bg },
                        ]}
                      >
                        <Ionicons
                          name={meta.icon}
                          size={10}
                          color={meta.color}
                        />
                        <Text
                          style={[s.statusPillTxt, { color: meta.color }]}
                        >
                          {meta.label}
                        </Text>
                      </View>
                    </View>
                    <Text style={[s.tdMuted, { flex: 0.6 }]}>
                      {r.durationHours ?? "—"}
                    </Text>
                    <Text
                      style={[s.tdTopic, { flex: 1.8 }]}
                      numberOfLines={1}
                    >
                      {r.topicCovered || "—"}
                    </Text>
                  </View>
                );
              })}
              <View style={{ height: 20 }} />
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const s = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,8,23,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "90%",
    overflow: "hidden",
  },

  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    alignSelf: "center",
    marginTop: 10,
    marginBottom: -4,
    zIndex: 1,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
  },
  headerLeft: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  headerSub: { fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 2 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },

  infoStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${T.primary}0E`,
    borderRadius: 100,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  infoChipTxt: { fontSize: 11, color: T.primary, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    borderRadius: 12,
  },
  statVal: { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: {
    fontSize: 9,
    color: "#94A3B8",
    fontWeight: "600",
    marginTop: 3,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  center: { alignItems: "center", paddingVertical: 48, gap: 10 },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: `${T.primary}10`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  centerTxt: {
    fontSize: 14,
    color: "#475569",
    fontWeight: "700",
    textAlign: "center",
  },
  centerSub: {
    fontSize: 12,
    color: "#94A3B8",
    textAlign: "center",
    paddingHorizontal: 32,
    lineHeight: 18,
  },

  tableWrap: { flex: 1 },
  tableHead: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  thTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#94A3B8",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },

  row: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
  },
  rowAlt: { backgroundColor: "#FAFAFA" },

  tdDate: { fontSize: 11, color: "#0F172A", fontWeight: "600" },
  tdMuted: { fontSize: 11, color: "#94A3B8", fontWeight: "500" },
  tdTopic: { fontSize: 11, color: "#475569", fontWeight: "500" },

  statusBadge: { justifyContent: "center" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: "flex-start",
  },
  statusPillTxt: { fontSize: 9, fontWeight: "700" },
});

export default AttendanceSheetModal;
