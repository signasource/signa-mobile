import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { ScreenHeader } from "@/components/ScreenHeader";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts, alpha } from "@/theme";
import { learningApi } from "@/api/learning";
import { coursesApi, CourseDetail } from "@/features/courses/api";
import { formatPrice } from "@/features/courses/price";
import { describeExercises } from "@/features/courses/exerciseLabels";
import { SignAnimation } from "@/features/courses/components/lesson/SignAnimation";
import { useCoursePurchase } from "@/features/store/useCoursePurchase";
import ManoConCaja from "@assets/ilus/mano-con-caja.svg";
import PajarosGrupoPequeno from "@assets/ilus/pajaros-grupo-pequeno.svg";

type Props = NativeStackScreenProps<AppStackParamList, "CourseDetail">;

/**
 * Sheet of a paid course (everything it brings, computed from its real content) and the whole
 * purchase flow: summary before paying → Mercado Pago → confirming → approved / pending.
 */
export function CourseDetailScreen({ navigation, route }: Props) {
  const { courseId } = route.params;
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [starting, setStarting] = useState(false);
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const purchase = useCoursePurchase({ onPurchased: () => setPurchased(true) });

  const load = useCallback(async () => {
    setLoadError(null);
    setLoading(true);
    try {
      const { data } = await coursesApi.getDetail(courseId);
      setCourse(data);
      // Free courses always show the detail view; "purchased" only applies to paid courses.
      if (data.owned && !data.isFree) setPurchased(true);
    } catch (err: any) {
      setLoadError(err?.response?.data?.message ?? "No pudimos cargar el curso.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    load();
  }, [load]);

  // The summary closes once the checkout is under way; failures reopen it with the message.
  useEffect(() => {
    if (purchase.status === "error") setSummaryOpen(true);
  }, [purchase.status]);

  async function startCourse() {
    setStarting(true);
    try {
      await learningApi.setCurrentCourse(courseId);
    } catch {
      // Not fatal: the course is owned and can be picked from the home selector.
    } finally {
      setStarting(false);
    }
    navigation.navigate("Tabs", { screen: "Home" });
  }

  async function joinFreeCourse() {
    setJoinError(null);
    setJoining(true);
    try {
      await learningApi.joinCourse(courseId);
      setPurchased(true);
    } catch (err: any) {
      setJoinError(err?.response?.data?.message ?? "No pudimos inscribirte. Intentá de nuevo.");
    } finally {
      setJoining(false);
    }
  }

  function confirmPurchase() {
    setSummaryOpen(false);
    purchase.buy({ id: courseId });
  }

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color={colors.courseIndigo} size="large" />
      </View>
    );
  }

  if (loadError || !course) {
    return (
      <View style={[styles.root, styles.center, { paddingHorizontal: 28 }]}>
        <Text style={styles.stateTitle}>No pudimos cargar el curso</Text>
        <Text style={styles.stateBody}>{loadError}</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={load} activeOpacity={0.86}>
          <Text style={styles.primaryBtnText}>Reintentar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.secondaryBtn} onPress={navigation.goBack} activeOpacity={0.86}>
          <Text style={styles.secondaryBtnText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const price = formatPrice(course.price);

  // ── Approved ──
  if (purchased) {
    return (
      <View style={[styles.root, styles.successRoot]}>
        <View style={styles.bubbleTop} />
        <View style={[styles.closeRow, { paddingTop: insets.top + 6 }]}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={navigation.goBack}
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={22} color={colors.onColor} />
          </TouchableOpacity>
        </View>
        <View style={styles.stateBodyWrap}>
          <ManoConCaja width={200} height={200} />
          <Text style={[styles.successTitle]}>¡El curso{"\n"}ya es tuyo!</Text>
          <Text style={styles.successBody}>
            {course.name} se sumó a tus cursos. Lo encontrás en el chip de arriba del Inicio.
          </Text>
          <View style={styles.pillRow}>
            {course.signCount > 0 && (
              <View style={styles.glassPill}>
                <Ionicons name="hand-left" size={14} color={colors.onColor} />
                <Text style={styles.glassPillText}>{course.signCount} señas nuevas</Text>
              </View>
            )}
            <View style={styles.glassPill}>
              <Ionicons name="book" size={14} color={colors.onColor} />
              <Text style={styles.glassPillText}>
                {course.lessonCount} {course.lessonCount === 1 ? "lección" : "lecciones"}
              </Text>
            </View>
          </View>
        </View>
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          <TouchableOpacity
            style={styles.lightBtn}
            onPress={startCourse}
            disabled={starting}
            activeOpacity={0.86}
          >
            {starting ? (
              <ActivityIndicator color={colors.text} />
            ) : (
              <>
                <Ionicons name="play" size={18} color={colors.text} />
                <Text style={styles.lightBtnText}>Empezar el curso</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.glassBtn}
            onPress={() => navigation.navigate("Tabs", { screen: "Home" })}
            activeOpacity={0.86}
          >
            <Text style={styles.glassBtnText}>Seguir con mi curso actual</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Confirming ──
  if (purchase.status === "checking") {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.stateBodyWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={styles.stateTitleBig}>Confirmando{"\n"}tu pago</Text>
          <Text style={styles.stateBody}>
            Mercado Pago puede tardar unos segundos. No hace falta que hagas nada.
          </Text>
          <CourseMiniCard name={course.name} caption={`${price} · pago único`} />
        </View>
        <Text style={[styles.footnote, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          Si cerraste Mercado Pago sin pagar, no se cobró nada.
        </Text>
      </View>
    );
  }

  // ── Pending ──
  if (purchase.status === "pending") {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <View style={styles.closeRow}>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={navigation.goBack}
            accessibilityLabel="Cerrar"
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.stateBodyWrap}>
          <PajarosGrupoPequeno width={190} height={170} />
          <Text style={styles.stateTitleBig}>Tu pago está{"\n"}en camino</Text>
          <Text style={styles.stateBody}>
            Si pagaste en efectivo o por transferencia, Mercado Pago puede tardar en acreditarlo. El
            curso aparece solo cuando se acredite.
          </Text>
          <CourseMiniCard name={course.name} caption={price} pending />
        </View>
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 28) }]}>
          <TouchableOpacity style={styles.primaryBtn} onPress={navigation.goBack} activeOpacity={0.86}>
            <Text style={styles.primaryBtnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Course sheet ──
  const exercises = describeExercises(course.exerciseTypes);
  // Free courses always show the detail; owned=true means the user already enrolled.
  const isFree = course.isFree;
  const isFreeOwned = isFree && course.owned;
  const isFreeUnenrolled = isFree && !course.owned;

  return (
    <View style={styles.root}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title={course.name}
          description={course.description}
          paddingTop={insets.top + 14}
          tone={colors.courseIndigo}
          left={<BackButton onPress={navigation.goBack} color={colors.onColor} />}
          stats={[
            { key: "units", label: "Unidades", value: String(course.unitCount), icon: "layers" },
            { key: "lessons", label: "Lecciones", value: String(course.lessonCount), icon: "book" },
            { key: "signs", label: "Señas", value: String(course.signCount), icon: "hand-left" },
          ]}
        />

        <View style={styles.body}>
          {!!course.sampleSign && (
            <View style={styles.card}>
              <SignAnimation
                meaning={course.sampleSign}
                label={course.sampleSign}
                height={200}
                cameraControls
              />
              <View style={styles.sampleText}>
                <Text style={styles.kicker}>PROBÁ UNA SEÑA DEL CURSO</Text>
                <Text style={styles.sampleName}>{capitalize(course.sampleSign)}</Text>
                <Text style={styles.sampleHint}>
                  Así se ven las señas del curso: girá el modelo con el dedo.
                </Text>
              </View>
            </View>
          )}

          <Text style={styles.sectionTitle}>Qué trae el curso</Text>
          <View style={[styles.card, styles.featureCard]}>
            <FeatureRow
              icon="hand-left"
              title="Señas"
              detail={`${course.signCount} señas distintas en ${course.lessonCount} ${course.lessonCount === 1 ? "lección" : "lecciones"}`}
            />
            {course.exerciseTypes.length > 0 && (
              <FeatureRow
                icon="extension-puzzle"
                title="Ejercicios"
                detail={exercises}
                trailing={
                  <Text style={styles.featureValue}>
                    {course.exerciseTypes.length}{" "}
                    {course.exerciseTypes.length === 1 ? "tipo" : "tipos"}
                  </Text>
                }
              />
            )}
            <FeatureRow
              icon="camera"
              title="Práctica con cámara"
              detail={
                course.hasCameraPractice
                  ? "Hacés la seña frente a la cámara y la app la reconoce"
                  : "Este curso no tiene ejercicios de reconocimiento"
              }
              included={course.hasCameraPractice}
              last
            />
          </View>

          <Text style={styles.sectionTitle}>Temario</Text>
          <View>
            {course.topics.map((topic) => (
              <View key={topic.id}>
                <View style={styles.unitRow}>
                  <View style={styles.unitIcon}>
                    <Ionicons name="school" size={22} color={colors.onPrimary} />
                  </View>
                  <View style={styles.flex}>
                    <View style={styles.unitMeta}>
                      <Text style={styles.unitKicker}>UNIDAD {topic.order}</Text>
                      <Text style={styles.unitCount}>
                        {topic.lessons.length} {topic.lessons.length === 1 ? "lección" : "lecciones"}
                      </Text>
                    </View>
                    <Text style={styles.unitTitle}>{topic.subtitle || topic.title}</Text>
                  </View>
                </View>
                {topic.lessons.map((lesson, i) => (
                  <View key={`${topic.id}-${i}`} style={styles.lessonRow}>
                    <View
                      style={[
                        styles.railLine,
                        i === topic.lessons.length - 1 && styles.railLineLast,
                      ]}
                    />
                    <View style={styles.dotWrap}>
                      <View style={styles.dot} />
                    </View>
                    <View style={styles.flex}>
                      <Text style={styles.lessonName}>{lesson.name}</Text>
                      {lesson.signs.length > 0 && (
                        <Text style={styles.lessonSigns}>{lesson.signs.join(" · ")}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {isFreeUnenrolled ? (
            <View style={styles.assurance}>
              <AssuranceRow
                icon="gift"
                title="Completamente gratis."
                text="Sin costo ni suscripción. Es tuyo para siempre."
              />
              <AssuranceRow
                icon="infinite"
                title="Tu progreso se guarda."
                text="Podés pausar y retomar cuando quieras."
              />
            </View>
          ) : (
            <View style={styles.assurance}>
              <AssuranceRow icon="card" title="Pago único." text="Sin suscripción ni cobros automáticos." />
              <AssuranceRow
                icon="infinite"
                title="Es tuyo para siempre."
                text="Tu progreso en otros cursos no se toca."
              />
              <AssuranceRow
                icon="shield-checkmark"
                title="Pagás en Mercado Pago."
                text="Signa no ve ni guarda tus datos de pago."
              />
            </View>
          )}

          {isFree && (
            <View style={styles.freeCtaBlock}>
              {!!joinError && <Text style={styles.joinError}>{joinError}</Text>}
              {isFreeOwned ? (
                <TouchableOpacity
                  style={styles.freeCtaBtn}
                  onPress={startCourse}
                  disabled={starting}
                  activeOpacity={0.86}
                >
                  {starting ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <>
                      <Ionicons name="play" size={18} color={colors.onDark} />
                      <Text style={styles.freeCtaBtnText}>Ir al curso</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.freeCtaBtn}
                  onPress={joinFreeCourse}
                  disabled={joining}
                  activeOpacity={0.86}
                >
                  {joining ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <>
                      <Text style={styles.freeCtaBtnText}>Empezar gratis</Text>
                      <Ionicons name="arrow-forward" size={18} color={colors.onDark} />
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
        <View style={{ height: isFree ? 40 + insets.bottom : 120 + insets.bottom }} />
      </ScrollView>

      {!isFree && (
        <View style={[styles.priceBar, { paddingBottom: Math.max(insets.bottom, 18) + 12 }]}>
          <View style={styles.flex}>
            <Text style={styles.price}>{price}</Text>
            <Text style={styles.priceCaption}>Pago único · ARS</Text>
          </View>
          <TouchableOpacity
            style={styles.payBtn}
            onPress={() => {
              purchase.reset();
              setSummaryOpen(true);
            }}
            activeOpacity={0.86}
          >
            <Text style={styles.payBtnText}>Ir al pago</Text>
            <Ionicons name="arrow-forward" size={17} color={colors.onDark} />
          </TouchableOpacity>
        </View>
      )}

      {/* ── Summary before the gateway ── */}
      <Modal
        visible={summaryOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSummaryOpen(false)}
        statusBarTranslucent
      >
        <Pressable style={styles.backdrop} onPress={() => setSummaryOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 20) + 14 }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>Antes de pagar</Text>
            <Text style={styles.sheetSubtitle}>Revisá que sea el curso que querés.</Text>

            <View style={styles.receipt}>
              <View style={styles.receiptHead}>
                <View style={styles.receiptIcon}>
                  <Ionicons name="school" size={21} color={colors.onDark} />
                </View>
                <View style={styles.flex}>
                  <Text style={styles.receiptName}>{course.name}</Text>
                  <Text style={styles.receiptSub}>Acceso para siempre</Text>
                </View>
              </View>
              <View style={styles.dashed} />
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>
                  {price} <Text style={styles.totalCurrency}>ARS</Text>
                </Text>
              </View>
            </View>

            <Text style={styles.sectionLabel}>CÓMO SIGUE</Text>
            <View style={styles.steps}>
              <Step n={1} text="Abrimos Mercado Pago dentro de la app." />
              <Step n={2} text="Elegís cómo pagar en Mercado Pago." />
              <Step n={3} text="Volvés a Signa y el curso se desbloquea solo." />
            </View>

            <View style={styles.reassure}>
              <Ionicons name="lock-closed" size={14} color={colors.successDark} />
              <Text style={styles.reassureText}>
                No se cobra nada hasta que confirmes en Mercado Pago.
              </Text>
            </View>

            {!!purchase.error && <Text style={styles.error}>{purchase.error}</Text>}

            <TouchableOpacity
              style={[styles.primaryBtn, styles.sheetBtn]}
              onPress={confirmPurchase}
              activeOpacity={0.86}
            >
              <Text style={styles.primaryBtnText}>Continuar a Mercado Pago</Text>
              <Ionicons name="open-outline" size={18} color={colors.onDark} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => setSummaryOpen(false)}
              activeOpacity={0.86}
            >
              <Text style={styles.secondaryBtnText}>Ahora no</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function CourseMiniCard({
  name,
  caption,
  pending,
}: {
  name: string;
  caption: string;
  pending?: boolean;
}) {
  return (
    <View style={styles.miniCard}>
      <View style={styles.miniIcon}>
        <Ionicons name="school" size={21} color={colors.onDark} />
      </View>
      <View style={styles.flex}>
        <Text style={styles.miniName}>{name}</Text>
        <Text style={styles.miniCaption}>{caption}</Text>
      </View>
      {pending && (
        <View style={styles.pendingPill}>
          <Ionicons name="time" size={13} color={colors.shopAmberDark} />
          <Text style={styles.pendingPillText}>Pendiente</Text>
        </View>
      )}
    </View>
  );
}

function FeatureRow({
  icon,
  title,
  detail,
  included,
  trailing,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  /** `undefined` = no yes/no badge (a `trailing` node is shown instead). */
  included?: boolean;
  trailing?: React.ReactNode;
  last?: boolean;
}) {
  const off = included === false;
  return (
    <View style={[styles.featureRow, !last && styles.featureRowBorder]}>
      <View style={[styles.featureIcon, off && styles.featureIconOff]}>
        <Ionicons
          name={icon}
          size={19}
          color={off ? colors.roadmapLockedIcon : colors.courseIndigo}
        />
      </View>
      <View style={styles.flex}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDetail}>{detail}</Text>
      </View>
      {trailing}
      {included !== undefined && (
        <View style={[styles.badge, off ? styles.badgeOff : styles.badgeOn]}>
          <Ionicons
            name={off ? "close" : "checkmark"}
            size={13}
            color={off ? colors.textMuted : colors.successDark}
          />
          <Text style={[styles.badgeText, { color: off ? colors.textMuted : colors.successDark }]}>
            {off ? "No" : "Incluye"}
          </Text>
        </View>
      )}
    </View>
  );
}

function AssuranceRow({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}) {
  return (
    <View style={styles.assuranceRow}>
      <Ionicons name={icon} size={17} color={colors.text} style={styles.assuranceIcon} />
      <Text style={styles.assuranceText}>
        <Text style={styles.assuranceBold}>{title} </Text>
        {text}
      </Text>
    </View>
  );
}

function Step({ n, text }: { n: number; text: string }) {
  return (
    <View style={styles.step}>
      <View style={styles.stepNum}>
        <Text style={styles.stepNumText}>{n}</Text>
      </View>
      <Text style={styles.stepText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: "center", justifyContent: "center", gap: 12 },
  flex: { flex: 1, minWidth: 0 },

  // Generic states
  stateBodyWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    gap: 14,
  },
  stateTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  stateTitleBig: {
    fontFamily: fonts.displayBold,
    fontSize: 28,
    lineHeight: 32,
    letterSpacing: -0.9,
    color: colors.text,
    textAlign: "center",
    marginTop: 10,
  },
  stateBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.textMuted,
    textAlign: "center",
  },
  footnote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 18,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: 28,
  },
  closeRow: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 20 },
  closeBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  actions: { paddingHorizontal: 20, paddingTop: 20, gap: 10 },

  // Approved
  successRoot: { backgroundColor: colors.courseIndigo },
  bubbleTop: {
    position: "absolute",
    top: -90,
    right: -50,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: alpha(colors.onColor, 0.09),
  },
  successTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    lineHeight: 36,
    letterSpacing: -1.1,
    color: colors.onColor,
    textAlign: "center",
  },
  successBody: {
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onColor,
    opacity: 0.92,
    textAlign: "center",
  },
  pillRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  glassPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: alpha(colors.onColor, 0.16),
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  glassPillText: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.onColor },
  lightBtn: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.onDark,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  lightBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.text },
  glassBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: alpha(colors.onColor, 0.16),
    alignItems: "center",
    justifyContent: "center",
  },
  glassBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onColor },

  // Buttons
  primaryBtn: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
  },
  primaryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  secondaryBtn: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
  },
  secondaryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.neutral900 },

  // Mini card (confirming / pending)
  miniCard: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 12,
    marginTop: 8,
  },
  miniIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.courseIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  miniName: { fontFamily: fonts.displayExtraBold, fontSize: 15, color: colors.text },
  miniCaption: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  pendingPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.shopAmberLight,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  pendingPillText: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.shopAmberDark },

  // Sheet body
  body: { paddingHorizontal: 20, paddingTop: 24, gap: 14 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 12,
    shadowColor: colors.text,
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sampleText: { paddingTop: 14, paddingHorizontal: 6, paddingBottom: 6 },
  kicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.courseIndigo,
  },
  sampleName: { fontFamily: fonts.displayExtraBold, fontSize: 19, color: colors.text, marginTop: 4 },
  sampleHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 4,
  },
  sectionTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 17,
    color: colors.text,
    marginTop: 14,
  },
  featureCard: { paddingVertical: 4, paddingHorizontal: 16 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 14 },
  featureRowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  featureIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.courseIndigoLight,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconOff: { backgroundColor: colors.fill },
  featureTitle: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  featureDetail: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 2,
  },
  featureValue: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.text },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  badgeOn: { backgroundColor: colors.successLight },
  badgeOff: { backgroundColor: colors.fill },
  badgeText: { fontFamily: fonts.displayExtraBold, fontSize: 12 },

  // Syllabus
  unitRow: { flexDirection: "row", alignItems: "center", gap: 16, paddingBottom: 18 },
  unitIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.courseIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  unitMeta: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  unitKicker: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.textMuted,
  },
  unitCount: { fontFamily: fonts.displayExtraBold, fontSize: 11, color: colors.textMuted },
  unitTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.text,
    marginTop: 3,
  },
  lessonRow: { flexDirection: "row", alignItems: "flex-start", gap: 16, paddingBottom: 16 },
  railLine: {
    position: "absolute",
    left: 21,
    top: -18,
    bottom: 0,
    width: 2,
    backgroundColor: colors.roadmapLockedBorder,
  },
  railLineLast: { bottom: undefined, height: 28 },
  dotWrap: { width: 44, alignItems: "center", paddingTop: 1 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.roadmapLockedBorder,
  },
  lessonName: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.text },
  lessonSigns: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
    marginTop: 3,
  },

  assurance: { backgroundColor: colors.fill, borderRadius: 18, padding: 16, gap: 12, marginTop: 6 },
  assuranceRow: { flexDirection: "row", gap: 10, alignItems: "flex-start" },
  assuranceIcon: { marginTop: 1 },
  assuranceText: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.textBody,
  },
  assuranceBold: { fontFamily: fonts.bodySemiBold, color: colors.text },

  // Fixed price bar
  priceBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  price: { fontFamily: fonts.displayExtraBold, fontSize: 24, lineHeight: 26, color: colors.text },
  priceCaption: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted, marginTop: 2 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  payBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onDark },

  // Free-course CTA (inside scroll)
  freeCtaBlock: { gap: 10, marginTop: 8 },
  freeCtaBtn: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  freeCtaBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 16.5, color: colors.onDark },
  joinError: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },

  // Summary sheet
  backdrop: { flex: 1, backgroundColor: alpha(colors.text, 0.45), justifyContent: "flex-end" },
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
  sheetTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 20,
    color: colors.text,
    textAlign: "center",
  },
  sheetSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },
  receipt: { backgroundColor: colors.fill, borderRadius: 18, padding: 14 },
  receiptHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  receiptIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.courseIndigo,
    alignItems: "center",
    justifyContent: "center",
  },
  receiptName: { fontFamily: fonts.displayExtraBold, fontSize: 16, color: colors.text },
  receiptSub: { fontFamily: fonts.bodyRegular, fontSize: 12.5, color: colors.textMuted, marginTop: 2 },
  dashed: {
    borderTopWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.roadmapLockedBorder,
    marginTop: 14,
    marginBottom: 12,
  },
  totalRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  totalLabel: { fontFamily: fonts.bodySemiBold, fontSize: 14, color: colors.text },
  totalValue: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.text },
  totalCurrency: { fontFamily: fonts.bodyMedium, fontSize: 12, color: colors.textMuted },
  sectionLabel: {
    fontFamily: fonts.bodyBold,
    fontSize: 10,
    letterSpacing: 1.1,
    color: colors.textMuted,
    marginTop: 8,
  },
  steps: { gap: 12, marginBottom: 6 },
  step: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumText: { fontFamily: fonts.displayExtraBold, fontSize: 12, color: colors.primaryDark },
  stepText: {
    flex: 1,
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    lineHeight: 20,
    color: colors.textBody,
  },
  reassure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.successLight,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  reassureText: {
    flex: 1,
    fontFamily: fonts.bodySemiBold,
    fontSize: 12.5,
    color: colors.successDark,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.danger,
    textAlign: "center",
  },
  sheetBtn: { marginTop: 6 },
});
