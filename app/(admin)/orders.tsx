import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, RefreshControl, TextInput } from "react-native";
import { Stack, router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi, ordersApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#1071b8",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

export default function AdminOrders() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            const res = await adminApi.getAllOrders();
            setOrders(res || []);
        } catch (e) {
            console.log("Error loading orders", e);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchOrders();
        }, [fetchOrders])
    );

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await fetchOrders();
        setRefreshing(false);
    }, [fetchOrders]);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageOrders.title"), headerBackTitle: t("common.back") }} />

            {/* Header Actions */}
            <View style={[styles.headerRow, isRTL && styles.headerRowRTL]}>
                <View style={isRTL && { alignItems: 'flex-end' }}>
                    <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t("admin.manageOrders.title")}</Text>
                    <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>{orders.length} {t("admin.manageOrders.totalOrders")}</Text>
                </View>
                <TouchableOpacity
                    style={styles.createBtn}
                    onPress={() => router.push("/(admin)/invoices/create")}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.createBtnText}>{t("admin.manageOrders.newOrder")}</Text>
                </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={[styles.searchContainer, isRTL && styles.rowRTL]}>
                <Ionicons name="search" size={20} color={COLORS.textLight} style={{ marginHorizontal: 8 }} />
                <TextInput
                    style={[styles.searchInput, isRTL && styles.textRTL]}
                    placeholder={t("admin.manageOrders.searchPlaceholder")}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={COLORS.textLight}
                />
            </View>

            {/* Orders List */}
            <ScrollView
                contentContainerStyle={styles.listContent}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {loading && !refreshing ? (
                    <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
                ) : orders.filter(order => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase();
                    const orderNumber = order.order_number?.toLowerCase() || '';
                    const userName = order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.toLowerCase() : '';
                    const userEmail = order.user?.email?.toLowerCase() || '';
                    const userPhone = order.user?.phone?.toLowerCase() || '';
                    return orderNumber.includes(query) || userName.includes(query) || userEmail.includes(query) || userPhone.includes(query);
                }).length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{searchQuery ? t("admin.manageOrders.noResults") : t("admin.manageOrders.empty")}</Text>
                    </View>
                ) : (
                    orders.filter(order => {
                        if (!searchQuery) return true;
                        const query = searchQuery.toLowerCase();
                        const orderNumber = order.order_number?.toLowerCase() || '';
                        const userName = order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.toLowerCase() : '';
                        const userEmail = order.user?.email?.toLowerCase() || '';
                        const userPhone = order.user?.phone?.toLowerCase() || '';
                        return orderNumber.includes(query) || userName.includes(query) || userEmail.includes(query) || userPhone.includes(query);
                    }).map((order: any) => (
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
    const statusColor = getStatusColor(order.status);

    const statusLabels: any = {
        PAID: t("admin.manageOrders.status.paid"),
        ISSUED: t("admin.manageOrders.status.issued"),
        DRAFT: t("admin.manageOrders.status.draft"),
        CANCELLED: t("admin.manageOrders.status.cancelled"),
        PENDING: t("admin.manageOrders.status.pending"),
    };

    return (
        <TouchableOpacity style={[styles.card, isRTL && styles.cardRTL]} onPress={() => router.push(`/(admin)/orders/${order.id}` as any)}>
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.orderNumber, isRTL && styles.textRTL]}>{order.order_number}</Text>
                </View>
                {/* Payment Status Badge Only */}
                {order.is_free ? (
                    <View style={[styles.statusBadge, { backgroundColor: COLORS.success + '20' }]}>
                        <Text style={[styles.statusText, { color: COLORS.success }]}>{t("admin.free") || "Free"}</Text>
                    </View>
                ) : (
                    <View style={[styles.statusBadge, { backgroundColor: order.payment_status === 'PAID' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                        <Text style={[styles.statusText, { color: order.payment_status === 'PAID' ? COLORS.success : COLORS.warning }]}>
                            {order.payment_status === 'PAID' ? (t("admin.paid") || "Paid") : (t("admin.unpaid") || "Unpaid")}
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.divider} />

            <View style={[styles.cardBody, isRTL && styles.cardBodyRTL]}>
                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageOrders.customer")}:</Text>
                    <Text style={[styles.value, isRTL && styles.textRTL]}>
                        {order.user ? `${order.user.first_name || ''} ${order.user.last_name || ''}`.trim() || order.user.username : (order.user_id ? `${t("common.user")} ${order.user_id.substring(0, 6)}` : t("common.unknown") || "Unknown")}
                    </Text>
                </View>
                <View style={[styles.row, isRTL && styles.rowRTL]}>
                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageOrders.total")}:</Text>
                    <Text style={[styles.amount, isRTL && styles.textRTL]}>{order.total_amount} {t(`common.currency.${order.currency?.toLowerCase()}`) || order.currency}</Text>
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
    createBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
    },
    createBtnText: {
        color: 'white',
        fontWeight: '600',
        marginStart: 6,
    },
    listContent: {
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        // Shadow
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
        margin: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
        textAlign: 'auto',
    },
});
