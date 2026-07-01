import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { dc } from "./styles";
import { DOC_META } from "./constants";

export const DocCard = ({
  doc,
  onView,
}: {
  doc: any;
  onView: (url: string, label: string) => void;
}) => {
  const meta = DOC_META[doc.documentType] ?? DOC_META.OTHER;
  const verified = !!doc.verifiedAt;
  return (
    <View
      style={[
        dc.card,
        { borderColor: meta.color + "30", backgroundColor: meta.color + "06" },
      ]}
    >
      <LinearGradient
        colors={meta.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={dc.iconBox}
      >
        <Ionicons name={meta.icon} size={21} color={meta.color} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={dc.label}>{meta.label}</Text>
        <View style={dc.badgeRow}>
          <View
            style={[
              dc.badge,
              verified
                ? { backgroundColor: "#10B98118", borderColor: "#10B98140" }
                : { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" },
            ]}
          >
            <Ionicons
              name={verified ? "shield-checkmark" : "time-outline"}
              size={9}
              color={verified ? "#10B981" : "#F59E0B"}
            />
            <Text
              style={[dc.badgeTxt, { color: verified ? "#10B981" : "#F59E0B" }]}
            >
              {verified ? "VERIFIED" : "IN REVIEW"}
            </Text>
          </View>
        </View>
      </View>
      {doc.documentUrl && (
        <Pressable
          onPress={() => onView(doc.documentUrl, meta.label)}
          style={({ pressed }) => [
            dc.viewBtn,
            {
              borderColor: `${meta.color}40`,
              backgroundColor: `${meta.color}12`,
            },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Ionicons name="eye-outline" size={13} color={meta.color} />
          <Text style={[dc.viewTxt, { color: meta.color }]}>View</Text>
        </Pressable>
      )}
    </View>
  );
};

export default DocCard;

