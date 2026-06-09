import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { PendingCycleClass, setCycleStartDate } from "../../api/client";

interface Props {
  classes: PendingCycleClass[];
  onDone: () => void;
}

export default function CycleStartModal({ classes, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cls = classes[index];
  if (!cls) return null;

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await setCycleStartDate(cls._id, date.toISOString());
      if (index + 1 < classes.length) {
        setIndex((i) => i + 1);
        setDate(new Date());
      } else {
        onDone();
      }
    } catch (e: any) {
      setError(e?.message || "Failed to set start date");
    } finally {
      setSubmitting(false);
    }
  };

  const days = cls.schedule?.daysOfWeek?.join(", ") || "—";

  return (
    <Modal visible animationType="slide" transparent onRequestClose={() => {}}>
      <View style={s.backdrop}>
        <View style={s.sheet}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={s.iconWrap}>
              <Ionicons name="calendar-outline" size={22} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Set Your First Class Date</Text>
              <Text style={s.sub} numberOfLines={1}>{cls.studentName}</Text>
            </View>
            {classes.length > 1 && (
              <View style={s.badge}>
                <Text style={s.badgeTxt}>{index + 1}/{classes.length}</Text>
              </View>
            )}
          </View>

          <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
            {/* Cycle info */}
            <View style={s.infoCard}>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Cycle</Text>
                <Text style={s.infoVal}>#{cls.currentCycleNumber}</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Sessions</Text>
                <Text style={s.infoVal}>{cls.classesPerMonth} classes</Text>
              </View>
              <View style={s.infoRow}>
                <Text style={s.infoLabel}>Schedule</Text>
                <Text style={s.infoVal} numberOfLines={2}>{days}</Text>
              </View>
              {cls.schedule?.timeSlot && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Time</Text>
                  <Text style={s.infoVal}>{cls.schedule.timeSlot}</Text>
                </View>
              )}
            </View>

            <Text style={s.sectionLabel}>First class date</Text>

            {/* Date selector */}
            <Pressable style={s.dateBtn} onPress={() => setShowPicker(true)}>
              <Ionicons name="calendar" size={18} color={T.primary} />
              <Text style={s.dateTxt}>{fmt(date)}</Text>
              <Ionicons name="chevron-down" size={16} color={T.mutedFg} />
            </Pressable>

            {showPicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "default"}
                minimumDate={new Date()}
                onChange={(_, selected) => {
                  setShowPicker(Platform.OS === "ios");
                  if (selected) setDate(selected);
                }}
              />
            )}

            <Text style={s.hint}>
              We'll generate all {cls.classesPerMonth} sessions for Cycle #{cls.currentCycleNumber}
              {" "}starting from this date, following your {days} schedule.
            </Text>

            {error && <Text style={s.errTxt}>{error}</Text>}
          </ScrollView>

          {/* Actions */}
          <View style={s.footer}>
            <Pressable
              style={[s.submitBtn, submitting && { opacity: 0.6 }]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle-outline" size={18} color="#fff" />
                  <Text style={s.submitTxt}>Confirm &amp; Generate Timetable</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${T.primary}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { fontSize: 15, fontWeight: "700", color: T.textPrimary },
  sub: { fontSize: 12, color: T.mutedFg, marginTop: 1 },
  badge: {
    backgroundColor: T.primary,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  badgeTxt: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: 20, gap: 12 },
  infoCard: {
    backgroundColor: `${T.primary}08`,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${T.primary}20`,
    padding: 14,
    gap: 8,
  },
  infoRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  infoLabel: { fontSize: 12, color: T.mutedFg, fontWeight: "600" },
  infoVal: { fontSize: 12, color: T.textPrimary, fontWeight: "700", textAlign: "right", flex: 1, marginLeft: 16 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.6 },
  dateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1.5,
    borderColor: T.primary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: `${T.primary}08`,
  },
  dateTxt: { flex: 1, fontSize: 15, fontWeight: "700", color: T.textPrimary },
  hint: { fontSize: 12, color: T.mutedFg, lineHeight: 18 },
  errTxt: { fontSize: 12, color: T.error, fontWeight: "600" },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: T.border },
  submitBtn: {
    backgroundColor: T.primary,
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  submitTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});
