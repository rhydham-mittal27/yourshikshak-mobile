import React from "react";
import { View, Text, Pressable, Modal, Image, ActivityIndicator } from "react-native";
import { WebView } from "react-native-webview";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { EdgeInsets } from "react-native-safe-area-context";
import { T } from "../../constants/colors";
import { dv } from "./styles";

interface Props {
  viewer: { url: string; label: string } | null;
  insets: EdgeInsets;
  onClose: () => void;
}

export const DocumentViewerModal: React.FC<Props> = ({
  viewer,
  insets,
  onClose,
}) => (
  <Modal visible={!!viewer} animationType="slide" onRequestClose={onClose}>
    <View style={dv.root}>
      <LinearGradient
        colors={["#0f172a", "#1e293b"]}
        style={[dv.header, { paddingTop: Math.max(insets.top, 16) + 4 }]}
      >
        <Pressable onPress={onClose} style={dv.closeBtn} hitSlop={12}>
          <Ionicons name="arrow-back" size={20} color="#fff" />
        </Pressable>
        <Text style={dv.title} numberOfLines={1}>
          {viewer?.label ?? "Document"}
        </Text>
        <View style={{ width: 36 }} />
      </LinearGradient>

      {viewer &&
        (() => {
          const isPdf = viewer.url.toLowerCase().includes(".pdf");
          if (isPdf) {
            return (
              <WebView
                source={{
                  uri: `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(viewer.url)}`,
                }}
                style={{ flex: 1, backgroundColor: "#0f172a" }}
                startInLoadingState
                renderLoading={() => (
                  <View style={dv.loaderBox}>
                    <ActivityIndicator size="large" color={T.primary} />
                    <Text style={dv.loaderTxt}>Loading PDFâ€¦</Text>
                  </View>
                )}
              />
            );
          }
          return (
            <View style={dv.imgBox}>
              <Image
                source={{ uri: viewer.url }}
                style={dv.img}
                resizeMode="contain"
              />
            </View>
          );
        })()}
    </View>
  </Modal>
);

export default DocumentViewerModal;

