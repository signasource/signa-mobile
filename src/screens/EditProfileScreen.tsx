import React, { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { Text } from "@/components/Text";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { usersApi } from "@/api/users";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import ManoPerfil from "@assets/manos/mano-con-perfil.svg";

type Props = NativeStackScreenProps<AppStackParamList, "EditProfile">;

export function EditProfileScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { name: initialName, lastName: initialLastName, username: initialUsername } = route.params;

  const [name, setName] = useState(initialName);
  const [lastName, setLastName] = useState(initialLastName);
  const [username, setUsername] = useState(initialUsername);
  const [saving, setSaving] = useState(false);

  const { status: usernameStatus, message: usernameMessage } = useUsernameAvailability(
    username.trim() === initialUsername ? "" : username
  );

  const profileReady =
    name.trim().length > 0 &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "checking";

  async function handleSave() {
    if (!profileReady || saving) return;
    setSaving(true);
    try {
      const trimmed = username.trim();
      if (trimmed !== initialUsername) {
        await usersApi.updateUsername(trimmed);
      }
      navigation.goBack();
    } catch {
      // keep local state; API failure doesn't block UX
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <KeyboardAwareScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 28) }]}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <View style={styles.backArrow} />
        </TouchableOpacity>

        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <ManoPerfil height={168} width={112} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Editar perfil</Text>
        <Text style={styles.subtitle}>Así te van a ver los demás.</Text>

        {/* Fields */}
        <View style={styles.fields}>
          <View style={styles.field}>
            <Ionicons name="person-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Nombre"
              placeholderTextColor={colors.neutral600}
            />
          </View>

          <View style={styles.field}>
            <Ionicons name="person-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Apellido"
              placeholderTextColor={colors.neutral600}
            />
          </View>

          <View style={[
            styles.field,
            (usernameStatus === "taken" || usernameStatus === "invalid") && styles.fieldError,
          ]}>
            <Ionicons name="at-outline" size={20} color={colors.neutral600} style={styles.fieldIcon} />
            <TextInput
              style={styles.fieldInput}
              value={username}
              onChangeText={setUsername}
              placeholder="usuario"
              placeholderTextColor={colors.neutral600}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {usernameStatus === "available" && (
              <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            )}
            {(usernameStatus === "taken" || usernameStatus === "invalid") && (
              <Ionicons name="close-circle" size={20} color={colors.danger} />
            )}
            {usernameStatus === "checking" && (
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.neutral600} />
            )}
          </View>

          {usernameMessage ? (
            <View style={styles.hintRow}>
              <Ionicons
                name={usernameStatus === "available" ? "checkmark-circle" : "close-circle"}
                size={15}
                color={usernameStatus === "available" ? colors.success : colors.danger}
              />
              <Text style={[styles.hint, { color: usernameStatus === "available" ? colors.success : colors.danger }]}>
                {usernameMessage}
              </Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, !profileReady && styles.saveBtnDisabled]}
            onPress={handleSave}
            activeOpacity={profileReady ? 0.85 : 1}
          >
            {saving ? (
              <ActivityIndicator color={colors.onDark} size="small" />
            ) : (
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Text style={styles.cancel}>Cancelar</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 30,
    flexGrow: 1,
  },

  backBtn: {
    marginTop: 8,
    marginLeft: 6,
    padding: 6,
    alignSelf: "flex-start",
  },
  backArrow: {
    width: 10,
    height: 10,
    borderLeftWidth: 2.4,
    borderBottomWidth: 2.4,
    borderColor: colors.text,
    transform: [{ rotate: "45deg" }, { translateX: 2 }],
  },

  illustrationWrap: {
    alignItems: "center",
    marginTop: 18,
  },

  title: {
    fontFamily: fonts.displaySemiBold,
    fontSize: 32,
    lineHeight: 34,
    letterSpacing: -0.9,
    color: colors.text,
    marginTop: 20,
  },
  subtitle: {
    fontFamily: fonts.bodyMedium,
    fontSize: 15.5,
    lineHeight: 23,
    color: colors.neutral600,
    marginTop: 10,
  },

  fields: {
    marginTop: 24,
    gap: 14,
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 17,
  },
  fieldError: {
    borderWidth: 1.5,
    borderColor: colors.danger,
    backgroundColor: colors.surface,
  },
  fieldIcon: {
    marginRight: 12,
    flexShrink: 0,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 16,
    color: colors.text,
    paddingVertical: 16,
  },

  hintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: -8,
  },
  hint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
  },

  saveBtn: {
    minHeight: 58,
    backgroundColor: colors.text,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  saveBtnDisabled: {
    backgroundColor: colors.neutral200,
  },
  saveBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },

  spacer: { flex: 1, minHeight: 24 },

  cancel: {
    fontFamily: fonts.displayBold,
    fontSize: 15,
    color: colors.neutral600,
    textAlign: "center",
    paddingVertical: 8,
  },
});
