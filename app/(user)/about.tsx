import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, Image, TouchableOpacity, Linking } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, FontAwesome6 } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { SettingsService, type AboutLinksSettings } from "../../src/services/settingsService";

const COLORS = {
    primary: "#1071b8",
    background: "#f0f9ff",
    white: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    cardBg: "#ffffff",
    border: "#e2e8f0",
};

export default function AboutPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const insets = useSafeAreaInsets();
    const [aboutLinks, setAboutLinks] = useState<AboutLinksSettings>({
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

    const handleLink = (url: string) => {
        const safeUrl = String(url || "").trim();
        if (!safeUrl) return;
        Linking.openURL(safeUrl).catch((err) => console.error("An error occurred", err));
    };

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const remote = await SettingsService.getAboutLinksSettings();
                if (mounted && remote) setAboutLinks(remote);
            } catch (e) {
                console.warn("[About] Failed to load about_links settings:", e);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    return (
        <View style={styles.container}>
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("about.title")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Hero Section */}
                <View style={styles.heroSection}>
                    <Image
                        source={require("../../assets/images/favicon.png")}
                        style={{ width: 120, height: 120, marginBottom: 16 }}
                        resizeMode="contain"
                    />
                    <Text style={styles.appName}>
                        {t("app.name")} {t("common.tiers.VIP")}
                    </Text>
                    <Text style={styles.version}>{t("about.version", { version: "1.0.0" })}</Text>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{t("about.tagline")}</Text>
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={[styles.description, isRTL && styles.textRTL]}>
                        {t("about.description")}
                    </Text>
                </View>

                {/* Features Grid */}
                <View style={[styles.featuresGrid, isRTL && styles.featuresGridRTL]}>
                    <FeatureCard
                        icon="diamond"
                        color="#f59e0b"
                        title={t("about.features.vipMembership")}
                        desc={t("about.features.vipMembershipDesc")}
                        isRTL={isRTL}
                    />
                    <FeatureCard
                        icon="gift"
                        color="#ec4899"
                        title={t("about.features.rewardsCashback")}
                        desc={t("about.features.rewardsCashbackDesc")}
                        isRTL={isRTL}
                    />
                    <FeatureCard
                        icon="shield-checkmark"
                        color="#10b981"
                        title={t("about.features.securePayments")}
                        desc={t("about.features.securePaymentsDesc")}
                        isRTL={isRTL}
                    />
                    <FeatureCard
                        icon="headset"
                        color="#3b82f6"
                        title={t("about.features.support247")}
                        desc={t("about.features.support247Desc")}
                        isRTL={isRTL}
                    />
                </View>

                {/* Detailed Information Sections */}
                <View style={styles.infoGrid}>
                    <DetailButton
                        icon="business"
                        title={t("about.sections.company.title")}
                        onPress={() => router.push("/(user)/about/company")}
                        isRTL={isRTL}
                    />
                    <DetailButton
                        icon="card"
                        title={t("about.sections.memberships.title")}
                        onPress={() => router.push("/(user)/about/memberships")}
                        isRTL={isRTL}
                    />
                    <DetailButton
                        icon="airplane"
                        title={t("about.sections.club.title")}
                        onPress={() => router.push("/(user)/about/club")}
                        isRTL={isRTL}
                    />
                    <DetailButton
                        icon="people"
                        title={t("about.sections.community.title")}
                        onPress={() => router.push("/(user)/about/community")}
                        isRTL={isRTL}
                    />
                </View>

                {/* Social Links */}
                <View style={styles.socialSection}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("about.visitWebsites")}</Text>
                    <View style={{ gap: 12, width: '100%', marginBottom: 24 }}>
                        <TouchableOpacity onPress={() => handleLink(aboutLinks.websites.official)} style={[styles.websiteBtn, isRTL && styles.websiteBtnRTL]}>
                            <Ionicons name="globe-outline" size={24} color={COLORS.primary} />
                            <Text style={[styles.websiteText, isRTL && styles.websiteTextRTL]}>{t("about.officialWebsite")}</Text>
                            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => handleLink(aboutLinks.websites.hotel_booking)} style={[styles.websiteBtn, isRTL && styles.websiteBtnRTL]}>
                            <Ionicons name="bed-outline" size={24} color={COLORS.primary} />
                            <Text style={[styles.websiteText, isRTL && styles.websiteTextRTL]}>{t("about.hotelBooking")}</Text>
                            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                        </TouchableOpacity>
                    </View>

                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t("about.followUs")}</Text>
                    <View style={styles.socialRowsContainer}>
                        <View style={styles.socialRow}>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.facebook)} style={[styles.socialBtn, { backgroundColor: '#1877f2' }]}>
                                <Ionicons name="logo-facebook" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.instagram)} style={[styles.socialBtn, { backgroundColor: '#e4405f' }]}>
                                <Ionicons name="logo-instagram" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.x)} style={[styles.socialBtn, { backgroundColor: '#000000' }]}>
                                <FontAwesome6 name="x-twitter" size={22} color="white" />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.socialRow}>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.linkedin)} style={[styles.socialBtn, { backgroundColor: '#0077b5' }]}>
                                <Ionicons name="logo-linkedin" size={24} color="white" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.snapchat)} style={[styles.socialBtn, { backgroundColor: '#FFFC00' }]}>
                                <Ionicons name="logo-snapchat" size={24} color="black" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => handleLink(aboutLinks.socials.tiktok)} style={[styles.socialBtn, { backgroundColor: '#000000' }]}>
                                <Ionicons name="logo-tiktok" size={24} color="white" />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Legal Links */}
                <View style={styles.legalSection}>
                    <TouchableOpacity
                        style={[styles.legalItem, isRTL && styles.legalItemRTL]}
                        onPress={() => router.push("/(user)/privacy-policy")}
                    >
                        <Text style={[styles.legalText, isRTL && styles.textRTL]}>{t("about.privacyPolicy")}</Text>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={[styles.legalItem, isRTL && styles.legalItemRTL]}
                        onPress={() => router.push("/(user)/terms-of-service")}
                    >
                        <Text style={[styles.legalText, isRTL && styles.textRTL]}>{t("about.termsOfService")}</Text>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                    </TouchableOpacity>
                </View>

                <Text style={styles.copyright}>{t("about.copyright", { year: new Date().getFullYear() })}</Text>

                <TouchableOpacity onPress={() => handleLink("https://dipencil.com/")} style={styles.developerContainer}>
                    <Text style={styles.developerText}>{t("about.developedBy")}</Text>
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function DetailButton({ icon, title, onPress, isRTL }: any) {
    return (
        <TouchableOpacity style={[styles.detailBtn, isRTL && styles.detailBtnRTL]} onPress={onPress}>
            <View style={styles.detailIconBg}>
                <Ionicons name={icon} size={22} color={COLORS.primary} />
            </View>
            <Text style={[styles.detailBtnText, isRTL && styles.textRTL]}>{title}</Text>
            <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={18} color={COLORS.textLight} />
        </TouchableOpacity>
    );
}

function FeatureCard({ icon, color, title, desc, isRTL }: any) {
    return (
        <View style={styles.featureCard}>
            <View style={[styles.featureIcon, { backgroundColor: `${color}20` }]}>
                <Ionicons name={icon} size={24} color={color} />
            </View>
            <Text style={[styles.featureTitle, isRTL && styles.textRTL]}>{title}</Text>
            <Text style={[styles.featureDesc, isRTL && styles.textRTL]}>{desc}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    infoGrid: {
        gap: 12,
        marginBottom: 30,
    },
    detailBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 12,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    detailBtnRTL: {
        flexDirection: 'row-reverse',
    },
    detailIconBg: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    detailBtnText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.text,
        marginHorizontal: 12,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: COLORS.white,
        borderBottomStartRadius: 30,
        borderBottomEndRadius: 30,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 5,
        zIndex: 10,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.cardBg,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 110,
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    appName: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.text,
        marginBottom: 4,
    },
    version: {
        fontSize: 16,
        color: COLORS.textLight,
        marginBottom: 12,
    },
    badge: {
        backgroundColor: '#dbeafe',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        color: COLORS.primary,
        fontWeight: '600',
        fontSize: 12,
    },
    section: {
        marginBottom: 30,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    textRTL: {
        textAlign: 'right',
    },
    featuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 30,
    },
    featuresGridRTL: {
        flexDirection: 'row-reverse',
    },
    featureCard: {
        width: '47%',
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    featureIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    featureTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    featureDesc: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'center',
    },
    socialSection: {
        alignItems: 'center',
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    socialRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 16,
    },
    socialRowsContainer: {
        alignItems: 'center',
    },
    socialBtn: {
        width: 50,
        height: 50,
        borderRadius: 25,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    websiteBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    websiteText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginStart: 12,
    },
    websiteBtnRTL: {
        flexDirection: 'row-reverse',
    },
    websiteTextRTL: {
        marginStart: 0,
        marginEnd: 12,
        textAlign: 'right',
    },
    legalSection: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 8,
        marginBottom: 30,
    },
    legalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
    },
    legalItemRTL: {
        flexDirection: 'row-reverse',
    },
    legalText: {
        fontSize: 16,
        color: COLORS.text,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginHorizontal: 16,
    },
    copyright: {
        textAlign: 'center',
        color: COLORS.textLight,
        fontSize: 12,
        marginBottom: 8,
    },
    developerContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    developerText: {
        textAlign: 'center',
        color: COLORS.primary,
        fontSize: 12,
        fontWeight: '600',
    },
});
