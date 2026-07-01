import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Animated,
  RefreshControl,
  StatusBar,
  Dimensions,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getParentProgress,
  getAIStudyTips,
  askParentAI,
  ParentProgressData,
  ParentTestResult,
} from "../../api/client";
import { T } from "../../constants/colors";

const SCREEN_W = Dimensions.get("window").width;

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });

const pct = (score: number, total: number) =>
  total > 0 ? Math.round((score / total) * 100) : 0;

const scoreColor = (p: number) =>
  p >= 75 ? T.success : p >= 50 ? T.warning : T.error;

// â”€â”€â”€ useStaggeredEntrance â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Returns an array of { opacity, translateY } Animated styles, each delayed by
// 60ms, all easing out so the page feels instantly responsive.

function useStaggeredEntrance(count: number, ready: boolean) {
  const anims = useRef(
    Array.from({ length: count }, () => ({
      opacity: new Animated.Value(0),
      y: new Animated.Value(18),
    }))
  ).current;

  useEffect(() => {
    if (!ready) return;
    const animations = anims.map((a, i) =>
      Animated.parallel([
        Animated.timing(a.opacity, {
          toValue: 1,
          duration: 340,
          delay: i * 60,
          useNativeDriver: true,
        }),
        Animated.timing(a.y, {
          toValue: 0,
          duration: 300,
          delay: i * 60,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(60, animations).start();
  }, [ready]);

  return anims.map((a) => ({
    opacity: a.opacity,
    transform: [{ translateY: a.y }],
  }));
}

// â”€â”€â”€ Skeleton â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const Skeleton = ({
  w,
  h,
  radius = 12,
}: {
  w: number | string;
  h: number;
  radius?: number;
}) => {
  const pulse = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0.45,
          duration: 750,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: w as any,
        height: h,
        borderRadius: radius,
        backgroundColor: T.border,
        opacity: pulse,
      }}
    />
  );
};

// â”€â”€â”€ Trend Banner â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Full-width ambient panel â€” no side stripe, just color + depth.

const TrendBanner = ({
  trend,
  summary,
}: {
  trend: "IMPROVING" | "STEADY" | "NEEDS_ATTENTION";
  summary: string;
}) => {
  const cfg = {
    IMPROVING: {
      color: T.success,
      bg: `${T.success}14`,
      border: `${T.success}28`,
      icon: "trending-up" as const,
      label: "Improving",
      emoji: "ðŸ“ˆ",
    },
    STEADY: {
      color: T.warning,
      bg: `${T.warning}12`,
      border: `${T.warning}28`,
      icon: "remove-circle-outline" as const,
      label: "Steady",
      emoji: "ðŸ“Š",
    },
    NEEDS_ATTENTION: {
      color: T.error,
      bg: `${T.error}10`,
      border: `${T.error}25`,
      icon: "trending-down" as const,
      label: "Needs Attention",
      emoji: "ðŸŽ¯",
    },
  }[trend];

  return (
    <View style={[tb.wrap, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <View style={[tb.iconCircle, { backgroundColor: `${cfg.color}18` }]}>
        <Ionicons name={cfg.icon} size={24} color={cfg.color} />
      </View>
      <View style={tb.body}>
        <Text style={[tb.label, { color: cfg.color }]}>{cfg.emoji} {cfg.label}</Text>
        <Text style={tb.summary}>{summary}</Text>
      </View>
    </View>
  );
};

const tb = StyleSheet.create({
  wrap: {
    borderRadius: T.radiusXl,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: { flex: 1, gap: 3 },
  label: { fontSize: 15, fontWeight: "800", letterSpacing: -0.3 },
  summary: { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
});

// â”€â”€â”€ Animated Bar Chart â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BAR_MAX_H = 88;

const AnimatedBar = ({
  p,
  date,
  delay,
}: {
  p: number;
  date: string;
  delay: number;
}) => {
  const grow = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const color = scoreColor(p);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 240, delay, useNativeDriver: false }),
      Animated.timing(grow, { toValue: Math.max(3, (p / 100) * BAR_MAX_H), duration: 400, delay, useNativeDriver: false }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[bg.col, { opacity: fade }]}>
      {/* pct label */}
      <Text style={[bg.pctLabel, { color }]}>{p}%</Text>

      {/* track: fixed height, bar grows from bottom */}
      <View style={bg.track}>
        {/* background fill */}
        <View style={bg.trackBg} />
        {/* colored bar â€” grows from bottom */}
        <Animated.View style={[bg.bar, { height: grow, backgroundColor: color }]} />
      </View>

      {/* date label */}
      <Text style={bg.dateLabel} numberOfLines={2}>{date}</Text>
    </Animated.View>
  );
};

const bg = StyleSheet.create({
  col: {
    alignItems: "center",
    width: 44,
    gap: 4,
  },
  pctLabel: { fontSize: 9, fontWeight: "800", textAlign: "center" },
  track: {
    width: 26,
    height: BAR_MAX_H,
    borderRadius: 6,
    overflow: "hidden",
    justifyContent: "flex-end",
  },
  trackBg: {
    ...StyleSheet.absoluteFill,
    backgroundColor: T.muted,
  },
  bar: {
    width: 26,
    borderRadius: 4,
  },
  dateLabel: {
    fontSize: 8,
    color: T.textDisabled,
    textAlign: "center",
    lineHeight: 10,
    width: 42,
  },
});

// â”€â”€â”€ Test Performance Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TestGraph = ({
  tests,
  subject,
  ready,
}: {
  tests: ParentTestResult[];
  subject: string;
  ready: boolean;
}) => {
  const filtered = tests.filter((t) => t.subject === subject).slice(-8);

  if (!filtered.length) {
    return (
      <View style={tg.empty}>
        <Ionicons name="bar-chart-outline" size={28} color={T.textDisabled} />
        <Text style={tg.emptyTxt}>No tests recorded yet</Text>
      </View>
    );
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={tg.barsRow}
      style={tg.scroll}
    >
      {filtered.map((t, i) => (
        <AnimatedBar
          key={t._id}
          p={pct(t.score, t.totalMarks)}
          date={fmtDate(t.date)}
          delay={ready ? i * 55 : 9999}
        />
      ))}
    </ScrollView>
  );
};

const tg = StyleSheet.create({
  scroll: { marginTop: 8 },
  barsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    height: 100,
    gap: 8,
  },
  emptyTxt: { fontSize: 12, color: T.textDisabled },
});

// â”€â”€â”€ Subject Score Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Score ring via border-radius + rotation trick â€” no SVG dependency.

const SubjectScoreCard = ({
  subj,
}: {
  subj: {
    subject: string;
    lastScore: number;
    lastTotalMarks: number;
    trend: "UP" | "DOWN" | "STEADY";
    strongTopics: string[];
    weakTopics: string[];
    lastRemark?: string;
  };
}) => {
  const p = pct(subj.lastScore, subj.lastTotalMarks);
  const color = scoreColor(p);
  const trendIcon: any =
    subj.trend === "UP"
      ? "arrow-up-circle"
      : subj.trend === "DOWN"
      ? "arrow-down-circle"
      : "remove-circle";

  return (
    <View style={ss.card}>
      {/* Score ring */}
      <View style={ss.ringWrap}>
        <View style={[ss.ringOuter, { borderColor: `${color}22` }]}>
          <View style={[ss.ringInner, { borderColor: color }]}>
            <Text style={[ss.scoreNum, { color }]}>{p}</Text>
            <Text style={ss.scorePct}>%</Text>
          </View>
        </View>
        <View style={[ss.trendDot, { backgroundColor: `${color}18` }]}>
          <Ionicons name={trendIcon} size={12} color={color} />
        </View>
      </View>

      <Text style={ss.subjectName} numberOfLines={1}>
        {subj.subject}
      </Text>
      <Text style={ss.rawScore}>
        {subj.lastScore}
        <Text style={ss.rawTotal}>/{subj.lastTotalMarks}</Text>
      </Text>

      {/* Topic pills */}
      <View style={ss.pillsWrap}>
        {subj.strongTopics.slice(0, 2).map((t) => (
          <View key={t} style={[ss.pill, { backgroundColor: `${T.success}12` }]}>
            <Text style={[ss.pillTxt, { color: T.successDark }]} numberOfLines={1}>
              âœ“ {t}
            </Text>
          </View>
        ))}
        {subj.weakTopics.slice(0, 1).map((t) => (
          <View key={t} style={[ss.pill, { backgroundColor: `${T.warning}12` }]}>
            <Text style={[ss.pillTxt, { color: T.warning }]} numberOfLines={1}>
              âš¡ {t}
            </Text>
          </View>
        ))}
      </View>

      {subj.lastRemark ? (
        <Text style={ss.remark} numberOfLines={2}>
          "{subj.lastRemark}"
        </Text>
      ) : null}
    </View>
  );
};

const CARD_W = SCREEN_W * 0.64;

const ss = StyleSheet.create({
  card: {
    width: CARD_W,
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 18,
    marginRight: 12,
    gap: 10,
    shadowColor: "#1E293B",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  ringWrap: {
    alignItems: "flex-start",
    position: "relative",
    marginBottom: 2,
  },
  ringOuter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 3,
    justifyContent: "center",
    flexDirection: "row",
    alignItems: "flex-end",
  },
  scoreNum: { fontSize: 20, fontWeight: "800", letterSpacing: -1 },
  scorePct: { fontSize: 10, fontWeight: "700", color: T.mutedFg, marginTop: 4 },
  trendDot: {
    position: "absolute",
    bottom: 0,
    left: 46,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: T.paper,
  },
  subjectName: {
    fontSize: 15,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
  },
  rawScore: { fontSize: 13, fontWeight: "600", color: T.mutedFg },
  rawTotal: { fontSize: 11, color: T.textDisabled },
  pillsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 5 },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    maxWidth: CARD_W - 36,
  },
  pillTxt: { fontSize: 10, fontWeight: "600" },
  remark: {
    fontSize: 11,
    color: T.textSecondary,
    fontStyle: "italic",
    lineHeight: 16,
  },
});

// â”€â”€â”€ Focus Areas â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Ranked list, no dot bullets, typographic hierarchy.

const FocusAreas = ({
  subjects,
}: {
  subjects: ParentProgressData["subjects"];
}) => {
  const areas: Array<{ topic: string; subject: string }> = [];
  subjects.forEach((s) =>
    s.weakTopics.forEach((t) => areas.push({ topic: t, subject: s.subject }))
  );
  if (!areas.length) return null;

  return (
    <View style={fa.wrap}>
      <View style={fa.labelRow}>
        <Ionicons name="flame" size={14} color={T.warning} />
        <Text style={fa.label}>Topics to focus on</Text>
      </View>
      {areas.slice(0, 5).map((a, i) => (
        <View key={i} style={fa.row}>
          <Text style={fa.rank}>{String(i + 1).padStart(2, "0")}</Text>
          <View style={fa.rowBody}>
            <Text style={fa.topicName}>{a.topic}</Text>
            <View style={[fa.subPill, { backgroundColor: `${T.primary}10` }]}>
              <Text style={fa.subPillTxt}>{a.subject}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
};

const fa = StyleSheet.create({
  wrap: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  label: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  rank: {
    fontSize: 12,
    fontWeight: "800",
    color: T.textDisabled,
    fontVariant: ["tabular-nums"],
    width: 22,
  },
  rowBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  topicName: {
    fontSize: 13,
    fontWeight: "600",
    color: T.textPrimary,
    flex: 1,
  },
  subPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: T.radiusFull,
    flexShrink: 0,
  },
  subPillTxt: { fontSize: 10, fontWeight: "700", color: T.primary },
});

// â”€â”€â”€ AI Panel â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Integrated â€” not a bolted-on card. No left-border stripe.

const AIPanel = ({
  insight,
  data,
}: {
  insight: string;
  data: ParentProgressData;
}) => {
  const [tipTopic, setTipTopic] = useState<string | null>(null);
  const [tips, setTips] = useState<string[]>([]);
  const [loadingTips, setLoadingTips] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [askOpen, setAskOpen] = useState(false);

  const subj = data.subjects[0];

  const fetchTips = async (topic: string) => {
    setTipTopic(topic);
    setTips([]);
    setLoadingTips(true);
    try {
      const res = await getAIStudyTips({
        topic,
        subject: subj?.subject ?? "the subject",
        studentName: data.studentName,
      });
      setTips(res.data.tips ?? []);
    } catch {
      setTips(["Could not load tips. Please try again."]);
    } finally {
      setLoadingTips(false);
    }
  };

  const submitQuestion = async () => {
    if (!question.trim() || loadingAnswer) return;
    setLoadingAnswer(true);
    setAnswer(null);
    try {
      // Build rich test history string (newest first, max 8)
      const testHistory = (data.allTests ?? []).slice(0, 8).map((t, i) => {
        const pct = t.totalMarks ? Math.round((t.score / t.totalMarks) * 100) : null;
        const parts = [`${i + 1}. ${t.testType ?? "Test"}`];
        if (t.date) parts.push(`on ${new Date(t.date).toLocaleDateString("en-IN")}`);
        if (t.totalMarks) parts.push(`â€” ${t.score}/${t.totalMarks}${pct != null ? ` (${pct}%)` : ""}`);
        if (t.cycleNumber) parts.push(`Cycle ${t.cycleNumber}`);
        if (t.coveredChapterLabels?.length) parts.push(`[${t.coveredChapterLabels.join(", ")}]`);
        if (t.reportStrengths) parts.push(`Strengths: ${t.reportStrengths}`);
        if (t.reportAreasOfImprovement) parts.push(`Needs work: ${t.reportAreasOfImprovement}`);
        return parts.join(" ");
      }).join("\n") || "No tests recorded yet";

      // Syllabus coverage summary
      const syllabusCoverage = (data.subjects ?? []).map((s: any) =>
        `${s.subject}: ${s.coveredChapters ?? 0}/${s.totalChapters ?? "?"} chapters covered`
      ).join("; ") || "Not available";

      // All subjects
      const subjects = (data.subjects ?? []).map((s: any) => s.subject).join(", ") || "Not available";

      // All weak + strong topics across subjects
      const weakTopics = (data.subjects ?? []).flatMap((s: any) => s.weakTopics ?? []).join(", ") || "None identified";
      const strongTopics = (data.subjects ?? []).flatMap((s: any) => s.strongTopics ?? []).join(", ") || "None identified";

      // Latest tutor remarks from tests
      const tutorRemarks = (data.allTests ?? [])
        .filter((t: any) => t.reportRecommendations)
        .slice(0, 3)
        .map((t: any) => t.reportRecommendations)
        .join(" | ") || "No remarks yet";

      const res = await askParentAI({
        question: question.trim(),
        context: {
          studentName:      data.studentName,
          subjects,
          trend:            data.overallTrend,
          attendanceRate:   data.attendanceRate != null ? `${data.attendanceRate}%` : "Not available",
          currentCycle:     data.currentCycle != null ? `Cycle ${data.currentCycle}` : "Not available",
          testHistory,
          syllabusCoverage,
          weakTopics,
          strongTopics,
          tutorRemarks,
        },
      });
      setAnswer(res.data.answer ?? "");
    } catch {
      setAnswer("Couldn't get an answer right now. Please try again shortly.");
    } finally {
      setLoadingAnswer(false);
    }
  };

  return (
    <View style={ap.section}>
      {/* Header row */}
      <View style={ap.headerRow}>
        <View style={ap.badgeRow}>
          <Ionicons name="sparkles" size={13} color={T.primary} />
          <Text style={ap.sectionTitle}>AI Insight</Text>
        </View>
        <Text style={ap.poweredBy}>Groq Â· Llama 3.1</Text>
      </View>

      {/* Insight text */}
      <View style={ap.insightBox}>
        <Text style={ap.insightTxt}>{insight}</Text>
      </View>

      {/* Study tips topic selector */}
      {(subj?.weakTopics?.length ?? 0) > 0 && (
        <View style={ap.tipsBlock}>
          <Text style={ap.tipsLabel}>Study tips by topic</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={ap.topicsRow}
          >
            {subj!.weakTopics!.slice(0, 5).map((topic) => (
              <Pressable
                key={topic}
                onPress={() => fetchTips(topic)}
                style={({ pressed }) => [
                  ap.topicChip,
                  tipTopic === topic && ap.topicChipActive,
                  pressed && { opacity: 0.7, transform: [{ scale: 0.97 }] },
                ]}
              >
                <Text
                  style={[
                    ap.topicChipTxt,
                    tipTopic === topic && ap.topicChipTxtActive,
                  ]}
                >
                  {topic}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {loadingTips ? (
            <View style={ap.loadingRow}>
              <ActivityIndicator size="small" color={T.primary} />
              <Text style={ap.loadingTxt}>Generating tips for {tipTopic}â€¦</Text>
            </View>
          ) : tips.length > 0 ? (
            <View style={ap.tipsCard}>
              <View style={ap.tipsCardHeader}>
                <Ionicons name="bulb" size={14} color={T.warning} />
                <Text style={ap.tipsCardTitle}>Tips Â· {tipTopic}</Text>
              </View>
              {tips.map((tip, i) => (
                <View key={i} style={ap.tipRow}>
                  <View style={[ap.tipNumBox, { backgroundColor: T.warning }]}>
                    <Text style={ap.tipNum}>{i + 1}</Text>
                  </View>
                  <Text style={ap.tipTxt}>{tip}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      )}

      {/* Divider */}
      <View style={ap.divider} />

      {/* Ask AI toggle */}
      <Pressable
        style={({ pressed }) => [
          ap.askToggle,
          pressed && { opacity: 0.75 },
        ]}
        onPress={() => setAskOpen((v) => !v)}
      >
        <View style={ap.badgeRow}>
          <Ionicons name="chatbubble-ellipses-outline" size={13} color={T.primary} />
          <Text style={ap.askToggleTxt}>
            Ask about {data.studentName || "your child"}
          </Text>
        </View>
        <Ionicons
          name={askOpen ? "chevron-up" : "chevron-down"}
          size={14}
          color={T.mutedFg}
        />
      </Pressable>

      {askOpen && (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={ap.askBox}>
            <TextInput
              style={ap.input}
              value={question}
              onChangeText={setQuestion}
              placeholder={`e.g. "Why is ${data.studentName || "my child"} struggling with Algebra?"`}
              placeholderTextColor={T.textDisabled}
              multiline
              maxLength={400}
            />
            <Pressable
              style={({ pressed }) => [
                ap.sendBtn,
                (!question.trim() || loadingAnswer) && { opacity: 0.45 },
                pressed && { transform: [{ scale: 0.96 }] },
              ]}
              onPress={submitQuestion}
              disabled={!question.trim() || loadingAnswer}
            >
              {loadingAnswer ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="send" size={13} color="#fff" />
                  <Text style={ap.sendBtnTxt}>Ask</Text>
                </>
              )}
            </Pressable>

            {answer ? (
              <View style={ap.answerBox}>
                <View style={ap.badgeRow}>
                  <Ionicons name="sparkles" size={11} color={T.primary} />
                  <Text style={ap.answerLabel}>Answer</Text>
                </View>
                <Text style={ap.answerTxt}>{answer}</Text>
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
};

const ap = StyleSheet.create({
  section: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 12,
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: T.textPrimary },
  poweredBy: { fontSize: 9, color: T.textDisabled, fontWeight: "500" },

  insightBox: {
    marginHorizontal: 18,
    marginBottom: 16,
    backgroundColor: `${T.primary}07`,
    borderRadius: T.radiusLg,
    padding: 14,
  },
  insightTxt: { fontSize: 13, color: T.textSecondary, lineHeight: 20 },

  tipsBlock: { paddingHorizontal: 18, paddingBottom: 16, gap: 10 },
  tipsLabel: { fontSize: 11, fontWeight: "700", color: T.mutedFg, textTransform: "uppercase", letterSpacing: 0.4 },
  topicsRow: { gap: 6, paddingBottom: 2 },
  topicChip: {
    paddingHorizontal: 13,
    paddingVertical: 7,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  topicChipActive: { backgroundColor: T.primary, borderColor: T.primary },
  topicChipTxt: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  topicChipTxtActive: { color: "#fff" },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  loadingTxt: { fontSize: 12, color: T.mutedFg },
  tipsCard: {
    backgroundColor: `${T.warning}08`,
    borderRadius: T.radiusLg,
    borderWidth: 1,
    borderColor: `${T.warning}22`,
    padding: 14,
    gap: 10,
  },
  tipsCardHeader: { flexDirection: "row", alignItems: "center", gap: 6 },
  tipsCardTitle: { fontSize: 12, fontWeight: "700", color: T.textPrimary },
  tipRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  tipNumBox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  tipNum: { fontSize: 10, fontWeight: "800", color: "#fff" },
  tipTxt: { flex: 1, fontSize: 13, color: T.textSecondary, lineHeight: 18 },

  divider: { height: 1, backgroundColor: T.border, marginHorizontal: 18 },

  askToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  askToggleTxt: { fontSize: 13, fontWeight: "700", color: T.textPrimary },
  askBox: { padding: 18, paddingTop: 0, gap: 10 },
  input: {
    backgroundColor: T.muted,
    borderRadius: T.radiusMd,
    padding: 12,
    fontSize: 13,
    color: T.textPrimary,
    minHeight: 60,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: T.border,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: T.primary,
    paddingVertical: 11,
    borderRadius: T.radiusMd,
  },
  sendBtnTxt: { color: "#fff", fontWeight: "700", fontSize: 13 },
  answerBox: {
    backgroundColor: `${T.primary}07`,
    borderRadius: T.radiusMd,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: `${T.primary}18`,
  },
  answerLabel: { fontSize: 10, fontWeight: "700", color: T.primary },
  answerTxt: { fontSize: 13, color: T.textSecondary, lineHeight: 19 },
});

// â”€â”€â”€ Test History Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const TEST_TYPE_LABELS: Record<string, string> = {
  UNIT_TEST:    "Unit Test",
  CHAPTER_TEST: "Chapter Test",
  MOCK_EXAM:    "Mock Exam",
  WEEKLY_QUIZ:  "Weekly Quiz",
  PRACTICE:     "Practice",
};

const TestHistoryCard = ({ test }: { test: ParentTestResult }) => {
  const [expanded, setExpanded] = useState(false);
  const p = pct(test.score, test.totalMarks);
  const color = scoreColor(p);
  const typeLabel = test.testType ? (TEST_TYPE_LABELS[test.testType] ?? test.testType) : "Test";
  const hasReport = !!(test.reportStrengths || test.reportAreasOfImprovement);

  return (
    <View style={th.card}>
      <Pressable onPress={() => hasReport && setExpanded((v) => !v)} style={th.header}>
        <View style={{ flex: 1, gap: 2 }}>
          <View style={th.typeRow}>
            <View style={[th.typeBadge, { backgroundColor: `${T.primary}12` }]}>
              <Text style={[th.typeLabel, { color: T.primary }]}>{typeLabel}</Text>
            </View>
            {test.cycleNumber != null && (
              <Text style={th.cycle}>Cycle {test.cycleNumber}</Text>
            )}
          </View>
          {test.topicName ? (
            <Text style={th.topic} numberOfLines={1}>{test.topicName}</Text>
          ) : null}
          <Text style={th.date}>{fmtDate(test.date)}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 4 }}>
          <Text style={[th.pct, { color }]}>{p}%</Text>
          <Text style={th.score}>{test.score}/{test.totalMarks}</Text>
        </View>
      </Pressable>

      {/* Score bar */}
      <View style={th.barTrack}>
        <View style={[th.barFill, { width: `${p}%` as any, backgroundColor: color }]} />
      </View>

      {/* Chapters */}
      {test.coveredChapterLabels && test.coveredChapterLabels.length > 0 && (
        <View style={th.chapRow}>
          <Ionicons name="bookmark-outline" size={11} color={T.textDisabled} />
          <Text style={th.chapTxt} numberOfLines={2}>
            {test.coveredChapterLabels.join(" Â· ")}
          </Text>
        </View>
      )}

      {/* Expanded report */}
      {expanded && hasReport && (
        <View style={th.reportBox}>
          {test.reportStrengths ? (
            <View style={th.reportRow}>
              <Ionicons name="checkmark-circle-outline" size={13} color={T.success} />
              <View style={{ flex: 1 }}>
                <Text style={th.reportLabel}>Strengths</Text>
                <Text style={th.reportTxt}>{test.reportStrengths}</Text>
              </View>
            </View>
          ) : null}
          {test.reportAreasOfImprovement ? (
            <View style={th.reportRow}>
              <Ionicons name="alert-circle-outline" size={13} color={T.warning} />
              <View style={{ flex: 1 }}>
                <Text style={th.reportLabel}>Needs Work</Text>
                <Text style={th.reportTxt}>{test.reportAreasOfImprovement}</Text>
              </View>
            </View>
          ) : null}
          {test.reportRecommendations ? (
            <View style={th.reportRow}>
              <Ionicons name="bulb-outline" size={13} color={T.primary} />
              <View style={{ flex: 1 }}>
                <Text style={th.reportLabel}>Recommendations</Text>
                <Text style={th.reportTxt}>{test.reportRecommendations}</Text>
              </View>
            </View>
          ) : null}
        </View>
      )}

      {hasReport && (
        <Pressable onPress={() => setExpanded((v) => !v)} style={th.expandBtn}>
          <Text style={th.expandTxt}>{expanded ? "Less" : "View Report"}</Text>
          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={12} color={T.primary} />
        </Pressable>
      )}
    </View>
  );
};

const th = StyleSheet.create({
  card:       { backgroundColor: T.paper, borderRadius: T.radiusXl, borderWidth: 1, borderColor: T.border, padding: 14, marginBottom: 10, gap: 8 },
  header:     { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  typeRow:    { flexDirection: "row", alignItems: "center", gap: 8 },
  typeBadge:  { paddingHorizontal: 8, paddingVertical: 3, borderRadius: T.radiusFull },
  typeLabel:  { fontSize: 10, fontWeight: "800", letterSpacing: 0.3 },
  cycle:      { fontSize: 10, color: T.textDisabled, fontWeight: "600" },
  topic:      { fontSize: 13, fontWeight: "700", color: T.textPrimary, letterSpacing: -0.2 },
  date:       { fontSize: 11, color: T.textDisabled },
  pct:        { fontSize: 18, fontWeight: "800", letterSpacing: -0.5 },
  score:      { fontSize: 11, color: T.textDisabled },
  barTrack:   { height: 4, borderRadius: 2, backgroundColor: T.muted, overflow: "hidden" },
  barFill:    { height: 4, borderRadius: 2 },
  chapRow:    { flexDirection: "row", alignItems: "flex-start", gap: 5 },
  chapTxt:    { fontSize: 11, color: T.textDisabled, flex: 1, lineHeight: 15 },
  reportBox:  { backgroundColor: T.muted, borderRadius: T.radiusMd, padding: 12, gap: 10 },
  reportRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  reportLabel:{ fontSize: 10, fontWeight: "800", color: T.textSecondary, marginBottom: 2 },
  reportTxt:  { fontSize: 12, color: T.textSecondary, lineHeight: 17 },
  expandBtn:  { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start" },
  expandTxt:  { fontSize: 11, fontWeight: "700", color: T.primary },
});

// â”€â”€â”€ Syllabus Coverage Section â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SyllabusCoverageSection = ({ subjects }: { subjects: NonNullable<ParentProgressData["subjects"]> }) => {
  const subjectsWithCoverage = subjects.filter((s) => (s.totalChapters ?? 0) > 0);
  if (!subjectsWithCoverage.length) return null;

  return (
    <View style={sc.wrap}>
      {subjectsWithCoverage.map((subj) => {
        const pctCovered = subj.totalChapters! > 0
          ? Math.round((subj.coveredChapters! / subj.totalChapters!) * 100)
          : 0;
        const color = pctCovered >= 70 ? T.success : pctCovered >= 40 ? T.warning : T.primary;
        return (
          <View key={subj.subject} style={sc.subjectBlock}>
            <View style={sc.subjectRow}>
              <Text style={sc.subjectName}>{subj.subject}</Text>
              <Text style={[sc.pct, { color }]}>{pctCovered}%</Text>
            </View>
            <View style={sc.track}>
              <View style={[sc.fill, { width: `${pctCovered}%` as any, backgroundColor: color }]} />
            </View>
            <Text style={sc.caption}>
              {subj.coveredChapters} of {subj.totalChapters} chapters covered in tests
            </Text>
            {(subj.chapterCoverage?.length ?? 0) > 0 && (
              <View style={sc.chapGrid}>
                {subj.chapterCoverage!.map((ch) => (
                  <View
                    key={ch.label}
                    style={[sc.chapChip, ch.covered ? sc.chapChipDone : sc.chapChipTodo]}
                  >
                    {ch.covered && <Ionicons name="checkmark" size={9} color={T.success} />}
                    <Text
                      style={[sc.chapLabel, ch.covered ? sc.chapLabelDone : sc.chapLabelTodo]}
                      numberOfLines={1}
                    >
                      {ch.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
};

const sc = StyleSheet.create({
  wrap:           { gap: 20 },
  subjectBlock:   { gap: 6 },
  subjectRow:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  subjectName:    { fontSize: 13, fontWeight: "800", color: T.textPrimary },
  pct:            { fontSize: 14, fontWeight: "800" },
  track:          { height: 6, borderRadius: 3, backgroundColor: T.muted, overflow: "hidden" },
  fill:           { height: 6, borderRadius: 3 },
  caption:        { fontSize: 11, color: T.textDisabled },
  chapGrid:       { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  chapChip:       { flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 9, paddingVertical: 4, borderRadius: T.radiusFull, borderWidth: 1 },
  chapChipDone:   { backgroundColor: `${T.success}10`, borderColor: `${T.success}30` },
  chapChipTodo:   { backgroundColor: T.muted, borderColor: T.border },
  chapLabel:      { fontSize: 10, fontWeight: "600" },
  chapLabelDone:  { color: T.success },
  chapLabelTodo:  { color: T.textDisabled },
});

// â”€â”€â”€ Section Title â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const SectionTitle = ({ children }: { children: string }) => (
  <Text style={st.title}>{children}</Text>
);

const st = StyleSheet.create({
  title: {
    fontSize: 11,
    fontWeight: "800",
    color: T.textDisabled,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 20,
    marginBottom: 10,
  },
});

// â”€â”€â”€ Tab Switcher â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

type ProgressTab = "overview" | "tests" | "ai";

const TABS: Array<{ id: ProgressTab; label: string; icon: string }> = [
  { id: "overview", label: "Overview", icon: "grid-outline" },
  { id: "tests",    label: "Tests",    icon: "document-text-outline" },
  { id: "ai",       label: "AI",       icon: "sparkles-outline" },
];

const TabSwitcher = ({
  active,
  onPress,
}: {
  active: ProgressTab;
  onPress: (t: ProgressTab) => void;
}) => (
  <View style={tsw.bar}>
    {TABS.map((tab) => {
      const isActive = active === tab.id;
      return (
        <Pressable
          key={tab.id}
          style={[tsw.tab, isActive && tsw.tabActive]}
          onPress={() => onPress(tab.id)}
        >
          <Ionicons
            name={tab.icon as any}
            size={14}
            color={isActive ? "#fff" : T.mutedFg}
          />
          <Text style={[tsw.label, isActive && tsw.labelActive]}>
            {tab.label}
          </Text>
        </Pressable>
      );
    })}
  </View>
);

const tsw = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: T.muted,
    borderRadius: T.radiusFull,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    borderRadius: T.radiusFull,
  },
  tabActive: { backgroundColor: T.primary },
  label: { fontSize: 12, fontWeight: "700", color: T.mutedFg },
  labelActive: { color: "#fff" },
});

// â”€â”€â”€ Stat Pill (hero row) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const StatPill = ({
  icon,
  value,
  label,
  color,
}: {
  icon: any;
  value: string;
  label: string;
  color: string;
}) => (
  <View style={sp.pill}>
    <View style={[sp.iconBox, { backgroundColor: `${color}20` }]}>
      <Ionicons name={icon} size={13} color={color} />
    </View>
    <View>
      <Text style={sp.value}>{value}</Text>
      <Text style={sp.label}>{label}</Text>
    </View>
  </View>
);

const sp = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.10)",
    borderRadius: T.radiusLg,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  iconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  value: { fontSize: 14, fontWeight: "800", color: "#fff", letterSpacing: -0.3 },
  label: { fontSize: 9, color: "rgba(255,255,255,0.5)", fontWeight: "500", marginTop: 1 },
});

// â”€â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface Props {
  userId?: string;
  name?: string;
  role?: string;
}

const SECTION_COUNT = 3;

const ParentProgressScreen = (_props: Props) => {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<ParentProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeSubject, setActiveSubject] = useState<string>("");
  const [contentReady, setContentReady] = useState(false);
  const [activeTab, setActiveTab] = useState<ProgressTab>("overview");

  const stagger = useStaggeredEntrance(SECTION_COUNT, contentReady);

  const loadData = useCallback(async () => {
    try {
      const res = await getParentProgress();
      setData(res.data);
      if (res.data.subjects?.length) setActiveSubject(res.data.subjects[0].subject);
    } catch (_) {
      /* graceful degradation */
    } finally {
      setLoading(false);
      setRefreshing(false);
      setContentReady(true);
    }
  }, []);

  useEffect(() => { void loadData(); }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setContentReady(false);
    loadData();
  }, [loadData]);

  // â”€â”€ Overview tab content
  const renderOverview = () => (
    <ScrollView
      style={s.tabScroll}
      contentContainerStyle={s.tabScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
      }
    >
      {!data || !data.allTests?.length ? null : (
        <>
          <Animated.View style={stagger[0]}>
            <TrendBanner trend={data.overallTrend} summary={data.trendSummary} />
          </Animated.View>

          <Animated.View style={[stagger[0], { marginTop: 16 }]}>
            <SectionTitle>By Subject</SectionTitle>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={s.subjectsRow}
            >
              {data.subjects.map((subj) => (
                <SubjectScoreCard key={subj.subject} subj={subj} />
              ))}
            </ScrollView>
          </Animated.View>

          {data.subjects.some((sub) => sub.weakTopics.length > 0) && (
            <Animated.View style={stagger[1]}>
              <SectionTitle>Focus Areas</SectionTitle>
              <FocusAreas subjects={data.subjects} />
            </Animated.View>
          )}

          {data.subjects?.some((sub) => (sub.totalChapters ?? 0) > 0) && (
            <Animated.View style={stagger[2]}>
              <SectionTitle>Syllabus Coverage</SectionTitle>
              <View style={s.coverCard}>
                <SyllabusCoverageSection subjects={data.subjects} />
              </View>
            </Animated.View>
          )}
        </>
      )}
    </ScrollView>
  );

  // â”€â”€ Tests tab content
  const renderTests = () => (
    <ScrollView
      style={s.tabScroll}
      contentContainerStyle={s.tabScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.primary} />
      }
    >
      {data?.allTests?.length ? (
        <>
          <Animated.View style={stagger[0]}>
            <SectionTitle>Performance Chart</SectionTitle>
            <View style={s.graphCard}>
              {(data.subjects?.length ?? 0) > 1 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={s.tabsRow}
                  style={s.tabsScroll}
                >
                  {data.subjects.map((sub) => (
                    <Pressable
                      key={sub.subject}
                      onPress={() => setActiveSubject(sub.subject)}
                      style={({ pressed }) => [
                        s.tab,
                        activeSubject === sub.subject && s.tabActive,
                        pressed && { opacity: 0.75 },
                      ]}
                    >
                      <Text style={[s.tabTxt, activeSubject === sub.subject && s.tabTxtActive]}>
                        {sub.subject}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
              <TestGraph
                tests={data.allTests}
                subject={activeSubject || data.subjects[0]?.subject || ""}
                ready={contentReady}
              />
              <Text style={s.graphNote}>
                Last 8 tests Â·{" "}
                {data.subjects.find((sub) => sub.subject === activeSubject)?.tests?.length ?? 0}{" "}
                total in {activeSubject}
              </Text>
            </View>
          </Animated.View>

          <Animated.View style={stagger[1]}>
            <SectionTitle>Test History</SectionTitle>
            {data.allTests.map((test) => (
              <TestHistoryCard key={test._id} test={test} />
            ))}
          </Animated.View>
        </>
      ) : null}
    </ScrollView>
  );

  // â”€â”€ AI tab content
  const renderAI = () => (
    <ScrollView
      style={s.tabScroll}
      contentContainerStyle={s.tabScrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {data?.aiInsight ? (
        <Animated.View style={stagger[0]}>
          <AIPanel insight={data.aiInsight} data={data} />
        </Animated.View>
      ) : (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="sparkles-outline" size={32} color={T.textDisabled} />
          </View>
          <Text style={s.emptyTitle}>No AI insight yet</Text>
          <Text style={s.emptySub}>AI insights appear once tests are recorded.</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* â”€â”€ Hero â”€â”€ */}
      <LinearGradient
        colors={["#0F1B2D", "#1A2E4A", "#162032"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.hero, { paddingTop: Math.max(insets.top, 16) + 16 }]}
      >
        <View style={s.heroTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.heroEyebrow}>Academic Progress</Text>
            <Text style={s.heroName} numberOfLines={1}>
              {data?.studentName ? `${data.studentName}` : "Your child"}
            </Text>
          </View>
          {data?.overallTrend && (
            <View style={[s.trendBadge, {
              backgroundColor:
                data.overallTrend === "IMPROVING" ? `${T.success}22`
                : data.overallTrend === "STEADY"   ? `${T.warning}22`
                : `${T.error}20`,
            }]}>
              <Ionicons
                name={
                  data.overallTrend === "IMPROVING" ? "trending-up"
                  : data.overallTrend === "STEADY"  ? "remove-circle-outline"
                  : "trending-down"
                }
                size={14}
                color={
                  data.overallTrend === "IMPROVING" ? T.success
                  : data.overallTrend === "STEADY"  ? T.warning
                  : T.error
                }
              />
              <Text style={[s.trendBadgeTxt, {
                color:
                  data.overallTrend === "IMPROVING" ? T.success
                  : data.overallTrend === "STEADY"  ? T.warning
                  : T.error,
              }]}>
                {data.overallTrend === "IMPROVING" ? "Improving"
                  : data.overallTrend === "STEADY"  ? "Steady"
                  : "Needs Attention"}
              </Text>
            </View>
          )}
        </View>

        {data && (
          <View style={s.statRow}>
            {data.completedSessions != null && (
              <StatPill icon="book-outline" value={String(data.completedSessions)} label="Sessions" color={T.secondaryLight} />
            )}
            {data.attendanceRate != null && (
              <StatPill
                icon="checkmark-circle-outline"
                value={`${Math.round(data.attendanceRate)}%`}
                label="Attendance"
                color={data.attendanceRate >= 80 ? T.successLight : data.attendanceRate >= 60 ? T.warning : T.errorLight}
              />
            )}
            {(data.totalTestsTaken ?? 0) > 0 && (
              <StatPill icon="document-text-outline" value={String(data.totalTestsTaken)} label="Tests" color={T.secondaryLight} />
            )}
          </View>
        )}
      </LinearGradient>

      {/* â”€â”€ Tab bar â”€â”€ */}
      {!loading && data && (data.allTests?.length ?? 0) > 0 && (
        <View style={s.tabBarWrap}>
          <TabSwitcher active={activeTab} onPress={setActiveTab} />
        </View>
      )}

      {/* â”€â”€ Content â”€â”€ */}
      {loading ? (
        <View style={s.skeletonWrap}>
          <View style={s.skeletonInner}>
            <Skeleton w="100%" h={72} radius={16} />
            <Skeleton w="100%" h={160} radius={16} />
            <Skeleton w="60%" h={20} radius={8} />
            <Skeleton w="100%" h={120} radius={16} />
          </View>
        </View>
      ) : !data || !data.subjects?.length ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="school-outline" size={32} color={T.textDisabled} />
          </View>
          <Text style={s.emptyTitle}>No class assigned yet</Text>
          <Text style={s.emptySub}>
            Once a tutor is assigned and your class begins, progress will appear here automatically.
          </Text>
        </View>
      ) : !data.allTests?.length ? (
        <View style={s.emptyWrap}>
          <View style={s.emptyIcon}>
            <Ionicons name="document-text-outline" size={32} color={T.textDisabled} />
          </View>
          <Text style={s.emptyTitle}>No tests recorded yet</Text>
          <Text style={s.emptySub}>
            Your tutor hasn't entered any test scores yet.{"\n"}Check back after the next assessment.
          </Text>
          <View style={s.emptyHint}>
            <Ionicons name="information-circle-outline" size={13} color={T.primary} />
            <Text style={s.emptyHintTxt}>
              {data.completedSessions ?? 0} session{data.completedSessions !== 1 ? "s" : ""} completed so far
            </Text>
          </View>
        </View>
      ) : (
        <>
          {activeTab === "overview" && renderOverview()}
          {activeTab === "tests"    && renderTests()}
          {activeTab === "ai"       && renderAI()}
        </>
      )}
    </View>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.background },

  // â”€â”€ Hero
  hero: {
    paddingHorizontal: 22,
    paddingBottom: 22,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  heroEyebrow: {
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(255,255,255,0.42)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  heroName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.5,
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: T.radiusFull,
    marginTop: 16,
  },
  trendBadgeTxt: {
    fontSize: 11,
    fontWeight: "700",
  },

  // â”€â”€ Tab bar wrapper
  tabBarWrap: {
    paddingTop: 14,
    backgroundColor: T.background,
  },

  // â”€â”€ Tab scroll areas
  tabScroll: { flex: 1 },
  tabScrollContent: { padding: 20, paddingBottom: 80 },
  statRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  skeletonWrap: { flex: 1 },
  skeletonInner: { gap: 14, padding: 20, paddingTop: 24 },

  coverCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
  },

  emptyWrap: {
    alignItems: "center",
    paddingVertical: 56,
    gap: 12,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: T.textPrimary,
    letterSpacing: -0.3,
  },
  emptySub: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 20,
  },
  emptyHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: `${T.primary}10`,
    borderRadius: T.radiusFull,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginTop: 4,
  },
  emptyHintTxt: {
    fontSize: 12,
    color: T.primary,
    fontWeight: "600",
  },

  graphCard: {
    backgroundColor: T.paper,
    borderRadius: T.radiusXl,
    borderWidth: 1,
    borderColor: T.border,
    padding: 16,
    paddingBottom: 12,
  },
  tabsScroll: { marginBottom: 12 },
  tabsRow: { flexDirection: "row", gap: 6 },
  tab: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: T.radiusFull,
    backgroundColor: T.muted,
    borderWidth: 1,
    borderColor: T.border,
  },
  tabActive: { backgroundColor: T.primary, borderColor: T.primary },
  tabTxt: { fontSize: 12, fontWeight: "600", color: T.mutedFg },
  tabTxtActive: { color: "#fff" },
  graphNote: {
    fontSize: 10,
    color: T.textDisabled,
    textAlign: "right",
    marginTop: 6,
  },

  subjectsRow: {
    flexDirection: "row",
    paddingBottom: 4,
  },
});

export default ParentProgressScreen;

