import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';
import { isMembershipActive } from '../../src/utils/membership';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;

const TIER_CONFIG: any = {
    silver: { icon: require('../../assets/images/silver.png'), color: '#64748b', gradient: ['#D1D5DB', '#6B7280', '#374151'], lightColor: '#94a3b8' },
    gold: { icon: require('../../assets/images/gold.png'), color: '#b45309', gradient: ['#FFD700', '#F59E0B', '#B45309'], lightColor: '#f59e0b' },
    platinum: { icon: require('../../assets/images/platinum.png'), color: '#7e22ce', gradient: ['#A78BFA', '#7C3AED', '#4C1D95'], lightColor: '#a855f7' },
    vip: { icon: require('../../assets/images/vip.png'), color: '#047857', gradient: ['#34D399', '#059669', '#064E3B'], lightColor: '#10b981' },
    diamond: { icon: require('../../assets/images/diamond.png'), color: '#0369a1', gradient: ['#38BDF8', '#0284C7', '#0C4A6E'], lightColor: '#0ea5e9' },
    business: { icon: require('../../assets/images/business.png'), color: '#b91c1c', gradient: ['#F87171', '#DC2626', '#7F1D1D'], lightColor: '#ef4444' },
};

const COLORS = {
    primary: "#1071b8",
    primaryDark: "#0e7490",
    background: "#f0f9ff",
    white: "#ffffff",
    gray: "#94a3b8",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
};

export default function MemberCardScreen() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const { user, refreshUser } = useAuth();
    const isMember = isMembershipActive(user);

    const [loading, setLoading] = useState(true);
    const [planData, setPlanData] = useState<any>(null);
    const [benefitsData, setBenefitsData] = useState<any>(null);

    // Get user and membership info
    const userName = user ? `${user.first_name} ${user.last_name}` : "Guest";
    const membershipId = user?.membership_id_display || "--";

    // Robust tier config matcher using Plan Name (Primary) and Code (Fallback)
    const getSafeTierConfig = (nameOrCode: string | undefined) => {
        const normalized = (nameOrCode || '').toLowerCase();
        if (!normalized) return TIER_CONFIG.silver;

        // Fuzzy match (Name/Code) - Priority order matching Home Screen
        if (normalized.includes('vip')) return TIER_CONFIG.vip;
        if (normalized.includes('platinum')) return TIER_CONFIG.platinum;
        if (normalized.includes('diamond')) return TIER_CONFIG.diamond;
        if (normalized.includes('business')) return TIER_CONFIG.business;
        if (normalized.includes('gold')) return TIER_CONFIG.gold;
        if (normalized.includes('silver')) return TIER_CONFIG.silver;

        // Final fallback: check keys
        if (TIER_CONFIG[normalized]) return TIER_CONFIG[normalized];

        return TIER_CONFIG.silver;
    };

    // Use Plan Name ENGLISH as primary source, fallback to code
    const tierIdentifier = planData?.tier_name_en || user?.membership?.plan_name_en || planData?.tier_code || user?.membership?.tier_code || 'silver';
    const membershipTier = tierIdentifier?.toLowerCase()?.trim();
    const tierConfig = getSafeTierConfig(tierIdentifier);

    useEffect(() => {
        if (user) {
            console.log('Membership Debug:', {
                rawTierCode: user?.membership?.tier_code,
                planIdentifier: tierIdentifier,
                resolvedTierConfig: tierConfig?.color
            });
        }
    }, [user, membershipTier, planData, tierConfig, tierIdentifier]);

    useEffect(() => {
        // Refresh user data to get latest membership info (only if member)
        if (isMember) {
            refreshUser();
            loadMembershipData();
        } else {
            // Non-member: do not fetch membership/benefits data
            setPlanData(null);
            setBenefitsData(null);
            setLoading(false);
        }
    }, []);

    const loadMembershipData = useCallback(async () => {
        try {
            setLoading(true);

            // Get membership plans
            const plansResponse = await api.get('/memberships/plans');
            const plans = plansResponse as any[];

            // Find user's plan
            const userPlan = plans.find((plan: any) => {
                return plan.tier_code?.toUpperCase() === user?.membership?.tier_code?.toUpperCase() ||
                    plan.tier_name_en?.toLowerCase() === membershipTier?.toLowerCase();
            });

            setPlanData(userPlan);

            // Get benefits if plan found
            if (userPlan?.tier_code) {
                try {
                    const benefits = await api.get(`/memberships/benefits/by-plan-code/${userPlan.tier_code.toUpperCase()}`) as any;
                    setBenefitsData(benefits);
                } catch (benefitsError) {
                    console.log('Benefits not found:', benefitsError);
                }
            }
        } catch (error) {
            console.error('Error loading membership data:', error);
        } finally {
            setLoading(false);
        }
    }, [user, membershipTier]);

    const handleShare = async () => {
        try {
            const shareMessage = t('membership.shareMessage', 'Check out my membership card!');
            const message = `${shareMessage}\n\nMember: ${userName}\nMembership ID: ${membershipId}\nPlan: ${planData?.tier_name_en || membershipTier}`;

            await Share.share({
                message,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={tierConfig.color} />
            </View>
        );
    }

    if (!isMember) {
        return (
            <View style={styles.container}>
                <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
                    {/* Header */}
                    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                            <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                        </TouchableOpacity>
                        <Text style={styles.headerTitle}>{t('membershipCard', 'Membership Card')}</Text>
                        <View style={{ width: 44 }} />
                    </View>

                    <View style={styles.cardContainer}>
                        <LinearGradient
                            colors={['#0f172a', '#334155', '#64748b']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.membershipCard}
                        >
                            <View style={styles.cardContent}>
                                <View style={[styles.profileHeaderRow]}>
                                    <View style={styles.avatarSection}>
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="lock-closed" size={35} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    </View>
                                    <View style={[styles.userInfoColumn, isRTL && styles.userInfoColumnRTL]}>
                                        <Text style={[styles.userName, isRTL && styles.textRTL]}>{userName}</Text>
                                        <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user?.email}</Text>
                                    </View>
                                </View>

                                <View style={styles.keyInfoContainer}>
                                    <Text style={[styles.infoValueClean, isRTL && styles.textRTL]}>
                                        {t('membership.locked.body', 'Subscribe to explore the app and access all features.')}
                                    </Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: COLORS.primary }]}
                            onPress={() => router.push('/(user)/memberships-explore' as any)}
                        >
                            <Ionicons name="star" size={20} color={COLORS.white} />
                            <Text style={styles.primaryButtonText}>
                                {t('membership.locked.cta', 'View memberships')}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Keep basic content: instructions but reworded */}
                    <View style={[styles.infoSection, { marginBottom: insets.bottom + 20 }]}>
                        <Text style={[styles.infoTitle, isRTL && styles.textRTL]}>
                            {t('membership.plans.categoriesTitle', 'Membership tiers')}
                        </Text>
                        <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                            {t('membership.plans.intro', 'Explore our membership tiers. Contact us to subscribe and unlock the full app experience.')}
                        </Text>
                    </View>
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>

                {/* Header */}
                <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>{t('membershipCard', 'Membership Card')}</Text>
                    <TouchableOpacity onPress={handleShare} style={styles.shareButton}>
                        <Ionicons name="share-social" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                {/* Main Membership Card - Clean & Simple Design */}
                <View style={styles.cardContainer}>
                    <LinearGradient
                        colors={tierConfig.gradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.membershipCard}
                    >
                        {/* Card Content - Modern Layout */}
                        <View style={styles.cardContent}>
                            {/* Profile Header Row */}
                            <View style={[styles.profileHeaderRow]}>
                                <View style={styles.avatarSection}>
                                    {user?.avatar ? (
                                        <Image source={{ uri: user.avatar }} style={styles.avatar} />
                                    ) : (
                                        <View style={styles.avatarPlaceholder}>
                                            <Ionicons name="person" size={35} color={tierConfig.color} />
                                        </View>
                                    )}
                                </View>

                                <View style={[styles.userInfoColumn, isRTL && styles.userInfoColumnRTL]}>
                                    <Text style={[styles.userName, isRTL && styles.textRTL]}>{userName}</Text>
                                    {user?.username && (
                                        <Text style={[styles.userHandle, isRTL && styles.textRTL]}>
                                            {t("common.usernameHandle", { username: user.username })}
                                        </Text>
                                    )}
                                    <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user?.email}</Text>
                                </View>

                                <View style={styles.tierIconSection}>
                                    <Image source={tierConfig.icon} style={styles.tierIconSmall} resizeMode="contain" />
                                </View>
                            </View>

                            {/* Key Information - Simplified */}
                            <View style={styles.keyInfoContainer}>
                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabelClean, isRTL && styles.textRTL]}>
                                        {t('membership.plan', 'Plan')}:
                                    </Text>
                                    <Text style={[styles.infoValueClean, isRTL && styles.textRTL]}>
                                        {language === 'ar'
                                            ? (planData?.tier_name_ar || planData?.plan_name_ar || planData?.tier_name_en || membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1))
                                            : (planData?.tier_name_en || planData?.plan_name_en || membershipTier.charAt(0).toUpperCase() + membershipTier.slice(1))
                                        }
                                    </Text>
                                </View>

                                <View style={styles.infoRow}>
                                    <Text style={[styles.infoLabelClean, isRTL && styles.textRTL]}>
                                        {t('membershipId', 'ID')}:
                                    </Text>
                                    <Text style={[styles.infoValueClean, isRTL && styles.textRTL]}>{membershipId}</Text>
                                </View>

                                <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                                    <Text style={[styles.infoLabelClean, isRTL && styles.textRTL]}>
                                        {t('membership.status', 'Status')}:
                                    </Text>
                                    <Text style={[styles.infoValueClean, isRTL && styles.textRTL]}>
                                        {t('membership.active', 'Active')}
                                    </Text>
                                </View>

                                {/* Points & Balance - Compact */}
                                <View style={styles.pointsContainer}>
                                    <View style={styles.pointItem}>
                                        <Ionicons name="trophy" size={16} color="rgba(255,255,255,0.9)" />
                                        <Text style={[styles.pointValue, { color: 'rgba(255,255,255,0.9)' }]}>
                                            {user?.membership?.points_balance || user?.points?.current_balance || 0}
                                        </Text>

                                    </View>

                                    <View style={styles.pointItem}>
                                        <Ionicons name="wallet" size={16} color="rgba(255,255,255,0.9)" />
                                        <Text style={[styles.pointValue, { color: 'rgba(255,255,255,0.9)' }]}>
                                            {(user?.wallet_balance || 0).toFixed(2)}
                                        </Text>

                                    </View>

                                    <View style={styles.pointItem}>
                                        <Ionicons name="gift" size={16} color="rgba(255,255,255,0.9)" />
                                        <Text style={[styles.pointValue, { color: 'rgba(255,255,255,0.9)' }]}>
                                            {(user?.cashback_balance || 0).toFixed(2)}
                                        </Text>

                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* Card Footer - Simple Design */}
                        <View style={styles.cardFooter}>
                            <Text style={[styles.footerText, { color: 'rgba(255,255,255,0.8)' }, isRTL && styles.textRTL]}>
                                Valid membership • Issued by AltayarVIP
                            </Text>
                        </View>
                    </LinearGradient>
                </View>

                {/* Action Buttons - Clean Design */}
                <View style={styles.actionsContainer}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: tierConfig.color }]}
                        onPress={() => router.push({
                            pathname: '/(user)/membership-details',
                            params: {
                                tier: membershipTier,
                                tier_code: user?.membership?.tier_code || planData?.tier_code || membershipTier.toUpperCase()
                            }
                        })}
                    >
                        <Ionicons name="information-circle" size={20} color={COLORS.white} />
                        <Text style={styles.primaryButtonText}>
                            {t('membership.viewDetails', 'View Details')}
                        </Text>
                    </TouchableOpacity>


                </View>

                {/* Additional Info */}
                <View style={[styles.infoSection, { marginBottom: insets.bottom + 20 }]}>
                    <Text style={[styles.infoTitle, isRTL && styles.textRTL]}>
                        {t('membership.cardInstructions', 'Card Instructions')}
                    </Text>
                    <View style={styles.infoList}>
                        <View style={styles.instructionItem}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                                {t('membership.presentCard', 'Present this card to avail membership benefits')}
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                                {t('membership.keepSafe', 'Keep this card safe and do not share with others')}
                            </Text>
                        </View>
                        <View style={styles.instructionItem}>
                            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
                            <Text style={[styles.infoText, isRTL && styles.textRTL]}>
                                {t('membership.contactSupport', 'Contact support for any membership related queries')}
                            </Text>
                        </View>
                    </View>
                </View>

            </ScrollView >
        </View >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
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

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
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
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    cardContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    membershipCard: {
        borderRadius: 20,
        overflow: 'hidden',
        width: '100%',
        minHeight: 220,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 5,
    },
    cardHeader: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        // backgroundColor removed
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.white,
        textAlign: 'center',
    },
    cardSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.8)',
        textAlign: 'center',
        marginTop: 4,
    },
    cardContent: {
        padding: 20,
    },
    profileHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 16,
    },

    userInfoColumn: {
        flex: 1,
        justifyContent: 'center',
    },
    userInfoColumnRTL: {
        alignItems: 'flex-start',
    },
    avatarSection: {
        // marginBottom removed
    },
    avatar: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    avatarPlaceholder: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.5)',
        backgroundColor: 'rgba(255,255,255,0.2)',
    },
    userName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.white,
        marginBottom: 2,
    },
    userHandle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.9)',
        marginBottom: 2,
        fontWeight: '500',
    },
    userEmail: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    tierIconSection: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    tierIconSmall: {
        width: 60,
        height: 60,
    },
    keyInfoContainer: {
        width: '100%',
        backgroundColor: 'rgba(255,255,255,0.15)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.2)',
    },
    infoLabelClean: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    infoValueClean: {
        fontSize: 14,
        color: COLORS.white,
        fontWeight: '600',
    },
    pointsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.2)',
    },
    pointItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    pointValue: {
        fontSize: 16,
        fontWeight: '600',
    },
    pointLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    cardFooter: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: COLORS.gray + '10',
    },
    footerText: {
        fontSize: 12,
        fontWeight: '500',
        textAlign: 'center',
    },
    actionsContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
        gap: 12,
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    primaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.white,
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.white,
        borderWidth: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    secondaryButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    infoSection: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    infoList: {
        gap: 12,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    infoText: {
        fontSize: 14,
        color: COLORS.textLight,
        flex: 1,
        lineHeight: 20,
    },
    textRTL: {
        textAlign: 'right',
    },
});