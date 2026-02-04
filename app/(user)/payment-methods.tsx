import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, SafeAreaView, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { LinearGradient } from 'expo-linear-gradient';
import { cardsApi, UserCard } from '../../src/services/api';

const COLORS = {
    primary: '#0891b2',
    background: '#f0f9ff',
    white: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    error: '#ef4444',
    success: '#10b981',
    cardBg: '#1e293b',
};

export default function PaymentMethodsScreen() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [cards, setCards] = useState<UserCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Load cards when screen focuses (e.g. returning from Add Card)
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
            // Silent error or toast
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
                            loadCards(); // Refresh
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

    if (loading && cards.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={[styles.header, isRTL && styles.headerRTL]}>
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
            <View style={[styles.header, isRTL && styles.headerRTL]}>
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
                {/* Saved Cards List */}
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                    {t('profile.savedCards', 'Saved Cards')}
                </Text>

                {cards.length > 0 ? (
                    cards.map((card) => (
                        <View key={card.id} style={styles.cardItem}>
                            <LinearGradient
                                colors={['#1e293b', '#0f172a']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.cardGradient}
                            >
                                <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
                                    {/* Brand Icon Placeholder */}
                                    <View style={styles.brandIcon}>
                                        <Ionicons name={getCardIcon(card.brand) as any} size={24} color="#fff" />
                                    </View>
                                    <TouchableOpacity onPress={() => handleDelete(card.id)} style={styles.deleteBtn}>
                                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.cardBody}>
                                    <Text style={styles.cardNumber}>
                                        {t("common.maskedCardLast4", { last4: card.last4 })}
                                    </Text>
                                </View>

                                <View style={[styles.cardFooter, isRTL && styles.rowRTL]}>
                                    <View>
                                        <Text style={styles.cardLabel}>{t('common.cardHolder', 'Card Holder')}</Text>
                                        <Text style={styles.cardValue}>{card.holder_name || 'My Card'}</Text>
                                    </View>
                                    <View>
                                        <Text style={styles.cardLabel}>{t('common.expires', 'Expires')}</Text>
                                        <Text style={styles.cardValue}>
                                            {card.expiry_month && card.expiry_year
                                                ? `${card.expiry_month}/${card.expiry_year.slice(-2)}`
                                                : '**/**'}
                                        </Text>
                                    </View>
                                </View>
                            </LinearGradient>
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

                {/* Add New Card Button */}
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

            </ScrollView>
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
    cardItem: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
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
    }
});
