import React from "react";
import { View, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Text } from "@/components/Text";
import { colors, fonts } from "@/theme";
import { Avatar } from "./Avatar";
import { RowAction, RowActionSpec } from "./RowAction";

export interface PersonStat {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  tone: string;
  label: string;
}

interface Props {
  id: string;
  name: string;
  username: string;
  /** Línea secundaria: "@usuario" más, según el caso, la relación o los amigos en común. */
  sub: string;
  stats?: PersonStat[];
  actions: RowActionSpec[];
  /** Clave de la acción en curso, para mostrar el spinner en el botón correcto. */
  busyAction?: string | null;
  /** Tocar el avatar abre el perfil de esa persona. */
  onPressAvatar?: () => void;
}

/** Fila de persona compartida por búsqueda, lista de amigos y solicitudes. */
export function PersonRow({
  id,
  name,
  username,
  sub,
  stats = [],
  actions,
  busyAction,
  onPressAvatar,
}: Props) {
  return (
    <View style={styles.row}>
      <Avatar id={id} name={name} username={username} onPress={onPressAvatar} />

      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.sub} numberOfLines={1}>
            {sub}
          </Text>
          {stats.map((stat) => (
            <View key={stat.key} style={styles.stat}>
              <Ionicons name={stat.icon} size={13} color={stat.tone} />
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.actions}>
        {actions.map((action) => (
          <RowAction key={action.key} action={action} busy={busyAction === action.key} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  info: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    color: colors.text,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
  },
  sub: {
    flexShrink: 1,
    fontFamily: fonts.bodyMedium,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  statLabel: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11.5,
    color: colors.textMuted,
  },
  actions: {
    flexDirection: "row",
    gap: 7,
  },
});
