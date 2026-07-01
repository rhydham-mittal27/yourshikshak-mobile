import React from "react";
import { View, Text, Pressable, Animated, Image, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { EdgeInsets } from "react-native-safe-area-context";
import { T } from "../../constants/colors";
import { s } from "./styles";
import { Sk } from "./Skeleton";

interface Props {
  insets: EdgeInsets;
  mountAnim: Animated.Value;
  loading: boolean;
  tutor: any;
  profilePhoto?: string;
  photoError: boolean;
  onPhotoError: () => void;
  uploading: boolean;
  initials: string;
  tierMeta: { label: string; color: string; icon: string } | null;
  isVerified: boolean;
  qualifications: string[];
  onBack: () => void;
  onEdit?: () => void;
  onShare: () => void;
  onAvatarPress?: () => void;
}

export const ProfileHero: React.FC<Props> = ({
  insets,
  mountAnim,
  loading,
  tutor,
  profilePhoto,
  photoError,
  onPhotoError,
  uploading,
  initials,
  tierMeta,
  isVerified,
  qualifications,
  onBack,
  onEdit,
  onShare,
  onAvatarPress,
}) => {
  return (
    <Animated.View
      style={{
        opacity: mountAnim,
        transform: [
          {
            translateY: mountAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [24, 0],
            }),
          },
        ],
      }}
    >
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
          <Pressable onPress={onBack} style={s.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={20} color="#fff" />
          </Pressable>
          <Text style={s.topTitle}>My Profile</Text>
          <View style={s.topActions}>
            <Pressable
              onPress={onShare}
              style={s.shareBtn}
              hitSlop={8}
              disabled={loading || !tutor?.teacherId}
            >
              <Ionicons name="share-social-outline" size={16} color="#fff" />
            </Pressable>
            {onEdit && (
              <Pressable onPress={onEdit} style={s.editBtn} hitSlop={8}>
                <Ionicons name="pencil-outline" size={14} color="#fff" />
                <Text style={s.editBtnTxt}>Edit</Text>
              </Pressable>
            )}
          </View>
        </View>

        {/* horizontal identity row */}
        <View style={s.identityRow}>
          {/* avatar */}
          <Pressable
            style={s.avatarWrap}
            onPress={() => !loading && onAvatarPress?.()}
            disabled={uploading || !onAvatarPress}
          >
            {/* outer glow ring */}
            <View style={s.avatarRing}>
              {loading ? (
                <Sk w={80} h={80} r={40} />
              ) : profilePhoto && !photoError ? (
                <Image
                  source={{ uri: profilePhoto }}
                  style={s.avatar}
                  onError={onPhotoError}
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
                    backgroundColor: tutor?.isAvailable ? T.success : "#64748B",
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
                  {tutor?.user?.name ?? "â€”"}
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
            <Ionicons
              name="time-outline"
              size={13}
              color="rgba(255,255,255,0.5)"
            />
            <Text style={s.stripVal}>
              {loading ? "â€”" : (tutor?.experienceHours ?? 0)}
            </Text>
            <Text style={s.stripLbl}>Exp hrs</Text>
          </View>
          <View style={s.stripSep} />
          <View style={s.stripItem}>
            <Ionicons
              name={tutor?.isAvailable ? "radio-button-on" : "radio-button-off"}
              size={13}
              color={tutor?.isAvailable ? "#34D399" : "rgba(255,255,255,0.35)"}
            />
            <Text
              style={[
                s.stripVal,
                {
                  color: tutor?.isAvailable
                    ? "#34D399"
                    : "rgba(255,255,255,0.45)",
                },
              ]}
            >
              {loading ? "â€”" : tutor?.isAvailable ? "Active" : "Off"}
            </Text>
            <Text style={s.stripLbl}>Status</Text>
          </View>
          <View style={s.stripSep} />
          <View style={s.stripItem}>
            <Ionicons
              name={
                tutor?.verificationStatus === "VERIFIED"
                  ? "shield-checkmark"
                  : "shield-outline"
              }
              size={13}
              color={
                tutor?.verificationStatus === "VERIFIED" ? "#34D399" : "#FCD34D"
              }
            />
            <Text
              style={[
                s.stripVal,
                {
                  color:
                    tutor?.verificationStatus === "VERIFIED"
                      ? "#34D399"
                      : "#FCD34D",
                  fontSize: 10,
                },
              ]}
            >
              {loading
                ? "â€”"
                : tutor?.verificationStatus === "VERIFIED"
                  ? "Verified"
                  : (tutor?.verificationStatus ?? "Pending")}
            </Text>
            <Text style={s.stripLbl}>Verify</Text>
          </View>
          <View style={s.stripSep} />
          <View style={s.stripItem}>
            <Ionicons
              name="logo-whatsapp"
              size={13}
              color={
                tutor?.whatsappCommunityJoined
                  ? "#25D366"
                  : "rgba(255,255,255,0.35)"
              }
            />
            <Text
              style={[
                s.stripVal,
                {
                  color: tutor?.whatsappCommunityJoined
                    ? "#25D366"
                    : "rgba(255,255,255,0.45)",
                },
              ]}
            >
              {loading
                ? "â€”"
                : tutor?.whatsappCommunityJoined
                  ? "Joined"
                  : "Pending"}
            </Text>
            <Text style={s.stripLbl}>WA</Text>
          </View>
        </View>
      </LinearGradient>
    </Animated.View>
  );
};

export default ProfileHero;

