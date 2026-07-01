import React from "react";

const VERIFICATION_FEE_UPI = "yourshikshak@okaxis";
const VERIFICATION_FEE_AMOUNT = "500";
const VERIFICATION_FEE_QR = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=upi%3A%2F%2Fpay%3Fpa%3D${encodeURIComponent(VERIFICATION_FEE_UPI)}%26pn%3DYourShikshak%26am%3D${VERIFICATION_FEE_AMOUNT}%26cu%3DINR`;
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  Image,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { EdgeInsets } from "react-native-safe-area-context";
import { T } from "../../constants/colors";
import { vm } from "./styles";
import { V_STEPS, VDOC_TYPES, DECLARATIONS } from "./constants";

interface Props {
  visible: boolean;
  insets: EdgeInsets;
  vStep: number;
  vSuccess: boolean;
  vSubmitting: boolean;
  vError: string | null;
  vFeeMode: "now" | "later";
  setVFeeMode: (m: "now" | "later") => void;
  vFeeAsset: { uri: string; name: string; mime: string } | null;
  vAgreed: boolean[];
  setVAgreed: (next: boolean[]) => void;
  vUploading: string | null;
  isDocUploaded: (type: string) => boolean;
  isFeePaid: () => boolean;
  vCanProceed: () => boolean;
  onClose: () => void;
  onNext: () => void;
  onBack: () => void;
  onPickDoc: (docType: string, label: string) => void;
  onPickFeeScreenshot: () => void;
}

export const VerificationModal: React.FC<Props> = ({
  visible,
  insets,
  vStep,
  vSuccess,
  vSubmitting,
  vError,
  vFeeMode,
  setVFeeMode,
  vFeeAsset,
  vAgreed,
  setVAgreed,
  vUploading,
  isDocUploaded,
  isFeePaid,
  vCanProceed,
  onClose,
  onNext,
  onBack,
  onPickDoc,
  onPickFeeScreenshot,
}) => (
  <Modal
    visible={visible}
    animationType="slide"
    onRequestClose={() => !vSubmitting && onClose()}
  >
    <View style={vm.root}>
      {/* Header */}
      <LinearGradient
        colors={["#5B21B6", "#7C3AED"]}
        style={[vm.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <Pressable
          onPress={() => !vSubmitting && onClose()}
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
                      i < vStep
                        ? T.success
                        : i === vStep
                          ? "#7C3AED"
                          : "#E2E8F0",
                    width: i === vStep ? 20 : 8,
                    borderRadius: 4,
                  },
                ]}
              />
            ))}
          </View>
          <Text style={vm.stepLabel}>
            Step {vStep + 1} of {V_STEPS.length} Â· {V_STEPS[vStep]}
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={vm.content}
        showsVerticalScrollIndicator={false}
      >
        {/* â”€â”€â”€ SUCCESS â”€â”€â”€ */}
        {vSuccess && (
          <View style={vm.successWrap}>
            <View style={vm.successIcon}>
              <Ionicons name="checkmark-circle" size={56} color={T.success} />
            </View>
            <Text style={vm.successTitle}>Verification Submitted!</Text>
            <Text style={vm.successSub}>
              Your documents have been uploaded. Our team will review your
              application within 2â€“3 business days.
            </Text>
            <Pressable onPress={onClose} style={vm.successBtn}>
              <Text style={vm.successBtnTxt}>Done</Text>
            </Pressable>
          </View>
        )}

        {/* â”€â”€â”€ STEP 1: DOCUMENTS â”€â”€â”€ */}
        {!vSuccess && vStep === 0 && (
          <View>
            <Text style={vm.stepTitle}>Upload Your Documents</Text>
            <View style={vm.warningBox}>
              <Ionicons
                name="alert-circle-outline"
                size={14}
                color="#D97706"
              />
              <Text style={vm.warningTxt}>
                All starred (*) documents are mandatory.
              </Text>
            </View>

            <View style={vm.docGrid}>
              {VDOC_TYPES.map((dt) => {
                const uploaded = isDocUploaded(dt.type);
                const busy = vUploading === dt.type;
                return (
                  <Pressable
                    key={dt.type}
                    onPress={() => !busy && onPickDoc(dt.type, dt.label)}
                    style={({ pressed }) => [
                      vm.docCard,
                      { borderColor: uploaded ? `${T.success}50` : "#E2E8F0" },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    <View
                      style={[
                        vm.docIcon,
                        {
                          backgroundColor: uploaded
                            ? `${T.success}18`
                            : `${dt.color}18`,
                        },
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
                        {busy
                          ? "Uploadingâ€¦"
                          : uploaded
                            ? "âœ“ Done"
                            : "Tap to upload"}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* Guidelines */}
            <View style={vm.guideBox}>
              {[
                {
                  icon: "document-text-outline",
                  text: "Upload both sides of Aadhaar in one image",
                },
                {
                  icon: "person-outline",
                  text: "Name must match exactly across all docs",
                },
                {
                  icon: "eye-outline",
                  text: "Clear, well-lit, uncropped photos only",
                },
                {
                  icon: "warning-outline",
                  text: "False info = permanent disqualification",
                },
              ].map((g, i) => (
                <View key={i} style={vm.guideRow}>
                  <Ionicons name={g.icon as any} size={13} color="#64748B" />
                  <Text style={vm.guideTxt}>{g.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* â”€â”€â”€ STEP 2: PAYMENT â”€â”€â”€ */}
        {!vSuccess && vStep === 1 && (
          <View>
            <Text style={vm.stepTitle}>Verification Fee</Text>
            <Text style={vm.stepSub}>Choose how you'd like to pay.</Text>

            {isFeePaid() ? (
              <View style={vm.feeSuccessBox}>
                <Ionicons name="checkmark-circle" size={20} color={T.success} />
                <Text style={[vm.warningTxt, { color: T.success }]}>
                  Fee already paid â€” proceed to next step.
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
                      <Text style={vm.feeCardSub}>
                        One-time Â· faster processing
                      </Text>
                    </View>
                    <Text
                      style={[
                        vm.feeAmt,
                        { color: vFeeMode === "now" ? "#7C3AED" : T.textPrimary },
                      ]}
                    >
                      â‚¹500
                    </Text>
                  </View>

                  {vFeeMode === "now" && (
                    <View style={vm.qrSection}>
                      <Text style={vm.qrHint}>
                        Scan the QR to pay via UPI, then upload the screenshot.
                      </Text>
                      <View style={vm.qrBox}>
                        <Image
                          source={{ uri: VERIFICATION_FEE_QR }}
                          style={vm.qrImg}
                          resizeMode="contain"
                        />
                        <Text style={vm.qrUpi}>
                          {VERIFICATION_FEE_UPI} · ₹{VERIFICATION_FEE_AMOUNT}
                        </Text>
                      </View>

                      <Pressable
                        onPress={onPickFeeScreenshot}
                        style={({ pressed }) => [
                          vm.screenshotBtn,
                          vFeeAsset && {
                            borderColor: T.success,
                            backgroundColor: `${T.success}08`,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Ionicons
                          name={
                            vFeeAsset
                              ? "checkmark-circle-outline"
                              : "cloud-upload-outline"
                          }
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
                          {vFeeAsset
                            ? `âœ“ ${vFeeAsset.name}`
                            : "Upload Payment Screenshot"}
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
                    {
                      borderColor: vFeeMode === "later" ? "#F59E0B" : "#E2E8F0",
                    },
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
                      <Text style={vm.feeCardSub}>
                        Deducted from first month Â· no upfront
                      </Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text
                        style={[
                          vm.feeAmt,
                          {
                            color:
                              vFeeMode === "later" ? "#F59E0B" : T.textPrimary,
                          },
                        ]}
                      >
                        â‚¹700
                      </Text>
                      <Text style={vm.feePlusTxt}>+â‚¹200 fee</Text>
                    </View>
                  </View>
                  {vFeeMode === "later" && (
                    <View style={vm.lateBox}>
                      <Text style={vm.lateTxt}>
                        â‚¹700 will be deducted from your first month's salary
                        after your first class.
                      </Text>
                    </View>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        )}

        {/* â”€â”€â”€ STEP 3: DECLARATION â”€â”€â”€ */}
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
                      {
                        color: vAgreed[i] ? "#065F46" : "#475569",
                        fontWeight: vAgreed[i] ? "600" : "400",
                      },
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
                {[
                  "Blurry docs",
                  "Info mismatch",
                  "Missing payment",
                  "Fake documents",
                ].map((r) => (
                  <View key={r} style={vm.rejChip}>
                    <Text style={vm.rejChipTxt}>{r}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* â”€â”€â”€ STEP 4: REVIEW â”€â”€â”€ */}
        {!vSuccess && vStep === 3 && (
          <View>
            <Text style={vm.stepTitle}>What Happens Next</Text>
            <Text style={vm.stepSub}>
              Your manager will review your profile and documents.
            </Text>
            <View style={{ gap: 10, marginBottom: 16 }}>
              {[
                {
                  icon: "time-outline",
                  color: "#2563EB",
                  bg: "#3B82F615",
                  title: "2â€“3 Business Days",
                  sub: "Typical review timeline",
                },
                {
                  icon: "document-text-outline",
                  color: "#8B5CF6",
                  bg: "#8B5CF615",
                  title: "Manager Review",
                  sub: "Documents & profile check",
                },
                {
                  icon: "shield-checkmark-outline",
                  color: T.success,
                  bg: `${T.success}15`,
                  title: "Decision Notified",
                  sub: "Via app notification",
                },
              ].map((item, i) => (
                <View key={i} style={vm.reviewCard}>
                  <View style={[vm.reviewIcon, { backgroundColor: item.bg }]}>
                    <Ionicons
                      name={item.icon as any}
                      size={20}
                      color={item.color}
                    />
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
                        {
                          backgroundColor: done ? `${T.success}12` : "#E2E8F0",
                        },
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
                <View
                  style={[vm.summaryChip, { backgroundColor: "#7C3AED15" }]}
                >
                  <Ionicons name="card-outline" size={11} color="#7C3AED" />
                  <Text style={[vm.summaryChipTxt, { color: "#7C3AED" }]}>
                    {isFeePaid()
                      ? "Fee: Paid"
                      : vFeeMode === "later"
                        ? "Fee: Pay Later â‚¹700"
                        : "Fee: Pay Now â‚¹500"}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* â”€â”€â”€ STEP 5: SUBMIT â”€â”€â”€ */}
        {!vSuccess && vStep === 4 && (
          <View style={vm.submitWrap}>
            <View style={vm.submitIcon}>
              <Ionicons name="shield-checkmark" size={36} color="#7C3AED" />
            </View>
            <Text style={vm.submitTitle}>Ready to Submit!</Text>
            <Text style={vm.submitSub}>
              By submitting, you confirm all information is accurate and all
              documents are genuine. We'll review within 2â€“3 business days.
            </Text>

            <View style={vm.outcomeRow}>
              <View
                style={[
                  vm.outcomeCard,
                  {
                    backgroundColor: `${T.success}08`,
                    borderColor: `${T.success}25`,
                  },
                ]}
              >
                <Ionicons
                  name="checkmark-circle-outline"
                  size={14}
                  color={T.success}
                />
                <Text style={[vm.outcomeTitle, { color: "#065F46" }]}>
                  If Approved
                </Text>
                {[
                  "Profile activated",
                  "Start receiving classes",
                  "Full dashboard access",
                ].map((p) => (
                  <Text key={p} style={[vm.outcomePt, { color: "#065F46" }]}>
                    Â· {p}
                  </Text>
                ))}
              </View>
              <View
                style={[
                  vm.outcomeCard,
                  {
                    backgroundColor: `${T.error}06`,
                    borderColor: `${T.error}20`,
                  },
                ]}
              >
                <Ionicons
                  name="close-circle-outline"
                  size={14}
                  color={T.error}
                />
                <Text style={[vm.outcomeTitle, { color: "#991B1B" }]}>
                  If Rejected
                </Text>
                {[
                  "Detailed rejection reasons",
                  "Can re-apply after fixes",
                  "Contact support",
                ].map((p) => (
                  <Text key={p} style={[vm.outcomePt, { color: "#991B1B" }]}>
                    Â· {p}
                  </Text>
                ))}
              </View>
            </View>

            <View style={vm.submitNote}>
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#2D68C4"
              />
              <Text style={vm.submitNoteTxt}>
                Ensure all documents are clear, readable, and info matches your
                profile.
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
        <View
          style={[
            vm.bottomNav,
            { paddingBottom: Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          <Pressable
            onPress={onBack}
            disabled={vStep === 0 || vSubmitting}
            style={[
              vm.backBtn2,
              (vStep === 0 || vSubmitting) && { opacity: 0.4 },
            ]}
          >
            <Ionicons name="chevron-back" size={18} color={T.textPrimary} />
            <Text style={vm.backBtnTxt}>Back</Text>
          </Pressable>

          <Pressable
            onPress={onNext}
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
);

export default VerificationModal;

