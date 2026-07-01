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
import { LeadAnnouncement } from "../../../api/client";
import { T } from "../../../constants/colors";
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

  // â”€â”€ Stagger reveal â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay: revealDelay,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, []);
  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  // â”€â”€ Interest button spring â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const btnScale = useRef(new Animated.Value(1)).current;
  const onPressIn = () =>
    Animated.spring(btnScale, { toValue: 0.93, useNativeDriver: true, speed: 80, bounciness: 0 }).start();
  const onPressOut = () =>
    Animated.spring(btnScale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();

  // â”€â”€ Match â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const pct = item.matchPercentage ?? 0;
  const isPerfect = pct === 100;
  const isHighMatch = pct >= 75;
  const matchColor =
    isPerfect    ? "#059669"
    : isHighMatch ? T.primary
    : pct >= 50   ? "#D97706"
    :               "#94A3B8";

  // â”€â”€ Mode â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const modeIcon: any =
    lead.mode === "ONLINE"  ? "videocam-outline"
    : lead.mode === "HYBRID" ? "git-merge-outline"
    :                          "home-outline";
  const modeColor =
    lead.mode === "ONLINE"  ? T.primary
    : lead.mode === "HYBRID" ? "#7C3AED"
    :                          T.secondary;

  return (
    <Animated.View style={[s.root, { opacity: anim, transform: [{ translateY }] }]}>
      <View style={[s.card, isPerfect && s.perfectCard]}>

        {/* â”€â”€ Match accent bar (top, full-width â€” replaces banned side stripe) */}
        {pct > 0 && (
          <View
            style={[
              s.accentBar,
              { backgroundColor: matchColor },
              isPerfect && { shadowColor: matchColor, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.5, shadowRadius: 4 },
            ]}
          />
        )}

        <View style={s.inner}>
          {/* â”€â”€ Top row â”€â”€ */}
          <View style={s.topRow}>
            <View style={s.badges}>
              {/* Mode pill */}
              <View style={[s.pill, { backgroundColor: `${modeColor}12`, borderColor: `${modeColor}28` }]}>
                <Ionicons name={modeIcon} size={9.5} color={modeColor} />
                <Text style={[s.pillTxt, { color: modeColor }]}>{lead.mode}</Text>
              </View>

              {/* Match pill */}
              {pct > 0 && (
                <View style={[s.pill, { backgroundColor: `${matchColor}10`, borderColor: `${matchColor}25` }]}>
                  {isPerfect && <Ionicons name="star" size={9} color={matchColor} style={{ marginRight: -1 }} />}
                  <Text style={[s.pillTxt, { color: matchColor, fontWeight: "800" }]}>
                    {isPerfect ? "Perfect" : `${pct}%`}
                  </Text>
                </View>
              )}

              {/* Lead ID */}
              {lead.leadId ? (
                <View style={[s.pill, { backgroundColor: `${T.primary}08`, borderColor: `${T.primary}18` }]}>
                  <Text style={[s.pillTxt, { color: T.primary }]}>#{lead.leadId}</Text>
                </View>
              ) : null}
            </View>

            <Text style={s.timeAgo}>{timeAgo(item.postedAt)}</Text>
          </View>

          {/* â”€â”€ Subject â”€â”€ */}
          <Text style={s.subject} numberOfLines={2}>{subjectLabel(lead)}</Text>

          {/* â”€â”€ Grade / board â”€â”€ */}
          {(lead.grade || lead.board) ? (
            <Text style={s.grade}>
              {[lead.grade && `Grade ${lead.grade}`, lead.board].filter(Boolean).join(" Â· ")}
            </Text>
          ) : null}

          {/* â”€â”€ Payment â”€â”€ */}
          {(lead.tutorFees || lead.paymentAmount) ? (
            <View style={s.payBanner}>
              <View style={s.payIconBox}>
                <Ionicons name="wallet-outline" size={14} color={T.success} />
              </View>
              <View>
                <Text style={s.payLabel}>YOUR EARNINGS</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", gap: 2 }}>
                  <Text style={s.payAmount}>
                    {fmtRupee(lead.tutorFees ?? lead.paymentAmount ?? 0)}
                  </Text>
                  <Text style={s.payPer}>/month</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* â”€â”€ Detail chips â”€â”€ */}
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

          {/* â”€â”€ Notes â”€â”€ */}
          {lead.notes ? (
            <View style={s.notesBox}>
              <Ionicons name="document-text-outline" size={11} color={T.primary} />
              <Text style={s.notesTxt}>{lead.notes}</Text>
            </View>
          ) : null}

          {/* â”€â”€ Footer â”€â”€ */}
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
                      size={11}
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
      </View>
    </Animated.View>
  );
};

const s = StyleSheet.create({
  root: { marginBottom: 12 },
  card: {
    backgroundColor: T.paper,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  perfectCard: {
    borderColor: "rgba(16,185,129,0.18)",
    shadowColor: "#059669",
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },

  // Top accent bar (replaces banned side-stripe border)
  accentBar: {
    height: 3,
    width: "100%",
  },

  inner: { padding: 16 },

  // Top row
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 6,
  },
  badges: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3.5,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 99,
    borderWidth: 1,
  },
  pillTxt: { fontSize: 9.5, fontWeight: "700", letterSpacing: 0.3 },
  timeAgo: { fontSize: 10, color: T.textDisabled, fontWeight: "500" },

  // Subject & grade
  subject: {
    fontSize: 17,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.4,
    lineHeight: 24,
    marginBottom: 2,
  },
  grade: {
    fontSize: 11.5,
    color: T.textSecondary,
    marginBottom: 12,
    fontWeight: "500",
  },

  // Payment banner
  payBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: `${T.success}09`,
    borderWidth: 1,
    borderColor: `${T.success}22`,
    borderRadius: 13,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  payIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${T.success}16`,
    alignItems: "center",
    justifyContent: "center",
  },
  payLabel: {
    fontSize: 8.5,
    fontWeight: "800",
    color: T.success,
    letterSpacing: 0.8,
    marginBottom: 1,
  },
  payAmount: {
    fontSize: 19,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.5,
  },
  payPer: { fontSize: 11, fontWeight: "600", color: T.mutedFg },

  // Detail chips
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5FB",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 4.5,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  chipTxt: { fontSize: 10.5, color: T.textSecondary, fontWeight: "500" },

  // Notes box
  notesBox: {
    flexDirection: "row",
    gap: 7,
    backgroundColor: `${T.primary}07`,
    borderWidth: 1,
    borderColor: `${T.primary}12`,
    borderRadius: 11,
    paddingHorizontal: 11,
    paddingVertical: 9,
    marginBottom: 13,
    alignItems: "flex-start",
  },
  notesTxt: { flex: 1, fontSize: 12, color: T.textSecondary, lineHeight: 18 },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    paddingTop: 11,
    marginTop: 2,
  },
  interestRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  interestTxt: { fontSize: 11.5, color: T.mutedFg, fontWeight: "500" },

  // CTA button
  btn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
  },
  btnActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 4,
  },
  btnDone: {
    backgroundColor: `${T.success}10`,
    borderWidth: 1,
    borderColor: `${T.success}28`,
  },
  btnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default OpportunityCard;

