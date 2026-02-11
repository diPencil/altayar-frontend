import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView } from 'react-native-webview';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Linking } from 'react-native';
import { cardsApi } from '../../src/services/api';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';

const COLORS = {
    primary: '#1071b8',
    background: '#f0f9ff',
    white: '#ffffff',
    text: '#1e293b',
};

export default function AddCardScreen() {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();

    useEffect(() => {
        initializeCardSession();
    }, []);

    const initializeCardSession = async () => {
        try {
            console.log('[AddCard] Initializing card session...');
            setLoading(true);
            const response = await cardsApi.initAddCard();
            console.log('[AddCard] API Response:', response);
            if (response && response.url) {
                if (Platform.OS === 'web') {
                    // On Web, open in new tab to bypass X-Frame-Options
                    setUrl(response.url);
                    window.open(response.url, '_blank');
                    // We keep the screen open with a message to return after finishing
                } else {
                    setUrl(response.url);
                }
            } else {
                throw new Error("No URL returned from server");
            }
        } catch (error: any) {
            console.error('[AddCard] Initialization error:', error);
            Alert.alert(
                t('common.error'),
                error.message || t('profile.failedToInitCard', 'Failed to initialize card addition')
            );
            router.back();
        } finally {
            console.log('[AddCard] Session initialization complete.');
            setLoading(false);
        }
    };

    const handleNavigationStateChange = (navState: any) => {
        const { url } = navState;

        // Check for success URL (defined in backend service)
        if (url.includes('/payment/card-success') || url.includes('success=true')) {
            // Success
            router.back();
            Alert.alert(t('common.success'), t('profile.cardAddedSuccess', 'Card added successfully'));
            return;
        }

        // Check for failure
        if (url.includes('/payment/card-fail') || url.includes('success=false')) {
            router.back();
            Alert.alert(t('common.error'), t('profile.cardAddedFailed', 'Failed to add card'));
            return;
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={COLORS.primary} />
                <Text style={styles.loadingText}>{t('common.loading', 'Loading...')}</Text>
            </View>
        );
    }

    if (!url) {
        return (
            <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={COLORS.primary} />
                <Text style={styles.loadingText}>{t('common.error', 'Error loading payment screen')}</Text>
                <TouchableOpacity onPress={initializeCardSession} style={{ marginTop: 20, padding: 10, backgroundColor: COLORS.primary, borderRadius: 8 }}>
                    <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>{t('common.retry', 'Retry')}</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('profile.addNewCard', 'Add New Card')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {Platform.OS === 'web' && (
                <View style={styles.webGuidance}>
                    <Ionicons name="open-outline" size={32} color={COLORS.primary} />
                    <Text style={styles.webGuidanceText}>
                        {t('profile.webPaymentGuidance', 'Please complete the card details in the new tab that opened. Once finished, return here.')}
                    </Text>
                    <TouchableOpacity onPress={() => router.back()} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>{t('common.done', 'Done')}</Text>
                    </TouchableOpacity>
                </View>
            )}

            <WebView
                source={{ uri: url }}
                style={[styles.webview, Platform.OS === 'web' && { display: 'none' }]}
                onNavigationStateChange={handleNavigationStateChange}
                startInLoadingState={true}
                renderLoading={() => (
                    <View style={styles.webviewLoading}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                )}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        height: 60,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        backgroundColor: COLORS.white,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    closeButton: {
        padding: 8,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        color: COLORS.text,
        textAlign: 'center',
    },
    webview: {
        flex: 1,
    },
    webviewLoading: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    webGuidance: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 16,
    },
    webGuidanceText: {
        fontSize: 16,
        color: COLORS.text,
        textAlign: 'center',
        lineHeight: 24,
    },
    retryButton: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        elevation: 2,
    },
    retryButtonText: {
        color: COLORS.white,
        fontWeight: 'bold',
        fontSize: 16,
    },
});
