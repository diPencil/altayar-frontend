import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '../../../src/services/paymentService';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';

export default function PaymentSuccessScreen() {
    const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        verifyPayment();
    }, [paymentId]);

    const verifyPayment = async () => {
        try {
            setErrorMessage(null);
            if (!paymentId) {
                throw new Error('Missing paymentId');
            }
            // Poll payment status to confirm it's paid
            const status = await paymentService.pollPaymentStatus(paymentId);
            setPaymentDetails(status);
            setLoading(false);
        } catch (error) {
            console.error('Error verifying payment:', error);
            setErrorMessage(t('payment.verificationFailed', 'تعذر التحقق من حالة الدفع. حاول مرة أخرى.'));
            setLoading(false);
        }
    };

    const handleGoHome = () => {
        router.push('/(user)');
    };

    const handleViewBookings = () => {
        router.push('/(user)/bookings');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={[styles.loadingText, isRTL && styles.rtlText]}>
                    {t('payment.verifying', 'جاري التحقق من الدفع...')}
                </Text>
            </View>
        );
    }

    const statusValue = String(paymentDetails?.status || '').toUpperCase();
    const isPaid = statusValue === 'PAID';
    const isPending = statusValue === 'PENDING';

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Success Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={isPaid ? "checkmark-circle" : isPending ? "time" : "alert-circle"}
                        size={100}
                        color={isPaid ? "#4CAF50" : isPending ? "#ff9500" : "#F44336"}
                    />
                </View>

                {/* Success Message */}
                <Text style={[styles.title, isRTL && styles.rtlText]}>
                    {isPaid
                        ? t('payment.success.title', 'تم الدفع بنجاح!')
                        : isPending
                            ? t('payment.pending.title', 'الدفع قيد المعالجة')
                            : t('payment.notConfirmed.title', 'لم يتم تأكيد الدفع')}
                </Text>

                <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
                    {errorMessage
                        ? errorMessage
                        : isPaid
                            ? t('payment.success.subtitle', 'شكراً لك! تم استلام دفعتك بنجاح')
                            : isPending
                                ? t('payment.pending.subtitle', 'يرجى الانتظار قليلاً ثم إعادة المحاولة للتحقق من الحالة.')
                                : t('payment.notConfirmed.subtitle', 'قد تكون العملية فشلت أو لم تصلنا نتيجة الدفع بعد.')}
                </Text>

                {/* Payment Details */}
                {paymentDetails && (
                    <View style={styles.detailsCard}>
                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                                {t('payment.amount', 'المبلغ')}:
                            </Text>
                            <Text style={[styles.detailValue, isRTL && styles.rtlText]}>
                                {paymentDetails.amount} {paymentDetails.currency}
                            </Text>
                        </View>

                        <View style={styles.detailRow}>
                            <Text style={[styles.detailLabel, isRTL && styles.rtlText]}>
                                {t('payment.status', 'الحالة')}:
                            </Text>
                            <Text
                                style={[
                                    styles.detailValue,
                                    isPaid ? styles.successText : undefined,
                                    !isPaid ? { color: '#ff9500' } : undefined,
                                    isRTL && styles.rtlText,
                                ]}
                            >
                                {isPaid
                                    ? t('payment.paid', 'مدفوع')
                                    : isPending
                                        ? t('payment.statusPending', 'قيد الانتظار')
                                        : t('payment.failed', 'فشل')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Actions */}
                {isPaid ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={handleViewBookings}>
                        <Text style={styles.primaryButtonText}>
                            {t('payment.viewBookings', 'عرض حجوزاتي')}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={verifyPayment}>
                        <Text style={styles.primaryButtonText}>
                            {t('payment.retryVerification', 'إعادة التحقق')}
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.secondaryButton} onPress={handleGoHome}>
                    <Text style={styles.secondaryButtonText}>
                        {t('payment.goHome', 'العودة للرئيسية')}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    iconContainer: {
        marginBottom: 24,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 32,
        textAlign: 'center',
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 32,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: '#666',
    },
    detailValue: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    successText: {
        color: '#4CAF50',
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#007AFF',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: 'transparent',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#007AFF',
    },
    secondaryButtonText: {
        color: '#007AFF',
        fontSize: 16,
        fontWeight: '600',
    },
    rtlText: {
        textAlign: 'right',
        writingDirection: 'rtl',
    },
});
