import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { useAuth } from "@/context/AuthContext";
import { useSettings } from "@/context/SettingsContext";
import { usersApi } from "@/api/users";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";

type Props = NativeStackScreenProps<AppStackParamList, "Configuration">;
type Modal = null | "edit" | "password";
type Sheet = null | "color" | "vis" | "time";
type Dialog = null | "logout" | "delete";
type FontSizeId = "SMALL" | "MEDIUM" | "LARGE";
type VisibilityId = "PUBLIC" | "PRIVATE";

const SWATCH_COLS = 6;
const SWATCH_GAP = 10;
const SWATCH_SIZE =
  (Dimensions.get("window").width - 40 - (SWATCH_COLS - 1) * SWATCH_GAP) / SWATCH_COLS;

const HEADER_COLORS = [
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

const FONT_SIZES: Array<{ id: FontSizeId; label: string; chipSize: number }> = [
  { id: "SMALL", label: "Chico", chipSize: 12 },
  { id: "MEDIUM", label: "Medio", chipSize: 13 },
  { id: "LARGE", label: "Grande", chipSize: 15 },
];

const VISIBILITIES: Array<{ id: VisibilityId; label: string; desc: string }> = [
  {
    id: "PUBLIC",
    label: "Pública",
    desc: "Tu perfil, racha y logros aparecen en el ranking y en búsquedas.",
  },
  {
    id: "PRIVATE",
    label: "Privada",
    desc: "Solo tus amigos ven tu actividad. No aparecés en el ranking global.",
  },
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, "0"));
const ITEM_H = 40;
const WHEEL_PAD = ITEM_H * 2;

function getLum(hex: string): number {
  const p = (s: string) => parseInt(s, 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  return (
    0.2126 * lin(p(hex.slice(1, 3))) +
    0.7152 * lin(p(hex.slice(3, 5))) +
    0.0722 * lin(p(hex.slice(5, 7)))
  );
}

function isLight(hex: string): boolean {
  return getLum(hex) > 0.42;
}

function mixToward(hex: string, target: string, t: number): string {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(hex, i) * (1 - t) + ch(target, i) * t));
  return "#" + out.map((v) => v.toString(16).padStart(2, "0")).join("");
}

function fillAccent(hex: string): string {
  let out = hex;
  for (let t = 0; t <= 1; t += 0.05) {
    out = mixToward(hex, "#241A16", t);
    if (getLum(out) <= 0.175) break;
  }
  return out;
}

export function ConfigurationScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { changePassword, logout } = useAuth();
  const { fontSizeId: fontSize, setFontSizeId: setFontSize } = useSettings();

  const [loading, setLoading] = useState(true);

  // Settings state
  const [headerColor, setHeaderColor] = useState("#7857FF");
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [dailyNotificationEnabled, setDailyNotificationEnabled] = useState(false);
  const [accountVisibility, setAccountVisibility] = useState<VisibilityId>("PUBLIC");
  const [reminderHour, setReminderHour] = useState("20");
  const [reminderMinute, setReminderMinute] = useState("00");

  // Sheet drafts
  const [headerColorDraft, setHeaderColorDraft] = useState("#7857FF");
  const [draftHour, setDraftHour] = useState("20");
  const [draftMinute, setDraftMinute] = useState("00");

  // Profile state
  const [displayName, setDisplayName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");

  // Edit profile draft
  const [editName, setEditName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editUsername, setEditUsername] = useState("");

  // Password state
  const [pwCurrent, setPwCurrent] = useState("");
  const [pwNext, setPwNext] = useState("");
  const [pwRepeat, setPwRepeat] = useState("");
  const [showCur, setShowCur] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showRepeat, setShowRepeat] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  // UI overlays
  const [modal, setModal] = useState<Modal>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");

  const hourScrollRef = useRef<ScrollView>(null);
  const minuteScrollRef = useRef<ScrollView>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status: usernameStatus, message: usernameMessage } = useUsernameAvailability(
    editUsername.trim() === username ? "" : editUsername
  );

  useEffect(() => {
    loadData();
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, []);

  useEffect(() => {
    if (sheet !== "time") return;
    const hIdx = HOURS.indexOf(draftHour);
    const mIdx = MINUTES.indexOf(draftMinute);
    const t = setTimeout(() => {
      hourScrollRef.current?.scrollTo({ y: hIdx * ITEM_H, animated: false });
      minuteScrollRef.current?.scrollTo({ y: mIdx * ITEM_H, animated: false });
    }, 60);
    return () => clearTimeout(t);
  }, [sheet]);

  async function loadData() {
    setLoading(true);
    const [settingsRes, profileRes] = await Promise.allSettled([
      usersApi.getSettings(),
      usersApi.getMe(),
    ]);

    if (settingsRes.status === "fulfilled") {
      const s = settingsRes.value.data;
      setHeaderColor(s.profileHeaderColor);
      setHeaderColorDraft(s.profileHeaderColor);
      if (s.fontSize) setFontSize(s.fontSize as FontSizeId);
      if (s.vibrationEnabled !== undefined) setVibrationEnabled(s.vibrationEnabled);
      if (s.notificationsEnabled !== undefined) setNotificationsEnabled(s.notificationsEnabled);
      if (s.dailyNotificationEnabled !== undefined)
        setDailyNotificationEnabled(s.dailyNotificationEnabled);
      if (s.accountVisibility) setAccountVisibility(s.accountVisibility as VisibilityId);
      if (s.dailyNotificationTime) {
        const [h = "20", m = "00"] = s.dailyNotificationTime.split(":");
        const clampedMin = MINUTES.find((mm) => mm === m) ?? MINUTES[0];
        setReminderHour(h);
        setReminderMinute(clampedMin);
        setDraftHour(h);
        setDraftMinute(clampedMin);
      }
    }

    if (profileRes.status === "fulfilled") {
      const p = profileRes.value.data;
      setDisplayName(p.name);
      setUsername(p.username);
    }

    setLoading(false);
  }

  function showToast(text: string) {
    setToast(text);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  }

  async function saveSetting(patch: Parameters<typeof usersApi.updateSettings>[0]) {
    try {
      await usersApi.updateSettings(patch);
    } catch {
      // keep local change
    }
  }

  function openEdit() {
    setEditName(displayName);
    setEditLastName(lastName);
    setEditUsername(username);
    setModal("edit");
  }

  function openPassword() {
    setPwCurrent("");
    setPwNext("");
    setPwRepeat("");
    setShowCur(false);
    setShowNext(false);
    setShowRepeat(false);
    setPwError(null);
    setModal("password");
  }

  async function handleSaveProfile() {
    const trimmed = editUsername.trim();
    if (trimmed !== username) {
      try {
        await usersApi.updateUsername(trimmed);
        setUsername(trimmed);
      } catch {
        // keep local
      }
    }
    setDisplayName(editName.trim());
    setLastName(editLastName.trim());
    setModal(null);
    showToast("Perfil actualizado");
  }

  async function handleChangePassword() {
    if (savingPassword) return;
    setSavingPassword(true);
    setPwError(null);
    try {
      await changePassword({ currentPassword: pwCurrent, newPassword: pwNext });
      setModal(null);
      showToast("Contraseña actualizada");
    } catch (err: any) {
      setPwError(err?.response?.data?.message ?? "No se pudo cambiar la contraseña");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    setDialog(null);
    await logout();
  }

  async function handleDeleteAccount() {
    setDialog(null);
    try {
      await usersApi.deleteMe();
    } catch {
      // proceed anyway
    }
    await logout();
  }

  // ─── derived ──────────────────────────────────────────────────
  const headerLight = isLight(headerColor);
  const onHeader = headerLight ? colors.neutral900 : colors.surface;
  const accent = fillAccent(headerColor);
  const accentFg = isLight(accent) ? colors.neutral900 : colors.surface;
  const accentSoft = accent + "1F";

  const currentVis = VISIBILITIES.find((v) => v.id === accountVisibility) ?? VISIBILITIES[0];
  const currentColorName =
    HEADER_COLORS.find((c) => c.hex.toLowerCase() === headerColor.toLowerCase())?.name ??
    headerColor;
  const fullName = [displayName, lastName].filter(Boolean).join(" ");

  const pwLenOk = pwNext.length >= 8;
  const pwRepeatMismatch = pwRepeat.length > 0 && pwRepeat !== pwNext;
  const pwReady =
    pwCurrent.length > 0 && pwLenOk && pwRepeat === pwNext && pwRepeat.length > 0;
  const profileReady =
    editName.trim().length > 0 &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "checking";
  const deleteReady = deleteConfirm.trim().toUpperCase() === "ELIMINAR";

  // ─── sub-components ───────────────────────────────────────────
  function SectionHeader({ label, first }: { label: string; first?: boolean }) {
    return (
      <Text style={[styles.sectionHeader, first && { borderTopWidth: 0, marginTop: 0, paddingTop: 16 }]}>
        {label}
      </Text>
    );
  }

  function Toggle({
    value,
    onToggle,
    disabled,
  }: {
    value: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }) {
    return (
      <TouchableOpacity
        onPress={disabled ? undefined : onToggle}
        activeOpacity={disabled ? 1 : 0.8}
      >
        <View
          style={[
            styles.toggle,
            { backgroundColor: value && !disabled ? accent : colors.neutral200 },
          ]}
        >
          <View style={[styles.toggleKnob, { marginLeft: value ? 20 : 0 }]} />
        </View>
      </TouchableOpacity>
    );
  }

  function PrimaryBtn({
    label,
    onPress,
    disabled,
    loading: btnLoading,
    danger,
  }: {
    label: string;
    onPress: () => void;
    disabled?: boolean;
    loading?: boolean;
    danger?: boolean;
  }) {
    const bg = danger
      ? disabled
        ? "#F6D7CD"
        : colors.danger
      : disabled
        ? colors.neutral200
        : accent;
    const fg = danger
      ? disabled
        ? "#D9A697"
        : colors.surface
      : disabled
        ? colors.neutral600
        : accentFg;
    return (
      <TouchableOpacity
        style={[styles.primaryBtn, { backgroundColor: bg }]}
        onPress={disabled ? undefined : onPress}
        activeOpacity={disabled ? 1 : 0.85}
      >
        <Text style={[styles.primaryBtnText, { color: fg }]}>{label}</Text>
      </TouchableOpacity>
    );
  }

  // ─── render ───────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* header */}
      <View style={{ backgroundColor: headerColor }}>
        <View style={{ height: insets.top }} />
        <View style={styles.headerBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: onHeader }]}>Configuración</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Preferencias ── */}
          <SectionHeader label="Preferencias" first />

          <View style={styles.fontRow}>
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
              <Ionicons name="text-outline" size={20} color={colors.neutral600} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.settingLabel}>Tamaño de fuente</Text>
                <Text style={styles.settingSubtitle}>Se aplica a todos los textos de la app</Text>
              </View>
            </View>
            <View style={styles.fontSegment}>
              {FONT_SIZES.map((f) => {
                const selected = f.id === fontSize;
                return (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.fontItem, selected && styles.fontItemSelected]}
                    onPress={() => {
                      setFontSize(f.id);
                      saveSetting({ fontSize: f.id });
                      showToast("Cambios guardados");
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.fontItemLabel,
                        { fontSize: f.chipSize },
                        selected
                          ? { color: colors.neutral900 }
                          : { color: colors.neutral600 },
                      ]}
                    >
                      {f.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={[styles.settingRow, styles.borderBottom]}>
            <Ionicons name="phone-portrait-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Vibración</Text>
            <Toggle
              value={vibrationEnabled}
              onToggle={() => {
                const next = !vibrationEnabled;
                setVibrationEnabled(next);
                saveSetting({ vibrationEnabled: next });
                showToast("Cambios guardados");
              }}
            />
          </View>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={() => setSheet("vis")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="eye-outline"
              size={20}
              color={colors.neutral600}
              style={{ marginTop: 2 }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.settingLabel}>Visibilidad de la cuenta</Text>
              <Text style={[styles.settingSubtitle, { marginTop: 2, maxWidth: 220 }]} numberOfLines={2}>
                {currentVis.desc}
              </Text>
            </View>
            <Text style={[styles.settingValue, { marginTop: 1 }]}>{currentVis.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral600} style={{ marginTop: 2 }} />
          </TouchableOpacity>

          {/* ── Notificaciones ── */}
          <SectionHeader label="Notificaciones" />

          <View style={[styles.settingRow, styles.borderBottom]}>
            <Ionicons name="notifications-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Notificaciones</Text>
            <Toggle
              value={notificationsEnabled}
              onToggle={() => {
                const next = !notificationsEnabled;
                setNotificationsEnabled(next);
                saveSetting({ notificationsEnabled: next });
                showToast("Cambios guardados");
              }}
            />
          </View>

          <View
            style={[
              styles.settingRow,
              styles.borderBottom,
              { opacity: notificationsEnabled ? 1 : 0.45 },
            ]}
          >
            <Ionicons
              name="alarm-outline"
              size={20}
              color={colors.neutral600}
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.settingLabel}>Recordatorio diario</Text>
              <Text style={styles.settingSubtitle}>Un aviso para no perder la racha</Text>
            </View>
            <Toggle
              value={dailyNotificationEnabled && notificationsEnabled}
              onToggle={() => {
                if (!notificationsEnabled) return;
                const next = !dailyNotificationEnabled;
                setDailyNotificationEnabled(next);
                saveSetting({ dailyNotificationEnabled: next });
                showToast("Cambios guardados");
              }}
              disabled={!notificationsEnabled}
            />
          </View>

          <TouchableOpacity
            style={[
              styles.settingRow,
              {
                opacity: notificationsEnabled && dailyNotificationEnabled ? 1 : 0.45,
              },
            ]}
            onPress={() => {
              if (!notificationsEnabled || !dailyNotificationEnabled) return;
              setDraftHour(reminderHour);
              setDraftMinute(reminderMinute);
              setSheet("time");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="time-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Hora del recordatorio</Text>
            <Text style={[styles.settingLabel, { color: colors.neutral900, fontFamily: fonts.displayBold }]}>
              {reminderHour}:{reminderMinute}
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral600} />
          </TouchableOpacity>

          {/* ── Cuenta ── */}
          <SectionHeader label="Cuenta" />

          <TouchableOpacity
            style={[styles.settingRow, styles.borderBottom]}
            onPress={() => {
              setHeaderColorDraft(headerColor);
              setSheet("color");
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="color-palette-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Color del encabezado</Text>
            <Text style={styles.settingValue}>{currentColorName}</Text>
            <View style={[styles.colorDot, { backgroundColor: headerColor }]} />
            <Ionicons name="chevron-forward" size={16} color={colors.neutral600} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.settingRow, styles.borderBottom]}
            onPress={openEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Editar perfil</Text>
            <Text style={styles.settingValue}>{fullName}</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral600} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingRow}
            onPress={openPassword}
            activeOpacity={0.7}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.neutral600} />
            <Text style={[styles.settingLabel, { flex: 1 }]}>Cambiar contraseña</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.neutral600} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={() => setDialog("logout")}
            activeOpacity={0.7}
          >
            <Ionicons name="log-out-outline" size={19} color={colors.neutral900} />
            <Text style={styles.logoutText}>Cerrar sesión</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteRow}
            onPress={() => {
              setDeleteConfirm("");
              setDialog("delete");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteText}>Eliminar cuenta</Text>
          </TouchableOpacity>

          <Text style={styles.versionText}>Signa 1.4.0</Text>
        </ScrollView>
      )}

      {/* ── Edit profile modal ── */}
      {modal === "edit" && (
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFillObject}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModal(null)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Editar perfil</Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModal(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color={colors.neutral900} />
                </TouchableOpacity>
              </View>

              <View style={styles.avatarSection}>
                <View style={[styles.avatar, { backgroundColor: accentSoft }]}>
                  <Text style={[styles.avatarInitials, { color: accent }]}>
                    {(editName[0] ?? "").toUpperCase()}
                    {(editLastName[0] ?? editName[1] ?? "").toUpperCase()}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>Nombre</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Tu nombre"
                  placeholderTextColor={colors.neutral600}
                />
              </View>

              <Text style={styles.fieldLabel}>Apellido</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="person-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={editLastName}
                  onChangeText={setEditLastName}
                  placeholder="Tu apellido"
                  placeholderTextColor={colors.neutral600}
                />
              </View>

              <Text style={styles.fieldLabel}>Usuario</Text>
              <View
                style={[
                  styles.fieldWrap,
                  (usernameStatus === "taken" || usernameStatus === "invalid") && {
                    backgroundColor: colors.surface,
                    shadowColor: colors.danger,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 0,
                    elevation: 0,
                    borderWidth: 1.5,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Ionicons name="at-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={editUsername}
                  onChangeText={setEditUsername}
                  placeholder="usuario"
                  placeholderTextColor={colors.neutral600}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                {usernameStatus === "available" && (
                  <Ionicons name="checkmark-circle" size={19} color={colors.success} />
                )}
                {(usernameStatus === "taken" || usernameStatus === "invalid") && (
                  <Ionicons name="close-circle" size={19} color={colors.danger} />
                )}
                {usernameStatus === "checking" && (
                  <Ionicons name="ellipsis-horizontal" size={19} color={colors.neutral600} />
                )}
              </View>
              {usernameMessage && (
                <Text
                  style={[
                    styles.fieldHint,
                    usernameStatus === "available"
                      ? { color: colors.success }
                      : { color: colors.danger },
                  ]}
                >
                  {usernameMessage}
                </Text>
              )}

              <PrimaryBtn
                label="Guardar cambios"
                disabled={!profileReady}
                onPress={handleSaveProfile}
              />
              <TouchableOpacity
                style={styles.cancelRow}
                onPress={() => setModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      )}

      {/* ── Change password modal ── */}
      {modal === "password" && (
        <KeyboardAvoidingView
          style={StyleSheet.absoluteFillObject}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setModal(null)}>
            <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Cambiar contraseña</Text>
                <TouchableOpacity
                  style={styles.modalClose}
                  onPress={() => setModal(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color={colors.neutral900} />
                </TouchableOpacity>
              </View>

              <Text style={styles.pwNote}>
                Vas a necesitar tu contraseña actual. Después de guardar seguís con la sesión
                abierta en este dispositivo.
              </Text>

              <Text style={styles.fieldLabel}>Contraseña actual</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="lock-closed-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={pwCurrent}
                  onChangeText={setPwCurrent}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral600}
                  secureTextEntry={!showCur}
                />
                <TouchableOpacity onPress={() => setShowCur((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showCur ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Nueva contraseña</Text>
              <View style={styles.fieldWrap}>
                <Ionicons name="key-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={pwNext}
                  onChangeText={setPwNext}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral600}
                  secureTextEntry={!showNext}
                />
                <TouchableOpacity onPress={() => setShowNext((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showNext ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.ruleRow}>
                <Text
                  style={[
                    styles.ruleMark,
                    {
                      color: pwLenOk
                        ? colors.success
                        : pwNext.length === 0
                          ? colors.neutral600
                          : colors.danger,
                    },
                  ]}
                >
                  {pwLenOk ? "✓" : "✗"}
                </Text>
                <Text
                  style={[
                    styles.ruleText,
                    {
                      color: pwLenOk
                        ? colors.success
                        : pwNext.length === 0
                          ? colors.neutral600
                          : colors.danger,
                    },
                  ]}
                >
                  Al menos 8 caracteres
                </Text>
              </View>

              <Text style={styles.fieldLabel}>Repetir nueva contraseña</Text>
              <View
                style={[
                  styles.fieldWrap,
                  pwRepeatMismatch && {
                    backgroundColor: colors.surface,
                    borderWidth: 1.5,
                    borderColor: colors.danger,
                  },
                ]}
              >
                <Ionicons name="key-outline" size={20} color={colors.textMuted} />
                <TextInput
                  style={styles.fieldInput}
                  value={pwRepeat}
                  onChangeText={setPwRepeat}
                  placeholder="••••••••"
                  placeholderTextColor={colors.neutral600}
                  secureTextEntry={!showRepeat}
                />
                <TouchableOpacity onPress={() => setShowRepeat((v) => !v)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showRepeat ? "eye-off-outline" : "eye-outline"}
                    size={20}
                    color={colors.textMuted}
                  />
                </TouchableOpacity>
              </View>
              {(pwRepeatMismatch || (pwRepeat.length > 0 && !pwRepeatMismatch)) && (
                <Text
                  style={[
                    styles.fieldHint,
                    { color: pwRepeatMismatch ? colors.danger : colors.success },
                  ]}
                >
                  {pwRepeatMismatch ? "Las contraseñas no coinciden" : "Coinciden"}
                </Text>
              )}

              {pwError && (
                <Text style={[styles.fieldHint, { color: colors.danger, marginTop: 4 }]}>
                  {pwError}
                </Text>
              )}

              <PrimaryBtn
                label={savingPassword ? "Guardando…" : "Guardar"}
                disabled={!pwReady}
                onPress={handleChangePassword}
              />
              <TouchableOpacity
                style={styles.cancelRow}
                onPress={() => setModal(null)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      )}

      {/* ── Bottom sheets ── */}
      {sheet !== null && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={styles.overlay} onPress={() => setSheet(null)}>
            <View style={styles.sheetCard} onStartShouldSetResponder={() => true}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetTitleRow}>
                <Text style={styles.sheetTitle}>
                  {sheet === "color"
                    ? "Color del encabezado"
                    : sheet === "vis"
                      ? "Visibilidad de la cuenta"
                      : "Hora del recordatorio"}
                </Text>
                <TouchableOpacity
                  style={styles.sheetClose}
                  onPress={() => setSheet(null)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close-outline" size={16} color={colors.neutral900} />
                </TouchableOpacity>
              </View>

              {sheet === "color" && (
                <>
                  <View style={styles.colorGrid}>
                    {HEADER_COLORS.map((c) => {
                      const selected = c.hex.toLowerCase() === headerColorDraft.toLowerCase();
                      const light = isLight(c.hex);
                      return (
                        <TouchableOpacity
                          key={c.hex}
                          style={[
                            styles.colorSwatch,
                            {
                              backgroundColor: c.hex,
                              borderColor: selected
                                ? colors.neutral900
                                : light
                                  ? "rgba(0,0,0,0.12)"
                                  : "transparent",
                            },
                          ]}
                          onPress={() => setHeaderColorDraft(c.hex)}
                          activeOpacity={0.8}
                        >
                          {selected && (
                            <Ionicons
                              name="checkmark"
                              size={15}
                              color={light ? colors.neutral900 : colors.surface}
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 16, backgroundColor: accent }]}
                    onPress={async () => {
                      setHeaderColor(headerColorDraft);
                      setSheet(null);
                      showToast("Cambios guardados");
                      await saveSetting({ profileHeaderColor: headerColorDraft });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.primaryBtnText, { color: accentFg }]}>Listo</Text>
                  </TouchableOpacity>
                </>
              )}

              {sheet === "vis" && (
                <View style={{ gap: 2 }}>
                  {VISIBILITIES.map((v) => {
                    const selected = v.id === accountVisibility;
                    return (
                      <TouchableOpacity
                        key={v.id}
                        style={[
                          styles.visOption,
                          { backgroundColor: selected ? accentSoft : "transparent" },
                        ]}
                        onPress={() => {
                          setAccountVisibility(v.id);
                          setSheet(null);
                          saveSetting({ accountVisibility: v.id });
                          showToast("Cambios guardados");
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.visLabel}>{v.label}</Text>
                          <Text style={styles.visDesc}>{v.desc}</Text>
                        </View>
                        <Ionicons
                          name="checkmark-circle"
                          size={18}
                          color={selected ? accent : "transparent"}
                          style={{ marginTop: 2 }}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              {sheet === "time" && (
                <>
                  <View style={styles.wheelWrap}>
                    <View style={styles.wheelHighlight} />
                    <View style={styles.wheelRow}>
                      <ScrollView
                        ref={hourScrollRef}
                        style={styles.wheelScroll}
                        snapToInterval={ITEM_H}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                          const idx = Math.max(
                            0,
                            Math.min(
                              HOURS.length - 1,
                              Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
                            )
                          );
                          setDraftHour(HOURS[idx]);
                        }}
                      >
                        <View style={{ height: WHEEL_PAD }} />
                        {HOURS.map((h) => (
                          <View key={h} style={styles.wheelItem}>
                            <Text
                              style={[
                                styles.wheelText,
                                h === draftHour
                                  ? styles.wheelTextSelected
                                  : styles.wheelTextDim,
                              ]}
                            >
                              {h}
                            </Text>
                          </View>
                        ))}
                        <View style={{ height: WHEEL_PAD }} />
                      </ScrollView>

                      <Text style={styles.wheelSep}>:</Text>

                      <ScrollView
                        ref={minuteScrollRef}
                        style={styles.wheelScroll}
                        snapToInterval={ITEM_H}
                        decelerationRate="fast"
                        showsVerticalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                          const idx = Math.max(
                            0,
                            Math.min(
                              MINUTES.length - 1,
                              Math.round(e.nativeEvent.contentOffset.y / ITEM_H)
                            )
                          );
                          setDraftMinute(MINUTES[idx]);
                        }}
                      >
                        <View style={{ height: WHEEL_PAD }} />
                        {MINUTES.map((m) => (
                          <View key={m} style={styles.wheelItem}>
                            <Text
                              style={[
                                styles.wheelText,
                                m === draftMinute
                                  ? styles.wheelTextSelected
                                  : styles.wheelTextDim,
                              ]}
                            >
                              {m}
                            </Text>
                          </View>
                        ))}
                        <View style={{ height: WHEEL_PAD }} />
                      </ScrollView>
                    </View>
                    <View style={styles.wheelFadeTop} />
                    <View style={styles.wheelFadeBottom} />
                  </View>
                  <Text style={styles.wheelHint}>Hora · minuto</Text>
                  <TouchableOpacity
                    style={[styles.primaryBtn, { marginTop: 16, backgroundColor: accent }]}
                    onPress={async () => {
                      setReminderHour(draftHour);
                      setReminderMinute(draftMinute);
                      setSheet(null);
                      const time = `${draftHour}:${draftMinute}:00`;
                      showToast("Cambios guardados");
                      await saveSetting({ dailyNotificationTime: time });
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.primaryBtnText, { color: accentFg }]}>Listo</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          </Pressable>
        </View>
      )}

      {/* ── Dialogs ── */}
      {dialog !== null && (
        <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
          <Pressable style={styles.overlay} onPress={() => setDialog(null)}>
            <View style={styles.dialogCard} onStartShouldSetResponder={() => true}>
              <View
                style={[
                  styles.dialogIcon,
                  {
                    backgroundColor:
                      dialog === "delete" ? colors.dangerLight : accentSoft,
                  },
                ]}
              >
                <Ionicons
                  name={dialog === "delete" ? "trash-outline" : "log-out-outline"}
                  size={26}
                  color={dialog === "delete" ? colors.danger : accent}
                />
              </View>

              <Text style={styles.dialogTitle}>
                {dialog === "delete" ? "Eliminar tu cuenta" : "¿Cerrar sesión?"}
              </Text>
              <Text style={styles.dialogDesc}>
                {dialog === "delete"
                  ? "Se borran tu progreso, racha, logros e inventario. Esta acción no se puede deshacer."
                  : "Vas a volver a la pantalla de inicio. Tu progreso queda guardado en tu cuenta."}
              </Text>

              {dialog === "delete" && (
                <View style={{ marginTop: 18 }}>
                  <View style={styles.fieldWrap}>
                    <TextInput
                      style={[styles.fieldInput, { paddingLeft: 0 }]}
                      value={deleteConfirm}
                      onChangeText={setDeleteConfirm}
                      placeholder="ELIMINAR"
                      placeholderTextColor={colors.neutral600}
                      autoCapitalize="characters"
                    />
                  </View>
                  <Text style={styles.deleteConfirmHint}>Escribí ELIMINAR para confirmar</Text>
                </View>
              )}

              <View style={styles.dialogBtns}>
                <TouchableOpacity
                  style={styles.dialogCancelBtn}
                  onPress={() => setDialog(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dialogCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dialogActionBtn,
                    {
                      backgroundColor:
                        dialog === "delete"
                          ? deleteReady
                            ? colors.danger
                            : "#F6D7CD"
                          : accent,
                    },
                  ]}
                  onPress={
                    dialog === "delete"
                      ? deleteReady
                        ? handleDeleteAccount
                        : undefined
                      : handleLogout
                  }
                  activeOpacity={dialog === "delete" && !deleteReady ? 1 : 0.85}
                >
                  <Text
                    style={[
                      styles.dialogActionText,
                      {
                        color:
                          dialog === "delete"
                            ? deleteReady
                              ? colors.surface
                              : "#D9A697"
                            : accentFg,
                      },
                    ]}
                  >
                    {dialog === "delete" ? "Eliminar" : "Cerrar sesión"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </View>
      )}

      {/* ── Toast ── */}
      {toast !== null && (
        <View style={[styles.toast, { bottom: insets.bottom + 26 }]} pointerEvents="none">
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
  },
  backBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.fill,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerTitle: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 26,
  },

  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  sectionHeader: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 0.7,
    textTransform: "uppercase",
    color: colors.neutral600,
    paddingTop: 22,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: colors.neutral200,
    marginTop: 8,
  },

  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
  },
  borderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
  },
  settingLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
  settingSubtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    lineHeight: 17,
  },
  settingValue: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.neutral600,
  },
  colorDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.12)",
    flexShrink: 0,
  },

  fontRow: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutral200,
    gap: 12,
  },
  fontSegment: {
    flexDirection: "row",
    backgroundColor: colors.neutral100,
    borderRadius: 12,
    padding: 3,
    gap: 3,
    marginLeft: 30,
  },
  fontItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 9,
    paddingVertical: 9,
  },
  fontItemSelected: {
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  fontItemLabel: {
    fontFamily: fonts.bodySemiBold,
  },

  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    padding: 2,
    justifyContent: "center",
    flexShrink: 0,
  },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 3,
    elevation: 2,
  },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 14,
    padding: 15,
    backgroundColor: colors.neutral100,
    marginTop: 26,
  },
  logoutText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
  deleteRow: { alignItems: "center", paddingVertical: 16 },
  deleteText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.danger,
  },
  versionText: {
    textAlign: "center",
    fontFamily: fonts.bodyRegular,
    fontSize: 11,
    color: colors.neutral600,
    paddingBottom: 8,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 18,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  modalTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.neutral900,
  },
  modalClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarSection: { alignItems: "center", marginBottom: 16 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitials: {
    fontFamily: fonts.displayExtraBold,
    fontSize: 24,
  },
  fieldLabel: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    marginBottom: 4,
    marginLeft: 6,
  },
  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 15,
    marginBottom: 12,
    borderWidth: 0,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 12,
  },
  fieldHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 6,
    minHeight: 18,
  },
  eyeBtn: { padding: 8 },
  pwNote: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    lineHeight: 17,
    textAlign: "center",
    marginBottom: 16,
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -6,
    marginBottom: 14,
    marginLeft: 6,
  },
  ruleMark: { fontFamily: fonts.bodySemiBold, fontSize: 12, width: 14 },
  ruleText: { fontFamily: fonts.bodyMedium, fontSize: 12 },

  primaryBtn: {
    borderRadius: 18,
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  primaryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
  },
  cancelRow: { alignItems: "center", paddingVertical: 14 },
  cancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral600,
  },

  // Bottom sheet
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheetCard: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: "80%",
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutral200,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 18,
  },
  sheetTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 18,
    color: colors.neutral900,
  },
  sheetClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
  },

  colorGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SWATCH_GAP,
  },
  colorSwatch: {
    width: SWATCH_SIZE,
    height: SWATCH_SIZE,
    borderRadius: SWATCH_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },

  visOption: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 13,
    borderRadius: 14,
  },
  visLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
  visDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    marginTop: 2,
    lineHeight: 17,
  },

  // Time wheel
  wheelWrap: { position: "relative", height: ITEM_H * 5, marginVertical: 4 },
  wheelHighlight: {
    position: "absolute",
    left: 0,
    right: 0,
    top: WHEEL_PAD,
    height: ITEM_H,
    backgroundColor: colors.neutral100,
    borderRadius: 12,
  },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: ITEM_H * 5,
  },
  wheelScroll: { width: 96, height: ITEM_H * 5 },
  wheelItem: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
  wheelText: { fontFamily: fonts.displayBold },
  wheelTextSelected: { fontSize: 26, color: colors.neutral900 },
  wheelTextDim: { fontSize: 20, color: "#B8B8BD" },
  wheelSep: {
    fontFamily: fonts.displayBold,
    fontSize: 24,
    color: colors.neutral900,
  },
  wheelFadeTop: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: WHEEL_PAD - 10,
    backgroundColor: "transparent",
    // iOS gradient via shadow
  },
  wheelFadeBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: WHEEL_PAD - 10,
  },
  wheelHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    textAlign: "center",
    marginBottom: 4,
  },

  // Dialog
  dialogCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: "100%",
  },
  dialogIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 16,
  },
  dialogTitle: {
    fontFamily: fonts.displayBold,
    fontSize: 19,
    color: colors.neutral900,
    textAlign: "center",
  },
  dialogDesc: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13,
    color: colors.neutral600,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 8,
  },
  deleteConfirmHint: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12,
    color: colors.neutral600,
    textAlign: "center",
    marginTop: 6,
  },
  dialogBtns: { flexDirection: "row", gap: 10, marginTop: 20 },
  dialogCancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 14,
    backgroundColor: colors.neutral100,
  },
  dialogCancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral900,
  },
  dialogActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    padding: 14,
  },
  dialogActionText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },

  // Toast
  toast: {
    position: "absolute",
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.text,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 24,
    elevation: 8,
  },
  toastText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.onDark,
  },
});
