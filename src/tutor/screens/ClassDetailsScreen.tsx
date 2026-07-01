import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  StatusBar,
  Image,
  Linking,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../../navigation/AppNavigator";
import { T } from "../../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "ClassDetails">;
type Route = RouteProp<RootStackParamList, "ClassDetails">;

// â”€â”€â”€ Mock data (replace with API call) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const MOCK_CLASS = {
  id: "cls_001",
  subject: "Mathematics",
  board: "CBSE",
  grade: "10",
  mode: "OFFLINE" as "ONLINE" | "OFFLINE",
  location: "Sector 14, Gurugram",
  schedule: {
    days: ["Monday", "Wednesday", "Friday"],
    time: "5:00 PM",
    duration: 60,
  },
  fee: {
    amount: 3500,
    cycle: "monthly",
    nextDue: "2026-07-01",
    status: "PAID" as "PAID" | "DUE" | "OVERDUE",
  },
  teacher: {
    name: "Priya Sharma",
    photo: null as string | null,
    initials: "PS",
    qualifications: ["B.Tech (IIT Delhi)", "M.Sc Mathematics"],
    experience: 7,
    rating: 4.8,
    reviews: 42,
    phone: "+91 98765 43210",
  },
  status: "ACTIVE" as "ACTIVE" | "PAUSED" | "DISCONTINUED",
};

// â”€â”€â”€ Sub-components â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ScalePressable = ({
  onPress,
  children,
  style,
}: {
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
}) => {
  const scale = useRef(new Animated.Value(1)).current;
  return (
    <Pressable
      onPressIn={() =>
        Animated.timing(scale, {
          toValue: 0.97,
          duration: 100,
          useNativeDriver: true,
        }).start()
      }
      onPressOut={() =>
        Animated.timing(scale, {
          toValue: 1,
          duration: 160,
          useNativeDriver: true,
        }).start()
      }
      onPress={onPress}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
};

const SectionCard = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View
      style={[
        cd.card,
        {
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [12, 0],
              }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
};

const InfoRow = ({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: string;
  label: string;
  value: string;
  valueColor?: string;
}) => (
  <View style={cd.infoRow}>
    <View style={cd.infoIconWrap}>
      <Ionicons name={icon as any} size={14} color={T.primary} />
    </View>
    <Text style={cd.infoLabel}>{label}</Text>
    <Text style={[cd.infoValue, valueColor ? { color: valueColor } : {}]}>
      {value}
    </Text>
  </View>
);

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const ClassDetailsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const cls = MOCK_CLASS;

  const headerAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const statusColor =
    cls.status === "ACTIVE"
      ? T.success
      : cls.status === "PAUSED"
        ? T.warning
        : T.error;
  const feeColor =
    cls.fee.status === "PAID"
      ? T.success
      : cls.fee.status === "DUE"
        ? T.warning
        : T.error;

  const stars = Array.from(
    { length: 5 },
    (_, i) => i < Math.round(cls.teacher.rating),
  );

  return (
    <View style={cd.root}>
      <StatusBar barStyle="light-content" />

      {/* â”€â”€ Hero Header â”€â”€ */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[cd.hero, { paddingTop: insets.top + 8 }]}
      >
        <View style={cd.orbA} pointerEvents="none" />
        <View style={cd.orbB} pointerEvents="none" />

        <Animated.View style={{ opacity: headerAnim }}>
          <View style={cd.heroTop}>
            <Pressable onPress={() => navigation.goBack()} style={cd.backBtn}>
              <Ionicons
                name="chevron-back"
                size={22}
                color="rgba(255,255,255,0.8)"
              />
            </Pressable>
            <View
              style={[
                cd.statusPill,
                {
                  backgroundColor: `${statusColor}22`,
                  borderColor: `${statusColor}44`,
                },
              ]}
            >
              <View style={[cd.statusDot, { backgroundColor: statusColor }]} />
              <Text style={[cd.statusTxt, { color: statusColor }]}>
                {cls.status}
              </Text>
            </View>
          </View>

          <Text style={cd.heroSubject}>{cls.subject}</Text>
          <View style={cd.heroMeta}>
            <View style={cd.metaChip}>
              <Ionicons
                name="school-outline"
                size={11}
                color="rgba(255,255,255,0.6)"
              />
              <Text style={cd.metaChipTxt}>{cls.board}</Text>
            </View>
            <View style={cd.metaChip}>
              <Ionicons
                name="layers-outline"
                size={11}
                color="rgba(255,255,255,0.6)"
              />
              <Text style={cd.metaChipTxt}>Grade {cls.grade}</Text>
            </View>
            <View style={cd.metaChip}>
              <Ionicons
                name={
                  cls.mode === "ONLINE" ? "videocam-outline" : "home-outline"
                }
                size={11}
                color="rgba(255,255,255,0.6)"
              />
              <Text style={cd.metaChipTxt}>
                {cls.mode === "ONLINE" ? "Online" : "Offline"}
              </Text>
            </View>
          </View>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={cd.scroll}
        contentContainerStyle={[
          cd.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€ Teacher Card â”€â”€ */}
        <SectionCard delay={60}>
          <Text style={cd.sectionHead}>Your Teacher</Text>
          <View style={cd.teacherRow}>
            {cls.teacher.photo ? (
              <Image source={{ uri: cls.teacher.photo }} style={cd.avatar} />
            ) : (
              <LinearGradient
                colors={[T.primary, T.primaryDark]}
                style={cd.avatarFallback}
              >
                <Text style={cd.avatarInitials}>{cls.teacher.initials}</Text>
              </LinearGradient>
            )}
            <View style={{ flex: 1 }}>
              <Text style={cd.teacherName}>{cls.teacher.name}</Text>
              <View style={cd.starsRow}>
                {stars.map((filled, i) => (
                  <Ionicons
                    key={i}
                    name={filled ? "star" : "star-outline"}
                    size={12}
                    color={T.warning}
                    style={{ marginRight: 1 }}
                  />
                ))}
                <Text style={cd.ratingTxt}>
                  {cls.teacher.rating} Â· {cls.teacher.reviews} reviews
                </Text>
              </View>
              <Text style={cd.expTxt}>
                {cls.teacher.experience} years experience
              </Text>
            </View>
            <ScalePressable
              onPress={() => Linking.openURL(`tel:${cls.teacher.phone}`)}
              style={cd.callBtn}
            >
              <Ionicons name="call-outline" size={16} color={T.primary} />
            </ScalePressable>
          </View>

          <View style={cd.divider} />

          <View style={cd.qualWrap}>
            {cls.teacher.qualifications.map((q, i) => (
              <View key={i} style={cd.qualChip}>
                <Ionicons name="ribbon-outline" size={11} color={T.primary} />
                <Text style={cd.qualTxt}>{q}</Text>
              </View>
            ))}
          </View>
        </SectionCard>

        {/* â”€â”€ Schedule Card â”€â”€ */}
        <SectionCard delay={120}>
          <Text style={cd.sectionHead}>Schedule</Text>
          <InfoRow
            icon="calendar-outline"
            label="Days"
            value={cls.schedule.days.join(", ")}
          />
          <InfoRow icon="time-outline" label="Time" value={cls.schedule.time} />
          <InfoRow
            icon="timer-outline"
            label="Duration"
            value={`${cls.schedule.duration} minutes`}
          />
          {cls.mode === "OFFLINE" && (
            <InfoRow
              icon="location-outline"
              label="Location"
              value={cls.location}
            />
          )}
        </SectionCard>

        {/* â”€â”€ Fee Card â”€â”€ */}
        <SectionCard delay={180}>
          <Text style={cd.sectionHead}>Fees & Payment</Text>
          <View style={cd.feeRow}>
            <View>
              <Text style={cd.feeAmount}>
                â‚¹{cls.fee.amount.toLocaleString("en-IN")}
              </Text>
              <Text style={cd.feeCycle}>per {cls.fee.cycle}</Text>
            </View>
            <View
              style={[
                cd.feeBadge,
                {
                  backgroundColor: `${feeColor}15`,
                  borderColor: `${feeColor}30`,
                },
              ]}
            >
              <Text style={[cd.feeBadgeTxt, { color: feeColor }]}>
                {cls.fee.status}
              </Text>
            </View>
          </View>
          <InfoRow
            icon="calendar-outline"
            label="Next Due"
            value={new Date(cls.fee.nextDue).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          />
        </SectionCard>

        {/* â”€â”€ Actions â”€â”€ */}
        <SectionCard delay={240}>
          <Text style={cd.sectionHead}>Actions</Text>
          <View style={cd.actionsGrid}>
            {[
              {
                icon: "calendar-outline",
                label: "Reschedule",
                color: T.primary,
                onPress: () =>
                  navigation.navigate("RescheduleClass", {
                    classId: cls.id,
                    subject: cls.subject,
                  }),
              },
              {
                icon: "pause-circle-outline",
                label: "Pause Class",
                color: T.warning,
                onPress: () =>
                  navigation.navigate("PauseClass", {
                    classId: cls.id,
                    subject: cls.subject,
                  }),
              },
              {
                icon: "swap-horizontal-outline",
                label: "Change Teacher",
                color: T.info,
                onPress: () => {},
              },
              {
                icon: "close-circle-outline",
                label: "Discontinue",
                color: T.error,
                onPress: () => {},
              },
            ].map((action, i) => (
              <ScalePressable
                key={i}
                onPress={action.onPress}
                style={cd.actionTile}
              >
                <View
                  style={[
                    cd.actionIcon,
                    { backgroundColor: `${action.color}12` },
                  ]}
                >
                  <Ionicons
                    name={action.icon as any}
                    size={20}
                    color={action.color}
                  />
                </View>
                <Text style={[cd.actionLabel, { color: action.color }]}>
                  {action.label}
                </Text>
              </ScalePressable>
            ))}
          </View>
        </SectionCard>
      </ScrollView>

      {/* â”€â”€ Calendar FAB â”€â”€ */}
      <ScalePressable
        onPress={() =>
          navigation.navigate("ClassCalendar", { classId: cls.id })
        }
        style={[cd.fab, { bottom: insets.bottom + 16 }]}
      >
        <LinearGradient colors={[T.primary, T.primaryDark]} style={cd.fabGrad}>
          <Ionicons name="calendar" size={20} color="#fff" />
          <Text style={cd.fabTxt}>View Calendar</Text>
        </LinearGradient>
      </ScalePressable>
    </View>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const cd = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  hero: { paddingHorizontal: T.base, paddingBottom: T.lg, overflow: "hidden" },
  orbA: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${T.primary}10`,
    top: -60,
    right: -50,
  } as any,
  orbB: {
    position: "absolute",
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${T.secondary}08`,
    bottom: -40,
    left: 30,
  } as any,
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: T.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    borderWidth: 1,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusTxt: { fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  heroSubject: {
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
    marginBottom: 10,
  },
  heroMeta: { flexDirection: "row", gap: 8 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  metaChipTxt: {
    fontSize: 11,
    color: "rgba(255,255,255,0.65)",
    fontWeight: "600",
  },

  scroll: { flex: 1 },
  content: { padding: T.base, gap: 12 },

  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    padding: T.base,
    borderWidth: 1,
    borderColor: T.border,
  },
  sectionHead: {
    fontSize: 13,
    fontWeight: "800",
    color: T.textDisabled,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: T.sm,
  },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: T.border,
  },
  avatarFallback: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontSize: 18, fontWeight: "800", color: "#fff" },
  teacherName: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    marginBottom: 4,
  },
  starsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 3,
  },
  ratingTxt: {
    fontSize: 11,
    color: T.textSecondary,
    marginLeft: 4,
    fontWeight: "600",
  },
  expTxt: { fontSize: 11, color: T.textSecondary },
  callBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${T.primary}20`,
  },
  divider: { height: 1, backgroundColor: T.border, marginVertical: 10 },
  qualWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  qualChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.muted,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 99,
  },
  qualTxt: { fontSize: 11, color: T.textSecondary, fontWeight: "600" },

  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  infoIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${T.primary}10`,
    alignItems: "center",
    justifyContent: "center",
  },
  infoLabel: {
    flex: 1,
    fontSize: 13,
    color: T.textSecondary,
    fontWeight: "600",
  },
  infoValue: {
    fontSize: 13,
    color: T.textPrimary,
    fontWeight: "700",
    textAlign: "right",
    maxWidth: "55%",
  },

  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  feeAmount: {
    fontSize: 24,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.5,
  },
  feeCycle: {
    fontSize: 11,
    color: T.textSecondary,
    fontWeight: "600",
    marginTop: 1,
  },
  feeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 99,
    borderWidth: 1,
  },
  feeBadgeTxt: { fontSize: 12, fontWeight: "800", letterSpacing: 0.3 },

  actionsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionTile: {
    width: "47%",
    backgroundColor: T.muted,
    borderRadius: T.radiusLg,
    padding: 14,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  actionLabel: { fontSize: 12, fontWeight: "700", textAlign: "center" },

  fab: { position: "absolute", alignSelf: "center" },
  fabGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 13,
    borderRadius: 99,
  },
  fabTxt: { color: "#fff", fontSize: 14, fontWeight: "700" },
});

export default ClassDetailsScreen;

