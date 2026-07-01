import React from "react";
import { View, Text, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";
import { pm } from "./styles";

interface Props {
  visible: boolean;
  onClose: () => void;
  onPick: (fromCamera: boolean) => void;
}

export const PhotoPickerModal: React.FC<Props> = ({
  visible,
  onClose,
  onPick,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={pm.backdrop} onPress={onClose}>
      <View style={pm.sheet}>
        <View style={pm.handle} />
        <Text style={pm.title}>Update Profile Photo</Text>
        <Text style={pm.sub}>Choose how you'd like to update your picture</Text>

        <Pressable style={pm.option} onPress={() => onPick(true)}>
          <View style={[pm.optIcon, { backgroundColor: `${T.primary}15` }]}>
            <Ionicons name="camera-outline" size={22} color={T.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pm.optLabel}>Take a Photo</Text>
            <Text style={pm.optSub}>Use your camera</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={T.textDisabled} />
        </Pressable>

        <Pressable style={pm.option} onPress={() => onPick(false)}>
          <View style={[pm.optIcon, { backgroundColor: `${T.secondary}15` }]}>
            <Ionicons name="images-outline" size={22} color={T.secondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={pm.optLabel}>Choose from Gallery</Text>
            <Text style={pm.optSub}>Pick an existing photo</Text>
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

export default PhotoPickerModal;

