import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Image, TextInput, ActivityIndicator, Alert } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../src/contexts/AuthContext";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { SettingsService, OnboardingSettings, type ContactUsSettings, type AboutLinksSettings } from "../../src/services/settingsService";
import Toast from "../../src/components/Toast";

const COLORS = {
    primary: "#1071b8",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    danger: "#ef4444",
};

export default function AdminSettings() {
    const { t } = useTranslation();
    const { user, logout } = useAuth();
    const { language, toggleLanguage, isRTL } = useLanguage();

    // Settings State
    const [expandedSection, setExpandedSection] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Toast State
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Onboarding Form State
    const [onboardingSettings, setOnboardingSettings] = useState<OnboardingSettings>({
        image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1974&auto=format&fit=crop",
        title: { en: "Explore your journey only with us", ar: "استكشف رحلتك معنا فقط" },
        subtitle: { en: "All your vacations destinations are here, enjoy your holiday", ar: "جميع وجهات عطلاتك هنا، استمتع بعطلتك" }
    });

    // Contact Us Form State
    const [contactUsSettings, setContactUsSettings] = useState<ContactUsSettings>({
        whatsapp_number: "966575180639",
        call_number: "+201125889336",
        email: "info@altayarvip.com",
    });

    // About Links Form State
    const [aboutLinksSettings, setAboutLinksSettings] = useState<AboutLinksSettings>({
        websites: {
            official: "https://altayarvip.com/",
            hotel_booking: "https://altayarvip.net/",
        },
        socials: {
            facebook: "https://www.facebook.com/altayarvipcom",
            instagram: "https://www.instagram.com/altayarvip/",
            x: "https://x.com/altayarvipcom",
            linkedin: "https://www.linkedin.com/company/altayarvip/",
            snapchat: "https://www.snapchat.com/@altayarvip",
            tiktok: "https://www.tiktok.com/@altayarvip",
        },
    });

    useEffect(() => {
        if (expandedSection === 'appConfig') {
            fetchSettings();
        }
        if (expandedSection === 'contactUs') {
            fetchContactUsSettings();
        }
        if (expandedSection === 'aboutLinks') {
            fetchAboutLinksSettings();
        }
    }, [expandedSection]);

    const fetchSettings = async () => {
        setIsLoading(true);
        try {
            const data = await SettingsService.getOnboardingSettings();
            if (data) {
                setOnboardingSettings(data);
            }
        } catch (error) {
            console.error("Error fetching settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchContactUsSettings = async () => {
        setIsLoading(true);
        try {
            const data = await SettingsService.getContactUsSettingsAdmin();
            if (data) {
                setContactUsSettings(data);
            }
        } catch (error) {
            console.error("Error fetching contact us settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAboutLinksSettings = async () => {
        setIsLoading(true);
        try {
            const data = await SettingsService.getAboutLinksSettingsAdmin();
            if (data) {
                setAboutLinksSettings(data);
            }
        } catch (error) {
            console.error("Error fetching about links settings:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSaveSettings = async () => {
        setIsSaving(true);
        try {
            await SettingsService.updateSettings('onboarding', {
                onboarding: onboardingSettings
            });
            setToast({ visible: true, message: "Settings saved successfully", type: 'success' });
            setExpandedSection(null);
        } catch (error) {
            console.error("Failed to save onboarding settings:", error);
            setToast({ visible: true, message: "Failed to save settings", type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveContactUsSettings = async () => {
        setIsSaving(true);
        try {
            await SettingsService.updateContactUsSettings(contactUsSettings);
            setToast({ visible: true, message: t("admin.manageSettings.contactUsSaveSuccess"), type: 'success' });
            setExpandedSection(null);
        } catch (error) {
            console.error("Failed to save contact us settings:", error);
            setToast({ visible: true, message: t("admin.manageSettings.contactUsSaveError"), type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveAboutLinksSettings = async () => {
        setIsSaving(true);
        try {
            await SettingsService.updateAboutLinksSettings(aboutLinksSettings);
            setToast({ visible: true, message: t("admin.manageSettings.aboutLinksSaveSuccess"), type: 'success' });
            setExpandedSection(null);
        } catch (error) {
            console.error("Failed to save about links settings:", error);
            setToast({ visible: true, message: t("admin.manageSettings.aboutLinksSaveError"), type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <ScrollView style={styles.container}>
            <Stack.Screen options={{ title: t("admin.manageSettings.title") }} />

            <View style={styles.profileSection}>
                <View style={styles.avatar}>
                    {user?.avatar ? (
                        <Image
                            source={{ uri: user.avatar }}
                            style={styles.avatarImage}
                        />
                    ) : (
                        <Text style={styles.avatarText}>{user?.first_name?.[0] || 'A'}</Text>
                    )}
                </View>
                <Text style={styles.name}>{user?.first_name} {user?.last_name}</Text>
                <Text style={styles.email}>{user?.email}</Text>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleText}>{user?.role}</Text>
                </View>
            </View>

            {/* App Configuration Section */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.manageSettings.appConfig")}</Text>
            <View style={styles.card}>
                <TouchableOpacity
                    style={[styles.settingRow, isRTL && styles.settingRowRTL, expandedSection === 'appConfig' && { borderBottomWidth: 0 }]}
                    onPress={() => toggleSection('appConfig')}
                >
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="options-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.onboarding")}</Text>
                    </View>
                    <Ionicons name={expandedSection === 'appConfig' ? "chevron-up" : (isRTL ? "chevron-back" : "chevron-forward")} size={20} color={COLORS.textLight} />
                </TouchableOpacity>

                {expandedSection === 'appConfig' && (
                    <View style={styles.configForm}>
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.primary} />
                        ) : (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.imageUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={onboardingSettings.image}
                                        onChangeText={(text) => setOnboardingSettings({ ...onboardingSettings, image: text })}
                                        placeholder="https://..."
                                    />
                                    {onboardingSettings.image ? (
                                        <Image source={{ uri: onboardingSettings.image }} style={styles.previewImage} />
                                    ) : null}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.titleEn")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={onboardingSettings.title.en}
                                        onChangeText={(text) => setOnboardingSettings({ ...onboardingSettings, title: { ...onboardingSettings.title, en: text } })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.titleAr")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={onboardingSettings.title.ar}
                                        onChangeText={(text) => setOnboardingSettings({ ...onboardingSettings, title: { ...onboardingSettings.title, ar: text } })}
                                        textAlign="right"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.subtitleEn")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={onboardingSettings.subtitle.en}
                                        onChangeText={(text) => setOnboardingSettings({ ...onboardingSettings, subtitle: { ...onboardingSettings.subtitle, en: text } })}
                                        multiline
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.subtitleAr")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={onboardingSettings.subtitle.ar}
                                        onChangeText={(text) => setOnboardingSettings({ ...onboardingSettings, subtitle: { ...onboardingSettings.subtitle, ar: text } })}
                                        textAlign="right"
                                        multiline
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                    onPress={handleSaveSettings}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t("admin.manageSettings.save")}</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* Contact Us Settings */}
                <TouchableOpacity
                    style={[
                        styles.settingRow,
                        isRTL && styles.settingRowRTL,
                        expandedSection === 'contactUs' && { borderBottomWidth: 0 }
                    ]}
                    onPress={() => toggleSection('contactUs')}
                >
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="call-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.contactUs")}</Text>
                    </View>
                    <Ionicons name={expandedSection === 'contactUs' ? "chevron-up" : (isRTL ? "chevron-back" : "chevron-forward")} size={20} color={COLORS.textLight} />
                </TouchableOpacity>

                {expandedSection === 'contactUs' && (
                    <View style={styles.configForm}>
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.primary} />
                        ) : (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.whatsappNumber")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={contactUsSettings.whatsapp_number}
                                        onChangeText={(text) => setContactUsSettings({ ...contactUsSettings, whatsapp_number: text })}
                                        placeholder="966xxxxxxxxx"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.callNumber")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={contactUsSettings.call_number}
                                        onChangeText={(text) => setContactUsSettings({ ...contactUsSettings, call_number: text })}
                                        placeholder="+20xxxxxxxxxx"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.supportEmail")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={contactUsSettings.email}
                                        onChangeText={(text) => setContactUsSettings({ ...contactUsSettings, email: text })}
                                        placeholder="support@example.com"
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                    onPress={handleSaveContactUsSettings}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t("admin.manageSettings.save")}</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}

                {/* About Page Links Settings */}
                <TouchableOpacity
                    style={[
                        styles.settingRow,
                        isRTL && styles.settingRowRTL,
                        expandedSection === 'aboutLinks' && { borderBottomWidth: 0 }
                    ]}
                    onPress={() => toggleSection('aboutLinks')}
                >
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="link-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.aboutLinks")}</Text>
                    </View>
                    <Ionicons name={expandedSection === 'aboutLinks' ? "chevron-up" : (isRTL ? "chevron-back" : "chevron-forward")} size={20} color={COLORS.textLight} />
                </TouchableOpacity>

                {expandedSection === 'aboutLinks' && (
                    <View style={styles.configForm}>
                        {isLoading ? (
                            <ActivityIndicator color={COLORS.primary} />
                        ) : (
                            <>
                                <Text style={[styles.label, isRTL && styles.textRTL, { marginBottom: 10 }]}>{t("admin.manageSettings.visitWebsitesLinks")}</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.officialWebsiteUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.websites.official}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                websites: { ...aboutLinksSettings.websites, official: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.hotelBookingUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.websites.hotel_booking}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                websites: { ...aboutLinksSettings.websites, hotel_booking: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <Text style={[styles.label, isRTL && styles.textRTL, { marginBottom: 10, marginTop: 8 }]}>{t("admin.manageSettings.followUsLinks")}</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.facebookUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.facebook}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, facebook: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.instagramUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.instagram}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, instagram: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.xUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.x}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, x: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.linkedinUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.linkedin}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, linkedin: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.snapchatUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.snapchat}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, snapchat: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={[styles.label, isRTL && styles.textRTL]}>{t("admin.manageSettings.tiktokUrl")}</Text>
                                    <TextInput
                                        style={[styles.input, isRTL && styles.inputRTL]}
                                        value={aboutLinksSettings.socials.tiktok}
                                        onChangeText={(text) =>
                                            setAboutLinksSettings({
                                                ...aboutLinksSettings,
                                                socials: { ...aboutLinksSettings.socials, tiktok: text }
                                            })
                                        }
                                        placeholder="https://..."
                                        autoCapitalize="none"
                                    />
                                </View>

                                <TouchableOpacity
                                    style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
                                    onPress={handleSaveAboutLinksSettings}
                                    disabled={isSaving}
                                >
                                    {isSaving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{t("admin.manageSettings.save")}</Text>}
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                )}
            </View>

            {/* Preferences Section */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.manageSettings.preferences")}</Text>
            <View style={styles.card}>
                <View style={[styles.settingRow, isRTL && styles.settingRowRTL]}>
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="globe-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.language")}</Text>
                    </View>
                    <TouchableOpacity onPress={toggleLanguage} style={styles.langBtn}>
                        <Text style={styles.langText}>{language === 'en' ? 'English' : 'العربية'}</Text>
                    </TouchableOpacity>
                </View>
                <View style={[styles.settingRow, isRTL && styles.settingRowRTL, { borderBottomWidth: 0 }]}>
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="moon-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.darkMode")}</Text>
                    </View>
                    <Switch
                        value={false}
                        onValueChange={() => setToast({ visible: true, message: "Dark mode is coming soon!", type: 'info' })}
                    />
                </View>
            </View>

            {/* System Section */}
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("admin.manageSettings.system")}</Text>
            <View style={styles.card}>
                {/* Notification Settings */}
                <TouchableOpacity
                    style={[styles.settingRow, isRTL && styles.settingRowRTL]}
                    onPress={() => toggleSection('notifications')}
                >
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.notifications")}</Text>
                    </View>
                    <Ionicons name={expandedSection === 'notifications' ? "chevron-up" : (isRTL ? "chevron-back" : "chevron-forward")} size={20} color={COLORS.textLight} />
                </TouchableOpacity>

                {expandedSection === 'notifications' && (
                    <View style={styles.configForm}>
                        <View style={[styles.settingRow, isRTL && styles.settingRowRTL, { borderBottomWidth: 1, paddingHorizontal: 0 }]}>
                            <Text style={[styles.settingLabel, isRTL && styles.textRTL, { fontSize: 13 }]}>{t("admin.manageSettings.pushNotifications")}</Text>
                            <Switch value={true} onValueChange={() => { }} />
                        </View>
                        <View style={[styles.settingRow, isRTL && styles.settingRowRTL, { borderBottomWidth: 0, paddingHorizontal: 0 }]}>
                            <Text style={[styles.settingLabel, isRTL && styles.textRTL, { fontSize: 13 }]}>{t("admin.manageSettings.emailAlerts")}</Text>
                            <Switch value={true} onValueChange={() => { }} />
                        </View>
                    </View>
                )}

                {/* Security Logs -> Activities */}
                <TouchableOpacity
                    style={[styles.settingRow, isRTL && styles.settingRowRTL, { borderBottomWidth: 0 }]}
                    onPress={() => router.push('/(admin)/security-logs')}
                >
                    <View style={[styles.rowLeft, isRTL && styles.rowLeftRTL]}>
                        <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
                        <Text style={[styles.settingLabel, isRTL && styles.textRTL]}>{t("admin.manageSettings.security")}</Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                <Text style={styles.logoutText}>{t("admin.manageSettings.logout")}</Text>
            </TouchableOpacity>
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </ScrollView>
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
        overflow: 'hidden',
    },
    avatarImage: {
        width: 80,
        height: 80,
        borderRadius: 40,
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
    // Config Form Styles
    configForm: {
        padding: 16,
        backgroundColor: '#f8fafc',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textLight,
        marginBottom: 6,
    },
    input: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        padding: 10,
        fontSize: 14,
        color: COLORS.text,
    },
    inputRTL: {
        textAlign: 'right',
    },
    previewImage: {
        width: '100%',
        height: 150,
        borderRadius: 8,
        marginTop: 10,
        resizeMode: 'cover',
    },
    saveBtn: {
        backgroundColor: COLORS.primary,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
    },
    saveBtnText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 15,
    },
    // RTL Styles
    textRTL: {
        textAlign: 'right',
        marginEnd: 20,
    },
    settingRowRTL: {
        flexDirection: 'row-reverse',
    },
    rowLeftRTL: {
        flexDirection: 'row-reverse',
    },
});
