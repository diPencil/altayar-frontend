import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { api } from "../../src/services/api";

const COLORS = {
    primary: "#0891b2",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    lightGray: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
};

export default function ResetPasswordScreen() {
    const { isRTL } = useLanguage();
    const { t } = useTranslation();
    const params = useLocalSearchParams();
    const email = params.email as string || "";

    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [formData, setFormData] = useState({
        code: "",
        new_password: "",
        confirm_password: "",
    });

    const handleResetPassword = async () => {
        // Validation
        if (!formData.code || formData.code.length !== 6) {
            Alert.alert(t('common.error'), "Please enter the 6-digit code");
            return;
        }

        if (!formData.new_password) {
            Alert.alert(t('common.error'), "Please enter a new password");
            return;
        }

        if (formData.new_password.length < 8) {
            Alert.alert(t('common.error'), "Password must be at least 8 characters");
            return;
        }

        if (!/[A-Z]/.test(formData.new_password)) {
            Alert.alert(t('common.error'), "Password must contain at least one uppercase letter");
            return;
        }

        if (!/[a-z]/.test(formData.new_password)) {
            Alert.alert(t('common.error'), "Password must contain at least one lowercase letter");
            return;
        }

        if (!/\d/.test(formData.new_password)) {
            Alert.alert(t('common.error'), "Password must contain at least one digit");
            return;
        }

        if (formData.new_password !== formData.confirm_password) {
            Alert.alert(t('common.error'), "Passwords do not match");
            return;
        }

        try {
            setLoading(true);
            await api.post('/auth/reset-password', {
                email,
                code: formData.code,
                new_password: formData.new_password,
            });

            Alert.alert(
                t('common.success'),
                "Password reset successfully! You can now login with your new password.",
                [
                    {
                        text: t('common.ok'),
                        onPress: () => router.replace("/(auth)/login")
                    }
                ]
            );
        } catch (error: any) {
            Alert.alert(
                t('common.error'),
                error.response?.data?.detail || error.message || "Failed to reset password"
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                {/* Header */}
                <View style={[styles.header, isRTL && styles.headerRTL]}>
                    <TouchableOpacity onPress={() => router.back()}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t("auth.resetPasswordTitle")}</Text>
                    <View style={{ width: 24 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Icon */}
                    <View style={styles.iconContainer}>
                        <Ionicons name="key" size={64} color={COLORS.primary} />
                    </View>

                    <Text style={[styles.title, isRTL && styles.textRTL]}>{t("auth.enterResetCodeTitle")}</Text>
                    <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t("auth.resetCodeSubtitle", { email })}</Text>

                    <View style={styles.form}>
                        {/* Verification Code */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>
                                {t("auth.verificationCodeLabel")}
                            </Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.inputRTL]}
                                value={formData.code}
                                onChangeText={(text) => setFormData({ ...formData, code: text.replace(/[^0-9]/g, '') })}
                                placeholder={t("auth.placeholders.resetCode")}
                                keyboardType="number-pad"
                                maxLength={6}
                                textAlign={isRTL ? 'right' : 'left'}
                            />
                        </View>

                        {/* New Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>
                                {t("auth.security.newPassword")}
                            </Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.passwordInput, isRTL && styles.inputRTL]}
                                    value={formData.new_password}
                                    onChangeText={(text) => setFormData({ ...formData, new_password: text })}
                                    placeholder={t("auth.security.enterNew")}
                                    secureTextEntry={!showNewPassword}
                                    textAlign={isRTL ? 'right' : 'left'}
                                />
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Ionicons
                                        name={showNewPassword ? "eye-off" : "eye"}
                                        size={22}
                                        color={COLORS.textLight}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirm Password */}
                        <View style={styles.inputGroup}>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>
                                {t("auth.security.confirmPassword")}
                            </Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={[styles.passwordInput, isRTL && styles.inputRTL]}
                                    value={formData.confirm_password}
                                    onChangeText={(text) => setFormData({ ...formData, confirm_password: text })}
                                    placeholder={t("auth.security.reEnterNew")}
                                    secureTextEntry={!showConfirmPassword}
                                    textAlign={isRTL ? 'right' : 'left'}
                                />
                                <TouchableOpacity
                                    style={styles.eyeBtn}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Ionicons
                                        name={showConfirmPassword ? "eye-off" : "eye"}
                                        size={22}
                                        color={COLORS.textLight}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Password Requirements */}
                        <View style={styles.requirements}>
                            <Text style={[styles.requirementsTitle, isRTL && styles.textRTL]}>
                                {t("auth.security.requirements.title")}
                            </Text>
                            <RequirementItem
                                met={formData.new_password.length >= 8}
                                text={t("auth.security.requirements.minChars")}
                                isRTL={isRTL}
                            />
                            <RequirementItem
                                met={/[A-Z]/.test(formData.new_password)}
                                text={t("auth.security.requirements.uppercase")}
                                isRTL={isRTL}
                            />
                            <RequirementItem
                                met={/[a-z]/.test(formData.new_password)}
                                text={t("auth.security.requirements.lowercase")}
                                isRTL={isRTL}
                            />
                            <RequirementItem
                                met={/\d/.test(formData.new_password)}
                                text={t("auth.security.requirements.digit")}
                                isRTL={isRTL}
                            />
                        </View>

                        <TouchableOpacity
                            style={[styles.resetBtn, loading && styles.resetBtnDisabled]}
                            onPress={handleResetPassword}
                            disabled={loading}
                        >
                            {loading ? (
                                <ActivityIndicator color={COLORS.white} />
                            ) : (
                                <Text style={styles.resetBtnText}>{t("auth.resetPasswordAction")}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

function RequirementItem({ met, text, isRTL }: { met: boolean; text: string; isRTL: boolean }) {
    return (
        <View style={[styles.requirementRow, isRTL && styles.requirementRowRTL]}>
            <Ionicons
                name={met ? "checkmark-circle" : "ellipse-outline"}
                size={16}
                color={met ? COLORS.success : COLORS.textLight}
            />
            <Text style={[styles.requirementText, isRTL && styles.requirementTextRTL, met && styles.requirementMet]}>
                {text}
            </Text>
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
        marginTop: 20,
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
        marginBottom: 30,
    },
    inputGroup: {
        marginBottom: 20,
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
    },
    inputRTL: {
        textAlign: "right",
    },
    passwordContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: COLORS.background,
        borderRadius: 12,
    },
    passwordInput: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 16,
        color: COLORS.text,
    },
    eyeBtn: {
        paddingHorizontal: 16,
    },
    requirements: {
        marginTop: 10,
        padding: 12,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        marginBottom: 20,
    },
    requirementsTitle: {
        fontSize: 13,
        fontWeight: "600",
        color: COLORS.text,
        marginBottom: 8,
    },
    requirementRow: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
    },
    requirementRowRTL: {
        flexDirection: "row-reverse",
    },
    requirementText: {
        fontSize: 13,
        color: COLORS.textLight,
        marginLeft: 8,
    },
    requirementTextRTL: {
        marginLeft: 0,
        marginRight: 8,
    },
    requirementMet: {
        color: COLORS.success,
    },
    resetBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: "center",
    },
    resetBtnDisabled: {
        opacity: 0.7,
    },
    resetBtnText: {
        color: COLORS.white,
        fontSize: 16,
        fontWeight: "600",
    },
});
