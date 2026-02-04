import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Dimensions,
    Image,
    ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { api } from '../../src/services/api';

const { width, height } = Dimensions.get('window');
const isSmallScreen = width < 375;
const isMediumScreen = width >= 375 && width < 414;

const TIER_CONFIG: any = {
    silver: { icon: require('../../assets/images/silver.png'), color: '#64748b', bgColor: '#f8fafc', lightColor: '#94a3b8' },
    gold: { icon: require('../../assets/images/gold.png'), color: '#b45309', bgColor: '#fffbeb', lightColor: '#f59e0b' },
    platinum: { icon: require('../../assets/images/platinum.png'), color: '#7e22ce', bgColor: '#faf5ff', lightColor: '#a855f7' },
    vip: { icon: require('../../assets/images/vip.png'), color: '#047857', bgColor: '#f0fdf4', lightColor: '#10b981' },
    diamond: { icon: require('../../assets/images/diamond.png'), color: '#0369a1', bgColor: '#f0f9ff', lightColor: '#0ea5e9' },
    business: { icon: require('../../assets/images/business.png'), color: '#b91c1c', bgColor: '#fef2f2', lightColor: '#ef4444' },
};

// Helper function to render list items in modern card style
const renderListSection = (title: string, items: any[], icon: string, config: any, isRTL: boolean, language: string) => {
    if (!items || items.length === 0) return null;

    return (
        <View style={styles.modernSection}>
            <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
                <View style={[styles.titleIcon, { backgroundColor: `${config.color} 15` }]}>
                    <Ionicons name={icon as any} size={20} color={config.color} />
                </View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.textRTL, { color: config.color }]}>
                    {title}
                </Text>
            </View>
            <View style={styles.modernCard}>
                {items.map((item: any, index: number) => {
                    const itemTitle = typeof item === 'string' ? item : (item.title || '');
                    const itemValue = typeof item === 'object' ? item.value : '';
                    const itemDesc = typeof item === 'object' ? item.description : '';

                    return (
                        <View key={index}>
                            <View style={[styles.modernListItem, isRTL && styles.modernListItemRTL]}>
                                <View style={[styles.modernBullet, { backgroundColor: config.color }]} />
                                <View style={styles.modernListItemContent}>
                                    <View style={[styles.itemTitleRow, isRTL && styles.itemTitleRowRTL]}>
                                        {itemValue && (
                                            <View style={[styles.itemValueBadge, { backgroundColor: `${config.color} 15` }]}>
                                                <Text style={[styles.itemValueText, { color: config.color }]}>
                                                    {itemValue.includes('%') ? itemValue : `${itemValue}% `}
                                                </Text>
                                            </View>
                                        )}
                                        <Text style={[styles.modernListItemText, isRTL && styles.textRTL]}>
                                            {itemTitle}
                                        </Text>
                                    </View>
                                    {itemDesc && (
                                        <Text style={[styles.modernListItemDesc, isRTL && styles.textRTL]}>
                                            {itemDesc}
                                        </Text>
                                    )}
                                </View>
                            </View>
                            {index < items.length - 1 && <View style={styles.itemDivider} />}
                        </View>
                    );
                })}
            </View>
        </View>
    );
};

// Helper function to render text sections in modern style
const renderTextSection = (title: string, text: string, icon: string, config: any, isRTL: boolean, language: string) => {
    if (!text) return null;

    return (
        <View style={styles.modernSection}>
            <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
                <View style={[styles.titleIcon, { backgroundColor: `${config.color} 15` }]}>
                    <Ionicons name={icon as any} size={20} color={config.color} />
                </View>
                <Text style={[styles.modernSectionTitle, isRTL && styles.textRTL, { color: config.color }]}>
                    {title}
                </Text>
            </View>
            <View style={[styles.modernCard, styles.modernTextCard]}>
                <Text style={[styles.modernTextContent, isRTL && styles.textRTL]}>
                    {text}
                </Text>
            </View>
        </View>
    );
};

export default function MembershipDetailsScreen() {
    const params = useLocalSearchParams();
    const { tier, tier_code } = params;
    const { t } = useTranslation();
    const { isRTL, language } = useLanguage();
    const insets = useSafeAreaInsets();

    const tierKey = (tier as string) || 'silver';
    const tierCode = (tier_code as string) || null;
    const config = TIER_CONFIG[tierKey] || TIER_CONFIG.silver;

    // Get tier data from translations for fallback
    const tierData = t(`membershipTiers.${tierKey}`, { returnObjects: true }) as any;

    // State for real plan data from API
    const [planData, setPlanData] = useState<any>(null);
    const [benefitsData, setBenefitsData] = useState<any>(null);
    const [upgradePlan, setUpgradePlan] = useState<any>(null);
    const [allPlans, setAllPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Fetch real membership plan data from API
    useEffect(() => {
        const fetchPlanData = async () => {
            try {
                setLoading(true);
                const response = await api.get('/memberships/plans');
                setAllPlans(response as any[]);

                // Find the plan matching current tier or tier_code
                const plan = (response as any[]).find((p: any) => {
                    if (tierCode) {
                        // Match by exact tier_code or by prefix (e.g., GM-CLUB MEMBER matches GM)
                        const pCode = p.tier_code?.toUpperCase() || '';
                        const searchCode = tierCode.toUpperCase();
                        if (pCode === searchCode || pCode.startsWith(searchCode + '-') || pCode.startsWith(searchCode)) {
                            return true;
                        }
                    }
                    // Match by tierKey (silver, gold, etc.)
                    const pCode = p.tier_code?.toUpperCase() || '';
                    const pNameEn = p.tier_name_en?.toLowerCase() || '';
                    const pNameAr = p.tier_name_ar?.toLowerCase() || '';
                    const searchKey = tierKey?.toLowerCase() || '';

                    // Check if tier_code starts with matching prefix
                    if (searchKey === 'silver' && pCode.startsWith('SM')) return true;
                    if (searchKey === 'gold' && pCode.startsWith('GM')) return true;
                    if (searchKey === 'platinum' && pCode.startsWith('PM')) return true;
                    if (searchKey === 'vip' && pCode.startsWith('VM')) return true;
                    if (searchKey === 'diamond' && pCode.startsWith('DM')) return true;
                    if (searchKey === 'business' && pCode.startsWith('BM')) return true;

                    // Fallback to name matching
                    return pCode.toLowerCase() === searchKey ||
                        pNameEn === searchKey ||
                        pNameAr === searchKey ||
                        pNameEn.includes(searchKey) ||
                        pNameAr.includes(searchKey);
                });

                setPlanData(plan);

                // Fetch benefits using tier_code if available, otherwise use plan's tier_code
                const codeToUse = tierCode || plan?.tier_code;

                if (codeToUse) {
                    try {
                        const benefits = await api.get(`/memberships/benefits/by-plan-code/${codeToUse.toUpperCase()}`) as any;
                        setBenefitsData(benefits);

                        // If upgrade_to_plan_id exists, find the upgrade plan
                        if (benefits?.upgrade_to_plan_id) {
                            const upgrade = (response as any[]).find((p: any) => p.id === benefits.upgrade_to_plan_id);
                            setUpgradePlan(upgrade);
                        }
                    } catch (benefitsError: any) {
                        if (benefitsError.response?.status !== 404) {
                            console.error('Error fetching benefits:', benefitsError);
                        }
                    }
                }
            } catch (error) {
                console.error('Error fetching plan data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchPlanData();
    }, [tierKey, tierCode]);

    if (loading) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color={config.color} />
            </View>
        );
    }

    // Get plan name from API or fallback
    const planName = planData?.tier_name_en || planData?.tier_name_ar || planData?.plan_name_en || planData?.plan_name_ar ||
        t(`membershipTiers.${tierKey}.name`, tierKey.charAt(0).toUpperCase() + tierKey.slice(1));
    const planDescription = planData?.description_en || planData?.description_ar ||
        t(`membershipTiers.${tierKey}.description`, '');

    return (
        <View style={[styles.container, { backgroundColor: '#f8fafc' }]}>
            <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView} contentContainerStyle={{ paddingBottom: 100 }}>

                {/* Hero Header Section */}
                <View style={styles.heroContainer}>
                    <Image
                        source={benefitsData?.image_url ? { uri: benefitsData.image_url } : require('../../assets/images/adaptive-icon.png')} // Fallback image if needed
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <View style={styles.heroOverlay} />

                    {/* Back Button */}
                    <TouchableOpacity
                        style={[styles.heroBackBtn, isRTL && styles.heroBackBtnRTL, { paddingTop: insets.top + 10 }]}
                        onPress={() => router.back()}
                    >
                        <View style={styles.backBtnBlur}>
                            <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={22} color="#ffffff" />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Floating Info Card */}
                <View style={styles.floatingCardContainer}>
                    <View style={styles.floatingCard}>
                        {/* Floating Icon */}
                        <View style={styles.floatingIconWrapper}>
                            <View style={[styles.floatingIconContainer, { backgroundColor: '#ffffff' }]}>
                                <Image source={config.icon} style={styles.floatingIcon} resizeMode="contain" />
                            </View>
                        </View>

                        {/* Title & Description */}
                        <View style={styles.floatingContent}>
                            <Text style={[styles.floatingTitle, { color: config.color }]}>
                                {language === 'ar'
                                    ? (planData?.tier_name_ar || planData?.plan_name_ar || planName)
                                    : (planData?.tier_name_en || planData?.plan_name_en || planName)
                                }
                            </Text>
                            {planDescription && (
                                <Text style={styles.floatingSubtitle}>
                                    {planDescription}
                                </Text>
                            )}
                        </View>

                        {/* Integrated Stats Row */}
                        <View style={styles.floatingStatsDivider} />
                        <View style={[styles.floatingStatsRow, isRTL && styles.floatingStatsRowRTL]}>
                            <View style={styles.floatingStatItem}>
                                <View style={[styles.miniStatIcon, { backgroundColor: `${config.color} 10` }]}>
                                    <Ionicons name="star" size={16} color={config.color} />
                                </View>
                                <View>
                                    <Text style={[styles.floatingStatValue, { color: '#1e293b' }]}>
                                        {t("membershipDetails.floatingStats.rewardPointsValue")}
                                    </Text>
                                    <Text style={[styles.floatingStatLabel, isRTL && styles.textRTL]}>
                                        {t('membershipDetails.sections.rewardPoints')}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.floatingStatSeparator} />
                            <View style={styles.floatingStatItem}>
                                <View style={[styles.miniStatIcon, { backgroundColor: `${config.color} 10` }]}>
                                    <Ionicons name="gift" size={16} color={config.color} />
                                </View>
                                <View>
                                    <Text style={[styles.floatingStatValue, { color: '#1e293b' }]}>
                                        {t("membershipDetails.floatingStats.instantReturnValue")}
                                    </Text>
                                    <Text style={[styles.floatingStatLabel, isRTL && styles.textRTL]}>
                                        {t('membershipDetails.sections.instantReturn')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Main Content Body */}
                <View style={styles.modernContent}>

                    {/* Welcome Message - Clean Style */}
                    {benefitsData?.welcome_message_en || benefitsData?.welcome_message_ar ? (
                        <View style={styles.modernSection}>
                            <View style={[styles.welcomeBox, { backgroundColor: `${config.color}08`, borderColor: `${config.color}20` }]}>
                                <Text style={styles.welcomeText}>
                                    {`"${
                                        language === 'ar'
                                            ? (benefitsData.welcome_message_ar || benefitsData.welcome_message_en)
                                            : (benefitsData.welcome_message_en || benefitsData.welcome_message_ar)
                                    }"`}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    {/* Hotel Discounts */}
                    {renderListSection(
                        t('membershipDetails.sections.hotelDiscounts'),
                        language === 'ar'
                            ? (benefitsData?.hotel_discounts_ar || benefitsData?.hotel_discounts_en || [])
                            : (benefitsData?.hotel_discounts_en || benefitsData?.hotel_discounts_ar || []),
                        'bed',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Membership Benefits */}
                    {renderListSection(
                        t('membershipDetails.sections.membershipBenefitsLifetime'),
                        language === 'ar'
                            ? (benefitsData?.membership_benefits_ar || benefitsData?.membership_benefits_en || [])
                            : (benefitsData?.membership_benefits_en || benefitsData?.membership_benefits_ar || []),
                        'diamond',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Flight Coupons */}
                    {renderListSection(
                        t('membershipDetails.sections.flightCoupons'),
                        language === 'ar'
                            ? (benefitsData?.flight_coupons_ar || benefitsData?.flight_coupons_en || [])
                            : (benefitsData?.flight_coupons_en || benefitsData?.flight_coupons_ar || []),
                        'airplane',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Free Flight Terms */}
                    {renderTextSection(
                        t('membershipDetails.sections.freeFlightTerms'),
                        language === 'ar'
                            ? (benefitsData?.free_flight_terms_ar || benefitsData?.free_flight_terms_en || '')
                            : (benefitsData?.free_flight_terms_en || benefitsData?.free_flight_terms_ar || ''),
                        'document-text',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Car Rental & Airport Transfers */}
                    {renderListSection(
                        t('membershipDetails.sections.carRentalTransfers'),
                        language === 'ar'
                            ? (benefitsData?.car_rental_services_ar || benefitsData?.car_rental_services_en || [])
                            : (benefitsData?.car_rental_services_en || benefitsData?.car_rental_services_ar || []),
                        'car',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Restaurant Benefits */}
                    {renderListSection(
                        t('membershipDetails.sections.restaurantBenefits'),
                        language === 'ar'
                            ? (benefitsData?.restaurant_benefits_ar || benefitsData?.restaurant_benefits_en || [])
                            : (benefitsData?.restaurant_benefits_en || benefitsData?.restaurant_benefits_ar || []),
                        'restaurant',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Immediate Activation Coupons */}
                    {renderListSection(
                        t('membershipDetails.sections.immediateCoupons'),
                        language === 'ar'
                            ? (benefitsData?.immediate_coupons_ar || benefitsData?.immediate_coupons_en || [])
                            : (benefitsData?.immediate_coupons_en || benefitsData?.immediate_coupons_ar || []),
                        'flash',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Additional Tourism Services */}
                    {renderListSection(
                        t('membershipDetails.sections.tourismServices'),
                        language === 'ar'
                            ? (benefitsData?.tourism_services_ar || benefitsData?.tourism_services_en || [])
                            : (benefitsData?.tourism_services_en || benefitsData?.tourism_services_ar || []),
                        'globe',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Terms & Conditions */}
                    {renderTextSection(
                        t('membershipDetails.sections.termsConditions'),
                        language === 'ar'
                            ? (benefitsData?.terms_conditions_ar || benefitsData?.terms_conditions_en || '')
                            : (benefitsData?.terms_conditions_en || benefitsData?.terms_conditions_ar || ''),
                        'document',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Comparison / Best Price Guarantee */}
                    {renderTextSection(
                        t('membershipDetails.sections.comparisonGuarantee'),
                        language === 'ar'
                            ? (benefitsData?.comparison_guarantee_ar || benefitsData?.comparison_guarantee_en || '')
                            : (benefitsData?.comparison_guarantee_en || benefitsData?.comparison_guarantee_ar || ''),
                        'shield-checkmark',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Availability Terms */}
                    {renderTextSection(
                        t('membershipDetails.sections.availabilityTerms'),
                        language === 'ar'
                            ? (benefitsData?.availability_terms_ar || benefitsData?.availability_terms_en || '')
                            : (benefitsData?.availability_terms_en || benefitsData?.availability_terms_ar || ''),
                        'calendar',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Coupon Usage Terms */}
                    {renderTextSection(
                        t('membershipDetails.sections.couponUsageTerms'),
                        language === 'ar'
                            ? (benefitsData?.coupon_usage_terms_ar || benefitsData?.coupon_usage_terms_en || '')
                            : (benefitsData?.coupon_usage_terms_en || benefitsData?.coupon_usage_terms_ar || ''),
                        'ticket',
                        config,
                        isRTL,
                        language
                    )}

                    {/* Upgrade Information */}
                    {(benefitsData?.upgrade_info_en || benefitsData?.upgrade_info_ar || upgradePlan) ? (
                        <View style={styles.modernSection}>
                            <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
                                <View style={[styles.titleIcon, { backgroundColor: `${config.color} 15` }]}>
                                    <Ionicons name="trending-up" size={20} color={config.color} />
                                </View>
                                <Text style={[styles.modernSectionTitle, isRTL && styles.textRTL, { color: config.color }]}>
                                    {t('membershipDetails.sections.upgradeInfo')}
                                </Text>
                            </View>

                            {/* Upgrade Plan Card */}
                            {upgradePlan && (
                                <View style={styles.modernCard}>
                                    <View style={[styles.modernUpgradeFlow, isRTL && styles.modernUpgradeFlowRTL]}>
                                        <View style={[styles.modernUpgradeBadge, { backgroundColor: '#f1f5f9' }]}>
                                            <Image source={config.icon} style={{ width: 40, height: 40 }} resizeMode="contain" />
                                            <View style={styles.upgradeBadgeText}>
                                                <Text style={[styles.upgradeBadgeLabel, isRTL && styles.textRTL]}>
                                                    {t('membershipDetails.sections.current')}
                                                </Text>
                                                <Text style={[styles.upgradeBadgeName, isRTL && styles.textRTL, { color: config.color }]}>
                                                    {language === 'ar'
                                                        ? (planData?.tier_name_ar || planData?.plan_name_ar || planName)
                                                        : (planData?.tier_name_en || planData?.plan_name_en || planName)
                                                    }
                                                </Text>
                                            </View>
                                        </View>

                                        <View style={[styles.upgradeArrowContainer, { backgroundColor: `${config.color}10`, alignSelf: 'center' }]}>
                                            <Ionicons name="arrow-down" size={16} color={config.color} />
                                        </View>

                                        <View style={[styles.modernUpgradeBadge, { backgroundColor: config.color }]}>
                                            <Ionicons name="trending-up" size={16} color="#ffffff" />
                                            <View style={styles.upgradeBadgeText}>
                                                <Text style={[styles.upgradeBadgeLabel, isRTL && styles.textRTL, { color: 'rgba(255,255,255,0.9)' }]}>
                                                    {t('membershipDetails.sections.upgradeTo')}
                                                </Text>
                                                <Text style={[styles.upgradeBadgeName, isRTL && styles.textRTL]}>
                                                    {language === 'ar'
                                                        ? (upgradePlan.tier_name_ar || upgradePlan.plan_name_ar || upgradePlan.name_ar)
                                                        : (upgradePlan.tier_name_en || upgradePlan.plan_name_en || upgradePlan.name_en)
                                                    }
                                                </Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>
                            )}

                            {/* Upgrade Description */}
                            {(benefitsData?.upgrade_info_en || benefitsData?.upgrade_info_ar) && (
                                <View style={[styles.modernCard, styles.modernTextCard, { marginTop: upgradePlan ? 12 : 0 }]}>
                                    <Text style={[styles.modernTextContent, isRTL && styles.textRTL]}>
                                        {language === 'ar'
                                            ? (benefitsData.upgrade_info_ar || benefitsData.upgrade_info_en)
                                            : (benefitsData.upgrade_info_en || benefitsData.upgrade_info_ar)
                                        }
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : null}

                    {/* Fallback: Basic Benefits */}
                    {!benefitsData && tierData?.benefits && (
                        <View style={styles.modernSection}>
                            <View style={[styles.sectionTitleRow, isRTL && styles.sectionTitleRowRTL]}>
                                <View style={[styles.titleIcon, { backgroundColor: `${config.color} 15` }]}>
                                    <Ionicons name="star" size={20} color={config.color} />
                                </View>
                                <Text style={[styles.modernSectionTitle, isRTL && styles.textRTL, { color: config.color }]}>
                                    {t('membershipDetails.sections.benefits')}
                                </Text>
                            </View>
                            <View style={styles.modernCard}>
                                {(tierData.benefits || []).map((benefit: string, index: number) => (
                                    <View key={index}>
                                        <View style={[styles.modernListItem, isRTL && styles.modernListItemRTL]}>
                                            <View style={[styles.modernBullet, { backgroundColor: config.color }]} />
                                            <Text style={[styles.modernListItemText, isRTL && styles.textRTL]}>{benefit}</Text>
                                        </View>
                                        {index < (tierData.benefits || []).length - 1 && <View style={styles.itemDivider} />}
                                    </View>
                                ))}
                            </View>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
    },
    // Hero & Header
    heroContainer: {
        width: '100%',
        height: 320,
        position: 'relative',
        backgroundColor: '#cbd5e1',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    heroBackBtn: {
        position: 'absolute',
        left: 20,
        zIndex: 10,
    },
    heroBackBtnRTL: {
        left: 'auto',
        right: 20,
    },
    backBtnBlur: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    // Floating Card
    floatingCardContainer: {
        paddingHorizontal: 20,
        marginTop: -80,
        marginBottom: 20,
        zIndex: 5,
    },
    floatingCard: {
        backgroundColor: '#ffffff',
        borderRadius: 24,
        paddingTop: 50, // Space for the floating icon
        paddingBottom: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        position: 'relative',
    },
    floatingIconWrapper: {
        position: 'absolute',
        top: -40,
        alignSelf: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 12,
    },
    floatingIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#ffffff',
    },
    floatingIcon: {
        width: 50,
        height: 50,
    },
    floatingContent: {
        alignItems: 'center',
        width: '100%',
        marginBottom: 20,
    },
    floatingTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1e293b',
        textAlign: 'center',
        marginBottom: 8,
    },
    floatingSubtitle: {
        fontSize: 14,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 20,
        paddingHorizontal: 10,
    },
    floatingStatsDivider: {
        width: '100%',
        height: 1,
        backgroundColor: '#f1f5f9',
        marginBottom: 20,
    },
    floatingStatsRow: {
        flexDirection: 'row',
        width: '100%',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    floatingStatsRowRTL: {
        flexDirection: 'row-reverse',
    },
    floatingStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    miniStatIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    floatingStatValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    floatingStatLabel: {
        fontSize: 11,
        color: '#94a3b8',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    floatingStatSeparator: {
        width: 1,
        height: 30,
        backgroundColor: '#e2e8f0',
    },

    // Content Styles
    modernContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    modernSection: {
        marginBottom: 24,
    },
    welcomeBox: {
        padding: 24,
        borderRadius: 16,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    welcomeText: {
        fontSize: 15,
        color: '#334155',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 24,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    sectionTitleRowRTL: {
        flexDirection: 'row-reverse',
    },
    titleIcon: {
        width: 36,
        height: 36,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modernSectionTitle: {
        fontSize: isSmallScreen ? 17 : 18,
        fontWeight: '700',
        flex: 1,
        letterSpacing: 0.3,
    },
    modernCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#f1f5f9',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 2,
    },
    modernListItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingVertical: 14,
    },
    modernListItemRTL: {
        flexDirection: 'row-reverse',
    },
    modernBullet: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 9,
        marginRight: 16,
        marginLeft: 0,
    },
    modernListItemContent: {
        flex: 1,
    },
    modernListItemText: {
        fontSize: 15,
        color: '#1e293b',
        fontWeight: '600',
        lineHeight: 24,
    },
    modernListItemDesc: {
        fontSize: 14,
        color: '#64748b',
        marginTop: 6,
        lineHeight: 22,
    },
    itemDivider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginLeft: 24,
    },
    modernTextCard: {
        padding: 24,
    },
    modernTextContent: {
        fontSize: 15,
        color: '#475569',
        lineHeight: 26,
    },
    modernUpgradeFlow: {
        flexDirection: 'column',
        alignItems: 'stretch',
        gap: 12,
    },
    modernUpgradeFlowRTL: {
        flexDirection: 'column',
    },
    modernUpgradeBadge: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        gap: 12,
        minWidth: 0,
    },
    upgradeBadgeText: {
        flex: 1,
        minWidth: 0,
    },
    upgradeBadgeLabel: {
        fontSize: 11,
        fontWeight: '600',
        marginBottom: 4,
        color: '#94a3b8',
        textTransform: 'uppercase',
    },
    upgradeBadgeName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
    upgradeArrowContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    itemTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        marginBottom: 4,
    },
    itemTitleRowRTL: {
        flexDirection: 'row-reverse',
    },
    itemValueBadge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
    },
    itemValueText: {
        fontSize: 13,
        fontWeight: '800',
    },
    textRTL: {
        textAlign: 'right',
    },
});
