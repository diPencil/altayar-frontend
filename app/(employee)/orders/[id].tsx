import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { employeeApi } from '../../../src/services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

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

export default function EmployeeOrderDetails() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await employeeApi.getOrderDetails(id as string);
            setOrder(res);
        } catch (e) {
            console.error("Error fetching order:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleGoBack = () => {
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    if (!order) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: t("orders.detailsTitle") }} />
                <View style={styles.emptyContainer}>
                    <Ionicons name="receipt-outline" size={64} color={COLORS.textLight} />
                    <Text style={styles.emptyText}>{t("orders.notFound")}</Text>
                    <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
                        <Text style={styles.backButtonText}>{t("common.back")}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    const { items, user, currency } = order;

    return (
        <View style={styles.container}>
            <Stack.Screen
                options={{
                    title: t("orders.orderNumberTitle", { number: order.order_number || order.id.substring(0, 8) }),
                    headerBackTitle: t("common.back"),
                }}
            />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card - Payment Status */}
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("orders.orderDate")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{new Date(order.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 8 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.paymentStatus")}</Text>
                        {order.is_free ? (
                            <View style={[styles.badge, { backgroundColor: COLORS.success + '20' }]}>
                                <Text style={[styles.badgeText, { color: COLORS.success }]}>{t("common.free")}</Text>
                            </View>
                        ) : (
                            <View style={[styles.badge, { backgroundColor: order.payment_status === 'PAID' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                                <Text style={[styles.badgeText, { color: order.payment_status === 'PAID' ? COLORS.success : COLORS.warning }]}>
                                    {t(`invoices.status.${String(order.payment_status || "unpaid").toLowerCase()}`, order.payment_status || t("common.unpaid"))}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.sectionTitleContainer}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("common.customerInfo")}</Text>
                </View>
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.name")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>
                            {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || 'Unknown' : 'Unknown'}
                        </Text>
                    </View>
                    <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 8 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("common.email")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{user?.email || "-"}</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.sectionTitleContainer}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.manageInvoices.items")}</Text>
                </View>
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    {items && items.map((item: any, index: number) => (
                        <View key={index} style={[styles.itemRow, isRTL && styles.itemRowRTL, index !== items.length - 1 && styles.borderBottom]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.itemTitle, isRTL && styles.textRTL]}>{isRTL && item.description_ar ? item.description_ar : item.description_en || item.description}</Text>
                                {item.description ? <Text style={[styles.itemDesc, isRTL && styles.textRTL]}>{item.description}</Text> : null}
                            </View>
                            <View style={{ alignItems: isRTL ? 'flex-start' : 'flex-end' }}>
                                <Text style={styles.itemPrice}>{item.total_price || (item.quantity * item.unit_price).toFixed(2)} {currency}</Text>
                                <Text style={styles.itemQty}>{item.quantity} x {item.unit_price}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={[styles.card, isRTL && styles.cardRTL, { marginTop: 20 }]}>
                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageInvoices.subtotal")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{order.subtotal || order.total_amount} {currency}</Text>
                    </View>

                    {order.tax_amount > 0 && (
                        <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageInvoices.tax")}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>
                                {t("common.amountPositive", { amount: `${order.tax_amount} ${currency}` })}
                            </Text>
                        </View>
                    )}

                    {order.discount_amount > 0 && (
                        <View style={[styles.row, isRTL && styles.rowRTL, { marginTop: 8 }]}>
                            <Text style={[styles.label, { color: COLORS.success }, isRTL && styles.textRTL]}>{t("common.discount")}</Text>
                            <Text style={[styles.value, { color: COLORS.success }, isRTL && styles.textRTL]}>
                                {t("common.amountNegative", { amount: `${order.discount_amount} ${currency}` })}
                            </Text>
                        </View>
                    )}

                    <View style={[styles.divider, { marginVertical: 12 }]} />

                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.totalLabel, isRTL && styles.textRTL]}>{t("orders.total")}</Text>
                        <Text style={[styles.totalValue, isRTL && styles.textRTL]}>{order.total_amount} {currency}</Text>
                    </View>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backButtonFull, isRTL && { flexDirection: 'row-reverse' }]}
                    onPress={handleGoBack}
                >
                    <Ionicons
                        name={isRTL ? "arrow-forward" : "arrow-back"}
                        size={20}
                        color={COLORS.text}
                    />
                    <Text style={styles.backButtonFullText}>
                        {t("common.back") || "Back"}
                    </Text>
                </TouchableOpacity>

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: COLORS.textLight,
        marginTop: 12,
        marginBottom: 20,
    },
    content: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardRTL: {},
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    label: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    value: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
    },
    textRTL: {
        textAlign: 'right',
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    sectionTitleContainer: {
        marginBottom: 8,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    itemRowRTL: {
        flexDirection: 'row-reverse',
    },
    itemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    itemDesc: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    itemPrice: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    itemQty: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    borderBottom: {
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        paddingBottom: 12,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
    },
    totalLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    backButton: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        marginTop: 12,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    backButtonFull: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.cardBg,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 8,
        gap: 8,
        marginTop: 24,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    backButtonFullText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
});
