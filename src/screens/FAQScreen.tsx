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
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import YoutubePlayer from "react-native-youtube-iframe";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getOptions } from "../api/client";
import { T } from "../constants/colors";

const SCREEN_W = Dimensions.get("window").width;
// content padding (16) + faq card body padding (16) on each side
const FAQ_VIDEO_W = SCREEN_W - 32 - 32;
const FAQ_VIDEO_H = Math.round(FAQ_VIDEO_W * 9 / 16);

const extractYouTubeId = (url: string): string | null => {
  const m = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/
  );
  return m ? m[1] : null;
};

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Nav = StackNavigationProp<RootStackParamList, "FAQ">;
interface Props { navigation: Nav }

interface FaqItem {
  id: string;
  question: string;
  answerType: "text" | "video";
  answer: string;
  videoId: string | null;
  sortOrder: number;
}

// ── Section reveal: fade + lift on mount, staggered ──
const Reveal: React.FC<{ delay?: number; children: React.ReactNode; style?: any }> = ({
  delay = 0,
  children,
  style,
}) => {
  const op = useRef(new Animated.Value(0)).current;
  const ty = useRef(new Animated.Value(16)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(op, { toValue: 1, duration: 420, delay, useNativeDriver: true }),
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
    <Animated.View style={[style, { opacity: op, transform: [{ translateY: ty }] }]}>
      {children}
    </Animated.View>
  );
};

// ── Skeleton block: gentle opacity pulse ──
const Skeleton: React.FC<{ style?: any }> = ({ style }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return <Animated.View style={[s.skel, style, { opacity: pulse }]} />;
};

// ── Accordion row ──
const FaqRow: React.FC<{ item: FaqItem; open: boolean; onToggle: () => void }> = ({
  item,
  open,
  onToggle,
}) => {
  const rot = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(rot, {
      toValue: open ? 1 : 0,
      duration: 200,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [open]);
  const spin = rot.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });

  return (
    <View style={[s.faqCard, open && s.faqCardOpen]}>
      <Pressable
        onPress={onToggle}
        style={({ pressed }) => [s.faqHeader, pressed && { opacity: 0.7 }]}
      >
        <View style={s.qWrap}>
          {item.answerType === "video" ? (
            <View style={s.videoTag}>
              <Ionicons name="play" size={9} color={T.primary} />
              <Text style={s.videoTagTxt}>VIDEO</Text>
            </View>
          ) : null}
          <Text style={[s.faqQuestion, open && s.faqQuestionOpen]}>{item.question}</Text>
        </View>
        <Animated.View style={[s.chev, { transform: [{ rotate: spin }] }]}>
          <Ionicons name="chevron-down" size={16} color={open ? T.primary : T.mutedFg} />
        </Animated.View>
      </Pressable>
      {open ? (
        <View style={s.faqBody}>
          {item.answerType === "video" && item.videoId ? (
            <>
              <View style={s.videoFrame}>
                <YoutubePlayer
                  height={FAQ_VIDEO_H}
                  width={FAQ_VIDEO_W}
                  videoId={item.videoId}
                  play={false}
                />
              </View>
              {item.answer ? <Text style={s.faqAnswer}>{item.answer}</Text> : null}
            </>
          ) : (
            <Text style={s.faqAnswer}>{item.answer}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
};

const FAQScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [faqs, setFaqs] = useState<FaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  const backScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    (async () => {
      try {
        const opts = await getOptions("FAQ");
        const list = (opts as any)?.data ?? (Array.isArray(opts) ? opts : []);
        const mapped: FaqItem[] = (list as any[])
          .map((o) => {
            const answerType: "text" | "video" =
              o.metadata?.answerType === "video" ? "video" : "text";
            const videoId =
              answerType === "video"
                ? extractYouTubeId(String(o.metadata?.videoUrl ?? ""))
                : null;
            return {
              id: String(o._id),
              question: String(o.label ?? ""),
              answerType,
              answer: String(o.metadata?.answer ?? ""),
              videoId,
              sortOrder: Number(o.sortOrder ?? 0),
            };
          })
          // text answers need an answer body; video answers need a valid video
          .filter((f) =>
            f.question && (f.answerType === "video" ? !!f.videoId : !!f.answer)
          )
          .sort((a, b) => a.sortOrder - b.sortOrder);
        setFaqs(mapped);
      } catch {}
      finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggle = (id: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.create(200, "easeInEaseOut", "opacity"));
    setOpenId((cur) => (cur === id ? null : id));
  };

  const pressBack = (to: number) =>
    Animated.spring(backScale, { toValue: to, useNativeDriver: true }).start();

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Hero header ───────────────────────────────────────────────────── */}
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
            <Text style={s.eyebrowTxt}>HELP CENTER</Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        <Reveal delay={60} style={s.headlineBlock}>
          <Text style={s.heroTitle}>FAQs</Text>
          <Text style={s.heroSub}>
            Answers to the questions tutors ask us most often.
          </Text>
        </Reveal>
      </LinearGradient>

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { paddingBottom: Math.max(insets.bottom, 24) + 8 }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={s.stack}>
            {[0, 1, 2, 3].map((i) => (
              <View key={i} style={s.skelCard}>
                <Skeleton style={{ width: i % 2 ? "60%" : "78%", height: 13, borderRadius: 7 }} />
              </View>
            ))}
          </View>
        ) : faqs.length === 0 ? (
          <Reveal delay={40} style={s.empty}>
            <View style={s.emptyIcon}>
              <Ionicons name="help-buoy-outline" size={34} color={T.primary} />
            </View>
            <Text style={s.emptyHead}>No FAQs yet</Text>
            <Text style={s.emptySub}>
              Frequently asked questions haven't been published yet. Check back shortly —
              they'll appear here automatically.
            </Text>
          </Reveal>
        ) : (
          <View style={s.stack}>
            {faqs.map((f, i) => (
              <Reveal key={f.id} delay={40 + i * 50}>
                <FaqRow item={f} open={openId === f.id} onToggle={() => toggle(f.id)} />
              </Reveal>
            ))}
            <Reveal delay={40 + faqs.length * 50} style={s.tipRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={15} color={T.mutedFg} />
              <Text style={s.tipTxt}>
                Still need help? Reach out to your coordinator from the dashboard.
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
  eyebrowDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: T.secondary },
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
  content: { flexGrow: 1, paddingHorizontal: 16, paddingTop: 18 },
  stack: { gap: 12 },

  // FAQ accordion
  faqCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  faqCardOpen: {
    borderColor: `${T.primary}40`,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  qWrap: { flex: 1, gap: 5 },
  faqQuestion: {
    fontSize: 14,
    fontWeight: "700",
    color: T.textPrimary,
    letterSpacing: -0.2,
    lineHeight: 20,
  },
  faqQuestionOpen: { color: T.primary },
  videoTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    backgroundColor: `${T.primary}14`,
  },
  videoTagTxt: {
    color: T.primary,
    fontSize: 8.5,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  videoFrame: {
    width: FAQ_VIDEO_W,
    height: FAQ_VIDEO_H,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000",
    marginTop: 12,
    marginBottom: 4,
  },
  chev: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: T.muted,
    alignItems: "center",
    justifyContent: "center",
  },
  faqBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 2,
    borderTopWidth: 1,
    borderTopColor: T.border,
    marginTop: -2,
  },
  faqAnswer: { fontSize: 13.5, color: T.textSecondary, lineHeight: 21, paddingTop: 12 },

  // Tip
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 4,
    marginTop: 4,
  },
  tipTxt: { flex: 1, fontSize: 12, color: T.mutedFg, lineHeight: 17 },

  // Skeleton
  skel: { backgroundColor: T.muted },
  skelCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    paddingHorizontal: 16,
    paddingVertical: 17,
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

export default FAQScreen;
