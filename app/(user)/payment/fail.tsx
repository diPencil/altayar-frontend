import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import paymentService from '../../../src/services/paymentService';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../src/contexts/LanguageContext';

export default function PaymentFailScreen() {
    const { paymentId } = useLocalSearchParams<{ paymentId: string }>();
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    const [loading, setLoading] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState<any>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        loadPaymentDetails();
    }, [paymentId]);

    useEffect(() => {
        const statusValue = String(paymentDetails?.status || '').toUpperCase();
        if (statusValue === 'PAID' && paymentId) {
            router.replace({ pathname: '/(user)/payment/success', params: { paymentId } });
        }
    }, [paymentDetails?.status, paymentId]);

    const loadPaymentDetails = async () => {
        try {
            setErrorMessage(null);
            const status = await paymentService.getPaymentStatus(paymentId);
            setPaymentDetails(status);
            setLoading(false);
        } catch (error) {
            console.error('Error loading payment:', error);
            setErrorMessage(t('payment.verificationFailed', 'تعذر التحقق من حالة الدفع. حاول مرة أخرى.'));
            setLoading(false);
        }
    };

    const handleRetry = () => {
        // Go back to payment screen to retry
        router.back();
    };

    const handleGoHome = () => {
        router.push('/(user)');
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#F44336" />
            </View>
        );
    }

    const statusValue = String(paymentDetails?.status || '').toUpperCase();
    const isPending = statusValue === 'PENDING';

    return (
        <View style={styles.container}>
            <View style={styles.content}>
                {/* Fail Icon */}
                <View style={styles.iconContainer}>
                    <Ionicons
                        name={isPending ? "time" : "close-circle"}
                        size={100}
                        color={isPending ? "#ff9500" : "#F44336"}
                    />
                </View>

                {/* Fail Message */}
                <Text style={[styles.title, isRTL && styles.rtlText]}>
                    {isPending ? t('payment.pending.title', 'الدفع قيد المعالجة') : t('payment.fail.title', 'فشل الدفع')}
                </Text>

                <Text style={[styles.subtitle, isRTL && styles.rtlText]}>
                    {errorMessage ||
                        paymentDetails?.error_message ||
                        (isPending
                            ? t('payment.pending.subtitle', 'يرجى الانتظار قليلاً ثم إعادة المحاولة للتحقق من الحالة.')
                            : t('payment.fail.subtitle', 'عذراً، لم نتمكن من إتمام عملية الدفع'))}
                </Text>

                {/* Error Details */}
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
                            <Text style={[styles.detailValue, styles.failText, isRTL && styles.rtlText]}>
                                {isPending ? t('payment.statusPending', 'قيد الانتظار') : t('payment.failed', 'فشل')}
                            </Text>
                        </View>
                    </View>
                )}

                {/* Suggestions */}
                <View style={styles.suggestionsCard}>
                    <Text style={[styles.suggestionsTitle, isRTL && styles.rtlText]}>
                        {t('payment.fail.suggestions', 'يرجى المحاولة مرة أخرى أو:')}
                    </Text>
                    <Text style={[styles.suggestionItem, isRTL && styles.rtlText]}>
                        • {t('payment.fail.checkBalance', 'تحقق من رصيد بطاقتك')}
                    </Text>
                    <Text style={[styles.suggestionItem, isRTL && styles.rtlText]}>
                        • {t('payment.fail.checkDetails', 'تأكد من صحة بيانات البطاقة')}
                    </Text>
                    <Text style={[styles.suggestionItem, isRTL && styles.rtlText]}>
                        • {t('payment.fail.tryAnother', 'جرب طريقة دفع أخرى')}
                    </Text>
                </View>

                {/* Actions */}
                {isPending ? (
                    <TouchableOpacity style={styles.primaryButton} onPress={loadPaymentDetails}>
                        <Text style={styles.primaryButtonText}>
                            {t('payment.retryVerification', 'إعادة التحقق')}
                        </Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.primaryButton} onPress={handleRetry}>
                        <Text style={styles.primaryButtonText}>
                            {t('payment.retry', 'إعادة المحاولة')}
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
        marginBottom: 24,
        textAlign: 'center',
    },
    detailsCard: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
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
    failText: {
        color: '#F44336',
    },
    suggestionsCard: {
        width: '100%',
        backgroundColor: '#FFF3E0',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
    },
    suggestionsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#E65100',
        marginBottom: 12,
    },
    suggestionItem: {
        fontSize: 14,
        color: '#E65100',
        marginBottom: 6,
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
