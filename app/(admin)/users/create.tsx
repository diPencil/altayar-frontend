import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Switch, Platform, ActivityIndicator, Modal, Image
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../src/services/api";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../src/contexts/LanguageContext";
import * as ImagePicker from 'expo-image-picker';
import Toast from '../../../src/components/Toast';

const COLORS = {
    primary: "#2563eb",
    background: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
};

const COUNTRIES = [
    "Afghanistan", "Albania", "Algeria", "Andorra", "Angola", "Argentina", "Armenia", "Australia", "Austria", "Azerbaijan",
    "Bahamas", "Bahrain", "Bangladesh", "Barbados", "Belarus", "Belgium", "Belize", "Benin", "Bhutan", "Bolivia",
    "Bosnia and Herzegovina", "Botswana", "Brazil", "Brunei", "Bulgaria", "Burkina Faso", "Burundi",
    "Cambodia", "Cameroon", "Canada", "Cape Verde", "Central African Republic", "Chad", "Chile", "China", "Colombia",
    "Comoros", "Congo", "Costa Rica", "Croatia", "Cuba", "Cyprus", "Czech Republic",
    "Denmark", "Djibouti", "Dominica", "Dominican Republic",
    "Ecuador", "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
    "Fiji", "Finland", "France",
    "Gabon", "Gambia", "Georgia", "Germany", "Ghana", "Greece", "Grenada", "Guatemala", "Guinea", "Guinea-Bissau", "Guyana",
    "Haiti", "Honduras", "Hungary",
    "Iceland", "India", "Indonesia", "Iran", "Iraq", "Ireland", "Israel", "Italy",
    "Jamaica", "Japan", "Jordan",
    "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
    "Laos", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya", "Liechtenstein", "Lithuania", "Luxembourg",
    "Madagascar", "Malawi", "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Mauritania", "Mauritius",
    "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro", "Morocco", "Mozambique", "Myanmar",
    "Namibia", "Nauru", "Nepal", "Netherlands", "New Zealand", "Nicaragua", "Niger", "Nigeria", "North Korea", "North Macedonia", "Norway",
    "Oman",
    "Pakistan", "Palau", "Palestine", "Panama", "Papua New Guinea", "Paraguay", "Peru", "Philippines", "Poland", "Portugal",
    "Qatar",
    "Romania", "Russia", "Rwanda",
    "Saint Kitts and Nevis", "Saint Lucia", "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Sao Tome and Principe",
    "Saudi Arabia", "Senegal", "Serbia", "Seychelles", "Sierra Leone", "Singapore", "Slovakia", "Slovenia", "Solomon Islands",
    "Somalia", "South Africa", "South Korea", "South Sudan", "Spain", "Sri Lanka", "Sudan", "Suriname", "Sweden", "Switzerland", "Syria",
    "Taiwan", "Tajikistan", "Tanzania", "Thailand", "Timor-Leste", "Togo", "Tonga", "Trinidad and Tobago", "Tunisia", "Turkey",
    "Turkmenistan", "Tuvalu",
    "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom", "United States", "Uruguay", "Uzbekistan",
    "Vanuatu", "Vatican City", "Venezuela", "Vietnam",
    "Yemen",
    "Zambia", "Zimbabwe"
];

export default function CreateUserPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [showPlanPicker, setShowPlanPicker] = useState(false);
    const [showMembershipPicker, setShowMembershipPicker] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Form State
    const [form, setForm] = useState({
        membership_id: "",
        username: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        password: "",
        confirm_password: "",
        gender: "MALE",
        country: "Egypt",
        terms_accepted: true,
        role: "CUSTOMER",
        status: "ACTIVE",
        send_email: true,
        plan_id: "",
        plan_start_date: "",
    });

    const formatDateInput = (value: string): string => {
        let cleaned = value.replace(/\D/g, '');
        if (cleaned.length >= 4) cleaned = cleaned.slice(0, 4) + '/' + cleaned.slice(4);
        if (cleaned.length >= 7) cleaned = cleaned.slice(0, 7) + '/' + cleaned.slice(7, 9);
        return cleaned.slice(0, 10);
    };

    const isValidDate = (date: string): boolean => {
        if (!date || date.length !== 10) return false;
        const parts = date.split('/');
        if (parts.length !== 3) return false;
        const [y, m, d] = parts.map(Number);
        if (!y || !m || !d) return false;
        if (m < 1 || m > 12) return false;
        if (d < 1 || d > 31) return false;
        return true;
    };

    const [avatar, setAvatar] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);

    useEffect(() => {
        loadPlans();
    }, []);

    const loadPlans = async () => {
        try {
            const res = await adminApi.getMembershipPlans();
            setPlans(res);
        } catch (e) {
            console.log("Error loading plans", e);
        }
    };

    const pickImage = async () => {
        // Request permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setToast({ visible: true, message: t('admin.manageUsers.permissionCamera'), type: 'error' });
            return;
        }

        // Pick image
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3, // Reduced quality to minimize file size
            base64: true,
        });

        if (!result.canceled && result.assets[0].base64) {
            setAvatar(`data: image / jpeg; base64, ${result.assets[0].base64} `);
        }
    };

    const handleSave = async () => {
        // Validation
        if (!form.username || !form.email || !form.password) {
            setToast({ visible: true, message: t('admin.manageUsers.errorRequiredFull'), type: 'error' });
            return;
        }
        if (!form.first_name || !form.last_name) {
            setToast({ visible: true, message: t('admin.manageUsers.errorNames'), type: 'error' });
            return;
        }
        if (form.password !== form.confirm_password) {
            setToast({ visible: true, message: t('admin.manageUsers.errorPasswordMatch'), type: 'error' });
            return;
        }
        if (form.password.length < 6) {
            setToast({ visible: true, message: t('admin.manageUsers.errorPasswordLength'), type: 'error' });
            return;
        }
        if (!form.terms_accepted) {
            setToast({ visible: true, message: t('admin.manageUsers.errorTerms'), type: 'error' });
            return;
        }

        try {
            setLoading(true);

            // Prepare payload - only include plan_start_date if plan is selected
            const payload: any = {
                username: form.username,
                email: form.email,
                phone: form.phone || undefined,
                password: form.password,
                first_name: form.first_name,
                last_name: form.last_name,
                avatar: avatar || undefined,
                gender: form.gender,
                country: form.country,
                role: form.role,
                status: form.status,
                membership_id: form.membership_id || undefined,
            };

            // Only include plan data if plan is selected
            if (form.plan_id) {
                payload.plan_id = form.plan_id;
                payload.plan_start_date = form.plan_start_date ? form.plan_start_date.replace(/\//g, '-') : undefined;
            }

            console.log("Creating user with payload:", { ...payload, password: "***" });

            const response = await adminApi.createUser(payload);
            console.log("✅ User created successfully! Response:", response);
            console.log("🎉 SUCCESS! User created. Redirecting to users list...");

            // Show success toast
            setToast({ visible: true, message: 'User created successfully!', type: 'success' });

            // Redirect after a short delay to show toast
            setTimeout(() => {
                router.push('/(admin)/users');
            }, 500);

            // Note: Alert.alert doesn't work reliably on all platforms
            // The success is indicated by:
            // 1. Automatic redirect to users list
            // 2. User appears in the refreshed list
            // 3. Console log shows success message
        } catch (e: any) {
            console.error("❌ Error creating user:", e);
            console.error("Error response:", e.response);
            console.error("Error message:", e.message);

            const errorMessage = e.response?.data?.detail || e.message || 'Unknown error';
            console.error("📛 Error detail:", errorMessage);

            // Provide more helpful error messages
            let userFriendlyMessage = errorMessage;

            if (errorMessage.includes("UNIQUE constraint failed: users.phone")) {
                userFriendlyMessage = "⚠️ " + t('admin.manageUsers.errors.phoneExists');
            } else if (errorMessage.includes("Email already registered")) {
                userFriendlyMessage = "⚠️ " + t('admin.manageUsers.errors.emailExists');
            } else if (errorMessage.includes("Username already taken")) {
                userFriendlyMessage = "⚠️ " + t('admin.manageUsers.errors.usernameExists');
            } else if (errorMessage.includes("required")) {
                userFriendlyMessage = "⚠️ " + t('admin.manageUsers.errors.missingField', { field: errorMessage });
            } else if (errorMessage.includes("UNIQUE constraint")) {
                userFriendlyMessage = "⚠️ " + t('admin.manageUsers.errors.alreadyRegistered');
            }

            console.error("🚨 Showing error to user:", userFriendlyMessage);
            setToast({ visible: true, message: userFriendlyMessage, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('admin.manageUsers.addMember')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                {/* 1. Basic Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('admin.manageUsers.basicInfo')}</Text>

                    <InputField label={t('admin.manageUsers.membershipId') + " (" + t('common.optional') + ")"} value={form.membership_id} onChangeText={(tVal: string) => setForm({ ...form, membership_id: tVal })} placeholder={t('admin.manageUsers.autoGenerated')} />
                    <InputField label={t('admin.manageUsers.username') + " *"} value={form.username} onChangeText={(tVal: string) => setForm({ ...form, username: tVal })} required />

                    {/* Avatar Picker */}
                    <View style={styles.avatarSection}>
                        <Text style={styles.label}>{t('admin.manageUsers.profilePicture')} ({t('common.optional')})</Text>
                        <View style={styles.avatarContainer}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarPreview} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Ionicons name="person" size={40} color={COLORS.textLight} />
                                </View>
                            )}
                            <TouchableOpacity style={styles.avatarButton} onPress={pickImage}>
                                <Ionicons name="camera" size={20} color="white" />
                                <Text style={styles.avatarButtonText}>
                                    {avatar ? t('admin.manageUsers.changePhoto') : t('admin.manageUsers.uploadPhoto')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={styles.row}>
                        <InputField label={t('admin.manageUsers.firstName') + " *"} value={form.first_name} onChangeText={(tVal: string) => setForm({ ...form, first_name: tVal })} containerStyle={{ flex: 1, marginRight: 8 }} required />
                        <InputField label={t('admin.manageUsers.lastName') + " *"} value={form.last_name} onChangeText={(tVal: string) => setForm({ ...form, last_name: tVal })} containerStyle={{ flex: 1, marginLeft: 8 }} required />
                    </View>
                    <InputField label={t('admin.manageUsers.email') + " *"} value={form.email} onChangeText={(tVal: string) => setForm({ ...form, email: tVal })} keyboardType="email-address" required />
                    <InputField label={t('admin.manageUsers.phone')} value={form.phone} onChangeText={(tVal: string) => setForm({ ...form, phone: tVal })} keyboardType="phone-pad" placeholder="+20 123 456 7890" />

                    <InputField label={t('auth.security.newPassword') + " *"} value={form.password} onChangeText={(tVal: string) => setForm({ ...form, password: tVal })} secureTextEntry required />
                    <InputField label={t('auth.security.confirmPassword') + " *"} value={form.confirm_password} onChangeText={(tVal: string) => setForm({ ...form, confirm_password: tVal })} secureTextEntry required />
                </View>

                {/* 2. Personal Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('admin.manageUsers.personalInfo')}</Text>

                    <Text style={styles.label}>{t('admin.manageUsers.gender')}</Text>
                    <View style={styles.radioGroup}>
                        {['MALE', 'FEMALE'].map(g => (
                            <TouchableOpacity key={g} style={styles.radioBtn} onPress={() => setForm({ ...form, gender: g })}>
                                <Ionicons name={form.gender === g ? "radio-button-on" : "radio-button-off"} size={20} color={COLORS.primary} />
                                <Text style={styles.radioText}>{g === 'MALE' ? t('admin.manageUsers.male') : t('admin.manageUsers.female')}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>


                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('admin.manageUsers.country')}</Text>
                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={form.country}
                                onValueChange={(value: string) => setForm({ ...form, country: value })}
                                style={styles.picker}
                            >
                                {COUNTRIES.map(country => (
                                    <Picker.Item key={country} label={country} value={country} />
                                ))}
                            </Picker>
                        </View>
                    </View>


                    <TouchableOpacity style={styles.checkboxRow} onPress={() => setForm({ ...form, terms_accepted: !form.terms_accepted })}>
                        <Ionicons name={form.terms_accepted ? "checkbox" : "square-outline"} size={24} color={COLORS.primary} />
                        <Text style={styles.checkboxText}>{t('admin.manageUsers.termsAgreement')}</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.secondaryBtn}>
                        <Ionicons name="add" size={18} color={COLORS.primary} />
                        <Text style={styles.secondaryBtnText}>{t('admin.manageUsers.additionalFields')}</Text>
                    </TouchableOpacity>
                </View>

                {/* 3. Role & Status */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('admin.manageUsers.roleStatus')}</Text>

                    <Text style={styles.label}>{t('admin.manageUsers.role')}</Text>
                    <View style={styles.chipsContainer}>
                        {['CUSTOMER', 'EMPLOYEE', 'ADMIN'].map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.chip, form.role === r && styles.chipActive]}
                                onPress={() => setForm({ ...form, role: r })}
                            >
                                <Text style={[styles.chipText, form.role === r && styles.chipTextActive]}>
                                    {t('admin.manageUsers.' + r.toLowerCase(), r)}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('admin.manageUsers.memberStatus')} ({t('admin.manageUsers.active')})</Text>
                        <Switch
                            value={form.status === 'ACTIVE'}
                            onValueChange={v => setForm({ ...form, status: v ? 'ACTIVE' : 'SUSPENDED' })}
                            trackColor={{ false: "#767577", true: COLORS.success }}
                        />
                    </View>

                    <View style={styles.switchRow}>
                        <Text style={styles.switchLabel}>{t('admin.manageUsers.marketingConsent')}</Text>
                        <Switch
                            value={form.send_email}
                            onValueChange={v => setForm({ ...form, send_email: v })}
                            trackColor={{ false: "#767577", true: COLORS.primary }}
                        />
                    </View>
                </View>

                {/* 4. Membership Plan */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('admin.manageUsers.membershipPlan')}</Text>
                    <View style={styles.alertBox}>
                        <Ionicons name="information-circle" size={20} color="#854d0e" />
                        <Text style={styles.alertText}>
                            {t('admin.manageUsers.importantSubscription')}
                        </Text>
                    </View>

                    <Text style={styles.label}>{t('admin.manageUsers.selectPlan')}</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                        <TouchableOpacity
                            style={[styles.planCard, !form.plan_id && styles.planCardActive]}
                            onPress={() => setForm({ ...form, plan_id: "" })}
                        >
                            <Text style={[styles.planName, !form.plan_id && styles.planNameActive]}>{t('admin.manageUsers.noPlan')}</Text>
                        </TouchableOpacity>
                        {plans.map(p => (
                            <TouchableOpacity
                                key={p.id}
                                style={[styles.planCard, form.plan_id === p.id && styles.planCardActive]}
                                onPress={() => setForm({ ...form, plan_id: p.id })}
                            >
                                <Text style={[styles.planName, form.plan_id === p.id && styles.planNameActive]}>{p.tier_name_en}</Text>
                                <Text style={styles.planPrice}>{p.price} USD</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    {plans.length === 0 && (
                        <View style={styles.emptyPlansContainer}>
                            <Ionicons name="information-circle-outline" size={24} color={COLORS.textLight} />
                            <Text style={styles.emptyPlansText}>
                                {t('admin.manageUsers.noPlansAvailable')}
                            </Text>
                        </View>
                    )}

                    {form.plan_id ? (
                        <View>
                            <Text style={styles.label}>{t('admin.manageUsers.planStartDate')}</Text>
                            <TextInput
                                style={styles.input}
                                value={form.plan_start_date as string}
                                onChangeText={(text) => setForm({ ...form, plan_start_date: formatDateInput(text) })}
                                placeholder="YYYY/MM/DD"
                                keyboardType="numeric"
                                maxLength={10}
                            />
                            {form.plan_start_date && !isValidDate(form.plan_start_date as string) && (
                                <Text style={styles.errorText}>{t('admin.manageUsers.invalidDate')}</Text>
                            )}
                        </View>
                    ) : null}
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
                    {loading ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{t('admin.manageUsers.saveMember')}</Text>}
                </TouchableOpacity>
            </View>

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

// Helper Component
const InputField = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, containerStyle, required }: any) => {
    const { t } = useTranslation();
    return (
        <View style={[styles.inputGroup, containerStyle]}>
            <Text style={styles.label}>
                {label} {required && <Text style={{ color: COLORS.error }}>{t("common.requiredStar")}</Text>}
            </Text>
            <TextInput
                style={styles.input}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                placeholderTextColor="#94a3b8"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        justifyContent: 'space-between'
    },
    backBtn: {
        width: 40,
    },
    pageTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
        color: COLORS.text,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.text,
    },
    row: {
        flexDirection: 'row',
    },
    radioGroup: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 20,
    },
    radioBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    radioText: {
        fontSize: 14,
        color: COLORS.text,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginVertical: 16,
    },
    checkboxText: {
        fontSize: 14,
        color: COLORS.text,
    },
    secondaryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
    },
    secondaryBtnText: {
        color: COLORS.primary,
        fontWeight: '600',
        marginLeft: 8,
    },
    chipsContainer: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    chip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    chipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    chipText: {
        color: COLORS.text,
    },
    chipTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    switchLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: COLORS.text,
    },
    alertBox: {
        flexDirection: 'row',
        gap: 8,
        backgroundColor: '#fefce8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    alertText: {
        fontSize: 12,
        color: '#854d0e',
        flex: 1,
    },

    // Plans
    planCard: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginRight: 10,
        minWidth: 100,
        alignItems: 'center',
    },
    planCardActive: {
        borderColor: COLORS.primary,
        backgroundColor: '#eff6ff',
    },
    planName: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textLight,
    },
    planNameActive: {
        color: COLORS.primary,
    },
    planPrice: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    dateInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
    },
    pickerContainer: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        overflow: 'hidden',
    },
    picker: {
        height: 50,
        color: COLORS.text,
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
    },
    saveBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyPlansContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: COLORS.background,
        borderRadius: 8,
        marginBottom: 16,
        gap: 12,
    },
    emptyPlansText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.textLight,
        lineHeight: 20,
    },
    avatarSection: {
        marginBottom: 16,
    },
    avatarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    avatarPreview: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        gap: 8,
    },
    avatarButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    errorText: { color: COLORS.error, fontSize: 12, marginTop: 4, marginBottom: 8 }
});
