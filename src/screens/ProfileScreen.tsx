import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ActivityIndicator, Alert } from "react-native";
import { colors, fonts, fontSizes } from "@/theme";
import { Card } from "@/components/Card";
import { useAuth } from "@/context/AuthContext";
import { usersApi, UserProfileResponse } from "@/api/users";

export function ProfileScreen() {
    const { user } = useAuth();

    const [profile, setProfile] = useState<UserProfileResponse | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const response = await usersApi.getMe();
                setProfile(response.data);
            } catch (error) {
                console.error("Error al obtener el perfil:", error);
                Alert.alert("Error", "No se pudo cargar la información del perfil.");
            } finally {
                setLoading(false);
            }
        };

        fetchProfile();
    }, []);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={colors.primary ?? "#7455F7"} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Mi Perfil</Text>

            <Card>
                <Text style={styles.row}>
                    <Text style={styles.label}>Nombre: </Text>
                    {profile?.name ?? "-"}
                </Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>Usuario: </Text>
                    @{profile?.username ?? "-"}
                </Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>Email: </Text>
                    {profile?.email ?? user?.email ?? "-"}
                </Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>Rol: </Text>
                    {profile?.role ?? "-"}
                </Text>
                <Text style={styles.row}>
                    <Text style={styles.label}>Estado: </Text>
                    {profile?.enabled ? "Activo" : "Inactivo"}
                </Text>
            </Card>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        padding: 24,
        paddingTop: 64
    },
    center: {
        justifyContent: "center",
        alignItems: "center"
    },
    title: {
        fontFamily: fonts.headingBold,
        fontSize: fontSizes.xl,
        color: colors.text,
        marginBottom: 20
    },
    row: {
        fontFamily: fonts.bodyRegular,
        fontSize: fontSizes.md,
        color: colors.text,
        marginBottom: 12
    },
    label: {
        fontFamily: fonts.bodyBold,
    }
});