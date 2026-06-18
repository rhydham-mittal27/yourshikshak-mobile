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
  Image,
  RefreshControl,
  Linking,
  Modal,
  ActivityIndicator,
  Dimensions,
  Share,
} from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getTutorProfile, uploadTutorDocument, updateVerificationFee, submitVerification } from "../api/client";
import { useModal } from "../context/ModalContext";
import { T } from "../constants/colors";

type Nav = StackNavigationProp<RootStackParamList, "TutorProfile">;
type Route = RouteProp<RootStackParamList, "TutorProfile">;
interface Props {
  navigation: Nav;
  route: Route;
}

type Tab = "overview" | "profile" | "documents";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

const Sk = ({ w, h, r = 8 }: { w: number | string; h: number; r?: number }) => {
  const a = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(a, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(a, {
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
        borderRadius: r,
        backgroundColor: "#E2E8F0",
        opacity: a,
      }}
    />
  );
};

// ─── Section head ─────────────────────────────────────────────────────────────

const SH = ({
  icon,
  title,
  accent = T.primary,
  badge,
}: {
  icon: any;
  title: string;
  accent?: string;
  badge?: number;
}) => (
  <View style={sh.wrap}>
    <View style={[sh.iconBg, { backgroundColor: `${accent}12` }]}>
      <Ionicons name={icon} size={13} color={accent} />
    </View>
    <Text style={sh.title}>{title}</Text>
    {badge !== undefined && badge > 0 && (
      <View style={[sh.badge, { backgroundColor: `${accent}12`, borderColor: `${accent}25` }]}>
        <Text style={[sh.badgeTxt, { color: accent }]}>{badge}</Text>
      </View>
    )}
  </View>
);

// ─── Mini stat card ───────────────────────────────────────────────────────────

const MiniStat = ({
  icon,
  color,
  bg,
  label,
  value,
}: {
  icon: any;
  color: string;
  bg: string;
  label: string;
  value: string | number;
}) => (
  <View style={[ms.card, { backgroundColor: `${color}07` }]}>
    <View style={[ms.iconBox, { backgroundColor: `${color}15` }]}>
      <Ionicons name={icon} size={17} color={color} />
    </View>
    <Text style={[ms.value, { color }]}>{value ?? 0}</Text>
    <Text style={ms.label} numberOfLines={1}>{label}</Text>
  </View>
);

// ─── Compact info row ─────────────────────────────────────────────────────────

const IRow = ({
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
        pressed && { backgroundColor: `${accent}08`, transform: [{ scale: 0.99 }] },
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

// ─── Chip ─────────────────────────────────────────────────────────────────────

const CHIP_PALETTE = ["#2D68C4", "#7C3AED", "#10B981", "#F59E0B", "#EF4444", "#EC4899", "#0EA5E9", "#F97316", "#6366F1", "#14B8A6"];

const Chip = ({
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
    <View style={[chip.wrap, { backgroundColor: `${c}10`, borderColor: `${c}28` }]}>
      <Text style={[chip.txt, { color: c }]}>{label}</Text>
    </View>
  );
};

// ─── Document card ────────────────────────────────────────────────────────────

const DOC_META: Record<string, { label: string; icon: any; color: string; grad: [string, string] }> = {
  AADHAAR:         { label: "Aadhaar Card",     icon: "scan-outline",      color: "#8B5CF6", grad: ["#8B5CF620", "#6D28D910"] },
  CERTIFICATE:     { label: "Certificate",       icon: "ribbon-outline",    color: "#10B981", grad: ["#10B98120", "#059F6710"] },
  EXPERIENCE_PROOF:{ label: "Experience Proof",  icon: "briefcase-outline", color: "#F59E0B", grad: ["#F59E0B22", "#D9770610"] },
  DEGREE:          { label: "Degree",            icon: "school-outline",    color: "#EF4444", grad: ["#EF444420", "#DC262610"] },
  OTHER:           { label: "Document",          icon: "document-outline",  color: "#64748B", grad: ["#64748B18", "#47556910"] },
};

const DocCard = ({ doc, onView }: { doc: any; onView: (url: string, label: string) => void }) => {
  const meta = DOC_META[doc.documentType] ?? DOC_META.OTHER;
  const verified = !!doc.verifiedAt;
  return (
    <View style={[dc.card, { borderColor: meta.color + "30", backgroundColor: meta.color + "06" }]}>
      <LinearGradient
        colors={meta.grad}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={dc.iconBox}
      >
        <Ionicons name={meta.icon} size={21} color={meta.color} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={dc.label}>{meta.label}</Text>
        <View style={dc.badgeRow}>
          <View
            style={[
              dc.badge,
              verified
                ? { backgroundColor: "#10B98118", borderColor: "#10B98140" }
                : { backgroundColor: "#F59E0B18", borderColor: "#F59E0B40" },
            ]}
          >
            <Ionicons
              name={verified ? "shield-checkmark" : "time-outline"}
              size={9}
              color={verified ? "#10B981" : "#F59E0B"}
            />
            <Text style={[dc.badgeTxt, { color: verified ? "#10B981" : "#F59E0B" }]}>
              {verified ? "VERIFIED" : "IN REVIEW"}
            </Text>
          </View>
        </View>
      </View>
      {doc.documentUrl && (
        <Pressable
          onPress={() => onView(doc.documentUrl, meta.label)}
          style={({ pressed }) => [dc.viewBtn, { borderColor: `${meta.color}40`, backgroundColor: `${meta.color}12` }, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="eye-outline" size={13} color={meta.color} />
          <Text style={[dc.viewTxt, { color: meta.color }]}>View</Text>
        </Pressable>
      )}
    </View>
  );
};

// ─── Tier helpers ─────────────────────────────────────────────────────────────

const TIER_META: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  GOLD: { label: "Gold", color: "#F59E0B", icon: "star" },
  SILVER: { label: "Silver", color: "#94A3B8", icon: "star-half" },
  BRONZE: { label: "Bronze", color: "#B45309", icon: "star-outline" },
};
const getTierKey = (tier?: string) => {
  if (!tier) return null;
  if (tier.includes("GOLD")) return "GOLD";
  if (tier.includes("SILVER")) return "SILVER";
  if (tier.includes("BRONZE")) return "BRONZE";
  return null;
};

// ─── Verification constants ───────────────────────────────────────────────────

const V_STEPS = ["Documents", "Payment", "Declaration", "Review", "Submit"];

const VDOC_TYPES = [
  { type: "PROFILE_PHOTO",    label: "Profile Photo", icon: "person-outline" as any,    color: "#2D68C4", required: true  },
  { type: "AADHAAR",          label: "Aadhaar Card",  icon: "scan-outline" as any,       color: "#7C3AED", required: true  },
  { type: "CERTIFICATE",      label: "Certificate",   icon: "ribbon-outline" as any,     color: "#10B981", required: true  },
  { type: "EXPERIENCE_PROOF", label: "Exp. Proof",    icon: "briefcase-outline" as any,  color: "#F59E0B", required: false },
];

const DECLARATIONS = [
  "I agree to the Terms & Conditions and Policies of the platform",
  "All uploaded documents are genuine, authentic, and not fake",
  "I understand false or misleading information may lead to rejection or permanent disqualification",
];

// ─── Screen ───────────────────────────────────────────────────────────────────

const TutorProfileScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showError, showSuccess, showWarning } = useModal();
  const [tutor, setTutor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [tab, setTab] = useState<Tab>("overview");
  const [photoModal, setPhotoModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Doc file-type picker sheet
  const [docPickerState, setDocPickerState] = useState<{ docType: string; label: string } | null>(null);

  // In-app document viewer
  const [viewer, setViewer] = useState<{ url: string; label: string } | null>(null);

  const openDoc = (url: string, label: string) => setViewer({ url, label });

  // Verification modal state
  const [vModal, setVModal] = useState(false);
  const [vStep, setVStep] = useState(0);
  const [vFeeMode, setVFeeMode] = useState<"now" | "later">("now");
  const [vFeeAsset, setVFeeAsset] = useState<{ uri: string; name: string; mime: string } | null>(null);
  const [vAgreed, setVAgreed] = useState([false, false, false]);
  const [vUploading, setVUploading] = useState<string | null>(null);
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vError, setVError] = useState<string | null>(null);
  const [vSuccess, setVSuccess] = useState(false);

  // Mount + tab + stats animations
  const mountAnim = useRef(new Animated.Value(0)).current;
  const tabAnim = useRef(new Animated.Value(1)).current;
  const statsAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(mountAnim, {
      toValue: 1,
      duration: 420,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, []);

  const switchTab = (next: Tab) => {
    if (next === tab) return;
    Animated.sequence([
      Animated.timing(tabAnim, { toValue: 0, duration: 90, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(tabAnim, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
    setTab(next);
  };

  const load = useCallback(async () => {
    setError(null);
    setPhotoError(false);
    statsAnim.setValue(0);
    try {
      const res = await getTutorProfile();
      setTutor(res.data);
      Animated.timing(statsAnim, { toValue: 1, duration: 500, delay: 120, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } catch (e: any) {
      setError(e?.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const pickAndUpload = useCallback(
    async (fromCamera: boolean) => {
      setPhotoModal(false);
      const perm = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (perm.status !== "granted") {
        showWarning(
          "Permission required",
          fromCamera
            ? "Camera access is needed to take a photo."
            : "Gallery access is needed to select a photo.",
        );
        return;
      }

      const result = fromCamera
        ? await ImagePicker.launchCameraAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ["images"],
            quality: 0.8,
            allowsEditing: true,
            aspect: [1, 1],
          });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      const tutorId = tutor?._id ?? tutor?.id;
      if (!tutorId) {
        showError("Error", "Could not identify tutor ID. Please try again.");
        return;
      }

      const ext = asset.uri.split(".").pop() ?? "jpg";
      const mime = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;
      const fileName = `profile_${tutorId}.${ext}`;

      setUploading(true);
      try {
        await uploadTutorDocument(
          tutorId,
          "PROFILE_PHOTO",
          asset.uri,
          fileName,
          mime,
        );
        setPhotoError(false);
        await load(); // refresh profile to get new photo URL
        showSuccess("Success", "Profile photo updated!");
      } catch (e: any) {
        showError("Upload failed", e?.message ?? "Something went wrong.");
      } finally {
        setUploading(false);
      }
    },
    [tutor, load],
  );

  // ── Verification helpers ─────────────────────────────────────────────────────

  const isDocUploaded = (type: string) =>
    !!(tutor?.documents ?? []).find(
      (d: any) => String(d.documentType).toUpperCase() === type.toUpperCase(),
    );

  const allMandatoryDocs = () =>
    VDOC_TYPES.filter((d) => d.required).every((d) => isDocUploaded(d.type));

  const isFeePaid = () =>
    tutor?.verificationFeeStatus === "PAID" ||
    tutor?.verificationFeeStatus === "DEDUCT_FROM_FIRST_MONTH";

  const vCanProceed = () => {
    if (vStep === 0) return allMandatoryDocs();
    if (vStep === 1) return isFeePaid() || vFeeMode === "later" || vFeeAsset !== null;
    if (vStep === 2) return vAgreed.every(Boolean);
    return true;
  };

  const openVModal = () => {
    setVStep(0); setVFeeMode("now"); setVFeeAsset(null);
    setVAgreed([false, false, false]); setVError(null); setVSuccess(false);
    setVModal(true);
  };

  const pickDocAndUpload = (docType: string, label: string) => {
    setDocPickerState({ docType, label });
  };

  const doDocUpload = async (choice: "image" | "pdf") => {
    const { docType, label } = docPickerState!;
    setDocPickerState(null);
    const tutorId = tutor?._id ?? tutor?.id;
    if (!tutorId) return;

    let uri: string, fileName: string, mimeType: string;

    if (choice === "pdf") {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      uri = asset.uri;
      fileName = asset.name ?? `${docType.toLowerCase()}.pdf`;
      mimeType = "application/pdf";
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== "granted") {
        showWarning("Permission required", "Gallery access is needed to upload documents.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.85 });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      uri = asset.uri;
      const ext = uri.split(".").pop() ?? "jpg";
      fileName = `${docType.toLowerCase()}.${ext}`;
      mimeType = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;
    }

    setVUploading(docType); setVError(null);
    try {
      await uploadTutorDocument(tutorId, docType, uri, fileName, mimeType);
      await load();
    } catch (e: any) {
      setVError(e?.message ?? `Failed to upload ${label}`);
    } finally {
      setVUploading(null);
    }
  };

  const pickFeeScreenshot = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== "granted") return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop() ?? "jpg";
    const mime = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;
    setVFeeAsset({ uri: asset.uri, name: `fee_screenshot.${ext}`, mime });
  };

  const handleVNext = async () => {
    const tutorId = tutor?._id ?? tutor?.id;
    if (!tutorId) return;

    if (vStep === 1 && !isFeePaid()) {
      setVSubmitting(true); setVError(null);
      try {
        const status = vFeeMode === "later" ? "DEDUCT_FROM_FIRST_MONTH" : "PENDING";
        await updateVerificationFee(
          tutorId, status,
          vFeeMode === "now" && vFeeAsset ? vFeeAsset.uri : undefined,
          vFeeMode === "now" && vFeeAsset ? vFeeAsset.name : undefined,
          vFeeMode === "now" && vFeeAsset ? vFeeAsset.mime : undefined,
        );
        await load();
      } catch (e: any) {
        setVError(e?.message ?? "Failed to update fee status");
        setVSubmitting(false);
        return;
      } finally {
        setVSubmitting(false);
      }
    }

    if (vStep === 4) {
      setVSubmitting(true); setVError(null);
      try {
        await submitVerification(tutorId);
        await load();
      } catch (_) {}
      setVSuccess(true);
      setVSubmitting(false);
      return;
    }

    setVStep((s) => s + 1);
  };

  const handleVBack = () => { if (vStep > 0) setVStep((s) => s - 1); };

  // ── Derived ─────────────────────────────────────────────────────────────────

  const profilePhoto = tutor?.documents?.find(
    (d: any) => String(d.documentType).toUpperCase() === "PROFILE_PHOTO",
  )?.documentUrl;

  const isVerified = tutor?.verificationStatus === "VERIFIED";
  const tierKey = getTierKey(tutor?.tier);
  const tierMeta = tierKey ? TIER_META[tierKey] : null;
  const initials =
    (tutor?.user?.name ?? "")
      .split(" ")
      .map((n: string) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "T";

  const qualifications = (tutor?.qualifications ?? [])
    .map((q: any) => (typeof q === "string" ? q : (q?.label ?? q?.name ?? "")))
    .filter(Boolean);

  const otherDocs = (tutor?.documents ?? []).filter(
    (d: any) => String(d.documentType).toUpperCase() !== "PROFILE_PHOTO",
  );

  const allSubjects: string[] = (tutor?.subjects ?? [])
    .map((s: any) => (typeof s === "string" ? s : (s?.label ?? s?.name ?? "")))
    .filter(Boolean);

  // Shares the public tutor profile link — same /ourtutor/:teacherId page the
  // frontend "Share Profile" button links to.
  const shareProfile = async () => {
    const teacherId = tutor?.teacherId;
    if (!teacherId) return;
    const url = `https://app.yourshikshak.in/ourtutor/${teacherId}`;
    try {
      await Share.share({ message: url, url, title: "Tutor Profile" });
    } catch {}
  };

  const modeColor: Record<string, string> = {
    ONLINE: T.primary,
    OFFLINE: T.secondary,
    HYBRID: "#7C3AED",
  };
  const modeIcon: Record<string, any> = {
    ONLINE: "videocam-outline",
    OFFLINE: "home-outline",
    HYBRID: "git-merge-outline",
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1,
          paddingBottom: Math.max(insets.bottom + 16, 32),
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={T.primary}
          />
        }
      >
        {/* ══ COMPACT HERO ═══════════════════════════════════════════════════ */}
        <Animated.View style={{ opacity: mountAnim, transform: [{ translateY: mountAnim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }] }}>
        <LinearGradient
          colors={[T.darkBg, T.darkBgMid, "#162032"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 8 }]}
        >
          <View style={s.orbA} pointerEvents="none" />
          <View style={s.orbB} pointerEvents="none" />
          <View style={s.orbC} pointerEvents="none" />

          {/* top bar */}
          <View style={s.topBar}>
            <Pressable
              onPress={() => navigation.goBack()}
              style={s.backBtn}
              hitSlop={12}
            >
              <Ionicons name="chevron-back" size={20} color="#fff" />
            </Pressable>
            <Text style={s.topTitle}>My Profile</Text>
            <View style={s.topActions}>
              <Pressable
                onPress={shareProfile}
                style={s.shareBtn}
                hitSlop={8}
                disabled={loading || !tutor?.teacherId}
              >
                <Ionicons name="share-social-outline" size={16} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => navigation.navigate("EditProfile")}
                style={s.editBtn}
                hitSlop={8}
              >
                <Ionicons name="pencil-outline" size={14} color="#fff" />
                <Text style={s.editBtnTxt}>Edit</Text>
              </Pressable>
            </View>
          </View>

          {/* horizontal identity row */}
          <View style={s.identityRow}>
            {/* avatar */}
            <Pressable
              style={s.avatarWrap}
              onPress={() => !loading && setPhotoModal(true)}
              disabled={uploading}
            >
              {/* outer glow ring */}
              <View style={s.avatarRing}>
              {loading ? (
                <Sk w={80} h={80} r={40} />
              ) : profilePhoto && !photoError ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={s.avatar}
                  onError={() => setPhotoError(true)}
                />
              ) : (
                <LinearGradient
                  colors={[T.primary, T.primaryDark]}
                  style={s.avatarFallback}
                >
                  <Text style={s.avatarInitial}>{initials}</Text>
                </LinearGradient>
              )}
              </View>
              {!loading && !uploading && (
                <View style={s.cameraBtn}>
                  <Ionicons name="camera" size={10} color="#fff" />
                </View>
              )}
              {uploading && (
                <View style={s.uploadingOverlay}>
                  <ActivityIndicator size="small" color="#fff" />
                </View>
              )}
              {!loading && !uploading && (
                <View
                  style={[
                    s.statusDot,
                    {
                      backgroundColor: tutor?.isAvailable
                        ? T.success
                        : "#64748B",
                    },
                  ]}
                />
              )}
            </Pressable>

            {/* name + badges */}
            <View style={s.identityInfo}>
              {loading ? (
                <View style={{ gap: 6 }}>
                  <Sk w={140} h={18} r={5} />
                  <Sk w={100} h={12} r={4} />
                </View>
              ) : (
                <>
                  <Text style={s.heroName} numberOfLines={1}>
                    {tutor?.user?.name ?? "—"}
                  </Text>
                  {qualifications[0] && (
                    <Text style={s.heroRole} numberOfLines={1}>
                      {qualifications[0]}
                    </Text>
                  )}
                  <View style={s.badgesRow}>
                    {tierMeta && (
                      <View
                        style={[
                          s.badge,
                          {
                            backgroundColor: `${tierMeta.color}22`,
                            borderColor: `${tierMeta.color}44`,
                          },
                        ]}
                      >
                        <Ionicons
                          name={tierMeta.icon as any}
                          size={9}
                          color={tierMeta.color}
                        />
                        <Text style={[s.badgeTxt, { color: tierMeta.color }]}>
                          {tierMeta.label}
                        </Text>
                      </View>
                    )}
                    {isVerified && (
                      <View
                        style={[
                          s.badge,
                          {
                            backgroundColor: `${T.success}22`,
                            borderColor: `${T.success}44`,
                          },
                        ]}
                      >
                        <Ionicons
                          name="shield-checkmark"
                          size={9}
                          color={T.success}
                        />
                        <Text style={[s.badgeTxt, { color: T.success }]}>
                          Verified
                        </Text>
                      </View>
                    )}
                    {tutor?.teacherId && (
                      <View
                        style={[
                          s.badge,
                          {
                            backgroundColor: "rgba(255,255,255,0.1)",
                            borderColor: "rgba(255,255,255,0.2)",
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.badgeTxt,
                            { color: "rgba(255,255,255,0.55)" },
                          ]}
                        >
                          {tutor.teacherId}
                        </Text>
                      </View>
                    )}
                  </View>
                </>
              )}
            </View>
          </View>

          {/* compact strip */}
          <View style={s.stripRow}>
            <View style={s.stripItem}>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.5)" />
              <Text style={s.stripVal}>{loading ? "—" : (tutor?.experienceHours ?? 0)}</Text>
              <Text style={s.stripLbl}>Exp hrs</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Ionicons name={tutor?.isAvailable ? "radio-button-on" : "radio-button-off"} size={13} color={tutor?.isAvailable ? "#34D399" : "rgba(255,255,255,0.35)"} />
              <Text style={[s.stripVal, { color: tutor?.isAvailable ? "#34D399" : "rgba(255,255,255,0.45)" }]}>
                {loading ? "—" : tutor?.isAvailable ? "Active" : "Off"}
              </Text>
              <Text style={s.stripLbl}>Status</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Ionicons name={tutor?.verificationStatus === "VERIFIED" ? "shield-checkmark" : "shield-outline"} size={13} color={tutor?.verificationStatus === "VERIFIED" ? "#34D399" : "#FCD34D"} />
              <Text style={[s.stripVal, { color: tutor?.verificationStatus === "VERIFIED" ? "#34D399" : "#FCD34D", fontSize: 10 }]}>
                {loading ? "—" : (tutor?.verificationStatus === "VERIFIED" ? "Verified" : tutor?.verificationStatus ?? "Pending")}
              </Text>
              <Text style={s.stripLbl}>Verify</Text>
            </View>
            <View style={s.stripSep} />
            <View style={s.stripItem}>
              <Ionicons name="logo-whatsapp" size={13} color={tutor?.whatsappCommunityJoined ? "#25D366" : "rgba(255,255,255,0.35)"} />
              <Text style={[s.stripVal, { color: tutor?.whatsappCommunityJoined ? "#25D366" : "rgba(255,255,255,0.45)" }]}>
                {loading ? "—" : tutor?.whatsappCommunityJoined ? "Joined" : "Pending"}
              </Text>
              <Text style={s.stripLbl}>WA</Text>
            </View>
          </View>
        </LinearGradient>
        </Animated.View>

        {/* ══ WHITE CARD ═════════════════════════════════════════════════════ */}
        <View style={s.card}>
          {/* top highlight line */}
          <View style={s.cardHighlight} />
          {error && !loading && (
            <View style={s.errorBox}>
              <Ionicons name="alert-circle-outline" size={28} color={T.error} />
              <Text style={s.errorTxt}>{error}</Text>
              <Pressable onPress={load} style={s.retryBtn}>
                <Text style={s.retryTxt}>Retry</Text>
              </Pressable>
            </View>
          )}

          {/* ── Tab bar ─────────────────────────────────────────────────── */}
          <View style={tb.bar}>
            {(
              [
                { key: "overview", label: "Overview", icon: "grid-outline" },
                { key: "profile", label: "Profile", icon: "person-outline" },
                { key: "documents", label: "Docs", icon: "documents-outline" },
              ] as { key: Tab; label: string; icon: any }[]
            ).map(({ key, label, icon }) => (
              <Pressable
                key={key}
                style={({ pressed }) => [tb.tab, tab === key && tb.tabActive, pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] }]}
                onPress={() => switchTab(key)}
              >
                <Ionicons
                  name={icon}
                  size={14}
                  color={tab === key ? "#fff" : T.mutedFg}
                />
                <Text style={[tb.label, tab === key && tb.labelActive]}>
                  {label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* ══ TAB CONTENT ════════════════════════════════════════════════ */}
          <Animated.View style={{ opacity: tabAnim, transform: [{ translateY: tabAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          {/* ══ TAB: OVERVIEW ════════════════════════════════════════════════ */}
          {tab === "overview" && (
            <View>
              {/* bio at the top */}
              {!loading && tutor?.bio && (
                <View style={s.bioBox}>
                  <Text style={s.bioTxt} numberOfLines={4}>"{tutor.bio}"</Text>
                </View>
              )}

              {/* mini stats row */}
              <SH icon="bar-chart-outline" title="Performance" />
              {loading ? (
                <View style={s.statsRow}>
                  {[0, 1, 2, 3].map((i) => (
                    <Sk key={i} w="23%" h={72} r={T.radiusMd} />
                  ))}
                </View>
              ) : (
                tutor && (
                  <Animated.View style={{ opacity: statsAnim, transform: [{ translateY: statsAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }] }}>
                    <View style={s.statsRow}>
                      <MiniStat icon="library-outline"         color={T.primary}  bg="" label="Assigned"  value={tutor.classesAssigned ?? 0} />
                      <MiniStat icon="checkmark-circle-outline" color={T.success}  bg="" label="Completed" value={tutor.classesCompleted ?? 0} />
                      <MiniStat icon="videocam-outline"         color="#7C3AED"    bg="" label="Demos"     value={tutor.demosTaken ?? 0} />
                      <MiniStat icon="checkmark-done-outline"   color="#F59E0B"    bg="" label="Approved"  value={tutor.demosApproved ?? 0} />
                    </View>
                    <View style={s.statsRow}>
                      <MiniStat icon="heart-outline"       color="#E11D48" bg="" label="Interests" value={tutor.interestCount ?? 0} />
                      <MiniStat icon="star-outline"        color="#F59E0B" bg="" label="Avg Rating" value={tutor.ratings ? tutor.ratings.toFixed(1) : "—"} />
                      <MiniStat icon="time-outline"        color="#0EA5E9" bg="" label="Yrs Exp"   value={tutor.yearsOfExperience ?? 0} />
                      <MiniStat icon="trending-up-outline" color="#10B981" bg="" label="Exp hrs"   value={tutor.experienceHours ?? 0} />
                    </View>
                    <View style={s.statsRow}>
                      <MiniStat icon="pie-chart-outline"   color="#6366F1" bg="" label="Approval %" value={tutor.approvalRatio != null ? `${tutor.approvalRatio}%` : "—"} />
                      <MiniStat icon="star-half-outline"   color="#F97316" bg="" label="Total Ratings" value={tutor.totalRatings ?? 0} />
                    </View>
                  </Animated.View>
                )
              )}

              {/* contact */}
              <SH icon="call-outline" title="Contact" />
              {loading ? (
                <View style={{ gap: 1 }}>
                  {[0, 1, 2].map((i) => (
                    <Sk key={i} w="100%" h={48} r={0} />
                  ))}
                </View>
              ) : (
                <View style={ir.container}>
                  <IRow
                    icon="mail-outline"
                    label="Email"
                    value={tutor?.user?.email}
                    accent={T.primary}
                    onPress={() =>
                      tutor?.user?.email &&
                      Linking.openURL(`mailto:${tutor.user.email}`)
                    }
                  />
                  <IRow
                    icon="logo-whatsapp"
                    label="Phone"
                    value={tutor?.user?.phone}
                    accent="#25D366"
                    onPress={() =>
                      tutor?.user?.phone &&
                      Linking.openURL(`tel:${tutor.user.phone}`)
                    }
                  />
                  <IRow
                    icon="call-outline"
                    label="Alternate"
                    value={tutor?.alternatePhone}
                    accent={T.warning}
                  />
                  <IRow
                    icon="location-outline"
                    label="City"
                    value={tutor?.user?.city}
                    accent={T.secondary}
                  />
                  <IRow
                    icon="person-outline"
                    label="Gender"
                    value={
                      tutor?.user?.gender
                        ? tutor.user.gender.charAt(0) +
                          tutor.user.gender.slice(1).toLowerCase()
                        : null
                    }
                    accent={T.mutedFg}
                    last
                  />
                </View>
              )}
            </View>
          )}

          {/* ══ TAB: PROFILE ════════════════════════════════════════════════ */}
          {tab === "profile" && (
            <View>
              {/* teaching mode */}
              {!loading && tutor?.preferredMode && (
                <>
                  <SH
                    icon="git-merge-outline"
                    title="Teaching Mode"
                    accent={modeColor[tutor.preferredMode] ?? T.primary}
                  />
                  <View style={[s.modeCard, { borderColor: `${modeColor[tutor.preferredMode] ?? T.primary}30`, borderWidth: 1 }]}>
                    <View style={[s.modeIcon, { backgroundColor: `${modeColor[tutor.preferredMode] ?? T.primary}12` }]}>
                      <Ionicons
                        name={modeIcon[tutor.preferredMode] ?? "school-outline"}
                        size={18}
                        color={modeColor[tutor.preferredMode] ?? T.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.modeVal, { color: modeColor[tutor.preferredMode] ?? T.primary }]}>
                        {tutor.preferredMode}
                      </Text>
                      <Text style={{ fontSize: 11, color: T.mutedFg, marginTop: 1 }}>Preferred teaching mode</Text>
                    </View>
                  </View>
                </>
              )}

              {/* subjects */}
              {!loading && allSubjects.length > 0 && (
                <>
                  <SH icon="book-outline" title="Subjects" accent="#2D68C4" />
                  <View style={s.chipWrap}>
                    {allSubjects.map((s, i) => (
                      <Chip key={i} label={s} rainbow idx={i} />
                    ))}
                  </View>
                </>
              )}

              {/* qualifications */}
              {!loading && qualifications.length > 0 && (
                <>
                  <SH icon="school-outline" title="Qualifications" accent="#7C3AED" />
                  <View style={s.chipWrap}>
                    {qualifications.map((q: string, i: number) => (
                      <Chip key={i} label={q} color="#7C3AED" idx={i} rainbow />
                    ))}
                  </View>
                </>
              )}

              {/* skills + languages */}
              {!loading &&
                !!(tutor?.skills?.length || tutor?.languagesKnown?.length) && (
                  <>
                    <SH icon="flash-outline" title="Skills & Languages" accent={T.secondary} />
                    <View style={s.chipWrap}>
                      {(tutor?.skills ?? []).map((sk: string, i: number) => (
                        <Chip key={`sk${i}`} label={sk} rainbow idx={i} />
                      ))}
                      {(tutor?.languagesKnown ?? []).map((l: string, i: number) => (
                        <Chip key={`l${i}`} label={l} color="#14B8A6" idx={i + 5} rainbow />
                      ))}
                    </View>
                  </>
                )}

              {/* extracurricular activities */}
              {!loading && !!(tutor?.extracurricularActivities?.length) && (
                <>
                  <SH icon="color-palette-outline" title="Extracurricular" accent="#EC4899" />
                  <View style={s.chipWrap}>
                    {(tutor.extracurricularActivities as string[]).map((a: string, i: number) => (
                      <Chip key={i} label={a} color="#EC4899" rainbow idx={i} />
                    ))}
                  </View>
                </>
              )}

              {/* preferred grades */}
              {!loading && !!(tutor?.preferredGrades?.length || tutor?.settings?.preferredGrades?.length) && (
                <>
                  <SH icon="school-outline" title="Preferred Grades" accent="#F59E0B" />
                  <View style={s.chipWrap}>
                    {([...(tutor?.preferredGrades ?? []), ...(tutor?.settings?.preferredGrades ?? [])]
                      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
                      .map((g: string, i: number) => (
                        <Chip key={i} label={g} color="#F59E0B" />
                      )))}
                  </View>
                </>
              )}

              {/* preferred boards */}
              {!loading && !!(tutor?.preferredBoards?.length || tutor?.settings?.preferredBoards?.length) && (
                <>
                  <SH icon="layers-outline" title="Preferred Boards" accent="#0EA5E9" />
                  <View style={s.chipWrap}>
                    {([...(tutor?.preferredBoards ?? []), ...(tutor?.settings?.preferredBoards ?? [])]
                      .filter((v: string, i: number, a: string[]) => a.indexOf(v) === i)
                      .map((b: string, i: number) => (
                        <Chip key={i} label={b} color="#0EA5E9" />
                      )))}
                  </View>
                </>
              )}

              {/* availability */}
              {!loading &&
                tutor?.settings?.availabilityPreferences &&
                (() => {
                  const avail = tutor.settings.availabilityPreferences;
                  if (!avail.daysAvailable?.length && !avail.timeSlots?.length)
                    return null;
                  return (
                    <>
                      <SH
                        icon="calendar-outline"
                        title="Availability"
                        accent={T.success}
                      />
                      {avail.daysAvailable?.length > 0 && (
                        <View style={{ gap: 8, marginBottom: 10 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.7 }}>Available Days</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {avail.daysAvailable.map((day: string, i: number) => (
                              <View key={day} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: `${T.success}10`, borderWidth: 1, borderColor: `${T.success}28` }}>
                                <Text style={{ fontSize: 11, fontWeight: "600", color: T.success }}>{day}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                      {avail.timeSlots?.length > 0 && (
                        <View style={{ gap: 8 }}>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.7 }}>Time Slots</Text>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                            {avail.timeSlots.map((slot: string, i: number) => (
                              <View key={slot} style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: `${T.primary}10`, borderWidth: 1, borderColor: `${T.primary}28` }}>
                                <Text style={{ fontSize: 11, fontWeight: "600", color: T.primary }}>{slot}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                    </>
                  );
                })()}

              {/* preferred locations */}
              {!loading &&
                !!(
                  tutor?.preferredCities?.length ||
                  tutor?.preferredLocations?.length
                ) && (
                  <>
                    <SH
                      icon="location-outline"
                      title="Preferred Areas"
                      accent="#E11D48"
                    />
                    <View style={s.chipWrap}>
                      {(tutor?.preferredCities ?? []).slice(0, 6).map((c: any, i: number) => (
                        <Chip key={`city${i}`} label={c?.label ?? c?.name ?? c} rainbow idx={i + 3} />
                      ))}
                    </View>
                    {!!(tutor?.preferredLocations?.length) && (
                      <View style={[s.chipWrap, { marginTop: 4 }]}>
                        {(tutor.preferredLocations as string[]).map((a: string, i: number) => (
                          <Chip key={`area${i}`} label={a} color="#E11D48" idx={i} />
                        ))}
                      </View>
                    )}
                  </>
                )}

              {/* addresses */}
              <SH icon="map-outline" title="Addresses" accent="#E11D48" />
              <View style={{ gap: 8 }}>
                <View style={[s.addrBox, { borderLeftColor: "#E11D48" }]}>
                  <Text style={[s.addrTag, { color: "#E11D48" }]}>Permanent</Text>
                  <Text style={s.addrVal}>{tutor?.permanentAddress || "Not provided"}</Text>
                </View>
                <View style={[s.addrBox, { borderLeftColor: "#7C3AED" }]}>
                  <Text style={[s.addrTag, { color: "#7C3AED" }]}>Residential</Text>
                  <Text style={s.addrVal}>{tutor?.residentialAddress || "Same as permanent"}</Text>
                </View>
              </View>
            </View>
          )}

          {/* ══ TAB: DOCUMENTS ══════════════════════════════════════════════ */}
          {tab === "documents" && (
            <View>
              {/* verification status */}
              <SH
                icon="shield-checkmark-outline"
                title="Verification"
                accent="#7C3AED"
              />
              {loading ? (
                <Sk w="100%" h={56} r={T.radiusMd} />
              ) : (
                <LinearGradient
                  colors={isVerified ? ["#10B98114", "#059F6708", "#10B98104"] : ["#F59E0B14", "#D9770608", "#F59E0B04"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[
                    s.veriBanner,
                    {
                      borderColor: isVerified ? "#10B98145" : "#F59E0B45",
                    },
                  ]}
                >
                  <View
                    style={[
                      s.veriIcon,
                      { backgroundColor: isVerified ? T.success : T.warning },
                    ]}
                  >
                    <Ionicons
                      name={isVerified ? "shield-checkmark" : "time"}
                      size={16}
                      color="#fff"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        s.veriStatus,
                        { color: isVerified ? T.success : T.warning },
                      ]}
                    >
                      {tutor?.verificationStatus ?? "PENDING"}
                    </Text>
                    {tutor?.verifiedAt && (
                      <Text style={s.veriDate}>
                        {new Date(tutor.verifiedAt).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" },
                        )}
                      </Text>
                    )}
                  </View>
                  {tutor?.verificationFeeStatus && (
                    <View
                      style={[
                        s.feeBadge,
                        {
                          backgroundColor:
                            tutor.verificationFeeStatus === "PAID"
                              ? `${T.success}12`
                              : `${T.warning}12`,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          s.feeTxt,
                          {
                            color:
                              tutor.verificationFeeStatus === "PAID"
                                ? T.success
                                : T.warning,
                          },
                        ]}
                      >
                        {tutor.verificationFeeStatus === "PAID"
                          ? "Fee Paid"
                          : "Fee Due"}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              )}

              {!loading && tutor?.verificationRejectionReason && (
                <View style={s.rejBox}>
                  <Ionicons
                    name="close-circle-outline"
                    size={14}
                    color={T.error}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={s.rejTitle}>Rejection Reason</Text>
                    <Text style={s.rejTxt}>
                      {tutor.verificationRejectionReason}
                    </Text>
                  </View>
                </View>
              )}

              {/* verifiedBy */}
              {!loading && tutor?.verifiedBy && (
                <View style={[s.rejBox, { borderColor: `${T.success}40` }]}>
                  <Ionicons name="person-circle-outline" size={14} color={T.success} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rejTitle, { color: T.success }]}>Verified By</Text>
                    <Text style={s.rejTxt}>
                      {typeof tutor.verifiedBy === "object"
                        ? (tutor.verifiedBy as any)?.fullName ?? (tutor.verifiedBy as any)?.name ?? String(tutor.verifiedBy)
                        : String(tutor.verifiedBy)}
                    </Text>
                  </View>
                </View>
              )}

              {/* verificationNotes */}
              {!loading && tutor?.verificationNotes && (
                <View style={[s.rejBox, { borderColor: `${T.primary}40` }]}>
                  <Ionicons name="document-text-outline" size={14} color={T.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[s.rejTitle, { color: T.primary }]}>Verification Notes</Text>
                    <Text style={s.rejTxt}>{tutor.verificationNotes}</Text>
                  </View>
                </View>
              )}

              {/* Verify Profile CTA — hidden when verified or under review */}
              {!loading && !isVerified && tutor?.verificationStatus !== "UNDER_REVIEW" && (
                <Pressable
                  onPress={openVModal}
                  style={({ pressed }) => [{ borderRadius: T.radiusMd, marginBottom: 12, overflow: "hidden" }, pressed && { opacity: 0.85 }]}
                >
                  <LinearGradient
                    colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.verifyCta}
                  >
                    <View style={s.verifyCtaIcon}>
                      <Ionicons name="shield-checkmark-outline" size={20} color="#fff" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.verifyCtaTitle}>Get Verified</Text>
                      <Text style={s.verifyCtaSub}>Upload docs & pay fee to activate your profile</Text>
                    </View>
                    <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="chevron-forward" size={16} color="#fff" />
                    </View>
                  </LinearGradient>
                </Pressable>
              )}

              {/* documents */}
              <SH
                icon="documents-outline"
                title="Uploaded Documents"
                accent="#D97706"
              />
              {loading ? (
                <View style={{ gap: 8 }}>
                  {[0, 1, 2].map((i) => (
                    <Sk key={i} w="100%" h={58} r={T.radiusMd} />
                  ))}
                </View>
              ) : otherDocs.length === 0 ? (
                <View style={s.emptyBox}>
                  <Ionicons
                    name="document-outline"
                    size={28}
                    color={T.textDisabled}
                  />
                  <Text style={s.emptyTxt}>No documents uploaded</Text>
                </View>
              ) : (
                <View style={{ gap: 8 }}>
                  {otherDocs.map((doc: any, i: number) => (
                    <DocCard key={i} doc={doc} onView={openDoc} />
                  ))}
                </View>
              )}

              {/* lock notice */}
              {!loading && isVerified && (
                <View style={s.lockNotice}>
                  <Ionicons name="lock-closed" size={11} color="#7C3AED" />
                  <Text style={s.lockTxt}>
                    Documents encrypted & secured by platform
                  </Text>
                </View>
              )}
            </View>
          )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* ══ PHOTO UPLOAD MODAL ══════════════════════════════════════════════ */}
      <Modal
        visible={photoModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoModal(false)}
      >
        <Pressable style={pm.backdrop} onPress={() => setPhotoModal(false)}>
          <View style={pm.sheet}>
            <View style={pm.handle} />
            <Text style={pm.title}>Update Profile Photo</Text>
            <Text style={pm.sub}>
              Choose how you'd like to update your picture
            </Text>

            <Pressable style={pm.option} onPress={() => pickAndUpload(true)}>
              <View style={[pm.optIcon, { backgroundColor: `${T.primary}15` }]}>
                <Ionicons name="camera-outline" size={22} color={T.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pm.optLabel}>Take a Photo</Text>
                <Text style={pm.optSub}>Use your camera</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={T.textDisabled}
              />
            </Pressable>

            <Pressable style={pm.option} onPress={() => pickAndUpload(false)}>
              <View
                style={[pm.optIcon, { backgroundColor: `${T.secondary}15` }]}
              >
                <Ionicons name="images-outline" size={22} color={T.secondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={pm.optLabel}>Choose from Gallery</Text>
                <Text style={pm.optSub}>Pick an existing photo</Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={T.textDisabled}
              />
            </Pressable>

            <Pressable style={pm.cancel} onPress={() => setPhotoModal(false)}>
              <Text style={pm.cancelTxt}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
      {/* ══ IN-APP DOCUMENT VIEWER ══════════════════════════════════════════ */}
      <Modal
        visible={!!viewer}
        animationType="slide"
        onRequestClose={() => setViewer(null)}
      >
        <View style={dv.root}>
          <LinearGradient
            colors={["#0f172a", "#1e293b"]}
            style={[dv.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}
          >
            <Pressable onPress={() => setViewer(null)} style={dv.closeBtn} hitSlop={12}>
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
            <Text style={dv.title} numberOfLines={1}>{viewer?.label ?? "Document"}</Text>
            <View style={{ width: 36 }} />
          </LinearGradient>

          {viewer && (() => {
            const isPdf = viewer.url.toLowerCase().includes(".pdf");
            if (isPdf) {
              return (
                <WebView
                  source={{ uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(viewer.url)}` }}
                  style={{ flex: 1, backgroundColor: "#0f172a" }}
                  startInLoadingState
                  renderLoading={() => (
                    <View style={dv.loaderBox}>
                      <ActivityIndicator size="large" color={T.primary} />
                      <Text style={dv.loaderTxt}>Loading PDF…</Text>
                    </View>
                  )}
                />
              );
            }
            return (
              <View style={dv.imgBox}>
                <Image source={{ uri: viewer.url }} style={dv.img} resizeMode="contain" />
              </View>
            );
          })()}
        </View>
      </Modal>

      {/* ══ DOC FILE-TYPE PICKER SHEET ══════════════════════════════════════ */}
      <Modal
        visible={!!docPickerState}
        transparent
        animationType="slide"
        onRequestClose={() => setDocPickerState(null)}
      >
        <Pressable style={pm.backdrop} onPress={() => setDocPickerState(null)}>
          <View style={pm.sheet}>
            <View style={pm.handle} />
            <Text style={pm.title}>Upload {docPickerState?.label}</Text>
            <Text style={pm.sub}>Choose the format of your document</Text>

            <Pressable style={pm.option} onPress={() => doDocUpload("image")}>
              <LinearGradient
                colors={["#2D68C420", "#2D68C408"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[pm.optIcon, { borderWidth: 1, borderColor: "#2D68C428" }]}
              >
                <Ionicons name="image-outline" size={22} color="#2D68C4" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={pm.optLabel}>Image / Photo</Text>
                <Text style={pm.optSub}>JPG, PNG from your gallery</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
            </Pressable>

            <Pressable style={[pm.option, { borderBottomWidth: 0 }]} onPress={() => doDocUpload("pdf")}>
              <LinearGradient
                colors={["#EF444420", "#EF444408"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[pm.optIcon, { borderWidth: 1, borderColor: "#EF444428" }]}
              >
                <Ionicons name="document-text-outline" size={22} color="#EF4444" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={pm.optLabel}>PDF Document</Text>
                <Text style={pm.optSub}>Official PDFs, scanned copies</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
            </Pressable>

            <Pressable style={pm.cancel} onPress={() => setDocPickerState(null)}>
              <Text style={pm.cancelTxt}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {/* ══ VERIFICATION MODAL ══════════════════════════════════════════════ */}
      <Modal
        visible={vModal}
        animationType="slide"
        onRequestClose={() => !vSubmitting && setVModal(false)}
      >
        <View style={vm.root}>
          {/* Header */}
          <LinearGradient
            colors={["#5B21B6", "#7C3AED"]}
            style={[vm.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
          >
            <Pressable
              onPress={() => !vSubmitting && setVModal(false)}
              style={vm.closeBtn}
              hitSlop={12}
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
            <Text style={vm.headerTitle}>
              {vSuccess ? "Submitted!" : "Verify Profile"}
            </Text>
            <View style={{ width: 36 }} />
          </LinearGradient>

          {/* Step progress bar */}
          {!vSuccess && (
            <View style={vm.stepBarWrap}>
              <View style={vm.stepDots}>
                {V_STEPS.map((_, i) => (
                  <View
                    key={i}
                    style={[
                      vm.dot,
                      {
                        backgroundColor:
                          i < vStep ? T.success : i === vStep ? "#7C3AED" : "#E2E8F0",
                        width: i === vStep ? 20 : 8,
                        borderRadius: 4,
                      },
                    ]}
                  />
                ))}
              </View>
              <Text style={vm.stepLabel}>
                Step {vStep + 1} of {V_STEPS.length} · {V_STEPS[vStep]}
              </Text>
            </View>
          )}

          {/* Content */}
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={vm.content}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── SUCCESS ─── */}
            {vSuccess && (
              <View style={vm.successWrap}>
                <View style={vm.successIcon}>
                  <Ionicons name="checkmark-circle" size={56} color={T.success} />
                </View>
                <Text style={vm.successTitle}>Verification Submitted!</Text>
                <Text style={vm.successSub}>
                  Your documents have been uploaded. Our team will review your
                  application within 2–3 business days.
                </Text>
                <Pressable
                  onPress={() => setVModal(false)}
                  style={vm.successBtn}
                >
                  <Text style={vm.successBtnTxt}>Done</Text>
                </Pressable>
              </View>
            )}

            {/* ─── STEP 1: DOCUMENTS ─── */}
            {!vSuccess && vStep === 0 && (
              <View>
                <Text style={vm.stepTitle}>Upload Your Documents</Text>
                <View style={vm.warningBox}>
                  <Ionicons name="alert-circle-outline" size={14} color="#D97706" />
                  <Text style={vm.warningTxt}>All starred (*) documents are mandatory.</Text>
                </View>

                <View style={vm.docGrid}>
                  {VDOC_TYPES.map((dt) => {
                    const uploaded = isDocUploaded(dt.type);
                    const busy = vUploading === dt.type;
                    return (
                      <Pressable
                        key={dt.type}
                        onPress={() => !busy && pickDocAndUpload(dt.type, dt.label)}
                        style={({ pressed }) => [
                          vm.docCard,
                          { borderColor: uploaded ? `${T.success}50` : "#E2E8F0" },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <View
                          style={[
                            vm.docIcon,
                            { backgroundColor: uploaded ? `${T.success}18` : `${dt.color}18` },
                          ]}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={dt.color} />
                          ) : (
                            <Ionicons
                              name={uploaded ? "checkmark-circle" : dt.icon}
                              size={22}
                              color={uploaded ? T.success : dt.color}
                            />
                          )}
                        </View>
                        <Text style={vm.docLabel} numberOfLines={1}>
                          {dt.label}
                          {dt.required && <Text style={{ color: T.error }}> *</Text>}
                        </Text>
                        <View
                          style={[
                            vm.docBadge,
                            {
                              backgroundColor: uploaded
                                ? `${T.success}15`
                                : `${dt.color}12`,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              vm.docBadgeTxt,
                              { color: uploaded ? T.success : dt.color },
                            ]}
                          >
                            {busy ? "Uploading…" : uploaded ? "✓ Done" : "Tap to upload"}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Guidelines */}
                <View style={vm.guideBox}>
                  {[
                    { icon: "document-text-outline", text: "Upload both sides of Aadhaar in one image" },
                    { icon: "person-outline", text: "Name must match exactly across all docs" },
                    { icon: "eye-outline", text: "Clear, well-lit, uncropped photos only" },
                    { icon: "warning-outline", text: "False info = permanent disqualification" },
                  ].map((g, i) => (
                    <View key={i} style={vm.guideRow}>
                      <Ionicons name={g.icon as any} size={13} color="#64748B" />
                      <Text style={vm.guideTxt}>{g.text}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* ─── STEP 2: PAYMENT ─── */}
            {!vSuccess && vStep === 1 && (
              <View>
                <Text style={vm.stepTitle}>Verification Fee</Text>
                <Text style={vm.stepSub}>Choose how you'd like to pay.</Text>

                {isFeePaid() ? (
                  <View style={vm.feeSuccessBox}>
                    <Ionicons name="checkmark-circle" size={20} color={T.success} />
                    <Text style={[vm.warningTxt, { color: T.success }]}>
                      Fee already paid — proceed to next step.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {/* Pay Now */}
                    <Pressable
                      onPress={() => setVFeeMode("now")}
                      style={[
                        vm.feeCard,
                        { borderColor: vFeeMode === "now" ? "#7C3AED" : "#E2E8F0" },
                      ]}
                    >
                      <View style={vm.feeCardRow}>
                        <View
                          style={[
                            vm.feeCardIcon,
                            {
                              backgroundColor:
                                vFeeMode === "now" ? "#7C3AED18" : "#E2E8F018",
                            },
                          ]}
                        >
                          <Ionicons
                            name="card-outline"
                            size={20}
                            color={vFeeMode === "now" ? "#7C3AED" : "#94A3B8"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={vm.feeCardTitle}>Pay Now</Text>
                          <Text style={vm.feeCardSub}>One-time · faster processing</Text>
                        </View>
                        <Text
                          style={[
                            vm.feeAmt,
                            { color: vFeeMode === "now" ? "#7C3AED" : T.textPrimary },
                          ]}
                        >
                          ₹500
                        </Text>
                      </View>

                      {vFeeMode === "now" && (
                        <View style={vm.qrSection}>
                          <Text style={vm.qrHint}>
                            Scan the QR to pay via UPI, then upload the screenshot.
                          </Text>
                          <View style={vm.qrBox}>
                            <Image
                              source={{
                                uri: "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi%3A%2F%2Fpay%3Fpa%3Drhydham.sharma%40okaxis%26pn%3DYourShikshak%26am%3D500%26cu%3DINR",
                              }}
                              style={vm.qrImg}
                              resizeMode="contain"
                            />
                            <Text style={vm.qrUpi}>rhydham.sharma@okaxis · ₹500</Text>
                          </View>

                          <Pressable
                            onPress={pickFeeScreenshot}
                            style={({ pressed }) => [
                              vm.screenshotBtn,
                              vFeeAsset && { borderColor: T.success, backgroundColor: `${T.success}08` },
                              pressed && { opacity: 0.8 },
                            ]}
                          >
                            <Ionicons
                              name={vFeeAsset ? "checkmark-circle-outline" : "cloud-upload-outline"}
                              size={18}
                              color={vFeeAsset ? T.success : "#7C3AED"}
                            />
                            <Text
                              style={[
                                vm.screenshotBtnTxt,
                                { color: vFeeAsset ? T.success : "#7C3AED" },
                              ]}
                              numberOfLines={1}
                            >
                              {vFeeAsset ? `✓ ${vFeeAsset.name}` : "Upload Payment Screenshot"}
                            </Text>
                          </Pressable>
                        </View>
                      )}
                    </Pressable>

                    {/* Pay Later */}
                    <Pressable
                      onPress={() => setVFeeMode("later")}
                      style={[
                        vm.feeCard,
                        { borderColor: vFeeMode === "later" ? "#F59E0B" : "#E2E8F0" },
                      ]}
                    >
                      <View style={vm.feeCardRow}>
                        <View
                          style={[
                            vm.feeCardIcon,
                            {
                              backgroundColor:
                                vFeeMode === "later" ? "#F59E0B18" : "#E2E8F018",
                            },
                          ]}
                        >
                          <Ionicons
                            name="wallet-outline"
                            size={20}
                            color={vFeeMode === "later" ? "#F59E0B" : "#94A3B8"}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={vm.feeCardTitle}>Pay Later</Text>
                          <Text style={vm.feeCardSub}>Deducted from first month · no upfront</Text>
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text
                            style={[
                              vm.feeAmt,
                              { color: vFeeMode === "later" ? "#F59E0B" : T.textPrimary },
                            ]}
                          >
                            ₹700
                          </Text>
                          <Text style={vm.feePlusTxt}>+₹200 fee</Text>
                        </View>
                      </View>
                      {vFeeMode === "later" && (
                        <View style={vm.lateBox}>
                          <Text style={vm.lateTxt}>
                            ₹700 will be deducted from your first month's salary after your first class.
                          </Text>
                        </View>
                      )}
                    </Pressable>
                  </View>
                )}
              </View>
            )}

            {/* ─── STEP 3: DECLARATION ─── */}
            {!vSuccess && vStep === 2 && (
              <View>
                <Text style={vm.stepTitle}>Declaration & Consent</Text>
                <Text style={vm.stepSub}>
                  Please read and accept all terms before proceeding.
                </Text>
                <View style={{ gap: 10 }}>
                  {DECLARATIONS.map((txt, i) => (
                    <Pressable
                      key={i}
                      onPress={() => {
                        const next = [...vAgreed];
                        next[i] = !next[i];
                        setVAgreed(next);
                      }}
                      style={[
                        vm.declCard,
                        {
                          borderColor: vAgreed[i] ? `${T.success}50` : "#E2E8F0",
                          backgroundColor: vAgreed[i] ? `${T.success}06` : T.paper,
                        },
                      ]}
                    >
                      <View
                        style={[
                          vm.checkbox,
                          {
                            backgroundColor: vAgreed[i] ? T.success : T.paper,
                            borderColor: vAgreed[i] ? T.success : "#CBD5E1",
                          },
                        ]}
                      >
                        {vAgreed[i] && (
                          <Ionicons name="checkmark" size={12} color="#fff" />
                        )}
                      </View>
                      <Text
                        style={[
                          vm.declTxt,
                          { color: vAgreed[i] ? "#065F46" : "#475569", fontWeight: vAgreed[i] ? "600" : "400" },
                        ]}
                      >
                        {txt}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={vm.rejBox}>
                  <Ionicons name="close-circle-outline" size={13} color="#D97706" />
                  <Text style={vm.rejTitle}>Common Rejection Reasons</Text>
                  <View style={vm.rejChips}>
                    {["Blurry docs", "Info mismatch", "Missing payment", "Fake documents"].map(
                      (r) => (
                        <View key={r} style={vm.rejChip}>
                          <Text style={vm.rejChipTxt}>{r}</Text>
                        </View>
                      ),
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* ─── STEP 4: REVIEW ─── */}
            {!vSuccess && vStep === 3 && (
              <View>
                <Text style={vm.stepTitle}>What Happens Next</Text>
                <Text style={vm.stepSub}>
                  Your manager will review your profile and documents.
                </Text>
                <View style={{ gap: 10, marginBottom: 16 }}>
                  {[
                    { icon: "time-outline", color: "#2563EB", bg: "#3B82F615", title: "2–3 Business Days", sub: "Typical review timeline" },
                    { icon: "document-text-outline", color: "#8B5CF6", bg: "#8B5CF615", title: "Manager Review", sub: "Documents & profile check" },
                    { icon: "shield-checkmark-outline", color: T.success, bg: `${T.success}15`, title: "Decision Notified", sub: "Via app notification" },
                  ].map((item, i) => (
                    <View key={i} style={vm.reviewCard}>
                      <View style={[vm.reviewIcon, { backgroundColor: item.bg }]}>
                        <Ionicons name={item.icon as any} size={20} color={item.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={vm.reviewTitle}>{item.title}</Text>
                        <Text style={vm.reviewSub}>{item.sub}</Text>
                      </View>
                    </View>
                  ))}
                </View>

                {/* Summary */}
                <View style={vm.summaryBox}>
                  <Text style={vm.summaryTitle}>Application Summary</Text>
                  <View style={vm.summaryChips}>
                    {VDOC_TYPES.map((dt) => {
                      const done = isDocUploaded(dt.type);
                      return (
                        <View
                          key={dt.type}
                          style={[
                            vm.summaryChip,
                            { backgroundColor: done ? `${T.success}12` : "#E2E8F0" },
                          ]}
                        >
                          <Ionicons
                            name={done ? "checkmark-circle" : "document-outline"}
                            size={11}
                            color={done ? T.success : "#94A3B8"}
                          />
                          <Text
                            style={[
                              vm.summaryChipTxt,
                              { color: done ? T.success : "#94A3B8" },
                            ]}
                          >
                            {dt.label}
                          </Text>
                        </View>
                      );
                    })}
                    <View style={[vm.summaryChip, { backgroundColor: "#7C3AED15" }]}>
                      <Ionicons name="card-outline" size={11} color="#7C3AED" />
                      <Text style={[vm.summaryChipTxt, { color: "#7C3AED" }]}>
                        {isFeePaid()
                          ? "Fee: Paid"
                          : vFeeMode === "later"
                            ? "Fee: Pay Later ₹700"
                            : "Fee: Pay Now ₹500"}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* ─── STEP 5: SUBMIT ─── */}
            {!vSuccess && vStep === 4 && (
              <View style={vm.submitWrap}>
                <View style={vm.submitIcon}>
                  <Ionicons name="shield-checkmark" size={36} color="#7C3AED" />
                </View>
                <Text style={vm.submitTitle}>Ready to Submit!</Text>
                <Text style={vm.submitSub}>
                  By submitting, you confirm all information is accurate and all
                  documents are genuine. We'll review within 2–3 business days.
                </Text>

                <View style={vm.outcomeRow}>
                  <View style={[vm.outcomeCard, { backgroundColor: `${T.success}08`, borderColor: `${T.success}25` }]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={T.success} />
                    <Text style={[vm.outcomeTitle, { color: "#065F46" }]}>If Approved</Text>
                    {["Profile activated", "Start receiving classes", "Full dashboard access"].map((p) => (
                      <Text key={p} style={[vm.outcomePt, { color: "#065F46" }]}>· {p}</Text>
                    ))}
                  </View>
                  <View style={[vm.outcomeCard, { backgroundColor: `${T.error}06`, borderColor: `${T.error}20` }]}>
                    <Ionicons name="close-circle-outline" size={14} color={T.error} />
                    <Text style={[vm.outcomeTitle, { color: "#991B1B" }]}>If Rejected</Text>
                    {["Detailed rejection reasons", "Can re-apply after fixes", "Contact support"].map((p) => (
                      <Text key={p} style={[vm.outcomePt, { color: "#991B1B" }]}>· {p}</Text>
                    ))}
                  </View>
                </View>

                <View style={vm.submitNote}>
                  <Ionicons name="information-circle-outline" size={14} color="#2D68C4" />
                  <Text style={vm.submitNoteTxt}>
                    Ensure all documents are clear, readable, and info matches your profile.
                  </Text>
                </View>
              </View>
            )}

            {/* Error */}
            {!vSuccess && vError && (
              <View style={vm.errorBox}>
                <Ionicons name="alert-circle-outline" size={14} color={T.error} />
                <Text style={vm.errorTxt}>{vError}</Text>
              </View>
            )}
          </ScrollView>

          {/* Bottom nav */}
          {!vSuccess && (
            <View style={[vm.bottomNav, { paddingBottom: Math.max(insets.bottom, 12) + 4 }]}>
              <Pressable
                onPress={handleVBack}
                disabled={vStep === 0 || vSubmitting}
                style={[vm.backBtn2, (vStep === 0 || vSubmitting) && { opacity: 0.4 }]}
              >
                <Ionicons name="chevron-back" size={18} color={T.textPrimary} />
                <Text style={vm.backBtnTxt}>Back</Text>
              </Pressable>

              <Pressable
                onPress={handleVNext}
                disabled={!vCanProceed() || vSubmitting}
                style={[
                  vm.nextBtn,
                  { backgroundColor: vStep === 4 ? T.success : "#7C3AED" },
                  (!vCanProceed() || vSubmitting) && { opacity: 0.5 },
                ]}
              >
                {vSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={vm.nextBtnTxt}>
                      {vStep === 4 ? "Submit Application" : "Continue"}
                    </Text>
                    <Ionicons
                      name={vStep === 4 ? "checkmark" : "chevron-forward"}
                      size={18}
                      color="#fff"
                    />
                  </>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  hero: {
    paddingHorizontal: 20,
    paddingBottom: 52,
    overflow: "hidden",
  },
  orbA: { position: "absolute", width: 0, height: 0 },
  orbB: { position: "absolute", width: 0, height: 0 },
  orbC: { position: "absolute", width: 0, height: 0 },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { color: "#fff", fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },
  editBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },
  editBtnTxt: { color: "#fff", fontSize: 12, fontWeight: "700" },
  topActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  shareBtn: {
    width: 32, height: 32, borderRadius: 8,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)",
  },

  // horizontal identity row
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 14,
  },
  avatarWrap: { position: "relative" },
  avatarRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 2,
    borderColor: "rgba(45,104,196,0.55)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 6,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatarFallback: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2.5,
    borderColor: "rgba(255,255,255,0.2)",
  },
  avatarInitial: { color: "#fff", fontSize: 26, fontWeight: "700" },
  cameraBtn: {
    position: "absolute",
    bottom: 2,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: T.primary,
    borderWidth: 2,
    borderColor: T.darkBg,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadingOverlay: {
    position: "absolute",
    inset: 0,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  statusDot: {
    position: "absolute",
    bottom: 2,
    left: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: T.darkBg,
  },

  identityInfo: { flex: 1 },
  heroName: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  heroRole: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: "500", marginBottom: 8 },
  badgesRow: { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 9, fontWeight: "700", letterSpacing: 0.3 },

  // strip
  stripRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  stripItem: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 2 },
  stripVal: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  stripLbl: {
    color: "rgba(255,255,255,0.45)",
    fontSize: 9,
    fontWeight: "600",
    marginTop: 0,
    letterSpacing: 0.3,
  },
  stripSep: { width: 1, height: 30, backgroundColor: "rgba(255,255,255,0.12)" },

  // slate card body — white stat cards pop against this
  card: {
    backgroundColor: "#F4F7FB",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -28,
    padding: 16,
    paddingTop: 10,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 10,
  },
  cardHighlight: {
    height: 4,
    width: 48,
    borderRadius: 2,
    backgroundColor: T.primary,
    marginBottom: 18,
    alignSelf: "center",
    opacity: 0.45,
  },

  // stats row (4 mini cards)
  statsRow: { flexDirection: "row", gap: 7, marginBottom: 8 },

  // bio
  bioBox: {
    backgroundColor: `${T.primary}06`,
    borderRadius: T.radiusMd,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: `${T.primary}20`,
  },
  bioTxt: {
    fontSize: 12,
    color: T.textSecondary,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // mode card (compact)
  modeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    marginBottom: 8,
  },
  modeIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modeVal: { fontSize: 14, fontWeight: "800" },

  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },

  // availability
  availRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  availIcon: {
    width: 26,
    height: 26,
    borderRadius: T.radiusSm,
    alignItems: "center",
    justifyContent: "center",
  },
  availTxt: { fontSize: 12, color: T.textSecondary, flex: 1, lineHeight: 16 },

  // address
  addrBox: {
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  addrTag: {
    fontSize: 9,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 4,
  },
  addrVal: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },

  // verification banner
  veriBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    marginBottom: 8,
  },
  veriIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  veriStatus: { fontSize: 13, fontWeight: "800" },
  veriDate: { fontSize: 10, color: T.mutedFg, marginTop: 1 },
  feeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: T.radiusFull,
  },
  feeTxt: { fontSize: 10, fontWeight: "700" },

  // rejection
  rejBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 10,
    borderRadius: T.radiusMd,
    marginBottom: 8,
    backgroundColor: `${T.error}08`,
    borderWidth: 1,
    borderColor: `${T.error}20`,
  },
  rejTitle: {
    fontSize: 9,
    color: T.error,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  rejTxt: { fontSize: 12, color: T.error, lineHeight: 16 },

  // lock notice
  lockNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderRadius: T.radiusMd,
    padding: 8,
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#DDD6FE",
  },
  lockTxt: { fontSize: 10, color: "#7C3AED", fontWeight: "700" },

  // verify profile CTA button
  verifyCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
  },
  verifyCtaIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  verifyCtaTitle: { color: "#fff", fontSize: 13, fontWeight: "800" },
  verifyCtaSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 1 },

  // error / empty
  errorBox: { alignItems: "center", paddingVertical: 24, gap: 8 },
  errorTxt: { color: T.mutedFg, fontSize: 13, textAlign: "center" },
  retryBtn: {
    backgroundColor: T.primary,
    borderRadius: T.radiusMd,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  retryTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  emptyBox: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptyTxt: { color: T.textDisabled, fontSize: 12 },
});

// Section head
const sh = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    marginTop: 22,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  iconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 9,
  },
  title: {
    fontSize: 13,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: 0.05,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 9, fontWeight: "800" },
});

// Tab bar
const tb = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#DDE8F5",
    borderRadius: 14,
    padding: 4,
    marginBottom: 18,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: T.primary,
    shadowColor: T.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 4,
  },
  label: { fontSize: 11, fontWeight: "600", color: T.mutedFg },
  labelActive: { color: "#fff", fontWeight: "700" },
});

// Mini stat card (4 across)
const ms = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: T.radiusLg,
    borderWidth: 0.5,
    borderColor: "#CBD5E1",
    padding: 11,
    alignItems: "center",
    gap: 5,
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  value: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: -0.6,
  },
  label: {
    fontSize: 9,
    color: T.mutedFg,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 0.1,
  },
});

// Compact info row
const ir = StyleSheet.create({
  container: {
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
    marginBottom: 6,
    backgroundColor: T.paper,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: T.paper,
  },
  border: { borderBottomWidth: 1, borderBottomColor: T.border },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1 },
  lbl: {
    fontSize: 10,
    color: T.mutedFg,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  val: { fontSize: 14, color: T.textPrimary, fontWeight: "600", letterSpacing: -0.1 },
  arrowBox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },
});

// Chip
const chip = StyleSheet.create({
  wrap: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: T.radiusFull,
    borderWidth: 1,
  },
  txt: { fontSize: 12, fontWeight: "600" },
});

// Document card
const dc = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: T.paper,
    borderRadius: T.radiusMd,
    borderWidth: 1,
    borderColor: T.border,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 13,
    color: T.textPrimary,
    fontWeight: "700",
    marginBottom: 5,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    alignSelf: "flex-start",
    borderWidth: 1,
  },
  badgeTxt: { fontSize: 8, fontWeight: "800", letterSpacing: 0.6 },
  viewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: T.radiusMd,
    borderWidth: 1,
  },
  viewTxt: { fontSize: 11, fontWeight: "700" },
});

// In-app document viewer
const { width: SW, height: SH2 } = Dimensions.get("window");
const dv = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0f172a" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  title: { flex: 1, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#fff", marginHorizontal: 8 },
  imgBox: { flex: 1, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  img: { width: SW, height: SH2 * 0.78 },
  loaderBox: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center", backgroundColor: "#0f172a" },
  loaderTxt: { color: "#94A3B8", fontSize: 13, marginTop: 10 },
});

// Photo upload modal
const pm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: T.paper,
    borderTopLeftRadius: T.radiusXxl,
    borderTopRightRadius: T.radiusXxl,
    padding: 24,
    paddingBottom: 36,
    gap: 0,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: T.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: T.textPrimary,
    textAlign: "center",
  },
  sub: {
    fontSize: 12,
    color: T.mutedFg,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  optIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optLabel: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  optSub: { fontSize: 11, color: T.mutedFg, marginTop: 2 },
  cancel: {
    marginTop: 16,
    paddingVertical: 13,
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    alignItems: "center",
  },
  cancelTxt: { fontSize: 14, fontWeight: "700", color: T.mutedFg },
});

// Verification modal
const vm = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 14,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  headerTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },

  stepBarWrap: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 6 },
  stepDots: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 6 },
  dot: { height: 8, borderRadius: 4 },
  stepLabel: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },

  content: { padding: 16, paddingBottom: 32 },

  // Step headings
  stepTitle: { fontSize: 15, fontWeight: "800", color: T.textPrimary, marginBottom: 4 },
  stepSub: { fontSize: 12, color: T.mutedFg, marginBottom: 14 },

  // Warning
  warningBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 10, borderRadius: T.radiusMd, marginBottom: 12,
    backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A",
  },
  warningTxt: { fontSize: 12, fontWeight: "600", color: "#92400E", flex: 1 },

  // Doc grid
  docGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 },
  docCard: {
    width: "47%", borderRadius: T.radiusMd, borderWidth: 1.5,
    backgroundColor: T.paper, padding: 12,
    alignItems: "center", gap: 6,
  },
  docIcon: {
    width: 48, height: 48, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  docLabel: { fontSize: 11, fontWeight: "700", color: T.textPrimary, textAlign: "center" },
  docBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: T.radiusFull },
  docBadgeTxt: { fontSize: 9, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.4 },

  // Guidelines
  guideBox: {
    backgroundColor: T.muted, borderRadius: T.radiusMd,
    padding: 12, gap: 8, borderWidth: 1, borderColor: T.border,
  },
  guideRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  guideTxt: { fontSize: 12, color: "#475569", flex: 1, lineHeight: 17 },

  // Payment
  feeSuccessBox: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 12, borderRadius: T.radiusMd,
    backgroundColor: `${T.success}10`, borderWidth: 1, borderColor: `${T.success}30`,
  },
  feeCard: {
    borderWidth: 2, borderRadius: T.radiusMd,
    backgroundColor: T.paper, padding: 14, overflow: "hidden",
  },
  feeCardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  feeCardIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  feeCardTitle: { fontSize: 14, fontWeight: "700", color: T.textPrimary },
  feeCardSub: { fontSize: 11, color: T.mutedFg, marginTop: 1 },
  feeAmt: { fontSize: 18, fontWeight: "800" },
  feePlusTxt: { fontSize: 10, color: T.textDisabled, fontWeight: "600" },

  qrSection: { marginTop: 12, gap: 10 },
  qrHint: { fontSize: 12, color: T.mutedFg, textAlign: "center" },
  qrBox: { alignItems: "center", gap: 6 },
  qrImg: { width: 150, height: 150, borderRadius: 8, borderWidth: 1, borderColor: T.border },
  qrUpi: { fontSize: 11, color: T.mutedFg, fontWeight: "600" },
  screenshotBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1.5, borderColor: "#7C3AED", borderStyle: "dashed",
    borderRadius: T.radiusMd, padding: 12,
  },
  screenshotBtnTxt: { fontSize: 13, fontWeight: "600" },

  lateBox: {
    marginTop: 10, padding: 10, borderRadius: T.radiusMd,
    backgroundColor: "#FEF3C7", borderWidth: 1, borderColor: "#FDE68A",
  },
  lateTxt: { fontSize: 12, color: "#92400E", fontWeight: "600" },

  // Declaration
  declCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderWidth: 1.5, borderRadius: T.radiusMd, padding: 12,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5,
    alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1,
  },
  declTxt: { flex: 1, fontSize: 13, lineHeight: 19 },

  rejBox: {
    marginTop: 14, padding: 12, borderRadius: T.radiusMd,
    backgroundColor: "#FFFBEB", borderWidth: 1, borderColor: "#FDE68A", gap: 6,
  },
  rejTitle: { fontSize: 10, fontWeight: "800", color: "#92400E", textTransform: "uppercase", letterSpacing: 0.5 },
  rejChips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 },
  rejChip: {
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: T.radiusFull, backgroundColor: "#FDE68A",
  },
  rejChipTxt: { fontSize: 10, color: "#92400E", fontWeight: "700" },

  // Review
  reviewCard: {
    flexDirection: "row", alignItems: "center", gap: 12,
    padding: 12, borderRadius: T.radiusMd,
    borderWidth: 1, borderColor: T.border, backgroundColor: "#FAFAFA",
  },
  reviewIcon: {
    width: 40, height: 40, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
  },
  reviewTitle: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  reviewSub: { fontSize: 11, color: T.mutedFg, marginTop: 2 },

  summaryBox: {
    padding: 14, borderRadius: T.radiusMd,
    borderWidth: 1, borderColor: T.border, backgroundColor: "#FAFAFA",
  },
  summaryTitle: { fontSize: 12, fontWeight: "700", color: T.textPrimary, marginBottom: 10 },
  summaryChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: T.radiusFull,
  },
  summaryChipTxt: { fontSize: 10, fontWeight: "700" },

  // Submit
  submitWrap: { alignItems: "center", paddingTop: 8 },
  submitIcon: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: "#7C3AED15",
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
  },
  submitTitle: { fontSize: 20, fontWeight: "800", color: T.textPrimary, marginBottom: 8, textAlign: "center" },
  submitSub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 19, marginBottom: 20 },

  outcomeRow: { flexDirection: "row", gap: 10, width: "100%", marginBottom: 14 },
  outcomeCard: {
    flex: 1, borderRadius: T.radiusMd, borderWidth: 1, padding: 12, gap: 4,
  },
  outcomeTitle: { fontSize: 12, fontWeight: "800", marginTop: 2 },
  outcomePt: { fontSize: 11, lineHeight: 17 },

  submitNote: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 12, borderRadius: T.radiusMd,
    backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE",
    width: "100%",
  },
  submitNoteTxt: { fontSize: 12, color: "#1E40AF", flex: 1, lineHeight: 17 },

  // Error
  errorBox: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 10, borderRadius: T.radiusMd, marginTop: 12,
    backgroundColor: `${T.error}08`, borderWidth: 1, borderColor: `${T.error}20`,
  },
  errorTxt: { fontSize: 12, color: T.error, flex: 1 },

  // Bottom nav
  bottomNav: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: T.border, backgroundColor: T.paper,
  },
  backBtn2: {
    flexDirection: "row", alignItems: "center", gap: 4,
    borderWidth: 1, borderColor: T.border, borderRadius: T.radiusMd,
    paddingHorizontal: 14, paddingVertical: 12,
  },
  backBtnTxt: { fontSize: 13, fontWeight: "600", color: T.textPrimary },
  nextBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    borderRadius: T.radiusMd, paddingVertical: 13,
  },
  nextBtnTxt: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // Success
  successWrap: { alignItems: "center", paddingTop: 40 },
  successIcon: { marginBottom: 20 },
  successTitle: { fontSize: 22, fontWeight: "800", color: T.textPrimary, marginBottom: 10 },
  successSub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20, marginBottom: 32, paddingHorizontal: 20 },
  successBtn: {
    backgroundColor: T.success, borderRadius: T.radiusMd,
    paddingHorizontal: 40, paddingVertical: 14,
  },
  successBtnTxt: { color: "#fff", fontSize: 15, fontWeight: "800" },
});

export default TutorProfileScreen;
