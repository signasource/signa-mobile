import React, { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, alpha } from "@/theme";
import { gemOrdersApi, GemOrderHistoryItem } from "@/api/gemOrders";
import { courseOrdersApi, CourseOrderHistoryItem } from "@/api/courseOrders";
import type { UserRefundRequest } from "@/api/gemOrders";

export type RefundTarget =
  | { kind: "gems"; order: GemOrderHistoryItem }
  | { kind: "course"; order: CourseOrderHistoryItem };

interface Props {
  target: RefundTarget | null;
  onClose: () => void;
  /** The refund went through; the sheet stays open on its success state until closed. */
  onSubmitted: (request: UserRefundRequest) => void;
  /** The call failed; the request may still have been saved as pending. */
  onFailed: () => void;
}

const REASONS: { value: string; label: string }[] = [
  { value: "MISTAKE", label: "Me equivoqué al comprar" },
  { value: "DUPLICATE", label: "Compra duplicada" },
  { value: "NOT_RECEIVED", label: "No recibí lo que esperaba" },
  { value: "NOT_AS_EXPECTED", label: "El producto no era lo esperado" },
  { value: "TECHNICAL", label: "Problemas técnicos" },
  { value: "OTHER", label: "Otro motivo" },
];

export function RefundRequestSheet({ target, onClose, onSubmitted, onFailed }: Props) {
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function reset() {
    setReason(null);
    setMessage("");
    setSubmitting(false);
    setError(null);
    setSent(false);
  }

  async function submit() {
    if (!target) return;
    setError(null);
    setSubmitting(true);
    try {
      let res;
      const trimmed = message.trim();
      const body = {
        ...(reason ? { reason } : {}),
        ...(trimmed ? { message: trimmed } : {}),
      };
      if (target.kind === "gems") {
        res = await gemOrdersApi.createRefundRequest(target.order.id, body);
      } else {
        res = await courseOrdersApi.createRefundRequest(target.order.id, body);
      }
      setSent(true);
      onSubmitted(res.data);
    } catch (err: any) {
      const msg = err?.response?.data?.message;
      setError(
        msg ??
          "No pudimos procesar el reembolso. Si el pedido quedó registrado, nuestro equipo lo va a revisar.",
      );
      // The request may have been saved before the refund failed: let the list show it.
      onFailed();
    } finally {
      setSubmitting(false);
    }
  }

  const productLabel =
    target?.kind === "gems"
      ? `${target.order.gems} gemas · ${target.order.packName}`
      : target?.order.courseName ?? "";

  return (
    <Modal
      visible={target != null}
      transparent
      animationType="slide"
      onRequestClose={() => { if (!submitting) { reset(); onClose(); } }}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior="padding"
      >
        <Pressable style={styles.backdrop} onPress={() => { if (!submitting) { reset(); onClose(); } }}>
          <Pressable style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 28) }]} onPress={() => {}}>
            <View style={styles.grabber} />

          {sent ? (
            <View style={styles.sentContent}>
              <View style={styles.sentIcon}>
                <Ionicons name="checkmark-circle" size={48} color={colors.success} />
              </View>
              <Text style={styles.sentTitle}>Reembolso realizado</Text>
              <Text style={styles.sentSub}>
                Te devolvimos el pago por Mercado Pago. Puede tardar unos días en verse según tu
                medio de pago.
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => { reset(); onClose(); }}
                activeOpacity={0.86}
              >
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sheetTitle}>Pedir reembolso</Text>
              <Text style={styles.sheetSub}>
                {target?.kind === "course"
                  ? "Al confirmar, te devolvemos el pago por Mercado Pago y se quita tu acceso al curso."
                  : "Al confirmar, te devolvemos el pago por Mercado Pago y se descuentan las gemas de tu saldo."}
              </Text>

              {target && (
                <View style={styles.productRow}>
                  <Ionicons
                    name={target.kind === "gems" ? "diamond" : "play-circle"}
                    size={20}
                    color={target.kind === "gems" ? colors.gemsBlue : colors.primary}
                  />
                  <Text style={styles.productLabel} numberOfLines={2}>
                    {productLabel}
                  </Text>
                </View>
              )}

              <Text style={styles.fieldLabel}>Motivo <Text style={styles.optionalLabel}>(opcional)</Text></Text>
              <View style={styles.reasonsGrid}>
                {REASONS.map((r) => (
                  <TouchableOpacity
                    key={r.value}
                    style={[styles.reasonChip, reason === r.value && styles.reasonChipSelected]}
                    onPress={() => setReason(reason === r.value ? null : r.value)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={[
                        styles.reasonChipText,
                        reason === r.value && styles.reasonChipTextSelected,
                      ]}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Comentario <Text style={styles.optionalLabel}>(opcional)</Text></Text>
              <TextInput
                style={styles.textArea}
                multiline
                numberOfLines={4}
                placeholder="Contanos qué pasó para que podamos ayudarte mejor."
                placeholderTextColor={colors.textMuted}
                value={message}
                onChangeText={setMessage}
                maxLength={2000}
                textAlignVertical="top"
              />
              {message.length > 0 && (
                <Text style={styles.charCount}>{message.length}/2000</Text>
              )}

              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <TouchableOpacity
                style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                onPress={submit}
                disabled={submitting}
                activeOpacity={0.86}
              >
                {submitting ? (
                  <ActivityIndicator color={colors.onDark} />
                ) : (
                  <Text style={styles.submitButtonText}>Confirmar reembolso</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => { reset(); onClose(); }}
                disabled={submitting}
                activeOpacity={0.86}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </ScrollView>
          )}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: alpha(colors.text, 0.55),
    justifyContent: "flex-end",
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 16,
    maxHeight: "90%",
  },
  grabber: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 20,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 24 },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.text,
    letterSpacing: -0.7,
    marginBottom: 10,
  },
  sheetSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    marginBottom: 18,
  },
  productRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: colors.fill,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
  },
  productLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  fieldLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginBottom: 10,
  },
  optionalLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    letterSpacing: 0,
    textTransform: "none",
    color: colors.textMuted,
  },
  reasonsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  reasonChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  reasonChipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  reasonChipText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.text,
  },
  reasonChipTextSelected: {
    color: colors.primaryDark,
    fontFamily: fonts.bodySemiBold,
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 110,
    marginBottom: 4,
  },
  charCount: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.textMuted,
    textAlign: "right",
    marginBottom: 16,
  },
  errorText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 13,
    color: colors.danger,
    marginBottom: 14,
    lineHeight: 19,
  },
  submitButton: {
    minHeight: 54,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  submitButtonDisabled: {
    opacity: 0.4,
  },
  submitButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onDark,
  },
  cancelButton: {
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
  sentContent: {
    alignItems: "center",
    paddingVertical: 24,
    paddingBottom: 40,
    gap: 12,
  },
  sentIcon: {
    marginBottom: 4,
  },
  sentTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 26,
    color: colors.text,
    letterSpacing: -0.7,
  },
  sentSub: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 280,
  },
  closeButton: {
    marginTop: 8,
    minHeight: 54,
    width: "100%",
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: colors.onDark,
  },
});
