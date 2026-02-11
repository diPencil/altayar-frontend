import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";

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

export default function PaymentDetails() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const params = useLocalSearchParams();
    const paymentId = params.id as string;

    const [payment, setPayment] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchPaymentDetails();
    }, [paymentId]);

    const fetchPaymentDetails = async () => {
        try {
            setLoading(true);
            // Use api.get which handles authentication properly
            const { api } = await import('../../../src/services/api');

            console.log('[PaymentDetails] Fetching payment:', paymentId);
            console.log('[PaymentDetails] API Base URL:', api.getBaseUrl());
            console.log('[PaymentDetails] Token present:', api.getToken() ? 'Yes' : 'No');

            const data = await api.get(`/admin/payments/${paymentId}`);
            console.log('[PaymentDetails] Successfully fetched payment data:', data);
            setPayment(data);
        } catch (e: any) {
            console.error("[PaymentDetails] Error fetching payment:", e);
            console.error("[PaymentDetails] Error name:", e.name);
            console.error("[PaymentDetails] Error message:", e.message);

            // Show user-friendly error based on error type
            let errorMessage = 'Failed to load payment details';

            if (e.message?.includes('Authentication required')) {
                errorMessage = 'Please log in again to view payment details';
            } else if (e.message?.includes('Access denied') || e.message?.includes('Admin privileges')) {
                errorMessage = 'You do not have permission to view this payment';
            } else if (e.message?.includes('not found')) {
                errorMessage = 'Payment not found';
            } else if (e.message?.includes('Cannot connect') || e.message?.includes('CORS')) {
                errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
            } else if (e.message) {
                errorMessage = e.message;
            }

            console.error('[PaymentDetails] User-facing error:', errorMessage);
            // Note: Alert is not available in React Native without import
            // The error will be shown via the empty state in the UI
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: any = {
            PAID: COLORS.success,
            COMPLETED: COLORS.success,
            PENDING: COLORS.warning,
            FAILED: COLORS.error,
            EXPIRED: COLORS.textLight,
        };
        return colors[status] || COLORS.textLight;
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: t('admin.managePayments.details') || "Payment Details" }} />
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
            </View>
        );
    }

    if (!payment) {
        return (
            <View style={styles.container}>
                <Stack.Screen options={{ title: t('admin.managePayments.details') || "Payment Details" }} />
                <Text style={styles.errorText}>{t('admin.managePayments.notFound') || "Payment not found"}</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: t('admin.managePayments.details') || "Payment Details" }} />

            {/* Payment Status Card */}
            <View style={styles.card}>
                <View style={[styles.statusHeader, { backgroundColor: `${getStatusColor(payment.status)}15` }]}>
                    <Ionicons
                        name={payment.status === 'PAID' || payment.status === 'COMPLETED' ? "checkmark-circle" : "time"}
                        size={32}
                        color={getStatusColor(payment.status)}
                    />
                    <Text style={[styles.statusText, { color: getStatusColor(payment.status) }]}>
                        {payment.status}
                    </Text>
                </View>

                <View style={styles.amountSection}>
                    <Text style={styles.amountLabel}>{t('admin.managePayments.amount')}</Text>
                    <Text style={styles.amountValue}>{payment.amount} {payment.currency || 'USD'}</Text>
                </View>
            </View>

            {/* Payment Information */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('admin.managePayments.paymentInfo')}</Text>

                <InfoRow label={t('admin.managePayments.paymentId')} value={payment.id} />
                <InfoRow label={t('admin.managePayments.type')} value={payment.payment_type || 'N/A'} />
                <InfoRow label={t('admin.managePayments.source')} value={payment.source || 'N/A'} />
                <InfoRow label={t('admin.managePayments.method')} value={payment.payment_method || 'N/A'} />
                <InfoRow label={t('admin.managePayments.date')} value={new Date(payment.created_at).toLocaleString()} />
                {payment.transaction_id && (
                    <InfoRow label={t('admin.managePayments.transactionId')} value={payment.transaction_id} />
                )}
            </View>

            {/* Customer Information */}
            {payment.user && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('admin.managePayments.customerInfo')}</Text>

                    <InfoRow
                        label={t('admin.managePayments.customer')}
                        value={`${payment.user.first_name} ${payment.user.last_name}`}
                    />
                    <InfoRow label={t('common.email')} value={payment.user.email} />
                    {payment.user.phone && (
                        <InfoRow label={t('common.phone')} value={payment.user.phone} />
                    )}
                </View>
            )}

            {/* Related Order/Booking */}
            {payment.order_id && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('admin.managePayments.relatedOrder')}</Text>

                    <InfoRow label={t('admin.managePayments.orderId')} value={payment.order_id} />

                    <TouchableOpacity
                        style={styles.viewOrderBtn}
                        onPress={() => router.push(`/(admin)/orders/${payment.order_id}`)}
                    >
                        <Text style={styles.viewOrderText}>{t('admin.managePayments.viewOrder')}</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>
            )}

            {/* Additional Details */}
            {payment.description && (
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>{t('admin.managePayments.description')}</Text>
                    <Text style={styles.descriptionText}>{payment.description}</Text>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={styles.infoValue}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    statusHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        marginBottom: 16,
    },
    statusText: {
        fontSize: 20,
        fontWeight: 'bold',
        marginStart: 12,
    },
    amountSection: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    amountLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    amountValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 12,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    infoLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        flex: 1,
    },
    infoValue: {
        fontSize: 14,
        color: COLORS.text,
        fontWeight: '500',
        flex: 2,
        textAlign: 'right',
    },
    viewOrderBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `${COLORS.primary}15`,
        padding: 12,
        borderRadius: 8,
        marginTop: 12,
    },
    viewOrderText: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginEnd: 8,
    },
    descriptionText: {
        fontSize: 14,
        color: COLORS.text,
        lineHeight: 20,
    },
    errorText: {
        fontSize: 16,
        color: COLORS.error,
        textAlign: 'center',
        marginTop: 50,
    },
});
