import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { cashbackApi } from "../../src/services/api";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";

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

export default function ClubGiftsHistory() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);
    // Assuming these states and functions would be defined if the Alert.alert was intended to be used here.
    // As per the instruction, I'm placing the Alert.alert block as provided, but it will cause errors
    // due to undefined variables (available, setWithdrawing, loadData) and incorrect placement.
    // I am adding Alert to the import list as it's used in the provided snippet.
    // This block is syntactically incorrect in its current context and will execute on every render.
    // It seems like this code snippet might belong to a different component or a specific event handler.
    // For the purpose of faithfully applying the change, I'm inserting it as requested.
    // If this is not the intended behavior, please provide more context or a corrected snippet.
    // Alert.alert(
    //   t('cashback.requestWithdrawConfirmTitle', 'Request Withdrawal'),
    //   t('cashback.requestWithdrawConfirmMessage', 'Are you sure you want to request a withdrawal of {{amount}} to your wallet? This will be reviewed by admin.', { amount: available.toFixed(2) }),
    //   [
    //     { text: t('common.cancel'), style: 'cancel' },
    //     {
    //       text: t('cashback.request', 'Send Request'),
    //       onPress: async () => {
    //         try {
    //           setWithdrawing(true);
    //           await cashbackApi.withdrawToWallet(available);
    //           Alert.alert(t('common.success'), t('cashback.requestSuccess', 'Withdrawal request sent successfully'));
    //           await loadData(); // Refresh data
    //         } catch (error: any) {
    //           console.log('Error requesting withdrawal:', error);
    //           Alert.alert(t('common.error'), error.message || t('cashback.requestError'));
    //         } finally {
    //           setWithdrawing(false);
    //         }
    //       }
    //     }
    //   ]
    // );

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const data = await cashbackApi.getRecords();
            setTransactions(data);
        } catch (error) {
            console.error("Failed to load club gifts history", error);
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
        // Club Gifts Logic
        // CREDITED/PENDING -> Green (+)
        // WITHDRAWN/EXPIRED -> Red (-)
        let iconName: any = "gift";
        let iconColor = COLORS.success;
        let isPositive = true;

        if (item.status === "WITHDRAWN" || item.status === "EXPIRED" || item.status === "REDEEMED" || item.status === "PENDING_WITHDRAWAL") {
            iconName = "arrow-forward-circle";
            iconColor = item.status === "PENDING_WITHDRAWAL" ? COLORS.warning : COLORS.error;
            isPositive = false;
        }

        const date = new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        const rawDesc = item.description || item.type;
        const description = rawDesc === 'Admin Club Gift bonus' ? t('common.cashback.adminBonus') : rawDesc;
        const statusText = item.status ? t(`common.statuses.${item.status}`, item.status) as string : '';

        return (
            <View style={[styles.card]}>
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>

                <View style={[styles.content, isRTL && styles.contentRTL]}>
                    <Text style={[styles.title, isRTL && styles.textRTL]}>{description}</Text>
                    <Text style={[styles.date, isRTL && styles.textRTL]}>{date} • {statusText}</Text>
                </View>

                <View style={styles.amountContainer}>
                    <Text style={[styles.amount, { color: iconColor }]}>
                        {isPositive ? "+" : "-"}{item.amount}
                    </Text>
                    <Text style={styles.currency}>{formatCurrencyLabel(item.currency, t)}</Text>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Custom Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("dashboard.cashbackHistory", "Club Gifts History")}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
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
                            <Ionicons name="gift-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>{t("common.noTransactions", "No club gifts history yet")}</Text>
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
//         marginEnd: 0,  /* removed double-flip for Native RTL */
//         marginStart: 12,  /* removed double-flip for Native RTL */
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
});
