import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
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
}

const OpportunityCard: React.FC<Props> = ({
  item,
  interested,
  expressing,
  onInterest,
}) => {
  const lead = item.classLead;
  if (!lead) return null;

  const modeIcon: any =
    lead.mode === "ONLINE"
      ? "videocam-outline"
      : lead.mode === "HYBRID"
        ? "git-merge-outline"
        : "home-outline";
  const modeColor =
    lead.mode === "ONLINE"
      ? T.primary
      : lead.mode === "HYBRID"
        ? "#7C3AED"
        : T.secondary;

  const pct = item.matchPercentage ?? 0;
  const matchColor = pct === 100 ? "#16A34A" : pct >= 75 ? T.primary : pct >= 50 ? "#D97706" : T.mutedFg;
  const matchLabel = pct === 100 ? "⭐ Perfect Match" : `${pct}% match`;

  return (
    <View style={[s.card, pct === 100 && s.perfectCard]}>
      {/* Header row */}
      <View style={s.headerRow}>
        <View style={s.headerLeft}>
          <View
            style={[
              s.modePill,
              {
                backgroundColor: `${modeColor}15`,
                borderColor: `${modeColor}30`,
              },
            ]}
          >
            <Ionicons name={modeIcon} size={11} color={modeColor} />
            <Text style={[s.modeTxt, { color: modeColor }]}>{lead.mode}</Text>
          </View>
          {pct > 0 && (
            <View style={[s.matchPill, { backgroundColor: `${matchColor}15`, borderColor: `${matchColor}30` }]}>
              <Text style={[s.matchTxt, { color: matchColor }]}>{matchLabel}</Text>
            </View>
          )}
          {lead.leadId ? (
            <View style={s.idPill}>
              <Ionicons name="pricetag-outline" size={10} color={T.primary} />
              <Text style={s.idTxt}>{lead.leadId}</Text>
            </View>
          ) : null}
        </View>
        <Text style={s.timeAgo}>{timeAgo(item.postedAt)}</Text>
      </View>

      {/* Subject + grade */}
      <Text style={s.subjectTxt} numberOfLines={2}>
        {subjectLabel(lead)}
      </Text>
      {lead.grade || lead.board ? (
        <Text style={s.gradeTxt}>
          {[lead.grade && `Grade ${lead.grade}`, lead.board]
            .filter(Boolean)
            .join(" · ")}
        </Text>
      ) : null}

      {/* Payment highlight */}
      {lead.tutorFees || lead.paymentAmount ? (
        <View style={s.payBanner}>
          <View style={s.payIcon}>
            <Ionicons name="wallet-outline" size={16} color={T.success} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.payLabel}>Your monthly fees</Text>
            <Text style={s.payAmount}>
              {fmtRupee(lead.tutorFees ?? lead.paymentAmount ?? 0)}
              <Text style={s.payPer}> /month</Text>
            </Text>
          </View>
          {lead.tutorFees && lead.paymentAmount && lead.paymentAmount !== lead.tutorFees ? (
            <View style={s.payAside}>
              <Text style={s.payAsideLabel}>Class fee</Text>
              <Text style={s.payAsideTxt}>{fmtRupee(lead.paymentAmount)}/mo</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {/* Detail chips */}
      <View style={s.detailsRow}>
        {lead.city ? (
          <View style={s.detailChip}>
            <Ionicons name="location-outline" size={11} color={T.mutedFg} />
            <Text style={s.detailTxt}>
              {lead.city}
              {lead.area ? `, ${lead.area}` : ""}
            </Text>
          </View>
        ) : null}
        {lead.classDurationHours ? (
          <View style={s.detailChip}>
            <Ionicons name="time-outline" size={11} color={T.mutedFg} />
            <Text style={s.detailTxt}>{lead.classDurationHours}h/session</Text>
          </View>
        ) : null}
        {lead.timing ? (
          <View style={s.detailChip}>
            <Ionicons name="alarm-outline" size={11} color={T.mutedFg} />
            <Text style={s.detailTxt}>{lead.timing}</Text>
          </View>
        ) : null}
        {lead.preferredTutorGender && lead.preferredTutorGender !== "ANY" ? (
          <View style={s.detailChip}>
            <Ionicons name="person-outline" size={11} color={T.mutedFg} />
            <Text style={s.detailTxt}>
              {lead.preferredTutorGender === "MALE"
                ? "Male tutor"
                : lead.preferredTutorGender === "FEMALE"
                  ? "Female tutor"
                  : lead.preferredTutorGender}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Coordinator notes */}
      {lead.notes ? (
        <View style={s.notesBox}>
          <Ionicons name="document-text-outline" size={13} color={T.primary} />
          <Text style={s.notesTxt}>{lead.notes}</Text>
        </View>
      ) : null}

      {/* Footer */}
      <View style={s.footer}>
        <View style={s.interestRow}>
          <Ionicons name="people-outline" size={13} color={T.mutedFg} />
          <Text style={s.interestTxt}>{item.interestCount} interested</Text>
        </View>
        <Pressable
          onPress={() => onInterest(item._id)}
          disabled={interested || expressing}
          style={({ pressed }) => [
            s.interestBtn,
            interested ? s.interestBtnDone : s.interestBtnActive,
            pressed && !interested && { transform: [{ scale: 0.97 }] },
          ]}
        >
          {expressing ? (
            <ActivityIndicator size={12} color="#fff" />
          ) : (
            <>
              <Ionicons
                name={interested ? "checkmark-circle" : "hand-left-outline"}
                size={13}
                color={interested ? T.success : "#fff"}
              />
              <Text
                style={[s.interestBtnTxt, interested && { color: T.success }]}
              >
                {interested ? "Interested" : "I'm Interested"}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
};

const s = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 16,
    marginBottom: 12,
  },
  perfectCard: {
    borderColor: "#16A34A",
    borderWidth: 1.5,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 10,
    gap: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    flex: 1,
  },
  matchPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  matchTxt: { fontSize: 10, fontWeight: "700" },
  idPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: `${T.primary}12`,
    borderWidth: 1,
    borderColor: `${T.primary}25`,
  },
  idTxt: { fontSize: 10, fontWeight: "800", color: T.primary, letterSpacing: 0.3 },
  payBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: `${T.success}0E`,
    borderWidth: 1,
    borderColor: `${T.success}2E`,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 11,
    marginBottom: 12,
  },
  payIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: `${T.success}1A`,
    alignItems: "center",
    justifyContent: "center",
  },
  payLabel: {
    fontSize: 10.5,
    fontWeight: "700",
    color: T.success,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  payAmount: { fontSize: 19, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.4 },
  payPer: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  payAside: { alignItems: "flex-end" },
  payAsideLabel: { fontSize: 9.5, fontWeight: "600", color: T.mutedFg, marginBottom: 2 },
  payAsideTxt: { fontSize: 12, fontWeight: "700", color: T.textSecondary },
  notesBox: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: T.muted,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 14,
  },
  notesTxt: { flex: 1, fontSize: 12.5, color: T.textSecondary, lineHeight: 18 },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  modeTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  timeAgo: { fontSize: 11, color: T.textDisabled },
  subjectTxt: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 3,
    lineHeight: 22,
  },
  gradeTxt: { fontSize: 12, color: T.textSecondary, marginBottom: 12 },
  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 14,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.muted,
    borderRadius: T.radiusFull,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  detailTxt: { fontSize: 11, color: T.textSecondary, fontWeight: "500" },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
  },
  interestRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  interestTxt: { fontSize: 12, color: T.mutedFg },
  interestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: T.radiusFull,
  },
  interestBtnActive: { backgroundColor: T.primary },
  interestBtnDone: {
    backgroundColor: `${T.success}15`,
    borderWidth: 1,
    borderColor: `${T.success}30`,
  },
  interestBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

export default OpportunityCard;
