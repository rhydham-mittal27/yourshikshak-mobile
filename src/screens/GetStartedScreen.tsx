import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { WebView } from "react-native-webview";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StackNavigationProp } from "@react-navigation/stack";
import { RootStackParamList } from "../navigation/AppNavigator";
import { getOptions } from "../api/client";
import { T } from "../constants/colors";

const SCREEN_W = Dimensions.get("window").width;

type Nav = StackNavigationProp<RootStackParamList, "GetStarted">;
interface Props { navigation: Nav }

const extractYouTubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
};

const GetStartedScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const opts = await getOptions("TEACHER_TUTORIAL");
        const tutorial = (opts as any)?.data?.[0] ?? (Array.isArray(opts) ? opts[0] : null);
        if (tutorial?.metadata?.videoUrl) setVideoUrl(tutorial.metadata.videoUrl);
        if (tutorial?.metadata?.description) setDescription(tutorial.metadata.description);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const videoId = videoUrl ? extractYouTubeId(videoUrl) : null;
  // Use m.youtube.com watch page — bypasses embed restrictions (error 153)
  const embedUri = videoId
    ? `https://m.youtube.com/watch?v=${videoId}`
    : null;

  const VIDEO_H = Math.round(SCREEN_W * 9 / 16) + 60; // extra room for YouTube mobile UI

  return (
    <View style={[s.root, { paddingTop: Math.max(insets.top, 16) }]}>
      {/* Header */}
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text style={s.headerTitle}>Get Started</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={T.primary} />
            <Text style={s.loadingTxt}>Loading tutorial…</Text>
          </View>
        ) : !videoId && !description ? (
          <View style={s.center}>
            <Ionicons name="videocam-off-outline" size={56} color={T.mutedFg} />
            <Text style={s.emptyHead}>No tutorial yet</Text>
            <Text style={s.emptySub}>The admin hasn't uploaded a tutorial video yet. Check back soon!</Text>
          </View>
        ) : (
          <>
            {embedUri && (
              <View style={[s.videoBox, { height: VIDEO_H }]}>
                <WebView
                  source={{ uri: embedUri }}
                  style={{ flex: 1, backgroundColor: "#000" }}
                  allowsFullscreenVideo
                  allowsInlineMediaPlayback
                  mediaPlaybackRequiresUserAction={false}
                  javaScriptEnabled
                  originWhitelist={["*"]}
                  userAgent="Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
                />
              </View>
            )}

            {description ? (
              <View style={s.descBox}>
                <View style={s.descHeader}>
                  <Ionicons name="document-text-outline" size={18} color={T.primary} />
                  <Text style={s.descTitle}>About this Tutorial</Text>
                </View>
                <Text style={s.descText}>{description}</Text>
              </View>
            ) : null}
          </>
        )}
        <View style={{ height: Math.max(insets.bottom, 24) }} />
      </ScrollView>
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: T.darkBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -0.3,
  },
  scroll: { flex: 1, backgroundColor: "#F8FAFC" },
  content: { flexGrow: 1 },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  loadingTxt: { fontSize: 14, color: T.mutedFg, marginTop: 8 },
  emptyHead: { fontSize: 18, fontWeight: "800", color: T.textPrimary, textAlign: "center" },
  emptySub: { fontSize: 13, color: T.mutedFg, textAlign: "center", lineHeight: 20 },
  videoBox: {
    width: SCREEN_W,
    backgroundColor: "#000",
    overflow: "hidden",
  },
  descBox: {
    margin: 16,
    padding: 16,
    backgroundColor: "#fff",
    borderRadius: 14,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  descHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  descTitle: { fontSize: 15, fontWeight: "800", color: T.textPrimary },
  descText: { fontSize: 14, color: T.textSecondary, lineHeight: 22 },
});

export default GetStartedScreen;
