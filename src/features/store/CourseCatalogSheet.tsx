import React, { useCallback, useEffect, useState } from "react";
import { View, Modal, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts, fontSizes, alpha } from "@/theme";
import { coursesApi, CourseSummary } from "@/features/courses/api";
import { useCoursePurchase } from "@/features/store/useCoursePurchase";
import { PaidCourseRow } from "@/features/store/PaidCourseRow";

/** Catalog of the user's sign language (LSA). Never throws. */
async function fetchCatalog(): Promise<CourseSummary[]> {
  try {
    const { data: languages } = await coursesApi.getSignLanguages();
    const lsa = languages.find((l) => l.code === "LSA") ?? languages[0];
    if (!lsa) return [];
    const { data: catalog } = await coursesApi.getCatalog(lsa.id);
    return catalog.content;
  } catch {
    return [];
  }
}

/**
 * Bottom sheet listing every course of the catalog: the ones the user already has and the paid
 * ones they can buy with Mercado Pago. Opened from the profile's "Ver más cursos".
 */
export function CourseCatalogSheet({
  visible,
  onClose,
  onPurchased,
}: {
  visible: boolean;
  onClose: () => void;
  /** Called after a successful purchase so the caller can refresh its course list. */
  onPurchased: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [catalog, setCatalog] = useState<CourseSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setCatalog(await fetchCatalog());
    setLoading(false);
  }, []);

  useEffect(() => {
    if (visible) reload();
  }, [visible, reload]);

  const purchase = useCoursePurchase({
    onPurchased: async () => {
      await reload();
      onPurchased();
    },
  });
  const busy = purchase.status === "buying" || purchase.status === "checking";

  const owned = catalog.filter((c) => c.owned);
  const purchasable = catalog.filter((c) => !c.owned && !c.isFree);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 20 }]} onPress={() => {}}>
          <View style={styles.handle} />
          <Text style={styles.title}>Cursos disponibles</Text>
          <Text style={styles.subtitle}>
            Desbloqueá cursos con un pago único y accedé para siempre.
          </Text>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={styles.loader} />
          ) : (
            <>
              {owned.map((course) => (
                <View key={course.id} style={styles.ownedRow}>
                  <View style={styles.ownedIcon}>
                    <Ionicons name="school" size={20} color={colors.onDark} />
                  </View>
                  <Text style={styles.ownedName} numberOfLines={1}>
                    {course.name}
                  </Text>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </View>
              ))}

              {purchasable.length > 0 && <Text style={styles.sectionLabel}>Para comprar</Text>}
              {purchasable.map((course) => (
                <PaidCourseRow
                  key={course.id}
                  course={course}
                  buying={purchase.buyingCourseId === course.id}
                  disabled={busy}
                  onBuy={purchase.buy}
                />
              ))}

              {purchasable.length === 0 && owned.length > 0 && (
                <Text style={styles.subtitle}>Ya tenés todos los cursos disponibles.</Text>
              )}
              {!!purchase.error && <Text style={styles.error}>{purchase.error}</Text>}
              {purchase.status === "pending" && (
                <Text style={styles.subtitle}>
                  Tu pago se está confirmando. El curso va a aparecer en unos minutos.
                </Text>
              )}
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
    backgroundColor: alpha(colors.text, 0.45),
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 10,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.roadmapLockedBorder,
    marginBottom: 10,
  },
  title: {
    fontFamily: fonts.displayExtraBold,
    fontSize: fontSizes.lg,
    color: colors.text,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },
  loader: { marginVertical: 24 },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 2,
  },
  ownedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.primaryLight,
    borderRadius: 18,
    padding: 12,
  },
  ownedIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
  },
  ownedName: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.displayExtraBold,
    fontSize: 16,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
    marginTop: 4,
  },
});
