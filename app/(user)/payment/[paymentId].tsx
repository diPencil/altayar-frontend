import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform, Text, TouchableOpacity, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTranslation } from "react-i18next";

export default function PaymentScreen() {
    const params = useLocalSearchParams<{ paymentId: string; paymentUrl: string }>();
    const { paymentId, paymentUrl } = params;
    const router = useRouter();
    const { t } = useTranslation();
    const [isLoading, setIsLoading] = useState(true);
    const [showSlowWarning, setShowSlowWarning] = useState(false);
    const timeoutRef = useRef<any>(null);

    useEffect(() => {
        if (!paymentUrl) {
            Alert.alert(t("common.error"), t("payment.missingPaymentUrl"));
            router.back();
            return;
        }

        // Set timeout for slow loading
        timeoutRef.current = setTimeout(() => {
            if (isLoading) {
                setShowSlowWarning(true);
            }
        }, 10000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [paymentUrl]);

    const handleNavigationStateChange = (navState: any) => {
        const { url, loading } = navState;
        console.log('Navigation URL:', url, 'Loading:', loading);

        // Clear loading when navigation starts
        if (!loading) {
            setIsLoading(false);
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        }

        // Check for success/fail redirects.
        // IMPORTANT: don't match generic "success"/"fail" substrings (can false-positive).
        const u = String(url || '').toLowerCase();
        if (u.includes('/payment/success') || u.includes('://payment/success')) {
            router.replace({
                pathname: '/(user)/payment/success',
                params: { paymentId }
            });
        } else if (u.includes('/payment/fail') || u.includes('://payment/fail')) {
            router.replace({
                pathname: '/(user)/payment/fail',
                params: { paymentId }
            });
        }
    };

    const handleLoadEnd = () => {
        setIsLoading(false);
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    };

    const handleOpenInBrowser = async () => {
        try {
            const supported = await Linking.canOpenURL(paymentUrl);
            if (supported) {
                await Linking.openURL(paymentUrl);
                // Don't go back - let user complete payment in browser
            } else {
                Alert.alert('خطأ', 'لا يمكن فتح الرابط');
            }
        } catch (error) {
            Alert.alert('خطأ', 'فشل فتح المتصفح');
        }
    };

    if (!paymentUrl) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <WebView
                source={{ uri: paymentUrl }}
                onNavigationStateChange={handleNavigationStateChange}
                onLoadEnd={handleLoadEnd}
                onLoadStart={() => setIsLoading(true)}
                javaScriptEnabled={true}
                domStorageEnabled={true}
                thirdPartyCookiesEnabled={true}
                sharedCookiesEnabled={true}
                startInLoadingState={true}
                scalesPageToFit={true}
                mixedContentMode="always"
                allowsInlineMediaPlayback={true}
                mediaPlaybackRequiresUserAction={false}
                onError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView error:', nativeEvent);
                    setIsLoading(false);
                }}
                onHttpError={(syntheticEvent) => {
                    const { nativeEvent } = syntheticEvent;
                    console.error('WebView HTTP error:', nativeEvent);
                }}
            />

            {isLoading && (
                <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <Text style={styles.loadingText}>{t("payment.gatewayLoadingTitle")}</Text>
                    <Text style={styles.loadingSubText}>{t("payment.gatewayLoadingSubtitle")}</Text>
                </View>
            )}

            {showSlowWarning && (
                <View style={styles.warningOverlay}>
                    <View style={styles.warningCard}>
                        <Text style={styles.warningTitle}>{t("payment.gatewaySlowTitle")}</Text>
                        <Text style={styles.warningText}>
                            {t("payment.gatewaySlowSubtitle")}
                        </Text>
                        <TouchableOpacity
                            style={styles.browserButton}
                            onPress={handleOpenInBrowser}
                        >
                            <Text style={styles.browserButtonText}>{t("payment.openInBrowser")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.waitButton}
                            onPress={() => setShowSlowWarning(false)}
                        >
                            <Text style={styles.waitButtonText}>{t("payment.wait")}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
    },
    loadingSubText: {
        marginTop: 8,
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    warningOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        padding: 20,
    },
    warningCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    warningTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#ff9500',
        marginBottom: 12,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 24,
    },
    browserButton: {
        backgroundColor: '#34C759',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 12,
    },
    browserButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    waitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 12,
    },
    waitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    cancelButton: {
        backgroundColor: '#f0f0f0',
        paddingVertical: 14,
        borderRadius: 12,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
});
