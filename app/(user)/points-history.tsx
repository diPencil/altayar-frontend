import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { pointsApi } from "../../src/services/api";
import { isMembershipActive } from "../../src/utils/membership";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
    primary: "#1071b8",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    border: "#e2e8f0"
};

export default function PointsHistory() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const { user } = useAuth();
    const isMember = isMembershipActive(user);
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!isMember) {
            setLoading(false);
            setRefreshing(false);
            return;
        }
        loadTransactions();
    }, [isMember]);

    const loadTransactions = async () => {
        try {
            const data = await pointsApi.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error("Failed to load points history", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadTransactions();
    };

    const renderItem = ({ item }: { item: any }) => {
        // Determine color and icon based on type
        let iconName: any = "add-circle";
        let iconColor = COLORS.success;
        let isPositive = true;

        if (item.transaction_type === "REDEEMED" || item.transaction_type === "EXPIRED") {
            iconName = "remove-circle";
            iconColor = COLORS.error;
            isPositive = false;
        }

        const date = new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const description = language === 'ar' && item.description_ar ? item.description_ar : (item.description_en || item.transaction_type);

        return (
            <View style={[styles.card, isRTL && styles.cardRTL]}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>

                <View style={[styles.content, isRTL && styles.contentRTL]}>
                    <Text style={[styles.title, isRTL && styles.textRTL]}>{description}</Text>
                    <Text style={[styles.date, isRTL && styles.textRTL]}>{date}</Text>
                </View>

                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: iconColor }]}>
                        {isPositive ? "+" : "-"}{item.points}
                    </Text>
                    <Text style={styles.currency}>{t("common.pts")}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("points.history", "Points History")}</Text>
                <View style={{ width: 40 }} />
            </View>

            {!isMember ? (
                <View style={{ padding: 16 }}>
                    <LinearGradient colors={['#0f172a', '#334155', '#64748b']} style={styles.lockedCard}>
                        <View style={[styles.lockedHeaderRow, isRTL && styles.lockedHeaderRowRTL]}>
                            <View style={styles.lockIconWrap}>
                                <Ionicons name="lock-closed" size={20} color="#fff" />
                            </View>
                            <Text style={[styles.lockedTitle, isRTL && styles.textRTL]}>
                                {t('membership.locked.title', 'Subscribe to unlock')}
                            </Text>
                        </View>
                        <Text style={[styles.lockedBody, isRTL && styles.textRTL]}>
                            {t('membership.locked.body', 'Subscribe to explore the app and access all features.')}
                        </Text>
                        <TouchableOpacity
                            style={[styles.lockedBtn, isRTL && styles.lockedBtnRTL]}
                            onPress={() => router.push("/(user)/memberships-explore" as any)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.lockedBtnText}>
                                {t('membership.locked.cta', 'View memberships')}
                            </Text>
                            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color="#0f172a" />
                        </TouchableOpacity>
                    </LinearGradient>
                </View>
            ) : loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={transactions}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.listContent}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Ionicons name="time-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>{t("common.noTransactions", "No transaction history yet")}</Text>
                        </View>
                    }
                />
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomStartRadius: 30,
        borderBottomEndRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    center: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    listContent: {
        padding: 16,
        paddingTop: 8,
        paddingBottom: 110,
    },
    card: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardRTL: {
        flexDirection: "row-reverse",
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginEnd: 12,
    },
    content: {
        flex: 1,
        marginEnd: 12,
    },
    contentRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    title: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 4,
    },
    date: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    textRTL: {
        textAlign: "right",
    },
    amountContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    amount: {
        fontSize: 18,
        fontWeight: "bold",
    },
    currency: {
        fontSize: 12,
        color: COLORS.textLight,
        marginStart: 4,
    },
    emptyState: {
        padding: 40,
        alignItems: "center",
    },
    emptyText: {
        marginTop: 12,
        fontSize: 16,
        color: COLORS.textLight,
    },
    lockedCard: {
        borderRadius: 18,
        padding: 18,
        overflow: 'hidden',
    },
    lockedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    lockedHeaderRowRTL: {
        flexDirection: 'row-reverse',
    },
    lockIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    lockedTitle: {
        color: '#fff',
        fontWeight: '900',
        fontSize: 16,
        flex: 1,
    },
    lockedBody: {
        marginTop: 10,
        color: 'rgba(255,255,255,0.85)',
        fontWeight: '600',
        lineHeight: 20,
    },
    lockedBtn: {
        marginTop: 14,
        backgroundColor: '#fff',
        borderRadius: 14,
        paddingVertical: 12,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    lockedBtnRTL: {
        flexDirection: 'row-reverse',
    },
    lockedBtnText: {
        color: '#0f172a',
        fontWeight: '900',
    },
});
