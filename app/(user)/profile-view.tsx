import React, { useState, useEffect } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, Image, RefreshControl
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { walletApi, pointsApi, cashbackApi } from "../../src/services/api";
import { isMembershipActive } from "../../src/utils/membership";
import { emitMembershipRequired } from "../../src/utils/membershipGate";

const COLORS = {
    primary: "#0891b2",
    background: "#f0f9ff",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    white: "#ffffff",
};

export default function ProfileViewPage() {
    const router = useRouter();
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const insets = useSafeAreaInsets();
    const { user } = useAuth();
    const isMember = isMembershipActive(user);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [cashbackBalance, setCashbackBalance] = useState(0);
    const [pointsBalance, setPointsBalance] = useState(0);
    const [walletBalance, setWalletBalance] = useState(0);

    const loadBalances = async () => {
        try {
            setLoading(true);
            const [cashbackRes, pointsRes, walletRes] = await Promise.allSettled([
                cashbackApi.getBalance(),
                pointsApi.getBalance(),
                walletApi.getBalance()
            ]);

            if (cashbackRes.status === 'fulfilled') {
                const val = cashbackRes.value as any;
                // Try available, then total, then balance
                setCashbackBalance(val?.available || val?.total || val?.balance || 0);
                console.log('Cashback loaded:', val);
            }
            if (pointsRes.status === 'fulfilled') {
                const val = pointsRes.value as any;
                // Try current_balance, then balance, then total_earned
                setPointsBalance(val?.current_balance || val?.balance || 0);
                console.log('Points loaded:', val);
            }
            if (walletRes.status === 'fulfilled') {
                const val = walletRes.value as any;
                // Try balance, then total
                setWalletBalance(val?.balance || val?.total || 0);
                console.log('Wallet loaded:', val);
            }

        } catch (e) {
            console.log('Error loading balances:', e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        if (isMember) {
            loadBalances();
        } else {
            setLoading(false);
        }
    }, []);

    const onRefresh = () => {
        if (!isMember) {
            emitMembershipRequired({ source: "profile-view" });
            setRefreshing(false);
            return;
        }
        setRefreshing(true);
        loadBalances();
    };


    const userName = user ? `${user.first_name} ${user.last_name}` : "Guest";
    const membershipId = isMember ? ((user as any)?.membership_id_display || "--") : "--";
    const membershipPlan = isMember ? (user?.membership?.plan_name_en || "--") : t("membership.locked.title", "Subscribe to unlock");
    // const pointsBalance removed as it shadows state
    const joinedDate = (user as any)?.created_at ? new Date((user as any).created_at).toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' }) : "--";

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Custom Header Matching History Pages */}
            <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t("common.myAccount", "My Account")}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            >
                {/* Profile Card */}
                <View style={[styles.profileCard, isRTL && styles.profileCardRTL]}>
                    {/* Avatar */}
                    <View style={styles.avatarContainer}>
                        {user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.avatar} />
                        ) : (
                            <View style={styles.avatarPlaceholder}>
                                <Ionicons name="person" size={50} color={COLORS.primary} />
                            </View>
                        )}
                    </View>

                    {/* User Info */}
                    <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={styles.userName}>
                            {t("common.usernameHandle", { username: user?.username || t("common.user") })}
                        </Text>
                        <Text style={styles.fullName}>{userName}</Text>

                        {user?.phone && <Text style={styles.phone}>{user.phone}</Text>}

                        {/* Status Badges */}
                        <View style={[styles.badgesRow, isRTL && styles.rowRTL]}>
                            <View style={[styles.badge, { backgroundColor: '#dbeafe' }]}>
                                <Ionicons name="person" size={14} color={COLORS.primary} />
                                <Text style={[styles.badgeText, { color: COLORS.primary }]}>
                                    {user?.role ? t(`common.role.${user.role}`, user.role) : t("common.role.CUSTOMER")}
                                </Text>
                            </View>
                            <View style={[styles.badge, { backgroundColor: '#d1fae5' }]}>
                                <Ionicons name="checkmark-circle" size={14} color={COLORS.success} />
                                <Text style={[styles.badgeText, { color: COLORS.success }]}>
                                    {user?.email_verified ? t("common.statuses.active") : t("common.statuses.pending")}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Info Cards Row */}
                <View style={[styles.infoCardsRow, isRTL && styles.rowRTL]}>
                    <View style={[styles.infoCard, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}>
                        <Ionicons name="card-outline" size={24} color={COLORS.textLight} />
                        <Text style={[styles.infoCardLabel]}>{t("common.memberId")}</Text>
                        <Text style={[styles.infoCardValue]}>{membershipId}</Text>
                    </View>
                    <View style={[styles.infoCard, { flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}>
                        <Ionicons name="calendar-outline" size={24} color={COLORS.textLight} />
                        <Text style={[styles.infoCardLabel]}>{t("common.joined")}</Text>
                        <Text style={[styles.infoCardValue]}>{joinedDate}</Text>
                    </View>
                </View>

                {/* Membership Card - Full Width - CLICKABLE */}
                <TouchableOpacity
                    style={[styles.membershipCard, isRTL && styles.cardRTL]}
                    onPress={() => {
                        if (!isMember) {
                            router.push("/(user)/memberships-explore" as any);
                            return;
                        }
                        router.push("/(user)/member-card");
                    }}
                >
                    <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                        <Ionicons name={isMember ? "diamond" : "lock-closed"} size={24} color={isMember ? "#f59e0b" : COLORS.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: isRTL ? 0 : 16, marginRight: isRTL ? 16 : 0, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <Text style={[styles.statLabel]}>{t('profile.membershipCard', 'Membership Card')}</Text>
                        <Text style={[styles.membershipValue]}>{membershipPlan}</Text>
                        <Text style={[styles.statSubtext]}>
                            {isMember
                                ? t('profile.tapToView', 'Tap to view full card')
                                : t('membership.locked.body', 'Subscribe to explore the app and access all features.')
                            }
                        </Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>

                {/* Cashback & Points Row - CLICKABLE */}
                <View style={[styles.statsRow, isRTL && styles.rowRTL]}>
                    <TouchableOpacity
                        style={[styles.statCard, { flex: 1, marginRight: isRTL ? 0 : 8, marginLeft: isRTL ? 8 : 0 }]}
                        onPress={() => {
                            if (!isMember) {
                                emitMembershipRequired({ source: "profile-view/club-gifts" });
                                return;
                            }
                            router.push("/(user)/club-gifts-history");
                        }}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: '#d1fae5' }]}>
                            <Ionicons name="gift" size={24} color={COLORS.success} />
                        </View>
                        <Text style={[styles.statLabel]}>{t("common.clubGifts")}</Text>
                        <Text style={[styles.statValue]}>{isMember ? cashbackBalance : "--"}</Text>
                        <Text style={[styles.statSubtext]}>
                            {t("common.currency.usd")} {t("cashback.available")}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.statCard, { flex: 1, marginLeft: isRTL ? 0 : 8, marginRight: isRTL ? 8 : 0 }]}
                        onPress={() => {
                            if (!isMember) {
                                emitMembershipRequired({ source: "profile-view/points" });
                                return;
                            }
                            router.push("/(user)/points-history");
                        }}
                    >
                        <View style={[styles.statIconContainer, { backgroundColor: '#fef3c7' }]}>
                            <Ionicons name="trophy" size={24} color="#f59e0b" />
                        </View>
                        <Text style={[styles.statLabel]}>{t("dashboard.points")}</Text>
                        <Text style={[styles.statValue]}>{isMember ? pointsBalance : "--"}</Text>
                        <Text style={[styles.statSubtext]}>{t("points.totalEarned")}</Text>
                    </TouchableOpacity>
                </View>

                {/* Transaction History - CLICKABLE ENTRY */}
                <TouchableOpacity
                    style={[styles.section, isRTL && styles.cardRTL]}
                    onPress={() => {
                        if (!isMember) {
                            emitMembershipRequired({ source: "profile-view/orders" });
                            return;
                        }
                        router.push("/(user)/orders");
                    }}
                >
                    <View style={{ flex: 1, alignItems: isRTL ? 'flex-end' : 'flex-start' }}>
                        <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
                            <View style={[styles.iconSmall, { backgroundColor: '#e0f2fe' }]}>
                                <Ionicons name="receipt" size={18} color={COLORS.primary} />
                            </View>
                            <Text style={[styles.sectionTitle]}>{t("profile.transactionHistory")}</Text>
                        </View>
                        <Text style={[styles.sectionSubtitle]}>
                            {t("profile.transactionHistorySubtitle")}
                        </Text>
                    </View>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={20} color={COLORS.textLight} />
                </TouchableOpacity>
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
    profileCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        alignItems: 'center',
    },
    profileCardRTL: {
        alignItems: 'center', // Centered for now as standard profile view
    },
    cardRTL: {
        flexDirection: 'row-reverse',
    },
    avatarContainer: {
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.background,
    },
    avatarPlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#e2e8f0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    userName: {
        fontSize: 14,
        color: COLORS.primary,
        marginBottom: 4,
        fontWeight: '600',
    },
    fullName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
        textAlign: 'center',
    },
    email: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 4,
    },
    phone: {
        fontSize: 14,
        color: COLORS.textLight,
        marginBottom: 16,
    },
    badgesRow: {
        flexDirection: 'row',
        gap: 8,
    },
    rowRTL: {
        flexDirection: 'row-reverse',
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '600',
    },
    infoCardsRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    infoCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    infoCardLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
        marginBottom: 4,
        fontWeight: '500',
    },
    infoCardValue: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.text,
    },
    membershipCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    membershipValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginVertical: 4,
        textTransform: 'capitalize',
    },
    statsRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    statCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    statIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 4,
        fontWeight: '500',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    statSubtext: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 4,
    },
    iconSmall: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: COLORS.textLight,
        maxWidth: '90%',
    },
});
