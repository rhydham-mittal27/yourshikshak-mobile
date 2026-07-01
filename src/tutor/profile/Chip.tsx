import React from "react";
import { View, Text } from "react-native";
import { T } from "../../constants/colors";
import { chip } from "./styles";
import { CHIP_PALETTE } from "./constants";

export const Chip = ({
  label,
  color = T.primary,
  idx = 0,
  rainbow = false,
}: {
  label: string;
  color?: string;
  idx?: number;
  rainbow?: boolean;
}) => {
  const c = rainbow ? CHIP_PALETTE[idx % CHIP_PALETTE.length] : color;
  return (
    <View
      style={[chip.wrap, { backgroundColor: `${c}10`, borderColor: `${c}28` }]}
    >
      <Text style={[chip.txt, { color: c }]}>{label}</Text>
    </View>
  );
};

export default Chip;

