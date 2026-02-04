import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { cashbackApi } from '../../src/services/api';
import Toast from '../../src/components/Toast';

const COLORS = {
    primary: '#0891b2',
    background: '#f8fafc',
    white: '#ffffff',
    text: '#1e293b',
    textLight: '#64748b',
    success: '#10b981',
    error: '#ef4444',
    border: '#e2e8f0',
};

export default function AdminWithdrawalsScreen() {

    const { isRTL } = useLanguage();
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [requests, setRequests] = useState<any[]>([]); // Pending
    const [historyRequests, setHistoryRequests] = useState<any[]>([]); // Approved/Rejected
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    // Confirmation Modal State
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [selectedAction, setSelectedAction] = useState<{ type: 'approve' | 'reject', id: string, amount: number } | null>(null);

    // Toast State
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            const [pendingData, historyData] = await Promise.all([
                cashbackApi.getWithdrawalRequests({ status: 'PENDING' }),
                cashbackApi.getWithdrawalRequests({ status: 'PROCESSED', limit: 20 }) // Fetch processed history
            ]);
            setRequests(pendingData);
            setHistoryRequests(historyData);
        } catch (error) {
            console.error('Failed to load requests', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const confirmAction = (type: 'approve' | 'reject', id: string, amount: number) => {
        setSelectedAction({ type, id, amount });
        setShowConfirmModal(true);
    };

    const executeAction = async () => {
        if (!selectedAction) return;

        const { type, id } = selectedAction;
        setActionLoading(id);
        setShowConfirmModal(false);

        try {
            if (type === 'approve') {
                await cashbackApi.approveWithdrawal(id);
                setToast({ visible: true, message: t('admin.withdrawals.approveSuccess'), type: 'success' });
            } else {
                await cashbackApi.rejectWithdrawal(id, "Admin Rejected");
                setToast({ visible: true, message: t('admin.withdrawals.rejectSuccess'), type: 'success' });
            }
            loadRequests();
        } catch (error: any) {
            setToast({ visible: true, message: error.message || t('common.error'), type: 'error' });
        } finally {
            setActionLoading(null);
            setSelectedAction(null);
        }
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.card}>
            <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL]}>
                <View>
                    <Text style={[styles.userName, isRTL && styles.textRTL]}>{item.user_name}</Text>
                    <Text style={[styles.date, isRTL && styles.textRTL]}>
                        {new Date(item.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')} {new Date(item.created_at).toLocaleTimeString(isRTL ? 'ar-EG' : 'en-US')}
                    </Text>
                </View>
                <Text style={styles.amount}>{item.amount} {t('common.currency.usd')}</Text>
            </View>

            <View style={[styles.actions, isRTL && styles.actionsRTL]}>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => confirmAction('reject', item.id, item.amount)}
                    disabled={!!actionLoading}
                >
                    <Text style={[styles.actionText, styles.rejectText]}>{t('admin.withdrawals.reject')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => confirmAction('approve', item.id, item.amount)}
                    disabled={!!actionLoading}
                >
                    {actionLoading === item.id ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={[styles.actionText, styles.approveText]}>{t('admin.withdrawals.approve')}</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={[styles.header, isRTL && styles.headerRTL]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('admin.withdrawals.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadRequests(); }} />
                    }
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    {/* Pending Requests */}
                    <Text style={[styles.sectionHeader, isRTL && styles.textRTL, { marginTop: 16, marginHorizontal: 16 }]}>
                        {t('admin.withdrawals.pendingRequests', 'Pending Requests')}
                    </Text>

                    {requests.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Ionicons name="documents-outline" size={48} color={COLORS.textLight} />
                            <Text style={styles.emptyText}>{t('admin.withdrawals.empty')}</Text>
                        </View>
                    ) : (
                        <View style={styles.list}>
                            {requests.map(item => (
                                <View key={item.id}>
                                    {renderItem({ item })}
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Recently Activity Section */}
                    {!loading && (
                        <View style={styles.historySection}>
                            <Text style={[styles.sectionHeader, isRTL && styles.textRTL]}>{t('admin.withdrawals.recentActivity', 'Recent Activity')}</Text>
                            {historyRequests.length > 0 ? (
                                historyRequests.map(item => (
                                    <View key={item.id} style={styles.historyCard}>
                                        <View style={[styles.cardHeader, isRTL && styles.cardHeaderRTL, { marginBottom: 8 }]}>
                                            <View>
                                                <Text style={[styles.userName, styles.processedUser, isRTL && styles.textRTL]}>{item.user_name}</Text>
                                                <Text style={[styles.date, isRTL && styles.textRTL]}>
                                                    {t('admin.withdrawals.processedAt')}: {new Date(item.updated_at || item.created_at).toLocaleDateString()}
                                                </Text>
                                            </View>
                                            <View style={{ alignItems: 'flex-end' }}>
                                                <Text style={[styles.amount, { fontSize: 16 }]}>{item.amount} {t('common.currency.usd')}</Text>
                                                <View style={[styles.statusBadge, item.status === 'APPROVED' ? styles.statusApproved : styles.statusRejected]}>
                                                    <Text style={styles.statusText}>
                                                        {item.status === 'APPROVED' ? t('admin.withdrawals.approved') : t('admin.withdrawals.rejected')}
                                                    </Text>
                                                </View>
                                            </View>
                                        </View>
                                        {item.admin_notes && (
                                            <Text style={[styles.reasonText, isRTL && styles.textRTL]}>
                                                {t('common.reason')}: {item.admin_notes}
                                            </Text>
                                        )}
                                    </View>
                                ))
                            ) : (
                                <Text style={[styles.emptyHistory, isRTL && styles.textRTL]}>{t('admin.withdrawals.noHistory')}</Text>
                            )}
                            <View style={{ height: 40 }} />
                        </View>
                    )}
                </ScrollView>
            )
            }

            {/* Confirmation Modal */}
            {
                showConfirmModal && selectedAction && (
                    <View style={styles.modalOverlay}>
                        <View style={[styles.modalContent, isRTL && styles.modalContentRTL]}>
                            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
                                {selectedAction.type === 'approve' ? t('admin.withdrawals.approveConfirmTitle') : t('admin.withdrawals.rejectConfirmTitle')}
                            </Text>
                            <Text style={[styles.modalMessage, isRTL && styles.textRTL]}>
                                {selectedAction.type === 'approve'
                                    ? t('admin.withdrawals.approveConfirmMessage', { amount: selectedAction.amount })
                                    : t('admin.withdrawals.rejectConfirmMessage')
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
                                    style={[
                                        styles.modalBtn,
                                        selectedAction.type === 'approve' ? styles.modalBtnConfirm : styles.modalBtnRemove
                                    ]}
                                    onPress={executeAction}
                                >
                                    <Text style={styles.modalBtnText}>
                                        {selectedAction.type === 'approve' ? t('admin.withdrawals.approve') : t('admin.withdrawals.reject')}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )
            }

            {/* Toast Notification */}
            <Toast
                visible={toast.visible}
                message={toast.message}
                type={toast.type}
                onHide={() => setToast({ ...toast, visible: false })}
            />
        </View >
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
        paddingBottom: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    headerRTL: {
        flexDirection: 'row-reverse',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    list: {
        padding: 16,
    },
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    cardHeaderRTL: {
        flexDirection: 'row-reverse',
    },
    userName: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
        marginBottom: 4,
        textAlign: 'left',
    },
    textRTL: {
        textAlign: 'right',
    },
    date: {
        fontSize: 12,
        color: COLORS.textLight,
        textAlign: 'left',
    },
    amount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionsRTL: {
        flexDirection: 'row-reverse',
    },
    actionBtn: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    rejectBtn: {
        borderColor: COLORS.error,
        backgroundColor: '#fff',
    },
    approveBtn: {
        borderColor: COLORS.success,
        backgroundColor: COLORS.success,
    },
    actionText: {
        fontWeight: '600',
        fontSize: 14,
    },
    rejectText: {
        color: COLORS.error,
    },
    approveText: {
        color: '#fff',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
    },
    emptyText: {
        marginTop: 12,
        color: COLORS.textLight,
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
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    modalContentRTL: {
        direction: 'rtl',
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
        color: COLORS.textLight,
        marginBottom: 24,
        textAlign: 'center',
        lineHeight: 20,
    },
    modalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    modalButtonsRTL: {
        flexDirection: 'row-reverse',
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
    historySection: {
        paddingHorizontal: 16,
        marginTop: 24,
        borderTopWidth: 8,
        borderTopColor: '#f1f5f9',
        paddingTop: 16,
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    historyCard: {
        backgroundColor: COLORS.white,
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    processedUser: {
        fontSize: 15,
        marginBottom: 2,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 4,
    },
    statusApproved: {
        backgroundColor: '#ecfdf5',
    },
    statusRejected: {
        backgroundColor: '#fff1f2',
    },
    statusText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    reasonText: {
        fontSize: 12,
        color: COLORS.textLight,
        marginTop: 8,
        fontStyle: 'italic',
    },
    emptyHistory: {
        textAlign: 'center',
        padding: 20,
        color: COLORS.textLight,
        fontStyle: 'italic',
    },
});
