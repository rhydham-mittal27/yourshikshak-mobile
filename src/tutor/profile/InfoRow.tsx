import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { ir } from "./styles";

export const IRow = ({
  icon,
  label,
  value,
  accent = T.primary,
  onPress,
  last,
}: {
  icon: any;
  label: string;
  value?: string | null;
  accent?: string;
  onPress?: () => void;
  last?: boolean;
}) => {
  if (!value) return null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        ir.wrap,
        !last && ir.border,
        pressed && {
          backgroundColor: `${accent}08`,
          transform: [{ scale: 0.99 }],
        },
      ]}
    >
      <View style={[ir.iconBox, { backgroundColor: `${accent}14` }]}>
        <Ionicons name={icon} size={15} color={accent} />
      </View>
      <View style={ir.text}>
        <Text style={ir.lbl}>{label}</Text>
        <Text style={[ir.val, onPress && { color: accent }]} numberOfLines={1}>
          {value}
        </Text>
      </View>
      {onPress && (
        <View style={[ir.arrowBox, { backgroundColor: `${accent}10` }]}>
          <Ionicons name="chevron-forward" size={11} color={accent} />
        </View>
      )}
    </Pressable>
  );
};

export default IRow;

