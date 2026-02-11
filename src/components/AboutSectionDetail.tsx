import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useLanguage } from "../contexts/LanguageContext";
import { LinearGradient } from "expo-linear-gradient";

const COLORS = {
    primary: "#1071b8",
    primaryLight: "#22d3ee",
    background: "#f8fafc",
    white: "#ffffff",
    text: "#0f172a",
    textLight: "#64748b",
    border: "#e2e8f0",
};

interface AboutSectionDetailProps {
    title: string;
    intro: string;
    sections: {
        title: string;
        content: string;
        icon: string;
    }[];
}

export default function AboutSectionDetail({ title, intro, sections }: AboutSectionDetailProps) {
    const router = useRouter();
    const { isRTL } = useLanguage();
    const insets = useSafeAreaInsets();

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{title}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Intro Hero Section */}
                <LinearGradient
                    colors={[COLORS.primary, COLORS.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.introHero}
                >
                    <View style={styles.quoteIconContainer}>
                        <Ionicons name="chatbox-ellipses" size={80} color="rgba(255,255,255,0.15)" />
                    </View>
                    <Text style={[styles.introText, isRTL && styles.textRTL]}>{intro}</Text>
                    <View style={[styles.heroBadge, isRTL ? { left: 24 } : { right: 24 }]}>
                        <Ionicons name="sparkles" size={16} color={COLORS.white} />
                    </View>
                </LinearGradient>

                {/* Sub Sections */}
                {sections.map((section, index) => (
                    <View key={index} style={styles.sectionCard}>
                        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
                            <View style={styles.iconContainer}>
                                <Ionicons name={section.icon as any} size={22} color={COLORS.primary} />
                            </View>
                            <Text style={styles.sectionTitle}>{section.title}</Text>
                        </View>
                        <Text style={[styles.sectionContent, isRTL && styles.textRTL]}>
                            {section.content}
                        </Text>
                    </View>
                ))}

                <View style={{ height: 40 }} />
            </ScrollView>
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
        backgroundColor: COLORS.white,
        borderBottomStartRadius: 24,
        borderBottomEndRadius: 24,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 4,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    scrollContent: {
        padding: 20,
    },
    introHero: {
        padding: 30,
        borderRadius: 24,
        marginBottom: 24,
        overflow: 'hidden',
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 8,
    },
    quoteIconContainer: {
        position: 'absolute',
        top: -10,
        right: -10,
    },
    introText: {
        fontSize: 20,
        lineHeight: 32,
        color: COLORS.white,
        fontWeight: 'bold',
        zIndex: 1,
    },
    heroBadge: {
        position: 'absolute',
        bottom: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    sectionCard: {
        backgroundColor: COLORS.white,
        padding: 24,
        borderRadius: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: `${COLORS.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        marginHorizontal: 8,
    },
    sectionContent: {
        fontSize: 16,
        lineHeight: 26,
        color: COLORS.textLight,
        textAlign: 'auto',
    },
    textRTL: {
        textAlign: 'right',
    },
});
