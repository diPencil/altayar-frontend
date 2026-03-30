import React, { useState, useEffect, useCallback } from "react";
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    ActivityIndicator, TextInput, Modal, Alert, Image, Dimensions
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import Toast from "../../src/components/Toast";
import { useLanguage } from "../../src/contexts/LanguageContext";

const { width } = Dimensions.get('window');
const COLORS = {
    primary: "#1071b8", // Employee theme
    background: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    warning: "#f59e0b",
    error: "#ef4444",
    purple: "#8b5cf6",
};

export default function EmployeeCustomers() {
    const router = useRouter();
    const { userId } = useLocalSearchParams();
    const { t, i18n } = useTranslation();
    const { isRTL, isReady } = useLanguage();
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // filters
    const [search, setSearch] = useState("");

    // details modal
    const [detailsModalVisible, setDetailsModalVisible] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    // Handle deep linking for userId
    useEffect(() => {
        if (userId) {
            setSelectedUserId(userId as string);
            setDetailsModalVisible(true);
        }
    }, [userId]);

    useFocusEffect(
        useCallback(() => {
            fetchUsers();
        }, [search])
    );

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const params: any = { limit: 50 };
            if (search) params.search = search;

            // Use employee-specific endpoint that filters by assigned customers
            const { employeeApi } = await import('../../src/services/api');
            const res = await employeeApi.getMyCustomers(params);
            const usersList = res.users || [];
            setUsers(usersList);
        } catch (e) {
            console.log("Error fetching users", e);
        } finally {
            setLoading(false);
        }
    };


    const openDetails = (id: string) => {
        setSelectedUserId(id);
        setDetailsModalVisible(true);
    }

    if (!isReady || !i18n.isInitialized) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={[styles.header]}>
                <Text style={styles.pageTitle}>{t('admin.manageUsers.title')}</Text>
                {/* Employee cannot create users usually */}
            </View>

            {/* Simple Mobile Filter Bar */}
            <View style={[styles.filterBar]}>
                <View style={[styles.searchContainer]}>
                    <Ionicons name="search" size={20} color={COLORS.textLight} />
                    <TextInput
                        style={[styles.searchInput, isRTL && styles.searchInputRTL]}
                        placeholder={t('admin.manageUsers.searchPlaceholder')}
                        value={search}
                        onChangeText={setSearch}
                        onSubmitEditing={fetchUsers}
                        placeholderTextColor={COLORS.textLight}
                    />
                </View>
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 40 }} />
            ) : users.length === 0 ? (
                <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('admin.manageUsers.empty')}</Text>
            ) : (
                <View style={styles.listContainer}>
                    {users.map((u) => (
                        <View key={u.id} style={styles.userCard}>
                            <View style={[styles.userMeta]}>
                                <View style={styles.avatar}>
                                    {u.avatar ? (
                                        <Image source={{ uri: u.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                                    ) : (
                                        <Text style={styles.avatarText}>{u.first_name?.[0]}{u.last_name?.[0]}</Text>
                                    )}
                                </View>
                                <View style={{ flex: 1, [isRTL ? 'marginEnd' : 'marginStart']: 12 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <Text style={styles.userName} numberOfLines={1}>{u.first_name} {u.last_name}</Text>
                                        <StatusDot status={u.status} />
                                    </View>
                                    <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{u.email}</Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                                        {u.membership ? (
                                            <PlanBadge
                                                name={isRTL ? (u.membership.plan_name_ar || u.membership.plan_name) : (u.membership.plan_name_en || u.membership.plan_name)}
                                                color={u.membership.plan_color || COLORS.purple}
                                            />
                                        ) : (<Text style={styles.noPlan}>{t('admin.manageUsers.noPlan')}</Text>)}
                                    </View>
                                </View>
                            </View>

                            <TouchableOpacity style={[styles.detailsBtn]} onPress={() => openDetails(u.id)}>
                                <Text style={styles.detailsBtnText}>{t('admin.manageUsers.details')}</Text>
                                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={COLORS.primary} />
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            {/* User Details Modal */}
            {selectedUserId && (
                <UserDetailsModal
                    userId={selectedUserId}
                    visible={detailsModalVisible}
                    onClose={() => { setDetailsModalVisible(false); setSelectedUserId(null); }}
                />
            )}

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </ScrollView>
    );
}

// --- Components ---

function UserDetailsModal({ userId, visible, onClose }: { userId: string; visible: boolean; onClose: () => void }) {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (visible && userId) {
            loadData();
        }
    }, [visible, userId]);

    const loadData = async () => {
        try {
            setLoading(true);
            // Use employee API to get customer details
            const { employeeApi } = await import('../../src/services/api');
            const res = await employeeApi.getCustomerDetails(userId);
            setData(res);
        } catch (e) {
            console.error("Error loading customer details:", e);
            onClose();
        } finally {
            setLoading(false);
        }
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
            <View style={styles.detailsContainer}>
                <View style={styles.detailsHeader}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Ionicons name="close" size={24} color={COLORS.text} />
                    </TouchableOpacity>
                    <Text style={styles.detailsTitle}>{t('admin.manageUsers.userProfile.title')}</Text>
                </View>

                {loading || !data ? (
                    <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
                ) : (
                    <ScrollView contentContainerStyle={{ padding: 20 }}>
                        {/* Profile Card */}
                        <View style={styles.card}>
                            <View style={{ alignItems: 'center', marginBottom: 16 }}>
                                <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                                    {data.user.avatar ? (
                                        <Image source={{ uri: data.user.avatar }} style={{ width: 80, height: 80, borderRadius: 40 }} />
                                    ) : (
                                        <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.textLight }}>
                                            {(data.user.first_name || data.user.email || '?')?.[0]}
                                        </Text>
                                    )}
                                </View>
                                <Text style={styles.bigName}>
                                    {`${data.user.first_name || ''} ${data.user.last_name || ''}`.trim() || data.user.email || t('common.unknown', 'Unknown')}
                                </Text>
                                <Text style={styles.subText}>{data.user.email}</Text>
                                <Text style={styles.subText}>{data.user.phone || t('common.noPhone')}</Text>
                            </View>

                            <View style={styles.divider} />
                            <View style={styles.rowBetween}>
                                <Text style={styles.label}>{t('admin.manageUsers.userProfile.memberId')}</Text>
                                <Text style={styles.value}>
                                    {t("common.altId", { id: data.user.id.substring(0, 8).toUpperCase() })}
                                </Text>
                            </View>
                            <View style={styles.rowBetween}>
                                <Text style={styles.label}>{t('admin.manageUsers.userProfile.joined')}</Text>
                                <Text style={styles.value}>
                                    {data.user.created_at ? new Date(data.user.created_at).toLocaleDateString() : t('common.na', 'N/A')}
                                </Text>
                            </View>
                        </View>

                        {/* Membership & Wallet Grid */}
                        <View style={styles.grid}>
                            {/* Membership */}
                            <View style={[styles.miniCard, { flex: 1, marginEnd: 8 }]}>
                                <Ionicons name="card-outline" size={24} color={COLORS.purple} />
                                <Text style={styles.miniCardTitle}>{t('admin.manageUsers.userProfile.membership')}</Text>
                                {data.membership ? (
                                    <>
                                        <Text style={[styles.highlightValue, { color: data.membership.plan_color || COLORS.text }]}>
                                            {data.membership.plan_name}
                                        </Text>
                                        <Text style={styles.miniCardSub}>
                                            {t('admin.manageUsers.userProfile.ends')}: {data.membership.end_date ? new Date(data.membership.end_date).toLocaleDateString() : t('common.na')}
                                        </Text>
                                    </>
                                ) : (
                                    <Text style={styles.value}>{t('admin.manageUsers.userProfile.notSubscribed')}</Text>
                                )}
                            </View>

                            {/* Wallet */}
                            <View style={[styles.miniCard, { flex: 1, marginStart: 8 }]}>
                                <Ionicons name="wallet-outline" size={24} color={COLORS.success} />
                                <Text style={styles.miniCardTitle}>{t('admin.manageUsers.userProfile.walletBalance')}</Text>
                                <Text style={[styles.highlightValue, { color: COLORS.success }]}>
                                    {data.wallet?.balance} {data.wallet?.currency}
                                </Text>
                            </View>
                        </View>

                        {/* Club Gifts & Loyalty Points Grid */}
                        <View style={styles.grid}>
                            {/* Club Gifts */}
                            <View style={[styles.miniCard, { flex: 1, marginEnd: 8 }]}>
                                <Ionicons name="gift-outline" size={24} color={COLORS.warning} />
                                <Text style={styles.miniCardTitle}>{t("memberCard.clubGiftsBalance")}</Text>
                                <Text style={[styles.highlightValue, { color: COLORS.warning }]}>
                                    {data.cashback_balance || 0.00} USD
                                </Text>
                                <Text style={styles.miniCardSub}>{t("cashback.available")}</Text>
                            </View>

                            {/* Loyalty Points */}
                            <View style={[styles.miniCard, { flex: 1, marginStart: 8 }]}>
                                <Ionicons name="star-outline" size={24} color={COLORS.purple} />
                                <Text style={styles.miniCardTitle}>{t("dashboard.loyaltyPoints")}</Text>
                                <Text style={[styles.highlightValue, { color: COLORS.purple }]}>
                                    {data.points?.current_balance || 0} PTS
                                </Text>
                                <Text style={styles.miniCardSub}>
                                    {t("points.totalEarned")}: {data.points?.total_earned || 0}
                                </Text>
                            </View>
                        </View>

                        {/* Recent Payments */}
                        <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('admin.manageUsers.userProfile.recentPayments')}</Text>
                        {data.recent_payments?.length > 0 ? (
                            data.recent_payments.map((p: any) => (
                                <View key={p.id} style={styles.paymentRow}>
                                    <View>
                                        <Text style={styles.paymentAmount}>{p.amount} {p.currency}</Text>
                                        <Text style={styles.paymentDate}>{new Date(p.date).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <View style={[styles.statusBadge,
                                        p.status === 'PAID' ? { backgroundColor: '#ecfdf5' } : { backgroundColor: '#fff1f2' }
                                        ]}>
                                            <Text style={[styles.statusText,
                                            p.status === 'PAID' ? { color: '#059669' } : { color: '#e11d48' }
                                            ]}>{p.status}</Text>
                                        </View>
                                        <Text style={styles.paymentMethod}>{p.method}</Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <Text style={{ textAlign: 'center', color: COLORS.textLight, marginTop: 12 }}>
                                {t('admin.manageUsers.userProfile.noPayments')}
                            </Text>
                        )}

                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

function StatusDot({ status }: any) {
    let color = '#94a3b8'; // gray
    if (status === 'ACTIVE') color = COLORS.success;
    if (status === 'INACTIVE') color = COLORS.error;
    if (status === 'SUSPENDED') color = COLORS.warning;
    return <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color }} />;
}

function PlanBadge({ name, color }: any) {
    return (
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, backgroundColor: color || COLORS.primary, borderRadius: 4 }}>
            <Text style={{ color: 'white', fontSize: 10, fontWeight: 'bold' }}>{name}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 20,
        marginBottom: 16,
    },
    pageTitle: {
        fontSize: 22,
        fontWeight: "bold",
        color: COLORS.text,
    },
    // Filter Bar
    filterBar: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        flexDirection: 'row',
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 8,
        paddingHorizontal: 12,
        height: 44,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    searchInput: {
        flex: 1,
        marginStart: 8,
        fontSize: 14,
        color: COLORS.text,
    },
    // Lists
    listContainer: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    userCard: {
        backgroundColor: 'white',
        marginBottom: 12,
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#eff6ff',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#dbeafe',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        flex: 1,
    },
    userEmail: {
        fontSize: 13,
        color: COLORS.textLight,
    },
    noPlan: {
        fontSize: 12,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: '#f1f5f9',
    },

    detailsBtnText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
        marginEnd: 4,
    },
    // Modal Details
    detailsContainer: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    detailsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    closeBtn: {
        padding: 8,
        marginEnd: 8,
    },
    detailsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
        textAlign: 'center',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    bigName: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 8,
    },
    subText: {
        fontSize: 14,
        color: COLORS.textLight,
        marginTop: 2,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
    },
    divider: {
        height: 1,
        backgroundColor: '#f1f5f9',
        marginVertical: 16,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    grid: {
        flexDirection: 'row',
    },
    miniCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    miniCardTitle: {
        fontSize: 13,
        color: COLORS.textLight,
        marginTop: 8,
    },
    highlightValue: {
        fontSize: 16,
        fontWeight: 'bold',
        marginTop: 4,
    },
    miniCardSub: {
        fontSize: 11,
        color: '#94a3b8',
        marginTop: 4,
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    paymentRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    paymentAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    paymentDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        marginBottom: 4,
    },
    statusText: {
        fontSize: 10,
        fontWeight: 'bold',
    },
    paymentMethod: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    // RTL Styles

    searchInputRTL: {
        textAlign: 'right',
        marginStart: 0,
        marginEnd: 8,
    },
    textRTL: {
        textAlign: 'right',
    },
    emptyText: {
        textAlign: "center",
        color: COLORS.textLight,
        marginTop: 20,
        fontSize: 15,
    },
});
