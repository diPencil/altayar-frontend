import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Switch, Alert, ActivityIndicator
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../../src/services/api"; // Corrected path
import { useTranslation } from 'react-i18next';
import { useLanguage } from "../../../../src/contexts/LanguageContext";
import Toast from "../../../../src/components/Toast";

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
};

export default function EditMembershipPlan() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const router = useRouter();
    const params = useLocalSearchParams();
    const id = Array.isArray(params.id) ? params.id[0] : params.id;
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

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

    useEffect(() => {
        console.log("Edit page - ID from params:", id, "Full params:", params);
        if (id) {
            // Test backend connection first
            testBackendConnection().then(() => {
                loadPlan();
            }).catch((error) => {
                console.error("Backend connection test failed:", error);
                Alert.alert(
                    "Connection Error",
                    "Cannot connect to backend server.\n\nPlease check:\n1. Backend is running on http://localhost:8082\n2. Server is accessible\n\nClick OK to retry or Cancel to go back.",
                    [
                        { text: t('common.cancel'), onPress: () => router.back(), style: "cancel" },
                        {
                            text: "Retry", onPress: () => {
                                testBackendConnection().then(() => loadPlan()).catch(() => { });
                            }
                        }
                    ]
                );
            });
        } else {
            Alert.alert("Error", "Plan ID is missing. Please go back and try again.");
            router.back();
        }
    }, [id]);

    const testBackendConnection = async () => {
        try {
            const response = await fetch('http://localhost:8082/health', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
            });
            if (!response.ok) {
                throw new Error(`Backend health check failed: ${response.status}`);
            }
            const data = await response.json();
            console.log("Backend health check:", data);
            return data;
        } catch (error) {
            console.error("Backend connection test error:", error);
            throw error;
        }
    };

    const loadPlan = async () => {
        if (!id) {
            Alert.alert("Error", "Plan ID is missing");
            router.back();
            return;
        }

        try {
            setLoading(true);
            console.log("Loading plan with ID:", id);
            console.log("ID type:", typeof id);
            console.log("Full params:", params);

            const plan = await adminApi.getMembershipPlan(id);
            console.log("Loaded plan:", plan);

            setTierNameEn(plan?.tier_name_en || "");
            setTierNameAr(plan?.tier_name_ar || "");
            setDescriptionEn(plan?.description_en || "");
            setDescriptionAr(plan?.description_ar || "");
            setSku(plan?.tier_code || "");
            setPrice(plan?.price != null ? plan.price.toString() : "");
            setPlanType(plan?.plan_type || "PAID_INFINITE");
            setDuration(plan?.duration_days != null ? plan.duration_days.toString() : "");
            setPurchaseLimit(plan?.purchase_limit != null ? plan.purchase_limit.toString() : "0");

            if (plan?.perks?.points != null) {
                setPoints(plan.perks.points.toString());
            } else {
                setPoints("0");
            }

            setIsActive(!!plan?.is_active);

        } catch (e: any) {
            console.error("Failed to load plan", e);
            console.error("Error details:", {
                message: e.message,
                stack: e.stack,
                name: e.name
            });

            let errorMessage = "Unknown error";
            if (e.message?.includes("Failed to fetch") || e.message?.includes("NetworkError")) {
                errorMessage = "Cannot connect to server. Please check:\n1. Backend server is running\n2. Correct API URL\n3. Network connection";
            } else if (e.response?.data?.detail) {
                errorMessage = e.response.data.detail;
            } else if (e.message) {
                errorMessage = e.message;
            }

            setToast({ visible: true, message: `${t('manageMemberships.errorLoad')}: ${errorMessage}`, type: 'error' });
            setTimeout(() => router.back(), 2000);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!tierNameEn || !sku) {
            setToast({ visible: true, message: t('manageMemberships.errorFormRequired'), type: 'error' });
            return;
        }

        if (!id) {
            Alert.alert("Error", t('manageMemberships.errorPlanId'));
            return;
        }

        setSaving(true);
        try {
            const pointsValue = parseInt(points) || 0;
            const payload = {
                tier_code: sku.toUpperCase(),
                tier_name_en: tierNameEn,
                tier_name_ar: tierNameAr || tierNameEn,
                description_en: descriptionEn,
                description_ar: descriptionAr || descriptionEn,
                price: parseFloat(price) || 0,
                plan_type: planType,
                duration_days: planType === 'PAID_FINITE' ? parseInt(duration) : null,
                purchase_limit: parseInt(purchaseLimit) || 0,
                perks: {
                    points: pointsValue,
                },
                is_active: isActive,
            };

            const result = await adminApi.updateMembershipPlan(id, payload);
            console.log("Update result:", result);

            setSaving(false);
            setToast({ visible: true, message: t('manageMemberships.updateSuccess'), type: 'success' });

            // Auto-hide success message after 1.5 seconds and navigate back
            setTimeout(() => {
                router.back();
            }, 1500);

        } catch (e: any) {
            console.error("Error updating plan:", e);
            setSaving(false);
            const errorMessage = e.response?.data?.detail || e.message || t('common.error');
            setToast({ visible: true, message: errorMessage, type: 'error' });
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.title}>{t('manageMemberships.planForm.editTitle')}</Text>
            </View>

            {/* 1. Plan Name & Basic Info */}
            <View style={styles.card}>
                <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planDetails')}</Text>

                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planNameEn')}</Text>
                <TextInput
                    style={[styles.input, { textAlign: 'auto' }]}
                    placeholder="e.g. Silver Membership"
                    value={tierNameEn}
                    onChangeText={setTierNameEn}
                />

                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.planNameAr')}</Text>
                <TextInput
                    style={[styles.input, { textAlign: 'right' }]}
                    placeholder="e.g. العضوية الفضية"
                    value={tierNameAr}
                    onChangeText={setTierNameAr}
                />

                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.uniqueCode')}</Text>
                <TextInput
                    style={[styles.input, styles.readOnlyInput, isRTL && styles.textRTL]}
                    placeholder="e.g. SILVER_2025"
                    autoCapitalize="characters"
                    value={sku}
                    editable={false}
                />
                <Text style={[styles.helperText, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.tierCodeWarning')}</Text>

                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('manageMemberships.planForm.descriptionEn')}</Text>
                <TextInput
                    style={[styles.input, styles.textArea, { textAlign: 'auto' }]}
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
                style={[styles.submitBtn, saving && styles.disabledBtn]}
                onPress={handleSubmit}
                disabled={saving}
            >
                {saving ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.submitText}>{t('manageMemberships.planForm.saveChanges')}</Text>
                )}
            </TouchableOpacity>

            <View style={{ height: 40 }} />

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </ScrollView>
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
        marginEnd: 12,
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
    successBanner: {
        backgroundColor: COLORS.success,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    successText: {
        color: 'white',
        fontSize: 14,
        fontWeight: "600",
        marginStart: 8,
    },
    readOnlyInput: {
        backgroundColor: '#f1f5f9',
        color: COLORS.textLight,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: -12,
        marginBottom: 16,
        fontStyle: 'italic',
    },
    textRTL: {
        textAlign: 'right',
    },
});
