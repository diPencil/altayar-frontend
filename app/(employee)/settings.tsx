import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, Modal, TextInput } from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from "../../src/contexts/AuthContext";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import Toast from "../../src/components/Toast";

const COLORS = {
    primary: "#1071b8", // Employee theme
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    danger: "#ef4444",
};

export default function EmployeeSettings() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { language, toggleLanguage, isRTL } = useLanguage();
    const router = useRouter();

    const [editProfileVisible, setEditProfileVisible] = useState(false);
    const [changePasswordVisible, setChangePasswordVisible] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
    const [avatarError, setAvatarError] = useState(false);

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    // Reset avatar error when user avatar changes
    useEffect(() => {
        setAvatarError(false);
    }, [user?.avatar]);

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageSettings.title"), headerBackTitle: t("common.back") }} />

            <View style={styles.profileSection}>
                <View style={styles.avatar}>
                    {user?.avatar && !avatarError ? (
                        <Image
                            source={{ uri: user.avatar }}
                            style={{ width: 80, height: 80, borderRadius: 40 }}
                            onError={() => {
                                console.log('Avatar load failed, showing initials');
                                setAvatarError(true);
                            }}
                        />
                    ) : (
                        <Text style={styles.avatarText}>{user?.first_name?.[0]}</Text>
                    )}
                </View>
                <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{t('common.role.' + (user?.role || 'CUSTOMER'))}</Text>
                </View>
            </View>

            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("common.account")}</Text>
            <View style={styles.card}>
                <TouchableOpacity
                    style={[styles.settingRow]}
                    onPress={() => setEditProfileVisible(true)}
                >
                    <View style={[styles.rowLeft]}>
                        <Ionicons name="person-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("profile.editProfile")}</Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.settingRow, { borderBottomWidth: 0 }]}
                    onPress={() => setChangePasswordVisible(true)}
                >
                    <View style={[styles.rowLeft]}>
                        <Ionicons name="lock-closed-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("auth.security.changePassword")}</Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.manageSettings.preferences")}</Text>
            <View style={styles.card}>
                <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.rowLeft]}>
                        <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.language")}</Text>
                    </View>
                    <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
                        <Text style={styles.langText}>{language === 'en' ? t('common.English') : t('common.arabic')}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>{t("admin.manageSettings.logout")}</Text>
            </TouchableOpacity>

            {/* Edit Profile Modal */}
            <EditProfileModal
                visible={editProfileVisible}
                onClose={() => setEditProfileVisible(false)}
            />

            {/* Request Toast for successful logout if needed, but logout usually redirects */}

            {/* Change Password Modal */}
            <ChangePasswordModal
                visible={changePasswordVisible}
                onClose={() => setChangePasswordVisible(false)}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </ScrollView>
    );
}

// Edit Profile Modal Component
function EditProfileModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { user, refreshUser } = useAuth();
    const { t } = useTranslation();
    const [firstName, setFirstName] = useState(user?.first_name || '');
    const [lastName, setLastName] = useState(user?.last_name || '');
    const [loading, setLoading] = useState(false);
    const [localAvatar, setLocalAvatar] = useState<string | null>(user?.avatar || null);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    useEffect(() => {
        if (visible) {
            setFirstName(user?.first_name || '');
            setLastName(user?.last_name || '');
            setLocalAvatar(user?.avatar || null);
        }
    }, [visible, user]);

    const handlePickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            showToast(t('profile.photoLibraryPermission'), 'error');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
        });

        if (!result.canceled) {
            setLocalAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        try {
            setLoading(true);
            const { updateProfile, uploadAvatar } = await import('../../src/services/authApi');

            let avatarUrl: string | undefined = user?.avatar || undefined;

            // Upload new avatar if changed
            if (localAvatar && localAvatar !== user?.avatar) {
                try {
                    const formData = new FormData();
                    const filename = localAvatar.split('/').pop() || 'avatar.jpg';
                    const match = /\.(\w+)$/.exec(filename);
                    const type = match ? `image/${match[1]}` : `image/jpeg`;

                    // @ts-ignore
                    formData.append('file', {
                        uri: localAvatar,
                        name: filename,
                        type,
                    });

                    const uploadRes = await uploadAvatar(formData);
                    avatarUrl = uploadRes.url;
                } catch (err: any) {
                    console.error('Avatar upload error:', err);
                    showToast(t('profile.avatarUploadError'), 'error');
                }
            }

            await updateProfile({
                first_name: firstName,
                last_name: lastName,
                avatar: avatarUrl
            });

            // Refresh user data
            if (refreshUser) await refreshUser();

            showToast(t('profile.updateSuccess'), 'success');
            setTimeout(onClose, 1500);
        } catch (error: any) {
            showToast(error.message || t("profile.updateError"), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{t("profile.editProfile")}</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.saveBtn}>{t("common.save")}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarLarge}>
                            {localAvatar || user?.avatar ? (
                                <Image source={{ uri: localAvatar || user?.avatar || undefined }} style={{ width: 100, height: 100, borderRadius: 50 }} />
                            ) : (
                                <Text style={styles.avatarLargeText}>{user?.first_name?.[0]}</Text>
                            )}
                        </View>
                        <TouchableOpacity style={styles.changePhotoBtn} onPress={handlePickImage}>
                            <Ionicons name="camera" size={16} color={COLORS.primary} />
                            <Text style={styles.changePhotoText}>{t("profile.changePhoto")}</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("profile.firstName")}</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder={t("profile.enterFirstName")}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("profile.lastName")}</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder={t("profile.enterLastName")}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("common.email")}</Text>
                        <TextInput
                            style={[styles.input, styles.inputDisabled]}
                            value={user?.email}
                            editable={false}
                        />
                        <Text style={styles.inputHint}>{t("profile.emailImmutable")}</Text>
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

// Change Password Modal Component
function ChangePasswordModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            showToast(t("common.fillRequired"), 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showToast(t("auth.security.errors.mismatch"), 'error');
            return;
        }
        if (newPassword.length < 8) {
            showToast(t("auth.security.errors.minChars"), 'error');
            return;
        }

        try {
            setLoading(true);
            const { changePassword } = await import('../../src/services/authApi');
            await changePassword({
                current_password: currentPassword,
                new_password: newPassword
            });

            showToast(t("auth.security.errors.success"), 'success');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(onClose, 1500);
        } catch (error: any) {
            showToast(error.message || t("auth.security.errors.failed"), 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.modalTitle}>{t("auth.security.changePassword")}</Text>
                    <TouchableOpacity onPress={handleSave}>
                        <Text style={styles.saveBtn}>{t("common.save")}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("auth.security.currentPassword")}</Text>
                        <TextInput
                            style={styles.input}
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder={t("auth.security.enterCurrent")}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("auth.security.newPassword")}</Text>
                        <TextInput
                            style={styles.input}
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder={t("auth.security.enterNew")}
                            secureTextEntry
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>{t("auth.security.confirmPassword")}</Text>
                        <TextInput
                            style={styles.input}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            placeholder={t("auth.security.reEnterNew")}
                            secureTextEntry
                        />
                    </View>
                </ScrollView>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    profileSection: {
        alignItems: 'center',
        padding: 30,
        backgroundColor: COLORS.cardBg,
        marginBottom: 20,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    name: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    email: {
        color: COLORS.textLight,
        marginTop: 2,
    },
    roleBadge: {
        marginTop: 10,
        backgroundColor: COLORS.primary,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textLight,
        marginStart: 20,
        marginBottom: 10,
        marginTop: 10,
    },
    card: {
        backgroundColor: COLORS.cardBg,
        marginHorizontal: 16,
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingLabel: {
        fontSize: 15,
        color: COLORS.text,
    },
    langBtn: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    langText: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.text,
    },
    logoutBtn: {
        margin: 20,
        backgroundColor: '#fee2e2',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    logoutText: {
        color: COLORS.danger,
        fontWeight: 'bold',
        fontSize: 16,
    },
    // RTL Styles
    textRTL: {
        textAlign: 'right',
        marginEnd: 20,
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: COLORS.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    saveBtn: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
    },
    modalContent: {
        flex: 1,
        padding: 20,
    },
    inputGroup: {
        marginBottom: 20,
    },
    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 8,
    },
    input: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 12,
        fontSize: 15,
        color: COLORS.text,
    },
    inputDisabled: {
        backgroundColor: COLORS.background,
        color: COLORS.textLight,
    },
    inputHint: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    avatarSection: {
        alignItems: 'center',
        marginBottom: 30,
        paddingTop: 10,
    },
    avatarLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.background,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: COLORS.border,
    },
    avatarLargeText: {
        fontSize: 40,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    changePhotoBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: COLORS.background,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    changePhotoText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
    },
});
