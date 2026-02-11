import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";
import { getPlanColor, getShortCode } from "../../src/utils/planColors";
import RecentActivityList from "../../src/components/RecentActivityList";

const COLORS = {
    primary: "#2563eb",
    background: "#f8fafc",
    cardBg: "#ffffff",
    text: "#1e293b",
    textLight: "#64748b",
    border: "#e2e8f0",
    success: "#10b981",
    error: "#ef4444",
    warning: "#f59e0b",
};

export default function ClubGiftsPage() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState("");
    const [actionType, setActionType] = useState<'add' | 'deduct'>('add');
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setSearchLoading(true);
        try {
            const res = await adminApi.getAllUsers({ search: query, limit: 10 });
            setSearchResults(res.users || []);
            setShowSearchResults(true);
        } catch (e) {
            console.log("Error searching users", e);
            setSearchResults([]);
        } finally {
            setSearchLoading(false);
        }
    };

    const handleUserSelect = (user: any) => {
        setSelectedUser(user);
        setSearchQuery("");
        setShowSearchResults(false);
    };

    const handleConfirmAction = () => {
        if (!selectedUser || !amount.trim()) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setToast({ visible: true, message: t('admin.manageCashback.errorInvalidAmount'), type: 'error' });
            return;
        }

        if (actionType === 'deduct' && (selectedUser.cashback_balance || 0) < numAmount) {
            setToast({ visible: true, message: t('admin.manageCashback.errorInsufficientFunds'), type: 'error' });
            return;
        }

        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        if (!selectedUser || !amount.trim()) return;

        setLoading(true);
        if (actionType === 'add') {
            await handleAddCashback();
        } else {
            await handleRemoveCashback();
        }
        setLoading(false);
    };

    const handleAddCashback = async () => {
        try {
            await adminApi.addCashback(selectedUser.id, parseFloat(amount), reason || t('admin.managePoints.adminBonus'));
            setToast({ visible: true, message: t("admin.manageCashback.successAdd", { amount, user: `${selectedUser.first_name} ${selectedUser.last_name}` }), type: 'success' });
            setAmount("");
            setReason("");
            setShowConfirmModal(false);
            // Refresh user data
            refreshUserData(selectedUser.id);
        } catch (error) {
            console.error("Add club gift error:", error);
            setToast({ visible: true, message: t('common.error'), type: 'error' });
            setShowConfirmModal(false);
        }
    };

    const handleRemoveCashback = async () => {
        try {
            await adminApi.removeCashback(selectedUser.id, parseFloat(amount), reason || t('admin.managePoints.adminAdjustment'));
            setToast({ visible: true, message: t("admin.manageCashback.successRemove", { amount, user: `${selectedUser.first_name} ${selectedUser.last_name}` }), type: 'success' });
            setAmount("");
            setReason("");
            setShowConfirmModal(false);
            // Refresh user data
            refreshUserData(selectedUser.id);
        } catch (error) {
            console.error("Remove club gift error:", error);
            setToast({ visible: true, message: t('common.error'), type: 'error' });
            setShowConfirmModal(false);
        }
    };

    const refreshUserData = async (userId: string) => {
        try {
            const res = await adminApi.getUserDetails(userId);
            // Extract user object correctly as per API response structure
            const userData = res.user;
            // Merge with other details if needed, but for now we just need the user object with updated balances
            // But wait, getUserDetails returns { user: {...}, cashback_balance: ..., points: ..., wallet: ... }
            // The selectedUser state currently seems to expect a flat object or the one from getAllUsers.
            // Let's create a compatible object.
            const updatedUser = {
                ...userData,
                cashback_balance: res.cashback_balance,
                points: res.points,
                wallet: res.wallet // if strictly needed
            };
            setSelectedUser(updatedUser);
        } catch (e) {
            console.log("Error refreshing user data", e);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Page Header */}
                <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.title')}</Text>
                <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.subtitle')}</Text>

                {/* Select User Section */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.selectUser')}</Text>

                    {/* Search Input */}
                    <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
                        <Ionicons name="search" size={20} color={COLORS.textLight} style={[styles.searchIcon, isRTL && styles.searchIconRTL]} />
                        <TextInput
                            style={[styles.searchInput, isRTL && styles.inputRTL]}
                            value={searchQuery}
                            onChangeText={(text) => {
                                setSearchQuery(text);
                                handleSearch(text);
                            }}
                            placeholder={t('admin.manageCashback.searchPlaceholder')}
                            placeholderTextColor="#94a3b8"
                        />
                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={[styles.searchLoading, isRTL && styles.searchLoadingRTL]} />}
                    </View>

                    {/* Recent Activity List */}
                    {!showSearchResults && !selectedUser && (
                        <RecentActivityList
                            fetchData={adminApi.getGlobalCashbackHistory}
                            type="cashback"
                        />
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <View style={[styles.searchResults, isRTL && styles.searchResultsRTL]}>
                            {searchResults.map(user => (
                                <TouchableOpacity
                                    key={user.id}
                                    style={[styles.searchResultItem, isRTL && styles.searchResultItemRTL]}
                                    onPress={() => handleUserSelect(user)}
                                >
                                    <View style={styles.userInfo}>
                                        <Text style={[styles.userName, isRTL && styles.textRTL]}>
                                            {user.first_name} {user.last_name}
                                        </Text>
                                        <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{user.email}</Text>
                                        {user.phone && (
                                            <Text style={[styles.userPhone, isRTL && styles.textRTL]}>{user.phone}</Text>
                                        )}
                                    </View>
                                    {user.plan && (
                                        <View style={[styles.membershipBadge, { backgroundColor: getPlanColor(user.plan.code || user.plan.tier_code, user.plan.color || user.plan.color_hex) }]}>
                                            <Text style={styles.membershipBadgeText}>{user.plan.code || getShortCode(user.plan.tier_code, user.plan.name)}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}

                    {showSearchResults && searchResults.length === 0 && !searchLoading && (
                        <Text style={[styles.noResults, isRTL && styles.textRTL]}>{t('admin.manageCashback.noResults')}</Text>
                    )}
                </View>

                {/* User Cashback Summary Card */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.userSummary')}</Text>
                        <View style={styles.userSummaryCard}>
                            <View style={[styles.userSummaryHeader, isRTL && styles.userSummaryHeaderRTL]}>
                                {selectedUser.avatar ? (
                                    <Image source={{ uri: selectedUser.avatar }} style={[styles.userAvatar, isRTL && styles.userAvatarRTL]} />
                                ) : (
                                    <View style={[styles.userAvatarPlaceholder, isRTL && styles.userAvatarPlaceholderRTL]}>
                                        <Ionicons name="person" size={24} color={COLORS.textLight} />
                                    </View>
                                )}
                                <View style={styles.userSummaryInfo}>
                                    <Text style={[styles.userSummaryName, isRTL && styles.textRTL]}>
                                        {selectedUser.first_name} {selectedUser.last_name}
                                    </Text>
                                    <Text style={[styles.userSummaryId, isRTL && styles.textRTL]}>
                                        {t('admin.manageCashback.memberId')}: {selectedUser.username || selectedUser.id.slice(0, 8)}
                                    </Text>
                                    <Text style={[styles.userSummaryCashback, isRTL && styles.textRTL]}>
                                        {t('admin.manageCashback.currentBalance')}: {selectedUser.cashback_balance?.toFixed(2) || '0.00'} {t('common.currency.usd')}
                                    </Text>
                                    {selectedUser.plan && (
                                        <Text style={[styles.userSummaryMembership, isRTL && styles.textRTL]}>
                                            {selectedUser.plan.name}
                                        </Text>
                                    )}
                                    <Text style={[styles.userSummaryPoints, isRTL && styles.textRTL]}>
                                        {t('admin.manageCashback.loyaltyPoints')}: {selectedUser.points?.current_balance || 0} {t('common.pts')}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Cashback Action Card */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.cashbackAction')}</Text>

                        {/* Action Type Selection */}
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageCashback.actionType')}</Text>
                        <View style={[styles.actionTypeContainer, isRTL && styles.actionTypeContainerRTL]}>
                            <TouchableOpacity
                                style={[styles.actionTypeButton, actionType === 'add' && styles.actionTypeButtonActive]}
                                onPress={() => setActionType('add')}
                            >
                                <Ionicons name="add-circle" size={20} color={actionType === 'add' ? COLORS.success : COLORS.textLight} />
                                <Text style={[styles.actionTypeText, actionType === 'add' && styles.actionTypeTextActive]}>
                                    {t('admin.manageCashback.addCashback')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionTypeButton, actionType === 'deduct' && styles.actionTypeButtonActive]}
                                onPress={() => setActionType('deduct')}
                            >
                                <Ionicons name="remove-circle" size={20} color={actionType === 'deduct' ? COLORS.error : COLORS.textLight} />
                                <Text style={[styles.actionTypeText, actionType === 'deduct' && styles.actionTypeTextActive]}>
                                    {t('admin.manageCashback.deductCashback')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageCashback.amount')}</Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder={t('admin.manageCashback.amountPlaceholder')}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageCashback.reason')} ({t('common.optional')})</Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder={t('admin.manageCashback.reasonPlaceholder')}
                            placeholderTextColor="#94a3b8"
                        />

                        <TouchableOpacity
                            style={[
                                styles.btn,
                                actionType === 'add' ? styles.btnSuccess : styles.btnError,
                                isRTL && styles.btnRTL,
                                (!selectedUser || !amount.trim() || loading) && styles.btnDisabled
                            ]}
                            onPress={handleConfirmAction}
                            disabled={!selectedUser || !amount.trim() || loading}
                        >
                            <Ionicons name={actionType === 'add' ? "add-circle" : "remove-circle"} size={20} color="white" />
                            <Text style={styles.btnText}>
                                {actionType === 'add' ? t('admin.manageCashback.add') : t('admin.manageCashback.remove')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Cashback Transactions History */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL, { marginTop: 20 }]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageCashback.history')}</Text>
                        <HistoryList userId={selectedUser.id} type="cashback" trigger={loading} isRTL={isRTL} />
                    </View>
                )}
            </ScrollView>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
                        <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                            {t('admin.manageCashback.confirmTitle')}
                        </Text>
                        <Text style={[styles.modalMessage, isRTL && styles.textRTL]}>
                            {actionType === 'add'
                                ? t('admin.manageCashback.confirmAdd', {
                                    amount: `${parseFloat(amount).toFixed(2)} ${t('common.currency.usd')}`,
                                    user: `${selectedUser.first_name} ${selectedUser.last_name}`
                                })
                                : t('admin.manageCashback.confirmRemove', {
                                    amount: `${parseFloat(amount).toFixed(2)} ${t('common.currency.usd')}`,
                                    user: `${selectedUser.first_name} ${selectedUser.last_name}`
                                })
                            }
                        </Text>
                        <View style={[styles.modalButtons, isRTL && styles.modalButtonsRTL]}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.modalBtnText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, actionType === 'add' ? styles.modalBtnConfirm : styles.modalBtnRemove]}
                                onPress={executeAction}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalBtnText}>
                                        {actionType === 'add' ? t('admin.manageCashback.add') : t('admin.manageCashback.remove')}
                                    </Text>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View>
    );
}

function HistoryList({ userId, type, trigger, isRTL }: any) {
    const { t } = useTranslation();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) loadHistory();
    }, [userId, trigger]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            let res;
            if (type === 'points') {
                res = await adminApi.getPointsHistory(userId, 20);
                setHistory(res.transactions || []);
            } else {
                res = await adminApi.getCashbackHistory(userId, 20);
                setHistory(res.records || []);
            }
        } catch (e) {
            console.log("Error loading history", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator size="small" color={COLORS.primary} />;

    if (history.length === 0) {
        return <Text style={[{ color: COLORS.textLight, fontStyle: 'italic' }, isRTL && styles.textRTL]}>{t('admin.manageCashback.empty')}</Text>;
    }

    return (
        <View>
            {history.map((item, idx) => {
                let isAdd = false;
                if (type === 'points') {
                    isAdd = item.points > 0 || item.type === 'EARNED' || item.type === 'BONUS';
                } else {
                    // For cashback records, they are always additions/credits
                    isAdd = true;
                    // If we later implement deductions in this list, we'll need a way to distinguish, 
                    // but currently getCashbackHistory only returns CashbackRecords (earnings).
                }

                const actionText = isAdd ? t('admin.manageCashback.received') : t('admin.manageCashback.deducted');
                const actionColor = isAdd ? COLORS.success : COLORS.error;
                const formattedAmount = type === 'points'
                    ? `${Math.abs(item.points || 0)} ${t('common.pts')}`
                    : `${Math.abs(item.amount || item.cashback_amount || 0).toFixed(2)} ${t('common.currency.usd')}`;

                return (
                    <View key={idx} style={[styles.historyRow, isRTL && styles.historyRowRTL]}>
                        <View style={[styles.historyLeft, isRTL && styles.historyLeftRTL]}>
                            <Text style={[styles.historyDate, isRTL && styles.textRTL]}>
                                {new Date(item.created_at || item.date).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
                            </Text>
                            <Text style={[styles.historyAction, { color: actionColor }, isRTL && styles.textRTL]}>
                                {actionText}
                            </Text>
                        </View>

                        <View style={[styles.historyCenter, isRTL && styles.historyCenterRTL]}>
                            <Text style={[styles.historyAmount, isRTL && styles.textRTL]}>
                                {formattedAmount}
                            </Text>
                            <Text style={[styles.historyReason, isRTL && styles.textRTL]} numberOfLines={1}>
                                {item.description || item.reason || item.reference_type || t('common.na')}
                            </Text>
                        </View>

                        <View style={[styles.historyRight, isRTL && styles.historyRightRTL]}>
                            <Text style={[styles.historyPerformedBy, isRTL && styles.textRTL]}>
                                {item.created_by_user_id ? t('admin.manageCashback.admin') : t('admin.manageCashback.system')}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    pageTitle: {
        fontSize: 24,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textLight,
    },
    section: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: "bold",
        marginBottom: 16,
        color: COLORS.text,
    },
    // Search Styles
    searchContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    searchInput: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 40,
        paddingVertical: 12,
        fontSize: 14,
        color: COLORS.text,
        backgroundColor: COLORS.cardBg,
    },
    searchIcon: {
        position: 'absolute',
        left: 12,
        top: 12,
        right: undefined,
    },
    searchLoading: {
        position: 'absolute',
        right: 12,
        top: 12,
        left: undefined,
    },
    searchResults: {
        backgroundColor: COLORS.cardBg,
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        marginTop: -8,
        maxHeight: 200,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    userInfo: {
        flex: 1,
    },
    userName: {
        fontSize: 14,
        fontWeight: "bold",
        color: COLORS.text,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    userPhone: {
        fontSize: 12,
        color: COLORS.textLight,
    },
    membershipBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    membershipBadgeText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    noResults: {
        color: COLORS.textLight,
        fontStyle: 'italic',
        textAlign: 'center',
        marginTop: 16,
    },
    // User Summary Styles
    userSummaryCard: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 8,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userSummaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    userSummaryHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginEnd: 12,
    },
    userAvatarRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    userAvatarPlaceholder: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: COLORS.border,
        justifyContent: 'center',
        alignItems: 'center',
        marginEnd: 12,
    },
    userAvatarPlaceholderRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    userSummaryInfo: {
        flex: 1,
    },
    userSummaryName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 4,
    },
    userSummaryId: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    userSummaryCashback: {
        fontSize: 14,
        color: COLORS.success,
        fontWeight: '600',
        marginBottom: 2,
    },
    userSummaryMembership: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    userSummaryPoints: {
        fontSize: 12,
        color: COLORS.primary,
    },
    // Action Type Styles
    actionTypeContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionTypeButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.cardBg,
        gap: 8,
    },
    actionTypeButtonActive: {
        borderColor: COLORS.primary,
        backgroundColor: "#eff6ff",
    },
    actionTypeText: {
        fontSize: 14,
        color: COLORS.textLight,
        fontWeight: '500',
    },
    actionTypeTextActive: {
        color: COLORS.primary,
        fontWeight: '600',
    },
    label: {
        fontSize: 14,
        fontWeight: "500",
        color: COLORS.text,
        marginBottom: 8,
        marginTop: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 8,
    },
    btn: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
        marginTop: 16,
    },
    btnSuccess: {
        backgroundColor: COLORS.success,
    },
    btnError: {
        backgroundColor: COLORS.error,
    },
    btnDisabled: {
        opacity: 0.5,
    },
    btnText: {
        color: "white",
        fontWeight: "bold",
        fontSize: 14,
    },
    // Modal Styles
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 20,
    },
    modalContent: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalBtn: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    modalBtnCancel: {
        backgroundColor: COLORS.border,
    },
    modalBtnConfirm: {
        backgroundColor: COLORS.success,
    },
    modalBtnRemove: {
        backgroundColor: COLORS.error,
    },
    modalBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 14,
    },
    // History Styles
    historyRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    historyLeft: {
        flex: 1,
        alignItems: 'flex-start',
    },
    historyCenter: {
        flex: 1,
        alignItems: 'center',
    },
    historyRight: {
        flex: 1,
        alignItems: 'flex-end',
    },
    historyDate: {
        fontSize: 12,
        color: COLORS.textLight,
        marginBottom: 2,
    },
    historyAction: {
        fontSize: 13,
        fontWeight: '600',
    },
    historyAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 2,
    },
    historyReason: {
        fontSize: 11,
        color: COLORS.textLight,
    },
    historyPerformedBy: {
        fontSize: 11,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
    // RTL Styles
    textRTL: {
        textAlign: "right",
    },
    sectionRTL: {
        // Removed alignItems to allow full width
    },
    inputRTL: {
        textAlign: "right",
    },
    searchContainerRTL: {
        // Search container RTL adjustments if needed
    },
    searchIconRTL: {
        left: undefined,
        right: 12,
    },
    searchLoadingRTL: {
        right: undefined,
        left: 12,
    },
    searchResultsRTL: {
        // Search results RTL adjustments if needed
    },
    searchResultItemRTL: {
        flexDirection: 'row-reverse',
    },
    actionTypeContainerRTL: {
        flexDirection: 'row-reverse',
    },
    btnRTL: {
        flexDirection: "row-reverse",
    },
    modalContentRTL: {
        // Modal RTL adjustments if needed
    },
    modalButtonsRTL: {
        flexDirection: 'row-reverse',
    },
    historyRowRTL: {
        flexDirection: "row-reverse",
    },
    historyLeftRTL: {
        alignItems: 'flex-end',
    },
    historyCenterRTL: {
        alignItems: 'center',
    },
    historyRightRTL: {
        alignItems: 'flex-start',
    },
});
