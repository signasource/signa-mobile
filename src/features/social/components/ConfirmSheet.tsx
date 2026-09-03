import React from "react";
import { View, StyleSheet, Modal, Pressable, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";

export interface ConfirmSpec {
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  tint: string;
  title: string;
  description: string;
  label: string;
}

interface Props {
  spec: ConfirmSpec | null;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** Bottom sheet guarding the destructive actions. */
export function ConfirmSheet({ spec, busy = false, onConfirm, onClose }: Props) {
  return (
    <Modal visible={spec !== null} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={busy ? undefined : onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {spec && (
            <>
              <View style={styles.grabber} />
              <View style={[styles.iconBox, { backgroundColor: spec.tint }]}>
                <Ionicons name={spec.icon} size={26} color={spec.tone} />
              </View>
              <Text style={styles.title}>{spec.title}</Text>
              <Text style={styles.description}>{spec.description}</Text>

              <TouchableOpacity
                style={[styles.confirm, { backgroundColor: spec.tone }]}
                onPress={onConfirm}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={colors.onDark} />
                ) : (
                  <Text style={styles.confirmLabel}>{spec.label}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.cancel} onPress={onClose} disabled={busy}>
                <Text style={styles.cancelLabel}>Cancelar</Text>
              </TouchableOpacity>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36,26,22,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 30,
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  description: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: 7,
  },
  confirm: {
    height: 52,
    marginTop: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
  },
  cancel: {
    height: 44,
    marginTop: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.textMuted,
  },
});
