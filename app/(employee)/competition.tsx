import React, { useState, useEffect, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    // ... imports
    Image,
    Dimensions,
} from "react-native";
import Toast from "../../src/components/Toast";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TROPHY_LEVELS } from "../../src/constants/competition";
import { ConfettiSystem } from "../../src/components/Confetti";
// ...
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { router } from "expo-router";
import { employeeApi } from "../../src/services/api";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get('window');

// Import Membership Images
const IMAGES = {
    silver: require("../../assets/images/silver.png"),
    gold: require("../../assets/images/gold.png"),
    platinum: require("../../assets/images/platinum.png"),
    diamond: require("../../assets/images/diamond.png"),
    vip: require("../../assets/images/vip.png"),
    business: require("../../assets/images/business.png"),
};

const COLORS = {
    primary: "#1071b8",
    secondary: "#167dc1",
    success: "#10b981",
    warning: "#f59e0b",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",

    // Tier Colors
    silver: "#64748b",
    gold: "#d97706",
    platinum: "#7c3aed",
    diamond: "#0284c7",
    vip: "#059669",
    business: "#b91c1c",
};

const TIER_COLORS: Record<string, string> = {
    silver: COLORS.silver,
    gold: COLORS.gold,
    platinum: COLORS.platinum,
    diamond: COLORS.diamond,
    vip: COLORS.vip,
    business: COLORS.business,
    sm: COLORS.silver,
    gm: COLORS.gold,
    pm: COLORS.platinum,
    dm: COLORS.diamond,
    vm: COLORS.vip,
    bm: COLORS.business,
};

function getTierColor(tierCode: string): string {
    const code = (tierCode || "").toLowerCase();
    // Try to match exact key first (or prefix)
    for (const key in TIER_COLORS) {
        if (code.includes(key) || code.startsWith(key)) {
            return TIER_COLORS[key];
        }
    }
    return COLORS.primary;
}

type TierStat = {
    plan_id: string;
    tier_code: string;
    tier_name_en: string;
    tier_name_ar: string;
    count: number;
};

// Helper to get image based on tier code (fallback to silver if not found)
function getTierImage(tierCode: string) {
    const code = (tierCode || "").toUpperCase();

    // Check for specific prefixes used in the database
    if (code.startsWith('SM') || code.includes('SILVER')) return IMAGES.silver;
    if (code.startsWith('GM') || code.includes('GOLD')) return IMAGES.gold;
    if (code.startsWith('PM') || code.includes('PLATINUM')) return IMAGES.platinum;
    if (code.startsWith('DM') || code.includes('DIAMOND')) return IMAGES.diamond;
    if (code.startsWith('VM') || code.includes('VIP')) return IMAGES.vip;
    if (code.startsWith('BM') || code.includes('BUSINESS')) return IMAGES.business;

    return IMAGES.silver; // Default
}

// ... no content here, using multi_replace


const MONTHLY_TARGET = 5;


function SummaryCards({ yearlyTotal, monthlyTotal, isRTL }: { yearlyTotal: number; monthlyTotal: number; isRTL: boolean }) {
    const { t } = useTranslation();
    const monthlyProgress = Math.min(1, monthlyTotal / MONTHLY_TARGET);

    return (
        <View style={[styles.statsRow]}>
            <View style={styles.statCard}>
                <View style={styles.statHeader}>
                    <Ionicons name="calendar-outline" size={18} color={COLORS.primary} />
                    <Text style={styles.statLabel}>{t('employee.competition.monthlyGoal', 'Monthly Goal')}</Text>
                </View>
                <Text style={styles.statValue}>{monthlyTotal} / {MONTHLY_TARGET}</Text>
                <View style={styles.miniProgressBg}>
                    <View style={[styles.miniProgressBar, { width: `${monthlyProgress * 100}%` }]} />
                </View>
            </View>

            <View style={styles.statCard}>
                <View style={styles.statHeader}>
                    <Ionicons name="stats-chart-outline" size={18} color={COLORS.success} />
                    <Text style={styles.statLabel}>{t('employee.competition.totalYearly', 'Yearly Total')}</Text>
                </View>
                <Text style={styles.statValue}>{yearlyTotal}</Text>
                <Text style={styles.statSubValue}>{t('employee.competition.yearlySummary', 'Annual count')}</Text>
            </View>
        </View>
    );
}

// Custom User Chart Component
function PerformanceCard({ yearlyTotal, monthlyTotal, chartData, isRTL, currentRank, showToast }: { yearlyTotal: number; monthlyTotal: number; chartData: { label: string; count: number }[]; isRTL: boolean; currentRank: string; showToast: (msg: string, type: 'info' | 'success' | 'error') => void }) {
    const { t } = useTranslation();
    const maxCount = Math.max(...chartData.map(d => d.count), 5);

    return (
        <View style={styles.perfCardContainer}>
            {/* Background Gradient/Blur Effect Simulator */}
            <LinearGradient
                colors={['rgba(99, 102, 241, 0.2)', 'rgba(168, 85, 247, 0.2)', 'rgba(236, 72, 153, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.perfCardBgGradient}
            />

            <View style={styles.perfCardContent}>
                {/* Header */}
                <View style={[styles.perfHeader]}>
                    <View style={styles.perfHeaderLeft}>
                        <LinearGradient
                            colors={['#6366f1', '#a855f7']}
                            style={styles.perfIconBox}
                        >
                            <Ionicons name="stats-chart" size={16} color="white" />
                        </LinearGradient>
                        <Text style={styles.perfTitle}>{t('employee.competition.performanceAnalytics', 'Performance Analytics')}</Text>
                    </View>

                    <View style={styles.perfLiveBadge}>
                        <View style={styles.perfLiveDot} />
                        <Text style={styles.perfLiveText}>{t('employee.competition.live', 'Live')}</Text>
                    </View>
                </View>

                {/* Stats Grid */}
                <View style={[styles.perfStatsGrid]}>
                    <View style={styles.perfStatItem}>
                        <Text style={styles.perfStatLabel}>{t('employee.competition.totalYearly', 'Yearly Total')}</Text>
                        <Text style={styles.perfStatValue}>{yearlyTotal}</Text>
                        <Text style={styles.perfStatChange}>
                            {currentRank}
                        </Text>
                    </View>

                    <View style={styles.perfStatItem}>
                        <Text style={styles.perfStatLabel}>{t('employee.competition.monthlySales', 'Monthly Sales')}</Text>
                        <Text style={styles.perfStatValue}>{monthlyTotal}</Text>
                        <Text style={styles.perfStatChange}>+{Math.round((monthlyTotal / MONTHLY_TARGET) * 100)}% {t('employee.competition.ofGoal', 'of goal')}</Text>
                    </View>
                </View>

                {/* Chart Area */}
                <View style={styles.perfChartArea}>
                    <View style={[styles.perfChartPlot]}>
                        {chartData.map((item, index) => {
                            const barHeightPercentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                            // Visual tweak: min height for visibility if > 0
                            const displayHeight = item.count > 0 ? Math.max(barHeightPercentage, 10) : 0;

                            return (
                                <View key={index} style={styles.perfBarGroup}>
                                    {/* Track (Background Bar) - 100% height relative to chart area, represented as 30% opacity */}
                                    <View style={styles.perfBarTrack}>
                                        {/* Fill (Foreground Bar) */}
                                        <View style={[styles.perfBarFill, { height: `${displayHeight}%` }]} />
                                    </View>
                                    <Text style={styles.perfBarLabel}>{item.label}</Text>
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Footer */}
                <View style={[styles.perfFooter]}>
                    <TouchableOpacity
                        style={styles.perfFooterLeft}
                        activeOpacity={0.7}
                        onPress={() => {
                            const start = chartData.length > 0 ? chartData[0].label : '';
                            const end = chartData.length > 0 ? chartData[chartData.length - 1].label : '';
                            showToast(t('employee.competition.periodDesc', `Showing performance from ${start} to ${end}`), 'info');
                        }}
                    >
                        <Text style={styles.perfFooterText}>{t('employee.competition.last6Months', 'Last 6 Months')}</Text>
                        <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={14} color="#94a3b8" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.perfButton}
                        onPress={() => router.push('/(employee)/referrals')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#6366f1', '#a855f7']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.perfButtonGradient}
                        >
                            <Text style={styles.perfButtonText}>{t('employee.competition.viewDetails', 'View Details')}</Text>
                            <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={12} color="white" />
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

function CompetitionHero({ yearlyTotal, isRTL }: { yearlyTotal: number; isRTL: boolean }) {
    const { t } = useTranslation();

    // Find current yearly rank level
    const currentLevel = TROPHY_LEVELS.find(l => yearlyTotal >= l.min) || TROPHY_LEVELS[TROPHY_LEVELS.length - 1];

    // Find next yearly level for progress
    const currentLevelIndex = TROPHY_LEVELS.indexOf(currentLevel);
    const nextLevel = currentLevelIndex > 0 ? TROPHY_LEVELS[currentLevelIndex - 1] : null;

    const yearlyProgress = nextLevel
        ? (yearlyTotal - currentLevel.min) / (nextLevel.min - currentLevel.min)
        : 1;

    return (
        <View style={styles.heroContainer}>
            <LinearGradient
                colors={["#1e3a5f", "#2d4a6f"]}
                style={styles.heroCard}
            >
                <View style={[styles.heroContent]}>
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={styles.heroTitle}>
                            {t('employee.competition.yearlyRank', 'Yearly Rank')}
                        </Text>
                        <Text style={styles.heroLevel}>
                            {t(`employee.competition.levels.${currentLevel.name.toLowerCase()}`, currentLevel.name)}
                        </Text>

                        <View style={styles.progressContainer}>
                            <View style={[styles.progressBar, { width: `${Math.min(100, yearlyProgress * 100)}%` }]} />
                        </View>

                        {nextLevel && (
                            <Text style={styles.heroHint}>
                                {t('employee.competition.nextLevelHint', {
                                    count: nextLevel.min - yearlyTotal,
                                    level: t(`employee.competition.levels.${nextLevel.name.toLowerCase()}`, nextLevel.name)
                                }) || `${nextLevel.min - yearlyTotal} more for ${nextLevel.name}`}
                            </Text>
                        )}
                    </View>

                    <View style={[styles.heroIconBox, { backgroundColor: `${currentLevel.color}20` }]}>
                        <Ionicons name={currentLevel.icon as any} size={42} color={currentLevel.color} />
                    </View>
                </View>
            </LinearGradient>
        </View>
    );
}

export default function CompetitionScreen() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [tiers, setTiers] = useState<TierStat[]>([]);
    const [monthlyTotal, setMonthlyTotal] = useState(0);
    const [yearlyTotal, setYearlyTotal] = useState(0);
    const [chartData, setChartData] = useState<{ label: string; count: number }[]>([]);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const [showConfetti, setShowConfetti] = useState(false);
    const [isContinuous, setIsContinuous] = useState(false);
    const [confettiColors, setConfettiColors] = useState<string[] | undefined>(undefined);

    const checkCelebration = async () => {
        try {
            const currentRank = (TROPHY_LEVELS.find(l => yearlyTotal >= l.min) || TROPHY_LEVELS[TROPHY_LEVELS.length - 1]).name;
            const now = new Date();
            let shouldShow = false;
            let continuous = false;
            let colors = undefined;

            // 1. Check Conqueror (Continuous)
            if (currentRank === 'Conqueror') {
                shouldShow = true;
                continuous = true;
                colors = ['#FFD700', '#FFA500', '#DAA520', '#FFFFFF']; // Gold Theme
            } else {
                // 2. Check Intermediate Ranks (3 Days)
                const storedRank = await AsyncStorage.getItem('last_celebrated_rank');
                const storedRankDate = await AsyncStorage.getItem('rank_celebration_date');

                if (storedRank !== currentRank) {
                    // New Rank! Start celebration
                    await AsyncStorage.setItem('last_celebrated_rank', currentRank);
                    await AsyncStorage.setItem('rank_celebration_date', now.toISOString());
                    shouldShow = true;
                } else if (storedRankDate) {
                    // Same rank, check duration
                    const diffHours = (now.getTime() - new Date(storedRankDate).getTime()) / (1000 * 60 * 60);
                    if (diffHours < 72) { // 3 days
                        shouldShow = true;
                    }
                }
            }

            // 3. Check Monthly Target (3 Days)
            // Priority: Conqueror overrides, but if not conqueror, check monthly
            // Or maybe both celebrations merge? Confetti is global.
            // If already showing from rank, we are good. If not, check target.
            if (!shouldShow && monthlyTotal >= MONTHLY_TARGET) {
                const storedTargetDate = await AsyncStorage.getItem('monthly_target_date');
                const storedMonth = await AsyncStorage.getItem('monthly_target_month');
                const currentMonthStr = `${now.getMonth()}-${now.getFullYear()}`;

                if (storedMonth !== currentMonthStr) {
                    // New month target reached
                    await AsyncStorage.setItem('monthly_target_month', currentMonthStr);
                    await AsyncStorage.setItem('monthly_target_date', now.toISOString());
                    shouldShow = true;
                } else if (storedTargetDate) {
                    const diffHours = (now.getTime() - new Date(storedTargetDate).getTime()) / (1000 * 60 * 60);
                    if (diffHours < 72) {
                        shouldShow = true;
                    }
                }
            }

            setShowConfetti(shouldShow);
            setIsContinuous(continuous);
            setConfettiColors(colors);
        } catch (e) {
            console.error(e);
        }
    };

    useEffect(() => {
        if (yearlyTotal > 0 || monthlyTotal > 0) {
            checkCelebration();
        }
    }, [yearlyTotal, monthlyTotal]);

    const load = useCallback(async () => {
        try {
            const data = await employeeApi.getCompetitionStats();
            setTiers(Array.isArray(data.tiers) ? data.tiers : []);
            setMonthlyTotal(data.monthly_total || 0);
            setYearlyTotal(data.yearly_total || 0);
            setChartData(data.chart_data || []);
        } catch (e) {
            console.warn("Competition load error", e);
            setTiers([]);
            setChartData([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const onRefresh = async () => {
        setRefreshing(true);
        await load();
        setRefreshing(false);
    };

    const textToDisplay = (tier: TierStat) => {
        let name = isRTL ? (tier.tier_name_ar || tier.tier_name_en) : (tier.tier_name_en || tier.tier_name_ar);
        // Clean "Membership" key words
        if (isRTL) {
            name = name.replace("العضوية", "").replace("عضوية", "").trim();
            return `كارت ${name}`;
        } else {
            name = name.replace("Membership", "").replace("membership", "").trim();
            return `${name} Card`;
        }
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <View style={{ flex: 1 }}>
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 20 }}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
                }
            >
                <View style={[styles.header, isRTL && styles.headerRTL]}>
                    <Text style={styles.pageTitle}>
                        {t("employee.competition.title", "Competition")}
                    </Text>
                    <Text style={styles.subtitle}>
                        {t("employee.competition.subtitle", "Cards sold (Yearly summary)")}
                    </Text>
                </View>

                <CompetitionHero yearlyTotal={yearlyTotal} isRTL={isRTL} />

                <SummaryCards yearlyTotal={yearlyTotal} monthlyTotal={monthlyTotal} isRTL={isRTL} />

                <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                        {t('employee.competition.tiersBreakdown', 'Sold Tiers')}
                    </Text>
                </View>

                <View style={styles.grid}>
                    {tiers.map((tier) => {
                        const imageSource = getTierImage(tier.tier_code);
                        const tierColor = getTierColor(tier.tier_code);
                        const displayName = textToDisplay(tier);

                        return (
                            <TouchableOpacity
                                key={tier.plan_id}
                                style={[
                                    styles.card,
                                    {
                                        borderColor: tierColor + "40", // 25% opacity border
                                        borderWidth: 1.5,
                                        // Increased background tint opacity as requested (from 08 -> 15)
                                        backgroundColor: tierColor + "15",
                                        shadowColor: tierColor,
                                    }
                                ]}
                                onPress={() => router.push({ pathname: "/(employee)/competition/[planId]", params: { planId: tier.plan_id, tierName: displayName } } as any)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.imageContainer}>
                                    <Image
                                        source={imageSource}
                                        style={styles.cardImage}
                                        resizeMode="contain"
                                    />
                                </View>

                                <Text style={[styles.cardCount, { color: tierColor }]}>{tier.count}</Text>

                                <Text style={styles.cardTitle} numberOfLines={2}>
                                    {displayName}
                                </Text>

                                <Text style={styles.cardLabel}>
                                    {t("employee.competition.cardsSold", "cards sold")}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {tiers.length === 0 && (
                    <View style={styles.empty}>
                        <Ionicons name="trophy-outline" size={56} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>
                            {t("employee.competition.noData", "No completed referrals yet")}
                        </Text>
                        <Text style={styles.emptyHint}>
                            {t("employee.competition.noDataHint", "When referred customers subscribe, their tier will appear here.")}
                        </Text>
                    </View>
                )}

                <PerformanceCard
                    yearlyTotal={yearlyTotal}
                    monthlyTotal={monthlyTotal}
                    chartData={chartData}
                    isRTL={isRTL}
                    currentRank={t(`employee.competition.levels.${(TROPHY_LEVELS.find(l => yearlyTotal >= l.min) || TROPHY_LEVELS[TROPHY_LEVELS.length - 1]).name.toLowerCase()}`, (TROPHY_LEVELS.find(l => yearlyTotal >= l.min) || TROPHY_LEVELS[TROPHY_LEVELS.length - 1]).name)}
                    showToast={showToast}
                />
            </ScrollView>
            <ConfettiSystem
                active={monthlyTotal >= MONTHLY_TARGET || (TROPHY_LEVELS.find(l => yearlyTotal >= l.min)?.name === 'Conqueror')}
                count={80}
                duration={4000}
            />

            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast(prev => ({ ...prev, visible: false }))}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
        padding: 16,
    },
    header: {
        marginBottom: 20,
    },
    headerRTL: {
        alignItems: "flex-end",
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 4,
    },
    heroContainer: {
        marginBottom: 24,
    },
    heroCard: {
        borderRadius: 20,
        padding: 20,
        marginBottom: 12,
    },
    heroContent: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    heroTitle: {
        fontSize: 14,
        color: "rgba(255,255,255,0.7)",
        fontWeight: "500",
    },
    heroLevel: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#ffffff",
        marginVertical: 4,
    },
    progressContainer: {
        height: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 4,
        width: "100%",
        marginTop: 8,
        overflow: "hidden",
    },
    progressBar: {
        height: '100%',
        backgroundColor: COLORS.warning,
        borderRadius: 4,
    },
    heroHint: {
        fontSize: 12,
        color: "rgba(255,255,255,0.6)",
        marginTop: 8,
    },
    heroIconBox: {
        width: 80,
        height: 80,
        borderRadius: 40,
        alignItems: "center",
        justifyContent: "center",
        marginStart: 16,
    },
    // Summary Cards Styles
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },

    statCard: {
        backgroundColor: '#ffffff',
        borderRadius: 16,
        padding: 16,
        flex: 1,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
        elevation: 2,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    statHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginStart: 6,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    statSubValue: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    miniProgressBg: {
        height: 4,
        backgroundColor: COLORS.background,
        borderRadius: 2,
        width: '100%',
        overflow: 'hidden',
    },
    miniProgressBar: {
        height: '100%',
        backgroundColor: COLORS.primary,
        borderRadius: 2,
    },
    // Performance Card Styles
    perfCardContainer: {
        marginTop: 24,
        backgroundColor: '#ffffff', // White background
        borderRadius: 16,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    perfCardBgGradient: {
        // Removed or made transparent for clean light theme
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        height: 100,
        opacity: 0,
    },
    perfCardContent: {
        position: 'relative',
    },
    perfHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },

    perfHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    perfIconBox: {
        width: 32,
        height: 32,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 8,
    },
    perfTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text, // Dark text
    },
    perfLiveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ecfdf5', // bg-emerald-50
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 99,
        gap: 4,
    },
    perfLiveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#10b981', // emerald-500
        marginEnd: 4,
    },
    perfLiveText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#10b981',
    },
    perfStatsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },

    perfStatItem: {
        flex: 1,
        backgroundColor: '#f8fafc', // bg-slate-50
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    perfStatLabel: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textLight, // Slate-500
        marginBottom: 4,
    },
    perfStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text, // Dark text
        marginBottom: 4,
    },
    perfStatChange: {
        fontSize: 10,
        fontWeight: '500',
        color: '#10b981',
    },
    perfChartArea: {
        height: 140,
        backgroundColor: '#f8fafc', // bg-slate-50
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#f1f5f9',
    },
    perfChartPlot: {
        flexDirection: 'row',
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 4,
    },

    perfBarGroup: {
        flex: 1,
        height: '100%',
        alignItems: 'center',
        justifyContent: 'flex-end',
    },
    perfBarTrack: {
        width: 10,
        height: '100%',
        backgroundColor: '#e2e8f0', // slate-200
        borderRadius: 4,
        justifyContent: 'flex-end',
        overflow: 'hidden',
    },
    perfBarFill: {
        width: '100%',
        backgroundColor: '#6366f1', // indigo-500
        borderRadius: 4,
    },
    perfBarLabel: {
        position: 'absolute',
        bottom: -20,
        fontSize: 9,
        color: COLORS.textLight,
        display: 'flex',
    },
    perfFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    perfFooterLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    perfFooterText: {
        fontSize: 10,
        fontWeight: '500',
        color: COLORS.textLight,
        marginStart: 4,
    },
    perfButton: {
        borderRadius: 8,
        overflow: 'hidden',
    },
    perfButtonGradient: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
    },
    perfButtonText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'white',
        marginEnd: 4,
    },

    // Existing styles
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
    },
    textRTL: {
        textAlign: 'right',
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12, // vertical gap
    },
    card: {
        width: '48%', // Percentage based width to guarantee 2-column layout
        borderRadius: 12,
        padding: 12,
        alignItems: "center",
        marginBottom: 4,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, // Subtle colored shadow
        shadowRadius: 6,
        elevation: 3,
        height: 180,
        justifyContent: 'center' // Center content vertically
    },
    imageContainer: {
        height: 55,
        width: '100%',
        marginBottom: 10, // Increased separation from text
        alignItems: 'center',
        justifyContent: 'center',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardTitle: {
        fontSize: 14,
        fontWeight: "700",
        color: COLORS.text,
        textAlign: "center",
        marginTop: 6, // More space from Count
        marginBottom: 6, // More space from Label
        textAlignVertical: 'center'
    },
    cardCount: {
        fontSize: 24,
        fontWeight: "800",
        marginBottom: 2, // Slight spacing
    },
    cardLabel: {
        fontSize: 11,
        color: COLORS.textLight,
        marginTop: 0
    },
    empty: {
        alignItems: "center",
        paddingVertical: 48,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: "600",
        color: COLORS.text,
        marginTop: 12,
    },
    emptyHint: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 6,
        textAlign: "center",
    },
});
