/**
 * ParentDashboardScreen.tsx — YourShikshak
 * Mirrors TutorDashboardScreen exactly: same layout, same colours,
 * same card shapes, same strip/KPI/section-head patterns.
 *
 * Two states:
 *   1. Empty  — no active class: how-it-works + "Request a Tutor" CTA
 *   2. Active — KPI strip + card grid + upcoming sessions + teacher card + activity feed
 */

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  StatusBar,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Modal,
  TextInput,
  Keyboard,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getParentDashboard,
  raiseParentConcern,
  setAuthToken,
  AUTH_STORAGE_KEY,
  ParentDashboardData,
  ParentTutorRequest,
} from "../api/client";
import { T } from "../constants/colors";
import { useModal } from "../context/ModalContext";

const SCREEN_W = Dimensions.get("window").width;
const SIDEBAR_W = SCREEN_W * 0.72;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    weekday: "short",
  });

const hoursUntil = (dateStr: string, timeSlot: string): string => {
  try {
    const [time, period] = timeSlot.split(" ");
    const [hStr, mStr] = (time || "").split(":");
    let h = parseInt(hStr || "0", 10);
    const m = parseInt(mStr || "0", 10);
    if (period?.toUpperCase() === "PM" && h !== 12) h += 12;
    if (period?.toUpperCase() === "AM" && h === 12) h = 0;
    const target = new Date(dateStr);
    target.setHours(h, m, 0, 0);
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return "now";
    const hrs = Math.floor(diff / 3_600_000);
    if (hrs < 1) return `${Math.floor(diff / 60_000)}m`;
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  } catch {
    return "—";
  }
};

const greeting = () => {
  const h = new Date().getHours();
  if (h < 12) return "Good morning,";
  if (h < 17) return "Good afternoon,";
  return "Good evening,";
};

const STAGE_ORDER: ParentTutorRequest["stage"][] = [
  "REQUEST_RECEIVED",
  "DEMO_SCHEDULED",
  "AWAITING_APPROVAL",
];
const STAGE_LABEL: Record<ParentTutorRequest["stage"], string> = {
  REQUEST_RECEIVED: "Request Received",
  LEAD_CREATED: "Request Received",
  TEACHER_ASSIGNED_FOR_DEMO: "Demo Scheduled",
  DEMO_SCHEDULED: "Demo Scheduled",
  AWAITING_APPROVAL: "Awaiting Approval",
};

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Skeleton = ({
  w,
  h,
  radius = 8,
}: {
  w: number | string;
  h: number;
  radius?: number;
}) => {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: radius,
        backgroundColor: "#E2E8F0",
        opacity: anim,
      }}
    />
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiProps {
  icon: any;
  iconColor: string;
  iconBg: string;
  label: string;
  value: string;
  sub?: string;
  subIcon?: any;
  subColor?: string;
  delay?: number;
}

const KpiCard = ({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  sub,
  subIcon,
  subColor,
  delay = 0,
}: KpiProps) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 380,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 380,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[
        kpi.outer,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={kpi.card}>
        <View style={kpi.topRow}>
          <View style={[kpi.iconBox, { backgroundColor: iconBg }]}>
            <Ionicons name={icon} size={18} color={iconColor} />
          </View>
          <Text style={kpi.label} numberOfLines={2}>
            {label}
          </Text>
        </View>
        <Text style={kpi.value}>{value}</Text>
        {sub ? (
          <View style={kpi.subRow}>
            {subIcon && (
              <Ionicons
                name={subIcon}
                size={11}
                color={subColor ?? T.mutedFg}
                style={{ marginRight: 3 }}
              />
            )}
            <Text style={[kpi.sub, subColor ? { color: subColor } : {}]}>
              {sub}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
};

const KpiSkeleton = () => (
  <View style={[kpi.outer]}>
    <View style={[kpi.card, { gap: 10 }]}>
      <Skeleton w={36} h={36} radius={10} />
      <Skeleton w="70%" h={14} />
      <Skeleton w="50%" h={22} />
      <Skeleton w="60%" h={11} />
    </View>
  </View>
);

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHead = ({
  icon,
  title,
  count,
}: {
  icon: any;
  title: string;
  count?: number;
}) => (
  <View style={s.sectionHead}>
    <View style={[s.sectionIconBg, { backgroundColor: `${T.primary}15` }]}>
      <Ionicons name={icon} size={15} color={T.primary} />
    </View>
    <Text style={s.sectionHeadTxt}>{title}</Text>
    {count !== undefined && (
      <View style={s.sectionBadge}>
        <Text style={s.sectionBadgeTxt}>{count}</Text>
      </View>
    )}
  </View>
);

// ─── Empty tab state (bouncing emoji) ────────────────────────────────────────

const EmptyTabState = ({
  emoji,
  headline,
  sub,
  iconColor,
}: {
  emoji: string;
  headline: string;
  sub: string;
  iconColor: string;
}) => {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: -10,
          duration: 420,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 360,
          easing: Easing.in(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.delay(2200),
      ]),
    ).start();
  }, []);
  return (
    <Animated.View style={[emp.wrap, { opacity: fadeAnim }]}>
      <Animated.View
        style={[
          emp.iconRing,
          {
            borderColor: `${iconColor}25`,
            transform: [{ translateY: bounceAnim }],
          },
        ]}
      >
        <View style={[emp.iconInner, { backgroundColor: `${iconColor}12` }]}>
          <Text style={emp.emoji}>{emoji}</Text>
        </View>
      </Animated.View>
      <Text style={emp.headline}>{headline}</Text>
      <Text style={emp.sub}>{sub}</Text>
    </Animated.View>
  );
};

// ─── Request Tutor bottom-sheet ───────────────────────────────────────────────

const RequestSheet = ({
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (subject: string, grade: string) => void;
  submitting: boolean;
}) => {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={am.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[am.sheet, { marginBottom: kbHeight }]}>
          <View style={am.handle} />
          <View style={am.header}>
            <View
              style={[am.headerIcon, { backgroundColor: `${T.primary}12` }]}
            >
              <Ionicons name="school-outline" size={20} color={T.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={am.headerTitle}>Request a Tutor</Text>
              <Text style={am.headerSub}>Tell us your child's needs</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={T.mutedFg} />
            </Pressable>
          </View>
          <Text style={am.fieldLabel}>Subject *</Text>
          <TextInput
            style={am.input}
            placeholder="e.g. Mathematics, Science, English…"
            placeholderTextColor={T.textDisabled}
            value={subject}
            onChangeText={setSubject}
          />
          <Text style={am.fieldLabel}>Grade / Class *</Text>
          <TextInput
            style={am.input}
            placeholder="e.g. Class 8, Grade 10…"
            placeholderTextColor={T.textDisabled}
            value={grade}
            onChangeText={setGrade}
          />
          <Pressable
            style={[
              am.submitBtn,
              (submitting || !subject.trim() || !grade.trim()) && {
                opacity: 0.5,
              },
            ]}
            onPress={() => onSubmit(subject, grade)}
            disabled={submitting || !subject.trim() || !grade.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={am.submitTxt}>Submit Request</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ─── Concern bottom-sheet ─────────────────────────────────────────────────────

const ConcernSheet = ({
  visible,
  onClose,
  onSubmit,
  submitting,
}: {
  visible: boolean;
  onClose: () => void;
  onSubmit: (msg: string) => void;
  submitting: boolean;
}) => {
  const [msg, setMsg] = useState("");
  const [kbHeight, setKbHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKbHeight(e.endCoordinates.height),
    );
    const hide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKbHeight(0),
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={am.overlay}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[am.sheet, { marginBottom: kbHeight }]}>
          <View style={am.handle} />
          <View style={am.header}>
            <View style={[am.headerIcon, { backgroundColor: `${T.error}12` }]}>
              <Ionicons name="alert-circle-outline" size={20} color={T.error} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={am.headerTitle}>Raise a Concern</Text>
              <Text style={am.headerSub}>Our team will follow up shortly</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={20} color={T.mutedFg} />
            </Pressable>
          </View>
          <Text style={am.fieldLabel}>Describe your concern *</Text>
          <TextInput
            style={[am.input, { minHeight: 80, textAlignVertical: "top" }]}
            placeholder="e.g. Tutor was late, topic not covered…"
            placeholderTextColor={T.textDisabled}
            value={msg}
            onChangeText={setMsg}
            multiline
            maxLength={500}
          />
          <Pressable
            style={[
              am.submitBtn,
              { backgroundColor: T.error },
              (!msg.trim() || submitting) && { opacity: 0.5 },
            ]}
            onPress={() => onSubmit(msg)}
            disabled={!msg.trim() || submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="send-outline" size={16} color="#fff" />
                <Text style={am.submitTxt}>Send Concern</Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
};

// ─── Sidebar (drawer) ─────────────────────────────────────────────────────────

const Sidebar = ({
  name,
  sidebarAnim,
  overlayAnim,
  sidebarOpen,
  closeSidebar,
  insets,
  onSignOut,
}: {
  name: string;
  sidebarAnim: Animated.Value;
  overlayAnim: Animated.Value;
  sidebarOpen: boolean;
  closeSidebar: () => void;
  insets: { top: number; bottom: number };
  onSignOut: () => void;
}) => (
  <>
    {sidebarOpen && (
      <TouchableWithoutFeedback onPress={closeSidebar}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            sb.overlay,
            { opacity: overlayAnim },
          ]}
        />
      </TouchableWithoutFeedback>
    )}
    <Animated.View
      style={[
        sb.drawer,
        {
          transform: [{ translateX: sidebarAnim }],
          paddingTop: Math.max(insets.top, 20),
        },
      ]}
      pointerEvents={sidebarOpen ? "auto" : "none"}
    >
      <View style={sb.drawerHeader}>
        <View style={sb.drawerAvatar}>
          <Text style={sb.drawerAvatarTxt}>
            {name ? name.charAt(0).toUpperCase() : "P"}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={sb.drawerName} numberOfLines={1}>
            {name}
          </Text>
          <View style={sb.drawerBadge}>
            <View style={sb.drawerBadgeDot} />
            <Text style={sb.drawerBadgeTxt}>PARENT</Text>
          </View>
        </View>
        <Pressable onPress={closeSidebar} style={sb.closeBtn} hitSlop={10}>
          <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
        </Pressable>
      </View>

      <View style={sb.divider} />

      <View style={{ flex: 1 }} />

      <View style={sb.divider} />

      <Pressable
        style={({ pressed }) => [
          sb.navItem,
          { marginBottom: Math.max(insets.bottom, 16) },
          pressed && sb.navItemPressed,
        ]}
        onPress={onSignOut}
      >
        <View style={[sb.navIconBg, { backgroundColor: `${T.error}18` }]}>
          <Ionicons name="log-out-outline" size={18} color={T.error} />
        </View>
        <Text style={[sb.navLabel, { color: T.error }]}>Sign Out</Text>
        <Ionicons
          name="chevron-forward"
          size={14}
          color="rgba(239,68,68,0.3)"
        />
      </Pressable>
    </Animated.View>
  </>
);

// ─── Pending Request Card ─────────────────────────────────────────────────────

const PendingRequestCard = ({
  pendingRequest,
}: {
  pendingRequest: ParentTutorRequest;
}) => {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.6,
          duration: 900,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  const visibleStage =
    pendingRequest.stage === "LEAD_CREATED" ||
    pendingRequest.stage === "TEACHER_ASSIGNED_FOR_DEMO"
      ? "REQUEST_RECEIVED"
      : pendingRequest.stage;
  const currentIdx = STAGE_ORDER.indexOf(visibleStage);

  const STEP_META = [
    {
      icon: "send-outline",
      color: T.primary,
      label: "Request Received",
      desc: "We've got your request and are reviewing it",
    },
    {
      icon: "calendar-outline",
      color: T.warning,
      label: "Demo Scheduled",
      desc: "A demo class has been arranged with your tutor",
    },
    {
      icon: "checkmark-circle-outline",
      color: T.success,
      label: "Awaiting Approval",
      desc: "Almost there — confirm to begin classes",
    },
  ];

  return (
    <View style={prc.wrap}>
      {/* gradient header */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={prc.header}
      >
        <View style={prc.orbA} pointerEvents="none" />
        <View style={prc.orbB} pointerEvents="none" />

        {/* live pulse indicator */}
        <View style={prc.liveRow}>
          <Animated.View style={[prc.liveDot, { opacity: pulse }]} />
          <Text style={prc.liveTxt}>In Progress</Text>
        </View>

        {/* subject + grade */}
        <Text style={prc.subject} numberOfLines={1}>
          {pendingRequest.subject ?? "Tutor Request"}
          {pendingRequest.grade ? `  ·  Grade ${pendingRequest.grade}` : ""}
        </Text>
        <Text style={prc.headerSub}>
          Your request is being processed by our team
        </Text>

        {/* horizontal progress bar */}
        <View style={prc.barTrack}>
          <View
            style={[
              prc.barFill,
              {
                width:
                  `${((currentIdx + 0.5) / STAGE_ORDER.length) * 100}%` as any,
              },
            ]}
          />
        </View>
        <Text style={prc.barLabel}>
          Step {currentIdx + 1} of {STAGE_ORDER.length}
        </Text>
      </LinearGradient>

      {/* steps */}
      <View style={prc.stepsWrap}>
        {STEP_META.map((step, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          return (
            <View key={step.label} style={prc.stepRow}>
              {/* connector line */}
              {idx < STEP_META.length - 1 && (
                <View
                  style={[
                    prc.connector,
                    { backgroundColor: done ? T.success : T.border },
                  ]}
                />
              )}

              {/* circle */}
              <View
                style={[
                  prc.circle,
                  done
                    ? { backgroundColor: T.success, borderColor: T.success }
                    : active
                      ? { backgroundColor: T.primary, borderColor: T.primary }
                      : { backgroundColor: "#F1F5F9", borderColor: T.border },
                ]}
              >
                {done ? (
                  <Ionicons name="checkmark" size={13} color="#fff" />
                ) : active ? (
                  <Animated.View style={[prc.activeDot, { opacity: pulse }]} />
                ) : (
                  <View style={prc.idleDot} />
                )}
              </View>

              {/* text */}
              <View style={prc.stepText}>
                <Text
                  style={[
                    prc.stepLabel,
                    done
                      ? { color: T.success }
                      : active
                        ? { color: T.primary }
                        : { color: T.textDisabled },
                  ]}
                >
                  {step.label}
                </Text>
                {(done || active) && (
                  <Text style={prc.stepDesc}>{step.desc}</Text>
                )}
              </View>

              {/* badge */}
              {done && (
                <View
                  style={[
                    prc.badge,
                    {
                      backgroundColor: `${T.success}18`,
                      borderColor: `${T.success}30`,
                    },
                  ]}
                >
                  <Text style={[prc.badgeTxt, { color: T.success }]}>Done</Text>
                </View>
              )}
              {active && (
                <View
                  style={[
                    prc.badge,
                    {
                      backgroundColor: `${T.primary}12`,
                      borderColor: `${T.primary}25`,
                    },
                  ]}
                >
                  <Text style={[prc.badgeTxt, { color: T.primary }]}>
                    Active
                  </Text>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* footer tip */}
      <View style={prc.tip}>
        <Ionicons
          name="information-circle-outline"
          size={14}
          color={T.primary}
        />
        <Text style={prc.tipTxt}>
          We'll notify you as soon as there's an update on your request.
        </Text>
      </View>
    </View>
  );
};

const prc = StyleSheet.create({
  wrap: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: T.border,
  },
  header: {
    padding: 18,
    paddingBottom: 20,
    overflow: "hidden",
    position: "relative",
  },
  orbA: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: `${T.primary}12`,
    top: -50,
    right: -40,
  } as any,
  orbB: {
    position: "absolute",
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: `${T.secondary}08`,
    bottom: -30,
    left: 20,
  } as any,
  liveRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.warning },
  liveTxt: {
    fontSize: 11,
    fontWeight: "700",
    color: T.warning,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subject: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 4,
  },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 16 },
  barTrack: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 6,
  },
  barFill: { height: 4, backgroundColor: T.secondary, borderRadius: 2 },
  barLabel: { fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: "600" },

  stepsWrap: { padding: 18, gap: 0 },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    paddingBottom: 20,
    position: "relative",
  },
  connector: {
    position: "absolute",
    left: 15,
    top: 28,
    width: 2,
    bottom: 0,
    borderRadius: 1,
  } as any,
  circle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    zIndex: 1,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  idleDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  stepText: { flex: 1, paddingTop: 4 },
  stepLabel: { fontSize: 14, fontWeight: "700" },
  stepDesc: {
    fontSize: 11,
    color: T.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 99,
    borderWidth: 1,
    alignSelf: "flex-start",
    marginTop: 5,
  },
  badgeTxt: { fontSize: 10, fontWeight: "700" },

  tip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 7,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tipTxt: { flex: 1, fontSize: 11, color: T.textSecondary, lineHeight: 16 },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

const ParentDashboardScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<StackNavigationProp<RootStackParamList>>();
  const { showConfirm, showError, showSuccess } = useModal();

  const [name, setName] = useState("Parent");
  const [data, setData] = useState<ParentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<"overview" | "activity">(
    "overview",
  );

  const [showConcern, setShowConcern] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Sidebar
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarAnim = useRef(new Animated.Value(-SIDEBAR_W)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.parallel([
      Animated.spring(sidebarAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(overlayAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeSidebar = () => {
    Animated.parallel([
      Animated.spring(sidebarAnim, {
        toValue: -SIDEBAR_W,
        useNativeDriver: true,
        bounciness: 0,
      }),
      Animated.timing(overlayAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setSidebarOpen(false));
  };

  const loadData = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
      if (raw) {
        const { accessToken, user } = JSON.parse(raw);
        setAuthToken(accessToken);
        if (user?.name) setName(user.name);
      }
    } catch (_) {}
    try {
      const res = await getParentDashboard();
      setData(res.data);
      if (res.data.parentName) setName(res.data.parentName);
    } catch (e: any) {
      showError("Error", e?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  const signOut = () => {
    showConfirm("Sign Out", "Are you sure you want to sign out?", {
      confirmLabel: "Sign Out",
      confirmStyle: "danger",
      onConfirm: async () => {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthToken(null);
        navigation.reset({ index: 0, routes: [{ name: "Auth" }] });
      },
    });
  };

  const handleConcernSubmit = async (msg: string) => {
    if (!data?.activeClass) return;
    setSubmitting(true);
    try {
      await raiseParentConcern({
        finalClassId: data.activeClass._id,
        message: msg,
      });
      setShowConcern(false);
      showSuccess("Concern Raised", "Our team will follow up with you.");
    } catch (e: any) {
      showError("Failed", e?.message || "Could not raise concern.");
    } finally {
      setSubmitting(false);
    }
  };

  const cls = data?.activeClass;
  const hasActiveClass = !!data?.hasActiveClass;
  const nextSession = data?.upcomingSessions?.[0];
  const timeUntilNext =
    cls?.nextSessionDate && cls?.nextSessionTime
      ? hoursUntil(cls.nextSessionDate, cls.nextSessionTime)
      : null;

  // ── Strip values ─────────────────────────────────────────────────────────
  const attPct =
    cls?.attendancePercentage != null
      ? `${Math.round(cls.attendancePercentage)}%`
      : "—";
  const sessionsDone =
    cls?.completedSessions != null ? String(cls.completedSessions) : "—";
  const nextClassStrip = nextSession
    ? new Date(nextSession.sessionDate).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
      })
    : "—";
  const testScore = data?.latestTest
    ? `${data.latestTest.score}/${data.latestTest.totalMarks}`
    : "—";

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
          />
        }
      >
        {/* ── Hero Header ─────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />

          {/* Top bar */}
          <View style={s.topBar}>
            <View style={s.brandRow}>
              <View style={s.logoRing}>
                <Image
                  source={require("../../assets/logo.jpg")}
                  style={s.logoImg}
                />
              </View>
              <View style={{ justifyContent: "center" }}>
                <Text style={s.brandName}>YourShikshak</Text>
                <Text style={s.brandTagline}>Your Learning Partner</Text>
              </View>
            </View>
            <Pressable onPress={openSidebar} style={s.avatarBtn} hitSlop={8}>
              <View style={s.avatarInner}>
                <Text style={s.avatarInitial}>
                  {name ? name.charAt(0).toUpperCase() : "P"}
                </Text>
              </View>
            </Pressable>
          </View>

          {/* Greeting */}
          <View style={s.greetBlock}>
            <Text style={s.greetSub}>{greeting()}</Text>
            <Text style={s.greetName} numberOfLines={1}>
              {name} 👋
            </Text>
            <View style={s.parentBadge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeTxt}>PARENT</Text>
            </View>
          </View>

          {/* Stats strip */}
          {loading ? (
            <View style={[s.stripRow, { gap: 8 }]}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} w="22%" h={40} radius={8} />
              ))}
            </View>
          ) : hasActiveClass ? (
            <View style={s.stripRow}>
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{nextClassStrip}</Text>
                <Text style={s.stripLbl}>{"Next\nClass"}</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{attPct}</Text>
                <Text style={s.stripLbl}>{"Attend-\nance"}</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{sessionsDone}</Text>
                <Text style={s.stripLbl}>{"Sessions\nDone"}</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{testScore}</Text>
                <Text style={s.stripLbl}>{"Latest\nTest"}</Text>
              </View>
            </View>
          ) : (
            <View style={s.stripRow}>
              <View style={[s.stripItem, { flex: 1 }]}>
                <Ionicons
                  name="school-outline"
                  size={18}
                  color="rgba(255,255,255,0.5)"
                />
                <Text
                  style={[s.stripLbl, { marginTop: 4, textAlign: "center" }]}
                >
                  No active class yet.{"\n"}Request a tutor to get started.
                </Text>
              </View>
            </View>
          )}
        </LinearGradient>

        {/* ── White card ──────────────────────────────────────────────────── */}
        <View style={s.card}>
          {loading ? (
            /* ── Loading skeletons ── */
            <View style={{ gap: 12, marginTop: 8 }}>
              <View style={s.kpiGrid}>
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
                <KpiSkeleton />
              </View>
              <Skeleton w="100%" h={80} radius={12} />
              <Skeleton w="100%" h={80} radius={12} />
            </View>
          ) : !hasActiveClass ? (
            /* ── Empty state ────────────────────────────────────────────── */
            <>
              {data?.pendingRequest ? (
                /* Pending request stepper */
                <>
                  <PendingRequestCard pendingRequest={data.pendingRequest} />
                </>
              ) : (
                /* No request yet */
                <>
                  <SectionHead icon="school-outline" title="Get Started" />

                  {/* How it works */}
                  <View style={how.card}>
                    <Text style={how.title}>How it works</Text>
                    {[
                      {
                        icon: "send-outline",
                        color: T.primary,
                        step: "1",
                        label: "Request a Tutor",
                        desc: "Tell us your child's subject & grade",
                      },
                      {
                        icon: "search-outline",
                        color: T.secondary,
                        step: "2",
                        label: "We Find a Match",
                        desc: "Manager reviews and creates a lead",
                      },
                      {
                        icon: "videocam-outline",
                        color: "#7C3AED",
                        step: "3",
                        label: "Demo Class",
                        desc: "Meet the teacher before committing",
                      },
                      {
                        icon: "checkmark-circle-outline",
                        color: T.success,
                        step: "4",
                        label: "Classes Begin",
                        desc: "Your child starts learning!",
                      },
                    ].map((item) => (
                      <View key={item.step} style={how.row}>
                        <View
                          style={[
                            how.iconBox,
                            { backgroundColor: `${item.color}15` },
                          ]}
                        >
                          <Ionicons
                            name={item.icon as any}
                            size={18}
                            color={item.color}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={how.label}>{item.label}</Text>
                          <Text style={how.desc}>{item.desc}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  {/* CTA button */}
                  <Pressable
                    style={({ pressed }) => [
                      how.ctaBtn,
                      pressed && { opacity: 0.87 },
                    ]}
                    onPress={() => navigation.navigate("RequestTutor")}
                  >
                    <LinearGradient
                      colors={[T.primaryDark, T.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={how.ctaGrad}
                    >
                      <Ionicons
                        name="add-circle-outline"
                        size={20}
                        color="#fff"
                      />
                      <Text style={how.ctaTxt}>Request a Tutor</Text>
                      <Ionicons
                        name="arrow-forward"
                        size={16}
                        color="rgba(255,255,255,0.7)"
                      />
                    </LinearGradient>
                  </Pressable>

                  <EmptyTabState
                    emoji="📚"
                    headline="Your journey starts here"
                    sub="Request a tutor and we'll find the perfect match for your child."
                    iconColor={T.primary}
                  />
                </>
              )}
            </>
          ) : (
            /* ── Active KPI view ────────────────────────────────────────── */
            <>
              {/* ── Progress Pulse Card (emotional hero) ── */}
              {data?.latestTest && (
                <View style={ppc.card}>
                  <View style={ppc.leftBorder} />
                  <View style={ppc.content}>
                    <View style={ppc.topRow}>
                      <View style={ppc.iconBox}>
                        <Ionicons name="trending-up-outline" size={16} color={T.success} />
                      </View>
                      <Text style={ppc.label}>Latest Result</Text>
                      <View style={ppc.trendBadge}>
                        <Text style={ppc.trendTxt}>↑ Good</Text>
                      </View>
                    </View>
                    <View style={ppc.scoreRow}>
                      <Text style={ppc.scoreBig}>
                        {data.latestTest.score}
                        <Text style={ppc.scoreTotal}>/{data.latestTest.totalMarks}</Text>
                      </Text>
                      <View style={ppc.scoreRight}>
                        <Text style={ppc.scorePct}>
                          {Math.round((data.latestTest.score / data.latestTest.totalMarks) * 100)}%
                        </Text>
                        <Text style={ppc.scoreSubject}>{data.latestTest.subject}</Text>
                      </View>
                    </View>
                    <Text style={ppc.insight}>
                      {data.latestTest.score / data.latestTest.totalMarks >= 0.8
                        ? `${cls?.tutor?.name?.split(" ")[0] ?? "Your tutor"}'s sessions are showing results. Keep it up! 🎯`
                        : `There's room to grow in ${data.latestTest.subject}. Your coordinator is watching closely.`}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Contextual Banner (one at a time, highest priority) ── */}
              {cls?.attendancePercentage != null && cls.attendancePercentage < 75 && (
                <View style={cb.card}>
                  <Ionicons name="warning-outline" size={16} color={T.warning} />
                  <View style={{ flex: 1 }}>
                    <Text style={cb.title}>Attendance needs attention</Text>
                    <Text style={cb.sub}>
                      {cls.studentName}'s attendance is at {Math.round(cls.attendancePercentage)}% this month.
                      Regular classes are key to progress.
                    </Text>
                  </View>
                </View>
              )}

              {/* KPI grid */}
              <View style={s.kpiGrid}>
                <KpiCard
                  delay={60}
                  icon="calendar-outline"
                  iconColor={T.primary}
                  iconBg={`${T.primary}15`}
                  label="Next Class"
                  value={
                    cls?.nextSessionDate ? fmtDate(cls.nextSessionDate) : "—"
                  }
                  sub={
                    cls?.nextSessionTime ?? cls?.schedule?.timeSlot ?? undefined
                  }
                  subIcon="time-outline"
                />
                <KpiCard
                  delay={120}
                  icon="checkmark-circle-outline"
                  iconColor={T.success}
                  iconBg={`${T.success}15`}
                  label="Attendance"
                  value={attPct}
                  sub={
                    cls?.attendanceThisMonth != null &&
                    cls?.totalSessionsThisMonth != null
                      ? `${cls.attendanceThisMonth}/${cls.totalSessionsThisMonth} this month`
                      : undefined
                  }
                  subIcon="bar-chart-outline"
                  subColor={
                    cls?.attendancePercentage != null
                      ? cls.attendancePercentage >= 80
                        ? T.success
                        : T.warning
                      : undefined
                  }
                />
                <KpiCard
                  delay={180}
                  icon="document-text-outline"
                  iconColor={T.secondary}
                  iconBg={`${T.secondary}15`}
                  label="Latest Test"
                  value={testScore}
                  sub={
                    data?.latestTest
                      ? `${data.latestTest.subject} · ${fmtDate(data.latestTest.date)}`
                      : "No tests yet"
                  }
                  subIcon={data?.latestTest ? "trophy-outline" : undefined}
                />
                <KpiCard
                  delay={240}
                  icon="person-outline"
                  iconColor="#7C3AED"
                  iconBg="#7C3AED15"
                  label="Teacher"
                  value={cls?.tutor?.name ?? "—"}
                  sub={
                    cls?.tutor?.rating != null
                      ? `★ ${cls.tutor.rating.toFixed(1)} rating`
                      : undefined
                  }
                  subIcon={
                    cls?.tutor?.rating != null ? "star-outline" : undefined
                  }
                  subColor="#F59E0B"
                />
              </View>

              {/* Attendance progress bar */}
              {cls?.attendancePercentage != null && (
                <View style={prog.wrap}>
                  <View style={prog.row}>
                    <Text style={prog.label}>Attendance this month</Text>
                    <Text
                      style={[
                        prog.pct,
                        {
                          color:
                            cls.attendancePercentage >= 80
                              ? T.success
                              : T.warning,
                        },
                      ]}
                    >
                      {Math.round(cls.attendancePercentage)}%
                    </Text>
                  </View>
                  <View style={prog.track}>
                    <View
                      style={[
                        prog.fill,
                        {
                          width:
                            `${Math.min(cls.attendancePercentage, 100)}%` as any,
                          backgroundColor:
                            cls.attendancePercentage >= 80
                              ? T.success
                              : T.warning,
                        },
                      ]}
                    />
                  </View>
                </View>
              )}

              {/* Quick actions row */}
              <View style={qa.row}>
                {[
                  {
                    icon: "wallet-outline",
                    color: T.success,
                    label: "Pay Fees",
                    onPress: () => showError("Coming Soon", "Online payment will be available soon."),
                  },
                  {
                    icon: "calendar-outline",
                    color: T.primary,
                    label: "Reschedule",
                    onPress: () => showError("Coming Soon", "Reschedule will be available soon."),
                  },
                  {
                    icon: "add-circle-outline",
                    color: T.secondary,
                    label: "Extra Class",
                    onPress: () => navigation.navigate("RequestTutor"),
                  },
                  {
                    icon: "alert-circle-outline",
                    color: T.error,
                    label: "Raise Issue",
                    onPress: () => setShowConcern(true),
                  },
                ].map((item) => (
                  <Pressable
                    key={item.label}
                    style={({ pressed }) => [
                      qa.btn,
                      pressed && { opacity: 0.75 },
                    ]}
                    onPress={item.onPress}
                  >
                    <View
                      style={[
                        qa.iconBox,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.color}
                      />
                    </View>
                    <Text style={qa.label} numberOfLines={2}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Tab bar */}
              <View style={tab.bar}>
                <Pressable
                  style={[tab.btn, activeTab === "overview" && tab.btnActive]}
                  onPress={() => setActiveTab("overview")}
                >
                  <Ionicons
                    name="today-outline"
                    size={14}
                    color={activeTab === "overview" ? "#fff" : T.mutedFg}
                  />
                  <Text
                    style={[
                      tab.label,
                      activeTab === "overview" && tab.labelActive,
                    ]}
                  >
                    Upcoming Sessions
                  </Text>
                </Pressable>
                <Pressable
                  style={[tab.btn, activeTab === "activity" && tab.btnActive]}
                  onPress={() => setActiveTab("activity")}
                >
                  <Ionicons
                    name="pulse-outline"
                    size={14}
                    color={activeTab === "activity" ? "#fff" : T.mutedFg}
                  />
                  <Text
                    style={[
                      tab.label,
                      activeTab === "activity" && tab.labelActive,
                    ]}
                  >
                    Activity Feed
                  </Text>
                </Pressable>
              </View>

              {/* Tab: Upcoming Sessions */}
              {activeTab === "overview" && (
                <>
                  {/* Teacher card */}
                  {cls?.tutor && (
                    <>
                      <SectionHead
                        icon="person-circle-outline"
                        title="Your Teacher"
                      />
                      <View style={tc.card}>
                        <View style={tc.avatar}>
                          <Text style={tc.avatarTxt}>
                            {cls.tutor.name?.[0]?.toUpperCase() ?? "T"}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={tc.name}>{cls.tutor.name}</Text>
                          <Text style={tc.sub}>{cls.subject}</Text>
                          {cls.tutor.rating != null && (
                            <View style={tc.ratingRow}>
                              <Ionicons name="star" size={12} color="#F59E0B" />
                              <Text style={tc.ratingTxt}>
                                {cls.tutor.rating.toFixed(1)} rating
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={tc.modePill}>
                          <Ionicons
                            name={
                              cls.mode === "ONLINE"
                                ? "videocam-outline"
                                : cls.mode === "HYBRID"
                                  ? "git-merge-outline"
                                  : "home-outline"
                            }
                            size={11}
                            color={
                              cls.mode === "ONLINE" ? T.primary : T.secondary
                            }
                          />
                          <Text
                            style={[
                              tc.modeTxt,
                              {
                                color:
                                  cls.mode === "ONLINE"
                                    ? T.primary
                                    : T.secondary,
                              },
                            ]}
                          >
                            {cls.mode}
                          </Text>
                        </View>
                      </View>
                    </>
                  )}

                  <SectionHead
                    icon="today-outline"
                    title="Upcoming Sessions"
                    count={data?.upcomingSessions?.length || undefined}
                  />

                  {(data?.upcomingSessions?.length ?? 0) === 0 ? (
                    <EmptyTabState
                      emoji="📅"
                      headline="No upcoming sessions"
                      sub="Sessions will appear here once scheduled."
                      iconColor={T.primary}
                    />
                  ) : (
                    data!.upcomingSessions!.map((sess) => (
                      <View key={sess._id} style={up.card}>
                        <View style={up.dateBox}>
                          <Text style={up.month}>
                            {new Date(sess.sessionDate)
                              .toLocaleString("en-IN", { month: "short" })
                              .toUpperCase()}
                          </Text>
                          <Text style={up.day}>
                            {new Date(sess.sessionDate).getDate()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={up.subject}>{cls?.subject ?? "—"}</Text>
                          <Text style={up.time}>
                            {sess.timeSlot} · Session {sess.sessionNumber}
                          </Text>
                        </View>
                        <View
                          style={[
                            up.statusPill,
                            {
                              backgroundColor:
                                sess.status === "COMPLETED"
                                  ? `${T.success}15`
                                  : `${T.primary}12`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              up.statusTxt,
                              {
                                color:
                                  sess.status === "COMPLETED"
                                    ? T.success
                                    : T.primary,
                              },
                            ]}
                          >
                            {sess.status === "COMPLETED" ? "Done" : "Upcoming"}
                          </Text>
                        </View>
                      </View>
                    ))
                  )}
                </>
              )}

              {/* Tab: Activity Feed */}
              {activeTab === "activity" && (
                <>
                  <SectionHead icon="pulse-outline" title="Recent Activity" />
                  {(data?.recentActivity?.length ?? 0) === 0 ? (
                    <EmptyTabState
                      emoji="🔔"
                      headline="No activity yet"
                      sub="Attendance, test scores, and messages will appear here."
                      iconColor={T.secondary}
                    />
                  ) : (
                    data!.recentActivity!.map((item) => {
                      const meta =
                        item.type === "ATTENDANCE"
                          ? {
                              icon: "checkmark-circle-outline",
                              color: T.success,
                            }
                          : item.type === "TEST"
                            ? {
                                icon: "document-text-outline",
                                color: T.primary,
                              }
                            : item.type === "MESSAGE"
                              ? {
                                  icon: "chatbubble-outline",
                                  color: T.secondary,
                                }
                              : item.type === "RESCHEDULE"
                                ? { icon: "calendar-outline", color: T.warning }
                                : {
                                    icon: "information-circle-outline",
                                    color: T.mutedFg,
                                  };
                      return (
                        <View key={item._id} style={act.card}>
                          <View
                            style={[
                              act.iconBox,
                              { backgroundColor: `${meta.color}15` },
                            ]}
                          >
                            <Ionicons
                              name={meta.icon as any}
                              size={16}
                              color={meta.color}
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={act.title} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={act.desc} numberOfLines={2}>
                              {item.description}
                            </Text>
                          </View>
                          <Text style={act.time}>
                            {timeAgo(item.createdAt)}
                          </Text>
                        </View>
                      );
                    })
                  )}
                </>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <Sidebar
        name={name}
        sidebarAnim={sidebarAnim}
        overlayAnim={overlayAnim}
        sidebarOpen={sidebarOpen}
        closeSidebar={closeSidebar}
        insets={insets}
        onSignOut={signOut}
      />

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      <ConcernSheet
        visible={showConcern}
        onClose={() => setShowConcern(false)}
        onSubmit={handleConcernSubmit}
        submitting={submitting}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  header: { paddingHorizontal: 22, paddingBottom: 48, overflow: "hidden" },
  orbA: { position: "absolute", width: 0, height: 0 },
  orbB: { position: "absolute", width: 0, height: 0 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  logoRing: {
    width: 42,
    height: 42,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  logoImg: { width: 42, height: 42 },
  brandName: { color: "#fff", fontSize: 17, fontWeight: "800", letterSpacing: -0.3 },
  brandTagline: { color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: "500", marginTop: 1, letterSpacing: 0.2 },

  avatarBtn: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  avatarInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: T.primary,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: { color: "#fff", fontSize: 15, fontWeight: "700" },

  greetBlock: { marginBottom: 24 },
  greetSub: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 3,
  },
  greetName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  parentBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.success,
  },
  badgeTxt: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.8,
  },

  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stripItem: { flex: 1, alignItems: "center", gap: 3 },
  stripVal: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.2,
  },
  stripSep: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },

  card: {
    flexGrow: 1,
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 20,
    paddingTop: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    marginTop: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  sectionIconBg: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  sectionHeadTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.1,
  },
  sectionBadge: {
    backgroundColor: T.primary,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 6,
  },
  sectionBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },
});

// KPI card
const kpi = StyleSheet.create({
  outer: { width: "48%" },
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    padding: 15,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
    marginBottom: 12,
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: T.mutedFg,
    fontWeight: "600",
    lineHeight: 15,
    marginTop: 2,
  },
  value: {
    fontSize: 26,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.8,
    marginBottom: 5,
  },
  subRow: { flexDirection: "row", alignItems: "center" },
  sub: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
});

// Tab bar
const tab = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#DDE8F5",
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    gap: 4,
    marginTop: 8,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  btnActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  label: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  labelActive: { color: "#fff", fontWeight: "700" },
});

// Attendance progress bar
const prog = StyleSheet.create({
  wrap: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    padding: 14,
    marginBottom: 8,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  label: { fontSize: 12, color: T.textSecondary, fontWeight: "500" },
  pct: { fontSize: 13, fontWeight: "700" },
  track: {
    height: 6,
    backgroundColor: T.muted,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: { height: 6, borderRadius: 3 },
});

// Progress Pulse Card
const ppc = StyleSheet.create({
  card: { flexDirection: "row", backgroundColor: T.paper, borderRadius: T.radiusLg, borderWidth: 1, borderColor: `${T.success}30`, overflow: "hidden", marginBottom: 4 },
  leftBorder: { width: 4, backgroundColor: T.success },
  content: { flex: 1, padding: 14, gap: 8 },
  topRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBox: { width: 26, height: 26, borderRadius: T.radiusMd, backgroundColor: `${T.success}15`, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 11, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.4 },
  trendBadge: { backgroundColor: `${T.success}15`, paddingHorizontal: 8, paddingVertical: 2, borderRadius: T.radiusFull },
  trendTxt: { fontSize: 10, fontWeight: "800", color: T.success },
  scoreRow: { flexDirection: "row", alignItems: "flex-end", gap: 12 },
  scoreBig: { fontSize: 32, fontWeight: "800", color: T.textPrimary, lineHeight: 36 },
  scoreTotal: { fontSize: 16, fontWeight: "600", color: T.mutedFg },
  scoreRight: { paddingBottom: 2, gap: 1 },
  scorePct: { fontSize: 18, fontWeight: "800", color: T.success },
  scoreSubject: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
  insight: { fontSize: 12, color: T.textSecondary, fontStyle: "italic", lineHeight: 17 },
});

// Contextual Banner
const cb = StyleSheet.create({
  card: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: `${T.warning}10`, borderRadius: T.radiusLg, padding: 14, borderWidth: 1, borderColor: `${T.warning}30`, marginBottom: 4 },
  title: { fontSize: 13, fontWeight: "700", color: T.textPrimary, marginBottom: 2 },
  sub: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
});

// Quick actions
const qa = StyleSheet.create({
  row: { flexDirection: "row", gap: 8, marginBottom: 4 },
  btn: { flex: 1, alignItems: "center", gap: 6, paddingVertical: 10 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: T.radiusLg,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 10,
    color: T.textSecondary,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 13,
  },
});

// Upcoming sessions
const up = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 14,
    marginBottom: 8,
  },
  dateBox: {
    width: 44,
    alignItems: "center",
    backgroundColor: `${T.primary}10`,
    borderRadius: T.radiusMd,
    paddingVertical: 6,
  },
  month: {
    fontSize: 9,
    color: T.primary,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  day: { fontSize: 20, color: T.primary, fontWeight: "800", lineHeight: 24 },
  subject: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  time: { fontSize: 11, color: T.textSecondary, marginTop: 2 },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusTxt: { fontSize: 11, fontWeight: "600" },
});

// Teacher card
const tc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 14,
    marginBottom: 8,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#7C3AED18",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarTxt: { fontSize: 20, color: "#7C3AED", fontWeight: "700" },
  name: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  sub: { fontSize: 11, color: T.textSecondary, marginTop: 1 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  ratingTxt: { fontSize: 11, color: "#F59E0B", fontWeight: "600" },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: `${T.primary}10`,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modeTxt: { fontSize: 10, fontWeight: "600" },
});

// Activity feed
const act = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 13,
    marginBottom: 8,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  title: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  desc: { fontSize: 11, color: T.textSecondary, marginTop: 2, lineHeight: 15 },
  time: { fontSize: 10, color: T.textDisabled, marginTop: 2 },
});

// How it works (empty state)
const how = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 12,
    fontWeight: "700",
    color: T.mutedFg,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  desc: { fontSize: 11, color: T.textSecondary, marginTop: 1 },
  ctaBtn: { borderRadius: T.radiusLg, overflow: "hidden", marginBottom: 8 },
  ctaGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  ctaTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
    flex: 1,
    textAlign: "center",
  },
});

// Pending request card
const req = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 16,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  subject: { fontSize: 13, fontWeight: "700", color: T.textPrimary, flex: 1 },
  stageRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    minHeight: 32,
  },
  stageLeft: { alignItems: "center", width: 20 },
  circle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerDot: { width: 6, height: 6, borderRadius: 3 },
  line: { width: 2, flex: 1, marginTop: 3, marginBottom: -6, minHeight: 12 },
  stageLabel: { fontSize: 12, color: T.textSecondary, paddingTop: 2, flex: 1 },
});

// Bottom sheet modal (shared) — mirrors TutorDashboardScreen am styles exactly
const am = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,8,23,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    padding: 24,
    paddingBottom: 36,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 10,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: T.textPrimary },
  headerSub: { fontSize: 12, color: T.mutedFg, marginTop: 1 },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: T.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusMd,
    padding: 13,
    fontSize: 14,
    color: T.textPrimary,
    backgroundColor: T.muted,
    minHeight: 72,
    textAlignVertical: "top",
    marginBottom: 18,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingVertical: 15,
    marginTop: 0,
  },
  submitTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },
  statusRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statusBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 12,
    borderRadius: T.radiusMd,
    borderWidth: 1.5,
    borderColor: T.border,
    backgroundColor: T.muted,
  },
  statusBtnActive: { backgroundColor: T.paper },
  statusBtnTxt: { fontSize: 14, fontWeight: "700" },
});

// Sidebar drawer
const sb = StyleSheet.create({
  overlay: { backgroundColor: "rgba(0,0,0,0.45)", zIndex: 10 },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_W,
    backgroundColor: T.darkBg,
    zIndex: 20,
    paddingHorizontal: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    marginTop: 24,
  },
  drawerAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAvatarTxt: { fontSize: 20, color: "#fff", fontWeight: "700" },
  drawerName: { fontSize: 15, color: "#fff", fontWeight: "700", flex: 1 },
  drawerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 3,
  },
  drawerBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: T.success,
  },
  drawerBadgeTxt: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  closeBtn: { padding: 4 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 8,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    borderRadius: T.radiusMd,
  },
  navItemPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  navIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: { flex: 1, fontSize: 14, color: "#fff", fontWeight: "600" },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: { color: "#fff", fontSize: 9, fontWeight: "700" },
});

// Empty state
const emp = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 16,
    gap: 10,
  },
  iconRing: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  iconInner: {
    width: 74,
    height: 74,
    borderRadius: 37,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: { fontSize: 36 },
  headline: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
  },
  sub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20 },
});

export default ParentDashboardScreen;
