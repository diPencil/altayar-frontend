import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { ordersApi } from '../../../src/services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';
import { formatCurrencyLabel } from '../../../src/utils/currencyLabel';
import { Ionicons } from '@expo/vector-icons';
import ConfirmModal from '../../../src/components/ConfirmModal';
import Toast from '../../../src/components/Toast';

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

export default function OrderDetails() {
    const { id } = useLocalSearchParams();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [order, setOrder] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deleting, setDeleting] = useState(false);

    // Modal states
    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        if (id) {
            fetchOrder();
        }
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await ordersApi.getOrder(id as string);
            setOrder(res);
        } catch (e) {
            console.error("Error fetching order:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteOrder = () => {
        setDeleteModalVisible(true);
    };

    const performDelete = async () => {
        try {
            setDeleting(true);
            await ordersApi.deleteOrder(id as string);
            setDeleteModalVisible(false);
            setToast({
                visible: true,
                message: t("admin.orderDeleted") || "Order deleted successfully",
                type: 'success'
            });
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (e: any) {
            console.error("Error deleting order:", e);
            setDeleteModalVisible(false);
            setToast({
                visible: true,
                message: e.message || t("admin.deleteOrderError") || "Failed to delete order",
                type: 'error'
            });
        } finally {
            setDeleting(false);
        }
    };

    const handleGoBack = () => {
        router.back();
    };

    const handleEditOrder = () => {
        setEditModalVisible(true);
    };

    const performEdit = () => {
        setEditModalVisible(false);
        router.push({
            pathname: "/(admin)/invoices/create",
            params: { editOrderId: id as string }
        } as any);
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
                <Stack.Screen options={{ title: t("admin.orderDetails") }} />
                <Text>{t("orders.notFound")}</Text>
            </View>
        );
    }

    const { items, user, currency } = order;
    const currencyLabel = formatCurrencyLabel(currency, t);

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: `${t("admin.order")} #${order.order_number || order.id.substring(0, 8)}`, headerBackTitle: t("common.back") }} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Header Card - Payment Status Only */}
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    <View style={[styles.row]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.orderDate")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{new Date(order.created_at).toLocaleDateString()}</Text>
                    </View>
                    <View style={[styles.row, { marginTop: 8 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.paymentStatus")}</Text>
                        {order.is_free ? (
                            <View style={[styles.badge, { backgroundColor: COLORS.success + '20' }]}>
                                <Text style={[styles.badgeText, { color: COLORS.success }]}>{t("admin.free")}</Text>
                            </View>
                        ) : (
                            <View style={[styles.badge, { backgroundColor: order.payment_status === 'PAID' ? COLORS.success + '20' : COLORS.warning + '20' }]}>
                                <Text style={[styles.badgeText, { color: order.payment_status === 'PAID' ? COLORS.success : COLORS.warning }]}>
                                    {order.payment_status === 'PAID' ? t("admin.paid") : t("admin.unpaid")}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Customer Info */}
                <View style={styles.sectionTitleContainer}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.customerInfo")}</Text>
                </View>
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    <View style={[styles.row]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.name")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>
                            {user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.username || t("common.unknown") : t("common.unknown")}
                        </Text>
                    </View>
                    <View style={[styles.row, { marginTop: 8 }]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.email")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{user?.email || "-"}</Text>
                    </View>
                </View>

                {/* Items */}
                <View style={styles.sectionTitleContainer}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.items")}</Text>
                </View>
                <View style={[styles.card, isRTL && styles.cardRTL]}>
                    {items && items.map((item: any, index: number) => (
                        <View key={index} style={[styles.itemRow, index !== items.length - 1 && styles.borderBottom]}>
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
                {/* Totals */}
                <View style={[styles.card, isRTL && styles.cardRTL, { marginTop: 20 }]}>
                    <View style={[styles.row]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.subtotal")}</Text>
                        <Text style={[styles.value, isRTL && styles.textRTL]}>{order.subtotal || order.total_amount} {currencyLabel}</Text>
                    </View>

                    {order.tax_amount > 0 && (
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.tax")}</Text>
                            <Text style={[styles.value, isRTL && styles.textRTL]}>
                                {t("common.amountPositive", { amount: `${order.tax_amount} ${currencyLabel}` })}
                            </Text>
                        </View>
                    )}

                    {order.discount_amount > 0 && (
                        <View style={[styles.row, { marginTop: 8 }]}>
                            <Text style={[styles.label, { color: COLORS.success }, isRTL && styles.textRTL]}>{t("admin.discount") || "Discount"}</Text>
                            <Text style={[styles.value, { color: COLORS.success }, isRTL && styles.textRTL]}>
                                {t("common.amountNegative", { amount: `${order.discount_amount} ${currencyLabel}` })}
                            </Text>
                        </View>
                    )}

                    {/* Deductions breakdown if available */}

                    <View style={[styles.divider, { marginVertical: 12 }]} />

                    <View style={[styles.row]}>
                        <Text style={[styles.totalLabel, isRTL && styles.textRTL]}>{t("admin.total") || "Total"}</Text>
                        <Text style={[styles.totalValue, isRTL && styles.textRTL]}>{order.total_amount} {currencyLabel}</Text>
                    </View>
                </View>

                {/* Action Buttons */}
                <View style={[styles.actionButtonsContainer]}>
                    <TouchableOpacity
                        style={[styles.backButton]}
                        onPress={handleGoBack}
                    >
                        <Ionicons
                            name={isRTL ? "arrow-forward" : "arrow-back"}
                            size={20}
                            color={COLORS.text}
                        />
                        <Text style={styles.backButtonText}>
                            {t("common.back") || "Back"}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.editButton}
                        onPress={handleEditOrder}
                    >
                        <Ionicons name="create-outline" size={20} color="#fff" />
                        <Text style={styles.editButtonText}>
                            {t("common.edit")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.deleteButton, deleting && styles.deleteButtonDisabled]}
                        onPress={handleDeleteOrder}
                        disabled={deleting}
                    >
                        {deleting ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <>
                                <Ionicons name="trash-outline" size={20} color="#fff" />
                                <Text style={styles.deleteButtonText}>
                                    {t("common.delete")}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>

            </ScrollView>

            {/* Delete Confirmation Modal */}
            <ConfirmModal
                visible={deleteModalVisible}
                title={t("admin.deleteOrder") || "Delete Order"}
                message={t("admin.deleteOrderConfirm") || "Are you sure you want to delete this order? This action cannot be undone."}
                type="danger"
                confirmText={t("common.delete") || "Delete"}
                cancelText={t("common.cancel") || "Cancel"}
                loading={deleting}
                onConfirm={performDelete}
                onCancel={() => setDeleteModalVisible(false)}
            />

            {/* Edit Confirmation Modal */}
            <ConfirmModal
                visible={editModalVisible}
                title={t("admin.editOrder") || "Edit Order"}
                message={t("admin.editOrderConfirm") || "Do you want to edit this order?"}
                type="info"
                confirmText={t("common.edit") || "Edit"}
                cancelText={t("common.cancel") || "Cancel"}
                onConfirm={performEdit}
                onCancel={() => setEditModalVisible(false)}
            />

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
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
        width: '100%',
        maxWidth: '100%',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
    cardRTL: {
        // RTL card adjustments
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
    actionButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 24,
        marginBottom: 40,
        gap: 12,
        paddingHorizontal: 0,
    },

    backButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.cardBg,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        minWidth: 0,
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    deleteButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.error,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
        shadowColor: COLORS.error,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 0,
    },
    deleteButtonDisabled: {
        opacity: 0.6,
    },
    deleteButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    editButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 6,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
        minWidth: 0,
    },
    editButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
});
