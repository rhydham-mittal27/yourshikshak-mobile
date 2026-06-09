import React, { useCallback, useEffect, useState } from "react";
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
  KeyboardAvoidingView,
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

const STATUS_META: Record<
  string,
  { label: string; color: string; icon: any; bg: string }
> = {
  APPROVED: {
    label: "Approved",
    color: "#10B981",
    icon: "checkmark-circle",
    bg: "#10B98118",
  },
  REJECTED: {
    label: "Rejected",
    color: "#EF4444",
    icon: "close-circle",
    bg: "#EF444418",
  },
  COMPLETED: {
    label: "Completed",
    color: "#2D68C4",
    icon: "checkmark-done-circle",
    bg: "#2D68C418",
  },
  PENDING: {
    label: "Pending",
    color: "#F59E0B",
    icon: "time",
    bg: "#F59E0B18",
  },
  SCHEDULED: {
    label: "Scheduled",
    color: "#8B5CF6",
    icon: "calendar",
    bg: "#8B5CF618",
  },
  CANCELLED: {
    label: "Cancelled",
    color: "#64748B",
    icon: "ban",
    bg: "#64748B18",
  },
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
const isSubmittable = (status: string) =>
  SUBMITTABLE.has(status?.toUpperCase());

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

const DemoCard = ({
  demo,
  onPress,
  onSubmit,
  highlighted = false,
  submitted = false,
}: {
  demo: TutorDemo;
  onPress: () => void;
  onSubmit: (demo: TutorDemo) => void;
  highlighted?: boolean;
  submitted?: boolean;
}) => {
  const meta = getStatusMeta(demo.status);
  const subjects = (demo.classLead?.subject ?? [])
    .map((s) => s?.label ?? s?.value ?? "")
    .filter(Boolean)
    .join(", ");

  return (
    <View>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          s.card,
          highlighted && {
            borderColor: meta.color,
            borderWidth: 2,
            shadowColor: meta.color,
            shadowOpacity: 0.25,
            shadowRadius: 10,
            elevation: 6,
          },
          pressed && { opacity: 0.88 },
        ]}
      >
        {/* left accent bar */}
        <View style={[s.accentBar, { backgroundColor: meta.color }]} />

        <View style={s.cardBody}>
          {/* top row: student + status badge */}
          <View style={s.cardTop}>
            <View style={s.studentRow}>
              <LinearGradient
                colors={[`${meta.color}28`, `${meta.color}10`]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.avatarBox}
              >
                <Ionicons name="person" size={16} color={meta.color} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={s.studentName} numberOfLines={1}>
                  {demo.classLead?.studentName ?? "Student"}
                </Text>
                {subjects ? (
                  <Text style={s.subjectTxt} numberOfLines={1}>
                    {subjects}
                  </Text>
                ) : null}
              </View>
            </View>
            <View
              style={[
                s.statusBadge,
                { backgroundColor: meta.bg, borderColor: `${meta.color}40` },
              ]}
            >
              <Ionicons name={meta.icon} size={11} color={meta.color} />
              <Text style={[s.statusTxt, { color: meta.color }]}>
                {meta.label}
              </Text>
            </View>
          </View>

          {/* meta chips row */}
          <View style={s.metaRow}>
            <MetaChip
              icon="calendar-outline"
              value={formatDate(demo.demoDate)}
              color="#8B5CF6"
            />
            <MetaChip
              icon="time-outline"
              value={demo.demoTime ?? "—"}
              color="#2D68C4"
            />
            {demo.classLead?.mode && (
              <MetaChip
                icon="tv-outline"
                value={demo.classLead.mode}
                color="#F59E0B"
              />
            )}
            {demo.classLead?.grade && (
              <MetaChip
                icon="school-outline"
                value={`Gr. ${demo.classLead.grade}`}
                color="#10B981"
              />
            )}
          </View>

          {/* location row */}
          {(demo.classLead?.city || demo.classLead?.area) && (
            <View style={s.locRow}>
              <Ionicons name="location-outline" size={11} color={T.mutedFg} />
              <Text style={s.locTxt} numberOfLines={1}>
                {[demo.classLead.area, demo.classLead.city]
                  .filter(Boolean)
                  .join(", ")}
              </Text>
            </View>
          )}

          {/* notes preview */}
          {demo.notes && (
            <Text style={s.notesPreview} numberOfLines={1}>
              Note: {demo.notes}
            </Text>
          )}
        </View>

        <Ionicons
          name="chevron-forward"
          size={14}
          color={T.mutedFg}
          style={{ marginRight: 14, alignSelf: "center" }}
        />
      </Pressable>
      {isSubmittable(demo.status) && !submitted && (
        <Pressable
          onPress={() => onSubmit(demo)}
          style={({ pressed }) => [s.submitBar, pressed && { opacity: 0.82 }]}
        >
          <Ionicons name="clipboard-outline" size={13} color="#fff" />
          <Text style={s.submitBarTxt}>Submit Demo Result</Text>
          <Ionicons
            name="chevron-forward"
            size={13}
            color="rgba(255,255,255,0.7)"
          />
        </Pressable>
      )}
    </View>
  );
};

const MetaChip = ({
  icon,
  value,
  color,
}: {
  icon: any;
  value: string;
  color: string;
}) => (
  <View
    style={[
      s.metaChip,
      { backgroundColor: `${color}12`, borderColor: `${color}30` },
    ]}
  >
    <Ionicons name={icon} size={10} color={color} />
    <Text style={[s.metaChipTxt, { color }]}>{value}</Text>
  </View>
);

type DTab = "overview" | "student" | "class" | "outcome";

const DemoDetailModal = ({
  demo,
  onClose,
}: {
  demo: TutorDemo | null;
  onClose: () => void;
}) => {
  const [dtab, setDtab] = useState<DTab>("overview");
  if (!demo) return null;
  const sm = getStatusMeta(demo.status);
  const cl = demo.classLead;
  const subjects = (cl?.subject ?? [])
    .map((s) => s?.label ?? s?.value ?? "")
    .filter(Boolean)
    .join(", ");
  const location =
    [cl?.area, cl?.city].filter(Boolean).join(", ") || cl?.location || null;
  const genderLabel = (g?: string) =>
    g === "M" ? "Male" : g === "F" ? "Female" : (g ?? null);

  const Row = ({
    icon,
    label,
    value,
    color = "#64748B",
    last = false,
  }: {
    icon: any;
    label: string;
    value?: string | number | null;
    color?: string;
    last?: boolean;
  }) => {
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

  const DTABS: { key: DTab; label: string; icon: any; color: string }[] = [
    {
      key: "overview",
      label: "Overview",
      icon: "grid-outline",
      color: "#8B5CF6",
    },
    {
      key: "student",
      label: "Student",
      icon: "person-outline",
      color: "#2D68C4",
    },
    { key: "class", label: "Class", icon: "layers-outline", color: "#F59E0B" },
    {
      key: "outcome",
      label: "Outcome",
      icon: "checkmark-circle-outline",
      color: "#10B981",
    },
  ];

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={dm.backdrop}>
        <View style={dm.sheet}>
          <View style={dm.handle} />

          {/* Hero header */}
          <LinearGradient
            colors={[`${sm.color}22`, `${sm.color}08`, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={dm.headerGrad}
          >
            <View style={dm.headerTop}>
              <LinearGradient
                colors={[`${sm.color}35`, `${sm.color}18`]}
                style={dm.headerAvatar}
              >
                <Ionicons name="person" size={20} color={sm.color} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={dm.headerName} numberOfLines={1}>
                  {cl?.studentName ?? "Student"}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 3,
                    flexWrap: "wrap",
                  }}
                >
                  {subjects ? (
                    <Text style={dm.headerSubject}>{subjects}</Text>
                  ) : null}
                  {cl?.leadId && (
                    <View style={dm.leadPill}>
                      <Text style={dm.leadId}>#{cl.leadId}</Text>
                    </View>
                  )}
                </View>
              </View>
              <Pressable onPress={onClose} style={dm.xBtn}>
                <Ionicons name="close" size={16} color={T.mutedFg} />
              </Pressable>
            </View>

            {/* status + date chips */}
            <View
              style={{
                flexDirection: "row",
                gap: 8,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <View
                style={[
                  dm.bigBadge,
                  { backgroundColor: sm.bg, borderColor: `${sm.color}50` },
                ]}
              >
                <Ionicons name={sm.icon} size={12} color={sm.color} />
                <Text style={[dm.bigBadgeTxt, { color: sm.color }]}>
                  {sm.label}
                </Text>
              </View>
              <View style={dm.infoPill}>
                <Ionicons name="calendar-outline" size={11} color="#8B5CF6" />
                <Text style={[dm.infoPillTxt, { color: "#8B5CF6" }]}>
                  {formatDate(demo.demoDate)}
                </Text>
              </View>
              <View style={dm.infoPill}>
                <Ionicons name="time-outline" size={11} color="#2D68C4" />
                <Text style={[dm.infoPillTxt, { color: "#2D68C4" }]}>
                  {demo.demoTime}
                </Text>
              </View>
              {cl?.mode && (
                <View style={dm.infoPill}>
                  <Ionicons name="tv-outline" size={11} color="#F59E0B" />
                  <Text style={[dm.infoPillTxt, { color: "#F59E0B" }]}>
                    {cl.mode}
                  </Text>
                </View>
              )}
            </View>
          </LinearGradient>

          {/* Tab bar */}
          <View style={dm.tabBar}>
            {DTABS.map((t) => {
              const active = dtab === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => setDtab(t.key)}
                  style={[
                    dm.tabItem,
                    active && {
                      borderBottomColor: t.color,
                      borderBottomWidth: 2,
                    },
                  ]}
                >
                  <Ionicons
                    name={t.icon}
                    size={13}
                    color={active ? t.color : T.mutedFg}
                  />
                  <Text
                    style={[
                      dm.tabLabel,
                      active && { color: t.color, fontWeight: "800" },
                    ]}
                  >
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Tab content */}
          <View style={dm.tabContent}>
            {/* OVERVIEW */}
            {dtab === "overview" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dm.rows}
              >
                <Row
                  icon="calendar-outline"
                  label="Demo Date"
                  value={formatDate(demo.demoDate)}
                  color="#8B5CF6"
                />
                <Row
                  icon="time-outline"
                  label="Demo Time"
                  value={demo.demoTime}
                  color="#2D68C4"
                />
                <Row
                  icon="person-outline"
                  label="Assigned By"
                  value={demo.assignedBy?.name}
                  color="#10B981"
                />
                <Row
                  icon="log-in-outline"
                  label="Assigned At"
                  value={demo.assignedAt ? formatDate(demo.assignedAt) : null}
                  color="#10B981"
                />
                <Row
                  icon="checkmark-done-outline"
                  label="Completed At"
                  value={demo.completedAt ? formatDate(demo.completedAt) : null}
                  color="#8B5CF6"
                />
                <Row
                  icon="location-outline"
                  label="Location"
                  value={location}
                  color="#E11D48"
                />
                <Row
                  icon="home-outline"
                  label="Address"
                  value={cl?.address}
                  color="#E11D48"
                />
                {(location || cl?.address) &&
                  (() => {
                    const fullAddr = [cl?.address, cl?.area, cl?.city]
                      .filter(Boolean)
                      .join(", ");
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddr)}`;
                    return (
                      <Pressable
                        onPress={() => Linking.openURL(mapsUrl)}
                        style={({ pressed }) => [
                          dm.mapsBtn,
                          pressed && { opacity: 0.7 },
                        ]}
                      >
                        <View style={dm.mapsBtnIcon}>
                          <Ionicons name="map-outline" size={14} color="#fff" />
                        </View>
                        <Text style={dm.mapsBtnTxt}>Open in Google Maps</Text>
                        <Ionicons
                          name="open-outline"
                          size={13}
                          color="#2D68C4"
                        />
                      </Pressable>
                    );
                  })()}
                <Row
                  icon="log-in-outline"
                  label="Created"
                  value={demo.createdAt ? formatDate(demo.createdAt) : null}
                  color="#64748B"
                />
                <Row
                  icon="refresh-outline"
                  label="Last Updated"
                  value={demo.updatedAt ? formatDate(demo.updatedAt) : null}
                  color="#64748B"
                  last
                />
              </ScrollView>
            )}

            {/* STUDENT */}
            {dtab === "student" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dm.rows}
              >
                <Row
                  icon="person-outline"
                  label="Name"
                  value={cl?.studentName}
                  color="#2D68C4"
                />
                <Row
                  icon="male-female-outline"
                  label="Gender"
                  value={genderLabel(cl?.studentGender)}
                  color="#8B5CF6"
                />
                <Row
                  icon="school-outline"
                  label="Grade"
                  value={cl?.grade}
                  color="#10B981"
                />
                <Row
                  icon="book-outline"
                  label="Board"
                  value={cl?.board}
                  color="#F59E0B"
                />
                <Row
                  icon="library-outline"
                  label="Subjects"
                  value={subjects || null}
                  color="#2D68C4"
                />
                <Row
                  icon="people-outline"
                  label="Student Type"
                  value={cl?.studentType}
                  color="#64748B"
                />
                {cl?.studentType === "GROUP" && (
                  <Row
                    icon="people-circle-outline"
                    label="No. of Students"
                    value={cl?.numberOfStudents?.toString()}
                    color="#EC4899"
                  />
                )}
                <Row
                  icon="person-outline"
                  label="Parent Name"
                  value={cl?.parentName}
                  color="#64748B"
                />
                <Row
                  icon="call-outline"
                  label="Parent Phone"
                  value={cl?.parentPhone}
                  color="#10B981"
                />
                <Row
                  icon="mail-outline"
                  label="Parent Email"
                  value={cl?.parentEmail}
                  color="#2D68C4"
                  last
                />
              </ScrollView>
            )}

            {/* CLASS */}
            {dtab === "class" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dm.rows}
              >
                <Row
                  icon="tv-outline"
                  label="Mode"
                  value={cl?.mode}
                  color="#F59E0B"
                />
                <Row
                  icon="time-outline"
                  label="Timing"
                  value={cl?.timing}
                  color="#8B5CF6"
                />
                <Row
                  icon="calendar-outline"
                  label="Weekdays"
                  value={cl?.weekdays?.join(", ") || null}
                  color="#8B5CF6"
                />
                <Row
                  icon="repeat-outline"
                  label="Classes / Month"
                  value={cl?.classesPerMonth?.toString() ?? null}
                  color="#2D68C4"
                />
                <Row
                  icon="hourglass-outline"
                  label="Class Duration"
                  value={
                    cl?.classDurationHours
                      ? `${cl.classDurationHours} hr`
                      : null
                  }
                  color="#2D68C4"
                />
                <Row
                  icon="cash-outline"
                  label="Student Fees"
                  value={cl?.paymentAmount ? `₹${cl.paymentAmount}` : null}
                  color="#10B981"
                />
                <Row
                  icon="wallet-outline"
                  label="Tutor Fees"
                  value={cl?.tutorFees ? `₹${cl.tutorFees}` : null}
                  color="#10B981"
                />
                <Row
                  icon="male-female-outline"
                  label="Preferred Tutor Gender"
                  value={cl?.preferredTutorGender}
                  color="#64748B"
                />
                <Row
                  icon="megaphone-outline"
                  label="Lead Source"
                  value={cl?.leadSource}
                  color="#64748B"
                  last
                />
              </ScrollView>
            )}

            {/* OUTCOME */}
            {dtab === "outcome" && (
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={dm.rows}
              >
                <Row
                  icon="person-done-outline"
                  label="Attendance"
                  value={demo.attendanceStatus}
                  color={
                    demo.attendanceStatus === "PRESENT"
                      ? "#10B981"
                      : demo.attendanceStatus === "ABSENT"
                        ? "#EF4444"
                        : "#64748B"
                  }
                />
                <Row
                  icon="document-text-outline"
                  label="Topic Covered"
                  value={demo.topicCovered}
                  color="#2D68C4"
                />
                <Row
                  icon="hourglass-outline"
                  label="Duration"
                  value={demo.duration}
                  color="#8B5CF6"
                />
                <Row
                  icon="refresh-outline"
                  label="Result Updated"
                  value={
                    demo.resultUpdatedAt
                      ? formatDate(demo.resultUpdatedAt)
                      : null
                  }
                  color="#64748B"
                />
                {demo.feedback && (
                  <View style={[dm.row, { alignItems: "flex-start" }]}>
                    <View
                      style={[
                        dm.rowIcon,
                        { backgroundColor: "#F59E0B15", marginTop: 2 },
                      ]}
                    >
                      <Ionicons
                        name="chatbubble-outline"
                        size={13}
                        color="#F59E0B"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Feedback</Text>
                      <Text
                        style={[
                          dm.rowValue,
                          { lineHeight: 20, fontWeight: "500" },
                        ]}
                      >
                        {demo.feedback}
                      </Text>
                    </View>
                  </View>
                )}
                {demo.rejectionReason && (
                  <View style={[dm.row, { alignItems: "flex-start" }]}>
                    <View
                      style={[
                        dm.rowIcon,
                        { backgroundColor: "#EF444415", marginTop: 2 },
                      ]}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={13}
                        color="#EF4444"
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Rejection Reason</Text>
                      <Text
                        style={[
                          dm.rowValue,
                          {
                            lineHeight: 20,
                            fontWeight: "500",
                            color: "#EF4444",
                          },
                        ]}
                      >
                        {demo.rejectionReason}
                      </Text>
                    </View>
                  </View>
                )}
                {demo.notes && (
                  <View
                    style={[
                      dm.row,
                      { alignItems: "flex-start", borderBottomWidth: 0 },
                    ]}
                  >
                    <View
                      style={[
                        dm.rowIcon,
                        { backgroundColor: `${T.primary}15`, marginTop: 2 },
                      ]}
                    >
                      <Ionicons
                        name="pencil-outline"
                        size={13}
                        color={T.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={dm.rowLabel}>Notes</Text>
                      <Text
                        style={[
                          dm.rowValue,
                          { lineHeight: 20, fontWeight: "500" },
                        ]}
                      >
                        {demo.notes}
                      </Text>
                    </View>
                  </View>
                )}
                {!demo.attendanceStatus &&
                  !demo.topicCovered &&
                  !demo.duration &&
                  !demo.feedback &&
                  !demo.rejectionReason &&
                  !demo.notes && (
                    <View
                      style={{
                        alignItems: "center",
                        paddingVertical: 24,
                        gap: 8,
                      }}
                    >
                      <Ionicons
                        name="hourglass-outline"
                        size={28}
                        color={T.mutedFg}
                      />
                      <Text style={{ fontSize: 13, color: T.mutedFg }}>
                        No outcome recorded yet
                      </Text>
                    </View>
                  )}
              </ScrollView>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
  const [selected, setSelected] = useState<TutorDemo | null>(null);
  const flatListRef = React.useRef<FlatList>(null);

  // submit modal state
  const [submitItem, setSubmitItem] = useState<TutorDemo | null>(null);
  const [submitTopic, setSubmitTopic] = useState("");
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [submitAttStatus, setSubmitAttStatus] = useState<
    "PRESENT" | "ABSENT" | ""
  >("");
  const [submitSubmitting, setSubmitSubmitting] = useState(false);
  const [localSubmittedIds, setLocalSubmittedIds] = useState<Set<string>>(
    new Set(),
  );

  const load = useCallback(
    async (p = 1, f = filter, append = false) => {
      try {
        if (!append) setLoading(true);
        setError(null);
        const res = await getMyDemos(p, 12, f);
        const list = res.data ?? [];
        setDemos((prev) => (append ? [...prev, ...list] : list));
        setHasMore(p < (res.pagination?.pages ?? 1));
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

  useEffect(() => {
    load(1, filter);
  }, [filter]);

  // Auto-open + scroll to highlighted demo from dashboard tap
  useEffect(() => {
    if (!highlightId || demos.length === 0) return;
    const idx = demos.findIndex((d) => d._id === highlightId);
    if (idx === -1) return;
    setSelected(demos[idx]);
    flatListRef.current?.scrollToIndex({
      index: idx,
      animated: true,
      viewPosition: 0.3,
    });
  }, [highlightId, demos]);

  const onRefresh = () => {
    setRefreshing(true);
    load(1, filter);
  };
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
    } catch (e: any) {
      // silent — user can retry
    } finally {
      setSubmitSubmitting(false);
    }
  };

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        {/* decorative orbs */}
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        <View style={s.topBar}>
          <Pressable
            onPress={() => navigation.goBack()}
            style={s.backBtn}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={s.heroTitle}>My Demos</Text>
            <Text style={s.heroSub}>Track all your scheduled demos</Text>
          </View>
          <View style={[s.countPill, { opacity: loading ? 0 : 1 }]}>
            <Text style={s.countTxt}>{demos.length}</Text>
          </View>
        </View>

        {/* filter chips */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterRow}
        >
          {FILTERS.map((f) => {
            const active = f.key === filter;
            const sm = f.key ? getStatusMeta(f.key) : null;
            return (
              <Pressable
                key={f.key ?? "all"}
                onPress={() => changeFilter(f.key)}
                style={[
                  s.filterChip,
                  active && {
                    backgroundColor: sm?.color ?? "#fff",
                    borderColor: sm?.color ?? "#fff",
                  },
                ]}
              >
                {sm && (
                  <Ionicons
                    name={sm.icon}
                    size={11}
                    color={active ? "#fff" : sm.color}
                  />
                )}
                <Text
                  style={[
                    s.filterTxt,
                    active && { color: "#fff", fontWeight: "800" },
                  ]}
                >
                  {f.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </LinearGradient>

      {/* list */}
      <View style={s.listWrap}>
        {loading && !refreshing ? (
          <View style={s.centered}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={s.loadingTxt}>Loading demos…</Text>
          </View>
        ) : error ? (
          <View style={s.centered}>
            <Ionicons name="alert-circle-outline" size={40} color={T.error} />
            <Text style={s.errorTxt}>{error}</Text>
            <Pressable onPress={() => load()} style={s.retryBtn}>
              <Text style={s.retryTxt}>Retry</Text>
            </Pressable>
          </View>
        ) : demos.length === 0 ? (
          <View style={s.centered}>
            <LinearGradient
              colors={["#8B5CF618", "#2D68C410"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.emptyIcon}
            >
              <Ionicons name="videocam-outline" size={32} color="#8B5CF6" />
            </LinearGradient>
            <Text style={s.emptyTitle}>No Demos Found</Text>
            <Text style={s.emptyTxt}>
              {filter
                ? `No ${filter.toLowerCase()} demos yet.`
                : "You have no demos assigned yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={demos}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
              <DemoCard
                demo={item}
                onPress={() => setSelected(item)}
                onSubmit={openSubmitModal}
                highlighted={item._id === highlightId}
                submitted={localSubmittedIds.has(item._id)}
              />
            )}
            contentContainerStyle={{
              padding: 16,
              paddingBottom: insets.bottom + 24,
              gap: 10,
            }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={T.primary}
              />
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

      {/* Submit Demo Modal */}
      {submitItem && (
        <Modal
          visible
          animationType="slide"
          transparent
          onRequestClose={() => setSubmitItem(null)}
        >
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <View style={sm.backdrop}>
              <View style={sm.sheet}>
                <View style={sm.handle} />

                {/* header */}
                <LinearGradient
                  colors={["#7C3AED18", "#2D68C410", "transparent"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={sm.header}
                >
                  <View style={sm.headerRow}>
                    <LinearGradient
                      colors={["#7C3AED35", "#7C3AED18"]}
                      style={sm.headerIcon}
                    >
                      <Ionicons
                        name="clipboard-outline"
                        size={18}
                        color="#7C3AED"
                      />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={sm.headerTitle}>Submit Demo Result</Text>
                      <Text style={sm.headerSub} numberOfLines={1}>
                        {submitItem.classLead?.studentName ?? "Student"}
                      </Text>
                    </View>
                    <Pressable
                      onPress={() => setSubmitItem(null)}
                      style={sm.xBtn}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={16} color={T.mutedFg} />
                    </Pressable>
                  </View>
                </LinearGradient>

                <ScrollView
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={sm.body}
                  keyboardShouldPersistTaps="handled"
                >
                  {/* Attendance */}
                  <Text style={sm.sectionLabel}>Attendance *</Text>
                  <View style={sm.attRow}>
                    {(["PRESENT", "ABSENT"] as const).map((a) => (
                      <Pressable
                        key={a}
                        onPress={() => setSubmitAttStatus(a)}
                        style={[
                          sm.attChip,
                          submitAttStatus === a && {
                            backgroundColor:
                              a === "PRESENT" ? "#10B981" : "#EF4444",
                            borderColor:
                              a === "PRESENT" ? "#10B981" : "#EF4444",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            a === "PRESENT"
                              ? "checkmark-circle"
                              : "close-circle"
                          }
                          size={15}
                          color={
                            submitAttStatus === a
                              ? "#fff"
                              : a === "PRESENT"
                                ? "#10B981"
                                : "#EF4444"
                          }
                        />
                        <Text
                          style={[
                            sm.attChipTxt,
                            submitAttStatus === a && { color: "#fff" },
                          ]}
                        >
                          {a}
                        </Text>
                      </Pressable>
                    ))}
                  </View>

                  {/* Topic Covered */}
                  <Text style={sm.sectionLabel}>Topic Covered</Text>
                  <TextInput
                    value={submitTopic}
                    onChangeText={setSubmitTopic}
                    style={sm.input}
                    placeholder="e.g. Introduction to Algebra"
                    placeholderTextColor={T.mutedFg}
                  />

                  {/* Feedback */}
                  <Text style={sm.sectionLabel}>Feedback</Text>
                  <TextInput
                    value={submitFeedback}
                    onChangeText={setSubmitFeedback}
                    style={[sm.input, sm.inputMulti]}
                    placeholder="How did the demo go?"
                    placeholderTextColor={T.mutedFg}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />

                  {/* Submit button */}
                  <Pressable
                    onPress={submitDemo}
                    disabled={!submitAttStatus || submitSubmitting}
                    style={({ pressed }) => [
                      sm.submitBtn,
                      (!submitAttStatus || submitSubmitting) && {
                        opacity: 0.5,
                      },
                      pressed && { opacity: 0.82 },
                    ]}
                  >
                    <LinearGradient
                      colors={["#7C3AED", "#2D68C4"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={sm.submitBtnGrad}
                    >
                      {submitSubmitting ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <>
                          <Ionicons
                            name="send-outline"
                            size={15}
                            color="#fff"
                          />
                          <Text style={sm.submitBtnTxt}>Submit Result</Text>
                        </>
                      )}
                    </LinearGradient>
                  </Pressable>
                </ScrollView>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}
    </View>
  );
};

export default MyDemosScreen;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F1F5F9" },

  hero: { paddingHorizontal: 20, paddingBottom: 20, overflow: "hidden" },
  orbA: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#8B5CF628",
  },
  orbB: {
    position: "absolute",
    bottom: -30,
    left: -30,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#2D68C428",
  },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: { fontSize: 20, fontWeight: "800", color: "#fff" },
  heroSub: { fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 1 },
  countPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  countTxt: { fontSize: 12, fontWeight: "800", color: "#fff" },

  filterRow: { gap: 8, paddingRight: 4 },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderColor: "rgba(255,255,255,0.2)",
  },
  filterTxt: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.8)",
  },

  listWrap: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 32,
  },
  loadingTxt: { fontSize: 13, color: T.mutedFg },
  errorTxt: { fontSize: 13, color: T.error, textAlign: "center" },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 20,
    paddingVertical: 9,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", color: T.textPrimary },
  emptyTxt: { fontSize: 13, color: T.mutedFg, textAlign: "center" },

  // card
  card: {
    flexDirection: "row",
    backgroundColor: T.paper,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: "hidden",
  },
  accentBar: { width: 4, borderTopLeftRadius: 14, borderBottomLeftRadius: 14 },
  cardBody: { flex: 1, padding: 14, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  studentRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  avatarBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: { fontSize: 14, fontWeight: "800", color: T.textPrimary },
  subjectTxt: { fontSize: 11, color: T.mutedFg, marginTop: 1 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusTxt: { fontSize: 10, fontWeight: "800" },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  metaChipTxt: { fontSize: 10, fontWeight: "700" },
  locRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locTxt: { fontSize: 11, color: T.mutedFg, flex: 1 },
  notesPreview: { fontSize: 11, color: T.mutedFg, fontStyle: "italic" },

  // submit bar (bottom of card)
  submitBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  submitBarTxt: { flex: 1, fontSize: 12, fontWeight: "700", color: "#fff" },
});

// detail modal
const dm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    height: "88%",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 0,
  },

  // header
  headerGrad: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerName: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  headerSubject: { fontSize: 11, color: T.mutedFg },
  leadPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  leadId: { fontSize: 10, color: T.mutedFg, fontWeight: "700" },
  xBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  bigBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  bigBadgeTxt: { fontSize: 11, fontWeight: "800" },
  infoPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
  },
  infoPillTxt: { fontSize: 11, fontWeight: "700" },

  // tab bar
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    gap: 3,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabLabel: { fontSize: 10, fontWeight: "600", color: T.mutedFg },

  // tab content
  tabContent: { flex: 1, overflow: "hidden" },
  rows: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 },

  // rows
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  rowIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  rowLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: T.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 1,
  },
  rowValue: { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  mapsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: T.radiusMd,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginTop: 8,
    marginBottom: 4,
  },
  mapsBtnIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: "#2D68C4",
    alignItems: "center",
    justifyContent: "center",
  },
  mapsBtnTxt: { flex: 1, fontSize: 13, fontWeight: "700", color: "#2D68C4" },
});

// submit modal
const sm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
    overflow: "hidden",
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginTop: 12,
  },
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  headerSub: { fontSize: 12, color: T.mutedFg, marginTop: 1 },
  xBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  body: { paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: T.mutedFg,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  attRow: { flexDirection: "row", gap: 10 },
  attChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1.5,
    backgroundColor: "transparent",
    borderColor: T.border,
  },
  attChipTxt: { fontSize: 13, fontWeight: "800", color: T.textPrimary },

  input: {
    borderWidth: 1,
    borderColor: T.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    fontSize: 13,
    color: T.textPrimary,
    backgroundColor: "#F8FAFC",
  },
  inputMulti: { height: 90, paddingTop: 11 },

  submitBtn: { marginTop: 4, borderRadius: 14, overflow: "hidden" },
  submitBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  submitBtnTxt: { fontSize: 14, fontWeight: "800", color: "#fff" },
});
