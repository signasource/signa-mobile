import React, { useState } from "react";
import { View, ScrollView, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { ScreenHeader } from "@/components/ScreenHeader";
import { SegmentedControl, Segment } from "@/components/SegmentedControl";
import { EmptyState } from "@/components/EmptyState";
import { BackButton } from "@/components/BackButton";
import {
  EXERCISE_TYPES,
  EXERCISE_TYPE_BY_KEY,
  PRACTICE_MISTAKES,
  PRACTICE_SIGNS,
} from "@/features/practice/types";

/**
 * "Práctica libre" tab: repaso by exercise type, by learned sign, or by past
 * mistakes. `signa-api` has no endpoint yet for a standalone practice
 * session, a per-user learned-signs list, or a mistakes queue (see
 * docs/features/practice.md), so this screen — like `CoursesListScreen` —
 * runs entirely on local placeholder content; every CTA is a no-op until
 * that content is real.
 */

type PracticeTab = "ejercicios" | "señas" | "errores";

const TABS: ReadonlyArray<Segment<PracticeTab>> = [
  { key: "ejercicios", label: "Ejercicios" },
  { key: "señas", label: "Señas" },
  { key: "errores", label: "Errores" },
];

/** No session-tracking endpoint yet — see docs/features/practice.md. */
const PLACEHOLDER_EXERCISES_DONE = 0;

export function PracticeTabScreen() {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<PracticeTab>("ejercicios");
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<string | null>(null);

  if (detail) {
    return <SignDetail meaning={detail} onBack={() => setDetail(null)} onOpen={setDetail} />;
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
            value: String(PRACTICE_SIGNS.length),
            icon: "hand-left",
          },
          {
            key: "exercises",
            label: "Ejercicios hechos",
            value: String(PLACEHOLDER_EXERCISES_DONE),
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
        {tab === "ejercicios" && <ExercisesTab />}
        {tab === "señas" && (
          <SignsTab query={query} onQueryChange={setQuery} onOpenSign={setDetail} />
        )}
        {tab === "errores" && <MistakesTab />}
      </ScrollView>
    </View>
  );
}

// ── Ejercicios ────────────────────────────────────────────────────────────

function ExercisesTab() {
  return (
    <View>
      <Text style={styles.sectionLabel}>ELEGÍ UN TIPO DE EJERCICIO</Text>
      <View style={styles.grid2}>
        {EXERCISE_TYPES.map((type) => (
          // No standalone-practice endpoint yet (see docs/features/practice.md) —
          // the card is not tappable until there's a real session to start.
          <View key={type.key} style={styles.typeCard}>
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
          </View>
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
  const trimmed = query.trim().toLowerCase();
  const filtered = trimmed
    ? PRACTICE_SIGNS.filter((s) => s.toLowerCase().includes(trimmed))
    : PRACTICE_SIGNS;
  const noResults = trimmed.length > 0 && filtered.length === 0;

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
          : `TODAS TUS SEÑAS · ${PRACTICE_SIGNS.length}`}
      </Text>

      {noResults ? (
        <EmptyState
          icon="search"
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

function MistakesTab() {
  const mistakes = PRACTICE_MISTAKES;

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
          <View style={styles.mistakesMetaDot} />
          <View style={styles.mistakesMeta}>
            <Ionicons name="flash" size={14} color={colors.warning} />
            <Text style={styles.mistakesMetaText}>+50 XP</Text>
          </View>
        </View>
        {/* No mistakes-review session to start yet — see docs/features/practice.md. */}
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
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
            <View key={item.meaning} style={styles.mistakeRow}>
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
}: {
  meaning: string;
  onBack: () => void;
  onOpen: (meaning: string) => void;
}) {
  const insets = useSafeAreaInsets();
  const related = PRACTICE_SIGNS.filter((s) => s !== meaning).slice(0, 4);

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
        <View style={styles.animationBox}>
          <View style={styles.animationTag}>
            <Text style={styles.animationTagText}>Animación LSA</Text>
          </View>
          <View style={styles.animationPlay}>
            <Ionicons name="play" size={24} color={colors.text} style={styles.animationPlayIcon} />
          </View>
          <View style={styles.animationCaption}>
            <Text style={styles.animationCaptionText}>{meaning}</Text>
          </View>
        </View>

        <Text style={styles.detailTitle}>{meaning}</Text>

        {/* No standalone-practice session to start yet — see docs/features/practice.md. */}
        <TouchableOpacity style={styles.ctaButton} activeOpacity={0.85}>
          <Ionicons name="barbell" size={18} color={colors.onDark} />
          <Text style={styles.ctaText}>Practicar</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <Text style={[styles.sectionLabel, styles.sectionLabelSpaced]}>SEÑAS RELACIONADAS</Text>
        <Text style={styles.relatedLesson}>De la misma lección: Saludos y presentaciones</Text>
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 6, paddingBottom: 24 },

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
  mistakesMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.border,
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
  animationBox: {
    height: 320,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  animationTag: {
    position: "absolute",
    top: 14,
    left: 14,
    backgroundColor: "rgba(255,255,255,0.94)",
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  animationTagText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  animationPlay: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
  },
  animationPlayIcon: { marginLeft: 3 },
  animationCaption: {
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: 7,
    paddingVertical: 4,
    paddingHorizontal: 9,
  },
  animationCaptionText: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
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
  relatedLesson: {
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
    paddingHorizontal: 2,
    paddingBottom: 10,
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
