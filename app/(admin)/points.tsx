import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { getPlanColor, getShortCode } from "../../src/utils/planColors";
import Toast from "../../src/components/Toast";
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
};

export default function PointsPage() {
    const { t } = useTranslation();
    const { isRTL } = useLanguage();
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [points, setPoints] = useState("");
    const [reason, setReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);

    // Confirmation modal state
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [confirmAction, setConfirmAction] = useState<'add' | 'remove' | null>(null);

    // Toast state

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

    const handleConfirmAction = (action: 'add' | 'remove') => {
        if (!selectedUser || !points.trim()) return;
        setConfirmAction(action);
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        if (!confirmAction || !selectedUser || !points.trim()) return;

        try {
            setLoading(true);
            if (confirmAction === 'add') {
                await handleAddPoints();
            } else {
                await handleRemovePoints();
            }
            setShowConfirmModal(false);
            setConfirmAction(null);
        } catch (e) {
            // Error handled in individual functions
        } finally {
            setLoading(false);
        }
    };

    const handleAddPoints = async () => {
        const defaultReason = t("admin.managePoints.adminBonus");
        console.log('Adding points:', { userId: selectedUser.id, points: parseInt(points), reason: reason || defaultReason });
        const res = await adminApi.addPoints(selectedUser.id, parseInt(points), reason || defaultReason);
        console.log('Add points response:', res);
        setToast({ visible: true, message: t("admin.managePoints.successAdd", { points, email: selectedUser.email }), type: 'success' });
        setPoints("");
        setReason("");
        // Refresh user data if needed
    };

    const handleRemovePoints = async () => {
        const defaultReason = t("admin.managePoints.adminAdjustment");
        const res = await adminApi.removePoints(selectedUser.id, parseInt(points), reason || defaultReason);
        setToast({ visible: true, message: t("admin.managePoints.successRemove", { points, email: selectedUser.email }), type: 'success' });
        setPoints("");
        setReason("");
        // Refresh user data if needed
    };

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                {/* Page Header */}
                <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('admin.managePoints.title')}</Text>
                <Text style={[styles.subtitle, isRTL && styles.textRTL]}>{t('admin.managePoints.subtitle')}</Text>

                {/* Select User Section */}
                <View style={[styles.section, isRTL && styles.sectionRTL]}>
                    <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.managePoints.selectUser')}</Text>

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
                            placeholder={t('admin.managePoints.searchPlaceholder')}
                            placeholderTextColor="#94a3b8"
                        />
                        {searchLoading && <ActivityIndicator size="small" color={COLORS.primary} style={styles.searchLoading} />}
                    </View>

                    {/* Recent Activity List */}
                    {!showSearchResults && !selectedUser && (
                        <RecentActivityList
                            fetchData={adminApi.getGlobalPointsHistory}
                            type="points"
                        />
                    )}

                    {/* Search Results Dropdown */}
                    {showSearchResults && searchResults.length > 0 && (
                        <View style={[styles.searchResults, isRTL && styles.searchResultsRTL]}>
                            {searchResults.map(user => (
                                <TouchableOpacity
                                    key={user.id}
                                    style={[styles.searchResultItem]}
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
                        <Text style={[styles.noResults, isRTL && styles.textRTL]}>{t('admin.managePoints.noResults')}</Text>
                    )}
                </View>

                {/* User Summary Card */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.managePoints.userSummary')}</Text>
                        <View style={styles.userSummaryCard}>
                            <View style={[styles.userSummaryHeader]}>
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
                                        {t('admin.managePoints.memberId')}: {selectedUser.username || selectedUser.id.slice(0, 8)}
                                    </Text>
                                    <Text style={[styles.userSummaryPoints, isRTL && styles.textRTL]}>
                                        {t('admin.managePoints.currentPoints')}: {selectedUser.points?.current_balance || 0}
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

                {/* Points Action Section */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.managePoints.pointsAction')}</Text>

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.managePoints.amount')}</Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={points}
                            onChangeText={setPoints}
                            placeholder={t('admin.managePoints.amountPlaceholder')}
                            keyboardType="numeric"
                            placeholderTextColor="#94a3b8"
                        />

                        <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.managePoints.reason')} ({t('common.optional')})</Text>
                        <TextInput
                            style={[styles.input, isRTL && styles.inputRTL]}
                            value={reason}
                            onChangeText={setReason}
                            placeholder={t('admin.managePoints.reasonPlaceholder')}
                            placeholderTextColor="#94a3b8"
                        />

                        <View style={[styles.buttonRow]}>
                            <TouchableOpacity
                                style={[
                                    styles.btn,
                                    styles.btnSuccess,
                                    (!selectedUser || !points.trim() || loading) && styles.btnDisabled
                                ]}
                                onPress={() => handleConfirmAction('add')}
                                disabled={!selectedUser || !points.trim() || loading}
                            >
                                <Ionicons name="add-circle" size={20} color="white" />
                                <Text style={styles.btnText}>{t('admin.managePoints.add')}</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.btn,
                                    styles.btnError,
                                    (!selectedUser || !points.trim() || loading) && styles.btnDisabled
                                ]}
                                onPress={() => handleConfirmAction('remove')}
                                disabled={!selectedUser || !points.trim() || loading}
                            >
                                <Ionicons name="remove-circle" size={20} color="white" />
                                <Text style={styles.btnText}>{t('admin.managePoints.remove')}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                {/* Transaction History */}
                {selectedUser && (
                    <View style={[styles.section, isRTL && styles.sectionRTL, { marginTop: 20 }]}>
                        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('admin.managePoints.history')}</Text>
                        <HistoryList userId={selectedUser.id} type="points" trigger={loading} isRTL={isRTL} />
                    </View>
                )}
            </ScrollView>

            {/* Confirmation Modal */}
            {showConfirmModal && confirmAction && (
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
                        <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                            {t('admin.managePoints.confirmTitle')}
                        </Text>
                        <Text style={[styles.modalMessage, isRTL && styles.textRTL]}>
                            {confirmAction === 'add'
                                ? t('admin.managePoints.confirmAdd', { points, user: `${selectedUser.first_name} ${selectedUser.last_name}` })
                                : t('admin.managePoints.confirmRemove', { points, user: `${selectedUser.first_name} ${selectedUser.last_name}` })
                            }
                        </Text>
                        <View style={[styles.modalButtons]}>
                            <TouchableOpacity
                                style={[styles.modalBtn, styles.modalBtnCancel]}
                                onPress={() => setShowConfirmModal(false)}
                            >
                                <Text style={styles.modalBtnText}>{t('common.cancel')}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, confirmAction === 'add' ? styles.modalBtnConfirm : styles.modalBtnRemove]}
                                onPress={executeAction}
                                disabled={loading}
                            >
                                {loading ? (
                                    <ActivityIndicator size="small" color="white" />
                                ) : (
                                    <Text style={styles.modalBtnText}>
                                        {confirmAction === 'add' ? t('admin.managePoints.add') : t('admin.managePoints.remove')}
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
        return <Text style={[{ color: COLORS.textLight, fontStyle: 'italic' }, isRTL && styles.textRTL]}>{t('admin.managePoints.empty')}</Text>;
    }

    return (
        <View>
            {history.map((item, idx) => {
                const isAdd = item.points > 0 || item.transaction_type === 'BONUS' || item.transaction_type === 'EARNED';
                const actionText = isAdd ? t('admin.managePoints.added') : t('admin.managePoints.deducted');
                const actionColor = isAdd ? COLORS.success : COLORS.error;

                return (
                    <View key={idx} style={[styles.historyRow]}>
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
                                {Math.abs(item.points)} PTS
                            </Text>
                            <Text style={[styles.historyReason, isRTL && styles.textRTL]} numberOfLines={1}>
                                {item.description_en || item.reason || t('common.na')}
                            </Text>
                        </View>

                        <View style={[styles.historyRight, isRTL && styles.historyRightRTL]}>
                            <Text style={[styles.historyPerformedBy, isRTL && styles.textRTL]}>
                                {item.created_by_user_id ? t('admin.managePoints.admin') : t('admin.managePoints.system')}
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
        marginBottom: 24,
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
    },
    searchLoading: {
        position: 'absolute',
        right: 12,
        top: 12,
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
    userSummaryPoints: {
        fontSize: 14,
        color: COLORS.primary,
        fontWeight: '600',
        marginBottom: 2,
    },
    userSummaryMembership: {
        fontSize: 12,
        color: COLORS.textLight,
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
    buttonRow: {
        flexDirection: "row",
        gap: 8,
        marginTop: 16,
    },
    btn: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
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
    },
    modalContent: {
        backgroundColor: COLORS.cardBg,
        borderRadius: 12,
        padding: 24,
        margin: 20,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: COLORS.border,
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
    searchResultsRTL: {
        // Search results RTL adjustments if needed
    },

    modalContentRTL: {
        // Modal RTL adjustments if needed
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
