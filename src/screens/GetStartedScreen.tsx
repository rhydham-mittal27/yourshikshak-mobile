import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  StatusBar,
  Dimensions,
} from "react-native";
import YoutubePlayer from "react-native-youtube-iframe";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getOptions } from "../api/client";
import { T } from "../constants/colors";

const SCREEN_W = Dimensions.get("window").width;
const H_PAD = 16;
const CARD_W = SCREEN_W - H_PAD * 2;
const VIDEO_H = Math.round((CARD_W * 9) / 16);

type Nav = StackNavigationProp<RootStackParamList, "GetStarted">;
interface Props {
  navigation: Nav;
}

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  );
  return m ? m[1] : null;
};

// ── Section reveal: fade + lift on mount, staggered (Emil: ease-out, <300ms) ──
const Reveal: React.FC<{
  delay?: number;
  children: React.ReactNode;
  style?: any;
}> = ({ delay = 0, children, style }) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, {
        toValue: 1,
        duration: 420,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(ty, {
        toValue: 0,
        duration: 420,
        delay,
        easing: Easing.bezier(0.23, 1, 0.32, 1),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);
  return (
    <Animated.View
      style={[style, { opacity: op, transform: [{ translateY: ty }] }]}
    >
      {children}
    </Animated.View>
  );
};

// ── Skeleton block: gentle opacity pulse matching final layout shape ──
const Skeleton: React.FC<{ style?: any }> = ({ style }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.85,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);
  return <Animated.View style={[s.skel, style, { opacity: pulse }]} />;
};

const GetStartedScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const backScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const opts = await getOptions("TEACHER_TUTORIAL");
        const tutorial =
          (opts as any)?.data?.[0] ?? (Array.isArray(opts) ? opts[0] : null);
        if (tutorial?.metadata?.videoUrl)
          setVideoUrl(tutorial.metadata.videoUrl);
        if (tutorial?.metadata?.description)
          setDescription(tutorial.metadata.description);
      } catch {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const videoId = videoUrl ? extractYouTubeId(videoUrl) : null;
  const isEmpty = !loading && !videoId && !description;

  const pressBack = (to: number) =>
    Animated.spring(backScale, { toValue: to, useNativeDriver: true }).start();

  return (
    <View style={s.root}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Hero header (matches IntroScreen language) ───────────────────── */}
      <LinearGradient
        colors={[T.darkBg, T.darkBgMid, "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: Math.max(insets.top, 16) + 8 }]}
      >
        <View style={s.orbA} pointerEvents="none" />
        <View style={s.orbB} pointerEvents="none" />

        <View style={s.navRow}>
          <Animated.View style={{ transform: [{ scale: backScale }] }}>
            <Pressable
              onPress={() => navigation.goBack()}
              onPressIn={() => pressBack(0.92)}
              onPressOut={() => pressBack(1)}
              style={s.backBtn}
              hitSlop={10}
            >
              <Ionicons name="arrow-back" size={20} color="#fff" />
            </Pressable>
          </Animated.View>
          <View style={s.eyebrowPill}>
            <View style={s.eyebrowDot} />
            <Text style={s.eyebrowTxt}>TEACHER ONBOARDING</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Reveal delay={60} style={s.headlineBlock}>
          <Text style={s.heroTitle}>Get Started</Text>
          <Text style={s.heroSub}>
            A quick walkthrough to set up your profile and start teaching.
          </Text>
        </Reveal>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.content,
          { paddingBottom: Math.max(insets.bottom, 24) + 8 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.stack}>
            <Skeleton
              style={{ width: CARD_W, height: VIDEO_H, borderRadius: 18 }}
            />
            <View style={s.skelCard}>
              <Skeleton style={{ width: 140, height: 14, borderRadius: 7 }} />
              <Skeleton
                style={{
                  width: "100%",
                  height: 10,
                  borderRadius: 5,
                  marginTop: 14,
                }}
              />
              <Skeleton
                style={{
                  width: "92%",
                  height: 10,
                  borderRadius: 5,
                  marginTop: 10,
                }}
              />
              <Skeleton
                style={{
                  width: "70%",
                  height: 10,
                  borderRadius: 5,
                  marginTop: 10,
                }}
              />
            </View>
          </View>
        ) : isEmpty ? (
          <Reveal delay={40} style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="videocam-outline" size={34} color={T.primary} />
            </View>
            <Text style={s.emptyHead}>Tutorial coming soon</Text>
            <Text style={s.emptySub}>
              Your walkthrough video hasn't been published yet. Check back
              shortly — it'll appear here automatically.
            </Text>
          </Reveal>
        ) : (
          <View style={s.stack}>
            {videoId && (
              <Reveal delay={40}>
                <View style={s.videoCard}>
                  <View style={s.videoBar}>
                    <View style={s.videoBarIcon}>
                      <Ionicons name="play" size={12} color="#fff" />
                    </View>
                    <Text style={s.videoBarTxt}>Video Walkthrough</Text>
                  </View>
                  <View style={s.videoFrame}>
                    <YoutubePlayer
                      height={VIDEO_H}
                      width={CARD_W}
                      videoId={videoId}
                      play={false}
                    />
                  </View>
                </View>
              </Reveal>
            )}

            {description ? (
              <Reveal delay={120}>
                <View style={s.descCard}>
                  <View style={s.descHeader}>
                    <View style={s.descIcon}>
                      <Ionicons
                        name="document-text-outline"
                        size={16}
                        color={T.primary}
                      />
                    </View>
                    <Text style={s.descTitle}>About this tutorial</Text>
                  </View>
                  <Text style={s.descText}>{description}</Text>
                </View>
              </Reveal>
            ) : null}

            <Reveal delay={200} style={s.tipRow}>
              <Ionicons name="bulb-outline" size={15} color={T.mutedFg} />
              <Text style={s.tipTxt}>
                Tip: keep your profile and documents ready to finish setup
                faster.
              </Text>
            </Reveal>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.darkBg },

  // Header
  header: {
    paddingHorizontal: 22,
    paddingBottom: 22,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    overflow: "hidden",
  },
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
    bottom: -50,
    left: -40,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: `${T.primary}16`,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrowPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: T.radiusFull,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  eyebrowDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: T.secondary,
  },
  eyebrowTxt: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  headlineBlock: { marginTop: 2 },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.6,
    marginBottom: 6,
  },
  heroSub: {
    color: "rgba(255,255,255,0.55)",
    fontSize: 13,
    lineHeight: 19,
    maxWidth: 320,
  },

  // Content
  scroll: { flex: 1, backgroundColor: T.background },
  content: { flexGrow: 1, paddingHorizontal: H_PAD, paddingTop: 18 },
  stack: { gap: 16 },

  // Video
  videoCard: {
    backgroundColor: "#0B1220",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: T.darkBg,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 6,
  },
  videoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  videoBarIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    backgroundColor: T.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  videoBarTxt: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  videoFrame: { width: CARD_W, height: VIDEO_H, backgroundColor: "#000" },

  // Description
  descCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },
  descHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  descIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: `${T.primary}14`,
    alignItems: "center",
    justifyContent: "center",
  },
  descTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.2,
  },
  descText: { fontSize: 14, color: T.textSecondary, lineHeight: 22 },

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  tipTxt: { flex: 1, fontSize: 12, color: T.mutedFg, lineHeight: 17 },

  // Skeleton
  skel: { backgroundColor: T.muted },
  skelCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    padding: 18,
    borderWidth: 1,
    borderColor: T.border,
  },

  // Empty
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 64,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: `${T.primary}12`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyHead: {
    fontSize: 18,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 300,
  },
});

export default GetStartedScreen;
