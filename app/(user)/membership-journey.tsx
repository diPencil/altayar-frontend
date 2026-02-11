import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    Modal,
    Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { pointsApi, membershipsApi, paymentsApi } from '../../src/services/api';
import { isMembershipActive } from '../../src/utils/membership';
import { emitMembershipRequired } from '../../src/utils/membershipGate';

const { width } = Dimensions.get('window');

const COLORS = {
    primary: '#1071b8',
    gold: '#f59e0b',
    silver: '#9ca3af',
    platinum: '#8b5cf6',
    background: '#f0f9ff',
    white: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    lightGray: '#e2e8f0',
    cardBg: '#ffffff',
    border: '#e2e8f0',
};

const TIER_IMAGES: Record<string, any> = {
    silver: require('../../assets/images/silver.png'),
    gold: require('../../assets/images/gold.png'),
    platinum: require('../../assets/images/platinum.png'),
    vip: require('../../assets/images/vip.png'),
    diamond: require('../../assets/images/diamond.png'),
    business: require('../../assets/images/business.png'),
};

// Theme definitions for mapping static styles to dynamic data
const TIER_THEMES: Record<string, any> = {
    silver: {
        color: '#9ca3af',
        gradientColors: ['#E0E7FF', '#FAFAFA'],
        primaryColor: '#475569',
        accentColor: '#64748b',
    },
    gold: {
        color: '#f59e0b',
        gradientColors: ['#FEF3C7', '#FFFBEB'],
        primaryColor: '#b45309',
        accentColor: '#d97706',
    },
    platinum: {
        color: '#8b5cf6',
        gradientColors: ['#F3E8FF', '#FAF5FF'],
        primaryColor: '#7e22ce',
        accentColor: '#9333ea',
    },
    vip: {
        color: '#10b981',
        gradientColors: ['#ECFDF5', '#F0FDF4'],
        primaryColor: '#047857',
        accentColor: '#059669',
    },
    diamond: {
        color: '#167dc1',
        gradientColors: ['#E0F2FE', '#F0F9FF'],
        primaryColor: '#0369a1',
        accentColor: '#0284c7',
    },
    business: {
        color: '#1e293b',
        gradientColors: ['#FEE2E2', '#FEF2F2'],
        primaryColor: '#b91c1c',
        accentColor: '#dc2626',
    },
};

const ARABIC_TIER_TITLES: Record<string, string> = {
    silver: "الباقة الفضية",
    gold: "الباقة الذهبية",
    platinum: "الباقة البلاتينية",
    vip: "باقة كبار الأشخاص",
    diamond: "الباقة الماسية",
    business: "باقة البزنس",
};

export default function MembershipJourneyScreen() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const { user } = useAuth();
    const insets = useSafeAreaInsets();
    const isMember = isMembershipActive(user);
    const [loading, setLoading] = useState(true);
    const [currentPoints, setCurrentPoints] = useState(0);
    const [tierHierarchy, setTierHierarchy] = useState<any[]>([]);
    const [selectedPlan, setSelectedPlan] = useState<any>(null);
    const [showCheckout, setShowCheckout] = useState(false);
    const [saveCard, setSaveCard] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            // Non-member: keep only "All membership tiers" visible (no personal points/tier/progress).
            if (!isMember) {
                const plansResponse = await membershipsApi.getPlans(true);
                setCurrentPoints(0);
                const sortedPlans = (plansResponse || []).sort((a: any, b: any) => {
                    const pointsA = a.perks?.points || a.price || 0;
                    const pointsB = b.perks?.points || b.price || 0;
                    return pointsA - pointsB;
                });
                // (Reuse existing mapping logic below by assigning to variable)
                const plansResponseLocal: any = sortedPlans;
                // continue with mapping below
                // Normalize backend codes to frontend keys
                const normalizeCode = (c: string) => {
                    const lc = c?.toLowerCase() || '';
                    if (lc === 'vm-club member' || lc.includes('vip')) return 'vip';
                    if (lc.includes('gold')) return 'gold';
                    if (lc.includes('platinum')) return 'platinum';
                    if (lc.includes('diamond')) return 'diamond';
                    if (lc.includes('business')) return 'business';
                    if (lc.includes('silver')) return 'silver';
                    return lc; // fallback
                };

                const mappedPlans = (plansResponseLocal || []).map((plan: any) => {
                    const rawCode = plan.tier_code?.toLowerCase() || '';
                    let code = normalizeCode(rawCode);

                    // Fallback: If code not found in themes, check Name
                    if (!TIER_THEMES[code]) {
                        const nameLower = (plan.tier_name_en || '').toLowerCase();
                        const nameLowerAr = (plan.tier_name_ar || '').toLowerCase();
                        if (nameLower.includes('gold') || nameLowerAr.includes('ذهبي')) code = 'gold';
                        else if (nameLower.includes('platinum') || nameLowerAr.includes('بلاتيني')) code = 'platinum';
                        else if (nameLower.includes('vip') || nameLowerAr.includes('vip')) code = 'vip';
                        else if (nameLower.includes('diamond') || nameLowerAr.includes('ماسي')) code = 'diamond';
                        else if (nameLower.includes('business') || nameLowerAr.includes('أعمال')) code = 'business';
                        else if (nameLower.includes('silver') || nameLowerAr.includes('فضي')) code = 'silver';
                    }

                    const theme = TIER_THEMES[code] || TIER_THEMES['silver']; // Fallback theme
                    const pointsFromPerks = plan.perks?.points;

                    return {
                        code: code,
                        nameEn: plan.tier_name_en,
                        nameAr: plan.tier_name_ar,
                        pointsNeeded: pointsFromPerks || 1000,
                        price: plan.price,
                        color: theme.color,
                        image: TIER_IMAGES[code] || TIER_IMAGES.silver,
                        gradientColors: theme.gradientColors,
                        primaryColor: theme.primaryColor,
                        accentColor: theme.accentColor,
                        descriptionEn: plan.description_en || plan.description || '',
                        descriptionAr: plan.description_ar || plan.description || '',
                    };
                });

                const POINTS_MAP: Record<string, number> = {
                    silver: 1500,
                    gold: 4000,
                    platinum: 8500,
                    vip: 18000,
                    diamond: 47000,
                    business: 100000
                };

                const enrichedPlans = mappedPlans.map((p: any) => ({
                    ...p,
                    pointsNeeded: p.pointsNeeded !== 1000 ? p.pointsNeeded : (POINTS_MAP[p.code] || 0)
                }));
                enrichedPlans.sort((a: any, b: any) => a.pointsNeeded - b.pointsNeeded);
                setTierHierarchy(enrichedPlans);
                return;
            }

            const [pointsResponse, plansResponse] = await Promise.all([
                pointsApi.getBalance(),
                membershipsApi.getPlans(true) // Get active plans
            ]);

            setCurrentPoints((pointsResponse as any).current_balance || (pointsResponse as any).balance || 0);

            // Process and Sort Plans: Sort by Points (preferred) or Price or Tier Order
            const sortedPlans = (plansResponse || []).sort((a: any, b: any) => {
                const pointsA = a.perks?.points || a.price || 0;
                const pointsB = b.perks?.points || b.price || 0;
                return pointsA - pointsB;
            });

            // Normalize backend codes to frontend keys
            const normalizeCode = (c: string) => {
                const lc = c?.toLowerCase() || '';
                if (lc === 'vm-club member' || lc.includes('vip')) return 'vip';
                if (lc.includes('gold')) return 'gold';
                if (lc.includes('platinum')) return 'platinum';
                if (lc.includes('diamond')) return 'diamond';
                if (lc.includes('business')) return 'business';
                if (lc.includes('silver')) return 'silver';
                return lc; // fallback
            };

            // Map API data to UI structure
            const mappedPlans = sortedPlans.map((plan: any) => {
                const rawCode = plan.tier_code?.toLowerCase() || '';
                let code = normalizeCode(rawCode);

                // Fallback: If code not found in themes, check Name
                if (!TIER_THEMES[code]) {
                    const nameLower = (plan.tier_name_en || '').toLowerCase();
                    const nameLowerAr = (plan.tier_name_ar || '').toLowerCase();
                    if (nameLower.includes('gold') || nameLowerAr.includes('ذهبي')) code = 'gold';
                    else if (nameLower.includes('platinum') || nameLowerAr.includes('بلاتيني')) code = 'platinum';
                    else if (nameLower.includes('vip') || nameLowerAr.includes('vip')) code = 'vip';
                    else if (nameLower.includes('diamond') || nameLowerAr.includes('ماسي')) code = 'diamond';
                    else if (nameLower.includes('business') || nameLowerAr.includes('أعمال')) code = 'business';
                    else if (nameLower.includes('silver') || nameLowerAr.includes('فضي')) code = 'silver';
                }

                const theme = TIER_THEMES[code] || TIER_THEMES['silver']; // Fallback theme

                // Get points from perks (where seed script puts them) or fallback
                const pointsFromPerks = plan.perks?.points;

                return {
                    code: code,
                    nameEn: plan.tier_name_en,
                    nameAr: plan.tier_name_ar,

                    pointsNeeded: pointsFromPerks || 1000,
                    price: plan.price,

                    color: theme.color,
                    image: TIER_IMAGES[code] || TIER_IMAGES.silver,

                    gradientColors: theme.gradientColors,
                    primaryColor: theme.primaryColor,
                    accentColor: theme.accentColor,

                    // Restore description mapping
                    descriptionEn: plan.description_en || plan.description || '',
                    descriptionAr: plan.description_ar || plan.description || '',
                };
            });

            // Fix points problem: If perks didn't have it, fallback to our map
            const POINTS_MAP: Record<string, number> = {
                silver: 1500,
                gold: 4000,
                platinum: 8500,
                vip: 18000,
                diamond: 47000,
                business: 100000
            };

            const enrichedPlans = mappedPlans.map((p: any) => ({
                ...p,
                pointsNeeded: p.pointsNeeded !== 1000 ? p.pointsNeeded : (POINTS_MAP[p.code] || 0)
            }));

            // Re-sort enriched plans by pointsNeeded to be absolutely sure
            enrichedPlans.sort((a: any, b: any) => a.pointsNeeded - b.pointsNeeded);

            setTierHierarchy(enrichedPlans);

        } catch (error) {
            console.error('Error loading data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectPlan = (plan: any) => {
        if (!isMember) {
            emitMembershipRequired({ source: "membership-journey/select-tier" });
            return;
        }
        // Don't allow selecting current tier or lower tiers
        if (plan.code === currentTier.code) {
            Alert.alert(t('common.info'), t('membership.alreadySubscribed', 'You are already subscribed to this plan.'));
            return;
        }

        // Find if it's an upgrade or downgrade
        const targetIndex = tierHierarchy.findIndex(t => t.code === plan.code);
        if (targetIndex < currentTierIndex && currentTierIndex !== -1) {
            Alert.alert(t('common.info'), t('membership.lowerTier', 'This is a lower tier than your current one.'));
            return;
        }

        setSelectedPlan(plan);
        setShowCheckout(true);
    };

    const handlePurchase = async () => {
        if (!selectedPlan || !user) return;
        if (!isMember) {
            emitMembershipRequired({ source: "membership-journey/checkout" });
            return;
        }

        try {
            setIsProcessing(true);

            const response = await paymentsApi.create({
                amount: selectedPlan.price,
                currency: 'USD',
                customer_first_name: user.first_name || 'User',
                customer_last_name: user.last_name || '',
                customer_email: user.email,
                customer_phone: user.phone || '',
                description: `Upgrade to ${selectedPlan.nameEn}`,
                payment_method_id: 1, // Defaulting to Card
                save_card: saveCard,
                // We'll need a way to link this payment to a membership order on the backend
                // For now, we pass a description and handle it via webhook/manual check
            });

            if (response && response.payment_url) {
                setShowCheckout(false);
                // Navigate to the payment screen we saw earlier
                router.push({
                    pathname: '/payment/[paymentId]',
                    params: {
                        paymentId: response.payment_id,
                        paymentUrl: response.payment_url
                    }
                });
            } else {
                throw new Error("Failed to get payment URL");
            }
        } catch (error: any) {
            console.error('Purchase error:', error);
            Alert.alert(
                t('common.error'),
                t('membership.purchaseFailed', 'Failed to initiate purchase. Please try again.')
            );
        } finally {
            setIsProcessing(false);
        }
    };

    // Helper for normalization (duplicate definition to be safe/accessible here if needed, or better inside component scope)
    const normalizeUserCode = (c: string) => {
        const lc = c?.toLowerCase() || '';
        if (lc === 'vm-club member' || lc.includes('vip')) return 'vip';
        if (lc.includes('gold')) return 'gold';
        if (lc.includes('platinum')) return 'platinum';
        if (lc.includes('diamond')) return 'diamond';
        if (lc.includes('business')) return 'business';
        if (lc.includes('silver')) return 'silver';
        return lc;
    };

    // 1. Get Assigned Tier (Source of Truth)
    // Try to match exact code, or fuzzy match if user has 'vip' but logic says 'platinum'
    const rawUserTierCode = user?.membership?.tier_code?.toLowerCase() || 'silver';
    const userTierCode = normalizeUserCode(rawUserTierCode);

    const currentTierIndex = tierHierarchy.findIndex(t => t.code === userTierCode);

    console.log('DEBUG: User Tier Code (Raw):', rawUserTierCode);
    console.log('DEBUG: User Tier Code (Normalized):', userTierCode);
    console.log('DEBUG: Tier Hierarchy Codes:', tierHierarchy.map(t => t.code));
    console.log('DEBUG: Match Index:', currentTierIndex);

    // Safeguard if data not loaded yet or tier not found
    // If not found, find the tier with points <= currentPoints (approximate)
    const currentTier = currentTierIndex >= 0
        ? tierHierarchy[currentTierIndex]
        : (tierHierarchy.find(t => t.pointsNeeded <= currentPoints) || tierHierarchy[0] || {});

    // 2. Determine Next Tier (Strict Hierarchy based on Points)
    // Next tier is the first tier with points > currentTier.pointsNeeded
    const nextTier = tierHierarchy.find(t => t.pointsNeeded > currentTier.pointsNeeded);

    // 3. Display Names
    const displayTierName = language === 'ar'
        ? (user?.membership?.plan_name_ar || currentTier.nameAr)
        : (user?.membership?.plan_name_en || currentTier.nameEn);

    // 4. Calculate Progress specific to this tier step
    // The user wants: Absolute Progress (Current / Target * 100)
    let pointsNeeded = 0;
    let progressPercent = 0;

    if (nextTier) {
        const targetPoints = nextTier.pointsNeeded || 0;

        // Points needed to reach NEXT tier
        pointsNeeded = Math.max(0, targetPoints - currentPoints);

        if (targetPoints > 0) {
            progressPercent = (currentPoints / targetPoints) * 100;
        } else {
            progressPercent = 100;
        }

        progressPercent = Math.min(100, Math.max(0, progressPercent));
    } else {
        progressPercent = 100;
    }

    // Helper to clean tier names for display
    const cleanTierName = (name: string) => name?.replace(/\s+Membership/i, '')?.replace(/عضوية/g, '')?.trim() || '';

    // Update names for display
    const nextTierName = nextTier
        ? cleanTierName(language === 'ar' ? nextTier.nameAr : nextTier.nameEn)
        : (language === 'ar' ? 'المستوى الأقصى' : 'Max Level');

    // Short taglines for the main card "Journey" description
    const TIER_TAGLINES: Record<string, any> = {
        silver: { en: "Your journey starts here.", ar: "رحلتك تبدأ هنا." },
        gold: { en: "Unlock premium rewards.", ar: "اكتشف مكافآت مميزة." },
        platinum: { en: "Experience luxury travel.", ar: "جرب قمة الرفاهية والسفر." },
        vip: { en: "Exclusive access awaits.", ar: "تمتع بامتيازات حصرية." },
        diamond: { en: "Elite status achieved.", ar: "وصلت إلى قمة التميز." },
        business: { en: "Professional excellence.", ar: "تميز احترافي لا يضاهى." },
    };

    // Helper to render Lounge Card Style
    const renderTierCard = (tier: any, isMain: boolean = false) => {
        if (!tier || !tier.code) return null; // Safety check

        const isCurrent = isMember && !!currentTier?.code && tier.code === currentTier.code;
        let tierName = language === 'ar' ? tier.nameAr : tier.nameEn;
        // Clean up name (e.g. "Silver Membership" -> "Silver")
        if (tierName) {
            tierName = tierName.replace(/Membership/i, '').replace(/عضوية/g, '').trim();
        }

        // For Main Card: Use generic short tagline. For others: Use API description (or hidden)
        const tagline = TIER_TAGLINES[tier.code] || TIER_TAGLINES['silver'];
        const description = isMain
            ? (language === 'ar' ? tagline.ar : tagline.en)
            : (language === 'ar' ? tier.descriptionAr : tier.descriptionEn);

        // Gradient Colors fallback
        const gradientColors = tier.gradientColors || [COLORS.silver + '20', COLORS.silver + '05'];
        const primaryColor = tier.primaryColor || COLORS.text;
        const accentColor = tier.accentColor || COLORS.textLight;

        return (
            <LinearGradient
                colors={gradientColors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.loungeCard, isMain && styles.loungeCardMain, isRTL && { flexDirection: 'row-reverse' }]}
            >
                <View style={[
                    styles.loungeContent,
                    isRTL ? { paddingStart: 10, paddingEnd: 0, alignItems: 'flex-end' } : { paddingEnd: 10, alignItems: 'flex-start' }
                ]}>
                    {isCurrent && (
                        <View style={[styles.badgeContainer, { backgroundColor: primaryColor, alignSelf: isRTL ? 'flex-end' : 'flex-start' }]}>
                            <Ionicons name="star" size={10} color="#fff" />
                            <Text style={styles.badgeText}>
                                {t('profile.current', 'CURRENT')}
                            </Text>
                        </View>
                    )}

                    <Text style={[styles.loungeTitle, { color: primaryColor, textAlign: isRTL ? 'right' : 'left' }]}>
                        {language === 'ar' && tier.code && ARABIC_TIER_TITLES[tier.code.toLowerCase()]
                            ? ARABIC_TIER_TITLES[tier.code.toLowerCase()]
                            : isRTL
                                ? `${t('tier.lounge', 'Lounge')} ${tierName}`
                                : `${tierName} ${t('tier.lounge', 'Lounge')}`
                        }
                    </Text>

                    {/* Show description for both Main (Tagline) and List (API Desc) */}
                    {description ? (
                        <Text style={[styles.loungeDesc, { color: accentColor, textAlign: isRTL ? 'right' : 'left' }]} numberOfLines={2}>
                            {description}
                        </Text>
                    ) : null}

                    {/* Hide Price/Points for Main Card, Show for List */}
                    {!isMain && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 }}>
                            <Text style={[styles.loungePoints, { color: accentColor }]}>
                                {tier.pointsNeeded?.toLocaleString()} {t('common.pts', 'PTS')}
                            </Text>

                            {tier.price && tier.price > 0 && (
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                    <View style={{ width: 1, height: 12, backgroundColor: accentColor, opacity: 0.3, marginEnd: 12 }} />
                                    <Text style={[styles.loungePoints, { color: primaryColor, fontWeight: '800' }]}>
                                        ${tier.price.toLocaleString()}
                                    </Text>
                                </View>
                            )}
                        </View>
                    )}
                </View>
                {tier.image && (
                    <Image
                        source={tier.image}
                        style={[
                            styles.loungeImage,
                            isRTL && {
                                right: undefined,
                                left: -15,
                                transform: [{ rotate: '10deg' }]
                            }
                        ]}
                        resizeMode="contain"
                    />
                )}
            </LinearGradient>
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.white} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
                    {t('profile.membershipJourney', 'Membership Journey')}
                </Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : (
                    <>
                        {/* Member-only: Current tier + progress */}
                        {isMember ? (
                            <>
                                {/* 1. Main Current Tier Card (Lounge Style) */}
                                <View style={styles.sectionContainer}>
                                    {renderTierCard(currentTier, true)}
                                </View>

                                {/* 2. Progress Section */}
                                <View style={styles.progressSection}>
                                    <View style={[styles.progressHeader, isRTL && styles.progressHeaderRTL]}>
                                        <Text style={[styles.progressTitle, isRTL && styles.textRTL]}>
                                            {t('profile.progressToNextTier', 'Progress to Next Tier')}
                                        </Text>
                                    </View>

                                    {nextTier ? (
                                        <>
                                            {/* Points Display */}
                                            <View style={[styles.pointsDisplay, isRTL && { flexDirection: 'row-reverse' }]}>
                                                <View style={styles.pointsBox}>
                                                    <Text style={styles.pointsValue}>{currentPoints.toLocaleString()}</Text>
                                                    <Text style={styles.pointsLabel}>
                                                        {t('profile.currentPoints', 'Current Points')}
                                                    </Text>
                                                </View>
                                                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={24} color={COLORS.gold} />
                                                <View style={styles.pointsBox}>
                                                    <Text style={[styles.pointsValue, { color: nextTier.color }]}>
                                                        {nextTier.pointsNeeded?.toLocaleString()}
                                                    </Text>
                                                    <Text style={styles.pointsLabel}>
                                                        {t('profile.targetPoints', 'Target Points')}
                                                    </Text>
                                                </View>
                                            </View>

                                            {/* Progress Bar */}
                                            <View style={styles.progressBarContainer}>
                                                <View style={styles.progressBarWrapper}>
                                                    <LinearGradient
                                                        colors={['#f59e0b', '#d97706', '#b45309']}
                                                        start={{ x: 0, y: 0 }}
                                                        end={{ x: 1, y: 0 }}
                                                        style={[styles.progressBarFill, { width: `${Math.max(2, Math.round(progressPercent))}%` }]}
                                                    />
                                                </View>
                                                <Text style={styles.progressPercent}>{Math.round(progressPercent)}%</Text>
                                            </View>

                                            {/* Points Needed */}
                                            <View style={[styles.pointsNeededCard, { flexDirection: isRTL ? 'row' : 'row-reverse' }]}>
                                                <Ionicons
                                                    name="trending-up"
                                                    size={32}
                                                    color={COLORS.gold}
                                                    style={isRTL ? { transform: [{ scaleX: -1 }] } : undefined}
                                                />
                                                <View style={[
                                                    styles.pointsNeededContent,
                                                    isRTL ? { marginStart: 16, marginEnd: 0, alignItems: 'flex-end' } : { marginEnd: 16, marginStart: 0, alignItems: 'flex-start' }
                                                ]}>
                                                    <Text style={[styles.pointsNeededTitle, isRTL && styles.textRTL]}>
                                                        {t('profile.pointsNeeded', 'Points Needed')}
                                                    </Text>
                                                    <Text style={[styles.pointsNeededValue, isRTL && styles.textRTL]}>
                                                        {pointsNeeded > 0 ? pointsNeeded.toLocaleString() : 0} {t('common.pts', 'pts')}
                                                    </Text>
                                                    <Text style={[styles.pointsNeededSubtitle, isRTL && styles.textRTL]}>
                                                        {language === 'ar'
                                                            ? `${t('profile.to')} ${nextTierName}`
                                                            : `${t('profile.to')} ${nextTierName}`}
                                                    </Text>
                                                </View>
                                            </View>
                                        </>
                                    ) : (
                                        <View style={styles.maxLevelCard}>
                                            <Ionicons name="trophy" size={60} color={COLORS.gold} />
                                            <Text style={styles.maxLevelTitle}>
                                                🎉 {t('profile.congratulations', 'Congratulations')}!
                                            </Text>
                                            <Text style={styles.maxLevelSubtitle}>
                                                {t('profile.congratulationsMaxLevel', 'You have reached the maximum tier level')}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </>
                        ) : (
                            <View style={styles.lockedNotice}>
                                <View style={[styles.lockedNoticeRow, isRTL && { flexDirection: 'row-reverse' }]}>
                                    <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
                                    <Text style={[styles.lockedNoticeTitle, isRTL && styles.textRTL]}>
                                        {t('membership.locked.title', 'Subscribe to unlock')}
                                    </Text>
                                </View>
                                <Text style={[styles.lockedNoticeBody, isRTL && styles.textRTL]}>
                                    {t('membership.locked.body', 'Subscribe to explore the app and access all features.')}
                                </Text>
                                <TouchableOpacity
                                    style={styles.lockedNoticeBtn}
                                    onPress={() => router.push('/(user)/memberships-explore' as any)}
                                >
                                    <Text style={styles.lockedNoticeBtnText}>
                                        {t('membership.locked.cta', 'View memberships')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* 3. All Tiers List (Using Lounge Style Cards) */}
                        <View style={styles.allTiersSection}>
                            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                                {t('profile.allTiers', 'All Membership Tiers')}
                            </Text>
                            {tierHierarchy.map((tier) => (
                                <TouchableOpacity
                                    key={tier.code || Math.random()}
                                    style={{ marginBottom: 16 }}
                                    activeOpacity={0.9}
                                    onPress={() => handleSelectPlan(tier)}
                                >
                                    {renderTierCard(tier)}
                                </TouchableOpacity>
                            ))}
                        </View>

                        {/* Checkout Modal (Member-only) */}
                        {isMember && (
                            <Modal
                                visible={showCheckout}
                                transparent={true}
                                animationType="slide"
                                onRequestClose={() => setShowCheckout(false)}
                            >
                                <View style={styles.modalOverlay}>
                                    <View style={styles.modalContent}>
                                        <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
                                            <Text style={styles.modalTitle}>
                                                {t('membership.checkout', 'Checkout')}
                                            </Text>
                                            <TouchableOpacity onPress={() => setShowCheckout(false)}>
                                                <Ionicons name="close" size={24} color={COLORS.text} />
                                            </TouchableOpacity>
                                        </View>

                                        {selectedPlan && (
                                            <View style={styles.planSummary}>
                                                <Text style={[styles.planSummaryLabel, isRTL && styles.textRTL]}>
                                                    {t('membership.selectedPlan', 'Selected Plan')}
                                                </Text>
                                                <View style={[styles.planSummaryCard, { borderColor: selectedPlan.color }, isRTL && { flexDirection: 'row-reverse' }]}>
                                                    <Text style={[styles.planSummaryName, { color: selectedPlan.primaryColor }]}>
                                                        {language === 'ar' && selectedPlan.code && ARABIC_TIER_TITLES[selectedPlan.code.toLowerCase()]
                                                            ? ARABIC_TIER_TITLES[selectedPlan.code.toLowerCase()]
                                                            : (language === 'ar' ? selectedPlan.nameAr : selectedPlan.nameEn)}
                                                    </Text>
                                                    <Text style={styles.planSummaryPrice}>
                                                        ${selectedPlan.price?.toLocaleString()}
                                                    </Text>
                                                </View>

                                                <View style={[styles.saveCardContainer, isRTL && { flexDirection: 'row-reverse' }]}>
                                                    <TouchableOpacity
                                                        style={[styles.checkbox, saveCard && styles.checkboxChecked]}
                                                        onPress={() => setSaveCard(!saveCard)}
                                                    >
                                                        {saveCard && <Ionicons name="checkmark" size={16} color="#fff" />}
                                                    </TouchableOpacity>
                                                    <Text style={[styles.saveCardText, isRTL && styles.textRTL, isRTL ? { marginEnd: 8 } : { marginStart: 8 }]}>
                                                        {t('membership.saveCard', 'Save card for future payments')}
                                                    </Text>
                                                </View>

                                                <TouchableOpacity
                                                    style={[styles.buyButton, isProcessing && styles.buyButtonDisabled]}
                                                    onPress={handlePurchase}
                                                    disabled={isProcessing}
                                                >
                                                    {isProcessing ? (
                                                        <ActivityIndicator color="#fff" />
                                                    ) : (
                                                        <Text style={styles.buyButtonText}>
                                                            {t('membership.payNow', 'Pay Now')}
                                                        </Text>
                                                    )}
                                                </TouchableOpacity>

                                                <Text style={styles.securePaymentText}>
                                                    <Ionicons name="lock-closed" size={12} color={COLORS.textLight} />
                                                    {' '}{t('membership.securePayment', 'Payments are secure and encrypted')}
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </Modal>
                        )}
                    </>
                )}
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
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 10,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    textRTL: {
        textAlign: 'right',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    sectionContainer: {
        marginBottom: 24,
    },
    lockedNotice: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 16,
    },
    lockedNoticeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    lockedNoticeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    lockedNoticeBody: {
        color: COLORS.textLight,
        lineHeight: 20,
        marginBottom: 12,
    },
    lockedNoticeBtn: {
        backgroundColor: COLORS.primary,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    lockedNoticeBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },

    // Lounge Card Styles (Adapted from tier-feed)
    loungeCard: {
        borderRadius: 20,
        padding: 24,
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
        height: 140, // Slightly compact for list
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    loungeCardMain: {
        height: 160, // Taller for main card
        marginBottom: 0,
        elevation: 6,
        shadowOpacity: 0.1,
    },
    loungeContent: {
        flex: 1,
        paddingEnd: 10,
        zIndex: 2,
        justifyContent: 'center',
    },
    loungeImage: {
        width: 110,
        height: 110,
        position: 'absolute',
        right: -15,
        bottom: -15,
        opacity: 0.9,
        transform: [{ rotate: '-10deg' }]
    },
    badgeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 8,
        gap: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    loungeTitle: {
        fontSize: 22,
        fontWeight: '800',
        marginBottom: 4,
    },
    loungeDesc: {
        fontSize: 13,
        fontWeight: '500',
        lineHeight: 18,
        marginBottom: 6,
    },
    loungePoints: {
        fontSize: 12,
        fontWeight: '700',
        opacity: 0.8,
    },

    // Progress Section
    progressSection: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    progressHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    pointsDisplay: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 24,
    },
    pointsBox: {
        alignItems: 'center',
    },
    pointsValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    pointsLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
    },
    progressBarContainer: {
        marginBottom: 24,
    },
    progressBarWrapper: {
        height: 16,
        backgroundColor: '#f1f5f9',
        borderRadius: 10,
        overflow: 'hidden',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: '#e2e8f0',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 8,
        minWidth: 8,
    },
    progressPercent: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.gold,
        textAlign: 'center',
    },
    pointsNeededCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fef3c7',
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: '#fde68a',
    },
    pointsNeededContent: {
        marginStart: 16,
        flex: 1,
    },
    pointsNeededTitle: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    pointsNeededValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.gold,
        marginBottom: 4,
    },
    pointsNeededSubtitle: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    maxLevelCard: {
        alignItems: 'center',
        padding: 32,
    },
    maxLevelTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 16,
        marginBottom: 8,
    },
    maxLevelSubtitle: {
        fontSize: 14,
        color: COLORS.textLight,
        textAlign: 'center',
    },

    // All Tiers Section
    allTiersSection: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 16,
        marginStart: 4,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.white,
        borderTopStartRadius: 30,
        borderTopEndRadius: 30,
        padding: 24,
        paddingBottom: 40,
        minHeight: 400,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: COLORS.text,
    },
    planSummary: {
        gap: 16,
    },
    planSummaryLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '600',
    },
    planSummaryCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    planSummaryName: {
        fontSize: 18,
        fontWeight: '800',
    },
    planSummaryPrice: {
        fontSize: 22,
        fontWeight: '900',
        color: COLORS.text,
    },
    saveCardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 8,
        paddingVertical: 8,
    },
    checkbox: {
        width: 24,
        height: 24,
        borderRadius: 6,
        borderWidth: 2,
        borderColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    checkboxChecked: {
        backgroundColor: COLORS.primary,
    },
    saveCardText: {
        fontSize: 15,
        color: COLORS.text,
        fontWeight: '500',
    },
    buyButton: {
        backgroundColor: COLORS.primary,
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 16,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    buyButtonDisabled: {
        opacity: 0.7,
    },
    buyButtonText: {
        color: COLORS.white,
        fontSize: 18,
        fontWeight: '800',
    },
    securePaymentText: {
        textAlign: 'center',
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
    },
});
