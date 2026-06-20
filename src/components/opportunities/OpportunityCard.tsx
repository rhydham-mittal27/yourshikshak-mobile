import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LeadAnnouncement } from "../../api/client";
import { T } from "../../constants/colors";
import { fmtRupee, timeAgo, subjectLabel } from "./opportunityHelpers";

interface Props {
  item: LeadAnnouncement;
  interested: boolean;
  expressing: boolean;
  onInterest: (id: string) => void;
  revealDelay?: number;
}

const OpportunityCard: React.FC<Props> = ({
  item,
  interested,
  expressing,
  onInterest,
  revealDelay = 0,
}) => {
  const lead = item.classLead;
  if (!lead) return null;

  // ── Stagger reveal ──────────────────────────────────────────────────────────
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 400,
      delay: revealDelay,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });

  // ── Interest button press scale ─────────────────────────────────────────────
  const btnScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 5 }).start();

  // ── Match ───────────────────────────────────────────────────────────────────
  const pct = item.matchPercentage ?? 0;
  const isPerfect = pct === 100;
  const matchColor =
    isPerfect ? "#059669"
    : pct >= 75 ? T.primary
    : pct >= 50 ? "#D97706"
    : "#94A3B8";
  const matchLabel = isPerfect ? "Perfect Match" : `${pct}% match`;

  // ── Mode ────────────────────────────────────────────────────────────────────
  const modeIcon: any =
    lead.mode === "ONLINE" ? "videocam-outline"
    : lead.mode === "HYBRID" ? "git-merge-outline"
    : "home-outline";
  const modeColor =
    lead.mode === "ONLINE" ? T.primary
    : lead.mode === "HYBRID" ? "#7C3AED"
    : T.secondary;

  return (
    <Animated.View style={{ opacity: anim, transform: [{ translateY }] }}>
      <View
        style={[
          s.card,
          { borderLeftColor: pct > 0 ? matchColor : "#CBD5E1" },
          isPerfect && s.perfectCard,
        ]}
      >
        {/* Top row */}
        <View style={s.topRow}>
          <View style={s.badges}>
            <View style={[s.modePill, { backgroundColor: `${modeColor}15`, borderColor: `${modeColor}30` }]}>
              <Ionicons name={modeIcon} size={10} color={modeColor} />
              <Text style={[s.modeTxt, { color: modeColor }]}>{lead.mode}</Text>
            </View>
            {pct > 0 && (
              <View style={[s.matchPill, { backgroundColor: `${matchColor}12`, borderColor: `${matchColor}28` }]}>
                {isPerfect && <Ionicons name="star" size={9} color={matchColor} />}
                <Text style={[s.matchTxt, { color: matchColor }]}>{matchLabel}</Text>
              </View>
            )}
            {lead.leadId ? (
              <View style={s.idPill}>
                <Text style={s.idTxt}># {lead.leadId}</Text>
              </View>
            ) : null}
          </View>
          <Text style={s.timeAgo}>{timeAgo(item.postedAt)}</Text>
        </View>

        {/* Subject */}
        <Text style={s.subject} numberOfLines={2}>{subjectLabel(lead)}</Text>

        {/* Grade / board */}
        {lead.grade || lead.board ? (
          <Text style={s.grade}>
            {[lead.grade && `Grade ${lead.grade}`, lead.board].filter(Boolean).join(" · ")}
          </Text>
        ) : null}

        {/* Payment */}
        {lead.tutorFees || lead.paymentAmount ? (
          <View style={s.payBanner}>
            <View style={s.payIconBox}>
              <Ionicons name="wallet-outline" size={15} color={T.success} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.payLabel}>YOUR MONTHLY EARNINGS</Text>
              <Text style={s.payAmount}>
                {fmtRupee(lead.tutorFees ?? lead.paymentAmount ?? 0)}
                <Text style={s.payPer}> /month</Text>
              </Text>
            </View>
          </View>
        ) : null}

        {/* Detail chips */}
        <View style={s.chips}>
          {lead.city ? (
            <View style={s.chip}>
              <Ionicons name="location-outline" size={10} color={T.mutedFg} />
              <Text style={s.chipTxt}>{lead.city}{lead.area ? `, ${lead.area}` : ""}</Text>
            </View>
          ) : null}
          {lead.classDurationHours ? (
            <View style={s.chip}>
              <Ionicons name="time-outline" size={10} color={T.mutedFg} />
              <Text style={s.chipTxt}>{lead.classDurationHours}h/session</Text>
            </View>
          ) : null}
          {lead.timing ? (
            <View style={s.chip}>
              <Ionicons name="alarm-outline" size={10} color={T.mutedFg} />
              <Text style={s.chipTxt}>{lead.timing}</Text>
            </View>
          ) : null}
          {lead.preferredTutorGender &&
          lead.preferredTutorGender !== "ANY" &&
          lead.preferredTutorGender !== "NO_PREFERENCE" ? (
            <View style={s.chip}>
              <Ionicons name="person-outline" size={10} color={T.mutedFg} />
              <Text style={s.chipTxt}>
                {lead.preferredTutorGender === "MALE" ? "Male tutor" : "Female tutor"}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Notes */}
        {lead.notes ? (
          <View style={s.notesBox}>
            <Ionicons name="document-text-outline" size={12} color={T.primary} />
            <Text style={s.notesTxt}>{lead.notes}</Text>
          </View>
        ) : null}

        {/* Footer */}
        <View style={s.footer}>
          <View style={s.interestRow}>
            <Ionicons name="people-outline" size={12} color={T.mutedFg} />
            <Text style={s.interestTxt}>{item.interestCount} interested</Text>
          </View>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <Pressable
              onPress={() => onInterest(item._id)}
              onPressIn={onPressIn}
              onPressOut={onPressOut}
              disabled={interested || expressing}
              style={[s.btn, interested ? s.btnDone : s.btnActive]}
            >
              {expressing ? (
                <ActivityIndicator size={11} color="#fff" />
              ) : (
                <>
                  <Ionicons
                    name={interested ? "checkmark-circle" : "hand-left-outline"}
                    size={12}
                    color={interested ? T.success : "#fff"}
                  />
                  <Text style={[s.btnTxt, interested && { color: T.success }]}>
                    {interested ? "Applied" : "I'm Interested"}
                  </Text>
                </>
              )}
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    borderLeftWidth: 3,
    padding: 16,
    marginBottom: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  perfectCard: {
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOpacity: 0.14,
    shadowRadius: 12,
    elevation: 4,
  },

  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 6,
  },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, flex: 1 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  modeTxt: { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.4 },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  matchTxt: { fontSize: 9.5, fontWeight: "800" },
  idPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    backgroundColor: `${T.primary}0D`,
    borderWidth: 1,
    borderColor: `${T.primary}20`,
  },
  idTxt: { fontSize: 9, fontWeight: "800", color: T.primary, letterSpacing: 0.4 },
  timeAgo: { fontSize: 10.5, color: T.textDisabled },

  subject: {
    fontSize: 17,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 23,
    marginBottom: 2,
  },
  grade: { fontSize: 11.5, color: T.textSecondary, marginBottom: 12 },

  payBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${T.success}0C`,
    borderWidth: 1,
    borderColor: `${T.success}25`,
    borderRadius: 11,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  payIconBox: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: `${T.success}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  payLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: T.success,
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  payAmount: { fontSize: 18, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.4 },
  payPer: { fontSize: 11.5, fontWeight: "600", color: T.mutedFg },

  chips: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.muted,
    borderRadius: T.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  chipTxt: { fontSize: 10.5, color: T.textSecondary, fontWeight: "500" },

  notesBox: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: `${T.primary}08`,
    borderWidth: 1,
    borderColor: `${T.primary}14`,
    borderRadius: 9,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 13,
  },
  notesTxt: { flex: 1, fontSize: 12, color: T.textSecondary, lineHeight: 17.5 },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#EFF3F8",
    paddingTop: 11,
  },
  interestRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  interestTxt: { fontSize: 11.5, color: T.mutedFg },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: T.radiusFull,
  },
  btnActive: { backgroundColor: T.primary },
  btnDone: {
    backgroundColor: `${T.success}12`,
    borderWidth: 1,
    borderColor: `${T.success}30`,
  },
  btnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default OpportunityCard;
