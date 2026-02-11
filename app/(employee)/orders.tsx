import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl, TextInput } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { employeeApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#1071b8", // Employee theme
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

export default function EmployeeOrders() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async (search?: string) => {
        try {
            setLoading(true);
            const res = await employeeApi.getOrders({ search });
            setOrders(res || []);
        } catch (e: any) {
            console.log("Error loading orders:", e);
            console.error("Full error:", e.message || e);
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrders(searchQuery);
        setRefreshing(false);
    }, [searchQuery]);

    const handleSearch = () => {
        fetchOrders(searchQuery);
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageOrders.title"), headerBackTitle: t("common.back") }} />

            {/* Header Actions */}
            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t("admin.manageOrders.title")}</Text>
                    <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>{orders.length} {t("admin.manageOrders.totalOrders")}</Text>
                </View>
                {/* Employee usually cannot create orders manually in this version, or we hide it */}
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
                <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
                <TextInput
                    style={[styles.searchInput, isRTL && styles.textRTL]}
                    placeholder={"Search by Order #, Name, Phone..."}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => { setSearchQuery(""); fetchOrders(); }}>
                        <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                )}
            </View>

            {/* Orders List */}
            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
                ) : orders.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t("admin.manageOrders.empty")}</Text>
                    </View>
                ) : (
                    orders.map((order: any) => (
                        <OrderCard key={order.id} order={order} />
                    ))
                )}
            </ScrollView>
        </View>
    );
}

function OrderCard({ order }: any) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const statusColor = getStatusColor(order.payment_status);

    const handlePress = () => {
        router.push({
            pathname: '/(employee)/orders/[id]' as any,
            params: { id: String(order.id) },
        });
    };

    return (
        <TouchableOpacity style={[styles.card, isRTL && styles.cardRTL]} onPress={handlePress}>
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                <Text style={[styles.orderNumber, isRTL && styles.textRTL]}>{order.order_number}</Text>
                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>{order.status}</Text>
                </View>
            </View>

            <View style={styles.divider} />

            <View style={[styles.cardBody, isRTL && styles.cardBodyRTL]}>
                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageOrders.customer")}:</Text>
                    <Text style={[styles.value, isRTL && styles.textRTL]}>{order.user_id ? `${t('common.user')} ${order.user_id.substring(0, 6)}` : t('common.unknown')}</Text>
                </View>
                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageOrders.total")}:</Text>
                    <Text style={[styles.amount, isRTL && styles.textRTL]}>{order.total_amount} {order.currency}</Text>
                </View>
                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageOrders.date")}:</Text>
                    <Text style={[styles.value, isRTL && styles.textRTL]}>{new Date(order.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );
}

function getStatusColor(status: string) {
    switch (status) {
        case "PAID": return COLORS.success;
        case "ISSUED": return COLORS.primary;
        case "DRAFT": return COLORS.textLight;
        case "CANCELLED": return COLORS.error;
        default: return COLORS.warning;
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    pageTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    pageSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    orderNumber: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 12,
    },
    cardBody: {
        gap: 8,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    label: {
        color: COLORS.textLight,
        fontSize: 13,
    },
    value: {
        color: COLORS.text,
        fontSize: 13,
        fontWeight: '500',
    },
    amount: {
        color: COLORS.success,
        fontSize: 14,
        fontWeight: 'bold',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 60,
    },
    emptyText: {
        marginTop: 10,
        color: COLORS.textLight,
        fontSize: 16,
    },
    // RTL Styles
    headerRowRTL: {
        flexDirection: 'row-reverse',
    },
    textRTL: {
        textAlign: 'right',
    },
    cardRTL: {
        alignItems: 'stretch',
    },
    cardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    cardBodyRTL: {
        alignItems: 'stretch',
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        gap: 8,
    },
    searchContainerRTL: {
        flexDirection: 'row-reverse',
    },
    searchIcon: {
        marginEnd: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.text,
        padding: 0,
    },
});
