
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView, ActivityIndicator, RefreshControl, Modal, TextInput, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { cardsApi, paymentsApi, UserCard } from '../../src/services/api';
import * as WebBrowser from 'expo-web-browser';

const COLORS = {
    primary: '#1071b8',
    background: '#f0f9ff',
    white: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    error: '#ef4444',
    success: '#10b981',
    cardBg: '#1e293b',
    inputBg: '#f8fafc',
    border: '#e2e8f0',
};

export default function PaymentMethodsScreen() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [cards, setCards] = useState<UserCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    // Quick Pay State
    const [quickPayVisible, setQuickPayVisible] = useState(false);
    const [amount, setAmount] = useState('');
    const [processingQuickPay, setProcessingQuickPay] = useState(false);

    useFocusEffect(
        useCallback(() => {
            loadCards();
        }, [])
    );

    const loadCards = async () => {
        try {
            setLoading(true);
            const data = await cardsApi.getCards();
            setCards(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        loadCards();
    };

    const handleDelete = (id: string) => {
        Alert.alert(
            t('common.confirm', 'Confirm'),
            t('profile.deleteCardConfirm', 'Are you sure you want to remove this card?'),
            [
                { text: t('common.cancel', 'Cancel'), style: 'cancel' },
                {
                    text: t('common.delete', 'Delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await cardsApi.deleteCard(id);
                            loadCards();
                        } catch (error) {
                            Alert.alert(t('common.error'), t('common.somethingWentWrong'));
                        }
                    }
                }
            ]
        );
    };

    const handleAddCard = () => {
        router.push('/(user)/add-card' as any);
    };

    const getCardIcon = (brand: string) => {
        const b = brand?.toLowerCase() || '';
        if (b.includes('visa')) return 'card';
        if (b.includes('master')) return 'card';
        return 'card-outline';
    };

    // External E-Payment Link
    const handleExternalPayment = async () => {
        try {
            await WebBrowser.openBrowserAsync('https://app.fawaterk.com/ec/altayarvip-e-payment');
        } catch (error) {
            Alert.alert(t('common.error'), 'Could not open payment link');
        }
    };

    // Online Payment (Quick Pay) Logic
    const handleQuickPay = async () => {
        const value = parseFloat(amount);
        if (!amount || isNaN(value) || value < 10) {
            Alert.alert(t('common.error'), t('payment.minAmountError', 'Minimum amount is 10 EGP'));
            return;
        }

        try {
            setProcessingQuickPay(true);
            Keyboard.dismiss();

            const response = await paymentsApi.quickPay(value, 'EGP');

            if (response.payment_url) {
                setQuickPayVisible(false);
                setAmount('');
                // Navigate to payment screen
                router.push({
                    pathname: '/(user)/payment/[paymentId]',
                    params: {
                        paymentId: response.payment_id,
                        paymentUrl: response.payment_url
                    }
                });
            } else {
                Alert.alert(t('common.error'), t('payment.initFailed', 'Failed to initiate payment'));
            }
        } catch (error: any) {
            console.error(error);
            Alert.alert(t('common.error'), error.message || t('common.somethingWentWrong'));
        } finally {
            setProcessingQuickPay(false);
        }
    };

    if (loading && cards.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.white} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                        {t('profile.paymentMethods', 'Payment Methods')}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                    {t('profile.paymentMethods', 'Payment Methods')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* --- Quick Actions Section --- */}
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('payment.quickActions', 'Quick Actions')}
                </Text>

                {/* 1. E-Payment Checkout (External Link) */}
                <TouchableOpacity
                    style={styles.quickPayButton}
                    onPress={handleExternalPayment}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#0ea5e9', '#0284c7']}
                        style={styles.quickPayGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <View style={styles.quickPayIcon}>
                            <Ionicons name="globe-outline" size={24} color="#fff" />
                        </View>
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <Text style={styles.quickPayTitle}>{t('payment.ePaymentCheckout', 'E-Payment Checkout')}</Text>
                            <Text style={styles.quickPaySubtitle}>{t('payment.payExternalLink', 'Pay via Fawaterk page')}</Text>
                        </View>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* 2. Online Payment (In-App Modal) */}
                <TouchableOpacity
                    style={styles.quickPayButton}
                    onPress={() => setQuickPayVisible(true)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#8b5cf6', '#6d28d9']}
                        style={styles.quickPayGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.quickPayIcon}>
                            <Ionicons name="card" size={24} color="#fff" />
                        </View>
                        <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                            <Text style={styles.quickPayTitle}>{t('payment.onlinePayment', 'Online Payment')}</Text>
                            <Text style={styles.quickPaySubtitle}>{t('payment.enterCustomAmount', 'Pay any amount directly')}</Text>
                        </View>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={24} color="rgba(255,255,255,0.7)" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* 
                Since Tokenization is not enabled in the gateway, we hide Saved Cards for now.
                
                <View style={styles.divider} />

                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('profile.savedCards', 'Saved Cards')}
                </Text>

                {cards.length > 0 ? (
                    cards.map((card) => (
                        <View key={card.id} style={styles.cardItem}>
                             ... 
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="card-outline" size={64} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>
                            {t('profile.noCards', 'No saved cards found')}
                        </Text>
                    </View>
                )}

                <TouchableOpacity style={styles.addButton} onPress={handleAddCard}>
                    <LinearGradient
                        colors={[COLORS.primary, '#0e7490']}
                        style={styles.addButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="add" size={24} color={COLORS.white} />
                        <Text style={styles.addButtonText}>
                            {t('profile.addNewCard', 'Add New Card')}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity> 
                */}

            </ScrollView>

            {/* Quick Pay Modal */}
            <Modal
                visible={quickPayVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setQuickPayVisible(false)}
            >
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.modalOverlay}
                >
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>{t('payment.ePaymentCheckout', 'E-Payment Checkout')}</Text>
                            <TouchableOpacity onPress={() => setQuickPayVisible(false)}>
                                <Ionicons name="close" size={24} color={COLORS.text} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>{t('payment.enterAmount', 'Enter Amount (EGP)')}</Text>

                        <View style={styles.inputContainer}>
                            <Text style={styles.currencySymbol}>EGP</Text>
                            <TextInput
                                style={styles.amountInput}
                                value={amount}
                                onChangeText={setAmount}
                                placeholder="0.00"
                                keyboardType="decimal-pad"
                                autoFocus={true}
                            />
                        </View>
                        <Text style={styles.helperText}>{t('payment.minAmount', 'Minimum: 10 EGP')}</Text>

                        <TouchableOpacity
                            style={styles.payButton}
                            onPress={handleQuickPay}
                            disabled={processingQuickPay}
                        >
                            {processingQuickPay ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.payButtonText}>{t('payment.payNow', 'Pay Now')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 10,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    textRTL: {
        textAlign: 'right',
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    content: {
        padding: 16,
        paddingBottom: 40,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    divider: {
        height: 1,
        backgroundColor: '#e2e8f0',
        marginVertical: 20,
    },
    quickPayButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        marginBottom: 8,
    },
    quickPayGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    quickPayIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    quickPayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 4,
    },
    quickPaySubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    cardItem: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
    },
    cardGradient: {
        padding: 24,
        minHeight: 180,
        justifyContent: 'space-between',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    brandIcon: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        padding: 8,
        borderRadius: 8,
    },
    deleteBtn: {
        padding: 8,
    },
    cardBody: {
        marginVertical: 20,
    },
    cardNumber: {
        color: COLORS.white,
        fontSize: 22,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    cardLabel: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 10,
        marginBottom: 4,
        textTransform: 'uppercase',
    },
    cardValue: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        gap: 16,
    },
    emptyText: {
        color: COLORS.textLight,
        fontSize: 16,
    },
    addButton: {
        marginTop: 24,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    addButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        gap: 8,
    },
    addButtonText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: 'bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopStartRadius: 24,
        borderTopEndRadius: 24,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    modalLabel: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.inputBg,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        paddingHorizontal: 16,
        height: 56,
    },
    currencySymbol: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.textLight,
        marginEnd: 8,
    },
    amountInput: {
        flex: 1,
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.primary,
        height: '100%',
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
        marginBottom: 24,
    },
    payButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
    },
    payButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: 'bold',
    }
});
