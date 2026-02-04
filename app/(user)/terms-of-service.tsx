import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";

const COLORS = {
    primary: "#0891b2",
    background: "#f0f9ff",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
};

export default function TermsOfServicePage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("legal.termsOfService.title")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <Text style={[styles.lastUpdated, isRTL && styles.textRTL]}>
                    {t("legal.lastUpdated", { date: new Date().toLocaleDateString(isRTL ? 'ar-SA' : 'en-US') })}
                </Text>

                <Section title={t("legal.termsOfService.introTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.introContent")}
                </Section>

                <Section title={t("legal.termsOfService.termsUseTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.termsUseContent")}
                </Section>

                <Section title={t("legal.termsOfService.termsServiceTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.termsServiceContent")}
                </Section>

                <Section title={t("legal.termsOfService.prohibitedTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.prohibitedContent")}
                </Section>

                <Section title={t("legal.termsOfService.paymentTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.paymentContent")}
                </Section>

                <Section title={t("legal.termsOfService.privacyTitle")} isRTL={isRTL}>
                    {t("legal.termsOfService.privacyContent")}
                </Section>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, isRTL && styles.textRTL]}>
                        {t("legal.termsOfService.footerText")}
                    </Text>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

function Section({ title, children, isRTL }: any) {
    return (
        <View style={styles.section}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{title}</Text>
            <Text style={[styles.sectionText, isRTL && styles.textRTL]}>{children}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 20,
        backgroundColor: COLORS.cardBg,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
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
    content: {
        padding: 20,
        paddingBottom: 110,
    },
    lastUpdated: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 24,
    },
    textRTL: {
        textAlign: 'right',
    },
    section: {
        marginBottom: 24,
        backgroundColor: COLORS.cardBg,
        padding: 16,
        borderRadius: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionText: {
        fontSize: 14,
        lineHeight: 22,
        color: COLORS.textLight,
    },
    footer: {
        marginTop: 20,
        alignItems: 'center',
    },
    footerText: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.primary,
        fontStyle: 'italic',
        textAlign: 'center',
    },
});
