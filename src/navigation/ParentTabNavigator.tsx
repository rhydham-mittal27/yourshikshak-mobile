import React, { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Animated,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { T } from "../constants/colors";
import { AUTH_STORAGE_KEY, setAuthToken } from "../api/client";
import { RootStackParamList } from "./AppNavigator";

import ParentDashboardScreen from "../parent/screens/ParentDashboardScreen";
import ParentProgressScreen from "../parent/screens/ParentProgressScreen";
import ParentClassesScreen from "../parent/screens/ParentClassesScreen";
import ParentPaymentsScreen from "../parent/screens/ParentPaymentsScreen";
import ParentNotificationsScreen from "../parent/screens/ParentNotificationsScreen";

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type Tab = "home" | "progress" | "classes" | "payments";

const MAIN_TABS: Array<{ id: Tab; label: string; icon: string; iconActive: string }> = [
  { id: "home",     label: "Home",     icon: "home-outline",      iconActive: "home"      },
  { id: "progress", label: "Progress", icon: "bar-chart-outline",  iconActive: "bar-chart" },
  { id: "classes",  label: "Classes",  icon: "calendar-outline",   iconActive: "calendar"  },
  { id: "payments", label: "Payments", icon: "wallet-outline",     iconActive: "wallet"    },
];

// â”€â”€â”€ More Sheet â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MoreSheet = ({
  visible,
  name,
  onClose,
  onNavigate,
  onSignOut,
}: {
  visible: boolean;
  name: string;
  onClose: () => void;
  onNavigate: (screen: keyof RootStackParamList) => void;
  onSignOut: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(300)).current;
  const [signingOut, setSigningOut] = useState(false);

  React.useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible]);

  const MORE_ITEMS: Array<{
    icon: string;
    label: string;
    sub: string;
    color: string;
    bg: string;
    action: () => void;
  }> = [
    { icon: "notifications-outline", label: "Notifications", sub: "Alerts & updates",      color: T.primary,   bg: `${T.primary}15`,   action: () => { onClose(); onNavigate("Notifications"); } },
    { icon: "settings-outline",      label: "Settings",      sub: "Preferences & account", color: T.secondary, bg: `${T.secondary}15`, action: () => { onClose(); onNavigate("ParentSettings"); } },
    { icon: "person-outline",        label: "Child Profile", sub: "Edit student details",  color: T.success,   bg: `${T.success}15`,   action: () => { onClose(); onNavigate("ChildProfile"); } },
    { icon: "swap-horizontal-outline", label: "Shift Request", sub: "Move current cycle sessions", color: T.info, bg: `${T.info}15`, action: () => { onClose(); onNavigate("ParentShiftRequest"); } },
  ];

  const handleSignOut = async () => {
    setSigningOut(true);
    onClose();
    onSignOut();
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={ms.overlay} />
      </TouchableWithoutFeedback>
      <Animated.View style={[ms.sheet, { paddingBottom: Math.max(insets.bottom, 16), transform: [{ translateY: slideAnim }] }]}>
        {/* Handle */}
        <View style={ms.handle} />

        {/* User pill */}
        <View style={ms.userRow}>
          <View style={ms.avatar}>
            <Text style={ms.avatarTxt}>{name ? name.charAt(0).toUpperCase() : "P"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={ms.userName}>{name}</Text>
            <View style={ms.roleBadge}>
              <Text style={ms.roleTxt}>PARENT</Text>
            </View>
          </View>
        </View>

        <View style={ms.divider} />

        {/* Menu items */}
        {MORE_ITEMS.map((item) => (
          <Pressable
            key={item.label}
            style={({ pressed }) => [ms.item, pressed && { opacity: 0.7 }]}
            onPress={item.action}
          >
            <View style={[ms.iconBox, { backgroundColor: item.bg }]}>
              <Ionicons name={item.icon as any} size={18} color={item.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={ms.itemLabel}>{item.label}</Text>
              <Text style={ms.itemSub}>{item.sub}</Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color={T.textDisabled} />
          </Pressable>
        ))}

        <View style={ms.divider} />

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [ms.item, pressed && { opacity: 0.7 }]}
          onPress={handleSignOut}
          disabled={signingOut}
        >
          <View style={[ms.iconBox, { backgroundColor: `${T.error}15` }]}>
            {signingOut
              ? <ActivityIndicator size="small" color={T.error} />
              : <Ionicons name="log-out-outline" size={18} color={T.error} />}
          </View>
          <Text style={[ms.itemLabel, { color: T.error }]}>Sign Out</Text>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

const ms = StyleSheet.create({
  overlay:   { ...StyleSheet.absoluteFill, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet:     { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: T.paper, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: 12, paddingHorizontal: 16, shadowColor: "#000", shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width: 0, height: -4 }, elevation: 16 },
  handle:    { width: 36, height: 4, borderRadius: 2, backgroundColor: T.border, alignSelf: "center", marginBottom: 16 },
  userRow:   { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  avatar:    { width: 44, height: 44, borderRadius: 22, backgroundColor: T.primary, alignItems: "center", justifyContent: "center" },
  avatarTxt: { fontSize: 18, fontWeight: "800", color: "#fff" },
  userName:  { fontSize: 15, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.2 },
  roleBadge: { backgroundColor: `${T.primary}15`, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2, alignSelf: "flex-start", marginTop: 3 },
  roleTxt:   { fontSize: 9, fontWeight: "800", color: T.primary, letterSpacing: 0.8 },
  divider:   { height: 1, backgroundColor: T.border, marginVertical: 8 },
  item:      { flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 13 },
  iconBox:   { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  itemLabel: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  itemSub:   { fontSize: 11, color: T.textDisabled, marginTop: 1 },
});

// â”€â”€â”€ Tab Bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TabBar = ({
  active,
  onPress,
  onMore,
}: {
  active: Tab;
  onPress: (tab: Tab) => void;
  onMore: () => void;
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tb.bar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      {MAIN_TABS.map((tab) => {
        const isActive = active === tab.id;
        return (
          <Pressable key={tab.id} style={tb.item} onPress={() => onPress(tab.id)} hitSlop={4}>
            {isActive && <View style={tb.activeIndicator} />}
            <View style={tb.iconWrap}>
              <Ionicons
                name={(isActive ? tab.iconActive : tab.icon) as any}
                size={22}
                color={isActive ? T.primary : T.mutedFg}
              />
            </View>
            <Text style={[tb.label, isActive && tb.labelActive]}>{tab.label}</Text>
          </Pressable>
        );
      })}

      {/* More */}
      <Pressable style={tb.item} onPress={onMore} hitSlop={4}>
        <View style={tb.iconWrap}>
          <Ionicons name="grid-outline" size={22} color={T.mutedFg} />
        </View>
        <Text style={tb.label}>More</Text>
      </Pressable>
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
  item:            { flex: 1, alignItems: "center", gap: 3, paddingVertical: 4 },
  activeIndicator: { position: "absolute", top: -9, width: 28, height: 3, borderRadius: 2, backgroundColor: T.primary },
  iconWrap:        { width: 44, height: 32, alignItems: "center", justifyContent: "center" },
  label:           { fontSize: 10, fontWeight: "600", color: T.mutedFg, letterSpacing: 0.1 },
  labelActive:     { color: T.primary, fontWeight: "700" },
});

// â”€â”€â”€ Navigator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ParentTabNavigator = () => {
  const route = useRoute<RouteProp<RootStackParamList, "ParentDashboard">>();
  const navigation = useNavigation<any>();
  const { userId, name, role } = route.params;

  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [moreOpen, setMoreOpen] = useState(false);

  const screenProps = { userId, name, role };

  const signOut = async () => {
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
    setAuthToken(null);
    navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
  };

  const renderScreen = () => {
    switch (activeTab) {
      case "home":     return <ParentDashboardScreen />;
      case "progress": return <ParentProgressScreen {...screenProps} />;
      case "classes":  return <ParentClassesScreen {...screenProps} />;
      case "payments": return <ParentPaymentsScreen {...screenProps} />;
    }
  };

  return (
    <View style={nav.root}>
      <View style={nav.content}>{renderScreen()}</View>
      <TabBar active={activeTab} onPress={setActiveTab} onMore={() => setMoreOpen(true)} />
      <MoreSheet
        visible={moreOpen}
        name={name}
        onClose={() => setMoreOpen(false)}
        onNavigate={(screen) => navigation.navigate(screen)}
        onSignOut={signOut}
      />
    </View>
  );
};

const nav = StyleSheet.create({
  root:    { flex: 1, backgroundColor: T.background },
  content: { flex: 1 },
});

export default ParentTabNavigator;

