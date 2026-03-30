import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";
import { useRouter } from "expo-router";

const COLORS = {
  primary: "#1071b8",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  background: "#f1f5f9",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
};

export default function AdminPayments() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [totalPaid, setTotalPaid] = useState(0);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'PAID' | 'PENDING' | 'UNPAID'>('ALL');

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllPayments();
      // adminApi.getAllPayments returns { total: ..., items: [...] }
      const items = res.items || [];
      setPayments(items);

      // Calculate total paid from fetched items (or use a backend stat if available)
      const total = items
        .filter((p: any) => p.status === 'PAID' || p.status === 'COMPLETED')
        .reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0);
      setTotalPaid(total);

    } catch (e) {
      console.log("Error fetching payments", e);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredPayments = () => {
    if (activeFilter === 'ALL') return payments;
    if (activeFilter === 'PAID') return payments.filter(p => p.status === 'PAID' || p.status === 'COMPLETED');
    if (activeFilter === 'PENDING') return payments.filter(p => p.status === 'PENDING');
    if (activeFilter === 'UNPAID') return payments.filter(p => p.status === 'UNPAID');
    return payments;
  };

  const filteredPayments = getFilteredPayments();

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, isRTL && styles.headerTitleRTL]}>{t('admin.managePayments.title')}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.headerSubtitleRTL]}>{t('admin.managePayments.subtitle')}</Text>
      </View>

      {/* Stats */}
      <View style={[styles.statsRow]}>
        <View style={[styles.statCard, { backgroundColor: `${COLORS.success}15` }]}>
          <View style={styles.statCardContent}>
            <Ionicons name="checkmark-circle" size={28} color={COLORS.success} />
            <View style={[styles.statTextContainer, isRTL && styles.statTextContainerRTL]}>
              <Text style={[styles.statValue, isRTL && styles.textRTL]}>{totalPaid.toLocaleString()}</Text>
              <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t('admin.managePayments.totalPaid')}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.statCard, { backgroundColor: `${COLORS.warning}15` }]}>
          <View style={styles.statCardContent}>
            <Ionicons name="time" size={28} color={COLORS.warning} />
            <View style={[styles.statTextContainer, isRTL && styles.statTextContainerRTL]}>
              <Text style={[styles.statValue, isRTL && styles.textRTL]}>
                {payments.filter(p => p.status === 'PENDING' || p.status === 'UNPAID').length}
              </Text>
              <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{t('admin.managePayments.pendingTxns')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Recent Payments */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>{t('admin.managePayments.recent')}</Text>
          </View>
          <TouchableOpacity
            style={[styles.filterBtn, activeFilter !== 'ALL' && { backgroundColor: COLORS.primary + '20' }]}
            onPress={() => setFilterVisible(true)}
          >
            <Ionicons name="filter" size={18} color={COLORS.primary} />
            <Text style={[styles.filterText, isRTL && styles.filterTextRTL]}>
              {activeFilter === 'ALL' ? t('common.header.filter') : t(`admin.managePayments.status.${activeFilter.toLowerCase()}`)}
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="small" style={{ marginVertical: 20 }} />
        ) : filteredPayments.length === 0 ? (
          <Text style={[{ textAlign: 'center', color: COLORS.textLight, padding: 20 }, isRTL && styles.textRTL]}>{t('admin.managePayments.empty')}</Text>
        ) : (
          filteredPayments.map((payment, index) => (
            <PaymentRow
              key={index}
              user={payment.user ? `${payment.user.first_name} ${payment.user.last_name}` : (payment.user_id ? `${t('common.user')} ${payment.user_id.substring(0, 5)}` : t('common.unknown'))}
              amount={payment.amount}
              currency={payment.currency}
              status={payment.status}
              method={payment.payment_method || t('admin.managePayments.method')}
              time={new Date(payment.created_at).toLocaleDateString(isRTL ? 'ar-EG' : 'en-US')}
              isRTL={isRTL}
              onPress={() => {
                // Navigate to payment details page
                router.push(`/(admin)/payments/${payment.id}` as any);
              }}
            />
          ))
        )}
      </View>

      {/* Filter Modal */}
      <Modal
        visible={filterVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFilterVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setFilterVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('common.header.filter')}</Text>

            {['ALL', 'PAID', 'PENDING', 'UNPAID'].map((status) => (
              <TouchableOpacity
                key={status}
                style={[styles.modalOption]}
                onPress={() => {
                  setActiveFilter(status as any);
                  setFilterVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  activeFilter === status && styles.selectedOptionText,
                  isRTL && styles.textRTL
                ]}>
                  {status === 'ALL' ? t('common.all') : t(`admin.managePayments.status.${status.toLowerCase()}`)}
                </Text>
                {activeFilter === status && (
                  <Ionicons name="checkmark" size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

function PaymentRow({ user, amount, currency, status, method, time, isRTL, onPress }: any) {
  const { t } = useTranslation();
  const statusColors: any = {
    PAID: COLORS.success,
    COMPLETED: COLORS.success,
    PENDING: COLORS.warning,
    FAILED: COLORS.error,
    EXPIRED: COLORS.textLight,
  };

  const statusLabels: any = {
    PAID: t('admin.managePayments.status.paid'),
    COMPLETED: t('admin.managePayments.status.completed'),
    PENDING: t('admin.managePayments.status.pending'),
    FAILED: t('admin.managePayments.status.failed'),
    EXPIRED: t('admin.managePayments.status.expired'),
  };

  const color = statusColors[status] || COLORS.textLight;

  return (
    <TouchableOpacity style={[styles.paymentRow]} onPress={onPress}>
      <View style={[styles.paymentInfo, isRTL && styles.paymentInfoRTL]}>
        <Text style={[styles.paymentUser, isRTL && styles.textRTL]}>{user}</Text>
        <Text style={[styles.paymentMeta, isRTL && styles.textRTL]}>{method} • {time}</Text>
      </View>
      <View style={[styles.paymentRight, isRTL && styles.paymentRightRTL]}>
        <Text style={[styles.paymentAmount, isRTL ? styles.paymentAmountRTL : undefined]}>
          {amount} {formatCurrencyLabel(currency, t)}
        </Text>
        <View style={[styles.statusBadge, { backgroundColor: `${color}15` }]}>
          <Text style={[styles.statusText, { color: color }]}>{statusLabels[status] || status}</Text>
        </View>
      </View>
    </TouchableOpacity>
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
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
    marginBottom: 4,
  },
  headerTitleRTL: {
    textAlign: "right",
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  headerSubtitleRTL: {
    textAlign: "right",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: 'wrap',
    marginBottom: 16,
    gap: 8,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 4,
  },
  statCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  statTextContainer: {
    marginStart: 12,
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
  },
  statTextContainerRTL: {
    marginStart: 0,
    marginEnd: 12,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  cardTitleWrap: {
    flex: 1,
    marginEnd: 8,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
  },
  cardTitleRTL: {
    textAlign: "right",
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterText: {
    fontSize: 13,
    color: COLORS.primary,
    marginStart: 4,
    textAlign: 'auto',
  },
  filterTextRTL: {
    marginStart: 0,
    marginEnd: 4,
    textAlign: 'right',
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  paymentInfo: {
    flex: 1,
    minWidth: 0,
    marginEnd: 12,
  },
  paymentUser: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    alignSelf: "stretch",
  },
  paymentMeta: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    alignSelf: "stretch",
  },
  paymentRight: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    maxWidth: 140,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  // RTL Styles

  paymentInfoRTL: {
    alignItems: 'flex-start',
    marginEnd: 0,
    marginStart: 12,
  },
  paymentRightRTL: {
    alignItems: 'flex-start',
  },
  paymentAmountRTL: {
    textAlign: 'left',
  },
  textRTL: {
    textAlign: 'right',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '80%',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: COLORS.text,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalOptionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'auto',
    flex: 1,
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});
