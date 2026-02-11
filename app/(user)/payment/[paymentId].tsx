
import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Platform, Text, TouchableOpacity, Linking, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useTranslation } from "react-i18next";
import { Ionicons } from '@expo/vector-icons';

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

        // Set timeout for slow loading (5 seconds warning)
        timeoutRef.current = setTimeout(() => {
            if (isLoading) {
                setShowSlowWarning(true);
            }
        }, 5000);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [paymentUrl]);

    const handleNavigationStateChange = (navState: any) => {
        const { url, loading } = navState;
        
        if (!loading) {
            setIsLoading(false);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        }

        const u = String(url || '').toLowerCase();
        if (u.includes('/payment/success') || u.includes('://payment/success')) {
            router.replace({ pathname: '/(user)/payment/success', params: { paymentId } });
        } else if (u.includes('/payment/fail') || u.includes('://payment/fail')) {
            router.replace({ pathname: '/(user)/payment/fail', params: { paymentId } });
        }
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            
            {/* Custom Header (Since tabs are hidden) */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("payment.secureCheckout") || "Secure Checkout"}</Text>
                <View style={{ width: 40 }} /> 
            </View>

            <View style={styles.container}>
                <WebView
                    source={{ uri: paymentUrl }}
                    onNavigationStateChange={handleNavigationStateChange}
                    onLoadEnd={() => setIsLoading(false)}
                    onLoadStart={() => setIsLoading(true)}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    startInLoadingState={true}
                    renderLoading={() => (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <Text style={styles.loadingText}>{t("payment.processing") || "Connecting to Gateway..."}</Text>
                        </View>
                    )}
                />

                {/* Slow Connection Warning */}
                {showSlowWarning && isLoading && (
                    <View style={styles.warningOverlay}>
                        <View style={styles.warningCard}>
                            <Ionicons name="wifi" size={40} color="#ff9500" style={{ marginBottom: 10 }} />
                            <Text style={styles.warningTitle}>{t("payment.slowConnection") || "Taking longer than usual..."}</Text>
                            <Text style={styles.warningText}>
                                {t("payment.slowConnectionDesc") || "The payment page is taking time to load. Please wait or try opening in browser."}
                            </Text>
                            
                            <TouchableOpacity style={styles.browserButton} onPress={() => Linking.openURL(paymentUrl)}>
                                <Text style={styles.browserButtonText}>{t("payment.openInBrowser") || "Open in Browser"}</Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity style={styles.waitButton} onPress={() => setShowSlowWarning(false)}>
                                <Text style={styles.waitButtonText}>{t("payment.keepWaiting") || "Keep Waiting"}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()}>
                                <Text style={styles.cancelButtonText}>{t("common.cancel")}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    header: {
        height: 56,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    loadingContainer: {
        position: 'absolute',
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#fff',
        zIndex: 10,
    },
    loadingText: {
        marginTop: 15,
        fontSize: 16,
        color: '#666',
    },
    warningOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 20,
    },
    warningCard: {
        backgroundColor: '#fff',
        padding: 24,
        borderRadius: 16,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        elevation: 10,
    },
    warningTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    warningText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
    },
    browserButton: {
        backgroundColor: '#34C759',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '100%',
        marginBottom: 10,
    },
    browserButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    waitButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        width: '100%',
        marginBottom: 10,
    },
    waitButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        textAlign: 'center',
    },
    cancelButton: {
        paddingVertical: 10,
    },
    cancelButtonText: {
        color: '#FF3B30',
        fontWeight: '600',
    },
});
