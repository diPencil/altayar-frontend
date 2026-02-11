import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Share,
    Clipboard,
    Alert,
    ActivityIndicator,
    Platform,
    Image,
    RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { api } from '../../src/services/api';

const COLORS = {
    primary: '#1071b8',
    background: '#f0f9ff',
    white: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    success: '#10b981',
    gold: '#f59e0b',
};

// Tier styles mapping (matching home page)
const TIER_STYLES: { [key: string]: { color: string, bgColor: string } } = {
    silver: { color: '#4b5563', bgColor: '#f1f5f9' },
    gold: { color: '#92400e', bgColor: '#fef3c7' },
    platinum: { color: '#6b21a8', bgColor: '#f3e8ff' },
    diamond: { color: '#0369a1', bgColor: '#e0f2fe' },
    vip: { color: '#064e3b', bgColor: '#d1fae5' },
    business: { color: '#991b1b', bgColor: '#fee2e2' },
    // Mappings for specific codes if needed
    'gm-club member': { color: '#92400e', bgColor: '#fef3c7' },
    'sm-club member': { color: '#4b5563', bgColor: '#f1f5f9' },
    'pm-club member': { color: '#6b21a8', bgColor: '#f3e8ff' },
};

const TIER_IMAGES: any = {
    silver: require('../../assets/images/silver.png'),
    gold: require('../../assets/images/gold.png'),
    platinum: require('../../assets/images/platinum.png'),
    diamond: require('../../assets/images/diamond.png'),
    vip: require('../../assets/images/vip.png'),
    business: require('../../assets/images/business.png'),
    'gm-club member': require('../../assets/images/gold.png'),
    'sm-club member': require('../../assets/images/silver.png'),
    'pm-club member': require('../../assets/images/platinum.png'),
};

const getTierStyle = (plan: any) => {
    const code = plan.tier_code?.toLowerCase();
    const name = (plan.tier_name_en || plan.plan_name_en || plan.name_en || '').toLowerCase();

    // 1. Try exact code match
    if (TIER_STYLES[code]) return TIER_STYLES[code];

    // 2. Try name includes
    if (name.includes('vip')) return TIER_STYLES['vip'];
    if (name.includes('business')) return TIER_STYLES['business'];
    if (name.includes('diamond')) return TIER_STYLES['diamond'];
    if (name.includes('platinum')) return TIER_STYLES['platinum'];
    if (name.includes('gold')) return TIER_STYLES['gold'];
    if (name.includes('silver')) return TIER_STYLES['silver'];

    // 3. Fallback
    return TIER_STYLES['silver'];
};

const getTierImage = (plan: any) => {
    const code = plan.tier_code?.toLowerCase();
    const name = (plan.tier_name_en || plan.plan_name_en || plan.name_en || '').toLowerCase();

    if (TIER_IMAGES[code]) return TIER_IMAGES[code];
    if (name.includes('vip')) return TIER_IMAGES['vip'];
    if (name.includes('business')) return TIER_IMAGES['business'];
    if (name.includes('diamond')) return TIER_IMAGES['diamond'];
    if (name.includes('platinum')) return TIER_IMAGES['platinum'];
    if (name.includes('gold')) return TIER_IMAGES['gold'];
    if (name.includes('silver')) return TIER_IMAGES['silver'];

    return TIER_IMAGES['silver'];
};

export default function ReferralScreen() {
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [referralCode, setReferralCode] = useState("");
    const [codeLoading, setCodeLoading] = useState(true);
    const [stats, setStats] = useState({
        totalReferrals: 0,
        totalPoints: 0,
        pendingReferrals: 0,
        loading: true,
    });
    const [loadingPlans, setLoadingPlans] = useState(true);
    const [membershipRewards, setMembershipRewards] = useState<any[]>([]);
    const [referralHistory, setReferralHistory] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadReferralData();
        loadMembershipPlans();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        await Promise.all([loadReferralData(), loadMembershipPlans()]);
        setRefreshing(false);
    };

    const loadMembershipPlans = async () => {
        try {
            setLoadingPlans(true);
            const response = await api.get('/memberships/plans') as any;
            const plans = response?.plans || response || [];

            // Debug: Log the first plan to see structure
            if (plans.length > 0) {
                console.log('First plan structure:', plans[0]);
            }

            // Map plans to rewards with 10% calculation
            const rewards = plans.map((plan: any) => {
                const price = parseFloat(plan.price) || 0;
                const reward = Math.round((price * 10) / 100); // 10% as points
                const tierCode = plan.tier_code?.toLowerCase() || 'silver';

                // Try multiple field names for tier names
                const tierEn = plan.tier_name_en || plan.plan_name_en || plan.name_en || plan.name || plan.tier_name || plan.title || tierCode.charAt(0).toUpperCase() + tierCode.slice(1);
                const tierAr = plan.tier_name_ar || plan.plan_name_ar || plan.name_ar || plan.tier_name_ar || tierEn;

                // Determine duration label
                const isLifetime = plan.plan_type === 'PAID_INFINITE' || !plan.duration_days;
                const durationEn = isLifetime ? 'Lifetime' : 'mo';
                const durationAr = isLifetime ? 'مدى الحياة' : 'شهرياً';

                const style = getTierStyle(plan);

                return {
                    tier: isRTL ? tierAr : tierEn,
                    tierAr: tierAr,
                    tierEn: tierEn,
                    price: price,
                    reward: reward,
                    color: style.color,
                    bgColor: style.bgColor,
                    custom: plan.plan_type === 'CUSTOM',
                    planType: plan.plan_type,
                    durationEn,
                    durationAr,
                    image: getTierImage(plan)
                };
            }).sort((a: any, b: any) => a.price - b.price);

            setMembershipRewards(rewards);
            setLoadingPlans(false);
        } catch (error) {
            console.error('Error loading membership plans:', error);
            setLoadingPlans(false);
            // Set fallback data
            setMembershipRewards([
                { tier: 'Silver', tierAr: 'فضي', tierEn: 'Silver', price: 0, reward: 0, color: '#94a3b8', custom: false },
                { tier: 'Gold', tierAr: 'ذهبي', tierEn: 'Gold', price: 9.99, reward: 1, color: '#f59e0b', custom: false },
            ]);
        }
    };

    const loadReferralData = async () => {
        try {
            setCodeLoading(true);
            try {
                const codeResponse = await api.get('/referrals/code') as any;
                const code = codeResponse?.code || codeResponse?.referral_code || `REF${user?.id?.toString().padStart(6, '0') || '000000'}`;
                setReferralCode(code);
            } catch (error) {
                const code = user?.id ? `REF${user.id.toString().padStart(6, '0')}` : 'REF000000';
                setReferralCode(code);
            } finally {
                setCodeLoading(false);
            }

            try {
                const statsResponse = await api.get('/referrals/stats') as any;
                setStats({
                    totalReferrals: statsResponse?.total_referrals || statsResponse?.totalReferrals || 0,
                    totalPoints: statsResponse?.total_points || statsResponse?.totalPoints || 0,
                    pendingReferrals: statsResponse?.pending_referrals || statsResponse?.pendingReferrals || 0,
                    loading: false,
                });
            } catch (error) {
                console.error('Error loading referral stats:', error);
                setStats({
                    totalReferrals: 0,
                    totalPoints: 0,
                    pendingReferrals: 0,
                    loading: false,
                });
            }

            try {
                const historyResponse = await api.get('/referrals/history') as any;
                const history = historyResponse?.referrals || historyResponse?.items || historyResponse || [];
                setReferralHistory(history.map((item: any) => ({
                    id: item.id,
                    status: item.status || 'PENDING',
                    points: item.points_earned || item.points || 0,
                    date: item.created_at || item.date || new Date().toISOString().split('T')[0],
                })));
            } catch (error) {
                console.error('Error loading referral history:', error);
                setReferralHistory([]);
            }
        } catch (error) {
            console.error('Error loading referral data:', error);
            setStats(prev => ({ ...prev, loading: false }));
            setCodeLoading(false);
        }
    };

    const copyToClipboard = () => {
        Clipboard.setString(referralCode);
        Alert.alert(
            t('referral.copied'),
            t('referral.codeCopied')
        );
    };

    const shareReferralCode = async () => {
        try {
            await Share.share({
                message: t('referral.shareMessage', { code: referralCode }),
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
                    <Ionicons name={isRTL ? 'arrow-forward' : 'arrow-back'} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>
                    {t('referral.title')}
                </Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                {/* Referral Code Card */}
                <View style={styles.codeCard}>
                    <Text style={styles.codeLabel}>
                        {t('referral.yourCode')}
                    </Text>
                    <View style={styles.codeBox}>
                        {codeLoading ? (
                            <ActivityIndicator size="small" color={COLORS.primary} />
                        ) : (
                            <Text style={styles.codeText}>{referralCode || '—'}</Text>
                        )}
                    </View>
                    <View style={[styles.actionButtons, isRTL && styles.rowRTL]}>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.copyBtn]}
                            onPress={copyToClipboard}
                            disabled={codeLoading}
                            opacity={codeLoading ? 0.6 : 1}
                        >
                            <Ionicons name="copy-outline" size={20} color={COLORS.white} />
                            <Text style={styles.actionBtnText}>{t('referral.copy')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.actionBtn, styles.shareBtn]}
                            onPress={shareReferralCode}
                            disabled={codeLoading}
                            opacity={codeLoading ? 0.6 : 1}
                        >
                            <Ionicons name="share-social-outline" size={20} color={COLORS.white} />
                            <Text style={styles.actionBtnText}>{t('referral.share')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Stats Cards */}
                <View style={[styles.statsGrid, isRTL && styles.rowRTL]}>
                    <View style={styles.statCard}>
                        <Ionicons name="people" size={32} color={COLORS.primary} />
                        <Text style={styles.statValue}>{stats.totalReferrals}</Text>
                        <Text style={styles.statLabel}>{t('referral.totalReferrals')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="star" size={32} color={COLORS.gold} />
                        <Text style={styles.statValue}>{stats.totalPoints}</Text>
                        <Text style={styles.statLabel}>{t('referral.pointsEarned')}</Text>
                    </View>
                    <View style={styles.statCard}>
                        <Ionicons name="time" size={32} color={COLORS.textLight} />
                        <Text style={styles.statValue}>{stats.pendingReferrals}</Text>
                        <Text style={styles.statLabel}>{t('referral.pending')}</Text>
                    </View>
                </View>

                {/* Rewards Calculator */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('referral.calculateRewards')}
                    </Text>
                    <Text style={styles.sectionDesc}>
                        {t('referral.rewardsDesc')}
                    </Text>
                    {loadingPlans ? (
                        <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 20 }} />
                    ) : (
                        <View style={styles.rewardsGrid}>
                            {membershipRewards.map((tier, idx) => (
                                <View key={idx} style={styles.rewardCard}>
                                    <View style={[styles.cardHeader, { backgroundColor: tier.bgColor }]}>
                                        <Image
                                            source={tier.image}
                                            style={styles.tierImage}
                                            resizeMode="contain"
                                        />
                                        <Text style={[styles.tierName, { color: tier.color }]}>{isRTL ? tier.tierAr : tier.tierEn}</Text>
                                    </View>

                                    <View style={styles.cardBody}>
                                        <View style={styles.pointsRow}>
                                            <Text style={[styles.pointsLabel, { color: tier.color, opacity: 0.8 }]}>{t('referral.pointsReward')}:</Text>
                                            <Text style={[styles.pointsValue, { color: tier.color }]}>
                                                {tier.custom ? (isRTL ? '؟' : '?') : `+${tier.reward}`}
                                            </Text>
                                        </View>
                                        <View style={styles.priceContainer}>
                                            {tier.custom ? (
                                                <Text style={[styles.customPrice, { color: tier.color, opacity: 0.8 }]}>{t('referral.customPrice')}</Text>
                                            ) : (
                                                <Text style={[styles.tierPrice, { color: tier.color }]}>
                                                    ${tier.price.toFixed(0)} <Text style={[styles.durationText, { color: tier.color, opacity: 0.8 }]}>{isRTL ? tier.durationAr : tier.durationEn}</Text>
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>

                {/* How It Works */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('referral.howItWorks')}
                    </Text>
                    <View style={styles.stepsList}>
                        {[
                            { icon: 'share-social', text: t('referral.steps.share') },
                            { icon: 'person-add', text: t('referral.steps.signUp') },
                            { icon: 'card', text: t('referral.steps.subscribe') },
                            { icon: 'star', text: t('referral.steps.earn') },
                        ].map((step, idx) => (
                            <View key={idx} style={[styles.stepItem, isRTL && styles.rowRTL]}>
                                <View style={styles.stepIcon}>
                                    <Ionicons name={step.icon as any} size={20} color={COLORS.primary} />
                                </View>
                                <Text style={[styles.stepText, isRTL && styles.textRTL]}>{step.text}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* Referral History */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                        {t('referral.history')}
                    </Text>
                    {stats.loading ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : referralHistory.length === 0 ? (
                        <Text style={styles.emptyText}>
                            {t('referral.noReferrals')}
                        </Text>
                    ) : (
                        referralHistory.map((item: any) => {
                            const isActive = String(item.status || '').toUpperCase() === 'ACTIVE';
                            const statusLabel = isActive
                                ? t('common.statuses.ACTIVE', t('common.statuses.active', 'Active'))
                                : t('common.statuses.PENDING', t('common.statuses.pending', 'Pending'));
                            return (
                                <View key={item.id} style={[styles.historyItem, isRTL && styles.rowRTL]}>
                                    <View style={styles.historyIcon}>
                                        <Ionicons
                                            name={isActive ? 'checkmark-circle' : 'time'}
                                            size={24}
                                            color={isActive ? COLORS.success : COLORS.textLight}
                                        />
                                    </View>
                                    <View style={styles.historyInfo}>
                                        <Text style={styles.historyStatus}>{statusLabel}</Text>
                                        <Text style={styles.historyDate}>{item.date}</Text>
                                    </View>
                                    <Text style={[styles.historyPoints, isActive && styles.activePoints]}>
                                        +{item.points} {t('referral.pts')}
                                    </Text>
                                </View>
                            );
                        })
                    )}
                </View>
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
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
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
    backBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
    },
    codeCard: {
        margin: 16,
        padding: 24,
        backgroundColor: COLORS.white,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    codeLabel: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 12,
    },
    codeBox: {
        backgroundColor: COLORS.background,
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: COLORS.primary,
        borderStyle: 'dashed',
    },
    content: {
        flex: 1,
        padding: 20,
        paddingTop: 10,
        paddingBottom: 110,
    },
    codeText: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.primary,
        letterSpacing: 2,
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    copyBtn: {
        backgroundColor: COLORS.primary,
    },
    shareBtn: {
        backgroundColor: COLORS.success,
    },
    actionBtnText: {
        color: COLORS.white,
        fontSize: 14,
        fontWeight: '600',
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '900',
        color: COLORS.text,
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        padding: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.text,
        marginBottom: 8,
    },
    sectionDesc: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 16,
    },
    rewardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    rewardCard: {
        width: '48%',
        borderRadius: 24,
        overflow: 'hidden',
        marginBottom: 8,
        backgroundColor: COLORS.white,
        // Add subtle border/shadow for white card against white bg
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    cardHeader: {
        padding: 16,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 12, // Reduced padding for closer visual connection
    },
    tierName: {
        fontSize: 13,
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    tierImage: {
        width: 70,
        height: 70,
        marginBottom: 4,
    },
    cardBody: {
        padding: 12,
        paddingTop: 12,
        alignItems: 'center',
        backgroundColor: COLORS.white,
    },
    pointsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 4,
    },
    pointsLabel: {
        fontSize: 11,
        fontWeight: '500',
    },
    pointsValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    priceContainer: {
        flexDirection: 'row',
        alignItems: 'baseline',
    },
    tierPrice: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    durationText: {
        fontSize: 10,
        fontWeight: '600',
    },
    customPrice: {
        fontSize: 12,
        fontStyle: 'italic',
        fontWeight: '500',
    },
    stepsList: {
        gap: 16,
    },
    stepItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    stepIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${COLORS.primary}15`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepText: {
        flex: 1,
        fontSize: 14,
        color: COLORS.text,
    },
    textRTL: {
        textAlign: 'right',
    },
    historyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.white,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 12,
    },
    historyIcon: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    historyInfo: {
        flex: 1,
    },
    historyStatus: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    historyDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    historyPoints: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textLight,
    },
    activePoints: {
        color: COLORS.success,
    },
    emptyText: {
        textAlign: 'center',
        color: COLORS.textLight,
        fontSize: 14,
        padding: 32,
    },
});
