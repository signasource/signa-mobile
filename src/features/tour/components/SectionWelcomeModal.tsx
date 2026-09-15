import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes } from "@/theme";

export interface SectionFeature {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
}

interface Props {
  visible: boolean;
  title: string;
  subtitle: string;
  headerColor: string;
  headerKicker: string;
  features: SectionFeature[];
  primaryLabel: string;
  secondaryLabel?: string;
  onPrimary: () => void;
  onSecondary?: () => void;
}

export function SectionWelcomeModal({
  visible,
  title,
  subtitle,
  headerColor,
  headerKicker,
  features,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onPrimary}
    >
      <Pressable style={styles.backdrop} onPress={onPrimary}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {/* Colored header */}
          <View style={[styles.header, { backgroundColor: headerColor }]}>
            <Text style={styles.headerKicker}>{headerKicker}</Text>
            <Text style={styles.headerTitle}>{title}</Text>
            <Text style={styles.headerSubtitle}>{subtitle}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {features.map((f) => (
              <View key={f.label} style={styles.featureRow}>
                <View style={[styles.featureIcon, { backgroundColor: headerColor + "1A" }]}>
                  <Ionicons name={f.icon} size={22} color={headerColor} />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureLabel}>{f.label}</Text>
                  <Text style={styles.featureDesc}>{f.description}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* CTAs */}
          <View style={styles.actions}>
            {secondaryLabel && onSecondary && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={onSecondary}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryText}>{secondaryLabel}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: headerColor }]}
              onPress={onPrimary}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryText}>{primaryLabel}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(24,16,32,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
    maxHeight: "85%",
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
  },
  headerKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.85)",
  },
  headerTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: -0.8,
    color: "#fff",
    marginTop: 6,
  },
  headerSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: "rgba(255,255,255,0.85)",
    marginTop: 6,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 8,
    gap: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
    paddingTop: 2,
  },
  featureLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  featureDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textMuted,
    marginTop: 2,
  },
  actions: {
    paddingHorizontal: 20,
    paddingBottom: 32,
    paddingTop: 12,
    gap: 8,
  },
  primaryBtn: {
    height: 54,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: fontSizes.md,
    color: "#fff",
  },
  secondaryBtn: {
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.textMuted,
  },
});
