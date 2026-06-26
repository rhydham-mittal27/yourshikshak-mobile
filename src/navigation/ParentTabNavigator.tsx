/**
 * ParentTabNavigator — custom bottom-tab navigation for the Parent role.
 * Uses a Stack with a persistent custom tab bar (no @react-navigation/bottom-tabs).
 */

import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp } from "@react-navigation/native";
import { T } from "../constants/colors";
import { RootStackParamList } from "./AppNavigator";

import ParentDashboardScreen from "../screens/ParentDashboardScreen";
import ParentProgressScreen from "../screens/ParentProgressScreen";
import ParentClassesScreen from "../screens/ParentClassesScreen";
import ParentPaymentsScreen from "../screens/ParentPaymentsScreen";
import ParentNotificationsScreen from "../screens/ParentNotificationsScreen";

type Tab = "home" | "progress" | "classes" | "payments" | "notifications";

const TABS: Array<{
  id: Tab;
  label: string;
  icon: string;
  iconActive: string;
}> = [
  { id: "home",          label: "Home",          icon: "home-outline",          iconActive: "home" },
  { id: "progress",      label: "Progress",      icon: "bar-chart-outline",     iconActive: "bar-chart" },
  { id: "classes",       label: "Classes",       icon: "calendar-outline",      iconActive: "calendar" },
  { id: "payments",      label: "Payments",      icon: "wallet-outline",        iconActive: "wallet" },
  { id: "notifications", label: "Alerts",        icon: "notifications-outline", iconActive: "notifications" },
];

// ─── Tab Bar ──────────────────────────────────────────────────────────────────

const TabBar = ({
  active,
  onPress,
}: {
  active: Tab;
  onPress: (tab: Tab) => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={tb.item}
            onPress={() => onPress(tab.id)}
            hitSlop={4}
          >
            {isActive && <View style={tb.activeIndicator} />}
            <View style={tb.iconWrap}>
              <Ionicons
                name={(isActive ? tab.iconActive : tab.icon) as any}
                size={22}
                color={isActive ? T.primary : T.mutedFg}
              />
            </View>
            <Text style={[tb.label, isActive && tb.labelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: T.paper,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    gap: 3,
    paddingVertical: 4,
  },
  activeIndicator: {
    position: "absolute",
    top: -9,
    width: 28,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.primary,
  },
  iconWrap: {
    width: 44,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {},
  label: {
    fontSize: 10,
    fontWeight: "600",
    color: T.mutedFg,
    letterSpacing: 0.1,
  },
  labelActive: {
    color: T.primary,
    fontWeight: "700",
  },
});

// ─── Navigator ────────────────────────────────────────────────────────────────

const ParentTabNavigator = () => {
  const route = useRoute<RouteProp<RootStackParamList, "ParentDashboard">>();
  const { userId, name, role } = route.params;
  const [activeTab, setActiveTab] = useState<Tab>("home");

  const screenProps = { userId, name, role };

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <ParentDashboardScreen />;
      case "progress":
        return <ParentProgressScreen {...screenProps} />;
      case "classes":
        return <ParentClassesScreen {...screenProps} />;
      case "payments":
        return <ParentPaymentsScreen {...screenProps} />;
      case "notifications":
        return <ParentNotificationsScreen {...screenProps} />;
    }
  };

  return (
    <View style={nav.root}>
      <View style={nav.content}>{renderScreen()}</View>
      <TabBar active={activeTab} onPress={setActiveTab} />
    </View>
  );
};

const nav = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  content: { flex: 1 },
});

export default ParentTabNavigator;
