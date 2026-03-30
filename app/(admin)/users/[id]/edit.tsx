import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, Alert, Switch, ActivityIndicator, Platform, Image
} from "react-native";
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../../../src/contexts/LanguageContext";
import { useAuth } from "../../../../src/contexts/AuthContext";
import * as ImagePicker from 'expo-image-picker';
import Toast from "../../../../src/components/Toast";

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
    "Afghanistan", "Albania", "Algeria", "Egypt", "Saudi Arabia", "United Arab Emirates", "United States", "United Kingdom"
    // Add more as needed or keep full list from create.tsx
];

export default function EditUserPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { user: currentUser, refreshUser } = useAuth();
    const { id } = useLocalSearchParams();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [plans, setPlans] = useState<any[]>([]);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [avatar, setAvatar] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Form State
    const [form, setForm] = useState({
        username: "",
        membership_id: "",
        first_name: "",
        last_name: "",
        email: "",
        phone: "",
        gender: "MALE",
        country: "Egypt",
        role: "CUSTOMER",
        status: "ACTIVE",
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

    useEffect(() => {
        loadPlans();
        if (id) {
            loadUser();
        }
    }, [id]);

    const loadPlans = async () => {
        try {
            const res = await adminApi.getMembershipPlans();
            setPlans(res || []);
        } catch (e) {
            console.log("Error loading plans", e);
        }
    };

    const loadUser = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getUserDetails(id as string);
            const user = res.user;

            // Split name if first/last not separate in response (backend returns name property in details)
            // But User model has first_name, last_name. Let's assume details endpoint returns them or full name.
            // The details endpoint returns `name` which is f"{first} {last}".
            // We might need to split it if backend doesn't return raw fields.
            // Let's check detail response structure again.
            // Response: { user: { id, name, email, phone, role, status, joined_at }, ... }
            // It seems "name" is combined. 
            // We might need to fetch raw user data or split name carefully.
            // Better: update backend getUserDetails to return distinct fields? 
            // Or just assume first/last split by space.

            let first = "";
            let last = "";
            if (user.name) {
                const parts = user.name.split(" ");
                first = parts[0];
                last = parts.slice(1).join(" ");
            }

            setForm({
                username: user.role === 'ADMIN' ? 'AltayarVIP' : (user.username || ""),
                membership_id: user.membership_id_display || (user.id ? `ALT-${user.id.substring(0, 8).toUpperCase()}` : ""),
                first_name: first,
                last_name: last,
                email: user.email || "",
                phone: user.phone || "",
                gender: user.gender || "MALE",
                country: user.country || "Egypt",
                role: user.role,
                status: user.status,
                plan_id: res.membership?.plan_id || "",
                plan_start_date: "",
            });

            // Set initial avatar if exists
            if (user.avatar) {
                setAvatar(user.avatar);
            }
        } catch (e) {
            setToast({ visible: true, message: t('admin.manageUsers.errorLoad'), type: 'error' });
            setTimeout(() => router.back(), 1500);
        } finally {
            setLoading(false);
        }
    };

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            setToast({ visible: true, message: 'Sorry, we need camera roll permissions to upload images.', type: 'error' });
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.3, // Reduced quality to minimize file size
            base64: true,
        });

        console.log('Image picker result:', result.canceled, result.assets?.[0]?.base64?.substring(0, 50));

        if (!result.canceled && result.assets[0].base64) {
            const imageUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
            console.log('Setting avatar, length:', imageUri.length);
            setAvatar(imageUri);
        }
    };

    const handleSave = async () => {
        if (!form.first_name || !form.email) {
            setToast({ visible: true, message: t('admin.manageUsers.errorRequired'), type: 'error' });
            return;
        }

        try {
            setSaving(true);
            const updateData: any = { ...form };
            
            // Always include avatar field, even if null (to allow clearing avatar)
            if (avatar !== null) {
                updateData.avatar = avatar;
            } else {
                updateData.avatar = null; // Explicitly set to null to clear avatar
            }

            // Ensure plan_start_date is serialized as ISO string if it exists
            // Ensure plan_start_date is formatted correctly
            if (updateData.plan_start_date) {
                updateData.plan_start_date = updateData.plan_start_date.replace(/\//g, '-');
            }

            console.log('Updating user with avatar:', avatar ? `Has avatar (${avatar.length} chars)` : 'No avatar', avatar?.substring(0, 50));
            console.log('Update data keys:', Object.keys(updateData));
            console.log('Avatar in updateData:', updateData.avatar ? `Present (${updateData.avatar.length} chars)` : 'Missing');
            
            try {
                const result = await adminApi.updateUser(id as string, updateData);
                console.log('Update result:', result);
            } catch (error: any) {
                console.error('Update error details:', error);
                console.error('Error response:', error.response?.data);
                throw error;
            }
            
            // If updating current user's profile, refresh AuthContext
            if (currentUser && id === currentUser.id) {
                await refreshUser();
                // Don't navigate back if we're refreshing current user - stay on page
                setToast({ visible: true, message: t('admin.manageUsers.updateSuccess'), type: 'success' });
            } else {
                setToast({ visible: true, message: t('admin.manageUsers.updateSuccess'), type: 'success' });
                setTimeout(() => router.back(), 500);
            }
        } catch (e: any) {
            setToast({ visible: true, message: e.response?.data?.detail || t('common.error'), type: 'error' });
        } finally {
            setSaving(false);
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
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.pageTitle}>{t('admin.manageUsers.editTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>

                {/* 1. Basic Info */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.basicInfo')}</Text>

                    <InputField
                        label={t('admin.manageUsers.username')}
                        value={form.username}
                        onChangeText={(t: string) => setForm({ ...form, username: t })}
                        placeholder="username123"
                        editable={false}
                        isRTL={isRTL}
                    />
                    <InputField
                        label={t('admin.manageUsers.membershipId')}
                        value={form.membership_id}
                        onChangeText={(t: string) => setForm({ ...form, membership_id: t })}
                        placeholder="ALT-12345"
                        isRTL={isRTL}
                    />

                    {/* Avatar Picker */}
                    <View style={styles.avatarSection}>
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.profilePicture') || 'Profile Picture'}</Text>
                        <View style={[styles.avatarContainer]}>
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
                                    {avatar ? (t('admin.manageUsers.changePhoto') || 'Change Photo') : (t('admin.manageUsers.uploadPhoto') || 'Upload Photo')}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={[styles.row]}>
                        <InputField
                            label={t('admin.manageUsers.firstName') + " *"}
                            value={form.first_name}
                            onChangeText={(t: string) => setForm({ ...form, first_name: t })}
                            containerStyle={{ flex: 1, [isRTL ? 'marginStart' : 'marginEnd']: 8 }}
                            required
                            isRTL={isRTL}
                        />
                        <InputField
                            label={t('admin.manageUsers.lastName') + " *"}
                            value={form.last_name}
                            onChangeText={(t: string) => setForm({ ...form, last_name: t })}
                            containerStyle={{ flex: 1, [isRTL ? 'marginEnd' : 'marginStart']: 8 }}
                            required
                            isRTL={isRTL}
                        />
                    </View>
                    <InputField
                        label={t('admin.manageUsers.email') + " *"}
                        value={form.email}
                        onChangeText={(t: string) => setForm({ ...form, email: t })}
                        keyboardType="email-address"
                        required
                        isRTL={isRTL}
                    />
                    <InputField
                        label={t('admin.manageUsers.phone')}
                        value={form.phone}
                        onChangeText={(t: string) => setForm({ ...form, phone: t })}
                        keyboardType="phone-pad"
                        isRTL={isRTL}
                    />
                </View>

                {/* 2. Gender & Country */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.personalDetails')}</Text>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.gender')}</Text>
                    <View style={[styles.chipsContainer]}>
                        {['MALE', 'FEMALE'].map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.chip, form.gender === g && styles.chipActive]}
                                onPress={() => setForm({ ...form, gender: g })}
                            >
                                <Text style={[styles.chipText, form.gender === g && styles.chipTextActive]}>{t('admin.manageUsers.' + g.toLowerCase())}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.country')}</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={form.country}
                            onValueChange={(v) => setForm({ ...form, country: v })}
                            style={[styles.picker, isRTL && styles.textRTL]}
                        >
                            {COUNTRIES.map(c => <Picker.Item key={c} label={c} value={c} style={isRTL ? { textAlign: 'right' } : {}} />)}
                        </Picker>
                    </View>
                </View>

                {/* 3. Membership Plan */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.membershipPlan')}</Text>
                    <Text style={[styles.helperText, isRTL && styles.textRTL]}>{t('admin.manageUsers.membershipPlanDesc')}</Text>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.selectPlan')}</Text>
                    <View style={styles.pickerContainer}>
                        <Picker
                            selectedValue={form.plan_id}
                            onValueChange={(v) => setForm({ ...form, plan_id: v })}
                            style={[styles.picker, isRTL && styles.textRTL]}
                        >
                            <Picker.Item label={t('admin.manageUsers.noPlan')} value="" style={isRTL ? { textAlign: 'right' } : {}} />
                            {plans.map(p => (
                                <Picker.Item key={p.id} label={`${isRTL ? p.tier_name_ar : p.tier_name_en} - ${p.price} ${p.currency}`} value={p.id} style={isRTL ? { textAlign: 'right' } : {}} />
                            ))}
                        </Picker>
                    </View>

                    {form.plan_id ? (
                        <View>
                            <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.planStartDate')}</Text>
                            <TextInput
                                style={[styles.input, isRTL && styles.textRTL]}
                                value={form.plan_start_date as string}
                                onChangeText={(text) => setForm({ ...form, plan_start_date: formatDateInput(text) })}
                                placeholder="YYYY/MM/DD"
                                keyboardType="numeric"
                                maxLength={10}
                            />
                            {form.plan_start_date && !isValidDate(form.plan_start_date as string) && (
                                <Text style={styles.errorText}>{t("common.invalidDateFormat", { format: "YYYY/MM/DD" })}</Text>
                            )}
                        </View>
                    ) : null}
                </View>

                {/* 4. Role & Status */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.roleStatus')}</Text>

                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.role')}</Text>
                    <View style={[styles.chipsContainer]}>
                        {['CUSTOMER', 'EMPLOYEE', 'ADMIN'].map(r => (
                            <TouchableOpacity
                                key={r}
                                style={[styles.chip, form.role === r && styles.chipActive]}
                                onPress={() => setForm({ ...form, role: r })}
                            >
                                <Text style={[styles.chipText, form.role === r && styles.chipTextActive]}>{t('admin.manageUsers.' + r.toLowerCase())}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.switchRow]}>
                        <Text style={styles.switchLabel}>{t('admin.manageUsers.memberStatus')} ({form.status === 'ACTIVE' ? t('admin.manageUsers.active') : t('admin.manageUsers.suspended')})</Text>
                        <Switch
                            value={form.status === 'ACTIVE'}
                            onValueChange={v => setForm({ ...form, status: v ? 'ACTIVE' : 'SUSPENDED' })}
                            trackColor={{ false: "#767577", true: COLORS.success }}
                        />
                    </View>
                </View>

            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    {saving ? <ActivityIndicator color="white" /> : <Text style={styles.saveBtnText}>{t('admin.manageUsers.saveChanges')}</Text>}
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
const InputField = ({ label, value, onChangeText, placeholder, secureTextEntry, keyboardType, containerStyle, required, editable = true, isRTL }: any) => {
    const { t } = useTranslation();
    return (
        <View style={[styles.inputGroup, containerStyle]}>
            <Text style={[styles.label, isRTL && styles.textRTL]}>
                {label} {required && <Text style={{ color: COLORS.error }}>{t("common.requiredStar")}</Text>}
            </Text>
            <TextInput
                style={[styles.input, !editable && styles.inputDisabled, isRTL && styles.textRTL]}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                placeholderTextColor="#94a3b8"
                editable={editable}
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
    pickerContainer: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        overflow: 'hidden',
        marginBottom: 16,
    },
    picker: {
        height: 50,
        color: COLORS.text,
    },
    dateButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
    },
    dateText: {
        fontSize: 14,
        color: COLORS.text,
    },
    helperText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 12,
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
    inputDisabled: {
        backgroundColor: '#f1f5f9',
        color: COLORS.textLight,
    },
    textRTL: {
        textAlign: 'right',
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
