import React from "react";
import { View, Text, Animated, Linking } from "react-native";
import { T } from "../../constants/colors";
import { s, ir } from "./styles";
import { Sk } from "./Skeleton";
import { SH } from "./SectionHead";
import { MiniStat } from "./MiniStat";
import { IRow } from "./InfoRow";

interface Props {
  loading: boolean;
  tutor: any;
  statsAnim: Animated.Value;
}

export const OverviewTab: React.FC<Props> = ({ loading, tutor, statsAnim }) => {
  return (
    <View>
      {/* bio at the top */}
      {!loading && tutor?.bio && (
        <View style={s.bioBox}>
          <Text style={s.bioTxt} numberOfLines={4}>
            "{tutor.bio}"
          </Text>
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
          <Animated.View
            style={{
              opacity: statsAnim,
              transform: [
                {
                  translateY: statsAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [14, 0],
                  }),
                },
              ],
            }}
          >
            <View style={s.statsRow}>
              <MiniStat
                icon="library-outline"
                color={T.primary}
                bg=""
                label="Assigned"
                value={tutor.classesAssigned ?? 0}
              />
              <MiniStat
                icon="checkmark-circle-outline"
                color={T.success}
                bg=""
                label="Completed"
                value={tutor.classesCompleted ?? 0}
              />
              <MiniStat
                icon="videocam-outline"
                color="#7C3AED"
                bg=""
                label="Demos"
                value={tutor.demosTaken ?? 0}
              />
              <MiniStat
                icon="checkmark-done-outline"
                color="#F59E0B"
                bg=""
                label="Approved"
                value={tutor.demosApproved ?? 0}
              />
            </View>
            <View style={s.statsRow}>
              <MiniStat
                icon="heart-outline"
                color="#E11D48"
                bg=""
                label="Interests"
                value={tutor.interestCount ?? 0}
              />
              <MiniStat
                icon="star-outline"
                color="#F59E0B"
                bg=""
                label="Avg Rating"
                value={tutor.ratings ? tutor.ratings.toFixed(1) : "â€”"}
              />
              <MiniStat
                icon="time-outline"
                color="#0EA5E9"
                bg=""
                label="Yrs Exp"
                value={tutor.yearsOfExperience ?? 0}
              />
              <MiniStat
                icon="trending-up-outline"
                color="#10B981"
                bg=""
                label="Exp hrs"
                value={tutor.experienceHours ?? 0}
              />
            </View>
            <View style={s.statsRow}>
              <MiniStat
                icon="pie-chart-outline"
                color="#6366F1"
                bg=""
                label="Approval %"
                value={
                  tutor.approvalRatio != null ? `${tutor.approvalRatio}%` : "â€”"
                }
              />
              <MiniStat
                icon="star-half-outline"
                color="#F97316"
                bg=""
                label="Total Ratings"
                value={tutor.totalRatings ?? 0}
              />
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
              tutor?.user?.phone && Linking.openURL(`tel:${tutor.user.phone}`)
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
  );
};

export default OverviewTab;

