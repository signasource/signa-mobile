import React, { useState } from "react";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Text } from "@/components/Text";
import { BackButton } from "@/components/BackButton";
import { AppStackParamList } from "@/navigation/AppNavigator";
import { colors, fonts } from "@/theme";
import { usersApi } from "@/api/users";
import { useUsernameAvailability } from "@/hooks/useUsernameAvailability";
import ManoCelularPerfil from "@assets/ilus/mano-celular-perfil.svg";

type Props = NativeStackScreenProps<AppStackParamList, "EditProfile">;

export function EditProfileScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { displayName, lastName, username } = route.params;

  const [name, setName] = useState(displayName);
  const [lastNameValue, setLastNameValue] = useState(lastName);
  const [usernameValue, setUsernameValue] = useState(username);
  const [saving, setSaving] = useState(false);

  const { status: usernameStatus, message: usernameMessage } = useUsernameAvailability(
    usernameValue.trim() === username ? "" : usernameValue
  );

  const ready =
    name.trim().length > 0 &&
    usernameStatus !== "taken" &&
    usernameStatus !== "invalid" &&
    usernameStatus !== "checking" &&
    !saving;

  async function handleSave() {
    if (!ready) return;
    setSaving(true);
    const trimmedUsername = usernameValue.trim();
    try {
      if (trimmedUsername !== username) {
        await usersApi.updateUsername(trimmedUsername);
      }
      navigation.navigate("Configuration", {
        updatedProfile: {
          displayName: name.trim(),
          lastName: lastNameValue.trim(),
          username: trimmedUsername,
        },
      });
    } catch {
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.root}>
      <BackButton
        onPress={() => navigation.goBack()}
        style={{ marginTop: insets.top + 8, marginLeft: 8 }}
      />

      <KeyboardAwareScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        enableOnAndroid
        extraScrollHeight={20}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.illustrationWrap}>
          <ManoCelularPerfil width={140} height={210} />
        </View>

        <Text style={styles.title}>Editar perfil</Text>
        <Text style={styles.subtitle}>Así te van a ver los demás.</Text>

        <View style={styles.fieldWrap}>
          <Ionicons name="person-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={name}
            onChangeText={setName}
            placeholder="Nombre"
            placeholderTextColor={colors.neutral600}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Ionicons name="person-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={lastNameValue}
            onChangeText={setLastNameValue}
            placeholder="Apellido"
            placeholderTextColor={colors.neutral600}
          />
        </View>

        <View
          style={[
            styles.fieldWrap,
            (usernameStatus === "taken" || usernameStatus === "invalid") && styles.fieldWrapError,
          ]}
        >
          <Ionicons name="at-outline" size={20} color={colors.textMuted} />
          <TextInput
            style={styles.fieldInput}
            value={usernameValue}
            onChangeText={setUsernameValue}
            placeholder="Usuario"
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
              usernameStatus === "available" ? { color: colors.success } : { color: colors.danger },
            ]}
          >
            {usernameMessage}
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primaryBtn, !ready && { opacity: 0.45 }]}
          onPress={handleSave}
          activeOpacity={ready ? 0.85 : 1}
        >
          <Text style={styles.primaryBtnText}>
            {saving ? "Guardando…" : "Guardar cambios"}
          </Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>

      <TouchableOpacity
        style={[styles.cancelBtn, { paddingBottom: insets.bottom + 12 }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Text style={styles.cancelText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { paddingHorizontal: 24, paddingTop: 4, paddingBottom: 16 },

  illustrationWrap: { alignItems: "center", marginBottom: 8 },

  title: {
    fontFamily: fonts.displayBold,
    fontSize: 32,
    color: colors.neutral900,
    marginTop: 4,
  },
  subtitle: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    color: colors.neutral600,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 28,
  },

  fieldWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.fill,
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 0,
    minHeight: 58,
  },
  fieldWrapError: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.danger,
  },
  fieldInput: {
    flex: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 18,
  },
  fieldHint: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
    marginLeft: 6,
    minHeight: 18,
  },

  primaryBtn: {
    borderRadius: 14,
    minHeight: 56,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    backgroundColor: colors.neutral900,
  },
  primaryBtnText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16,
    color: "#FFFFFF",
  },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    backgroundColor: colors.background,
  },
  cancelText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.neutral600,
  },
});
