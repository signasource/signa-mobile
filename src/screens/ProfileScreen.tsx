import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, fonts, fontSizes } from "@/theme";
import { usersApi } from "@/api/users";
import { headerColorCache } from "@/utils/headerColorCache";
import { isValidUsername } from "@/utils/validation";
import { useAuth } from "@/context/AuthContext";
import { AppStackParamList } from "@/navigation/AppNavigator";

type Props = NativeStackScreenProps<AppStackParamList, "Profile">;

/**
 * Pantalla de Perfil (diseño de Claude Design "Perfil.dc.html").
 * Se implementan SOLO el header y el footer del diseño; el contenido de cada
 * sección/pestaña queda como placeholder ("Próximamente").
 *
 * Datos reales: GET /users/me (name + username). La racha y el puesto son
 * placeholders estáticos porque signa-api todavía no expone gamificación.
 * El color del encabezado es una preferencia local (headerColorCache).
 */

// Secciones del header (barra de íconos debajo del avatar).
const SECTIONS = [
  { key: "general", label: "General", icon: "stats-chart-outline", iconActive: "stats-chart" },
  { key: "cursos", label: "Cursos", icon: "school-outline", iconActive: "school" },
  { key: "inventario", label: "Inventario", icon: "cube-outline", iconActive: "cube" },
  { key: "logros", label: "Logros", icon: "trophy-outline", iconActive: "trophy" },
] as const;

type SectionKey = (typeof SECTIONS)[number]["key"];

// Tabs del footer. `route` mapea a una pantalla existente de AppNavigator
// cuando la hay; las que aún no existen quedan sin navegación.
const TABS: Array<{
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive: keyof typeof Ionicons.glyphMap;
  route?: keyof AppStackParamList;
}> = [
  { key: "inicio", label: "Inicio", icon: "home-outline", iconActive: "home", route: "Home" },
  { key: "practica", label: "Práctica", icon: "hand-left-outline", iconActive: "hand-left", route: "SignRecognition" },
  { key: "tienda", label: "Tienda", icon: "storefront-outline", iconActive: "storefront" },
  { key: "social", label: "Social", icon: "people-outline", iconActive: "people" },
  { key: "perfil", label: "Perfil", icon: "person-outline", iconActive: "person" },
];

// Paleta del selector de color del encabezado. Es DATO (colores arbitrarios
// elegibles por el usuario), no tokens de tema: por eso vive como hex acá.
const HEADER_COLORS: Array<{ name: string; hex: string }> = [
  { name: "Blanco", hex: "#FFFFFF" },
  { name: "Hueso", hex: "#F4F3F0" },
  { name: "Niebla", hex: "#E9E9EB" },
  { name: "Arena", hex: "#EDE3D2" },
  { name: "Rosa pálido", hex: "#F7DFE4" },
  { name: "Menta clara", hex: "#DCEFE4" },
  { name: "Cielo claro", hex: "#DCE8F7" },
  { name: "Lavanda", hex: "#E3DDF9" },
  { name: "Acero", hex: "#5A6B87" },
  { name: "Grafito", hex: "#3A3A3F" },
  { name: "Negro", hex: "#111111" },
  { name: "Ciruela", hex: "#8E3B76" },
  { name: "Violeta", hex: "#7857FF" },
  { name: "Índigo", hex: "#4B2ECC" },
  { name: "Marino", hex: "#1B3A8C" },
  { name: "Azul", hex: "#1E88E5" },
  { name: "Petróleo", hex: "#175E6B" },
  { name: "Turquesa", hex: "#17B7A6" },
  { name: "Verde", hex: "#35A853" },
  { name: "Bosque", hex: "#1F6B47" },
  { name: "Oliva", hex: "#7A8B36" },
  { name: "Amarillo", hex: "#FFC61A" },
  { name: "Ámbar", hex: "#FB8B24" },
  { name: "Coral", hex: "#F2603C" },
  { name: "Ladrillo", hex: "#B4482B" },
  { name: "Rojo", hex: "#E03B3B" },
  { name: "Vino", hex: "#9B2242" },
  { name: "Rosa", hex: "#E8548F" },
  { name: "Fucsia", hex: "#C13BC9" },
  { name: "Chocolate", hex: "#6B4423" },
];

const DEFAULT_HEADER_COLOR = HEADER_COLORS[0].hex; // Blanco

// Overlays de contraste para el color de encabezado elegible: ningún token de
// tema puede expresar "alpha sobre un color arbitrario", así que los valores
// translúcidos derivados viven acá.
const OVERLAY = {
  softOnDark: "rgba(255,255,255,0.74)", // texto atenuado sobre header oscuro
  lineOnDark: "rgba(255,255,255,0.16)", // divisor de sección sobre header oscuro
  iconOnDark: "rgba(255,255,255,0.6)", // ícono de sección inactivo sobre oscuro
  pillOnDark: "rgba(255,255,255,0.20)", // fondo de pill sobre header oscuro
  pillOnLight: "rgba(0,0,0,0.10)", // fondo de pill sobre header claro
  swatchBorderLight: "rgba(0,0,0,0.12)", // borde de swatches claros
};

// Placeholder estático hasta que el back exponga racha/puesto.
const STREAK_DAYS = 18;
const WEEKLY_RANK = 3;

const SWATCH_COLUMNS = 6;
const SHEET_PADDING = 20;
const SWATCH_GAP = 10;

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// Luminancia relativa (WCAG) para decidir texto claro/oscuro sobre el header.
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function ProfileScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();

  const [section, setSection] = useState<SectionKey>("general");
  const [name, setName] = useState<string>(user?.name ?? "");
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [headerColor, setHeaderColor] = useState<string>(DEFAULT_HEADER_COLOR);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [usernameDraft, setUsernameDraft] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function loadProfile() {
      setError(null);
      setLoading(true);
      try {
        const { data } = await usersApi.getMe();
        if (!active) return;
        setName(data.name);
        setUsername(data.username);
      } catch (err: any) {
        if (!active) return;
        setError(err?.response?.data?.message ?? "No se pudo cargar el perfil.");
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    headerColorCache.get().then((hex) => {
      if (active && hex) setHeaderColor(hex);
    });
    return () => {
      active = false;
    };
  }, []);

  function selectHeaderColor(hex: string) {
    setHeaderColor(hex);
    headerColorCache.set(hex);
  }

  function openEdit() {
    setEditError(null);
    setUsernameDraft(username ?? "");
    setEditOpen(true);
  }

  async function saveEdit() {
    const next = usernameDraft.trim();
    setEditError(null);

    if (!isValidUsername(next)) {
      setEditError("El usuario debe tener 3-50 caracteres: letras, números o guión bajo.");
      return;
    }
    // El back es no-op si no cambia; evitamos el request de más.
    if (next === username) {
      setEditOpen(false);
      return;
    }

    setSavingEdit(true);
    try {
      await usersApi.updateUsername({ username: next });
      setUsername(next);
      setEditOpen(false);
    } catch (err: any) {
      const status = err?.response?.status;
      setEditError(
        status === 409
          ? "Ese usuario ya está en uso."
          : err?.response?.data?.message ?? "No se pudo actualizar el usuario."
      );
    } finally {
      setSavingEdit(false);
    }
  }

  const displayName = name || user?.name || "Tu perfil";
  const activeSection = SECTIONS.find((s) => s.key === section)!;

  // Contraste derivado del color del encabezado.
  const headerLight = luminance(headerColor) > 0.42;
  const onHeader = headerLight ? colors.text : colors.surface;
  const onHeaderSoft = headerLight ? colors.textMuted : OVERLAY.softOnDark;
  const sectionLine = headerLight ? colors.border : OVERLAY.lineOnDark;
  const sectionInactive = headerLight ? colors.textMuted : OVERLAY.iconOnDark;
  const pillBg = headerLight ? OVERLAY.pillOnLight : OVERLAY.pillOnDark;

  const headerColorName =
    HEADER_COLORS.find((c) => c.hex.toLowerCase() === headerColor.toLowerCase())?.name ??
    "Personalizado";

  const swatchSize =
    (width - SHEET_PADDING * 2 - SWATCH_GAP * (SWATCH_COLUMNS - 1)) / SWATCH_COLUMNS;

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: headerColor, paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTopRow}>
          <Text style={[styles.headerTitle, { color: onHeader }]}>Perfil</Text>
          <View style={styles.headerActions}>
            <Pressable style={styles.headerIconBtn} hitSlop={6} onPress={() => setColorPickerOpen(true)}>
              <Ionicons name="color-palette-outline" size={23} color={onHeader} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} hitSlop={6} onPress={openEdit}>
              <Ionicons name="create-outline" size={23} color={onHeader} />
            </Pressable>
            <Pressable style={styles.headerIconBtn} hitSlop={6}>
              <Ionicons name="settings-outline" size={23} color={onHeader} />
            </Pressable>
          </View>
        </View>

        <View style={styles.identityRow}>
          <View style={styles.avatarWrap}>
            <View style={[styles.avatar, { borderColor: onHeader }]}>
              {loading ? (
                <ActivityIndicator color={colors.primary} />
              ) : (
                <Text style={styles.avatarInitials}>{initials(displayName)}</Text>
              )}
            </View>
            {/* Racha: placeholder estático (sin endpoint aún). */}
            <View style={styles.streakBadge}>
              <Ionicons name="flame" size={15} color={colors.surface} />
              <Text style={styles.streakText}>{STREAK_DAYS}</Text>
            </View>
          </View>

          <View style={styles.identityText}>
            <Text style={[styles.name, { color: onHeader }]} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.usernameRow}>
              <Ionicons name="at-outline" size={14} color={onHeaderSoft} />
              <Text style={[styles.username, { color: onHeaderSoft }]} numberOfLines={1}>
                {username ?? "usuario"}
              </Text>
            </View>
            <View style={styles.pillsRow}>
              {/* Puesto: placeholder estático (sin endpoint aún). */}
              <View style={[styles.rankPill, { backgroundColor: pillBg }]}>
                <Ionicons name="ribbon" size={13} color={onHeader} />
                <Text style={[styles.rankPillText, { color: onHeader }]}>#{WEEKLY_RANK}</Text>
              </View>
            </View>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Barra de secciones (solo header; el contenido no se implementa). */}
        <View style={[styles.sectionBar, { borderBottomColor: sectionLine }]}>
          {SECTIONS.map((s) => {
            const active = s.key === section;
            return (
              <Pressable
                key={s.key}
                style={[styles.sectionBtn, { borderBottomColor: active ? onHeader : "transparent" }]}
                onPress={() => setSection(s.key)}
              >
                <Ionicons
                  name={active ? s.iconActive : s.icon}
                  size={23}
                  color={active ? onHeader : sectionInactive}
                />
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* ── Contenido (fuera de alcance: placeholder) ──────── */}
      <View style={styles.content}>
        <View style={styles.placeholderIcon}>
          <Ionicons name={activeSection.iconActive} size={28} color={colors.textMuted} />
        </View>
        <Text style={styles.placeholderTitle}>Próximamente</Text>
        <Text style={styles.placeholderText}>
          La sección "{activeSection.label}" todavía no está disponible.
        </Text>
      </View>

      {/* ── Footer (tab bar) ───────────────────────────────── */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 10 }]}>
        {TABS.map((tab) => {
          const active = tab.key === "perfil";
          return (
            <Pressable
              key={tab.key}
              style={styles.tabBtn}
              onPress={() => {
                if (active || !tab.route) return;
                navigation.navigate(tab.route as never);
              }}
            >
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={26}
                color={active ? colors.primary : colors.textMuted}
              />
            </Pressable>
          );
        })}
      </View>

      {/* ── Selector de color del encabezado ───────────────── */}
      <Modal
        visible={colorPickerOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setColorPickerOpen(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setColorPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Color del encabezado</Text>
              <Pressable style={styles.sheetClose} onPress={() => setColorPickerOpen(false)}>
                <Ionicons name="close-outline" size={16} color={colors.text} />
              </Pressable>
            </View>

            <View style={styles.sheetLabelRow}>
              <Text style={styles.sheetLabel}>Elegí un color</Text>
              <Text style={styles.sheetSelectedName}>{headerColorName}</Text>
            </View>

            <View style={styles.swatchGrid}>
              {HEADER_COLORS.map((c) => {
                const selected = c.hex.toLowerCase() === headerColor.toLowerCase();
                const light = luminance(c.hex) > 0.42;
                return (
                  <Pressable
                    key={c.hex + c.name}
                    onPress={() => selectHeaderColor(c.hex)}
                    style={[
                      styles.swatch,
                      {
                        width: swatchSize,
                        height: swatchSize,
                        backgroundColor: c.hex,
                        borderColor: selected
                          ? colors.text
                          : light
                            ? OVERLAY.swatchBorderLight
                            : "transparent",
                      },
                    ]}
                  >
                    {selected ? (
                      <Ionicons name="checkmark" size={14} color={light ? colors.text : colors.surface} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>

            <Pressable style={styles.sheetPrimaryBtn} onPress={() => setColorPickerOpen(false)}>
              <Text style={styles.sheetPrimaryBtnText}>Listo</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── Editar perfil (username) ───────────────────────── */}
      <Modal
        visible={editOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setEditOpen(false)}
      >
        <Pressable style={styles.sheetOverlay} onPress={() => setEditOpen(false)}>
          <Pressable
            style={[styles.sheet, { paddingBottom: insets.bottom + 28 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Editar perfil</Text>
              <Pressable style={styles.sheetClose} onPress={() => setEditOpen(false)}>
                <Ionicons name="close-outline" size={16} color={colors.text} />
              </Pressable>
            </View>

            <Text style={styles.inputLabel}>Usuario</Text>
            <View style={styles.inputRow}>
              <Ionicons name="at-outline" size={18} color={colors.textMuted} />
              <TextInput
                style={styles.input}
                value={usernameDraft}
                onChangeText={(t) => {
                  setUsernameDraft(t);
                  if (editError) setEditError(null);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="username"
                maxLength={50}
                placeholder="tu_usuario"
                placeholderTextColor={colors.textMuted}
                editable={!savingEdit}
                returnKeyType="done"
                onSubmitEditing={saveEdit}
              />
            </View>

            {editError ? <Text style={styles.inputError}>{editError}</Text> : null}

            <Pressable
              style={[styles.sheetPrimaryBtn, savingEdit && styles.sheetPrimaryBtnDisabled]}
              onPress={saveEdit}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator color={colors.onPrimary} />
              ) : (
                <Text style={styles.sheetPrimaryBtnText}>Guardar</Text>
              )}
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: { backgroundColor: colors.surface },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  headerTitle: { fontFamily: fonts.displayExtraBold, fontSize: 26, color: colors.text },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  avatarWrap: { width: 96, height: 96 },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primaryLight,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: { fontFamily: fonts.displayExtraBold, fontSize: 30, color: colors.primary },
  streakBadge: {
    position: "absolute",
    left: "50%",
    bottom: -12,
    transform: [{ translateX: -26 }],
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.warning,
    borderWidth: 2,
    borderColor: colors.surface,
    borderRadius: 999,
    paddingVertical: 3,
    paddingLeft: 8,
    paddingRight: 10,
  },
  streakText: { fontFamily: fonts.displayExtraBold, fontSize: 14, color: colors.surface },

  identityText: { flex: 1, minWidth: 0, gap: 7 },
  name: { fontFamily: fonts.displayExtraBold, fontSize: 22, color: colors.text },
  usernameRow: { flexDirection: "row", alignItems: "center", gap: 3 },
  username: { fontFamily: fonts.bodySemiBold, fontSize: 13, color: colors.textMuted },
  pillsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 2 },
  rankPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.fill,
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  rankPillText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text },

  errorText: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.xs,
    color: colors.danger,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },

  sectionBar: {
    flexDirection: "row",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 13,
    paddingBottom: 11,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
    marginBottom: -1,
  },

  // Content placeholder
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: colors.surface,
  },
  placeholderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  placeholderTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.text,
    marginBottom: 6,
  },
  placeholderText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "stretch",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 6,
    paddingHorizontal: 4,
  },
  tabBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },

  // Color picker sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: SHEET_PADDING,
    paddingTop: 20,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: { fontFamily: fonts.displayBold, fontSize: 18, color: colors.text },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetLabelRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sheetLabel: { fontFamily: fonts.bodyRegular, fontSize: 12, color: colors.textMuted },
  sheetSelectedName: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.text },
  swatchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SWATCH_GAP,
  },
  swatch: {
    borderRadius: 999,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    marginTop: 20,
  },
  sheetPrimaryBtnDisabled: { opacity: 0.6 },
  sheetPrimaryBtnText: { fontFamily: fonts.bodySemiBold, fontSize: 15, color: colors.onPrimary },

  // Editar perfil
  inputLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.fill,
    borderRadius: 14,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontFamily: fonts.bodyRegular,
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    fontFamily: fonts.bodyRegular,
    fontSize: fontSizes.xs,
    color: colors.danger,
    marginTop: 8,
  },
});
