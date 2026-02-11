import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { cashbackApi, walletApi } from "../../src/services/api";

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
};

export default function ClubGiftsScreen() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [total, setTotal] = useState(0);
  const [available, setAvailable] = useState(0);
  const [records, setRecords] = useState<any[]>([]);
  const [withdrawing, setWithdrawing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [balanceRes, recordsRes] = await Promise.allSettled([
        cashbackApi.getBalance(),
        cashbackApi.getRecords(),
      ]);

      if (balanceRes.status === 'fulfilled') {
        setTotal((balanceRes.value as any)?.total || 0);
        setAvailable((balanceRes.value as any)?.available || 0);
      }
      if (recordsRes.status === 'fulfilled') {
        setRecords((recordsRes.value as any) || []);
      }
    } catch (error) {
      console.log('Error loading cashback:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const initWithdrawal = () => {
    if (Number(available) <= 0) {
      Alert.alert(t('common.error'), t('cashback.insufficientBalance'));
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmWithdrawal = async () => {
    setShowConfirmModal(false);
    try {
      setWithdrawing(true);
      const result = await cashbackApi.withdrawToWallet(Number(available));
      Alert.alert(t('common.success'), t('cashback.requestSuccess', 'Withdrawal request sent successfully'));
      await loadData();
    } catch (error: any) {
      Alert.alert(t('common.error'), error.message || t('cashback.requestError', 'Error occurred'));
    } finally {
      setWithdrawing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('profile.myCashback')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Cashback Card */}
        <View style={styles.cashbackCard}>
          <View style={[styles.cardRow, isRTL && styles.cardRowRTL]}>
            <View style={styles.cardItem}>
              <Text style={[styles.cardLabel, isRTL && styles.textRTL]}>
                {t('cashback.totalCashback')}
              </Text>
              <Text style={styles.cardAmount}>
                {total.toLocaleString()} {t('wallet.currency')}
              </Text>
            </View>
            <View style={styles.cardDivider} />
            <View style={styles.cardItem}>
              <Text style={[styles.cardLabel, isRTL && styles.textRTL]}>
                {t('cashback.available')}
              </Text>
              <Text style={[styles.cardAmount, { color: COLORS.success }]}>
                {available.toLocaleString()} {t('wallet.currency')}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.withdrawBtn, withdrawing && styles.withdrawBtnDisabled]}
            onPress={initWithdrawal}
            activeOpacity={0.7}
            disabled={withdrawing}
          >
            <View>
              {withdrawing ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.withdrawBtnText}>
                  {t('cashback.requestWithdraw', 'Request Withdrawal to Wallet')}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        </View>

        {/* Records */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t('cashback.history')}
          </Text>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
          ) : records.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="gift-outline" size={48} color={COLORS.lightGray} />
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t('cashback.noRecords')}
              </Text>
            </View>
          ) : (
            records.map((record, index) => {
              const isNegative = record.amount < 0;
              const formattedAmount = Math.abs(record.amount).toLocaleString();

              let description = record.description;
              if (record.reference_type === 'CLUB_GIFT_WITHDRAWAL_REQUEST') {
                description = t('cashback.withdrawalRequest', 'Withdrawal Request');
              } else if (record.reference_type === 'ADMIN_BONUS') {
                description = t('cashback.adminBonus', 'Admin Bonus');
              } else if (!description) {
                description = t('cashback.bookingCashback');
              }

              return (
                <View key={index} style={[styles.recordItem, isRTL && styles.recordItemRTL]}>
                  <View style={[styles.recordIcon, isNegative && { backgroundColor: '#fee2e2' }]}>
                    <Ionicons
                      name={isNegative ? "arrow-up-outline" : "gift"}
                      size={20}
                      color={isNegative ? "#ef4444" : COLORS.success}
                    />
                  </View>
                  <View style={[styles.recordInfo, isRTL && styles.recordInfoRTL]}>
                    <Text style={[styles.recordDesc, isRTL && styles.textRTL]}>
                      {description}
                    </Text>
                    <Text style={[styles.recordDate, isRTL && styles.textRTL]}>
                      {new Date(record.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                    </Text>
                  </View>
                  <Text style={[styles.recordAmount, isNegative && { color: '#ef4444' }]}>
                    {isNegative ? '-' : '+'}{formattedAmount} {t('wallet.currency')}
                  </Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalIcon}>
              <Ionicons name="wallet-outline" size={40} color={COLORS.primary} />
            </View>
            <Text style={styles.modalTitle}>
              {t('cashback.requestWithdrawConfirmTitle', 'Request Withdrawal')}
            </Text>
            <Text style={styles.modalMessage}>
              {t('cashback.requestWithdrawConfirmMessage', 'Are you sure you want to withdraw {{amount}} to your wallet?', { amount: Number(available).toFixed(2) })}
            </Text>

            <View style={[styles.modalButtons, isRTL && styles.modalButtonsRTL]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalBtnTextCancel}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.modalBtnConfirm]}
                onPress={confirmWithdrawal}
              >
                <Text style={styles.modalBtnTextConfirm}>{t('cashback.request', 'Confirm')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    flexDirection: "row-reverse",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  cashbackCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
  },
  cardRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardRowRTL: {
    flexDirection: "row-reverse",
  },
  cardItem: {
    flex: 1,
    alignItems: "center",
  },
  cardDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.lightGray,
  },
  cardLabel: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  cardAmount: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginTop: 4,
  },
  textRTL: {
    textAlign: "right",
  },
  withdrawBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 20,
  },
  withdrawBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
  },
  withdrawBtnDisabled: {
    opacity: 0.5,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
  },
  recordItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  recordItemRTL: {
    flexDirection: "row-reverse",
  },
  recordIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#dcfce7",
    alignItems: "center",
    justifyContent: "center",
  },
  recordInfo: {
    flex: 1,
    marginStart: 12,
  },
  recordInfoRTL: {
    marginStart: 0,
    marginEnd: 12,
    alignItems: "flex-end",
  },
  recordDesc: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  recordDate: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  recordAmount: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.success,
  },
  // Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '85%',
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 14,
    color: COLORS.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  modalButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBtnCancel: {
    backgroundColor: COLORS.lightGray,
  },
  modalBtnConfirm: {
    backgroundColor: COLORS.primary,
  },
  modalBtnTextCancel: {
    color: COLORS.text,
    fontWeight: '600',
  },
  modalBtnTextConfirm: {
    color: COLORS.white,
    fontWeight: '600',
  },
});
