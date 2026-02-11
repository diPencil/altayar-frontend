import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

const COLORS = {
    primary: "#1071b8",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    lightGray: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
};

export default function ForgotPasswordScreen() {
    const { isRTL } = useLanguage();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSendCode = async () => {
        if (!email) {
            Alert.alert(t('common.error'), "Please enter your email address");
            return;
        }

        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            Alert.alert(t('common.error'), "Please enter a valid email address");
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/forgot-password', { email });

            Alert.alert(
                t('common.success'),
                "If the email exists, a reset code has been sent. Please check your email.",
                [
                    {
                        text: t('common.ok'),
                        onPress: () => router.push({
                            pathname: "/(auth)/reset-password",
                            params: { email }
                        })
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error.message || "Failed to send reset code"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={[styles.header, isRTL && styles.headerRTL]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t("auth.forgotPasswordTitle")}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <View style={styles.content}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="lock-closed" size={64} color={COLORS.primary} />
                    </View>

                    <Text style={[styles.title, isRTL && styles.textRTL]}>{t("auth.resetPasswordTitle")}</Text>
                    <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t("auth.resetPasswordSubtitle")}</Text>

                    <View style={styles.form}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>
                            {t("auth.emailAddress")}
                        </Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={email}
                            onChangeText={setEmail}
                            placeholder={t("auth.placeholders.email")}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            textAlign={isRTL ? 'right' : 'left'}
                        />

                        <TouchableOpacity
                            style={[styles.sendBtn, loading && styles.sendBtnDisabled]}
                            onPress={handleSendCode}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.sendBtnText}>{t("auth.sendResetCode")}</Text>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.backToLogin}
                            onPress={() => router.back()}
                        >
                            <Text style={styles.backToLoginText}>
                                {t("auth.rememberPasswordPrompt")} <Text style={styles.loginLink}>{t("common.login")}</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.lightGray,
    },
    headerRTL: {
        flexDirection: "row-reverse",
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: COLORS.text,
    },
    content: {
        flex: 1,
        padding: 24,
    },
    iconContainer: {
        alignItems: "center",
        marginTop: 40,
        marginBottom: 24,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
        textAlign: "center",
        marginBottom: 12,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: "center",
        marginBottom: 32,
        lineHeight: 20,
    },
    form: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        padding: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    textRTL: {
        textAlign: "right",
    },
    input: {
        backgroundColor: COLORS.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.text,
        marginBottom: 20,
    },
    inputRTL: {
        textAlign: "right",
    },
    sendBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
        marginBottom: 16,
    },
    sendBtnDisabled: {
        opacity: 0.7,
    },
    sendBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
    backToLogin: {
        alignItems: "center",
        paddingVertical: 12,
    },
    backToLoginText: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    loginLink: {
        color: COLORS.primary,
        fontWeight: "600",
    },
});
