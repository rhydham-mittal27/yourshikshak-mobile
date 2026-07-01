import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { s, chip } from "./styles";
import { Chip } from "./Chip";

const AREAS_INITIAL = 10;

export const AreaChips = ({
  locations,
  hasDivider,
}: {
  locations: string[];
  hasDivider: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? locations : locations.slice(0, AREAS_INITIAL);
  const hidden = locations.length - AREAS_INITIAL;
  return (
    <View style={hasDivider ? s.areasDivider : undefined}>
      <Text style={s.areasLabel}>Areas / Localities</Text>
      <View style={s.chipWrap}>
        {visible.map((loc, i) => (
          <Chip key={i} label={loc} color="#E11D48" />
        ))}
        {!expanded && hidden > 0 && (
          <Pressable
            onPress={() => setExpanded(true)}
            style={[
              chip.wrap,
              { backgroundColor: "#E11D4810", borderColor: "#E11D4828" },
            ]}
          >
            <Text style={[chip.txt, { color: "#E11D48" }]}>+{hidden} more</Text>
          </Pressable>
        )}
        {expanded && (
          <Pressable
            onPress={() => setExpanded(false)}
            style={[
              chip.wrap,
              { backgroundColor: "#94A3B810", borderColor: "#94A3B828" },
            ]}
          >
            <Text style={[chip.txt, { color: "#94A3B8" }]}>Show less</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
};

export default AreaChips;

