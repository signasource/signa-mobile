import React, { useEffect, useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  FlatList,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Text } from "@/components/Text";
import ManoVacia from "@assets/ilus/mano-vacia.svg";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, fonts } from "@/theme";
import { socialApi, Friend } from "@/api/social";
import { shopApi, ShopItem } from "@/api/shop";
import { avatarColors, initialsOf } from "@/features/social/people";

const MESSAGE_MAX = 500;

interface GiftSheetProps {
  /** The item being gifted; the sheet is hidden while this is null. */
  item: ShopItem | null;
  gems: number;
  onClose: () => void;
  /** Fired once the backend accepted the gift (gems already debited server-side). */
  onSent: (recipient: Friend) => void;
}

export function GiftSheet({ item, gems, onClose, onSent }: GiftSheetProps) {
  const insets = useSafeAreaInsets();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(false);
  const [recipient, setRecipient] = useState<Friend | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!item) return;
    setRecipient(null);
    setMessage("");
    setError(null);
    setLoadingFriends(true);
    socialApi
      .getFriends()
      .then((res) => setFriends(res.data))
      .catch((err: any) =>
        setError(err?.response?.data?.message ?? "No pudimos cargar tus amigos."),
      )
      .finally(() => setLoadingFriends(false));
  }, [item]);

  async function handleSend() {
    if (!item || !recipient) return;
    setError(null);
    setSending(true);
    try {
      await shopApi.sendGift(item.id, recipient.id, message.trim() || undefined);
      onSent(recipient);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "No pudimos enviar el regalo.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      visible={!!item}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose}>
          <Pressable
            style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 28) }]}
            onPress={() => {}}
          >
            <View style={styles.handle} />

            {item ? (
              <>
                <Text style={styles.title}>Regalar {item.title}</Text>
                <View style={styles.priceRow}>
                  <Ionicons name="diamond" size={15} color={colors.shopAmber} />
                  <Text style={styles.priceText}>
                    {item.priceGems} gemas · te quedan {gems - item.priceGems}
                  </Text>
                </View>

                <Text style={styles.label}>¿A quién?</Text>
                {loadingFriends ? (
                  <ActivityIndicator color={colors.shopAmber} style={styles.loader} />
                ) : friends.length === 0 ? (
                  <View style={styles.emptyFriends}>
                    <ManoVacia width={140} height={142} />
                    <Text style={styles.emptyText}>
                      Todavía no tenés amigos para regalarle. Sumalos desde Social.
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={friends}
                    keyExtractor={(f) => f.id}
                    style={styles.friendList}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    renderItem={({ item: f }) => {
                      const av = avatarColors(f.id);
                      const selected = recipient?.id === f.id;
                      return (
                        <TouchableOpacity
                          style={[styles.friendRow, selected && styles.friendRowSelected]}
                          onPress={() => setRecipient(f)}
                          activeOpacity={0.8}
                        >
                          <View style={[styles.avatar, { backgroundColor: av.bg }]}>
                            <Text style={[styles.avatarText, { color: av.fg }]}>
                              {initialsOf(f.name, f.username)}
                            </Text>
                          </View>
                          <View style={styles.friendTexts}>
                            <Text style={styles.friendName} numberOfLines={1}>
                              {f.name || f.username}
                            </Text>
                            <Text style={styles.friendUser} numberOfLines={1}>
                              @{f.username}
                            </Text>
                          </View>
                          {selected && (
                            <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                          )}
                        </TouchableOpacity>
                      );
                    }}
                  />
                )}

                {recipient && (
                  <TextInput
                    style={styles.input}
                    value={message}
                    onChangeText={setMessage}
                    placeholder="Dejale un mensaje (opcional)"
                    placeholderTextColor={colors.textMuted}
                    maxLength={MESSAGE_MAX}
                    multiline
                  />
                )}

                {error && <Text style={styles.error}>{error}</Text>}

                <TouchableOpacity
                  style={[styles.primaryButton, !recipient && styles.primaryButtonDisabled]}
                  onPress={handleSend}
                  disabled={!recipient || sending}
                  activeOpacity={0.86}
                >
                  {sending ? (
                    <ActivityIndicator color={colors.onDark} />
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      {recipient ? `Regalar a @${recipient.username}` : "Elegí un amigo"}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={onClose}
                  disabled={sending}
                  activeOpacity={0.86}
                >
                  <Text style={styles.secondaryButtonText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            ) : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(36,26,22,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 26,
    paddingTop: 22,
    maxHeight: "88%",
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: 18,
  },
  title: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    color: colors.text,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
  },
  priceText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    color: colors.textMuted,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 18,
    marginBottom: 8,
  },
  loader: {
    marginVertical: 24,
  },
  friendList: {
    maxHeight: 230,
  },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  friendRowSelected: {
    borderColor: colors.success,
    backgroundColor: colors.neutral100,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
  },
  friendTexts: {
    flex: 1,
    minWidth: 0,
  },
  friendName: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.text,
  },
  friendUser: {
    fontFamily: fonts.bodyRegular,
    fontSize: 12.5,
    color: colors.textMuted,
  },
  input: {
    marginTop: 12,
    minHeight: 48,
    maxHeight: 96,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: fonts.bodyRegular,
    fontSize: 14.5,
    color: colors.text,
  },
  error: {
    fontFamily: fonts.bodyRegular,
    fontSize: 13.5,
    color: colors.danger,
    marginTop: 12,
  },
  primaryButton: {
    minHeight: 58,
    borderRadius: 14,
    backgroundColor: colors.text,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
    alignSelf: "stretch",
  },
  primaryButtonDisabled: {
    opacity: 0.4,
  },
  primaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 16.5,
    color: colors.onDark,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 14,
    backgroundColor: colors.neutral100,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  secondaryButtonText: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 15,
    color: colors.neutral900,
  },
  emptyFriends: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
  },
  emptyText: {
    fontFamily: fonts.bodyRegular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textMuted,
    textAlign: "center",
  },
});
