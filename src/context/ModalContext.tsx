/**
 * ModalContext.tsx â€” YourShikshak
 *
 * Global modal state. Wrap the app in <ModalProvider> once; call
 * useModal() anywhere to show branded alerts without prop-drilling.
 *
 * Usage:
 *   const { showModal, showError, showSuccess, showConfirm } = useModal();
 *
 *   showError('Login Failed', 'Invalid email or password.');
 *
 *   showConfirm('Sign Out', 'Are you sure?', {
 *     onConfirm: () => doSignOut(),
 *     confirmLabel: 'Sign Out',
 *   });
 */

import React, { createContext, useCallback, useContext, useState } from "react";
import AppModal, {
  ModalButton,
  ModalConfig,
  ModalVariant,
} from "../shared/components/AppModal";

// â”€â”€â”€ Context type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

interface ShowConfirmOpts {
  onConfirm?: () => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmStyle?: ModalButton["style"];
}

interface ModalContextValue {
  showModal: (config: ModalConfig) => void;
  showError: (title: string, message?: string) => void;
  showSuccess: (title: string, message?: string, onOk?: () => void) => void;
  showWarning: (title: string, message?: string) => void;
  showInfo: (title: string, message?: string) => void;
  showConfirm: (
    title: string,
    message?: string,
    opts?: ShowConfirmOpts,
  ) => void;
  dismiss: () => void;
}

const ModalContext = createContext<ModalContextValue | null>(null);

// â”€â”€â”€ Provider â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const ModalProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [config, setConfig] = useState<ModalConfig | null>(null);
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => setVisible(false), []);

  const showModal = useCallback((cfg: ModalConfig) => {
    setConfig(cfg);
    setVisible(true);
  }, []);

  const showError = useCallback(
    (title: string, message?: string) => {
      showModal({
        variant: "error",
        title,
        message,
        buttons: [{ label: "OK", style: "danger" }],
      });
    },
    [showModal],
  );

  const showSuccess = useCallback(
    (title: string, message?: string, onOk?: () => void) => {
      showModal({
        variant: "success",
        title,
        message,
        buttons: [{ label: "OK", style: "primary", onPress: onOk }],
      });
    },
    [showModal],
  );

  const showWarning = useCallback(
    (title: string, message?: string) => {
      showModal({
        variant: "warning",
        title,
        message,
        buttons: [{ label: "OK", style: "primary" }],
      });
    },
    [showModal],
  );

  const showInfo = useCallback(
    (title: string, message?: string) => {
      showModal({
        variant: "info",
        title,
        message,
        buttons: [{ label: "Got it", style: "primary" }],
      });
    },
    [showModal],
  );

  const showConfirm = useCallback(
    (title: string, message?: string, opts: ShowConfirmOpts = {}) => {
      const {
        onConfirm,
        onCancel,
        confirmLabel = "Confirm",
        cancelLabel = "Cancel",
        confirmStyle = "primary",
      } = opts;
      showModal({
        variant: "confirm",
        title,
        message,
        buttons: [
          { label: cancelLabel, style: "secondary", onPress: onCancel },
          { label: confirmLabel, style: confirmStyle, onPress: onConfirm },
        ],
      });
    },
    [showModal],
  );

  return (
    <ModalContext.Provider
      value={{
        showModal,
        showError,
        showSuccess,
        showWarning,
        showInfo,
        showConfirm,
        dismiss,
      }}
    >
      {children}
      {config && <AppModal visible={visible} onDismiss={dismiss} {...config} />}
    </ModalContext.Provider>
  );
};

// â”€â”€â”€ Hook â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export const useModal = (): ModalContextValue => {
  const ctx = useContext(ModalContext);
  if (!ctx) throw new Error("useModal must be used inside <ModalProvider>");
  return ctx;
};

