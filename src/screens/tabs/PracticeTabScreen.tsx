import React, { useEffect, useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { BottomTabNavigationProp, BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, Segment } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { BackButton } from "@/components/BackButton";
import { TabParamList } from "@/navigation/TabNavigator";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { practiceApi, LearnedSign, PracticeMistake } from "@/api/practice";
import { SignAnimation } from "@/features/courses/components/lesson/SignAnimation";
import { EXERCISE_TYPES, EXERCISE_TYPE_BY_KEY } from "@/features/practice/types";

/**
 * "Práctica libre" tab: repaso by exercise type, by learned sign, or by past
 * mistakes — wired to the real /practice/* endpoints (see
 * docs/features/practice.md). Playing a session happens in
 * PracticeSessionScreen (stack route), reached from here.
 */

type PracticeNavigation = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, "Practice">,
  NativeStackNavigationProp<AppStackParamList>
>;
type Props = BottomTabScreenProps<TabParamList, "Practice"> & { navigation: PracticeNavigation };

type PracticeTab = "ejercicios" | "señas" | "errores";

const TABS: ReadonlyArray<Segment<PracticeTab>> = [
  { key: "ejercicios", label: "Ejercicios" },
  { key: "señas", label: "Señas" },
  { key: "errores", label: "Errores" },
];

export function PracticeTabScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PracticeTab>("ejercicios");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  const [signsLearnedCount, setSignsLearnedCount] = useState(0);
  const [exercisesDoneCount, setExercisesDoneCount] = useState(0);

  useEffect(() => {
    practiceApi
      .getSummary()
      .then((res) => {
        setSignsLearnedCount(res.data.signsLearnedCount);
        setExercisesDoneCount(res.data.exercisesDoneCount);
      })
      .catch(() => {});
  }, []);

  if (detail) {
    return (
      <SignDetail
        meaning={detail}
        onBack={() => setDetail(null)}
        onOpen={setDetail}
        navigation={navigation}
      />
    );
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Práctica libre"
        description="Repasá lo que ya aprendiste, a tu ritmo y sin perder vidas."
        paddingTop={insets.top + 14}
        tone={colors.courseTeal}
        stats={[
          {
            key: "signs",
            label: "Señas aprendidas",
            value: String(signsLearnedCount),
            icon: "hand-left",
          },
          {
            key: "exercises",
            label: "Ejercicios hechos",
            value: String(exercisesDoneCount),
            icon: "barbell",
          },
        ]}
      />

      <SegmentedControl options={TABS} value={tab} onChange={setTab} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {tab === "ejercicios" && <ExercisesTab navigation={navigation} />}
        {tab === "señas" && (
          <SignsTab query={query} onQueryChange={setQuery} onOpenSign={setDetail} />
        )}
        {tab === "errores" && <MistakesTab navigation={navigation} />}
      </ScrollView>
    </View>
  );
}

// ── Ejercicios ────────────────────────────────────────────────────────────

function ExercisesTab({ navigation }: { navigation: PracticeNavigation }) {
  return (
    <View>
      <Text style={styles.sectionLabel}>ELEGÍ UN TIPO DE EJERCICIO</Text>
      <View style={styles.grid2}>
        {EXERCISE_TYPES.map((type) => (
          <TouchableOpacity
            key={type.key}
            style={styles.typeCard}
            activeOpacity={0.85}
            onPress={() =>
              navigation.navigate("PracticeSession", {
                mode: { mode: "type", blockType: type.key, title: type.title },
              })
            }
          >
            <View style={styles.typeIcon}>
              <Ionicons name={type.icon} size={19} color={colors.courseTeal} />
            </View>
            <View>
              <Text style={styles.typeTitle}>{type.title}</Text>
              <Text style={styles.typeHint}>{type.hint}</Text>
            </View>
            <View style={styles.typeChevronRow}>
              <Ionicons name="chevron-forward" size={14} color={colors.text} />
            </View>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ── Señas ─────────────────────────────────────────────────────────────────

function SignsTab({
  query,
  onQueryChange,
  onOpenSign,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onOpenSign: (meaning: string) => void;
}) {
  const [signs, setSigns] = useState<LearnedSign[] | null>(null);

  useEffect(() => {
    practiceApi
      .getLearnedSigns()
      .then((res) => setSigns(res.data))
      .catch(() => setSigns([]));
  }, []);

  if (signs === null) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.courseTeal} />
      </View>
    );
  }

  const meanings = signs.map((s) => s.sign);
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed ? meanings.filter((s) => s.toLowerCase().includes(trimmed)) : meanings;
  const noResults = trimmed.length > 0 && filtered.length === 0;

  if (meanings.length === 0) {
    return (
      <EmptyState
        title="Todavía no aprendiste señas"
        description="Completá alguna lección para verlas acá y practicarlas."
      />
    );
  }

  return (
    <View>
      <View style={styles.search}>
        <Ionicons name="search" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={onQueryChange}
          placeholder="Buscar entre tus señas aprendidas"
          placeholderTextColor={colors.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity
            style={styles.clear}
            onPress={() => onQueryChange("")}
            accessibilityRole="button"
            accessibilityLabel="Limpiar búsqueda"
          >
            <Ionicons name="close" size={14} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
        {trimmed
          ? filtered.length === 1
            ? "1 RESULTADO"
            : `${filtered.length} RESULTADOS`
          : `TODAS TUS SEÑAS · ${meanings.length}`}
      </Text>

      {noResults ? (
        <EmptyState
          title="Sin resultados"
          description="Probá con otra palabra: sólo aparecen las señas que ya aprendiste."
        />
      ) : (
        <View style={styles.grid3}>
          {filtered.map((meaning) => (
            <TouchableOpacity
              key={meaning}
              style={styles.signCard}
              activeOpacity={0.85}
              onPress={() => onOpenSign(meaning)}
            >
              <Text style={styles.signCardText} numberOfLines={1}>
                {meaning}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Errores ───────────────────────────────────────────────────────────────

function MistakesTab({ navigation }: { navigation: PracticeNavigation }) {
  const [mistakes, setMistakes] = useState<PracticeMistake[] | null>(null);

  useEffect(() => {
    practiceApi
      .getMistakes()
      .then((res) => setMistakes(res.data))
      .catch(() => setMistakes([]));
  }, []);

  if (mistakes === null) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator color={colors.courseTeal} />
      </View>
    );
  }

  if (mistakes.length === 0) {
    return (
      <EmptyState
        title="Sin errores pendientes"
        description="Repasaste todo lo que fallaste hasta ahora. ¡Seguí así!"
      />
    );
  }

  return (
    <View>
      <View style={styles.mistakesCard}>
        <Text style={styles.mistakesTitle}>Repaso de errores</Text>
        <Text style={styles.mistakesDescription}>
          Armamos una lección corta con las señas que falliste en tus últimas prácticas.
        </Text>
        <View style={styles.mistakesMetaRow}>
          <View style={styles.mistakesMeta}>
            <Ionicons name="layers-outline" size={14} color={colors.textMuted} />
            <Text style={styles.mistakesMetaText}>{mistakes.length} ejercicios</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() => navigation.navigate("PracticeSession", { mode: { mode: "mistakes" } })}
        >
          <Ionicons name="play" size={18} color={colors.onDark} />
          <Text style={styles.ctaText}>Empezar</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>
        EN ESTA LECCIÓN · {mistakes.length}
      </Text>

      <View style={styles.mistakesList}>
        {mistakes.map((item) => {
          const type = EXERCISE_TYPE_BY_KEY[item.type];
          return (
            <View key={item.lessonBlockId} style={styles.mistakeRow}>
              <View style={styles.typeIcon}>
                <Ionicons name={type.icon} size={17} color={colors.courseTeal} />
              </View>
              <View style={styles.mistakeRowContent}>
                <Text style={styles.mistakeSub}>{type.title}</Text>
              </View>
              <View style={styles.missesBadge}>
                <Ionicons name="close" size={12} color={colors.danger} />
                <Text style={styles.missesText}>{item.misses}</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ── Sign detail ───────────────────────────────────────────────────────────

function SignDetail({
  meaning,
  onBack,
  onOpen,
  navigation,
}: {
  meaning: string;
  onBack: () => void;
  onOpen: (meaning: string) => void;
  navigation: PracticeNavigation;
}) {
  const insets = useSafeAreaInsets();
  const [related, setRelated] = useState<string[]>([]);

  useEffect(() => {
    practiceApi
      .getLearnedSigns()
      .then((res) => setRelated(res.data.map((s) => s.sign).filter((s) => s !== meaning).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [meaning]);

  return (
    <View style={styles.container}>
      <View style={[styles.detailHeader, { paddingTop: insets.top + 14 }]}>
        <BackButton onPress={onBack} color={colors.onDark} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.detailScrollContent}
        showsVerticalScrollIndicator={false}
      >
        <SignAnimation meaning={meaning} label={meaning} height={320} />

        <Text style={styles.detailTitle}>{meaning}</Text>

        <TouchableOpacity
          style={styles.ctaButton}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate("PracticeSession", { mode: { mode: "sign", meaning } })
          }
        >
          <Ionicons name="barbell" size={18} color={colors.onDark} />
          <Text style={styles.ctaText}>Practicar</Text>
        </TouchableOpacity>

        {related.length > 0 && (
          <>
            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>SEÑAS RELACIONADAS</Text>
            <View style={styles.grid3}>
              {related.map((sign) => (
                <TouchableOpacity
                  key={sign}
                  style={styles.relatedCard}
                  activeOpacity={0.85}
                  onPress={() => onOpen(sign)}
                >
                  <Text style={styles.relatedCardText} numberOfLines={1}>
                    {sign}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },
  loadingBox: { paddingVertical: 40, alignItems: "center" },

  sectionLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 10,
    letterSpacing: 1,
    color: colors.textMuted,
    paddingHorizontal: 2,
    paddingBottom: 6,
  },
  sectionLabelSpaced: { paddingTop: 8 },

  // Ejercicios grid
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  typeCard: {
    width: "48%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 14,
    gap: 9,
  },
  typeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    backgroundColor: colors.courseTealLight,
    alignItems: "center",
    justifyContent: "center",
  },
  typeTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 14.5,
    lineHeight: 19,
    color: colors.text,
  },
  typeHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 11.5,
    lineHeight: 16,
    color: colors.textMuted,
    marginTop: 3,
  },
  typeChevronRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginTop: 2,
  },

  // Señas search + grid
  search: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    height: 46,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: fonts.bodyMedium,
    fontSize: 13.5,
    color: colors.text,
    padding: 0,
  },
  clear: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  grid3: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  signCard: {
    width: "31%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  signCardText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.text,
  },

  // Errores
  mistakesCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 18,
    padding: 16,
  },
  mistakesTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 17,
    color: colors.text,
  },
  mistakesDescription: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    lineHeight: 19,
    color: colors.textMuted,
    marginTop: 4,
  },
  mistakesMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    marginTop: 14,
  },
  mistakesMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  mistakesMetaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    color: colors.textMuted,
  },
  mistakesList: { gap: 8 },
  mistakeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 11,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 13,
  },
  mistakeRowContent: { flex: 1, minWidth: 0 },
  mistakeSub: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  missesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
    backgroundColor: colors.dangerLight,
  },
  missesText: {
    fontFamily: fonts.displayBold,
    fontSize: 12,
    color: colors.danger,
  },

  // Shared CTA
  ctaButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
  },
  ctaText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },

  // Sign detail
  detailHeader: {
    backgroundColor: colors.courseTeal,
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  detailScrollContent: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  detailTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 30,
    lineHeight: 36,
    letterSpacing: -0.8,
    color: colors.text,
    textAlign: "center",
    marginTop: 16,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginTop: 24,
  },
  relatedCard: {
    width: "31%",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  relatedCardText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 12.5,
    color: colors.textMuted,
  },
});
