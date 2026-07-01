import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { pm } from "./styles";

interface Props {
  state: { docType: string; label: string } | null;
  onClose: () => void;
  onUpload: (choice: "image" | "pdf") => void;
}

export const DocPickerSheet: React.FC<Props> = ({
  state,
  onClose,
  onUpload,
}) => (
  <Modal
    visible={!!state}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={pm.backdrop} onPress={onClose}>
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>Upload {state?.label}</Text>
        <Text style={pm.sub}>Choose the format of your document</Text>

        <Pressable style={pm.option} onPress={() => onUpload("image")}>
          <LinearGradient
            colors={["#2D68C420", "#2D68C408"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[pm.optIcon, { borderWidth: 1, borderColor: "#2D68C428" }]}
          >
            <Ionicons name="image-outline" size={22} color="#2D68C4" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={pm.optLabel}>Image / Photo</Text>
            <Text style={pm.optSub}>JPG, PNG from your gallery</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
        </Pressable>

        <Pressable
          style={[pm.option, { borderBottomWidth: 0 }]}
          onPress={() => onUpload("pdf")}
        >
          <LinearGradient
            colors={["#EF444420", "#EF444408"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[pm.optIcon, { borderWidth: 1, borderColor: "#EF444428" }]}
          >
            <Ionicons name="document-text-outline" size={22} color="#EF4444" />
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={pm.optLabel}>PDF Document</Text>
            <Text style={pm.optSub}>Official PDFs, scanned copies</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
        </Pressable>

        <Pressable style={pm.cancel} onPress={onClose}>
          <Text style={pm.cancelTxt}>Cancel</Text>
        </Pressable>
      </View>
    </Pressable>
  </Modal>
);

export default DocPickerSheet;

