/**
 * TutorDashboardScreen.tsx — YourShikshak
 *
 * KPI data:
 *   GET /api/tutors/:userId/performance       → classes, class-hours, attendance, feedback
 *   GET /api/tutors/:userId/advanced-analytics → earnings, demos, sessions, teaching hours
 *
 * Announcements:
 *   GET /api/announcements/tutor/available    → paginated lead announcements for this tutor
 *   POST /api/announcements/:id/interest      → express interest in a lead
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
  KeyboardAvoidingView,
  Platform,
} from "react-native";

const SCREEN_W = Dimensions.get("window").width;
const SIDEBAR_W = SCREEN_W * 0.72;
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { RootStackParamList } from "../navigation/AppNavigator";
import {
  getTutorPerformance,
  getTutorAnalytics,
  getTutorAnnouncements,
  getTutorProfile,
  getTodayClasses,
  submitAttendance,
  expressInterest,
  setAuthToken,
  AUTH_STORAGE_KEY,
  getUnreadNotificationCount,
  getMyDemos,
  submitDemoResult,
  getOptions,
  TutorPerformance,
  TutorAdvancedAnalytics,
  TodayClass,
  LeadAnnouncement,
  TutorDemo,
  markWhatsappCommunityJoined,
} from "../api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "TutorDashboard">;
type Route = RouteProp<RootStackParamList, "TutorDashboard">;
interface Props {
  navigation: Nav;
  route: Route;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(Math.round(n));
const fmtHrs = (n: number) =>
  n >= 1 ? `${n.toFixed(1)} hrs` : `${Math.round(n * 60)} min`;
const fmtRupee = (n: number) =>
  n >= 100000
    ? `₹${(n / 100000).toFixed(1)}L`
    : n >= 1000
      ? `₹${(n / 1000).toFixed(1)}K`
      : `₹${Math.round(n)}`;

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3_600_000);
  if (h < 1) return "Just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const subjectLabel = (lead: LeadAnnouncement["classLead"]): string => {
  const sub = lead.subject;
  if (!sub || sub.length === 0) return "—";
  return sub
    .map((s) => s.label ?? s.value ?? "")
    .filter(Boolean)
    .join(", ");
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

// ─── KPI card ─────────────────────────────────────────────────────────────────

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
  <View style={[s.sectionHead, { borderLeftColor: T.primary }]}>
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

// ─── Announcement card ────────────────────────────────────────────────────────

const AnnouncementCard = ({
  item,
  onInterest,
  interested,
}: {
  item: LeadAnnouncement;
  onInterest: (id: string) => void;
  interested: boolean;
}) => {
  const lead = item.classLead;
  if (!lead) return null;
  const modeIcon: any =
    lead.mode === "ONLINE"
      ? "videocam-outline"
      : lead.mode === "HYBRID"
        ? "git-merge-outline"
        : "home-outline";
  const modeColor =
    lead.mode === "ONLINE"
      ? T.primary
      : lead.mode === "HYBRID"
        ? "#7C3AED"
        : T.secondary;

  return (
    <View style={ac.card}>
      {/* Header row */}
      <View style={ac.headerRow}>
        <View
          style={[
            ac.modePill,
            {
              backgroundColor: `${modeColor}15`,
              borderColor: `${modeColor}30`,
            },
          ]}
        >
          <Ionicons name={modeIcon} size={11} color={modeColor} />
          <Text style={[ac.modeTxt, { color: modeColor }]}>{lead.mode}</Text>
        </View>
        <Text style={ac.timeAgo}>{timeAgo(item.postedAt)}</Text>
      </View>

      {/* Subject + grade */}
      <Text style={ac.subjectTxt} numberOfLines={2}>
        {subjectLabel(lead)}
      </Text>
      <Text style={ac.gradeTxt}>
        {[lead.grade && `Grade ${lead.grade}`, lead.board]
          .filter(Boolean)
          .join(" · ")}
      </Text>

      {/* Details row */}
      <View style={ac.detailsRow}>
        {lead.city ? (
          <View style={ac.detailChip}>
            <Ionicons name="location-outline" size={11} color={T.mutedFg} />
            <Text style={ac.detailTxt}>
              {lead.city}
              {lead.area ? `, ${lead.area}` : ""}
            </Text>
          </View>
        ) : null}
        {lead.classDurationHours ? (
          <View style={ac.detailChip}>
            <Ionicons name="time-outline" size={11} color={T.mutedFg} />
            <Text style={ac.detailTxt}>{lead.classDurationHours}h/session</Text>
          </View>
        ) : null}
        {lead.paymentAmount ? (
          <View style={ac.detailChip}>
            <Ionicons name="cash-outline" size={11} color={T.mutedFg} />
            <Text style={ac.detailTxt}>{fmtRupee(lead.paymentAmount)}/mo</Text>
          </View>
        ) : null}
      </View>

      {/* Footer: interest count + CTA */}
      <View style={ac.footer}>
        <View style={ac.interestRow}>
          <Ionicons name="people-outline" size={13} color={T.mutedFg} />
          <Text style={ac.interestTxt}>{item.interestCount} interested</Text>
        </View>
        <Pressable
          onPress={() => onInterest(item._id)}
          disabled={interested}
          style={({ pressed }) => [
            ac.interestBtn,
            interested ? ac.interestBtnDone : ac.interestBtnActive,
            pressed && !interested && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name={interested ? "checkmark-circle" : "hand-left-outline"}
            size={13}
            color={interested ? T.success : "#fff"}
          />
          <Text style={[ac.interestBtnTxt, interested && { color: T.success }]}>
            {interested ? "Interested" : "I'm Interested"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
};

// ─── Interactive empty tab state ─────────────────────────────────────────────

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

// ─── Screen ───────────────────────────────────────────────────────────────────

const TutorDashboardScreen: React.FC<Props> = ({ navigation, route }) => {
  const { userId: _userId, name: _name } = route.params ?? ({} as any);
  const [resolvedUserId, setResolvedUserId] = useState<string | undefined>(_userId);
  const [resolvedName, setResolvedName] = useState<string | undefined>(_name);

  useEffect(() => {
    if (_userId) return;
    AsyncStorage.getItem(AUTH_STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const { user } = JSON.parse(raw);
        if (user?.id) setResolvedUserId(user.id);
        if (user?.name) setResolvedName(user.name);
      } catch {}
    });
  }, []);

  const userId = resolvedUserId ?? "";
  const name = resolvedName ?? "";
  const insets = useSafeAreaInsets();
  const { showConfirm, showError, showSuccess } = useModal();

  const [unreadCount, setUnreadCount] = useState(0);
  useEffect(() => {
    getUnreadNotificationCount()
      .then(setUnreadCount)
      .catch(() => {});
  }, []);

  // WhatsApp community modal
  const [showWAModal, setShowWAModal] = useState(false);
  const [waLink, setWaLink] = useState<string | undefined>();

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

  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState(false);

  const [perf, setPerf] = useState<TutorPerformance | null>(null);
  const [analytics, setAnalytics] = useState<TutorAdvancedAnalytics | null>(
    null,
  );
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);

  const [announcements, setAnnouncements] = useState<LeadAnnouncement[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  const [annError, setAnnError] = useState<string | null>(null);
  const [annTotal, setAnnTotal] = useState(0);
  const [annPage, setAnnPage] = useState(1);
  const [annLoadingMore, setAnnLoadingMore] = useState(false);
  const [interestedIds, setInterestedIds] = useState<Set<string>>(new Set());
  const [expressingId, setExpressingId] = useState<string | null>(null);

  const [todayClasses, setTodayClasses] = useState<TodayClass[]>([]);
  const [todayLoading, setTodayLoading] = useState(true);
  const [todayError, setTodayError] = useState<string | null>(null);
  const [todayVisible, setTodayVisible] = useState(3);

  // Attendance modal
  const [attModal, setAttModal] = useState(false);
  const [attClass, setAttClass] = useState<TodayClass | null>(null);
  const [attTopic, setAttTopic] = useState("");
  const [attStatus, setAttStatus] = useState<"PRESENT" | "ABSENT">("PRESENT");
  const [attSubmitting, setAttSubmitting] = useState(false);

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"today" | "opportunities">(
    "today",
  );

  // Demos
  const [demos, setDemos] = useState<TutorDemo[]>([]);
  const [demosLoading, setDemosLoading] = useState(true);
  const [demosError, setDemosError] = useState<string | null>(null);
  const [demoModal, setDemoModal] = useState(false);
  const [demoItem, setDemoItem] = useState<TutorDemo | null>(null);
  const [demoTopic, setDemoTopic] = useState("");
  const [demoFeedback, setDemoFeedback] = useState("");
  const [demoAttStatus, setDemoAttStatus] = useState<"PRESENT" | "ABSENT">(
    "PRESENT",
  );
  const [demoSubmitting, setDemoSubmitting] = useState(false);
  const [submittedDemoIds, setSubmittedDemoIds] = useState<Set<string>>(
    new Set(),
  );

  // KPI fetch (also pulls profile photo on first load)
  const fetchKpis = useCallback(async () => {
    setKpiError(null);
    try {
      const [perfRes, analyticsRes, profileRes] = await Promise.all([
        getTutorPerformance(userId),
        getTutorAnalytics(userId),
        getTutorProfile().catch(() => null),
      ]);
      setPerf(perfRes.data);
      setAnalytics(analyticsRes.data);
      if (profileRes) {
        const photoDoc = profileRes.data?.documents?.find(
          (d: any) => String(d.documentType).toUpperCase() === "PROFILE_PHOTO",
        );
        if (photoDoc?.documentUrl) {
          setProfilePhotoUrl(photoDoc.documentUrl);
          setPhotoError(false);
        }

        // Show WhatsApp community modal for offline tutors who haven't joined yet
        const profile = profileRes.data as any;
        if (profile?.preferredMode === "OFFLINE" && !profile?.whatsappCommunityJoined) {
          try {
            const cityOpts = await getOptions("CITY");
            const tutorCity = String(profile?.user?.city || "").trim().toLowerCase();
            const cityOpt = cityOpts.find((c: any) => {
              const v = String(c.value || "").trim().toLowerCase();
              const l = String(c.label || "").trim().toLowerCase();
              return v === tutorCity || l === tutorCity;
            });
            setWaLink((cityOpt?.metadata as any)?.whatsappLink);
          } catch {
            // no city link, still show modal
          }
          setShowWAModal(true);
        }
      }
    } catch (err: any) {
      setKpiError(err?.message || "Failed to load KPIs.");
    } finally {
      setKpiLoading(false);
    }
  }, [userId]);

  // Announcements fetch
  const fetchAnnouncements = useCallback(async (page = 1, append = false) => {
    if (!append) setAnnLoading(true);
    else setAnnLoadingMore(true);
    setAnnError(null);
    try {
      const res = await getTutorAnnouncements(page, 10);
      const valid = res.data.filter((a) => a.classLead !== null);
      setAnnouncements((prev) => (append ? [...prev, ...valid] : valid));
      setAnnTotal(res.pagination.total);
      setAnnPage(page);
    } catch (err: any) {
      setAnnError(err?.message || "Failed to load announcements.");
    } finally {
      setAnnLoading(false);
      setAnnLoadingMore(false);
    }
  }, []);

  const fetchTodayClasses = useCallback(async () => {
    setTodayError(null);
    setTodayVisible(3);
    try {
      const res = await getTodayClasses(userId);
      setTodayClasses(res.data);
    } catch (err: any) {
      setTodayError(err?.message || "Failed to load today's classes.");
    } finally {
      setTodayLoading(false);
    }
  }, []);

  const fetchDemos = useCallback(async () => {
    setDemosError(null);
    try {
      const res = await getMyDemos(1, 20, "SCHEDULED");
      setDemos(res.data);
    } catch (err: any) {
      setDemosError(err?.message || "Failed to load demos.");
    } finally {
      setDemosLoading(false);
    }
  }, []);

  const openDemoModal = (demo: TutorDemo) => {
    setDemoItem(demo);
    setDemoTopic("");
    setDemoFeedback("");
    setDemoAttStatus("PRESENT");
    setDemoModal(true);
  };

  const submitDemo = async () => {
    if (!demoItem) return;
    setDemoSubmitting(true);
    try {
      await submitDemoResult(demoItem.classLead._id, {
        status: "COMPLETED",
        attendanceStatus: demoAttStatus,
        topicCovered: demoTopic.trim() || undefined,
        feedback: demoFeedback.trim() || undefined,
      });
      setSubmittedDemoIds((prev) => new Set(prev).add(demoItem._id));
      setDemoModal(false);
      showSuccess("Demo Submitted!", "Your demo result has been recorded.");
    } catch (err: any) {
      showError("Submission Failed", err?.message || "Please try again.");
    } finally {
      setDemoSubmitting(false);
    }
  };

  useEffect(() => {
    fetchKpis();
    fetchAnnouncements(1);
    fetchTodayClasses();
    fetchDemos();
  }, [fetchKpis, fetchAnnouncements, fetchTodayClasses, fetchDemos]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchKpis(),
      fetchAnnouncements(1),
      fetchTodayClasses(),
      fetchDemos(),
    ]);
    setRefreshing(false);
  }, [fetchKpis, fetchAnnouncements, fetchTodayClasses, fetchDemos]);

  const loadMore = () => {
    if (annLoadingMore || announcements.length >= annTotal) return;
    fetchAnnouncements(annPage + 1, true);
  };

  const handleInterest = async (announcementId: string) => {
    if (interestedIds.has(announcementId) || expressingId === announcementId)
      return;
    setExpressingId(announcementId);
    try {
      await expressInterest(announcementId);
      setInterestedIds((prev) => new Set(prev).add(announcementId));
      // bump interest count locally
      setAnnouncements((prev) =>
        prev.map((a) =>
          a._id === announcementId
            ? { ...a, interestCount: a.interestCount + 1 }
            : a,
        ),
      );
      showSuccess(
        "Interest Registered!",
        "The admin has been notified. You'll be contacted if selected.",
      );
    } catch (err: any) {
      showError(
        "Could not register interest",
        err?.message || "Please try again.",
      );
    } finally {
      setExpressingId(null);
    }
  };

  const openAttModal = (cls: TodayClass) => {
    setAttClass(cls);
    setAttTopic("");
    setAttStatus("PRESENT");
    setAttModal(true);
  };

  const submitAtt = async () => {
    if (!attClass || !attTopic.trim()) return;
    setAttSubmitting(true);
    try {
      const todayIso = new Date();
      todayIso.setHours(0, 0, 0, 0);
      await submitAttendance(attClass._id, {
        finalClassId: attClass._id,
        topicCovered: attTopic.trim() || undefined,
        studentAttendanceStatus: attStatus,
        sessionDate: todayIso.toISOString(),
        durationHours: attClass.durationHours,
      });
      setTodayClasses((prev) =>
        prev.map((c) =>
          c._id === attClass._id ? { ...c, attendanceMarked: true } : c,
        ),
      );
      setAttModal(false);
      showSuccess(
        "Attendance Marked!",
        `Recorded for ${attClass.studentName}.`,
      );
    } catch (err: any) {
      showError(
        "Failed",
        err?.message || "Could not mark attendance. Try again.",
      );
    } finally {
      setAttSubmitting(false);
    }
  };

  const signOut = () => {
    showConfirm("Sign Out", "Are you sure you want to sign out?", {
      confirmLabel: "Sign Out",
      confirmStyle: "danger",
      onConfirm: async () => {
        await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
        setAuthToken(null);
        navigation.reset({ index: 0, routes: [{ name: "Intro" }] });
      },
    });
  };

  const hasKpi = !kpiLoading && perf && analytics;

  const kpis: KpiProps[] = hasKpi
    ? [
        {
          icon: "library-outline" as any,
          iconColor: T.primary,
          iconBg: `${T.primary}15`,
          label: "Classes Assigned",
          value: fmt(perf!.classesAssigned),
          sub: `${fmt(perf!.classesCompleted)} completed`,
          subIcon: "checkmark-circle-outline" as any,
          subColor: T.success,
          delay: 60,
        },
        {
          icon: "videocam-outline" as any,
          iconColor: "#7C3AED",
          iconBg: "#7C3AED15",
          label: "Demos Scheduled",
          value: fmt(demos.length),
          sub: `${fmt(analytics!.demos.approved)} approved`,
          subIcon: "thumbs-up-outline" as any,
          subColor: T.success,
          delay: 120,
        },
        {
          icon: "time-outline" as any,
          iconColor: T.secondary,
          iconBg: `${T.secondary}15`,
          label: "Teaching Hours",
          value: fmtHrs(perf!.totalClassHours),
          sub: `${fmtHrs(analytics!.totalTeachingHours)} this month`,
          subIcon: "calendar-outline" as any,
          delay: 180,
        },
        {
          icon: "cash-outline" as any,
          iconColor: T.success,
          iconBg: `${T.success}15`,
          label: "Total Earnings",
          value: fmtRupee(analytics!.earnings.total),
          sub: `${fmtRupee(analytics!.earnings.thisMonth)} this month`,
          subIcon: "trending-up-outline" as any,
          subColor: T.success,
          delay: 240,
        },
      ]
    : [];

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
        onScroll={({
          nativeEvent: { contentOffset, layoutMeasurement, contentSize },
        }) => {
          const nearBottom =
            contentOffset.y + layoutMeasurement.height >=
            contentSize.height - 120;
          if (nearBottom) loadMore();
        }}
        scrollEventThrottle={300}
      >
        {/* ── Hero header ──────────────────────────────────────────────────── */}
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.header, { paddingTop: Math.max(insets.top, 16) + 12 }]}
        >
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />

          <View style={s.topBar}>
            <View style={s.brandRow}>
              <View style={s.logoRing}>
                <Image
                  source={require("../../assets/logo.jpg")}
                  style={s.logoImg}
                />
              </View>
              <Text style={s.brandName}>YourShikshak</Text>
            </View>
            <Pressable onPress={openSidebar} style={s.avatarBtn} hitSlop={8}>
              {profilePhotoUrl && !photoError ? (
                <Image
                  source={{ uri: profilePhotoUrl }}
                  style={s.avatarImg}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <View style={s.avatarInner}>
                  <Text style={s.avatarInitial}>
                    {name ? name.charAt(0).toUpperCase() : "T"}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          <View style={s.greetBlock}>
            <Text style={s.greetSub}>Good day,</Text>
            <Text style={s.greetName} numberOfLines={1}>
              {name} 👋
            </Text>
            <View style={s.tutorBadge}>
              <View style={s.badgeDot} />
              <Text style={s.badgeTxt}>TUTOR</Text>
            </View>
          </View>

          {hasKpi && (
            <View style={s.stripRow}>
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{fmt(perf!.classesAssigned)}</Text>
                <Text style={s.stripLbl}>Classes{"\n"}assigned</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{fmt(demos.length)}</Text>
                <Text style={s.stripLbl}>Demos{"\n"}scheduled</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>{fmtHrs(perf!.totalClassHours)}</Text>
                <Text style={s.stripLbl}>Teaching{"\n"}hours</Text>
              </View>
              <View style={s.stripSep} />
              <View style={s.stripItem}>
                <Text style={s.stripVal}>
                  {fmtRupee(analytics!.earnings.total)}
                </Text>
                <Text style={s.stripLbl}>Total{"\n"}earnings</Text>
              </View>
            </View>
          )}
          {kpiLoading && (
            <View style={[s.stripRow, { gap: 8 }]}>
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} w="22%" h={40} radius={8} />
              ))}
            </View>
          )}
        </LinearGradient>

        {/* ── White card ───────────────────────────────────────────────────── */}
        <View style={s.card}>
          {/* ── Upcoming Demos (shown only when demos exist) ──────────────── */}
          {!demosLoading && demos.length > 0 && (
            <>
              <SectionHead
                icon="videocam-outline"
                title="Upcoming Demos"
                count={
                  demos.filter((d) => !submittedDemoIds.has(d._id)).length ||
                  undefined
                }
              />
              {demos.map((demo) => {
                const lead = demo.classLead;
                const submitted = submittedDemoIds.has(demo._id);
                const subj =
                  lead?.subject
                    ?.map((s) => s.label ?? s.value ?? "")
                    .filter(Boolean)
                    .join(", ") || "—";
                const demoDateStr = new Date(demo.demoDate).toLocaleDateString(
                  "en-IN",
                  { day: "numeric", month: "short", year: "numeric" },
                );
                const modeColor =
                  lead?.mode === "ONLINE"
                    ? T.primary
                    : lead?.mode === "HYBRID"
                      ? "#7C3AED"
                      : T.secondary;
                const modeIcon: any =
                  lead?.mode === "ONLINE"
                    ? "videocam-outline"
                    : lead?.mode === "HYBRID"
                      ? "git-merge-outline"
                      : "home-outline";
                return (
                  <Pressable
                    key={demo._id}
                    style={({ pressed }) => [
                      dc.card,
                      submitted && dc.cardDone,
                      pressed && { opacity: 0.88 },
                    ]}
                    onPress={() =>
                      navigation.navigate("MyDemos", { highlightId: demo._id })
                    }
                  >
                    <View style={dc.topRow}>
                      <View style={dc.dateBox}>
                        <Ionicons
                          name="calendar-outline"
                          size={13}
                          color="#7C3AED"
                        />
                        <Text style={dc.dateText}>{demoDateStr}</Text>
                        <Text style={dc.timeText}>{demo.demoTime}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={dc.subject} numberOfLines={1}>
                          {subj}
                        </Text>
                        {lead?.grade ? (
                          <Text style={dc.grade}>
                            Grade {lead.grade}
                            {lead.board ? ` · ${lead.board}` : ""}
                          </Text>
                        ) : null}
                      </View>
                      {submitted ? (
                        <View style={dc.doneBadge}>
                          <Ionicons
                            name="checkmark-circle"
                            size={13}
                            color={T.success}
                          />
                          <Text style={dc.doneTxt}>Submitted</Text>
                        </View>
                      ) : (
                        <View
                          style={[
                            dc.statusBadge,
                            {
                              backgroundColor: "#7C3AED12",
                              borderColor: "#7C3AED30",
                            },
                          ]}
                        >
                          <Ionicons
                            name="time-outline"
                            size={10}
                            color="#7C3AED"
                          />
                          <Text style={[dc.statusTxt, { color: "#7C3AED" }]}>
                            Scheduled
                          </Text>
                        </View>
                      )}
                      <Ionicons
                        name="chevron-forward"
                        size={14}
                        color="#7C3AED"
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                    <View style={dc.chipRow}>
                      <View
                        style={[
                          dc.chip,
                          {
                            backgroundColor: `${modeColor}10`,
                            borderColor: `${modeColor}22`,
                          },
                        ]}
                      >
                        <Ionicons name={modeIcon} size={11} color={modeColor} />
                        <Text style={[dc.chipTxt, { color: modeColor }]}>
                          {lead?.mode}
                        </Text>
                      </View>
                      {lead?.city ? (
                        <View style={dc.chip}>
                          <Ionicons
                            name="location-outline"
                            size={11}
                            color={T.mutedFg}
                          />
                          <Text style={dc.chipTxt}>
                            {[lead.area, lead.city].filter(Boolean).join(", ")}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
              <View style={{ height: 4 }} />
            </>
          )}

          {/* ── Tabs ─────────────────────────────────────────────────────── */}
          <View style={tab.bar}>
            <Pressable
              style={[tab.btn, activeTab === "today" && tab.btnActive]}
              onPress={() => setActiveTab("today")}
            >
              <Ionicons
                name="today-outline"
                size={14}
                color={activeTab === "today" ? T.primary : T.mutedFg}
              />
              <Text
                style={[tab.label, activeTab === "today" && tab.labelActive]}
              >
                Today's Classes
              </Text>
              {(() => {
                const todayStr = new Date().toISOString().slice(0, 10);
                const cnt = todayClasses.filter(
                  (c) => c.date === todayStr,
                ).length;
                return cnt > 0 ? (
                  <View
                    style={[
                      tab.badge,
                      activeTab === "today"
                        ? tab.badgeActive
                        : tab.badgeInactive,
                    ]}
                  >
                    <Text
                      style={[
                        tab.badgeTxt,
                        activeTab === "today" && { color: T.primary },
                      ]}
                    >
                      {cnt}
                    </Text>
                  </View>
                ) : null;
              })()}
            </Pressable>
            <Pressable
              style={[tab.btn, activeTab === "opportunities" && tab.btnActive]}
              onPress={() => setActiveTab("opportunities")}
            >
              <Ionicons
                name="megaphone-outline"
                size={14}
                color={activeTab === "opportunities" ? T.primary : T.mutedFg}
              />
              <Text
                style={[
                  tab.label,
                  activeTab === "opportunities" && tab.labelActive,
                ]}
              >
                Opportunities
              </Text>
              {annTotal > 0 && (
                <View
                  style={[
                    tab.badge,
                    activeTab === "opportunities"
                      ? tab.badgeActive
                      : tab.badgeInactive,
                  ]}
                >
                  <Text
                    style={[
                      tab.badgeTxt,
                      activeTab === "opportunities" && { color: T.primary },
                    ]}
                  >
                    {annTotal}
                  </Text>
                </View>
              )}
            </Pressable>
          </View>

          {/* ── Today's Classes tab ───────────────────────────────────────── */}
          {activeTab === "today" && (
            <>
              <SectionHead
                icon="today-outline"
                title="Today's Classes"
                count={
                  todayClasses.length > 0 ? todayClasses.length : undefined
                }
              />

              {todayLoading && (
                <View style={{ gap: 10, marginBottom: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[tc.card, { gap: 10 }]}>
                      <View
                        style={{
                          flexDirection: "row",
                          gap: 10,
                          alignItems: "center",
                        }}
                      >
                        <Skeleton w={42} h={42} radius={10} />
                        <View style={{ flex: 1, gap: 6 }}>
                          <Skeleton w="55%" h={14} />
                          <Skeleton w="40%" h={11} />
                        </View>
                        <Skeleton w={72} h={22} radius={6} />
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <Skeleton w="30%" h={24} radius={6} />
                        <Skeleton w="30%" h={24} radius={6} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {todayError && !todayLoading && (
                <View style={s.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color={T.error}
                  />
                  <Text style={s.errorTxt}>{todayError}</Text>
                  <Pressable onPress={fetchTodayClasses} style={s.retryBtn}>
                    <Text style={s.retryTxt}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {!todayLoading &&
                !todayError &&
                (() => {
                  const todayStr = new Date().toISOString().slice(0, 10);
                  const filtered = todayClasses.filter(
                    (c) => c.date === todayStr,
                  );
                  const visible = filtered.slice(0, todayVisible);
                  const remaining = filtered.length - todayVisible;
                  const statusMeta: Record<
                    TodayClass["status"],
                    { label: string; color: string; icon: any }
                  > = {
                    SCHEDULED: {
                      label: "Scheduled",
                      color: T.primary,
                      icon: "time-outline",
                    },
                    IN_PROGRESS: {
                      label: "Live Now",
                      color: T.success,
                      icon: "radio-button-on",
                    },
                    COMPLETED: {
                      label: "Completed",
                      color: T.mutedFg,
                      icon: "checkmark-circle-outline",
                    },
                    CANCELLED: {
                      label: "Cancelled",
                      color: T.error,
                      icon: "close-circle-outline",
                    },
                  };
                  const modeMeta: Record<
                    TodayClass["mode"],
                    { label: string; color: string; icon: any }
                  > = {
                    ONLINE: {
                      label: "Online",
                      color: T.primary,
                      icon: "videocam-outline",
                    },
                    OFFLINE: {
                      label: "Offline",
                      color: T.secondary,
                      icon: "home-outline",
                    },
                    HYBRID: {
                      label: "Hybrid",
                      color: "#7C3AED",
                      icon: "git-merge-outline",
                    },
                  };
                  if (filtered.length === 0)
                    return (
                      <EmptyTabState
                        emoji="👨‍🏫"
                        headline="No classes today!"
                        sub="Enjoy your day off. Your next session is just around the corner."
                        iconColor={T.primary}
                      />
                    );
                  return (
                    <>
                      {visible.map((cls) => {
                        const sm = statusMeta[cls.status];
                        const mm = modeMeta[cls.mode];
                        const isLive = cls.status === "IN_PROGRESS";
                        const canMark =
                          cls.status !== "CANCELLED" && !cls.attendanceMarked;
                        return (
                          <View
                            key={cls._id}
                            style={[tc.card, isLive && tc.liveCard]}
                          >
                            {/* top row */}
                            <View style={tc.topRow}>
                              <View
                                style={[
                                  tc.timeBox,
                                  {
                                    backgroundColor: isLive
                                      ? `${T.success}15`
                                      : `${T.primary}10`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name="time-outline"
                                  size={13}
                                  color={isLive ? T.success : T.primary}
                                />
                                <Text
                                  style={[
                                    tc.timeText,
                                    { color: isLive ? T.success : T.primary },
                                  ]}
                                >
                                  {cls.scheduledTime}
                                </Text>
                                <Text
                                  style={[
                                    tc.durText,
                                    { color: isLive ? T.success : T.mutedFg },
                                  ]}
                                >
                                  {cls.durationHours}h
                                </Text>
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={tc.studentName} numberOfLines={1}>
                                  {cls.studentName}
                                </Text>
                                <Text style={tc.subjectLine} numberOfLines={1}>
                                  {cls.subject}
                                  {cls.grade ? ` · ${cls.grade}` : ""}
                                  {cls.board ? ` · ${cls.board}` : ""}
                                </Text>
                              </View>
                              <View
                                style={[
                                  tc.statusBadge,
                                  {
                                    backgroundColor: `${sm.color}12`,
                                    borderColor: `${sm.color}28`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={sm.icon}
                                  size={10}
                                  color={sm.color}
                                />
                                <Text
                                  style={[tc.statusTxt, { color: sm.color }]}
                                >
                                  {sm.label}
                                </Text>
                              </View>
                            </View>

                            {/* chips row */}
                            <View style={tc.chipRow}>
                              <View
                                style={[
                                  tc.chip,
                                  {
                                    backgroundColor: `${mm.color}10`,
                                    borderColor: `${mm.color}22`,
                                  },
                                ]}
                              >
                                <Ionicons
                                  name={mm.icon}
                                  size={11}
                                  color={mm.color}
                                />
                                <Text style={[tc.chipTxt, { color: mm.color }]}>
                                  {mm.label}
                                </Text>
                              </View>
                              {(cls.city || cls.area) && (
                                <View style={tc.chip}>
                                  <Ionicons
                                    name="location-outline"
                                    size={11}
                                    color={T.mutedFg}
                                  />
                                  <Text style={tc.chipTxt}>
                                    {[cls.area, cls.city]
                                      .filter(Boolean)
                                      .join(", ")}
                                  </Text>
                                </View>
                              )}
                              {cls.paymentAmount ? (
                                <View style={tc.chip}>
                                  <Ionicons
                                    name="cash-outline"
                                    size={11}
                                    color={T.success}
                                  />
                                  <Text
                                    style={[tc.chipTxt, { color: T.success }]}
                                  >
                                    ₹{cls.paymentAmount}
                                  </Text>
                                </View>
                              ) : null}
                            </View>

                            {/* attendance row */}
                            <View style={tc.attRow}>
                              {cls.attendanceMarked ? (
                                <View style={tc.attDone}>
                                  <Ionicons
                                    name="checkmark-circle"
                                    size={14}
                                    color={T.success}
                                  />
                                  <Text style={tc.attDoneTxt}>
                                    Attendance marked
                                  </Text>
                                </View>
                              ) : canMark ? (
                                <Pressable
                                  style={tc.attBtn}
                                  onPress={() => openAttModal(cls)}
                                >
                                  <Ionicons
                                    name="clipboard-outline"
                                    size={13}
                                    color="#fff"
                                  />
                                  <Text style={tc.attBtnTxt}>
                                    Mark Attendance
                                  </Text>
                                </Pressable>
                              ) : null}
                            </View>
                          </View>
                        );
                      })}
                      {remaining > 0 && (
                        <Pressable
                          style={tc.showMoreBtn}
                          onPress={() => setTodayVisible((v) => v + 3)}
                        >
                          <Ionicons
                            name="chevron-down"
                            size={14}
                            color={T.primary}
                          />
                          <Text style={tc.showMoreTxt}>
                            Show {Math.min(remaining, 3)} more ({remaining}{" "}
                            remaining)
                          </Text>
                        </Pressable>
                      )}
                      {todayVisible > 3 && remaining <= 0 && (
                        <Pressable
                          style={tc.showMoreBtn}
                          onPress={() => setTodayVisible(3)}
                        >
                          <Ionicons
                            name="chevron-up"
                            size={14}
                            color={T.mutedFg}
                          />
                          <Text style={[tc.showMoreTxt, { color: T.mutedFg }]}>
                            Show less
                          </Text>
                        </Pressable>
                      )}
                    </>
                  );
                })()}
            </>
          )}

          {/* ── Opportunities tab ─────────────────────────────────────────── */}
          {activeTab === "opportunities" && (
            <>
              <SectionHead
                icon="megaphone-outline"
                title="Class Opportunities"
                count={annTotal > 0 ? annTotal : undefined}
              />

              {annLoading && (
                <View style={{ gap: 12 }}>
                  {[0, 1, 2].map((i) => (
                    <View key={i} style={[ac.card, { gap: 10 }]}>
                      <Skeleton w="40%" h={20} radius={6} />
                      <Skeleton w="75%" h={16} />
                      <Skeleton w="55%" h={13} />
                      <View
                        style={{ flexDirection: "row", gap: 8, marginTop: 4 }}
                      >
                        <Skeleton w="30%" h={26} radius={6} />
                        <Skeleton w="30%" h={26} radius={6} />
                      </View>
                    </View>
                  ))}
                </View>
              )}

              {annError && !annLoading && (
                <View style={s.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color={T.error}
                  />
                  <Text style={s.errorTxt}>{annError}</Text>
                  <Pressable
                    onPress={() => fetchAnnouncements(1)}
                    style={s.retryBtn}
                  >
                    <Text style={s.retryTxt}>Retry</Text>
                  </Pressable>
                </View>
              )}

              {!annLoading && !annError && announcements.length === 0 && (
                <EmptyTabState
                  emoji="🎯"
                  headline="Best opportunities coming soon!"
                  sub="The best class leads will be uploaded for you shortly."
                  iconColor={T.secondary}
                />
              )}

              {!annLoading &&
                announcements.map((item) => (
                  <AnnouncementCard
                    key={item._id}
                    item={item}
                    interested={
                      interestedIds.has(item._id) || expressingId === item._id
                    }
                    onInterest={handleInterest}
                  />
                ))}

              {annLoadingMore && (
                <View style={{ alignItems: "center", paddingVertical: 12 }}>
                  <Skeleton w={60} h={12} radius={6} />
                </View>
              )}

              {!annLoadingMore &&
                announcements.length > 0 &&
                announcements.length >= annTotal && (
                  <Text style={s.endTxt}>
                    You've seen all available opportunities
                  </Text>
                )}
            </>
          )}
        </View>

        <View style={{ height: Math.max(insets.bottom, 32) }} />
      </ScrollView>

      {/* ── Sidebar overlay + drawer ──────────────────────────────────────── */}
      {sidebarOpen && (
        <TouchableWithoutFeedback onPress={closeSidebar}>
          <Animated.View style={[sb.overlay, { opacity: overlayAnim }]} />
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
        {/* Drawer header */}
        <View style={sb.drawerHeader}>
          {profilePhotoUrl && !photoError ? (
            <Image
              source={{ uri: profilePhotoUrl }}
              style={sb.drawerAvatarImg}
              onError={() => setPhotoError(true)}
            />
          ) : (
            <View style={sb.drawerAvatar}>
              <Text style={sb.drawerAvatarTxt}>
                {name ? name.charAt(0).toUpperCase() : "T"}
              </Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={sb.drawerName} numberOfLines={1}>
              {name}
            </Text>
            <View style={sb.drawerBadge}>
              <View style={sb.drawerBadgeDot} />
              <Text style={sb.drawerBadgeTxt}>TUTOR</Text>
            </View>
          </View>
          <Pressable onPress={closeSidebar} style={sb.closeBtn} hitSlop={10}>
            <Ionicons name="close" size={20} color="rgba(255,255,255,0.6)" />
          </Pressable>
        </View>

        <View style={sb.divider} />

        {/* My Classes */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("MyClasses");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: `${T.success}18` }]}>
            <Ionicons name="book-outline" size={18} color={T.success} />
          </View>
          <Text style={sb.navLabel}>My Classes</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* Timetable */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("Timetable");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: `${T.primary}18` }]}>
            <Ionicons name="calendar-outline" size={18} color={T.primary} />
          </View>
          <Text style={sb.navLabel}>Timetable</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* Class Opportunities */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("ClassOpportunities");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: `${T.secondary}18` }]}>
            <Ionicons name="school-outline" size={18} color={T.secondary} />
          </View>
          <Text style={sb.navLabel}>Class Opportunities</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(255,255,255,0.3)"
          />
        </Pressable>

        {/* My Demos */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("MyDemos");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: "#8B5CF618" }]}>
            <Ionicons name="videocam-outline" size={18} color="#8B5CF6" />
          </View>
          <Text style={sb.navLabel}>My Demos</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(255,255,255,0.3)"
          />
        </Pressable>

        {/* Notifications */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("Notifications");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: `${T.warning}18` }]}>
            <Ionicons
              name="notifications-outline"
              size={18}
              color={T.warning}
            />
            {unreadCount > 0 && (
              <View style={sb.badge}>
                <Text style={sb.badgeTxt}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </View>
          <Text style={sb.navLabel}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[sb.badge, { position: "relative", marginRight: 6 }]}>
              <Text style={sb.badgeTxt}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(255,255,255,0.3)"
          />
        </Pressable>

        {/* Payments */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("Payments");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: "#10B98118" }]}>
            <Ionicons name="cash-outline" size={18} color="#10B981" />
          </View>
          <Text style={sb.navLabel}>Payments</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* Settings */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("Settings");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: "#64748B18" }]}>
            <Ionicons name="settings-outline" size={18} color="#94A3B8" />
          </View>
          <Text style={sb.navLabel}>Settings</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </Pressable>

        {/* Spacer pushes Profile to bottom */}
        <View style={{ flex: 1 }} />

        <View style={sb.divider} />

        {/* Bottom nav item: Profile */}
        <Pressable
          style={({ pressed }) => [sb.navItem, pressed && sb.navItemPressed]}
          onPress={() => {
            navigation.navigate("TutorProfile");
            closeSidebar();
          }}
        >
          <View style={[sb.navIconBg, { backgroundColor: `${T.primary}20` }]}>
            <Ionicons name="person-outline" size={18} color={T.primary} />
          </View>
          <Text style={sb.navLabel}>Profile</Text>
          <Ionicons
            name="chevron-forward"
            size={14}
            color="rgba(255,255,255,0.3)"
          />
        </Pressable>

        {/* Sign out */}
        <Pressable
          style={({ pressed }) => [
            sb.navItem,
            { marginBottom: Math.max(insets.bottom, 16) },
            pressed && sb.navItemPressed,
          ]}
          onPress={() => {
            closeSidebar();
            setTimeout(signOut, 300);
          }}
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

      {/* ── Attendance Modal ──────────────────────────────────────────────── */}
      <Modal
        visible={attModal}
        transparent
        animationType="slide"
        onRequestClose={() => setAttModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={am.overlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setAttModal(false)} />
          <View style={am.sheet}>
            {/* handle */}
            <View style={am.handle} />

            {/* header */}
            <View style={am.header}>
              <View style={am.headerIcon}>
                <Ionicons
                  name="clipboard-outline"
                  size={20}
                  color={T.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={am.headerTitle}>Mark Attendance</Text>
                <Text style={am.headerSub} numberOfLines={1}>
                  {attClass?.studentName} · {attClass?.subject}
                </Text>
              </View>
              <Pressable onPress={() => setAttModal(false)} hitSlop={12}>
                <Ionicons name="close" size={20} color={T.mutedFg} />
              </Pressable>
            </View>

            {/* topic input */}
            <Text style={am.fieldLabel}>Topic Covered</Text>
            <TextInput
              style={am.input}
              placeholder="e.g. Quadratic Equations, Chapter 5"
              placeholderTextColor={T.textDisabled}
              value={attTopic}
              onChangeText={setAttTopic}
              multiline
              maxLength={200}
            />

            {/* student status */}
            <Text style={am.fieldLabel}>
              Student Status <Text style={{ color: T.error }}>*</Text>
            </Text>
            <View style={am.statusRow}>
              <Pressable
                style={[
                  am.statusBtn,
                  attStatus === "PRESENT" && am.statusBtnActive,
                  {
                    borderColor: attStatus === "PRESENT" ? T.success : T.border,
                  },
                ]}
                onPress={() => setAttStatus("PRESENT")}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={attStatus === "PRESENT" ? T.success : T.mutedFg}
                />
                <Text
                  style={[
                    am.statusBtnTxt,
                    { color: attStatus === "PRESENT" ? T.success : T.mutedFg },
                  ]}
                >
                  Present
                </Text>
              </Pressable>
              <Pressable
                style={[
                  am.statusBtn,
                  attStatus === "ABSENT" && am.statusBtnActive,
                  { borderColor: attStatus === "ABSENT" ? T.error : T.border },
                ]}
                onPress={() => setAttStatus("ABSENT")}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={attStatus === "ABSENT" ? T.error : T.mutedFg}
                />
                <Text
                  style={[
                    am.statusBtnTxt,
                    { color: attStatus === "ABSENT" ? T.error : T.mutedFg },
                  ]}
                >
                  Absent
                </Text>
              </Pressable>
            </View>

            {/* submit */}
            <Pressable
              style={[am.submitBtn, attSubmitting && { opacity: 0.5 }]}
              onPress={submitAtt}
              disabled={attSubmitting}
            >
              {attSubmitting ? (
                <Text style={am.submitTxt}>Submitting…</Text>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={am.submitTxt}>Submit Attendance</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Demo Submit Modal ─────────────────────────────────────────────── */}
      <Modal
        visible={demoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setDemoModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={am.overlay}
        >
          <Pressable style={{ flex: 1 }} onPress={() => setDemoModal(false)} />
          <View style={am.sheet}>
            <View style={am.handle} />
            <View style={am.header}>
              <View style={[am.headerIcon, { backgroundColor: "#7C3AED12" }]}>
                <Ionicons name="videocam-outline" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={am.headerTitle}>Submit Demo</Text>
                <Text style={am.headerSub} numberOfLines={1}>
                  {demoItem?.classLead?.subject
                    ?.map((s) => s.label ?? s.value ?? "")
                    .filter(Boolean)
                    .join(", ") || "Demo"}
                </Text>
              </View>
              <Pressable onPress={() => setDemoModal(false)} hitSlop={12}>
                <Ionicons name="close" size={20} color={T.mutedFg} />
              </Pressable>
            </View>

            <Text style={am.fieldLabel}>Topic Covered</Text>
            <TextInput
              style={am.input}
              placeholder="e.g. Introduction to Algebra, Chapter 1"
              placeholderTextColor={T.textDisabled}
              value={demoTopic}
              onChangeText={setDemoTopic}
              multiline
              maxLength={200}
            />

            <Text style={am.fieldLabel}>
              Feedback{" "}
              <Text style={{ color: T.mutedFg, fontWeight: "400" }}>
                (optional)
              </Text>
            </Text>
            <TextInput
              style={[am.input, { minHeight: 56 }]}
              placeholder="Any feedback about the student or session..."
              placeholderTextColor={T.textDisabled}
              value={demoFeedback}
              onChangeText={setDemoFeedback}
              multiline
              maxLength={300}
            />

            <Text style={am.fieldLabel}>
              Student Attendance <Text style={{ color: T.error }}>*</Text>
            </Text>
            <View style={am.statusRow}>
              <Pressable
                style={[
                  am.statusBtn,
                  demoAttStatus === "PRESENT" && am.statusBtnActive,
                  {
                    borderColor:
                      demoAttStatus === "PRESENT" ? T.success : T.border,
                  },
                ]}
                onPress={() => setDemoAttStatus("PRESENT")}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={18}
                  color={demoAttStatus === "PRESENT" ? T.success : T.mutedFg}
                />
                <Text
                  style={[
                    am.statusBtnTxt,
                    {
                      color:
                        demoAttStatus === "PRESENT" ? T.success : T.mutedFg,
                    },
                  ]}
                >
                  Present
                </Text>
              </Pressable>
              <Pressable
                style={[
                  am.statusBtn,
                  demoAttStatus === "ABSENT" && am.statusBtnActive,
                  {
                    borderColor:
                      demoAttStatus === "ABSENT" ? T.error : T.border,
                  },
                ]}
                onPress={() => setDemoAttStatus("ABSENT")}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={18}
                  color={demoAttStatus === "ABSENT" ? T.error : T.mutedFg}
                />
                <Text
                  style={[
                    am.statusBtnTxt,
                    { color: demoAttStatus === "ABSENT" ? T.error : T.mutedFg },
                  ]}
                >
                  Absent
                </Text>
              </Pressable>
            </View>

            <Pressable
              style={[
                am.submitBtn,
                { backgroundColor: "#7C3AED" },
                demoSubmitting && { opacity: 0.5 },
              ]}
              onPress={submitDemo}
              disabled={demoSubmitting}
            >
              {demoSubmitting ? (
                <Text style={am.submitTxt}>Submitting…</Text>
              ) : (
                <>
                  <Ionicons
                    name="checkmark-done-outline"
                    size={16}
                    color="#fff"
                  />
                  <Text style={am.submitTxt}>Submit Demo</Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── WhatsApp Community Modal ──────────────────────────────────────── */}
      <Modal
        visible={showWAModal}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {}}
      >
        <View style={wa.overlay}>
          <View style={wa.sheet}>
            {/* Icon */}
            <View style={wa.iconCircle}>
              <Ionicons name="logo-whatsapp" size={44} color="#25D366" />
            </View>

            <Text style={wa.title}>Join Our Community</Text>
            <Text style={wa.body}>
              Since you've selected{" "}
              <Text style={{ fontWeight: "700" }}>Offline</Text> as your
              preferred teaching mode, join our official WhatsApp community to
              receive offline class opportunities in your area.
            </Text>

            {/* Join button */}
            <Pressable
              style={({ pressed }) => [
                wa.joinBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={async () => {
                const link =
                  waLink || "https://chat.whatsapp.com/YOUR_COMMUNITY_LINK";
                const { Linking } = require("react-native");
                Linking.openURL(link).catch(() => {});
                markWhatsappCommunityJoined().catch(() => {});
                setShowWAModal(false);
              }}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" />
              <Text style={wa.joinTxt}>Join WhatsApp Group</Text>
            </Pressable>

            {/* Confirm button */}
            <Pressable
              style={({ pressed }) => [
                wa.confirmBtn,
                pressed && { opacity: 0.85 },
              ]}
              onPress={async () => {
                markWhatsappCommunityJoined().catch(() => {});
                setShowWAModal(false);
              }}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={T.textPrimary}
              />
              <Text style={wa.confirmTxt}>I have joined the group</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, paddingBottom: 60 },

  header: { paddingHorizontal: 22, paddingBottom: 32, overflow: "hidden" },
  orbA: {
    position: "absolute",
    top: -70,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: `${T.secondary}18`,
  },
  orbB: {
    position: "absolute",
    bottom: -40,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${T.primary}14`,
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoRing: {
    width: 32,
    height: 32,
    borderRadius: 8,
    overflow: "hidden",
    borderWidth: 1.2,
    borderColor: "rgba(255,255,255,0.22)",
  },
  logoImg: { width: 32, height: 32 },
  brandName: { color: "#fff", fontSize: 14, fontWeight: "700" },
  avatarBtn: { width: 38, height: 38, borderRadius: 19, overflow: "hidden" },
  avatarImg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.25)",
  },
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

  greetBlock: { marginBottom: 22 },
  greetSub: { color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 2 },
  greetName: {
    color: "#fff",
    fontSize: 26,
    fontWeight: "700",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  tutorBadge: {
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: T.radiusMd,
    paddingVertical: 10,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 9,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 2,
  },
  stripSep: { width: 1, height: 28, backgroundColor: "rgba(255,255,255,0.1)" },

  card: {
    flexGrow: 1,
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: T.border,
    marginTop: -24,
    padding: 20,
    paddingTop: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },

  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 16,
    marginTop: 12,
  },
  sectionIconBg: {
    width: 26,
    height: 26,
    borderRadius: T.radiusSm,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  sectionHeadTxt: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },
  sectionBadge: {
    backgroundColor: T.primary,
    borderRadius: T.radiusFull,
    paddingHorizontal: 7,
    paddingVertical: 2,
    marginLeft: 6,
  },
  sectionBadgeTxt: { color: "#fff", fontSize: 10, fontWeight: "700" },

  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 8 },

  errorBox: { alignItems: "center", paddingVertical: 28, gap: 10 },
  errorTxt: { color: T.mutedFg, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  emptyBox: { alignItems: "center", paddingVertical: 36, gap: 8 },
  emptyTxt: { color: T.textSecondary, fontSize: 14, fontWeight: "600" },
  emptySubTxt: { color: T.textDisabled, fontSize: 12, textAlign: "center" },

  endTxt: {
    textAlign: "center",
    color: T.textDisabled,
    fontSize: 11,
    paddingVertical: 16,
  },
});

// ─── Tab styles ───────────────────────────────────────────────────────────────

const tab = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 4,
    marginBottom: 20,
    gap: 4,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: T.radiusSm,
  },
  btnActive: {
    backgroundColor: T.paper,
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  label: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  labelActive: { color: T.primary, fontWeight: "700" },
  badge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  badgeActive: { backgroundColor: `${T.primary}15` },
  badgeInactive: { backgroundColor: T.border },
  badgeTxt: { fontSize: 10, fontWeight: "700", color: T.mutedFg },
});

// ─── KPI card styles ──────────────────────────────────────────────────────────

const kpi = StyleSheet.create({
  outer: { width: "48%" },
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: T.mutedFg,
    fontWeight: "600",
    lineHeight: 15,
  },
  value: {
    fontSize: 22,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  subRow: { flexDirection: "row", alignItems: "center" },
  sub: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
});

// ─── Today's Classes card styles ──────────────────────────────────────────────

const tc = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  liveCard: {
    borderColor: `${T.success}40`,
    backgroundColor: `${T.success}06`,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  timeBox: {
    width: 52,
    paddingVertical: 6,
    borderRadius: T.radiusSm,
    alignItems: "center",
    gap: 2,
  },
  timeText: { fontSize: 12, fontWeight: "800", letterSpacing: -0.3 },
  durText: { fontSize: 9, fontWeight: "600" },
  studentName: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 2,
  },
  subjectLine: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  statusTxt: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipTxt: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  attRow: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 10,
  },
  attBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  attBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
  attDone: { flexDirection: "row", alignItems: "center", gap: 5 },
  attDoneTxt: { fontSize: 12, color: T.success, fontWeight: "600" },
  attPending: { fontSize: 11, color: T.textDisabled, fontStyle: "italic" },
  showMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusMd,
    backgroundColor: T.muted,
  },
  showMoreTxt: { fontSize: 12, fontWeight: "700", color: T.primary },
});

// ─── Attendance modal styles ──────────────────────────────────────────────────

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
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingVertical: 15,
  },
  submitTxt: { fontSize: 15, fontWeight: "700", color: "#fff" },
});

// ─── Announcement card styles ─────────────────────────────────────────────────

const ac = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  modePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  modeTxt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  timeAgo: { fontSize: 11, color: T.textDisabled },

  subjectTxt: {
    fontSize: 15,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.2,
    marginBottom: 2,
  },
  gradeTxt: { fontSize: 12, color: T.textSecondary, marginBottom: 10 },

  detailsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: T.muted,
    borderRadius: T.radiusFull,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailTxt: { fontSize: 11, color: T.textSecondary, fontWeight: "500" },

  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 10,
  },
  interestRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  interestTxt: { fontSize: 12, color: T.mutedFg },

  interestBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: T.radiusFull,
  },
  interestBtnActive: { backgroundColor: T.primary },
  interestBtnDone: {
    backgroundColor: `${T.success}15`,
    borderWidth: 1,
    borderColor: `${T.success}30`,
  },
  interestBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

// ─── Demo card styles ─────────────────────────────────────────────────────────

const dc = StyleSheet.create({
  card: {
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  cardDone: {
    borderColor: `${T.success}30`,
    backgroundColor: `${T.success}04`,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },
  dateBox: {
    width: 58,
    paddingVertical: 6,
    borderRadius: T.radiusSm,
    backgroundColor: "#7C3AED12",
    alignItems: "center",
    gap: 2,
  },
  dateText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
    textAlign: "center",
  },
  timeText: { fontSize: 9, fontWeight: "600", color: "#7C3AED" },
  subject: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    marginBottom: 2,
  },
  grade: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  statusTxt: { fontSize: 9, fontWeight: "800", letterSpacing: 0.3 },
  doneBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  doneTxt: { fontSize: 11, color: T.success, fontWeight: "600" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  chipTxt: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  footer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: T.border,
    paddingTop: 10,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "#7C3AED",
    borderRadius: T.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  submitBtnTxt: { fontSize: 12, fontWeight: "700", color: "#fff" },
});

// ─── Sidebar styles ───────────────────────────────────────────────────────────

const sb = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(2,8,23,0.75)",
    zIndex: 10,
  },
  drawer: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    width: SIDEBAR_W,
    backgroundColor: T.darkBg,
    borderRightWidth: 1,
    borderRightColor: "rgba(255,255,255,0.08)",
    zIndex: 11,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOffset: { width: 6, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 20,
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 20,
  },
  drawerAvatarImg: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  drawerAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.primary,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  drawerAvatarTxt: { color: "#fff", fontSize: 22, fontWeight: "700" },
  drawerName: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  drawerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  drawerBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.success,
  },
  drawerBadgeTxt: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.7,
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.07)",
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.07)",
    marginVertical: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderRadius: T.radiusMd,
  },
  navItemPressed: { backgroundColor: "rgba(255,255,255,0.05)" },
  navIconBg: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navLabel: {
    flex: 1,
    color: "rgba(255,255,255,0.85)",
    fontSize: 14,
    fontWeight: "600",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: T.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  badgeTxt: {
    fontSize: 9,
    fontWeight: "800",
    color: "#fff",
  },
});

const wa = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(2,8,23,0.75)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  sheet: {
    width: "100%",
    backgroundColor: T.paper,
    borderRadius: 24,
    paddingTop: 36,
    paddingHorizontal: 24,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 20,
  },
  iconCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: "rgba(37,211,102,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  joinBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#25D366",
    borderRadius: T.radiusMd,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "center",
    marginBottom: 12,
  },
  joinTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 15,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: T.radiusMd,
    paddingVertical: 13,
    paddingHorizontal: 24,
    width: "100%",
    justifyContent: "center",
  },
  confirmTxt: {
    color: T.textPrimary,
    fontWeight: "600",
    fontSize: 14,
  },
});

export default TutorDashboardScreen;
