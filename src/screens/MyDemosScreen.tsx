import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Modal,
  ScrollView,
  Linking,
  TextInput,
  Keyboard,
  Animated,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { getMyDemos, submitDemoResult, TutorDemo } from "../api/client";
import { T } from "../constants/colors";
import { RootStackParamList } from "../navigation/AppNavigator";

type Nav = StackNavigationProp<RootStackParamList, "MyDemos">;
type Route = RouteProp<RootStackParamList, "MyDemos">;

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: any; bg: string }
> = {
  APPROVED: { label: "Approved", color: "#10B981", icon: "checkmark-circle", bg: "#10B98118" },
  REJECTED: { label: "Rejected", color: "#EF4444", icon: "close-circle", bg: "#EF444418" },
  COMPLETED: { label: "Completed", color: "#2D68C4", icon: "checkmark-done-circle", bg: "#2D68C418" },
  PENDING: { label: "Pending", color: "#F59E0B", icon: "time", bg: "#F59E0B18" },
  SCHEDULED: { label: "Scheduled", color: "#8B5CF6", icon: "calendar", bg: "#8B5CF618" },
  CANCELLED: { label: "Cancelled", color: "#64748B", icon: "ban", bg: "#64748B18" },
};

const FILTERS = [
  { key: undefined, label: "All" },
  { key: "APPROVED", label: "Approved" },
  { key: "REJECTED", label: "Rejected" },
  { key: "COMPLETED", label: "Completed" },
  { key: "PENDING", label: "Pending" },
  { key: "SCHEDULED", label: "Scheduled" },
];

const SUBMITTABLE = new Set(["SCHEDULED", "PENDING", "ASSIGNED"]);

const AVATAR_GRADIENTS: [string, string][] = [
  ["#667EEA", "#764BA2"],
  ["#F093FB", "#F5576C"],
  ["#4FACFE", "#00F2FE"],
  ["#43E97B", "#38F9D7"],
  ["#FA709A", "#FEE140"],
  ["#A18CD1", "#FBC2EB"],
  ["#FFC3A0", "#FF677D"],
  ["#C2E9FB", "#A1C4FD"],
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isSubmittable = (status: string) => SUBMITTABLE.has(status?.toUpperCase());

const getStatusMeta = (status: string) =>
  STATUS_META[status?.toUpperCase()] ?? {
    label: status,
    color: "#64748B",
    icon: "ellipse-outline",
    bg: "#64748B12",
  };

const formatDate = (d: string) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (name: string) => {
  if (!name) return "?";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getAvatarGradient = (name: string): [string, string] => {
  if (!name) return AVATAR_GRADIENTS[0];
  return AVATAR_GRADIENTS[name.charCodeAt(0) % AVATAR_GRADIENTS.length];
};

// ─── MetaChip ─────────────────────────────────────────────────────────────────

const MetaChip = ({ icon, value, color }: { icon: any; value: string; color: string }) => (
  <View style={[s.metaChip, { backgroundColor: `${color}10`, borderColor: `${color}28` }]}>
    <Ionicons name={icon} size={10} color={color} />
    <Text style={[s.metaChipTxt, { color }]}>{value}</Text>
  </View>
);

// ─── DemoCard ─────────────────────────────────────────────────────────────────

const DemoCard = ({
  demo,
  index,
  onPress,
  onSubmit,
  highlighted = false,
  submitted = false,
}: {
  demo: TutorDemo;
  index: number;
  onPress: () => void;
  onSubmit: (demo: TutorDemo) => void;
  highlighted?: boolean;
  submitted?: boolean;
}) => {
  const meta = getStatusMeta(demo.status);
  const subjects = (demo.classLead?.subject ?? [])
    .map((s: any) => s?.label ?? s?.value ?? "")
    .filter(Boolean)
    .join(", ");
  const studentName = demo.classLead?.studentName ?? "Student";
  const avatarGrad = getAvatarGradient(studentName);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 300,
      delay: Math.min(index * 55, 280),
      useNativeDriver: true,
    }).start();
  }, []);

  const canSubmit = isSubmittable(demo.status) && !submitted;

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }],
      }}
    >
      <View style={[s.card, highlighted && { borderColor: meta.color, borderWidth: 1.5 }]}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [pressed && { transform: [{ scale: 0.98 }] }]}
        >
          <View style={s.cardBody}>
            {/* ── Avatar + name + status ── */}
            <View style={s.cardTop}>
              <LinearGradient colors={avatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.avatar}>
                <Text style={s.avatarTxt}>{getInitials(studentName)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.studentName} numberOfLines={1}>{studentName}</Text>
                {subjects ? <Text style={s.subjectTxt} numberOfLines={1}>{subjects}</Text> : null}
              </View>
              <View style={[s.statusBadge, { backgroundColor: meta.bg, borderColor: `${meta.color}40` }]}>
                <Ionicons name={meta.icon} size={11} color={meta.color} />
                <Text style={[s.statusTxt, { color: meta.color }]}>{meta.label}</Text>
              </View>
            </View>

            {/* ── Meta chips ── */}
            <View style={s.metaRow}>
              <MetaChip icon="calendar-outline" value={formatDate(demo.demoDate)} color="#8B5CF6" />
              <MetaChip icon="time-outline" value={demo.demoTime ?? "—"} color={T.primary} />
              {demo.classLead?.mode ? <MetaChip icon="tv-outline" value={demo.classLead.mode} color="#F59E0B" /> : null}
              {demo.classLead?.grade ? <MetaChip icon="school-outline" value={`Gr. ${demo.classLead.grade}`} color="#10B981" /> : null}
            </View>

            {/* ── Location ── */}
            {(demo.classLead?.city || demo.classLead?.area) ? (
              <View style={s.locRow}>
                <Ionicons name="location-outline" size={11} color={T.mutedFg} />
                <Text style={s.locTxt} numberOfLines={1}>
                  {[demo.classLead.area, demo.classLead.city].filter(Boolean).join(", ")}
                </Text>
              </View>
            ) : null}

            {/* ── Notes ── */}
            {demo.notes ? (
              <Text style={s.notesPreview} numberOfLines={1}>{demo.notes}</Text>
            ) : null}
          </View>
        </Pressable>

        {/* ── Submit footer ── */}
        {canSubmit ? (
          <>
            <View style={s.cardDivider} />
            <Pressable
              onPress={() => onSubmit(demo)}
              style={({ pressed }) => [s.submitBar, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <Ionicons name="clipboard-outline" size={13} color="#7C3AED" />
              <Text style={s.submitBarTxt}>Submit Demo Result</Text>
              <Ionicons name="chevron-forward" size={13} color="#7C3AED" />
            </Pressable>
          </>
        ) : null}
      </View>
    </Animated.View>
  );
};

// ─── StatsStrip ───────────────────────────────────────────────────────────────

const StatsStrip = ({ demos, total }: { demos: TutorDemo[]; total: number }) => {
  const scheduled = demos.filter((d) => d.status?.toUpperCase() === "SCHEDULED").length;
  const pending = demos.filter((d) => d.status?.toUpperCase() === "PENDING").length;
  const completed = demos.filter((d) => d.status?.toUpperCase() === "COMPLETED").length;
  return (
    <View style={s.strip}>
      <View style={s.stripItem}>
        <Text style={s.stripVal}>{total || demos.length}</Text>
        <Text style={s.stripLbl}>Total</Text>
      </View>
      <View style={s.stripSep} />
      <View style={s.stripItem}>
        <Text style={s.stripVal}>{scheduled}</Text>
        <Text style={s.stripLbl}>Scheduled</Text>
      </View>
      <View style={s.stripSep} />
      <View style={s.stripItem}>
        <Text style={s.stripVal}>{pending}</Text>
        <Text style={s.stripLbl}>Pending</Text>
      </View>
      <View style={s.stripSep} />
      <View style={s.stripItem}>
        <Text style={s.stripVal}>{completed}</Text>
        <Text style={s.stripLbl}>Completed</Text>
      </View>
    </View>
  );
};

// ─── DemoDetailModal ──────────────────────────────────────────────────────────

type DTab = "overview" | "student" | "class" | "outcome";

const DTABS: { key: DTab; label: string; icon: any; color: string }[] = [
  { key: "overview", label: "Overview", icon: "grid-outline", color: T.primary },
  { key: "student", label: "Student", icon: "person-outline", color: "#8B5CF6" },
  { key: "class", label: "Class", icon: "layers-outline", color: "#F59E0B" },
  { key: "outcome", label: "Outcome", icon: "checkmark-circle-outline", color: "#10B981" },
];

const DemoDetailModal = ({ demo, onClose }: { demo: TutorDemo | null; onClose: () => void }) => {
  const [dtab, setDtab] = useState<DTab>("overview");

  useEffect(() => { if (demo) setDtab("overview"); }, [demo?._id]);

  if (!demo) return null;

  const sm = getStatusMeta(demo.status);
  const cl = demo.classLead;
  const subjects = (cl?.subject ?? [])
    .map((s: any) => s?.label ?? s?.value ?? "")
    .filter(Boolean)
    .join(", ");
  const location = [cl?.area, cl?.city].filter(Boolean).join(", ") || cl?.location || null;
  const genderLabel = (g?: string) => g === "M" ? "Male" : g === "F" ? "Female" : (g ?? null);
  const studentName = cl?.studentName ?? "Student";
  const avatarGrad = getAvatarGradient(studentName);

  const Row = ({
    icon, label, value, color = "#64748B", last = false,
  }: { icon: any; label: string; value?: string | number | null; color?: string; last?: boolean }) => {
    if (value === undefined || value === null || value === "") return null;
    return (
      <View style={[dm.row, last && { borderBottomWidth: 0 }]}>
        <View style={[dm.rowIcon, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={13} color={color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={dm.rowLabel}>{label}</Text>
          <Text style={dm.rowValue}>{String(value)}</Text>
        </View>
      </View>
    );
  };

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={dm.backdrop}>
        <View style={dm.sheet}>
          <View style={dm.handle} />

          {/* ── Header ── */}
          <View style={dm.headerWrap}>
            <View style={dm.headerTop}>
              <LinearGradient colors={avatarGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={dm.headerAvatar}>
                <Text style={dm.headerAvatarTxt}>{getInitials(studentName)}</Text>
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={dm.headerName} numberOfLines={1}>{studentName}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                  {subjects ? <Text style={dm.headerSubject}>{subjects}</Text> : null}
                  {cl?.leadId ? (
                    <View style={dm.leadPill}><Text style={dm.leadId}>#{cl.leadId}</Text></View>
                  ) : null}
                </View>
              </View>
              <Pressable onPress={onClose} style={dm.xBtn} hitSlop={8}>
                <Ionicons name="close" size={16} color={T.mutedFg} />
              </Pressable>
            </View>

            <View style={{ flexDirection: "row", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
              <View style={[dm.bigBadge, { backgroundColor: sm.bg, borderColor: `${sm.color}50` }]}>
                <Ionicons name={sm.icon} size={12} color={sm.color} />
                <Text style={[dm.bigBadgeTxt, { color: sm.color }]}>{sm.label}</Text>
              </View>
              <View style={dm.infoPill}>
                <Ionicons name="calendar-outline" size={11} color="#8B5CF6" />
                <Text style={[dm.infoPillTxt, { color: "#8B5CF6" }]}>{formatDate(demo.demoDate)}</Text>
              </View>
              {demo.demoTime ? (
                <View style={dm.infoPill}>
                  <Ionicons name="time-outline" size={11} color={T.primary} />
                  <Text style={[dm.infoPillTxt, { color: T.primary }]}>{demo.demoTime}</Text>
                </View>
              ) : null}
              {cl?.mode ? (
                <View style={dm.infoPill}>
                  <Ionicons name="tv-outline" size={11} color="#F59E0B" />
                  <Text style={[dm.infoPillTxt, { color: "#F59E0B" }]}>{cl.mode}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Tab bar (container pill pattern) ── */}
          <View style={dm.tabContainer}>
            {DTABS.map((t) => {
              const active = dtab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setDtab(t.key)}
                  style={[dm.tabItem, active && { backgroundColor: "#fff" }]}
                >
                  <Ionicons name={t.icon} size={13} color={active ? t.color : T.mutedFg} />
                  <Text style={[dm.tabLabel, active && { color: t.color, fontWeight: "800" }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* ── Tab content ── */}
          <View style={dm.tabContent}>
            {dtab === "overview" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dm.rows}>
                <Row icon="calendar-outline" label="Demo Date" value={formatDate(demo.demoDate)} color="#8B5CF6" />
                <Row icon="time-outline" label="Demo Time" value={demo.demoTime} color={T.primary} />
                <Row icon="person-outline" label="Assigned By" value={demo.assignedBy?.name} color="#10B981" />
                <Row icon="log-in-outline" label="Assigned At" value={demo.assignedAt ? formatDate(demo.assignedAt) : null} color="#10B981" />
                <Row icon="checkmark-done-outline" label="Completed At" value={demo.completedAt ? formatDate(demo.completedAt) : null} color="#8B5CF6" />
                <Row icon="location-outline" label="Location" value={location} color="#E11D48" />
                <Row icon="home-outline" label="Address" value={cl?.address} color="#E11D48" />
                {(location || cl?.address) && (() => {
                  const fullAddr = [cl?.address, cl?.area, cl?.city].filter(Boolean).join(", ");
                  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
                  return (
                    <Pressable
                      onPress={() => Linking.openURL(mapsUrl)}
                      style={({ pressed }) => [dm.mapsBtn, pressed && { transform: [{ scale: 0.97 }] }]}
                    >
                      <View style={dm.mapsBtnIcon}>
                        <Ionicons name="map-outline" size={14} color="#fff" />
                      </View>
                      <Text style={dm.mapsBtnTxt}>Open in Google Maps</Text>
                      <Ionicons name="open-outline" size={13} color={T.primary} />
                    </Pressable>
                  );
                })()}
                <Row icon="log-in-outline" label="Created" value={demo.createdAt ? formatDate(demo.createdAt) : null} color="#64748B" />
                <Row icon="refresh-outline" label="Last Updated" value={demo.updatedAt ? formatDate(demo.updatedAt) : null} color="#64748B" last />
              </ScrollView>
            )}

            {dtab === "student" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dm.rows}>
                <Row icon="person-outline" label="Name" value={cl?.studentName} color={T.primary} />
                <Row icon="male-female-outline" label="Gender" value={genderLabel(cl?.studentGender)} color="#8B5CF6" />
                <Row icon="school-outline" label="Grade" value={cl?.grade} color="#10B981" />
                <Row icon="book-outline" label="Board" value={cl?.board} color="#F59E0B" />
                <Row icon="library-outline" label="Subjects" value={subjects || null} color={T.primary} />
                <Row icon="people-outline" label="Student Type" value={cl?.studentType} color="#64748B" />
                {cl?.studentType === "GROUP" && (
                  <Row icon="people-circle-outline" label="No. of Students" value={cl?.numberOfStudents?.toString()} color="#EC4899" />
                )}
                <Row icon="person-outline" label="Parent Name" value={cl?.parentName} color="#64748B" />
                <Row icon="call-outline" label="Parent Phone" value={cl?.parentPhone} color="#10B981" />
                <Row icon="mail-outline" label="Parent Email" value={cl?.parentEmail} color={T.primary} last />
              </ScrollView>
            )}

            {dtab === "class" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dm.rows}>
                <Row icon="tv-outline" label="Mode" value={cl?.mode} color="#F59E0B" />
                <Row icon="time-outline" label="Timing" value={cl?.timing} color="#8B5CF6" />
                <Row icon="calendar-outline" label="Weekdays" value={cl?.weekdays?.join(", ") || null} color="#8B5CF6" />
                <Row icon="repeat-outline" label="Classes / Month" value={cl?.classesPerMonth?.toString() ?? null} color={T.primary} />
                <Row icon="hourglass-outline" label="Class Duration" value={cl?.classDurationHours ? `${cl.classDurationHours} hr` : null} color={T.primary} />
                <Row icon="cash-outline" label="Student Fees" value={cl?.paymentAmount ? `₹${cl.paymentAmount}` : null} color="#10B981" />
                <Row icon="wallet-outline" label="Tutor Fees" value={cl?.tutorFees ? `₹${cl.tutorFees}` : null} color="#10B981" />
                <Row icon="male-female-outline" label="Preferred Tutor Gender" value={cl?.preferredTutorGender} color="#64748B" />
                <Row icon="megaphone-outline" label="Lead Source" value={cl?.leadSource} color="#64748B" last />
              </ScrollView>
            )}

            {dtab === "outcome" && (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={dm.rows}>
                <Row
                  icon="person-done-outline"
                  label="Attendance"
                  value={demo.attendanceStatus}
                  color={demo.attendanceStatus === "PRESENT" ? "#10B981" : demo.attendanceStatus === "ABSENT" ? "#EF4444" : "#64748B"}
                />
                <Row icon="document-text-outline" label="Topic Covered" value={demo.topicCovered} color={T.primary} />
                <Row icon="hourglass-outline" label="Duration" value={demo.duration} color="#8B5CF6" />
                <Row icon="refresh-outline" label="Result Updated" value={demo.resultUpdatedAt ? formatDate(demo.resultUpdatedAt) : null} color="#64748B" />
                {demo.feedback ? (
                  <View style={[dm.row, { alignItems: "flex-start" }]}>
                    <View style={[dm.rowIcon, { backgroundColor: "#F59E0B15", marginTop: 2 }]}>
                      <Ionicons name="chatbubble-outline" size={13} color="#F59E0B" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Feedback</Text>
                      <Text style={[dm.rowValue, { lineHeight: 20, fontWeight: "500" }]}>{demo.feedback}</Text>
                    </View>
                  </View>
                ) : null}
                {demo.rejectionReason ? (
                  <View style={[dm.row, { alignItems: "flex-start" }]}>
                    <View style={[dm.rowIcon, { backgroundColor: "#EF444415", marginTop: 2 }]}>
                      <Ionicons name="close-circle-outline" size={13} color="#EF4444" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Rejection Reason</Text>
                      <Text style={[dm.rowValue, { lineHeight: 20, fontWeight: "500", color: "#EF4444" }]}>{demo.rejectionReason}</Text>
                    </View>
                  </View>
                ) : null}
                {demo.notes ? (
                  <View style={[dm.row, { alignItems: "flex-start", borderBottomWidth: 0 }]}>
                    <View style={[dm.rowIcon, { backgroundColor: `${T.primary}15`, marginTop: 2 }]}>
                      <Ionicons name="pencil-outline" size={13} color={T.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Notes</Text>
                      <Text style={[dm.rowValue, { lineHeight: 20, fontWeight: "500" }]}>{demo.notes}</Text>
                    </View>
                  </View>
                ) : null}
                {!demo.attendanceStatus && !demo.topicCovered && !demo.duration && !demo.feedback && !demo.rejectionReason && !demo.notes ? (
                  <View style={dm.outcomeEmpty}>
                    <View style={dm.outcomeEmptyIcon}>
                      <Ionicons name="hourglass-outline" size={24} color={T.mutedFg} />
                    </View>
                    <Text style={dm.outcomeEmptyTxt}>No outcome recorded yet</Text>
                  </View>
                ) : null}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── Screen ───────────────────────────────────────────────────────────────────

const MyDemosScreen = ({
  navigation,
  route,
}: {
  navigation: Nav;
  route: Route;
}) => {
  const insets = useSafeAreaInsets();
  const highlightId = (route.params as any)?.highlightId as string | undefined;

  const [demos, setDemos] = useState<TutorDemo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string | undefined>(undefined);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [selected, setSelected] = useState<TutorDemo | null>(null);
  const flatListRef = React.useRef<FlatList>(null);


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
    return () => { show.remove(); hide.remove(); };
  }, []);

  const [submitItem, setSubmitItem] = useState<TutorDemo | null>(null);
  const [submitTopic, setSubmitTopic] = useState("");
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [submitAttStatus, setSubmitAttStatus] = useState<"PRESENT" | "ABSENT" | "">("");
  const [submitSubmitting, setSubmitSubmitting] = useState(false);
  const [localSubmittedIds, setLocalSubmittedIds] = useState<Set<string>>(new Set());

  const load = useCallback(
    async (p = 1, f = filter, append = false) => {
      try {
        if (!append) setLoading(true);
        setError(null);
        const res = await getMyDemos(p, 12, f);
        const list = res.data ?? [];
        setDemos((prev) => (append ? [...prev, ...list] : list));
        setHasMore(p < (res.pagination?.pages ?? 1));
        setTotalCount(res.pagination?.total ?? list.length);
        setPage(p);
      } catch (e: any) {
        setError(e?.message ?? "Failed to load demos");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter],
  );

  useEffect(() => { load(1, filter); }, [filter]);

  useEffect(() => {
    if (!highlightId || demos.length === 0) return;
    const idx = demos.findIndex((d) => d._id === highlightId);
    if (idx === -1) return;
    setSelected(demos[idx]);
    flatListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
  }, [highlightId, demos]);

  const onRefresh = () => { setRefreshing(true); load(1, filter); };
  const onLoadMore = () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    load(page + 1, filter, true);
  };
  const changeFilter = (f: string | undefined) => {
    if (f === filter) return;
    setFilter(f);
    setDemos([]);
    setPage(1);
    setHasMore(true);
  };
  const openSubmitModal = (demo: TutorDemo) => {
    setSubmitItem(demo);
    setSubmitTopic("");
    setSubmitFeedback("");
    setSubmitAttStatus("");
  };
  const submitDemo = async () => {
    if (!submitItem || !submitAttStatus) return;
    setSubmitSubmitting(true);
    try {
      await submitDemoResult((submitItem.classLead as any)?._id ?? submitItem._id, {
        status: "COMPLETED",
        attendanceStatus: submitAttStatus,
        topicCovered: submitTopic,
        feedback: submitFeedback,
      });
      setLocalSubmittedIds((prev) => new Set(prev).add(submitItem._id));
      setSubmitItem(null);
    } catch {
      // silent — user can retry
    } finally {
      setSubmitSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      {/* ── Gradient header ── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <View style={s.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>My Demos</Text>
            <Text style={s.heroSub}>Track all your scheduled demos</Text>
          </View>
          {!loading && (
            <View style={s.countPill}>
              <View style={s.countDot} />
              <Text style={s.countTxt}>{totalCount} total</Text>
            </View>
          )}
        </View>

        <StatsStrip demos={demos} total={totalCount} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
          style={{ marginTop: 14 }}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const meta = f.key ? getStatusMeta(f.key) : null;
            return (
              <Pressable
                key={f.key ?? "all"}
                onPress={() => changeFilter(f.key)}
                style={({ pressed }) => [
                  s.filterChip,
                  active && { backgroundColor: "#fff", borderColor: "#fff" },
                  pressed && { transform: [{ scale: 0.96 }] },
                ]}
              >
                {meta ? <Ionicons name={meta.icon} size={11} color={active ? "#1a1a1a" : "rgba(255,255,255,0.85)"} /> : null}
                <Text style={[s.filterTxt, active && { color: "#1a1a1a", fontWeight: "800" }]}>
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* ── List area ── */}
      <View style={s.listWrap}>
        {loading && !refreshing ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={s.loadingTxt}>Loading demos…</Text>
          </View>
        ) : error ? (
          <View style={s.centered}>
            <View style={s.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color={T.error} />
            </View>
            <Text style={s.errorTitle}>Something went wrong</Text>
            <Text style={s.errorTxt}>{error}</Text>
            <Pressable
              onPress={() => load()}
              style={({ pressed }) => [s.retryBtn, pressed && { transform: [{ scale: 0.97 }] }]}
            >
              <Text style={s.retryTxt}>Try Again</Text>
            </Pressable>
          </View>
        ) : demos.length === 0 ? (
          <View style={s.centered}>
            <View style={s.emptyIcon}>
              <Ionicons name="videocam-outline" size={32} color="#8B5CF6" />
            </View>
            <Text style={s.emptyTitle}>No Demos Found</Text>
            <Text style={s.emptyTxt}>
              {filter ? `No ${filter.toLowerCase()} demos yet.` : "You have no demos assigned yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={demos}
            keyExtractor={(item) => item._id}
            renderItem={({ item, index }) => (
              <DemoCard
                demo={item}
                index={index}
                onPress={() => setSelected(item)}
                onSubmit={openSubmitModal}
                highlighted={item._id === highlightId}
                submitted={localSubmittedIds.has(item._id)}
              />
            )}
            contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 10 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
            }
            onEndReached={onLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              loadingMore ? (
                <View style={{ paddingVertical: 16, alignItems: "center" }}>
                  <ActivityIndicator color={T.primary} />
                </View>
              ) : null
            }
          />
        )}
      </View>

      <DemoDetailModal demo={selected} onClose={() => setSelected(null)} />

      {/* ── Submit Demo Modal ── */}
      {submitItem ? (
        <Modal visible animationType="slide" transparent onRequestClose={() => setSubmitItem(null)}>
            <View style={mds.backdrop}>
              <View style={[mds.sheet, { marginBottom: kbHeight }]}>
                <View style={mds.handle} />

                <View style={mds.header}>
                  <View style={mds.headerRow}>
                    <View style={mds.headerIconWrap}>
                      <Ionicons name="clipboard-outline" size={18} color="#7C3AED" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={mds.headerTitle}>Submit Demo Result</Text>
                      <Text style={mds.headerSub} numberOfLines={1}>
                        {submitItem.classLead?.studentName ?? "Student"}
                      </Text>
                    </View>
                    <Pressable onPress={() => setSubmitItem(null)} style={mds.xBtn} hitSlop={8}>
                      <Ionicons name="close" size={16} color={T.mutedFg} />
                    </Pressable>
                  </View>
                </View>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={mds.body}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={mds.sectionLabel}>Attendance *</Text>
                  <View style={mds.attRow}>
                    {(["PRESENT", "ABSENT"] as const).map((a) => {
                      const isActive = submitAttStatus === a;
                      const col = a === "PRESENT" ? "#10B981" : "#EF4444";
                      return (
                        <Pressable
                          key={a}
                          onPress={() => setSubmitAttStatus(a)}
                          style={({ pressed }) => [
                            mds.attChip,
                            isActive && { backgroundColor: col, borderColor: col },
                            pressed && { transform: [{ scale: 0.97 }] },
                          ]}
                        >
                          <Ionicons
                            name={a === "PRESENT" ? "checkmark-circle" : "close-circle"}
                            size={16}
                            color={isActive ? "#fff" : col}
                          />
                          <Text style={[mds.attChipTxt, isActive && { color: "#fff" }]}>
                            {a === "PRESENT" ? "Present" : "Absent"}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <Text style={mds.sectionLabel}>Topic Covered</Text>
                  <TextInput
                    value={submitTopic}
                    onChangeText={setSubmitTopic}
                    style={mds.input}
                    placeholder="e.g. Introduction to Algebra"
                    placeholderTextColor={T.mutedFg}
                  />

                  <Text style={mds.sectionLabel}>Feedback</Text>
                  <TextInput
                    value={submitFeedback}
                    onChangeText={setSubmitFeedback}
                    style={[mds.input, mds.inputMulti]}
                    placeholder="How did the demo go?"
                    placeholderTextColor={T.mutedFg}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  <Pressable
                    onPress={submitDemo}
                    disabled={!submitAttStatus || submitSubmitting}
                    style={({ pressed }) => [
                      mds.submitBtn,
                      (!submitAttStatus || submitSubmitting) && { opacity: 0.45 },
                      pressed && { transform: [{ scale: 0.97 }] },
                    ]}
                  >
                    <View style={mds.submitBtnInner}>
                      {submitSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons name="send-outline" size={15} color="#fff" />
                          <Text style={mds.submitBtnTxt}>Submit Result</Text>
                        </>
                      )}
                    </View>
                  </Pressable>
                </ScrollView>
              </View>
            </View>
        </Modal>
      ) : null}
    </View>
  );
};

export default MyDemosScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F7FB" },

  hero: { paddingHorizontal: 20, paddingBottom: 16, overflow: "hidden" },
  topBar: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", letterSpacing: -0.5 },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  countPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  countDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: T.success },
  countTxt: { fontSize: 11, fontWeight: "700", color: "rgba(255,255,255,0.9)" },

  strip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: 14,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripVal: { color: "#fff", fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  stripLbl: { color: "rgba(255,255,255,0.45)", fontSize: 9, fontWeight: "600", textAlign: "center", marginTop: 3, letterSpacing: 0.2 },
  stripSep: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },

  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderColor: "rgba(255,255,255,0.25)",
  },
  filterTxt: { fontSize: 12, fontWeight: "600", color: "rgba(255,255,255,0.85)" },

  listWrap: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 32 },
  loadingTxt: { fontSize: 13, color: T.mutedFg },

  errorIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#FECACA",
  },
  errorTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  errorTxt: { fontSize: 13, color: T.mutedFg, textAlign: "center" },
  retryBtn: { backgroundColor: T.primary, borderRadius: 10, paddingHorizontal: 22, paddingVertical: 10 },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },

  emptyIcon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: "#8B5CF608",
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "#8B5CF630",
  },
  emptyTitle: { fontSize: 18, fontWeight: "800", color: T.textPrimary, letterSpacing: -0.3 },
  emptyTxt: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20 },

  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    overflow: "hidden",
  },
  cardBody: { padding: 16, gap: 10 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  avatarTxt: { color: "#fff", fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  studentName: { fontSize: 15, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  subjectTxt: { fontSize: 11, color: T.mutedFg, marginTop: 2, fontWeight: "500" },
  statusBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 20, borderWidth: 1,
  },
  metaChipTxt: { fontSize: 10, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  locTxt: { fontSize: 11, color: T.mutedFg, flex: 1, fontWeight: "500" },
  notesPreview: { fontSize: 11, color: T.mutedFg, fontStyle: "italic", lineHeight: 16 },
  cardDivider: { height: 1, backgroundColor: "#F1F5F9" },
  submitBar: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: "#7C3AED08",
  },
  submitBarTxt: { flex: 1, fontSize: 12, fontWeight: "700", color: "#7C3AED" },
});

// ─── Detail Modal Styles ──────────────────────────────────────────────────────

const dm = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: "#F8FAFC",
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: "88%", overflow: "hidden",
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: "#CBD5E1", alignSelf: "center",
    marginTop: 12,
  },
  headerWrap: {
    backgroundColor: "#fff",
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerAvatar: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  headerAvatarTxt: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.3 },
  headerName: { fontSize: 16, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  headerSubject: { fontSize: 11, color: T.mutedFg, fontWeight: "500" },
  leadPill: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: "#F1F5F9" },
  leadId: { fontSize: 10, color: T.mutedFg, fontWeight: "700" },
  xBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  bigBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 1 },
  bigBadgeTxt: { fontSize: 11, fontWeight: "800" },
  infoPill: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: "#F1F5F9" },
  infoPillTxt: { fontSize: 11, fontWeight: "700" },

  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#EEF2F8",
    borderRadius: 12,
    margin: 12,
    padding: 3,
  },
  tabItem: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 7, gap: 4, borderRadius: 9,
  },
  tabLabel: { fontSize: 11, fontWeight: "600", color: T.mutedFg },

  tabContent: { flex: 1, overflow: "hidden" },
  rows: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: T.border,
  },
  rowIcon: { width: 30, height: 30, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 10, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  rowValue: { fontSize: 13, fontWeight: "600", color: T.textPrimary },

  mapsBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE",
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11,
    marginTop: 8, marginBottom: 4,
  },
  mapsBtnIcon: { width: 26, height: 26, borderRadius: 8, backgroundColor: T.primary, alignItems: "center", justifyContent: "center" },
  mapsBtnTxt: { flex: 1, fontSize: 13, fontWeight: "700", color: T.primary },

  outcomeEmpty: { alignItems: "center", paddingVertical: 28, gap: 10 },
  outcomeEmptyIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },
  outcomeEmptyTxt: { fontSize: 13, color: T.mutedFg },
});

// ─── Submit Modal Styles ──────────────────────────────────────────────────────

const mds = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "85%", overflow: "hidden" },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#CBD5E1", alignSelf: "center", marginTop: 12 },
  header: {
    paddingHorizontal: 16, paddingTop: 14, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: "#F1F5F9",
  },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: {
    width: 44, height: 44, borderRadius: 13,
    backgroundColor: "#7C3AED10", borderWidth: 1, borderColor: "#7C3AED20",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { fontSize: 16, fontWeight: "800", color: "#0F172A", letterSpacing: -0.3 },
  headerSub: { fontSize: 12, color: T.mutedFg, marginTop: 1, fontWeight: "500" },
  xBtn: { width: 30, height: 30, borderRadius: 8, backgroundColor: "#F1F5F9", alignItems: "center", justifyContent: "center" },

  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },

  attRow: { flexDirection: "row", gap: 10 },
  attChip: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7,
    paddingVertical: 13, borderRadius: 12, borderWidth: 1.5,
    backgroundColor: "transparent", borderColor: T.border,
  },
  attChipTxt: { fontSize: 13, fontWeight: "800", color: T.textPrimary },

  input: {
    borderWidth: 1, borderColor: T.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 13, color: T.textPrimary, backgroundColor: "#F8FAFC",
  },
  inputMulti: { height: 90, paddingTop: 12 },

  submitBtn: { marginTop: 4, borderRadius: 13, overflow: "hidden" },
  submitBtnInner: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 14, backgroundColor: T.primary,
  },
  submitBtnTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
