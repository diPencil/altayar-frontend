import React, { useState, useEffect } from "react";
import { 
    View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, 
    ActivityIndicator, Image, Modal
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
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

export default function AdminWallets() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const { isAuthenticated, isLoading: authLoading, user } = useAuth();
    const router = useRouter();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [amount, setAmount] = useState("");
    const [actionType, setActionType] = useState<'deposit' | 'withdraw'>('deposit');
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);

    // Toast state
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        // Check authentication before fetching
        if (!authLoading) {
            if (!isAuthenticated || (user?.role !== 'ADMIN' && user?.role !== 'SUPER_ADMIN')) {
                router.replace('/(auth)/login');
                return;
            }
        }
    }, [isAuthenticated, authLoading, user]);

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
        // Fetch wallet details for selected user
        refreshUserData(user.id);
    };

    const handleConfirmAction = () => {
        if (!selectedUser || !amount.trim()) return;

        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            setToast({ visible: true, message: t('admin.manageWallets.invalidAmount', 'Please enter a valid amount'), type: 'error' });
            return;
        }

        if (actionType === 'withdraw' && (selectedUser.wallet?.balance || 0) < numAmount) {
            setToast({ visible: true, message: t('admin.manageWallets.insufficientBalance', 'Insufficient balance'), type: 'error' });
            return;
        }

        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        if (!selectedUser || !amount.trim()) return;

        setLoading(true);
        if (actionType === 'deposit') {
            await handleDeposit();
        } else {
            await handleWithdraw();
        }
        setLoading(false);
    };

    const handleDeposit = async () => {
        try {
            await adminApi.depositToWallet(
                selectedUser.id,
                parseFloat(amount),
                description || t('admin.manageWallets.depositDescription', 'Wallet deposit'),
                description || t('admin.manageWallets.depositDescriptionAr', 'إيداع في المحفظة')
            );
            const amountText = `${parseFloat(amount).toFixed(2)} ${selectedUser.wallet?.currency || 'USD'}`;
            setToast({ visible: true, message: t("admin.manageWallets.depositSuccess", { amount: amountText, user: `${selectedUser.first_name} ${selectedUser.last_name}` }), type: 'success' });
            setAmount("");
            setDescription("");
            setShowConfirmModal(false);
            // Refresh user data
            refreshUserData(selectedUser.id);
        } catch (error: any) {
            console.error("Deposit error:", error);
            setToast({ visible: true, message: error?.message || t('admin.manageWallets.depositError', 'Deposit failed'), type: 'error' });
            setShowConfirmModal(false);
        }
    };

    const handleWithdraw = async () => {
        try {
            await adminApi.withdrawFromWallet(
                selectedUser.id,
                parseFloat(amount),
                description || t('admin.manageWallets.withdrawDescription', 'Wallet withdrawal'),
                description || t('admin.manageWallets.withdrawDescriptionAr', 'سحب من المحفظة')
            );
            setToast({ visible: true, message: t("admin.manageWallets.withdrawSuccess", { amount: `${parseFloat(amount).toFixed(2)} ${selectedUser.wallet?.currency || 'USD'}`, user: `${selectedUser.first_name} ${selectedUser.last_name}` }), type: 'success' });
            setAmount("");
            setDescription("");
            setShowConfirmModal(false);
            // Refresh user data
            refreshUserData(selectedUser.id);
        } catch (error: any) {
            console.error("Withdraw error:", error);
            setToast({ visible: true, message: error?.message || t('admin.manageWallets.withdrawError', 'Withdrawal failed'), type: 'error' });
            setShowConfirmModal(false);
        }
    };

    const refreshUserData = async (userId: string) => {
        try {
            const res = await adminApi.getUserDetails(userId);
            const userData = res.user;
            const updatedUser = {
                ...userData,
                wallet: res.wallet,
                points: res.points,
                cashback_balance: res.cashback_balance
            };
            setSelectedUser(updatedUser);
        } catch (e) {
            console.log("Error refreshing user data", e);
        }
    };

    // Custom RecentActivityList data fetcher for wallets
    const fetchWalletActivity = async () => {
        try {
            const data = await adminApi.getGlobalWalletHistory(20);
            return data.map((item: any) => ({
                id: item.id,
                user_id: item.user_id,
                user_name: item.user_name,
                user_avatar: item.user_avatar,
                amount: item.amount,
                currency: item.currency || 'USD',
                type: item.type || 'DEPOSIT',
                description: item.description,
                created_at: item.created_at
            }));
        } catch (error) {
            console.error("Failed to load wallet activities", error);
            return [];
        }
    };

    return (
        <View style={styles.container}>
            <Stack.Screen options={{ title: t('admin.manageWallets.title', 'User Wallets') }} />
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Page Header */}
                <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.title', 'User Wallets')}</Text>
                <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.subtitle', 'Manage user wallet balances')}</Text>

                {/* Select User Section */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.selectUser', 'Select User')}</Text>

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
                            placeholder={t('admin.manageWallets.searchPlaceholder', 'Search by name, email, phone or member ID')}
                            placeholderTextColor="#94a3b8"
                        />
                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={[styles.searchLoading, isRTL && styles.searchLoadingRTL]} />}
                    </View>

                    {/* Recent Activity List */}
                    {!showSearchResults && !selectedUser && (
                        <RecentActivityList
                            fetchData={fetchWalletActivity}
                            type="wallet"
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
                        <Text style={[styles.noResults, isRTL && styles.textRTL]}>{t('admin.manageWallets.noResults', 'No users found')}</Text>
                    )}
                </View>

                {/* User Wallet Summary Card */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.userSummary', 'User Wallet Summary')}</Text>
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
                                        {t('admin.manageWallets.memberId', 'Member ID')}: {selectedUser.username || selectedUser.id.slice(0, 8)}
                                    </Text>
                                    <Text style={[styles.userSummaryBalance, isRTL && styles.textRTL]}>
                                        {t('admin.manageWallets.currentBalance', 'Current Balance')}: {selectedUser.wallet?.balance?.toFixed(2) || '0.00'} {selectedUser.wallet?.currency || 'USD'}
                                    </Text>
                                    {selectedUser.plan && (
                                        <Text style={[styles.userSummaryMembership, isRTL && styles.textRTL]}>
                                            {selectedUser.plan.name}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    </View>
                )}

                {/* Wallet Action Card */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.walletAction', 'Wallet Action')}</Text>

                        {/* Action Type Selection */}
                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageWallets.actionType', 'Action Type')}</Text>
                        <View style={[styles.actionTypeContainer, isRTL && styles.actionTypeContainerRTL]}>
                            <TouchableOpacity
                                style={[styles.actionTypeButton, actionType === 'deposit' && styles.actionTypeButtonActive]}
                                onPress={() => setActionType('deposit')}
                            >
                                <Ionicons name="add-circle" size={20} color={actionType === 'deposit' ? COLORS.success : COLORS.textLight} />
                                <Text style={[styles.actionTypeText, actionType === 'deposit' && styles.actionTypeTextActive]}>
                                    {t('admin.manageWallets.deposit', 'Deposit')}
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionTypeButton, actionType === 'withdraw' && styles.actionTypeButtonActive]}
                                onPress={() => setActionType('withdraw')}
                            >
                                <Ionicons name="remove-circle" size={20} color={actionType === 'withdraw' ? COLORS.error : COLORS.textLight} />
                                <Text style={[styles.actionTypeText, actionType === 'withdraw' && styles.actionTypeTextActive]}>
                                    {t('admin.manageWallets.withdraw', 'Withdraw')}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageWallets.amount', 'Amount')}</Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={amount}
                            onChangeText={setAmount}
                            placeholder={t('admin.manageWallets.amountPlaceholder', 'Enter amount')}
                            keyboardType="decimal-pad"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageWallets.description', 'Description')} ({t('common.optional', 'Optional')})</Text>
                        <TextInput
                            style={[styles.textArea, isRTL && styles.inputRTL]}
                            value={description}
                            onChangeText={setDescription}
                            placeholder={t('admin.manageWallets.descriptionPlaceholder', 'Enter description (optional)')}
                            multiline
                            numberOfLines={3}
                            placeholderTextColor="#94a3b8"
                        />

                        <TouchableOpacity
                            style={[
                                styles.btn,
                                actionType === 'deposit' ? styles.btnSuccess : styles.btnError,
                                isRTL && styles.btnRTL,
                                (!selectedUser || !amount.trim() || loading) && styles.btnDisabled
                            ]}
                            onPress={handleConfirmAction}
                            disabled={!selectedUser || !amount.trim() || loading}
                        >
                            <Ionicons name={actionType === 'deposit' ? "add-circle" : "remove-circle"} size={20} color="white" />
                            <Text style={styles.btnText}>
                                {actionType === 'deposit' ? t('admin.manageWallets.deposit', 'Deposit') : t('admin.manageWallets.withdraw', 'Withdraw')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Wallet Transactions History */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL, { marginTop: 20 }]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.manageWallets.history', 'Transaction History')}</Text>
                        <WalletHistoryList userId={selectedUser.id} trigger={loading} isRTL={isRTL} />
                    </View>
                )}
            </ScrollView>

            {/* Confirmation Modal */}
            {showConfirmModal && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
                        <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                            {t('admin.manageWallets.confirmTitle', 'Confirm Action')}
                        </Text>
                        <Text style={[styles.modalMessage, isRTL && styles.textRTL]}>
                            {actionType === 'deposit'
                                ? t('admin.manageWallets.confirmDeposit', {
                                    amount: `${parseFloat(amount).toFixed(2)} ${selectedUser.wallet?.currency || 'USD'}`,
                                    user: `${selectedUser.first_name} ${selectedUser.last_name}`
                                })
                                : t('admin.manageWallets.confirmWithdraw', {
                                    amount: `${parseFloat(amount).toFixed(2)} ${selectedUser.wallet?.currency || 'USD'}`,
                                    user: `${selectedUser.first_name} ${selectedUser.last_name}`
                                })
                            }
                        </Text>
                        <View style={[styles.modalButtons, isRTL && styles.modalButtonsRTL]}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.modalBtnText}>{t('common.cancel', 'Cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, actionType === 'deposit' ? styles.modalBtnConfirm : styles.modalBtnRemove]}
                                onPress={executeAction}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalBtnText}>
                                        {actionType === 'deposit' ? t('admin.manageWallets.deposit', 'Deposit') : t('admin.manageWallets.withdraw', 'Withdraw')}
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

function WalletHistoryList({ userId, trigger, isRTL }: any) {
    const { t } = useTranslation();
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (userId) loadHistory();
    }, [userId, trigger]);

    const loadHistory = async () => {
        try {
            setLoading(true);
            const res = await adminApi.getWalletHistory(userId, 20);
            setHistory(res.transactions || []);
        } catch (e) {
            console.log("Error loading wallet history", e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <ActivityIndicator size="small" color={COLORS.primary} />;

    if (history.length === 0) {
        return <Text style={[{ color: COLORS.textLight, fontStyle: 'italic' }, isRTL && styles.textRTL]}>{t('admin.manageWallets.emptyHistory', 'No transactions yet')}</Text>;
    }

    return (
        <View>
            {history.map((item, idx) => {
                const isAdd = item.type === 'DEPOSIT' || item.type === 'REFUND' || item.type === 'CASHBACK' || item.type === 'BONUS' || item.type === 'TRANSFER_IN';
                const actionText = isAdd ? t('admin.manageWallets.deposited', 'Deposited') : t('admin.manageWallets.withdrawn', 'Withdrawn');
                const actionColor = isAdd ? COLORS.success : COLORS.error;
                const formattedAmount = `${Math.abs(item.amount || 0).toFixed(2)} ${item.currency || 'USD'}`;

                return (
                    <View key={idx} style={[styles.historyRow, isRTL && styles.historyRowRTL]}>
                        <View style={[styles.historyLeft, isRTL && styles.historyLeftRTL]}>
                            <Text style={[styles.historyDate, isRTL && styles.textRTL]}>
                                {new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
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
                                {item.description || item.reference_type || t('common.na', 'N/A')}
                            </Text>
                        </View>

                        <View style={[styles.historyRight, isRTL && styles.historyRightRTL]}>
                            <Text style={[styles.historyPerformedBy, isRTL && styles.textRTL]}>
                                {item.created_by_user_id ? t('admin.manageWallets.admin', 'Admin') : t('admin.manageWallets.system', 'System')}
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
        marginBottom: 20,
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
    userAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginEnd: 12,
        overflow: 'hidden',
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
    userSummaryBalance: {
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
    textArea: {
        borderWidth: 1,
        borderColor: COLORS.border,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: COLORS.text,
        marginBottom: 8,
        minHeight: 80,
        textAlignVertical: 'top',
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
    userSummaryHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    userAvatarRTL: {
        marginEnd: 0,
        marginStart: 12,
    },
    userAvatarPlaceholderRTL: {
        marginEnd: 0,
        marginStart: 12,
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