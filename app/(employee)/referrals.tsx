import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Share, RefreshControl, Image
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";
import * as Clipboard from "expo-clipboard";

const COLORS = {
    primary: "#0891b2",
    secondary: "#06b6d4",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    purple: "#8b5cf6",
    background: "#f1f5f9",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
};

export default function EmployeeReferrals() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [referralCode, setReferralCode] = useState<string>("");
    const [stats, setStats] = useState({
        total_referrals: 0,
        total_points: 0,
        pending_referrals: 0
    });
    const [referrals, setReferrals] = useState<any[]>([]);
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        loadReferralData();
    }, []);

    const loadReferralData = async () => {
        try {
            setLoading(true);
            const { employeeApi } = await import('../../src/services/api');

            // Fetch referral code
            const codeRes = await employeeApi.createReferral();
            setReferralCode(codeRes.referral_code || "");

            // Fetch stats
            const statsRes = await employeeApi.getReferralStats();
            setStats({
                total_referrals: statsRes.total_referrals || 0,
                total_points: statsRes.total_points || 0,
                pending_referrals: statsRes.pending_referrals || 0
            });

            // Fetch referral history
            const historyRes = await employeeApi.getMyReferrals();
            setReferrals(historyRes.referrals || []);

        } catch (error) {
            console.log("Error loading referral data", error);
            showToast(t('common.somethingWentWrong', 'Something went wrong'), "error");
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadReferralData();
        setRefreshing(false);
    };

    const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
        setToast({ visible: true, message, type });
    };

    const copyToClipboard = async () => {
        await Clipboard.setStringAsync(referralCode);
        showToast(t('employee.referrals.codeCopied', 'Referral code copied!'), 'success');
    };

    const shareReferralCode = async () => {
        try {
            await Share.share({
                message: t('employee.referrals.shareMessage', {
                    code: referralCode,
                    defaultValue: `Join Altayar VIP using my referral code: ${referralCode}`,
                }),
            });
        } catch (error) {
            console.log("Error sharing referral code", error);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
        >
            {/* Header */}
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <Text style={styles.pageTitle}>{t('employee.referrals.title', 'My Referrals')}</Text>
            </View>

            {/* Referral Code Card */}
            <LinearGradient
                colors={[COLORS.primary, COLORS.secondary]}
                style={styles.codeCard}
            >
                <View style={styles.codeHeader}>
                    <Ionicons name="gift" size={32} color="#ffffff" />
                    <Text style={styles.codeTitle}>{t('employee.referrals.yourCode', 'Your Referral Code')}</Text>
                </View>

                <View style={styles.codeBox}>
                    <Text style={styles.codeText}>{referralCode}</Text>
                </View>

                <View style={styles.codeActions}>
                    <TouchableOpacity style={styles.codeBtn} onPress={copyToClipboard}>
                        <Ionicons name="copy-outline" size={20} color="#ffffff" />
                        <Text style={styles.codeBtnText}>{t('employee.referrals.copy', 'Copy')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.codeBtn} onPress={shareReferralCode}>
                        <Ionicons name="share-social-outline" size={20} color="#ffffff" />
                        <Text style={styles.codeBtnText}>{t('employee.referrals.share', 'Share')}</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.codeHint}>
                    {t('employee.referrals.hint', 'Share this code with customers. They will be automatically assigned to you when they register.')}
                </Text>
            </LinearGradient>

            {/* Stats Grid */}
            <View style={styles.statsGrid}>
                <View style={[styles.statCard, { backgroundColor: COLORS.success }]}>
                    <Ionicons name="people" size={28} color="#ffffff" />
                    <Text style={styles.statValue}>{stats.total_referrals}</Text>
                    <Text style={styles.statLabel}>{t('employee.referrals.totalReferrals', 'Total Referrals')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.warning }]}>
                    <Ionicons name="hourglass" size={28} color="#ffffff" />
                    <Text style={styles.statValue}>{stats.pending_referrals}</Text>
                    <Text style={styles.statLabel}>{t('employee.referrals.pending', 'Pending')}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: COLORS.purple }]}>
                    <Ionicons name="star" size={28} color="#ffffff" />
                    <Text style={styles.statValue}>{stats.total_points}</Text>
                    <Text style={styles.statLabel}>{t('employee.referrals.points', 'Points Earned')}</Text>
                </View>
            </View>

            {/* Referral History */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>{t('employee.referrals.history', 'Referral History')}</Text>

                {referrals.length > 0 ? (
                    referrals.map((ref, index) => (
                        (() => {
                            const statusRaw = String(ref?.status || '').toUpperCase();
                            const statusLabel =
                                t([`common.statuses.${statusRaw}`, `common.statuses.${statusRaw.toLowerCase()}`], ref?.status || '');
                            const ptsLabel = t('common.currency.pts', 'pts');
                            const referredName = ref?.referred_user_name || t('common.unknown', 'Unknown');
                            return (
                                <View key={ref.id || index} style={styles.referralItem}>
                                    <View style={styles.referralIcon}>
                                        {ref.referred_user_avatar ? (
                                            <Image
                                                source={{ uri: ref.referred_user_avatar }}
                                                style={{ width: 40, height: 40, borderRadius: 20 }}
                                            />
                                        ) : (
                                            <Ionicons name="person" size={20} color={COLORS.primary} />
                                        )}
                                    </View>
                                    <View style={styles.referralContent}>
                                        <Text style={styles.referralName}>{referredName}</Text>
                                        <Text style={styles.referralDate}>
                                            {new Date(ref.created_at).toLocaleDateString()}
                                        </Text>
                                    </View>
                                    <View style={styles.referralRight}>
                                        <View style={[
                                            styles.statusBadge,
                                            ref.status === 'ACTIVE' ? styles.statusActive : styles.statusPending
                                        ]}>
                                            <Text style={styles.statusText}>{statusLabel || ref.status}</Text>
                                        </View>
                                        <Text style={styles.referralPoints}>
                                            {t("common.amountPositive", { amount: `${ref.points_earned} ${ptsLabel}` })}
                                        </Text>
                                    </View>
                                </View>
                            );
                        })()
                    ))
                ) : (
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
                        <Text style={styles.emptyText}>
                            {t('employee.referrals.noReferrals', 'No referrals yet')}
                        </Text>
                        <Text style={styles.emptyHint}>
                            {t('employee.referrals.startSharing', 'Start sharing your code to earn rewards!')}
                        </Text>
                    </View>
                )}
            </View>

            <View style={{ height: 40 }} />

            {/* Toast */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </ScrollView>
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
        flexDirection: 'row-reverse',
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
    },
    codeCard: {
        borderRadius: 20,
        padding: 24,
        marginBottom: 20,
    },
    codeHeader: {
        alignItems: "center",
        marginBottom: 16,
    },
    codeTitle: {
        fontSize: 18,
        fontWeight: "600",
        color: "#ffffff",
        marginTop: 8,
    },
    codeBox: {
        backgroundColor: "rgba(255,255,255,0.2)",
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.3)",
    },
    codeText: {
        fontSize: 28,
        fontWeight: "bold",
        color: "#ffffff",
        textAlign: "center",
        letterSpacing: 2,
    },
    codeActions: {
        flexDirection: "row",
        justifyContent: "center",
        gap: 12,
        marginBottom: 16,
    },
    codeBtn: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        gap: 8,
    },
    codeBtnText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "600",
    },
    codeHint: {
        fontSize: 13,
        color: "rgba(255,255,255,0.8)",
        textAlign: "center",
        lineHeight: 18,
    },
    statsGrid: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 20,
        gap: 12,
    },
    statCard: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
    },
    statValue: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#ffffff",
        marginTop: 8,
    },
    statLabel: {
        fontSize: 11,
        color: "rgba(255,255,255,0.9)",
        marginTop: 4,
        textAlign: "center",
    },
    card: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 16,
    },
    referralItem: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    referralIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "#e0f2fe",
        alignItems: "center",
        justifyContent: "center",
        marginRight: 12,
    },
    referralContent: {
        flex: 1,
    },
    referralName: {
        fontSize: 15,
        fontWeight: "600",
        color: COLORS.text,
    },
    referralDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    referralRight: {
        alignItems: "flex-end",
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginBottom: 4,
    },
    statusActive: {
        backgroundColor: "#d1fae5",
    },
    statusPending: {
        backgroundColor: "#fef3c7",
    },
    statusText: {
        fontSize: 10,
        fontWeight: "bold",
        color: COLORS.text,
    },
    referralPoints: {
        fontSize: 12,
        fontWeight: "600",
        color: COLORS.success,
    },
    emptyState: {
        alignItems: "center",
        paddingVertical: 40,
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
        marginTop: 4,
        textAlign: "center",
    },
});
