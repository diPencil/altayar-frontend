import React, { useState } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../src/services/api"; // Corrected path
import { useTranslation } from 'react-i18next';
import { useLanguage } from "../../../src/contexts/LanguageContext";
import Toast from "../../../src/components/Toast";

const COLORS = {
    primary: "#0891b2",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
};

export default function CreateMembershipPlan() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Form State
    const [tierNameEn, setTierNameEn] = useState("");
    const [tierNameAr, setTierNameAr] = useState("");
    const [descriptionEn, setDescriptionEn] = useState("");
    const [descriptionAr, setDescriptionAr] = useState("");
    const [sku, setSku] = useState(""); // tier_code
    const [price, setPrice] = useState("");
    const [planType, setPlanType] = useState("PAID_INFINITE"); // FREE, PAID_INFINITE, PAID_FINITE
    const [duration, setDuration] = useState("");
    const [purchaseLimit, setPurchaseLimit] = useState("0");

    // Perks / Rules
    const [points, setPoints] = useState("0");
    const [isActive, setIsActive] = useState(true);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const handleSubmit = async () => {
        // Detailed validation - check each field individually
        if (!tierNameEn) {
            setToast({ visible: true, message: t('manageMemberships.errorPlanName'), type: 'error' });
            return;
        }

        if (!sku) {
            setToast({ visible: true, message: t('manageMemberships.errorPlanCode'), type: 'error' });
            return;
        }

        // Validate price for paid plans
        if (planType !== 'FREE' && (!price || parseFloat(price) <= 0)) {
            setToast({ visible: true, message: t('manageMemberships.errorPrice'), type: 'error' });
            return;
        }

        // Validate duration for finite plans
        if (planType === 'PAID_FINITE' && (!duration || parseInt(duration) <= 0)) {
            setToast({ visible: true, message: t('manageMemberships.errorDuration'), type: 'error' });
            return;
        }

        setLoading(true);
        try {
            const payload = {
                tier_code: sku.toUpperCase(),
                tier_name_en: tierNameEn,
                tier_name_ar: tierNameAr || tierNameEn, // Fallback
                tier_order: 99, // Default to end
                description_en: descriptionEn,
                description_ar: descriptionAr || descriptionEn, // Fallback
                price: parseFloat(price) || 0,
                currency: "USD", // User mentioned dynamic but suggested currency. Defaulting to USD based on business logic.
                plan_type: planType,
                duration_days: planType === 'PAID_FINITE' ? parseInt(duration) : null,
                purchase_limit: parseInt(purchaseLimit) || 0,
                cashback_rate: 0,
                points_multiplier: 1,
                perks: {
                    points: parseInt(points) || 0,
                },
                is_active: isActive,
                color_hex: "#0891b2" // Default color
            };

            await adminApi.createMembershipPlan(payload);
            setToast({ visible: true, message: t('manageMemberships.createSuccess'), type: 'success' });

            setTimeout(() => {
                router.back();
            }, 1000);
        } catch (e: any) {
            setToast({ visible: true, message: e.message || t('common.error'), type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1 }}>
            <ScrollView style={styles.container}>
                <View style={[styles.header, isRTL && styles.headerRTL]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                        <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.title}>{t('manageMemberships.planForm.createTitle')}</Text>
                </View>

                {/* 1. Plan Name & Basic Info */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planDetails')}</Text>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planNameEn')}</Text>
                    <TextInput
                        style={[styles.input, { textAlign: 'left' }]}
                        placeholder="e.g. Silver Membership"
                        value={tierNameEn}
                        onChangeText={setTierNameEn}
                    />

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planNameAr')}</Text>
                    <TextInput
                        style={[styles.input, { textAlign: 'right' }]}
                        placeholder="e.g. العضوية الفضية"
                        textAlign="right"
                        value={tierNameAr}
                        onChangeText={setTierNameAr}
                    />

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.uniqueCode')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.textRTL]}
                        placeholder="e.g. SILVER_2025"
                        autoCapitalize="characters"
                        value={sku}
                        onChangeText={setSku}
                    />

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.descriptionEn')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { textAlign: 'left' }]}
                        placeholder="Plan benefits and details..."
                        multiline
                        numberOfLines={3}
                        value={descriptionEn}
                        onChangeText={setDescriptionEn}
                    />

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.descriptionAr')}</Text>
                    <TextInput
                        style={[styles.input, styles.textArea, { textAlign: 'right' }]}
                        placeholder="مميزات وتفاصيل الباقة..."
                        multiline
                        numberOfLines={3}
                        textAlign="right"
                        value={descriptionAr}
                        onChangeText={setDescriptionAr}
                    />
                </View>

                {/* 2. Type & Price */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.typePrice')}</Text>

                    <View style={[styles.radioGroup, isRTL && styles.rowRTL]}>
                        <TouchableOpacity
                            style={[styles.radioBtn, planType === 'FREE' && styles.radioActive]}
                            onPress={() => setPlanType('FREE')}
                        >
                            <Text style={[styles.radioText, planType === 'FREE' && styles.textActive]}>{t('manageMemberships.planForm.free')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.radioBtn, planType === 'PAID_INFINITE' && styles.radioActive]}
                            onPress={() => setPlanType('PAID_INFINITE')}
                        >
                            <Text style={[styles.radioText, planType === 'PAID_INFINITE' && styles.textActive]}>{t('manageMemberships.planForm.paidInfinite')}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.radioBtn, planType === 'PAID_FINITE' && styles.radioActive]}
                            onPress={() => setPlanType('PAID_FINITE')}
                        >
                            <Text style={[styles.radioText, planType === 'PAID_FINITE' && styles.textActive]}>{t('manageMemberships.planForm.paidFinite')}</Text>
                        </TouchableOpacity>
                    </View>

                    {planType !== 'FREE' && (
                        <>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planAmount')}</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.textRTL]}
                                placeholder="2000"
                                keyboardType="numeric"
                                value={price}
                                onChangeText={setPrice}
                            />
                        </>
                    )}

                    {planType === 'PAID_FINITE' && (
                        <>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.duration')}</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.textRTL]}
                                placeholder="365"
                                keyboardType="numeric"
                                value={duration}
                                onChangeText={setDuration}
                            />
                        </>
                    )}
                </View>

                {/* 3. Limits & Perks */}
                <View style={styles.card}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.configuration')}</Text>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.purchaseLimit')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.textRTL]}
                        placeholder="0"
                        keyboardType="numeric"
                        value={purchaseLimit}
                        onChangeText={setPurchaseLimit}
                    />

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.welcomePoints')}</Text>
                    <TextInput
                        style={[styles.input, isRTL && styles.textRTL]}
                        placeholder="1500"
                        keyboardType="numeric"
                        value={points}
                        onChangeText={setPoints}
                    />

                    <View style={[styles.row, isRTL && styles.rowRTL]}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.activeStatus')}</Text>
                        <Switch
                            value={isActive}
                            onValueChange={setIsActive}
                            trackColor={{ false: "#767577", true: COLORS.primary }}
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.disabledBtn]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.submitText}>{t('manageMemberships.planForm.createPlan')}</Text>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backBtn: {
        marginRight: 12,
    },
    title: {
        fontSize: 20,
        fontWeight: "bold",
        color: COLORS.text,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.primary,
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 6,
        fontWeight: "500",
    },
    input: {
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
    },
    radioGroup: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        padding: 4,
    },
    radioBtn: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 6,
    },
    radioActive: {
        backgroundColor: COLORS.cardBg,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 1,
        elevation: 1,
    },
    radioText: {
        fontSize: 13,
        color: COLORS.textLight,
        fontWeight: "500",
    },
    textActive: {
        color: COLORS.primary,
        fontWeight: "bold",
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    submitBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    submitText: {
        color: 'white',
        fontSize: 16,
        fontWeight: "bold",
    },
    textRTL: {
        textAlign: 'right',
    },
});

