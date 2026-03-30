import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert, Modal, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import { useRouter, useFocusEffect } from "expo-router";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";
import { formatCurrency } from "../../src/utils/currency";

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
  const { isRTL, language } = useLanguage();
  const locale = language === "ar" ? "ar-EG" : "en-US";
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={[styles.pageTitle, isRTL && styles.pageTitleRTL]}>{t('manageMemberships.title')}</Text>
        <View style={[styles.headerActions]}>

          <TouchableOpacity
            style={[styles.addBtn]}
            onPress={() => router.push('/(admin)/memberships/create')}
          >
            <Ionicons name="add" size={20} color="white" />
            <Text style={styles.addBtnText}>{t('manageMemberships.create')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Analytics Matrix (2x2 Grid) */}
      <View style={[styles.statsGrid]}>
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
            value={formatCurrency(stats.totalRevenue || 0, "USD", locale)}
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
      <View style={[styles.insightsContainer]}>
        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={styles.insightIconCircle}>
              <Ionicons name="trending-up" size={16} color={COLORS.success} />
            </View>
            <Text style={[styles.insightTitle, isRTL && styles.textAlignEnd]}>{t('manageMemberships.monthlyGrowth')}</Text>
          </View>
          <Text style={[styles.insightValue, isRTL && styles.textAlignEnd]}>
            {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth}%
          </Text>
          <Text style={[styles.insightSubtext, isRTL && styles.textAlignEnd]}>{t('manageMemberships.vsLastMonth')}</Text>
        </View>

        <View style={styles.insightCard}>
          <View style={styles.insightHeader}>
            <View style={[styles.insightIconCircle, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="star" size={16} color={COLORS.warning} />
            </View>
            <Text style={[styles.insightTitle, isRTL && styles.textAlignEnd]}>{t('manageMemberships.topPlan')}</Text>
          </View>
          <Text style={[styles.insightValue, isRTL && styles.textAlignEnd]}>
            {isRTL ? stats.topPlan?.name_ar || '-' : stats.topPlan?.name_en || '-'}
          </Text>
          <Text style={[styles.insightSubtext, isRTL && styles.textAlignEnd]}>{t('manageMemberships.mostPopular')}</Text>
        </View>
      </View>

      {/* Recent Activity Feed */}
      <View style={styles.activityCard}>
        <View style={[styles.cardHeader]}>
          <Text style={[styles.cardTitle, isRTL && styles.textAlignEnd]}>{t('manageMemberships.recentActivity')}</Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/memberships/subscriptions')}>
            <Text style={[styles.viewAll, isRTL && styles.textAlignEnd]}>{t('common.viewAll', 'View All')}</Text>
          </TouchableOpacity>
        </View>

        {stats.recentActivity && stats.recentActivity.length > 0 ? (
          stats.recentActivity.map((activity, idx) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="person-outline" size={14} color={COLORS.textLight} />
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityText, isRTL && styles.textAlignEnd, isRTL && { writingDirection: "rtl" as const }]}>
                  <Text style={styles.boldText}>{activity.user}</Text> {isRTL ? activity.action_ar : activity.action_en} <Text style={[styles.boldText, { color: COLORS.primary }]}>{isRTL ? activity.plan_ar : activity.plan_en}</Text>
                </Text>
                <Text style={[styles.activityDate, isRTL && styles.textAlignEnd]}>{activity.date}</Text>
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
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.thCell, { flex: 0.7 }, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>{t('manageMemberships.table.id')}</Text>
          <Text style={[styles.th, styles.thCell, { flex: 2.2 }, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>{t('manageMemberships.table.name')}</Text>
          <Text style={[styles.th, styles.thCell, { flex: 2 }, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>{t('manageMemberships.table.details')}</Text>
          <Text style={[styles.th, styles.thCell, { flex: 1 }, styles.textAlignCenter]}>{t('manageMemberships.table.members')}</Text>
          <Text style={[styles.th, styles.thCell, { flex: 0.6 }, styles.textAlignCenter]}>{t('manageMemberships.table.action')}</Text>
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
              locale={locale}
            />
          ))
        )}
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
    <View style={styles.statCard}>
      <View style={[styles.iconBox, { backgroundColor: `${color}10` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text style={[styles.statValue, isRTL && styles.textAlignEnd]}>{value}</Text>
        <Text style={[styles.statTitle, isRTL && styles.textAlignEnd]} numberOfLines={1}>{title}</Text>
      </View>
    </View>
  );
}

function MembershipRow({ plan, index, onRefresh, onDelete, openMenuId, setOpenMenuId, showMenu, locale }: any) {
  const router = useRouter();
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const isPaid = plan.price > 0 || plan.plan_type !== 'FREE';

  const toggleMenu = () => {
    setOpenMenuId(showMenu ? null : plan.id);
  };

  const durationLabel =
    plan.plan_type === "PAID_INFINITE"
      ? t("manageMemberships.lifetime", "For Lifetime")
      : t("manageMemberships.perDays", { days: plan.duration_days });

  return (
    <View style={[styles.tr, showMenu && styles.trWithOpenMenu]}>
      <Text style={[styles.td, styles.tdCell, { flex: 0.7, color: COLORS.textLight }, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>
        {index}
      </Text>

      <View style={[styles.nameCol, { flex: 2.2 }]}>
        <View style={styles.nameRow}>
          <Text
            style={[styles.planName, isRTL ? styles.textAlignEnd : styles.textAlignStart]}
            numberOfLines={2}
          >
            {isRTL ? plan.tier_name_ar || plan.tier_name_en : plan.tier_name_en}
          </Text>
          <View style={[styles.badge, isPaid ? styles.paidBadge : styles.freeBadge]}>
            <Text style={[styles.badgeText, isPaid ? styles.paidText : styles.freeText]}>
              {isPaid ? t("manageMemberships.paid", "Paid") : t("manageMemberships.free", "Free")}
            </Text>
          </View>
        </View>
        <Text style={[styles.planCode, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>{plan.tier_code}</Text>
      </View>

      <View style={[styles.detailsCol, { flex: 2 }]}>
        {isPaid ? (
          <Text style={[styles.planPrice, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>
            {formatCurrency(Number(plan.price), plan.currency || "USD", locale)}
            {"\n"}
            <Text style={styles.planDuration}>{durationLabel}</Text>
          </Text>
        ) : (
          <Text style={[styles.planPrice, isRTL ? styles.textAlignEnd : styles.textAlignStart]}>
            {t("manageMemberships.free", "Free")}
            {"\n"}
            <Text style={styles.planDuration}>{durationLabel}</Text>
          </Text>
        )}
      </View>

      <Text style={[styles.td, styles.tdCell, { flex: 1, fontWeight: "700" }, styles.textAlignCenter]}>{plan.members_count || 0}</Text>

      <View style={[styles.actionCol, styles.actionColRelative, { flex: 0.6 }]}>
        <TouchableOpacity onPress={toggleMenu} activeOpacity={0.6} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.text} />
        </TouchableOpacity>
        {showMenu && (
          <MembershipDropdown
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
              onDelete(plan);
            }}
          />
        )}
      </View>
    </View>
  );
}

function MenuActionRow({
  isRTL,
  onPress,
  label,
  iconName,
  iconColor,
  labelColor,
}: {
  isRTL: boolean;
  onPress: () => void;
  label: string;
  iconName: React.ComponentProps<typeof Ionicons>["name"];
  iconColor: string;
  labelColor: string;
}) {
  return (
    <TouchableOpacity style={styles.menuItem} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name={iconName} size={18} color={iconColor} />
      <Text
        style={[
          styles.menuText,
          styles.menuTextFlex,
          isRTL ? styles.textAlignEnd : styles.textAlignStart,
          { color: labelColor },
          isRTL && { writingDirection: "rtl" as const },
        ]}
        numberOfLines={2}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function MembershipDropdown({ onEdit, onViewMembers, onDelete }: any) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();

  return (
    <View
      style={[styles.actionMenu, isRTL && styles.actionMenuRTL, styles.actionMenuAnchored]}
      {...(Platform.OS === "web" && isRTL ? ({ dir: "rtl", lang: "ar" } as any) : {})}
    >
      <MenuActionRow
        isRTL={isRTL}
        onPress={onEdit}
        label={t("common.edit", "Edit")}
        iconName="create-outline"
        iconColor={COLORS.primary}
        labelColor={COLORS.text}
      />
      <View style={styles.menuDivider} />
      <MenuActionRow
        isRTL={isRTL}
        onPress={onViewMembers}
        label={t("manageMemberships.viewMembers", "View Members")}
        iconName="eye-outline"
        iconColor={COLORS.primary}
        labelColor={COLORS.text}
      />
      <View style={styles.menuDivider} />
      <MenuActionRow
        isRTL={isRTL}
        onPress={onDelete}
        label={t("common.delete", "Delete")}
        iconName="trash-outline"
        iconColor={COLORS.error}
        labelColor={COLORS.error}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
    flexGrow: 1,
    overflow: "visible",
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },

  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  pageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
    textAlign: "left",
  },
  pageTitleRTL: {
    textAlign: "right",
  },
  thCell: {
    paddingHorizontal: 4,
  },
  tdCell: {
    paddingHorizontal: 4,
  },
  textAlignStart: {
    textAlign: "left",
  },
  textAlignEnd: {
    textAlign: "right",
  },
  textAlignCenter: {
    textAlign: "center",
  },
  nameCol: {
    minWidth: 0,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  detailsCol: {
    minWidth: 0,
    justifyContent: "center",
  },
  actionCol: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  actionColRelative: {
    position: "relative",
    overflow: "visible",
    zIndex: 1,
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


  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.text,
    textAlign: 'left',
  },
  statTitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'left',
  },
  tableCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingBottom: 8,
    overflow: "visible",
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
    textAlign: 'left',
  },
  tr: {
    flexDirection: 'row',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    alignItems: 'center',
    overflow: 'visible',
  },
  trWithOpenMenu: {
    zIndex: 1000,
    elevation: 8,
  },

  td: {
    fontSize: 14,
    color: COLORS.text,
    textAlign: 'left',
  },
  planName: {
    fontWeight: '600',
    color: COLORS.primary,
    textDecorationLine: 'underline',
    textAlign: 'left',
  },
  planCode: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
    textAlign: 'left',
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
    textAlign: 'left',
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
    textAlign: 'left',
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
    minWidth: 168,
    overflow: "visible",
  },
  /** Dropdown opens under the ⋮ control in this row (not a fixed table offset). */
  actionMenuAnchored: {
    position: "absolute",
    top: "100%",
    marginTop: 6,
    end: 0,
    zIndex: 10000,
    elevation: 16,
  },
  actionMenuRTL: {
    direction: "rtl",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  menuTextFlex: {
    flex: 1,
    flexShrink: 1,
  },
  menuText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "500",
    textAlign: "left",
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
    // handled by logical direction
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
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textLight,
    textAlign: 'left',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
    textAlign: 'left',
  },
  insightSubtext: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: 'left',
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
    textAlign: 'left',
  },
  boldText: {
    fontWeight: '700',
  },
  activityDate: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'left',
  },
  alignEnd: {
    alignItems: 'flex-end',
  },


});

