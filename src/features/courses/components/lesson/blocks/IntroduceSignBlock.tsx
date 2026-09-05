import React, { useState } from "react";
import {
  StyleSheet,
  View,
  Modal,
  Pressable,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Linking,
  ActivityIndicator,
} from "react-native";
import { Text } from "@/components/Text";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "@/theme";
import { IntroduceSignConfig } from "@/features/courses/lessonContent.types";
import { SignAnimation } from "../SignAnimation";
import { LessonButton } from "../LessonButton";
import { signReportsApi, ReportReason } from "@/api/signs";

interface IntroduceSignBlockProps {
  config: IntroduceSignConfig;
  onContinue: () => void;
}

type ModalView = "options" | "report" | "success";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "INCORRECT_SIGN", label: "Seña incorrecta" },
  { value: "UNCLEAR_ANIMATION", label: "Animación poco clara" },
  { value: "WRONG_MEANING", label: "Significado erróneo" },
  { value: "MISSING_CONTEXT", label: "Falta contexto" },
  { value: "REGIONAL_VARIANT", label: "Variante regional" },
  { value: "TECHNICAL_PROBLEM", label: "Problema técnico" },
  { value: "OTHER", label: "Otro" },
];

export function IntroduceSignBlock({ config, onContinue }: IntroduceSignBlockProps) {
  const [view, setView] = useState<ModalView | null>(null);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  const youtubeUrl =
    config.video_url ??
    `https://www.youtube.com/results?search_query=${encodeURIComponent(`seña LSA ${config.word}`)}`;

  function closeModal() {
    if (loading) return;
    setView(null);
    setReason(null);
    setDescription("");
    setReportError(null);
  }

  async function handleReport() {
    if (!reason) return;
    setReportError(null);
    setLoading(true);
    try {
      await signReportsApi.createReport({
        signMeaning: config.meaning,
        reason,
        description: description.trim() || undefined,
      });
      setView("success");
    } catch (err: any) {
      setReportError(err?.response?.data?.message ?? "No pudimos enviar el reporte.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.body}>
        <View style={styles.topRow}>
          <View style={styles.tag}>
            <Ionicons name="hand-left-outline" size={13} color={colors.primaryDark} />
            <Text style={styles.tagText}>NUEVA SEÑA</Text>
          </View>
          <TouchableOpacity
            style={styles.optionsBtn}
            onPress={() => setView("options")}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Opciones de la seña"
          >
            <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <Text style={styles.word}>{config.word}</Text>
        <SignAnimation meaning={config.meaning} label={config.word} height={340} />
      </View>

      <View style={styles.footer}>
        <LessonButton label="Continuar" onPress={onContinue} />
      </View>

      <Modal visible={view !== null} transparent animationType="slide" onRequestClose={closeModal}>
        <Pressable style={styles.backdrop} onPress={closeModal}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />

            {view === "options" && (
              <>
                <Text style={styles.sheetTitle}>Sobre esta seña</Text>

                <OptionRow
                  icon="logo-youtube"
                  iconColor="#FF0000"
                  label="Ver en YouTube"
                  onPress={() => {
                    Linking.openURL(youtubeUrl);
                    closeModal();
                  }}
                />
                <OptionRow
                  icon="flag-outline"
                  iconColor={colors.danger}
                  label="Reportar seña"
                  onPress={() => setView("report")}
                />

                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelLabel}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {view === "report" && (
              <>
                <Text style={styles.sheetTitle}>Reportar seña</Text>
                <Text style={styles.sheetSubtitle}>¿Cuál es el problema con "{config.word}"?</Text>

                <ScrollView style={styles.reasonList} showsVerticalScrollIndicator={false}>
                  {REASONS.map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.reasonRow, reason === r.value && styles.reasonRowSelected]}
                      onPress={() => setReason(r.value)}
                    >
                      <Text
                        style={[styles.reasonLabel, reason === r.value && styles.reasonLabelSelected]}
                      >
                        {r.label}
                      </Text>
                      {reason === r.value && (
                        <Ionicons name="checkmark-circle" size={18} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}

                  <TextInput
                    style={styles.descInput}
                    placeholder="Descripción adicional (opcional)"
                    placeholderTextColor={colors.textMuted}
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    maxLength={300}
                    textAlignVertical="top"
                  />
                </ScrollView>

                {reportError && <Text style={styles.errorText}>{reportError}</Text>}

                <TouchableOpacity
                  style={[styles.submitBtn, !reason && styles.submitBtnDisabled]}
                  onPress={handleReport}
                  disabled={!reason || loading}
                >
                  {loading ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <Text style={styles.submitLabel}>Enviar reporte</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={loading}>
                  <Text style={styles.cancelLabel}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}

            {view === "success" && (
              <>
                <View style={styles.successIcon}>
                  <Ionicons name="checkmark-circle" size={38} color={colors.success} />
                </View>
                <Text style={styles.sheetTitle}>Reporte enviado</Text>
                <Text style={styles.sheetSubtitle}>
                  Gracias por ayudarnos a mejorar el contenido de Signa.
                </Text>
                <TouchableOpacity style={styles.submitBtn} onPress={closeModal}>
                  <Text style={styles.submitLabel}>Aceptar</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  label: string;
  onPress: () => void;
}

function OptionRow({ icon, iconColor, label, onPress }: OptionRowProps) {
  return (
    <TouchableOpacity style={styles.optionRow} onPress={onPress}>
      <View style={[styles.optionIconBox, { backgroundColor: `${iconColor}18` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={styles.optionLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, paddingTop: 22, gap: 16 },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.primaryLight,
    borderRadius: 9,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  tagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    letterSpacing: 0.4,
    color: colors.primaryDark,
  },
  optionsBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  word: {
    fontFamily: fonts.displayBold,
    fontSize: 34,
    letterSpacing: -1,
    color: colors.text,
  },
  footer: { padding: 20, paddingTop: 14 },

  // Modal
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
    paddingTop: 16,
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
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
    marginBottom: 4,
  },
  sheetSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 14,
  },

  // Options view
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },

  // Report view
  reasonList: {
    maxHeight: 320,
    marginBottom: 8,
  },
  reasonRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
    backgroundColor: colors.fill,
  },
  reasonRowSelected: {
    backgroundColor: colors.primaryLight,
  },
  reasonLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
  },
  reasonLabelSelected: {
    fontFamily: fonts.bodySemiBold,
    color: colors.primaryDark,
  },
  descInput: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 12,
    minHeight: 72,
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.fill,
  },
  errorText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    marginBottom: 8,
  },
  submitBtn: {
    height: 52,
    marginTop: 14,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
  submitLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15.5,
    color: colors.onDark,
  },
  cancelBtn: {
    height: 48,
    marginTop: 10,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },

  // Success view
  successIcon: {
    alignSelf: "center",
    marginBottom: 12,
  },
});
