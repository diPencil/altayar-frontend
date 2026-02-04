import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { walletApi } from "../../src/services/api";

const COLORS = {
    primary: "#0891b2",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
    border: "#e2e8f0"
};

export default function WalletHistory() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const [loading, setLoading] = useState(true);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadTransactions();
    }, []);

    const loadTransactions = async () => {
        try {
            const data = await walletApi.getTransactions();
            setTransactions(data);
        } catch (error) {
            console.error("Failed to load wallet history", error);
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
        // Wallet Transaction Logic
        // Determine transaction type (support both transaction_type and legacy type field)
        const transactionType = item.transaction_type || item.type || '';
        
        // DEPOSIT, REFUND, CASHBACK, BONUS, TRANSFER_IN -> Green (+) Credit
        // WITHDRAWAL, PAYMENT, TRANSFER_OUT, DEDUCTION -> Red (-) Debit
        const isCredit = ['DEPOSIT', 'REFUND', 'CASHBACK', 'BONUS', 'TRANSFER_IN'].includes(transactionType);
        const isDebit = ['WITHDRAWAL', 'PAYMENT', 'TRANSFER_OUT', 'DEDUCTION'].includes(transactionType);
        
        let iconName: any = "wallet";
        let iconColor = COLORS.primary;
        let isPositive = false;

        if (isCredit) {
            iconName = "arrow-down-circle"; // Incoming
            iconColor = COLORS.success;
            isPositive = true;
        } else if (isDebit) {
            iconName = "arrow-up-circle"; // Outgoing
            iconColor = COLORS.error;
            isPositive = false;
        } else {
            // Default handling for unknown types
            iconName = "wallet-outline";
            iconColor = COLORS.primary;
            isPositive = item.amount >= 0;
        }

        const date = new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Get description from various possible fields
        const description = item.description_en || item.description_ar || item.description || transactionType || t('wallet.transaction', 'Transaction');
        const currency = item.currency || 'USD';
        
        // Amount is always positive in backend, determine display based on transaction type
        const displayAmount = isDebit ? -Math.abs(item.amount) : Math.abs(item.amount);

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
                        {displayAmount > 0 ? "+" : ""}{displayAmount.toFixed(2)}
                    </Text>
                    <Text style={styles.currency}>{currency}</Text>
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
                <Text style={styles.headerTitle}>{t("dashboard.walletHistory", "Wallet History")}</Text>
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
                            <Ionicons name="wallet-outline" size={48} color={COLORS.textLight} />
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
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
        marginRight: 12,
    },
    content: {
        flex: 1,
        marginRight: 12,
    },
    contentRTL: {
        marginRight: 0,
        marginLeft: 12,
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
        marginLeft: 4,
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
