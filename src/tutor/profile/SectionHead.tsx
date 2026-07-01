import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { sh } from "./styles";

export const SH = ({
  icon,
  title,
  accent = T.primary,
  badge,
}: {
  icon: any;
  title: string;
  accent?: string;
  badge?: number;
}) => (
  <View style={sh.wrap}>
    <View style={[sh.iconBg, { backgroundColor: `${accent}12` }]}>
      <Ionicons name={icon} size={13} color={accent} />
    </View>
    <Text style={sh.title}>{title}</Text>
    {badge !== undefined && badge > 0 && (
      <View
        style={[
          sh.badge,
          { backgroundColor: `${accent}12`, borderColor: `${accent}25` },
        ]}
      >
        <Text style={[sh.badgeTxt, { color: accent }]}>{badge}</Text>
      </View>
    )}
  </View>
);

export default SH;

