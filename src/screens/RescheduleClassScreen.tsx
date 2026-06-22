import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "RescheduleClass">;
type Route = RouteProp<RootStackParamList, "RescheduleClass">;

const REASONS = [
  "Personal commitment",
  "Health / illness",
  "Travel / vacation",
  "Exam / school event",
  "Teacher unavailable",
  "Other",
];

const TIME_SLOTS = [
  "6:00 AM", "7:00 AM", "8:00 AM", "9:00 AM",
  "10:00 AM", "11:00 AM", "12:00 PM",
  "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM",
  "5:00 PM", "6:00 PM", "7:00 PM", "8:00 PM",
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

// ─── Mini calendar ─────────────────────────────────────────────────────────────

const MiniCalendar = ({
  selected,
  onSelect,
}: {
  selected: Date | null;
  onSelect: (d: Date) => void;
}) => {
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const prev = () => setViewMonth(new Date(year, month - 1, 1));
  const next = () => setViewMonth(new Date(year, month + 1, 1));

  return (
    <View style={rc.calWrap}>
      <View style={rc.calHeader}>
        <TouchableOpacity onPress={prev} style={rc.calNav}>
          <Ionicons name="chevron-back" size={16} color={T.textPrimary} />
        </TouchableOpacity>
        <Text style={rc.calTitle}>{MONTH_NAMES[month]} {year}</Text>
        <TouchableOpacity onPress={next} style={rc.calNav}>
          <Ionicons name="chevron-forward" size={16} color={T.textPrimary} />
        </TouchableOpacity>
      </View>

      <View style={rc.calDayRow}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={rc.calDayLabel}>{d}</Text>
        ))}
      </View>

      <View style={rc.calGrid}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={rc.calCell} />;
          const date = new Date(year, month, day);
          date.setHours(0, 0, 0, 0);
          const isPast = date < today;
          const isSelected =
            selected &&
            selected.getFullYear() === year &&
            selected.getMonth() === month &&
            selected.getDate() === day;
          const isToday = date.getTime() === today.getTime();

          return (
            <TouchableOpacity
              key={day}
              style={rc.calCell}
              onPress={() => !isPast && onSelect(date)}
              disabled={isPast}
            >
              <View
                style={[
                  rc.calDayWrap,
                  isSelected && { backgroundColor: T.primary },
                  isToday && !isSelected && { borderWidth: 1.5, borderColor: T.primary },
                ]}
              >
                <Text
                  style={[
                    rc.calDayNum,
                    isPast && { color: T.textDisabled },
                    isSelected && { color: "#fff" },
                    isToday && !isSelected && { color: T.primary, fontWeight: "800" },
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
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

const RescheduleClassScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { classId, subject = "Class" } = route.params ?? {};

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [otherNote, setOtherNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const headerAnim = useRef(new Animated.Value(0)).current;
  const successAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
  }, []);

  const canSubmit = selectedDate && selectedTime && reason;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSubmitted(true);
    Animated.timing(successAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  };

  const formatDate = (d: Date) =>
    d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

  return (
    <KeyboardAvoidingView style={rc.root} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <StatusBar barStyle="light-content" />

      <LinearGradient
        colors={[T.darkBg, T.darkBgMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[rc.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={rc.orbA} pointerEvents="none" />
        <Animated.View style={{ opacity: headerAnim }}>
          <View style={rc.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={rc.backBtn}>
              <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.8)" />
            </Pressable>
          </View>
          <Text style={rc.heroTitle}>Reschedule</Text>
          <Text style={rc.heroSub}>{subject}</Text>
        </Animated.View>
      </LinearGradient>

      {submitted ? (
        <Animated.View style={[rc.successWrap, { opacity: successAnim, transform: [{ scale: successAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] }]}>
          <View style={rc.successIcon}>
            <Ionicons name="checkmark-circle" size={56} color={T.success} />
          </View>
          <Text style={rc.successTitle}>Request Submitted</Text>
          <Text style={rc.successSub}>
            Your reschedule request for{"\n"}
            <Text style={{ fontWeight: "800" }}>{formatDate(selectedDate!)}</Text> at{" "}
            <Text style={{ fontWeight: "800" }}>{selectedTime}</Text>
            {"\n"}has been sent for approval.
          </Text>
          <View style={rc.statusCard}>
            <Ionicons name="time-outline" size={16} color={T.warning} />
            <Text style={rc.statusTxt}>Status: <Text style={{ color: T.warning, fontWeight: "700" }}>Pending Approval</Text></Text>
          </View>
          <Pressable onPress={() => navigation.goBack()} style={rc.doneBtn}>
            <Text style={rc.doneBtnTxt}>Done</Text>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[rc.content, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Current class info */}
          <View style={rc.infoBar}>
            <Ionicons name="information-circle-outline" size={15} color={T.primary} />
            <Text style={rc.infoBarTxt}>Current schedule: Mon, Wed, Fri · 5:00 PM</Text>
          </View>

          {/* Date picker */}
          <View style={rc.section}>
            <Text style={rc.sectionHead}>New Date</Text>
            <MiniCalendar selected={selectedDate} onSelect={setSelectedDate} />
            {selectedDate && (
              <View style={rc.selectedPill}>
                <Ionicons name="calendar" size={13} color={T.primary} />
                <Text style={rc.selectedPillTxt}>{formatDate(selectedDate)}</Text>
              </View>
            )}
          </View>

          {/* Time picker */}
          <View style={rc.section}>
            <Text style={rc.sectionHead}>New Time Slot</Text>
            <View style={rc.timeGrid}>
              {TIME_SLOTS.map((slot) => (
                <TouchableOpacity
                  key={slot}
                  style={[rc.timeChip, selectedTime === slot && rc.timeChipActive]}
                  onPress={() => setSelectedTime(slot)}
                >
                  <Text style={[rc.timeChipTxt, selectedTime === slot && rc.timeChipTxtActive]}>
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Reason */}
          <View style={rc.section}>
            <Text style={rc.sectionHead}>Reason</Text>
            <View style={rc.reasonList}>
              {REASONS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[rc.reasonChip, reason === r && rc.reasonChipActive]}
                  onPress={() => setReason(r)}
                >
                  <View style={[rc.reasonRadio, reason === r && rc.reasonRadioActive]}>
                    {reason === r && <View style={rc.reasonRadioDot} />}
                  </View>
                  <Text style={[rc.reasonTxt, reason === r && { color: T.primary, fontWeight: "700" }]}>
                    {r}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {reason === "Other" && (
              <TextInput
                style={rc.otherInput}
                placeholder="Describe your reason..."
                placeholderTextColor={T.textDisabled}
                value={otherNote}
                onChangeText={setOtherNote}
                multiline
                numberOfLines={3}
              />
            )}
          </View>
        </ScrollView>
      )}

      {!submitted && (
        <View style={[rc.footer, { paddingBottom: insets.bottom + 8 }]}>
          <Pressable
            onPress={handleSubmit}
            disabled={!canSubmit}
            style={({ pressed }) => [rc.submitBtn, !canSubmit && rc.submitBtnDisabled, pressed && { opacity: 0.85 }]}
          >
            <LinearGradient
              colors={canSubmit ? [T.primary, T.primaryDark] : [T.textDisabled, T.textDisabled]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={rc.submitGrad}
            >
              <Ionicons name="send-outline" size={16} color="#fff" />
              <Text style={rc.submitTxt}>Send Reschedule Request</Text>
            </LinearGradient>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  root:             { flex: 1, backgroundColor: T.background },
  hero:             { paddingHorizontal: T.base, paddingBottom: T.lg, overflow: "hidden" },
  orbA:             { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: `${T.primary}10`, top: -50, right: -40 } as any,
  heroTop:          { flexDirection: "row", alignItems: "center", marginBottom: T.base },
  backBtn:          { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.08)", alignItems: "center", justifyContent: "center" },
  heroTitle:        { fontSize: 26, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroSub:          { fontSize: 13, color: "rgba(255,255,255,0.5)", marginTop: 3, fontWeight: "600" },

  content:          { padding: T.base, gap: 16 },
  infoBar:          { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${T.primary}08`, borderRadius: T.radiusMd, padding: 10, borderWidth: 1, borderColor: `${T.primary}18` },
  infoBarTxt:       { fontSize: 12, color: T.primary, fontWeight: "600", flex: 1 },

  section:          { backgroundColor: T.paper, borderRadius: T.radiusXl, padding: T.base, borderWidth: 1, borderColor: T.border },
  sectionHead:      { fontSize: 13, fontWeight: "800", color: T.textDisabled, letterSpacing: 0.6, textTransform: "uppercase", marginBottom: T.sm },

  // calendar
  calWrap:          { gap: 8 },
  calHeader:        { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 4 },
  calNav:           { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: T.muted },
  calTitle:         { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  calDayRow:        { flexDirection: "row", marginBottom: 4 },
  calDayLabel:      { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700", color: T.textDisabled },
  calGrid:          { flexDirection: "row", flexWrap: "wrap" },
  calCell:          { width: "14.28%", alignItems: "center", paddingVertical: 3 },
  calDayWrap:       { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  calDayNum:        { fontSize: 13, fontWeight: "600", color: T.textPrimary },

  selectedPill:     { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, backgroundColor: `${T.primary}10`, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 6, alignSelf: "flex-start" },
  selectedPillTxt:  { fontSize: 12, color: T.primary, fontWeight: "700" },

  // time grid
  timeGrid:         { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  timeChip:         { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 99, backgroundColor: T.muted, borderWidth: 1, borderColor: T.border },
  timeChipActive:   { backgroundColor: T.primary, borderColor: T.primary },
  timeChipTxt:      { fontSize: 12, fontWeight: "600", color: T.textSecondary },
  timeChipTxtActive:{ color: "#fff", fontWeight: "700" },

  // reason
  reasonList:       { gap: 8 },
  reasonChip:       { flexDirection: "row", alignItems: "center", gap: 10, padding: 12, borderRadius: T.radiusMd, backgroundColor: T.muted, borderWidth: 1, borderColor: T.border },
  reasonChipActive: { backgroundColor: `${T.primary}08`, borderColor: T.primary },
  reasonRadio:      { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: T.border, alignItems: "center", justifyContent: "center" },
  reasonRadioActive:{ borderColor: T.primary },
  reasonRadioDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: T.primary },
  reasonTxt:        { fontSize: 13, color: T.textSecondary, fontWeight: "600" },
  otherInput:       { marginTop: 10, borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd, padding: 12, fontSize: 13, color: T.textPrimary, backgroundColor: T.muted, minHeight: 72, textAlignVertical: "top" },

  // footer
  footer:           { backgroundColor: T.paper, paddingHorizontal: T.base, paddingTop: 12, borderTopWidth: 1, borderTopColor: T.border },
  submitBtn:        { borderRadius: T.radiusLg, overflow: "hidden" },
  submitBtnDisabled:{ opacity: 0.5 },
  submitGrad:       { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 15 },
  submitTxt:        { color: "#fff", fontSize: 15, fontWeight: "700" },

  // success
  successWrap:      { flex: 1, alignItems: "center", justifyContent: "center", padding: T.xl },
  successIcon:      { marginBottom: T.base },
  successTitle:     { fontSize: 22, fontWeight: "800", color: T.textPrimary, marginBottom: 8, letterSpacing: -0.4 },
  successSub:       { fontSize: 14, color: T.textSecondary, textAlign: "center", lineHeight: 22, marginBottom: T.lg },
  statusCard:       { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: `${T.warning}10`, borderRadius: T.radiusMd, padding: 12, borderWidth: 1, borderColor: `${T.warning}25`, marginBottom: T.xl },
  statusTxt:        { fontSize: 13, color: T.textSecondary, fontWeight: "600" },
  doneBtn:          { backgroundColor: T.primary, borderRadius: T.radiusFull, paddingHorizontal: 36, paddingVertical: 13 },
  doneBtnTxt:       { color: "#fff", fontSize: 15, fontWeight: "700" },
});

export default RescheduleClassScreen;
