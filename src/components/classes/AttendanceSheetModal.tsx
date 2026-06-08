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
import { getClassAttendance, ClassAttendanceRecord, FinalClass } from "../../api/client";
import { T } from "../../constants/colors";

interface Props {
  visible: boolean;
  cls: FinalClass | null;
  cycle: number;
  onClose: () => void;
}

const STATUS_COLOR: Record<string, string> = {
  PRESENT: T.success,
  ABSENT: T.error,
  HOLIDAY: "#F59E0B",
  CANCELLED: T.mutedFg,
};

const STATUS_ICON: Record<string, any> = {
  PRESENT: "checkmark-circle",
  ABSENT: "close-circle",
  HOLIDAY: "sunny-outline",
  CANCELLED: "ban-outline",
};

const fmt = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const dayName = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { weekday: "short" });

const AttendanceSheetModal: React.FC<Props> = ({ visible, cls, cycle, onClose }) => {
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
        setRecords(filtered);
      })
      .catch((e) => setError(e?.message || "Failed to load attendance"))
      .finally(() => setLoading(false));
  }, [visible, cls, cycle]);

  const present = records.filter((r) => r.studentAttendanceStatus === "PRESENT").length;
  const absent = records.filter((r) => r.studentAttendanceStatus === "ABSENT").length;

  const subjectLabel = (cls: FinalClass) => {
    if (!cls.subject?.length) return "—";
    return (Array.isArray(cls.subject) ? cls.subject : [cls.subject])
      .map((s) => (typeof s === "string" ? s : s?.label || s?.name || ""))
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <View style={s.headerLeft}>
              <Text style={s.headerTitle}>Attendance Sheet</Text>
              <Text style={s.headerSub}>
                {cls?.studentName} · Cycle {cycle}
              </Text>
            </View>
            <Pressable onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={20} color={T.textPrimary} />
            </Pressable>
          </View>

          {/* Class info strip */}
          {cls && (
            <View style={s.infoStrip}>
              <View style={s.infoItem}>
                <Ionicons name="school-outline" size={12} color={T.mutedFg} />
                <Text style={s.infoTxt}>{subjectLabel(cls)}</Text>
              </View>
              {cls.grade ? (
                <View style={s.infoItem}>
                  <Ionicons name="layers-outline" size={12} color={T.mutedFg} />
                  <Text style={s.infoTxt}>Grade {cls.grade}</Text>
                </View>
              ) : null}
              {cls.board ? (
                <View style={s.infoItem}>
                  <Ionicons name="ribbon-outline" size={12} color={T.mutedFg} />
                  <Text style={s.infoTxt}>{cls.board}</Text>
                </View>
              ) : null}
            </View>
          )}

          {/* Stats row */}
          {!loading && records.length > 0 && (
            <View style={s.statsRow}>
              <View style={[s.statBox, { borderColor: `${T.success}30` }]}>
                <Text style={[s.statNum, { color: T.success }]}>{present}</Text>
                <Text style={s.statLbl}>Present</Text>
              </View>
              <View style={[s.statBox, { borderColor: `${T.error}30` }]}>
                <Text style={[s.statNum, { color: T.error }]}>{absent}</Text>
                <Text style={s.statLbl}>Absent</Text>
              </View>
              <View style={[s.statBox, { borderColor: `${T.primary}30` }]}>
                <Text style={[s.statNum, { color: T.primary }]}>{records.length}</Text>
                <Text style={s.statLbl}>Total</Text>
              </View>
              <View style={[s.statBox, { borderColor: `${T.warning}30` }]}>
                <Text style={[s.statNum, { color: T.warning }]}>
                  {records.length ? Math.round((present / records.length) * 100) : 0}%
                </Text>
                <Text style={s.statLbl}>Rate</Text>
              </View>
            </View>
          )}

          {/* Body */}
          {loading && (
            <View style={s.center}>
              <ActivityIndicator color={T.primary} />
              <Text style={s.centerTxt}>Loading attendance…</Text>
            </View>
          )}

          {!loading && error && (
            <View style={s.center}>
              <Ionicons name="alert-circle-outline" size={32} color={T.error} />
              <Text style={[s.centerTxt, { color: T.error }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && records.length === 0 && (
            <View style={s.center}>
              <Ionicons name="calendar-outline" size={40} color={T.textDisabled} />
              <Text style={s.centerTxt}>No records for Cycle {cycle}</Text>
              <Text style={s.centerSub}>Attendance will appear here once sessions are marked.</Text>
            </View>
          )}

          {!loading && records.length > 0 && (
            <ScrollView style={s.list} showsVerticalScrollIndicator={false}>
              {/* Table header */}
              <View style={s.tableHead}>
                <Text style={[s.thTxt, { flex: 1.2 }]}>Date</Text>
                <Text style={[s.thTxt, { flex: 0.8 }]}>Day</Text>
                <Text style={[s.thTxt, { flex: 1 }]}>Status</Text>
                <Text style={[s.thTxt, { flex: 0.7 }]}>Hrs</Text>
                <Text style={[s.thTxt, { flex: 2 }]}>Topic</Text>
              </View>

              {records
                .slice()
                .sort((a, b) => new Date(a.sessionDate).getTime() - new Date(b.sessionDate).getTime())
                .map((r, i) => {
                  const color = STATUS_COLOR[r.studentAttendanceStatus] ?? T.mutedFg;
                  const icon = STATUS_ICON[r.studentAttendanceStatus] ?? "help-circle-outline";
                  return (
                    <View key={r._id || i} style={[s.row, i % 2 === 0 && s.rowAlt]}>
                      <Text style={[s.tdTxt, { flex: 1.2 }]}>{fmt(r.sessionDate)}</Text>
                      <Text style={[s.tdTxt, { flex: 0.8, color: T.textSecondary }]}>{dayName(r.sessionDate)}</Text>
                      <View style={[s.statusCell, { flex: 1 }]}>
                        <Ionicons name={icon} size={13} color={color} />
                        <Text style={[s.statusTxt, { color }]}>{r.studentAttendanceStatus}</Text>
                      </View>
                      <Text style={[s.tdTxt, { flex: 0.7 }]}>{r.durationHours ?? "—"}</Text>
                      <Text style={[s.tdTxt, { flex: 2, color: T.textSecondary }]} numberOfLines={1}>
                        {r.topicCovered || "—"}
                      </Text>
                    </View>
                  );
                })}
              <View style={{ height: 16 }} />
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
    paddingBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: T.mutedFg, marginTop: 2 },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: T.muted,
    alignItems: "center", justifyContent: "center",
  },

  infoStrip: {
    flexDirection: "row", flexWrap: "wrap", gap: 8,
    paddingHorizontal: 20, paddingVertical: 10,
    backgroundColor: `${T.primary}06`,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  infoItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  infoTxt: { fontSize: 11, color: T.textSecondary, fontWeight: "600" },

  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  statBox: {
    flex: 1, alignItems: "center", paddingVertical: 8,
    borderRadius: T.radiusMd, borderWidth: 1,
    backgroundColor: T.background,
  },
  statNum: { fontSize: 16, fontWeight: "800", letterSpacing: -0.5 },
  statLbl: { fontSize: 9, color: T.mutedFg, fontWeight: "600", marginTop: 2 },

  center: { alignItems: "center", paddingVertical: 40, gap: 10 },
  centerTxt: { fontSize: 14, color: T.textSecondary, fontWeight: "600", textAlign: "center" },
  centerSub: { fontSize: 12, color: T.textDisabled, textAlign: "center", paddingHorizontal: 24 },

  list: { flex: 1 },

  tableHead: {
    flexDirection: "row", paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: `${T.primary}08`,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  thTxt: { fontSize: 9, fontWeight: "800", color: T.primary, textTransform: "uppercase", letterSpacing: 0.5 },

  row: { flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, alignItems: "center" },
  rowAlt: { backgroundColor: `${T.primary}04` },
  tdTxt: { fontSize: 11, color: T.textPrimary, fontWeight: "500" },
  statusCell: { flexDirection: "row", alignItems: "center", gap: 3 },
  statusTxt: { fontSize: 10, fontWeight: "700" },
});

export default AttendanceSheetModal;
