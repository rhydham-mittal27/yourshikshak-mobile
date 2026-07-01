import React from "react";
import { View, Text, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { s } from "./styles";
import { Sk } from "./Skeleton";
import { SH } from "./SectionHead";
import { DocCard } from "./DocCard";

interface Props {
  loading: boolean;
  tutor: any;
  isVerified: boolean;
  otherDocs: any[];
  onOpenDoc: (url: string, label: string) => void;
  onVerify: () => void;
}

export const DocumentsTab: React.FC<Props> = ({
  loading,
  tutor,
  isVerified,
  otherDocs,
  onOpenDoc,
  onVerify,
}) => {
  return (
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
          colors={
            isVerified
              ? ["#10B98114", "#059F6708", "#10B98104"]
              : ["#F59E0B14", "#D9770608", "#F59E0B04"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            s.veriBanner,
            { borderColor: isVerified ? "#10B98145" : "#F59E0B45" },
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
                {new Date(tutor.verifiedAt).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
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
                {tutor.verificationFeeStatus === "PAID" ? "Fee Paid" : "Fee Due"}
              </Text>
            </View>
          )}
        </LinearGradient>
      )}

      {!loading && tutor?.verificationRejectionReason && (
        <View style={s.rejBox}>
          <Ionicons name="close-circle-outline" size={14} color={T.error} />
          <View style={{ flex: 1 }}>
            <Text style={s.rejTitle}>Rejection Reason</Text>
            <Text style={s.rejTxt}>{tutor.verificationRejectionReason}</Text>
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
                ? ((tutor.verifiedBy as any)?.fullName ??
                  (tutor.verifiedBy as any)?.name ??
                  String(tutor.verifiedBy))
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
            <Text style={[s.rejTitle, { color: T.primary }]}>
              Verification Notes
            </Text>
            <Text style={s.rejTxt}>{tutor.verificationNotes}</Text>
          </View>
        </View>
      )}

      {/* Verify Profile CTA â€” hidden when verified or under review */}
      {!loading &&
        !isVerified &&
        tutor?.verificationStatus !== "UNDER_REVIEW" && (
          <Pressable
            onPress={onVerify}
            style={({ pressed }) => [
              { borderRadius: T.radiusMd, marginBottom: 12, overflow: "hidden" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <LinearGradient
              colors={["#7C3AED", "#6D28D9", "#5B21B6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.verifyCta}
            >
              <View style={s.verifyCtaIcon}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={20}
                  color="#fff"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.verifyCtaTitle}>Get Verified</Text>
                <Text style={s.verifyCtaSub}>
                  Upload docs & pay fee to activate your profile
                </Text>
              </View>
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  backgroundColor: "rgba(255,255,255,0.15)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
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
          <Ionicons name="document-outline" size={28} color={T.textDisabled} />
          <Text style={s.emptyTxt}>No documents uploaded</Text>
        </View>
      ) : (
        <View style={{ gap: 8 }}>
          {otherDocs.map((doc: any, i: number) => (
            <DocCard key={i} doc={doc} onView={onOpenDoc} />
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
  );
};

export default DocumentsTab;

