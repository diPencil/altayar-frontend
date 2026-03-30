import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Dimensions } from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const { width } = Dimensions.get("window");

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
};

export default function AdminReports() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getDashboardStats();
            setStats(res);
        } catch (e) {
            console.log("Error fetching stats", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageReports.title") }} />

            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t("admin.manageReports.overview")}</Text>
                <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>{t("admin.manageReports.subtitle")}</Text>
            </View>

            {stats && (
                <>
                    <View style={[styles.grid]}>
                        <StatCard
                            title={t("admin.manageReports.totalRevenue")}
                            value={`${stats.revenue?.total?.toLocaleString()} ${t("common.currency.usd")}`}
                            change={stats.revenue?.change_percent}
                            icon="wallet"
                            color={COLORS.success}
                            isRTL={isRTL}
                        />
                        <StatCard
                            title={t("admin.manageReports.totalUsers")}
                            value={stats.users?.total}
                            change={stats.users?.change_percent}
                            icon="people"
                            color={COLORS.primary}
                            isRTL={isRTL}
                        />
                        <StatCard
                            title={t("admin.manageReports.totalBookings")}
                            value={stats.bookings?.total}
                            change={stats.bookings?.change_percent}
                            icon="airplane"
                            color={COLORS.warning}
                            isRTL={isRTL}
                        />
                        <StatCard
                            title={t("admin.manageReports.activeOffers")}
                            value={stats.offers?.active}
                            icon="pricetag"
                            color="#ec4899"
                            isRTL={isRTL}
                        />
                    </View>

                    <View style={[styles.card, isRTL && styles.cardRTL]}>
                        <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>{t("admin.manageReports.performanceSummary")}</Text>
                        <Text style={[styles.summaryText, isRTL && styles.textRTL]}>
                            {t("admin.manageReports.summaryPart1")} <Text style={{ fontWeight: 'bold' }}>{stats.users?.this_month}</Text> {t("admin.manageReports.summaryPart2")}
                            <Text style={{ fontWeight: 'bold' }}>{stats.revenue?.this_month?.toLocaleString()}</Text> {t("admin.manageReports.summaryPart3")}
                        </Text>
                    </View>
                </>
            )}
        </ScrollView>
    );
}

function StatCard({ title, value, change, icon, color, isRTL }: any) {
    return (
        <View style={[styles.statCard, isRTL && styles.statCardRTL]}>
            <View style={[styles.iconBox, { backgroundColor: `${color}15` }, isRTL && styles.iconBoxRTL]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{title}</Text>
            <Text style={[styles.statValue, isRTL && styles.textRTL]}>{value}</Text>
            {change !== undefined && (
                <View style={[styles.changeBadge, { backgroundColor: change >= 0 ? `${COLORS.success}15` : `${COLORS.error}15` }]}>
                    <Ionicons name={change >= 0 ? "arrow-up" : "arrow-down"} size={12} color={change >= 0 ? COLORS.success : COLORS.error} />
                    <Text style={[styles.changeText, { color: change >= 0 ? COLORS.success : COLORS.error }]}>
                        {Math.abs(change)}%
                    </Text>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        padding: 20,
        marginBottom: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    headerSubtitle: {
        color: COLORS.textLight,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        padding: 16,
        justifyContent: 'space-between',
    },
    statCard: {
        width: '48%',
        backgroundColor: COLORS.cardBg,
        marginBottom: 16,
        padding: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    changeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        gap: 4,
    },
    changeText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    card: {
        margin: 20,
        padding: 20,
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 10,
    },
    summaryText: {
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 22,
    },
    // RTL Styles
    headerRTL: {
        alignItems: 'flex-end',
    },
    textRTL: {
        textAlign: 'right',
    },

    statCardRTL: {
        alignItems: 'flex-end',
    },
    iconBoxRTL: {
        // alignSelf if needed
    },

    cardRTL: {
        alignItems: 'flex-end',
    }
});
