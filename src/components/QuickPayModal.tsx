import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { paymentsApi } from '../services/api';
import { useLanguage } from '../contexts/LanguageContext';

interface QuickPayModalProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: (paymentId: string) => void;
}

const COLORS = {
    primary: '#1071b8',
    background: '#f0f9ff',
    text: '#1e293b',
    textLight: '#64748b',
    border: '#e2e8f0',
    white: '#ffffff',
    error: '#ef4444',
};

export default function QuickPayModal({ visible, onClose, onSuccess }: QuickPayModalProps) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('EGP');
    const [loading, setLoading] = useState(false);

    const handlePay = async () => {
        if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
            Alert.alert(t('common.error'), t('admin.bookings.errorPrice'));
            return;
        }

        try {
            setLoading(true);
            const res = await paymentsApi.quickPay(parseFloat(amount), currency);
            if (res && res.payment_url) {
                onSuccess(res.payment_id);
            } else {
                Alert.alert(t('common.error'), t('admin.managePayments.status.failed'));
            }
        } catch (error: any) {
            Alert.alert(t('common.error'), error.message || t('common.somethingWentWrong'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={styles.content} onStartShouldSetResponder={() => true}>
                    <View style={[styles.header]}>
                        <Text style={styles.title}>{t('admin.managePayments.title')}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.body}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('common.amount')}</Text>
                        <View style={[styles.inputContainer]}>
                            <TextInput
                                style={[styles.input, isRTL && styles.textRTL]}
                                placeholder="0.00"
                                keyboardType="numeric"
                                value={amount}
                                onChangeText={setAmount}
                            />
                            <View style={styles.currencySelector}>
                                <TouchableOpacity
                                    style={[styles.currencyOption, currency === 'EGP' && styles.currencyOptionActive]}
                                    onPress={() => setCurrency('EGP')}
                                >
                                    <Text style={[styles.currencyText, currency === 'EGP' && styles.currencyTextActive]}>EGP</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.currencyOption, currency === 'USD' && styles.currencyOptionActive]}
                                    onPress={() => setCurrency('USD')}
                                >
                                    <Text style={[styles.currencyText, currency === 'USD' && styles.currencyTextActive]}>USD</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.payButton, loading && styles.payButtonDisabled]}
                            onPress={handlePay}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.payButtonText}>{t('common.payNow')}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    content: {
        width: '100%',
        maxWidth: 400,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },

    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    body: {
        gap: 16,
    },
    label: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        height: 50,
    },

    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.text,
        height: '100%',
    },
    textRTL: {
        textAlign: 'right',
    },
    currencySelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 4,
        marginStart: 8,
    },
    currencyOption: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    currencyOptionActive: {
        backgroundColor: COLORS.primary,
    },
    currencyText: {
        fontSize: 12,
        fontWeight: '600',
        color: COLORS.textLight,
    },
    currencyTextActive: {
        color: '#fff',
    },
    payButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    payButtonDisabled: {
        opacity: 0.7,
    },
    payButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
