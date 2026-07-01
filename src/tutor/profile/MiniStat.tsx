import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ms } from "./styles";

export const MiniStat = ({
  icon,
  color,
  bg,
  label,
  value,
}: {
  icon: any;
  color: string;
  bg: string;
  label: string;
  value: string | number;
}) => (
  <View style={[ms.card, { backgroundColor: `${color}07` }]}>
    <View style={[ms.iconBox, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={17} color={color} />
    </View>
    <Text style={[ms.value, { color }]}>{value ?? 0}</Text>
    <Text style={ms.label} numberOfLines={1}>
      {label}
    </Text>
  </View>
);

export default MiniStat;

