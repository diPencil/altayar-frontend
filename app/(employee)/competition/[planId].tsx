import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import { router, useLocalSearchParams } from "expo-router";
import { employeeApi } from "../../../src/services/api";

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

type CustomerRow = {
    customer_name: string;
    membership_number: string;
    customer_avatar: string | null;
    start_date: string | null;
    referred_at: string | null;
};

export default function CompetitionPlanDetailScreen() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const params = useLocalSearchParams<{ planId: string; tierName?: string }>();
    const planId = params.planId ?? "";
    const tierName = params.tierName ?? t("employee.competition.tier", "Tier");

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [customers, setCustomers] = useState<CustomerRow[]>([]);

    const load = useCallback(async () => {
        if (!planId) return;
        try {
            const data = await employeeApi.getCompetitionPlanCustomers(planId);
            setCustomers(Array.isArray(data) ? data : []);
        } catch (e) {
            console.warn("Competition plan customers load error", e);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    }, [planId]);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const formatDate = (d: string | null) => {
        if (!d) return "—";
        try {
            return new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
        } catch {
            return d;
        }
    };

    if (!planId) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>{t("common.error", "Error")}</Text>
                <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
                    <Text style={styles.backBtnText}>{t("common.back", "Back")}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
            }
        >
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backIcon}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleWrap}>
                    <Text style={styles.pageTitle} numberOfLines={1}>{tierName}</Text>
                    <Text style={styles.subtitle}>
                        {t("employee.competition.customersWhoSubscribed", "Customers who subscribed with this tier")}
                    </Text>
                </View>
            </View>

            <View style={styles.card}>
                {customers.length === 0 ? (
                    <View style={styles.empty}>
                        <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>
                            {t("employee.competition.noCustomersForTier", "No customers for this tier yet")}
                        </Text>
                    </View>
                ) : (
                    customers.map((row, index) => (
                        <View
                            key={`${row.membership_number}-${index}`}
                            style={[styles.row, isRTL && styles.rowRTL, index < customers.length - 1 && styles.rowBorder]}
                        >
                            <View style={styles.avatar}>
                                {row.customer_avatar ? (
                                    <Image
                                        source={{ uri: row.customer_avatar }}
                                        style={{ width: 44, height: 44, borderRadius: 22 }}
                                    />
                                ) : (
                                    <Ionicons name="person" size={20} color={COLORS.primary} />
                                )}
                            </View>
                            <View style={[styles.rowContent, isRTL && styles.rowContentRTL]}>
                                <Text style={[styles.customerName, isRTL && styles.textRTL]} numberOfLines={1}>
                                    {row.customer_name || t("common.unknown", "Unknown")}
                                </Text>
                                <Text style={[styles.membershipNumber, isRTL && styles.textRTL]}>
                                    {t("employee.competition.membershipNumber", "Membership")}: {row.membership_number || "—"}
                                </Text>
                                <Text style={[styles.dateText, isRTL && styles.textRTL]}>
                                    {t("employee.competition.startDate", "Start")}: {formatDate(row.start_date)}
                                    {row.referred_at ? ` · ${t("employee.competition.referredAt", "Referred")}: ${formatDate(row.referred_at)}` : ""}
                                </Text>
                            </View>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    header: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 20,
    },
    headerRTL: {
        flexDirection: "row-reverse",
    },
    backIcon: {
        padding: 4,
        marginEnd: 12,
    },
    headerTitleWrap: {
        flex: 1,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 4,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    row: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
    },
    rowRTL: {
        flexDirection: "row-reverse",
    },
    rowBorder: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "#e0f2fe",
        alignItems: "center",
        justifyContent: "center",
        marginEnd: 14,
    },
    rowContent: {
        flex: 1,
    },
    rowContentRTL: {
        alignItems: "flex-end",
    },
    customerName: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
    },
    membershipNumber: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 2,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    textRTL: {
        textAlign: "right",
    },
    empty: {
        alignItems: "center",
        paddingVertical: 32,
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textLight,
        marginTop: 12,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: "center",
        marginTop: 48,
    },
    backBtn: {
        marginTop: 16,
        alignSelf: "center",
        paddingVertical: 10,
        paddingHorizontal: 20,
        backgroundColor: COLORS.primary,
        borderRadius: 10,
    },
    backBtnText: {
        color: "#fff",
        fontWeight: "600",
    },
});
