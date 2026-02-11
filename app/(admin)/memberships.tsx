import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert, Modal, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";

const COLORS = {
  primary: "#1071b8",
  background: "#f8fafc",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  badgeBg: "#ecfdf5",
  badgeText: "#059669",
};

export default function AdminMemberships() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [planToDelete, setPlanToDelete] = useState<any>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const isInitialMount = useRef(true);

  // Stats calculated from plans
  const [stats, setStats] = useState({
    totalMembers: 0,
    activePlans: 0,
    totalRevenue: 0,
    expiringSoon: 0,
    monthlyGrowth: 0,
    topPlan: null as any,
    recentActivity: [] as any[]
  });

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  // Load data on initial mount
  useEffect(() => {
    fetchPlans();
    fetchStats();
    isInitialMount.current = false;
  }, []);

  // Refresh data when screen comes into focus (e.g., after returning from edit page)
  // But skip the initial mount to avoid double loading
  useFocusEffect(
    useCallback(() => {
      // Skip refresh on initial mount (useEffect already handles that)
      if (isInitialMount.current) {
        return;
      }
      // Refresh when screen comes back into focus
      fetchPlans();
      fetchStats();
    }, [])
  );

  const fetchStats = async () => {
    try {
      // Check if getMembershipStats exists (it was added recently)
      if (adminApi.getMembershipStats) {
        const data = await adminApi.getMembershipStats();
        setStats({
          totalMembers: data.total_members || 0,
          activePlans: data.active_plans || 0,
          totalRevenue: data.total_revenue || 0,
          expiringSoon: data.expiring_soon || 0,
          monthlyGrowth: data.monthly_growth || 0,
          topPlan: data.top_plan || null,
          recentActivity: data.recent_activity || []
        });
      }
    } catch (e) {
      console.log("Error fetching stats", e);
    }
  };



  const fetchPlans = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllMemberships();
      console.log("Fetched plans:", res);
      if (res && res.length > 0) {
        console.log("First plan:", res[0]);
        console.log("First plan ID:", res[0].id);
      }
      const sortedPlans = (res || []).sort((a: any, b: any) => {
        const priceA = parseFloat(a.price) || 0;
        const priceB = parseFloat(b.price) || 0;
        return priceA - priceB;
      });
      setPlans(sortedPlans);
    } catch (e) {
      console.log("Error fetching plans", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = (plan: any) => {
    setPlanToDelete(plan);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!planToDelete) return;

    try {
      // Try to delete the plan
      await adminApi.deleteMembershipPlan(planToDelete.id);
      setDeleteModalVisible(false);
      setPlanToDelete(null);
      // Refresh both plans and stats
      await Promise.all([fetchPlans(), fetchStats()]);
      setToast({ visible: true, message: t('manageMemberships.deleteSuccess'), type: 'success' });
    } catch (e: any) {
      const errorMessage = e.response?.data?.detail || e.message || t('manageMemberships.errorDelete');

      // If deletion fails due to subscriptions, offer to deactivate instead
      if (errorMessage.includes("subscription") || errorMessage.includes("Cannot delete")) {
        Alert.alert(
          t('manageMemberships.cannotDelete'),
          t('manageMemberships.cannotDeleteMsg', { count: 0 }) + "\n\n" + t('manageMemberships.deactivateInstead'),
          [
            { text: t('common.cancel'), style: "cancel" },
            {
              text: t('manageMemberships.deactivate'),
              onPress: async () => {
                try {
                  await adminApi.updateMembershipPlan(planToDelete.id, { is_active: false });
                  setDeleteModalVisible(false);
                  setPlanToDelete(null);
                  // Refresh both plans and stats
                  await Promise.all([fetchPlans(), fetchStats()]);
                  setToast({ visible: true, message: t('manageMemberships.deactivateSuccess'), type: 'success' });
                } catch (deactivateError: any) {
                  setToast({ visible: true, message: t('common.error') + ": " + (deactivateError.message || "Unknown error"), type: 'error' });
                }
              }
            }
          ]
        );
      } else {
        setToast({ visible: true, message: errorMessage, type: 'error' });
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t('manageMemberships.title')}</Text>
        <View style={[styles.headerActions, isRTL && styles.headerActionsRTL]}>

          <TouchableOpacity
            style={[styles.addBtn, isRTL && styles.addBtnRTL]}
            onPress={() => router.push('/(admin)/memberships/create')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>{t('manageMemberships.create')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics Matrix (2x2 Grid) */}
      <View style={[styles.statsGrid, isRTL && styles.statsGridRTL]}>
        <View style={styles.statsColumn}>
          <StatsCard
            title={t('manageMemberships.totalMembers')}
            value={(stats.totalMembers || 0).toString()}
            icon="people"
            color="#3b82f6"
            isRTL={isRTL}
          />
          <StatsCard
            title={t('manageMemberships.estRevenue')}
            value={`$${(stats.totalRevenue || 0).toLocaleString()}`}
            icon="cash"
            color="#10b981"
            isRTL={isRTL}
          />
        </View>
        <View style={styles.statsColumn}>
          <StatsCard
            title={t('manageMemberships.activePlans')}
            value={(stats.activePlans || 0).toString()}
            icon="layers"
            color="#8b5cf6"
            isRTL={isRTL}
          />
          <StatsCard
            title={t('manageMemberships.expiringSoon')}
            value={(stats.expiringSoon || 0).toString()}
            icon="alert-circle"
            color="#f59e0b"
            isRTL={isRTL}
          />
        </View>
      </View>

      {/* Revenue & Growth Insights Section */}
      <View style={[styles.insightsContainer, isRTL && styles.rowRTL]}>
        <View style={styles.insightCard}>
          <View style={[styles.insightHeader, isRTL && styles.rowRTL]}>
            <View style={styles.insightIconCircle}>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
            </View>
            <Text style={[styles.insightTitle, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.monthlyGrowth')}</Text>
          </View>
          <Text style={[styles.insightValue, isRTL && styles.textRTL]}>
            {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}%
          </Text>
          <Text style={[styles.insightSubtext, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.vsLastMonth')}</Text>
        </View>

        <View style={styles.insightCard}>
          <View style={[styles.insightHeader, isRTL && styles.rowRTL]}>
            <View style={[styles.insightIconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
            </View>
            <Text style={[styles.insightTitle, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.topPlan')}</Text>
          </View>
          <Text style={[styles.insightValue, isRTL && styles.textRTL]}>
            {isRTL ? stats.topPlan?.name_ar || '-' : stats.topPlan?.name_en || '-'}
          </Text>
          <Text style={[styles.insightSubtext, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.mostPopular')}</Text>
        </View>
      </View>

      {/* Recent Activity Feed */}
      <View style={styles.activityCard}>
        <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
          <Text style={[styles.cardTitle, isRTL && { textAlign: 'right' }]}>{t('manageMemberships.recentActivity')}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/memberships/subscriptions')}>
            <Text style={styles.viewAll}>{t('common.viewAll', 'View All')}</Text>
          </TouchableOpacity>
        </View>

        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          stats.recentActivity.map((activity, idx) => (
            <View key={activity.id} style={[styles.activityItem, isRTL && { flexDirection: 'row-reverse' }, idx === stats.recentActivity.length - 1 && { borderBottomWidth: 0 }]}>
              <View style={styles.activityIcon}>
                <Ionicons name="person-outline" size={14} color={COLORS.textLight} />
              </View>
              <View style={[styles.activityContent, isRTL && styles.alignEnd]}>
                <Text style={[styles.activityText, isRTL && { textAlign: 'right', writingDirection: 'rtl' }]}>
                  <Text style={styles.boldText}>{activity.user}</Text> {isRTL ? activity.action_ar : activity.action_en} <Text style={[styles.boldText, { color: COLORS.primary }]}>{isRTL ? activity.plan_ar : activity.plan_en}</Text>
                </Text>
                <Text style={styles.activityDate}>{activity.date}</Text>
              </View>
            </View>
          ))
        ) : (
          <Text style={[styles.emptyText, { padding: 16 }]}>{t('common.noData', 'No recent activity')}</Text>
        )}
      </View>

      {/* Data Table */}
      <View style={[styles.tableCard, { marginTop: 16, position: 'relative' }]}>
        {/* Table Header */}
        <View style={[styles.tableHeader, isRTL && styles.tableHeaderRTL]}>
          <Text style={[styles.th, { flex: 0.8 }, isRTL && styles.textRTL]}>{t('manageMemberships.table.id')}</Text>
          <Text style={[styles.th, { flex: 2 }, isRTL && styles.textRTL]}>{t('manageMemberships.table.name')}</Text>
          <Text style={[styles.th, { flex: 2 }, isRTL && styles.textRTL]}>{t('manageMemberships.table.details')}</Text>
          <Text style={[styles.th, { flex: 1, textAlign: 'center' }, isRTL && styles.textRTL]}>{t('manageMemberships.table.members')}</Text>
          <Text style={[styles.th, { flex: 0.5 }, isRTL && styles.textRTL]}>{t('manageMemberships.table.action')}</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 40 }} />
        ) : plans.length === 0 ? (
          <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('manageMemberships.empty')}</Text>
        ) : (
          plans.map((plan, index) => (
            <MembershipRow
              key={plan.id}
              plan={plan}
              index={index + 1}
              onRefresh={fetchPlans}
              onDelete={handleDeleteRequest}
              openMenuId={openMenuId}
              setOpenMenuId={setOpenMenuId}
              showMenu={openMenuId === plan.id}
            />
          ))
        )}

        {/* Render dropdowns at table level */}
        {plans.map((plan) => (
          openMenuId === plan.id && (
            <MembershipDropdown
              key={`dropdown-${plan.id}`}
              plan={plan}
              onEdit={() => {
                setOpenMenuId(null);
                router.push(`/(admin)/memberships/${plan.id}/edit`);
              }}
              onViewMembers={() => {
                setOpenMenuId(null);
                router.push(`/(admin)/memberships/${plan.id}/members`);
              }}
              onDelete={() => {
                setOpenMenuId(null);
                handleDeleteRequest(plan);
              }}
              onClose={() => setOpenMenuId(null)}
            />
          )
        ))}
      </View>

      {/* Delete Confirmation Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={deleteModalVisible}
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="warning" size={48} color={COLORS.error} />
              <Text style={styles.modalTitle}>{t('manageMemberships.deleteConfirmTitle')}</Text>
            </View>

            <Text style={styles.modalMessage}>
              {t('manageMemberships.deleteConfirmWithName', { name: isRTL ? planToDelete?.tier_name_ar : planToDelete?.tier_name_en })}
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.deleteBtn]}
                onPress={confirmDelete}
              >
                <Text style={styles.deleteBtnText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

function StatsCard({ title, value, icon, color, isRTL }: any) {
  return (
    <View style={[styles.statCard, isRTL && styles.statCardRTL]}>
      <View style={[styles.iconBox, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={[styles.statContent, isRTL && styles.statContentRTL]}>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statTitle} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function MembershipRow({ plan, index, onRefresh, onDelete, openMenuId, setOpenMenuId, showMenu }: any) {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const isPaid = plan.price > 0 || plan.plan_type !== 'FREE';

  const toggleMenu = () => {
    setOpenMenuId(showMenu ? null : plan.id);
  };

  return (
    <View style={[styles.tr, isRTL && styles.trRTL]}>
      <Text style={[styles.td, { flex: 0.8, color: COLORS.textLight }, isRTL && styles.textRTL]}>{index}</Text>

      <View style={[{ flex: 2 }, isRTL && { alignItems: 'flex-end' }]}>
        <Text style={[styles.planName, isRTL && styles.textRTL]}>{isRTL ? (plan.tier_name_ar || plan.tier_name_en) : plan.tier_name_en}</Text>
        <Text style={[styles.planCode, isRTL && styles.textRTL]}>{plan.tier_code}</Text>
      </View>

      <View style={[{ flex: 2 }, isRTL && { alignItems: 'flex-end' }]}>
        <View style={[styles.badge, isPaid ? styles.paidBadge : styles.freeBadge]}>
          <Text style={[styles.badgeText, isPaid ? styles.paidText : styles.freeText]}>
            {isPaid ? t('manageMemberships.paid', 'Paid') : t('manageMemberships.free', 'Free')}
          </Text>
        </View>
        <Text style={[styles.planPrice, isRTL && styles.textRTL]}>
          {isPaid ? `$${plan.price.toLocaleString()} ${plan.currency} ` : t('manageMemberships.free', 'Free') + ' '}
          <Text style={styles.planDuration}>
            {plan.plan_type === 'PAID_INFINITE' ? t('manageMemberships.lifetime', 'For Lifetime') : t('manageMemberships.perDays', { days: plan.duration_days })}
          </Text>
        </Text>
      </View>

      <Text style={[styles.td, { flex: 1, textAlign: 'center', fontWeight: 'bold' }]}>
        {plan.members_count || 0}
      </Text>

      <View style={{ flex: 0.5, alignItems: 'center', justifyContent: 'center' }}>
        <TouchableOpacity
          onPress={toggleMenu}
          activeOpacity={0.6}
        >
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MembershipDropdown({ plan, onEdit, onViewMembers, onDelete, onClose }: any) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <View style={[styles.actionMenu, { position: 'absolute', top: 80, right: isRTL ? undefined : 20, left: isRTL ? 20 : undefined, zIndex: 9999, elevation: 15 }]}>
      <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]} onPress={onEdit}>
        <Ionicons name="create-outline" size={18} color={COLORS.primary} />
        <Text style={styles.menuText}>{t('common.edit', 'Edit')}</Text>
      </TouchableOpacity>
      <View style={styles.menuDivider} />
      <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]} onPress={onViewMembers}>
        <Ionicons name="eye-outline" size={18} color={COLORS.primary} />
        <Text style={styles.menuText}>{t('manageMemberships.viewMembers', 'View Members')}</Text>
      </TouchableOpacity>
      <View style={styles.menuDivider} />
      <TouchableOpacity style={[styles.menuItem, isRTL && styles.menuItemRTL]} onPress={onDelete}>
        <Ionicons name="trash-outline" size={18} color={COLORS.error} />
        <Text style={[styles.menuText, { color: COLORS.error }]}>{t('common.delete', 'Delete')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerActionsRTL: {
    flexDirection: 'row-reverse',
  },
  pageTitle: {
    fontSize: 20, // Reduced from 24
    fontWeight: "bold",
    color: COLORS.text,
  },

  addBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  addBtnRTL: {
    flexDirection: 'row-reverse',
  },
  addBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginStart: 8,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statsColumn: {
    flex: 1,
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginEnd: 12,
  },
  statContent: {
    flex: 1,
  },

  statContentRTL: {
    alignItems: 'flex-end',
    marginEnd: 12,
    marginStart: 0,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
  },
  statTitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
  },
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: '#f8fafc',
    borderTopStartRadius: 12,
    borderTopEndRadius: 12,
  },
  th: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textTransform: 'uppercase',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
  },
  trRTL: {
    flexDirection: 'row-reverse',
  },
  td: {
    fontSize: 14,
    color: COLORS.text,
  },
  planName: {
    fontWeight: '600',
    color: COLORS.primary,
    textDecorationLine: 'underline',
  },
  planCode: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  paidBadge: { backgroundColor: '#ecfdf5' },
  freeBadge: { backgroundColor: '#f1f5f9' },
  badgeText: { fontSize: 10, fontWeight: '600' },
  paidText: { color: '#059669' },
  freeText: { color: '#64748b' },
  planPrice: {
    fontSize: 13,
    fontWeight: '500',
    color: COLORS.text,
  },
  planDuration: {
    color: COLORS.textLight,
    fontWeight: '400',
  },
  emptyText: {
    textAlign: 'center',
    padding: 32,
    color: COLORS.textLight,
  },
  // New Styles
  row: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  viewAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: '500',
  },
  memberItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  memberPlan: {
    fontSize: 12,
    marginStart: 4,
  },
  memberExp: {
    fontSize: 11,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  // Action Menu Dropdown Styles
  actionMenu: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minWidth: 140,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuItemRTL: {
    flexDirection: 'row-reverse',
  },
  menuText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  menuDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.text,
    marginTop: 12,
  },
  modalMessage: {
    fontSize: 15,
    color: COLORS.textLight,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
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
  cancelBtn: {
    backgroundColor: COLORS.border,
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  deleteBtn: {
    backgroundColor: COLORS.error,
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  textRTL: {
    textAlign: 'right',
  },

  statsGridRTL: {
    flexDirection: 'row-reverse',
  },
  tableHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  statCardRTL: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  insightsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    flex: 1,
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(226, 232, 240, 0.6)',
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  insightIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#ecfdf5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  insightSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
  },
  activityCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  activityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  activityContent: {
    flex: 1,
  },
  activityText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  boldText: {
    fontWeight: '700',
  },
  activityDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },

});

