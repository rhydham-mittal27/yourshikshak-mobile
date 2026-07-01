/**
 * AppModal.tsx â€” YourShikshak
 *
 * Branded replacement for React Native's default Alert.
 * Supports four variants: error | success | warning | confirm
 *
 * Consumed via useModal() hook from ModalContext.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { T } from "../../constants/colors";

// â”€â”€â”€ Public types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type ModalVariant = "error" | "success" | "warning" | "confirm" | "info";

export interface ModalButton {
  label: string;
  onPress?: () => void;
  style?: "primary" | "secondary" | "danger";
}

export interface ModalConfig {
  variant: ModalVariant;
  title: string;
  message?: string;
  buttons?: ModalButton[]; // defaults to [{ label: 'OK' }]
}

interface Props extends ModalConfig {
  visible: boolean;
  onDismiss: () => void;
}

// â”€â”€â”€ Variant tokens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const VARIANTS: Record<ModalVariant, { icon: any; color: string; bg: string }> =
  {
    error: { icon: "close-circle", color: T.error, bg: "#FEF2F2" },
    success: { icon: "checkmark-circle", color: T.success, bg: "#F0FDF4" },
    warning: { icon: "warning", color: T.warning, bg: "#FFFBEB" },
    confirm: { icon: "help-circle", color: T.primary, bg: `${T.primary}10` },
    info: { icon: "information-circle", color: T.info, bg: "#EFF6FF" },
  };

// â”€â”€â”€ Button styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const BTN: Record<NonNullable<ModalButton["style"]>, object> = {
  primary: { backgroundColor: T.primary },
  secondary: { backgroundColor: T.muted },
  danger: { backgroundColor: T.error },
};
const BTN_TXT: Record<NonNullable<ModalButton["style"]>, object> = {
  primary: { color: "#fff" },
  secondary: { color: T.textSecondary },
  danger: { color: "#fff" },
};

// â”€â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const AppModal: React.FC<Props> = ({
  visible,
  variant,
  title,
  message,
  buttons = [{ label: "OK" }],
  onDismiss,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.88)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          damping: 18,
          stiffness: 220,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      scaleAnim.setValue(0.88);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const v = VARIANTS[variant];

  const handleBtn = (btn: ModalButton) => {
    onDismiss();
    btn.onPress?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop */}
      <Pressable style={[s.backdrop, { backgroundColor: "rgba(2,8,23,0.75)" }]} onPress={onDismiss} />

      {/* Sheet */}
      <View style={s.centerer} pointerEvents="box-none">
        <Animated.View
          style={[
            s.sheet,
            { transform: [{ scale: scaleAnim }], opacity: opacityAnim },
          ]}
        >
          {/* Icon blob */}
          <View style={[s.iconBlob, { backgroundColor: v.bg }]}>
            <Ionicons name={v.icon} size={40} color={v.color} />
          </View>

          {/* Text */}
          <Text style={s.title}>{title}</Text>
          {message ? <Text style={s.message}>{message}</Text> : null}

          {/* Divider */}
          <View style={s.divider} />

          {/* Buttons */}
          <View
            style={[
              s.btnRow,
              buttons.length === 1 && { justifyContent: "center" },
            ]}
          >
            {buttons.map((btn, i) => {
              const bStyle =
                btn.style ??
                (i === 0 && buttons.length > 1 ? "secondary" : "primary");
              return (
                <Pressable
                  key={i}
                  onPress={() => handleBtn(btn)}
                  style={({ pressed }) => [
                    s.btn,
                    BTN[bStyle],
                    buttons.length === 1 && s.btnFull,
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Text style={[s.btnTxt, BTN_TXT[bStyle]]}>{btn.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// â”€â”€â”€ Styles â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const s = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  centerer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  sheet: {
    width: "100%",
    backgroundColor: T.paper,
    borderRadius: 24,
    paddingTop: 32,
    paddingHorizontal: 24,
    paddingBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 20,
  },

  iconBlob: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: T.textPrimary,
    textAlign: "center",
    letterSpacing: -0.3,
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: T.mutedFg,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },

  divider: {
    width: "100%",
    height: 1,
    backgroundColor: T.border,
    marginVertical: 20,
  },

  btnRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  btn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: T.radiusMd,
    alignItems: "center",
    justifyContent: "center",
  },
  btnFull: { flex: 1 },
  btnTxt: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
});

export default AppModal;

