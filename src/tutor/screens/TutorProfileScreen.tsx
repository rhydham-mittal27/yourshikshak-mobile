import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  Pressable,
  Animated,
  Easing,
  RefreshControl,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StackNavigationProp } from "@react-navigation/stack";
import { RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { RootStackParamList } from "../../navigation/AppNavigator";
import {
  getTutorProfile,
  getParentTutorProfile,
  uploadTutorDocument,
  updateVerificationFee,
  submitVerification,
} from "../../api/client";
import { useModal } from "../../context/ModalContext";
import { T } from "../../constants/colors";

import { s, tb } from "../profile/styles";
import {
  Tab,
  SubjectGroup,
  TIER_META,
  getTierKey,
  VDOC_TYPES,
} from "../profile/constants";
import { ProfileHero } from "../profile/ProfileHero";
import { OverviewTab } from "../profile/OverviewTab";
import { ProfileTab } from "../profile/ProfileTab";
import { DocumentsTab } from "../profile/DocumentsTab";
import { PhotoPickerModal } from "../profile/PhotoPickerModal";
import { DocPickerSheet } from "../profile/DocPickerSheet";
import { DocumentViewerModal } from "../profile/DocumentViewerModal";
import { VerificationModal } from "../profile/VerificationModal";

type Nav = StackNavigationProp<RootStackParamList, "TutorProfile">;
type Route = RouteProp<RootStackParamList, "TutorProfile">;
interface Props {
  navigation: Nav;
  route: Route;
}

const TutorProfileScreen: React.FC<Props> = ({ navigation, route }) => {
  const isParentView = (route?.params as any)?.viewerRole === "PARENT";
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
  const [docPickerState, setDocPickerState] = useState<{
    docType: string;
    label: string;
  } | null>(null);

  // In-app document viewer
  const [viewer, setViewer] = useState<{ url: string; label: string } | null>(
    null,
  );

  const openDoc = (url: string, label: string) => setViewer({ url, label });

  // Verification modal state
  const [vModal, setVModal] = useState(false);
  const [vStep, setVStep] = useState(0);
  const [vFeeMode, setVFeeMode] = useState<"now" | "later">("now");
  const [vFeeAsset, setVFeeAsset] = useState<{
    uri: string;
    name: string;
    mime: string;
  } | null>(null);
  const [vAgreed, setVAgreed] = useState([false, false, false]);
  const [activeBoardIdx, setActiveBoardIdx] = useState(0);
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
      Animated.timing(tabAnim, {
        toValue: 0,
        duration: 90,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(tabAnim, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
    setTab(next);
  };

  const load = useCallback(async () => {
    setError(null);
    setPhotoError(false);
    statsAnim.setValue(0);
    try {
      const res = isParentView ? await getParentTutorProfile() : await getTutorProfile();
      setTutor(res.data);
      Animated.timing(statsAnim, {
        toValue: 1,
        duration: 500,
        delay: 120,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
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

  // â”€â”€ Verification helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    if (vStep === 1)
      return isFeePaid() || vFeeMode === "later" || vFeeAsset !== null;
    if (vStep === 2) return vAgreed.every(Boolean);
    return true;
  };

  const openVModal = () => {
    setVStep(0);
    setVFeeMode("now");
    setVFeeAsset(null);
    setVAgreed([false, false, false]);
    setVError(null);
    setVSuccess(false);
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
        showWarning(
          "Permission required",
          "Gallery access is needed to upload documents.",
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.85,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      uri = asset.uri;
      const ext = uri.split(".").pop() ?? "jpg";
      fileName = `${docType.toLowerCase()}.${ext}`;
      mimeType = asset.mimeType ?? `image/${ext === "jpg" ? "jpeg" : ext}`;
    }

    setVUploading(docType);
    setVError(null);
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
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
      setVSubmitting(true);
      setVError(null);
      try {
        const status =
          vFeeMode === "later" ? "DEDUCT_FROM_FIRST_MONTH" : "PENDING";
        await updateVerificationFee(
          tutorId,
          status,
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
      setVSubmitting(true);
      setVError(null);
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

  const handleVBack = () => {
    if (vStep > 0) setVStep((s) => s - 1);
  };

  // â”€â”€ Derived â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

  // Build Board â†’ Grade â†’ Subjects hierarchy from populated subject tree
  const subjectHierarchy: SubjectGroup[] = (() => {
    const boardMap: Record<string, Record<string, Set<string>>> = {};
    for (const s of (tutor?.subjects ?? []) as any[]) {
      if (!s || typeof s !== "object") continue;
      const subjectLabel: string = s.label ?? s.name ?? "";
      if (!subjectLabel) continue;
      const grade = s.parent;
      const board = grade?.parent;
      const gradeLabel: string = grade?.label ?? grade?.name ?? "Other";
      const boardLabel: string = board?.label ?? board?.name ?? "Other";
      if (!boardMap[boardLabel]) boardMap[boardLabel] = {};
      if (!boardMap[boardLabel][gradeLabel])
        boardMap[boardLabel][gradeLabel] = new Set();
      boardMap[boardLabel][gradeLabel].add(subjectLabel);
    }
    return Object.entries(boardMap)
      .map(([board, gradeMap]) => ({
        board,
        grades: Object.entries(gradeMap)
          .map(([grade, subs]) => ({
            grade,
            subjects: Array.from(subs).sort((a, b) => a.localeCompare(b)),
          }))
          .sort((a, b) => {
            const n = (s: string) => parseInt(s.replace(/\D/g, "")) || 0;
            return n(a.grade) - n(b.grade);
          }),
      }))
      .sort((a, b) => a.board.localeCompare(b.board));
  })();

  // Flat fallback for legacy string subjects
  const allSubjects: string[] =
    subjectHierarchy.length === 0
      ? (tutor?.subjects ?? [])
          .map((s: any) =>
            typeof s === "string" ? s : (s?.label ?? s?.name ?? ""),
          )
          .filter(Boolean)
          .sort((a: string, b: string) => a.localeCompare(b))
      : [];

  // Shares the public tutor profile link â€” same /ourtutor/:teacherId page the
  // frontend "Share Profile" button links to.
  const shareProfile = async () => {
    const teacherId = tutor?.teacherId;
    if (!teacherId) return;
    const url = `https://app.yourshikshak.in/ourtutor/${teacherId}`;
    try {
      await Share.share({ message: url, url, title: "Tutor Profile" });
    } catch {}
  };

  // â”€â”€ Render â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        {/* â•â• COMPACT HERO â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
        <ProfileHero
          insets={insets}
          mountAnim={mountAnim}
          loading={loading}
          tutor={tutor}
          profilePhoto={profilePhoto}
          photoError={photoError}
          onPhotoError={() => setPhotoError(true)}
          uploading={uploading}
          initials={initials}
          tierMeta={tierMeta}
          isVerified={isVerified}
          qualifications={qualifications}
          onBack={() => navigation.goBack()}
          onEdit={isParentView ? undefined : () => navigation.navigate("EditProfile")}
          onShare={shareProfile}
          onAvatarPress={isParentView ? undefined : () => setPhotoModal(true)}
        />

        {/* â•â• WHITE CARD â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
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

          {/* â”€â”€ Tab bar â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
          <View style={tb.bar}>
            {(
              [
                { key: "overview", label: "Overview", icon: "grid-outline" },
                { key: "profile", label: "Profile", icon: "person-outline" },
                ...(!isParentView ? [{ key: "documents" as Tab, label: "Docs", icon: "documents-outline" }] : []),
              ] as { key: Tab; label: string; icon: any }[]
            ).map(({ key, label, icon }) => (
              <Pressable
                key={key}
                style={({ pressed }) => [
                  tb.tab,
                  tab === key && tb.tabActive,
                  pressed && { opacity: 0.82, transform: [{ scale: 0.97 }] },
                ]}
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

          {/* â•â• TAB CONTENT â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
          <Animated.View
            style={{
              opacity: tabAnim,
              transform: [
                {
                  translateY: tabAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            }}
          >
            {tab === "overview" && (
              <OverviewTab
                loading={loading}
                tutor={tutor}
                statsAnim={statsAnim}
              />
            )}

            {tab === "profile" && (
              <ProfileTab
                loading={loading}
                tutor={tutor}
                subjectHierarchy={subjectHierarchy}
                allSubjects={allSubjects}
                activeBoardIdx={activeBoardIdx}
                setActiveBoardIdx={setActiveBoardIdx}
              />
            )}

            {tab === "documents" && (
              <DocumentsTab
                loading={loading}
                tutor={tutor}
                isVerified={isVerified}
                otherDocs={otherDocs}
                onOpenDoc={openDoc}
                onVerify={openVModal}
              />
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* â•â• PHOTO UPLOAD MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {!isParentView && (
        <PhotoPickerModal
          visible={photoModal}
          onClose={() => setPhotoModal(false)}
          onPick={pickAndUpload}
        />
      )}

      {/* â•â• IN-APP DOCUMENT VIEWER â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <DocumentViewerModal
        viewer={viewer}
        insets={insets}
        onClose={() => setViewer(null)}
      />

      {/* â•â• DOC FILE-TYPE PICKER SHEET â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <DocPickerSheet
        state={docPickerState}
        onClose={() => setDocPickerState(null)}
        onUpload={doDocUpload}
      />

      {/* â•â• VERIFICATION MODAL â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      <VerificationModal
        visible={vModal}
        insets={insets}
        vStep={vStep}
        vSuccess={vSuccess}
        vSubmitting={vSubmitting}
        vError={vError}
        vFeeMode={vFeeMode}
        setVFeeMode={setVFeeMode}
        vFeeAsset={vFeeAsset}
        vAgreed={vAgreed}
        setVAgreed={setVAgreed}
        vUploading={vUploading}
        isDocUploaded={isDocUploaded}
        isFeePaid={isFeePaid}
        vCanProceed={vCanProceed}
        onClose={() => setVModal(false)}
        onNext={handleVNext}
        onBack={handleVBack}
        onPickDoc={pickDocAndUpload}
        onPickFeeScreenshot={pickFeeScreenshot}
      />
    </View>
  );
};

export default TutorProfileScreen;


