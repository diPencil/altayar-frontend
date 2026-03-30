import React from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, Modal, TextInput, Alert } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import Toast from "../../src/components/Toast";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#1071b8",
  secondary: "#167dc1",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
  purple: "#8b5cf6",
  background: "#f1f5f9",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
};

import { adminApi, employeeApi } from "../../src/services/api";
import { rtlMirroredIconStyle } from "../../src/utils/rtlIcons";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";
import { useAuth } from "../../src/contexts/AuthContext";
import { useState, useEffect, useCallback } from "react";

export default function AdminDashboard() {
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const { user } = useAuth();

  const userName =
    user?.role === 'ADMIN'
      ? t('admin.dashboard.brandAccountName')
      : (user?.first_name || t('admin.dashboard.fallbackName'));

  const [stats, setStats] = useState({
    totalUsers: 0,
    revenue: 0,
    bookings: 0,
    orders: 0
  });
  const [activities, setActivities] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [revenueChart, setRevenueChart] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [chartPeriod, setChartPeriod] = useState<'week' | 'month' | 'year'>('month');
  const [periodSelectorVisible, setPeriodSelectorVisible] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  // Admin -> Employee messages (composer)
  const [msgTitle, setMsgTitle] = useState("");
  const [msgBody, setMsgBody] = useState("");
  const [msgUrgent, setMsgUrgent] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeePickerOpen, setEmployeePickerOpen] = useState(false);
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [targetEmployeeId, setTargetEmployeeId] = useState<string | null>(null);

  // Manual localization helpers for charts to ensure stability across JS engines
  const getMonthName = (date: Date) => {
    const monthsAr = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const monthsEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return isRTL ? monthsAr[date.getMonth()] : monthsEn[date.getMonth()];
  };

  const getDayName = (date: Date) => {
    const daysAr = ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'];
    const daysEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return isRTL ? daysAr[date.getDay()] : daysEn[date.getDay()];
  };

  // Mock Data Generator for "Realistic Data"
  const generateMockData = (period: 'week' | 'month' | 'year') => {
    const data = [];
    const now = new Date();

    if (period === 'week') {
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(now.getDate() - i);
        data.push({
          day: getDayName(date),
          revenue: Math.floor(Math.random() * 5000) + 500
        });
      }
    } else if (period === 'month') {
      for (let i = 1; i <= 4; i++) {
        data.push({
          day: `${t('common.week')} ${i}`,
          revenue: Math.floor(Math.random() * 20000) + 5000
        });
      }
    } else if (period === 'year') {
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now);
        // Important: set date to 1 to avoid duplicating months like March when today is the 31st
        date.setDate(1);
        date.setMonth(now.getMonth() - i);
        data.push({
          day: getMonthName(date),
          revenue: Math.floor(Math.random() * 100000) + 20000
        });
      }
    }
    return data;
  };

  // Helper to group daily data into weeks/months (for real API data)
  const groupData = (rawData: any[], period: 'week' | 'month' | 'year') => {
    if (!rawData || rawData.length === 0) return generateMockData(period);
    if (period === 'week') {
      // Map API English days to local names
      const dayMap: any = {
        'Sun': isRTL ? 'أحد' : 'Sun',
        'Mon': isRTL ? 'إثنين' : 'Mon',
        'Tue': isRTL ? 'ثلاثاء' : 'Tue',
        'Wed': isRTL ? 'أربعاء' : 'Wed',
        'Thu': isRTL ? 'خميس' : 'Thu',
        'Fri': isRTL ? 'جمعة' : 'Fri',
        'Sat': isRTL ? 'سبت' : 'Sat',
        'أحد': 'أحد', 'إثنين': 'إثنين', 'ثلاثاء': 'ثلاثاء', 'أربعاء': 'أربعاء', 'خميس': 'خميس', 'جمعة': 'جمعة', 'سبت': 'سبت'
      };

      return (rawData || []).map(item => ({
        ...item,
        day: dayMap[item.day] || item.day
      }));
    }

    // Simple grouping logic for Month -> 4 weeks
    if (period === 'month' && rawData.length > 7) {
      const grouped = [];
      const itemsPerWeek = Math.ceil(rawData.length / 4);
      for (let i = 0; i < 4; i++) {
        const slice = rawData.slice(i * itemsPerWeek, (i + 1) * itemsPerWeek);
        const sum = slice.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        grouped.push({ day: `${t('common.week')} ${i + 1}`, revenue: sum });
      }
      return grouped;
    }

    // New grouping logic for Year -> 12 months
    if (period === 'year' && rawData.length > 30) {
      const grouped = [];
      const itemsPerMonth = Math.ceil(rawData.length / 12);
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setDate(1); // Avoid month skipping
        monthDate.setMonth(now.getMonth() - i);
        const startIndex = Math.max(0, rawData.length - (i + 1) * itemsPerMonth);
        const slice = rawData.slice(startIndex, startIndex + itemsPerMonth);
        const sum = slice.reduce((acc, curr) => acc + (curr.revenue || 0), 0);
        grouped.push({
          day: getMonthName(monthDate),
          revenue: sum
        });
      }
      return grouped;
    }

    return rawData;
  };

  useEffect(() => {
    loadAdminData();
  }, [chartPeriod]); // Reload when period changes

  useEffect(() => {
    // Load employees list for targeting admin messages
    employeeApi.listEmployees({ limit: 200, offset: 0 })
      .then((res: any) => setEmployees(Array.isArray(res) ? res : []))
      .catch(() => setEmployees([]));
  }, []);

  const sendEmployeeMessage = async () => {
    const title = msgTitle.trim();
    const message = msgBody.trim();

    if (!title || !message) {
      Alert.alert(
        t('common.error', 'Error'),
        t('admin.employeeMessages.validation', 'Please enter title and message')
      );
      return;
    }

    try {
      setSendingMsg(true);
      await employeeApi.createAdminMessage({
        title,
        message,
        urgent: msgUrgent,
        target_employee_id: targetEmployeeId || null,
      });
      setMsgTitle("");
      setMsgBody("");
      setMsgUrgent(false);
      setTargetEmployeeId(null);
      setToast({
        visible: true,
        message: t('admin.employeeMessages.sentBody', 'Your message has been sent to employees.'),
        type: 'success'
      });
    } catch (e) {
      setToast({
        visible: true,
        message: t('common.somethingWentWrong', 'Something went wrong'),
        type: 'error'
      });
    } finally {
      setSendingMsg(false);
    }
  };

  const loadAdminData = async () => {
    try {
      setLoading(true);
      // Fetch all data including chart
      const days = chartPeriod === 'week' ? 7 : chartPeriod === 'month' ? 30 : 365;
      const [statsRes, activitiesRes, transactionsRes, customChartRes] = await Promise.allSettled([
        adminApi.getOverviewStats().catch(() => ({ users: { total: 0 }, revenue: { total: 0 }, bookings: { total: 0 }, orders: { total: 0 } })),
        adminApi.getRecentActivities().catch(() => []),
        adminApi.getRecentTransactions().catch(() => []),
        adminApi.getRevenueChart(days).catch(() => [])
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        // Fix: backend returns detailed objects {total: N, this_month: N, ...}
        // accessing .total ensures we display numbers not objects
        setStats({
          totalUsers: statsRes.value.users?.total || 0,
          revenue: statsRes.value.revenue?.total || 0,
          bookings: statsRes.value.bookings?.total || 0,
          orders: statsRes.value.orders?.total || 0
        });
      }

      if (activitiesRes.status === 'fulfilled') {
        setActivities(activitiesRes.value || []);
      }

      if (transactionsRes.status === 'fulfilled') {
        setTransactions(transactionsRes.value || []);
      }

      if (customChartRes.status === 'fulfilled' && customChartRes.value && customChartRes.value.length > 0) {
        setRevenueChart(groupData(customChartRes.value, chartPeriod));
      } else {
        // Fallback to realistic grouped mock data if API returns empty
        setRevenueChart(generateMockData(chartPeriod));
      }

    } catch (error) {
      console.log("Error loading admin data", error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadAdminData();
    setRefreshing(false);
  }, []);

  // Helper to find max value for scaling chart
  const maxRevenue = Math.max(...revenueChart.map(d => d.revenue), 100);

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'user': return COLORS.primary;
      case 'payment': return COLORS.success;
      case 'booking': return COLORS.purple;
      case 'membership': return COLORS.warning;
      default: return COLORS.textLight;
    }
  };

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
      {/* ... Welcome Section ... */}
      <View style={{ marginBottom: 20, marginTop: 10 }}>
        <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text, textAlign: isRTL ? 'right' : 'left' }}>
          {t('admin.dashboard.hello')}, {userName}! 👋
        </Text>
        <Text style={{ fontSize: 14, color: COLORS.textLight, textAlign: isRTL ? 'right' : 'left', marginTop: 4 }}>
          {t('admin.revenueOverview')}
        </Text>
      </View>

      {/* Stats Cards - Keeping existing props logic */}
      <View style={[styles.statsGrid]}>
        <StatCard
          icon="people"
          label={t("admin.totalUsers")}
          value={stats.totalUsers.toLocaleString()}
          change=""
          gradient={[COLORS.primary, COLORS.secondary]}
          isRTL={isRTL}
        />
        <StatCard
          icon="card"
          label={t("admin.revenue")}
          value={`$${stats.revenue.toLocaleString()}`}
          change=""
          gradient={[COLORS.success, "#34d399"]}
          isRTL={isRTL}
        />
        <StatCard
          icon="airplane"
          label={t("common.bookings")}
          value={stats.bookings.toLocaleString()}
          change=""
          gradient={[COLORS.purple, "#a78bfa"]}
          isRTL={isRTL}
        />
        <StatCard
          icon="receipt"
          label={t("admin.ordersManagement")}
          value={stats.orders.toLocaleString()}
          change=""
          gradient={[COLORS.warning, "#fbbf24"]}
          isRTL={isRTL}
        />
      </View>

      {/* Admin -> Employee messages (under dashboard) */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
            {t('admin.employeeMessages.sendTitle', 'Send message to employees')}
          </Text>
        </View>

        <View style={[styles.empMsgSendToRow]}>
          <Text style={[styles.empMsgSendToLabel, isRTL && styles.textRTL]}>
            {t('admin.employeeMessages.sendToLabel', 'Send to')}
          </Text>

          <TouchableOpacity
            style={[styles.empMsgChip, !targetEmployeeId && styles.empMsgChipActive]}
            onPress={() => setTargetEmployeeId(null)}
          >
            <Text style={[styles.empMsgChipText, !targetEmployeeId && styles.empMsgChipTextActive]}>
              {t('admin.employeeMessages.sendToAll', 'All employees')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.empMsgChip, !!targetEmployeeId && styles.empMsgChipActive]}
            onPress={() => setEmployeePickerOpen(true)}
          >
            <Text style={[styles.empMsgChipText, !!targetEmployeeId && styles.empMsgChipTextActive]}>
              {t('admin.employeeMessages.sendToOne', 'Specific')}
            </Text>
          </TouchableOpacity>
        </View>

        {!!targetEmployeeId && (
          <TouchableOpacity style={[styles.empMsgSelectedRow]} onPress={() => setEmployeePickerOpen(true)}>
            <Ionicons name="person-outline" size={16} color={COLORS.textLight} />
            <Text style={[styles.empMsgSelectedText, isRTL && styles.textRTL]} numberOfLines={1}>
              {t('admin.employeeMessages.selectedEmployee', 'Selected')}:{' '}
              {(employees.find((e: any) => String(e?.id) === String(targetEmployeeId))?.name) || targetEmployeeId}
            </Text>
          </TouchableOpacity>
        )}

        <TextInput
          style={[styles.empMsgInput, isRTL && styles.textRTL]}
          placeholder={t('admin.employeeMessages.messageTitleLabel', 'Title')}
          value={msgTitle}
          onChangeText={setMsgTitle}
        />
        <TextInput
          style={[styles.empMsgInput, styles.empMsgTextArea, isRTL && styles.textRTL]}
          placeholder={t('admin.employeeMessages.messageBodyLabel', 'Message')}
          value={msgBody}
          onChangeText={setMsgBody}
          multiline
        />

        <TouchableOpacity
          style={[styles.empMsgUrgentToggle]}
          onPress={() => setMsgUrgent(v => !v)}
        >
          <Ionicons name={msgUrgent ? 'checkbox' : 'square-outline'} size={20} color={COLORS.primary} />
          <Text style={[styles.empMsgUrgentLabel, isRTL && styles.textRTL]}>
            {t('admin.employeeMessages.urgentLabel', 'Mark as urgent')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.empMsgSendBtn, sendingMsg && { opacity: 0.6 }]}
          onPress={sendEmployeeMessage}
          disabled={sendingMsg}
        >
          <Text style={styles.empMsgSendBtnText}>
            {sendingMsg ? t('common.loading', 'Loading...') : t('admin.employeeMessages.send', 'Send')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={employeePickerOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setEmployeePickerOpen(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => { setEmployeePickerOpen(false); setEmployeeSearch(""); }}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>
              {t('admin.employeeMessages.chooseEmployee', 'Choose employee')}
            </Text>

            <TextInput
              style={[styles.empMsgInput, isRTL && styles.textRTL]}
              placeholder={t('admin.employeeMessages.searchEmployee', 'Search by name/email')}
              value={employeeSearch}
              onChangeText={setEmployeeSearch}
            />

            <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
              {employees
                .filter((e: any) => {
                  const q = employeeSearch.trim().toLowerCase();
                  if (!q) return true;
                  const name = String(e?.name || '').toLowerCase();
                  const email = String(e?.email || '').toLowerCase();
                  return name.includes(q) || email.includes(q) || String(e?.id || '').toLowerCase().includes(q);
                })
                .map((e: any) => {
                  const selected = String(e?.id) === String(targetEmployeeId);
                  return (
                    <TouchableOpacity
                      key={String(e?.id)}
                      style={[styles.empMsgEmployeeRow, selected && styles.empMsgEmployeeRowSelected]}
                      onPress={() => {
                        setTargetEmployeeId(String(e?.id));
                        setEmployeePickerOpen(false);
                        setEmployeeSearch("");
                      }}
                    >
                      <View style={[styles.empMsgEmployeeInfo, isRTL && styles.empMsgEmployeeInfoRTL]}>
                        <Text style={[styles.empMsgEmployeeName, isRTL && styles.textRTL]} numberOfLines={1}>
                          {e?.name || e?.email || e?.id}
                        </Text>
                        {!!e?.email && (
                          <Text style={[styles.empMsgEmployeeEmail, isRTL && styles.textRTL]} numberOfLines={1}>
                            {e.email}
                          </Text>
                        )}
                      </View>
                      {selected && <Ionicons name="checkmark" size={18} color={COLORS.primary} />}
                    </TouchableOpacity>
                  );
                })}

              {employees.length === 0 && (
                <Text style={[styles.empMsgModalEmpty, isRTL && styles.textRTL]}>
                  {t('admin.employeeMessages.noEmployees', 'No employees found')}
                </Text>
              )}
            </ScrollView>

            <View style={[styles.empMsgModalFooter]}>
              <TouchableOpacity
                style={[styles.empMsgModalBtn, styles.empMsgModalBtnSecondary]}
                onPress={() => {
                  setTargetEmployeeId(null);
                  setEmployeePickerOpen(false);
                  setEmployeeSearch("");
                }}
              >
                <Text style={styles.empMsgModalBtnSecondaryText}>
                  {t('admin.employeeMessages.sendToAll', 'All employees')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Analytics Card - Chart */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
            {t("admin.revenueOverview")}
          </Text>
          <TouchableOpacity
            style={[styles.periodBtn]}
            onPress={() => setPeriodSelectorVisible(true)}
          >
            <Text style={styles.periodText}>
              {chartPeriod === 'week' ? t("admin.thisWeek") :
                chartPeriod === 'month' ? t("admin.thisMonth") : t("admin.thisYear")}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-up" : "chevron-down"}
              size={16}
              color={COLORS.textLight}
            />
          </TouchableOpacity>
        </View>
        <View style={styles.chartPlaceholder}>
          <View style={[styles.chartBars]}>
            {revenueChart.length > 0 ? (
              revenueChart.map((item, index) => {
                // Calculate height percentage relative to max, max height 100px
                const height = (item.revenue / maxRevenue) * 100;

                // Dynamic bar width and label visibility
                const totalItems = revenueChart.length;
                const dynamicBarWidth = Math.max(width / (totalItems * 2.5), 4);

                // Only show labels for some items if many items
                let showLabel = true;
                if (totalItems > 12) {
                  const step = Math.ceil(totalItems / 6);
                  showLabel = index % step === 0 || index === totalItems - 1;
                }

                return (
                  <View key={index} style={styles.barContainer}>
                    <View style={[
                      styles.bar,
                      {
                        height: Math.max(height, 4),
                        width: dynamicBarWidth,
                        backgroundColor: height > 0 ? COLORS.primary : '#e2e8f0'
                      }
                    ]} />
                    {showLabel && <Text style={styles.barLabel}>{item.day}</Text>}
                  </View>
                );
              })
            ) : (
              <Text style={{ width: '100%', textAlign: 'center', color: COLORS.textLight }}>
                {t("common.noTransactions")}
              </Text>
            )}
          </View>
        </View>
      </View>

      {/* Period Selector Modal */}
      <Modal
        visible={periodSelectorVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPeriodSelectorVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPeriodSelectorVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t("admin.filter")}</Text>

            <TouchableOpacity
              style={[styles.modalOption]}
              onPress={() => { setChartPeriod('week'); setPeriodSelectorVisible(false); }}
            >
              <Text style={[styles.modalOptionText, chartPeriod === 'week' && styles.selectedOptionText]}>{t("admin.thisWeek")}</Text>
              {chartPeriod === 'week' && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption]}
              onPress={() => { setChartPeriod('month'); setPeriodSelectorVisible(false); }}
            >
              <Text style={[styles.modalOptionText, chartPeriod === 'month' && styles.selectedOptionText]}>{t("admin.thisMonth")}</Text>
              {chartPeriod === 'month' && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalOption]}
              onPress={() => { setChartPeriod('year'); setPeriodSelectorVisible(false); }}
            >
              <Text style={[styles.modalOptionText, chartPeriod === 'year' && styles.selectedOptionText]}>{t("admin.thisYear")}</Text>
              {chartPeriod === 'year' && <Ionicons name="checkmark" size={20} color={COLORS.primary} />}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Recent Activities */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <Text style={[styles.cardTitle, isRTL ? styles.cardTitleActivitiesRTL : styles.cardTitleActivitiesLTR]}>
            {t("admin.recentActivities")}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/activities')}>
            <Text style={[styles.viewAll, isRTL && styles.viewAllRTL]}>{t("common.viewAll")}</Text>
          </TouchableOpacity>
        </View>

        {/* ... inside return ... */}

        {activities.length > 0 ? (
          activities.map((activity, index) => (
            <ActivityItem
              key={index}
              icon={activity.icon || "information-circle"}
              iconColor={getActivityColor(activity.type)}
              title={t(`manageActivities.types.${(activity.type || '').toLowerCase()}`) || activity.title || "Activity"}
              description={activity.description || ""}
              time={(function () {
                try {
                  const d = new Date(activity.time);
                  if (isNaN(d.getTime())) return activity.time;
                  return d.toLocaleDateString(isRTL ? 'ar' : 'en-US', { day: 'numeric', month: 'numeric', year: 'numeric' }) + ' ' + d.toLocaleTimeString(isRTL ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' });
                } catch (e) { return activity.time; }
              })()}
              isRTL={isRTL}
            />
          ))
        ) : (
          <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textLight }}>
            {t('admin.manageActivities.empty')}
          </Text>
        )}
      </View>

      {/* Recent Transactions */}
      <View style={styles.card}>
        <View style={[styles.cardHeader]}>
          <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>
            {t("admin.recentTransactions")}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(admin)/payments')}>
            <Text style={[styles.viewAll, isRTL && styles.viewAllRTL]}>{t("common.viewAll")}</Text>
          </TouchableOpacity>
        </View>

        {transactions.length > 0 ? (
          <View>
            {/* Header */}
            <View style={[styles.tableHeader]}>
              <Text style={[styles.tableCell, styles.cellWide, isRTL && styles.textRTL]}>
                {t("common.user")}
              </Text>
              <Text style={[styles.tableCell, isRTL && styles.textRTL]}>
                {t("common.amount")}
              </Text>
              <Text style={[styles.tableCell, isRTL && styles.textRTL]}>
                {t("common.status")}
              </Text>
            </View>
            {transactions.map((tx, i) => (
              <TransactionRow
                key={i}
                user={tx.user || "Unknown"}
                amount={`${tx.amount} ${formatCurrencyLabel(tx.currency, t)}`}
                status={t(`common.statuses.${(tx.status || '').toLowerCase()}`) || tx.status}
                statusKey={tx.status}
                isRTL={isRTL}
              />
            ))}
          </View>
        ) : (
          <Text style={{ textAlign: 'center', padding: 20, color: COLORS.textLight }}>
            {t("common.noTransactions")}
          </Text>
        )}
      </View>

      {/* Quick Actions */}
      <View style={[styles.quickActions]}>
        <QuickAction
          icon="person-add"
          label={t("admin.addUser")}
          color={COLORS.primary}
          isRTL={isRTL}
          onPress={() => router.push('/(admin)/users/create')}
        />
        <QuickAction
          icon="add-circle"
          label={t("admin.newOrder")}
          color={COLORS.success}
          isRTL={isRTL}
          onPress={() => router.push('/(admin)/invoices/create')}
        />
        <QuickAction
          icon="airplane"
          label={t('common.bookings')}
          color={COLORS.secondary}
          isRTL={isRTL}
          onPress={() => router.push({ pathname: '/(admin)/bookings', params: { action: 'create' } })}
        />
        <QuickAction
          icon="document"
          label={t("admin.reports")}
          color={COLORS.purple}
          isRTL={isRTL}
          onPress={() => router.push('/(admin)/reports')}
        />
      </View>

      {/* Marketing Actions */}
      <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.text, marginHorizontal: 16, marginTop: 10, marginBottom: 10, textAlign: isRTL ? 'right' : 'left' }}>
        {t('admin.marketing')}
      </Text>
      <View style={[styles.quickActions, { marginBottom: 20 }]}>
        <QuickAction
          icon="pricetag"
          label={t('admin.sendOffer')}
          color={COLORS.primary}
          isRTL={isRTL}
          onPress={() => router.push({ pathname: "/(admin)/admin-marketing/create" as any, params: { type: 'PACKAGE' } })}
        />
        <QuickAction
          icon="gift"
          label={t('admin.sendDiscount')}
          color={COLORS.success}
          isRTL={isRTL}
          onPress={() => router.push({ pathname: "/(admin)/admin-marketing/create" as any, params: { discount: 'true', type: 'DISCOUNT' } })}
        />
        <QuickAction
          icon="ticket"
          label={t('admin.sendVoucher')}
          color={COLORS.warning}
          isRTL={isRTL}
          onPress={() => router.push({ pathname: "/(admin)/admin-marketing/create" as any, params: { voucher: 'true' } })}
        />
        <QuickAction
          icon="megaphone"
          label={t('admin.broadcast')}
          color={COLORS.purple}
          isRTL={isRTL}
          onPress={() => router.push({ pathname: "/(admin)/admin-marketing/create" as any, params: { broadcast: 'true' } })}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

function StatCard({ icon, label, value, change, gradient, isRTL }: any) {
  return (
    <LinearGradient colors={gradient} style={styles.statCard}>
      <View style={styles.statIcon}>
        <Ionicons
          name={icon}
          size={24}
          color="rgba(255,255,255,0.9)"
          style={rtlMirroredIconStyle(icon, isRTL)}
        />
      </View>
      <Text style={[styles.statValue, isRTL && styles.statValueRTL]}>{value}</Text>
      <Text style={[styles.statLabel, isRTL && styles.statLabelRTL]}>{label}</Text>
      <View style={styles.statChange}>
        <Ionicons
          name="trending-up"
          size={14}
          color="rgba(255,255,255,0.8)"
          style={rtlMirroredIconStyle('trending-up', isRTL)}
        />
        <Text style={[styles.changeText, isRTL && styles.changeTextRTL]}>{change}</Text>
      </View>
    </LinearGradient>
  );
}

function ActivityItem({ icon, iconColor, title, description, time, isRTL }: any) {
  return (
    <View style={[styles.activityItem]}>
      <View style={[styles.activityIcon, { backgroundColor: `${iconColor}15` }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View style={[styles.activityContent, isRTL && styles.activityContentRTL]}>
        <Text style={[styles.activityTitle, isRTL && styles.textRTL]} numberOfLines={1}>{title}</Text>
        <Text
          style={[styles.activityDesc, isRTL && styles.activityDescRTL]}
          numberOfLines={2}
        >
          {description}
        </Text>
      </View>
      <View style={[styles.activityTimeWrap, isRTL && styles.activityTimeWrapRTL]}>
        <Text style={[styles.activityTime, isRTL && styles.activityTimeRTL]}>{time}</Text>
      </View>
    </View>
  );
}

function TransactionRow({ user, amount, status, statusKey, isRTL }: any) {
  const statusColors: any = {
    PAID: COLORS.success,
    PENDING: COLORS.warning,
    FAILED: COLORS.error,
  };

  return (
    <View style={[styles.tableRow]}>
      <Text style={[styles.tableCell, styles.cellWide, isRTL && styles.textRTL]}>{user}</Text>
      <Text style={[styles.tableCell, isRTL && styles.textRTL]}>{amount}</Text>
      <View style={[styles.statusBadge, { backgroundColor: `${statusColors[statusKey]}15` }]}>
        <Text style={[styles.statusText, { color: statusColors[statusKey] }]}>{status}</Text>
      </View>
    </View>
  );
}

function QuickAction({ icon, label, color, isRTL, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.quickAction}
      onPress={onPress}
    >
      <View style={[styles.quickActionIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text style={[styles.quickActionLabel, isRTL && styles.textRTL]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: 16,
    width: '100%',
    maxWidth: '100%',
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 12,
  },

  statCard: {
    width: (width - 48) / 2 - 6, // Account for gap between cards
    borderRadius: 16,
    padding: 16,
    marginBottom: 0, // Remove marginBottom since we use gap
    /* flex-start follows layout direction: left in LTR, right in RTL */
    alignItems: 'flex-start',
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  statValue: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.cardBg,
    textAlign: 'auto',
    alignSelf: 'stretch',
  },
  statValueRTL: {
    textAlign: 'right',
  },
  statLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
    textAlign: 'auto',
    alignSelf: 'stretch',
  },
  statLabelRTL: {
    textAlign: 'right',
  },
  statChange: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    alignSelf: 'flex-start',
  },

  changeText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginStart: 4,
  },
  changeTextRTL: {
    marginStart: 0,
    marginEnd: 4,
  },
  card: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    flex: 1,
  },
  /** Indent heading past the activity icon column (40 + 12) so it lines up with titles below */
  cardTitleActivitiesLTR: {
    paddingStart: 52,
    textAlign: "left",
  },
  cardTitleActivitiesRTL: {
    paddingEnd: 52,
    textAlign: "right",
  },
  empMsgSendToRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  empMsgSendToLabel: {
    color: COLORS.textLight,
    fontSize: 13,
    marginEnd: 6,
  },
  empMsgChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
  },
  empMsgChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  empMsgChipText: {
    color: COLORS.text,
    fontSize: 13,
    fontWeight: "600",
  },
  empMsgChipTextActive: {
    color: "#fff",
  },
  empMsgSelectedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },

  empMsgSelectedText: {
    color: COLORS.textLight,
    fontSize: 13,
    flex: 1,
  },
  empMsgInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: COLORS.text,
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  empMsgTextArea: {
    minHeight: 90,
    textAlignVertical: "top",
  },
  empMsgUrgentToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },

  empMsgUrgentLabel: {
    color: COLORS.text,
    fontSize: 14,
  },
  empMsgSendBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  empMsgSendBtnText: {
    color: "#fff",
    fontWeight: "700",
  },
  empMsgEmployeeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: "#fff",
    marginBottom: 8,
  },

  empMsgEmployeeRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "#f0f9ff",
  },
  empMsgEmployeeInfo: {
    flex: 1,
    marginEnd: 10,
  },
  empMsgEmployeeInfoRTL: {
    marginEnd: 0,
    marginStart: 10,
  },
  empMsgEmployeeName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  },
  empMsgEmployeeEmail: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  empMsgModalEmpty: {
    textAlign: "center",
    color: COLORS.textLight,
    paddingVertical: 16,
  },
  empMsgModalFooter: {
    marginTop: 8,
    flexDirection: "row",
    justifyContent: "flex-end",
  },

  empMsgModalBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  empMsgModalBtnSecondary: {
    backgroundColor: COLORS.border,
  },
  empMsgModalBtnSecondaryText: {
    color: COLORS.text,
    fontWeight: "700",
  },
  textRTL: {
    textAlign: "right",
  },
  periodBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },

  periodText: {
    fontSize: 13,
    color: COLORS.textLight,
    marginEnd: 4,
  },
  viewAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
    flexShrink: 0,
  },
  viewAllRTL: {
    textAlign: "left",
  },
  chartPlaceholder: {
    height: 160,
    justifyContent: "flex-end",
  },
  chartBars: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    height: 140,
  },

  barContainer: {
    flex: 1,
    alignItems: "center",
  },
  bar: {
    // width: 24, // Now dynamic from component
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    marginBottom: 8,
  },
  barLabel: {
    fontSize: 10,
    color: COLORS.textLight,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  activityContent: {
    flex: 1,
    marginStart: 12,
    minWidth: 0,
  },
  activityContentRTL: {
    marginStart: 0,
    marginEnd: 12,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.text,
    width: "100%",
  },
  activityDesc: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
    width: "100%",
  },
  activityDescRTL: {
    textAlign: "right",
  },
  activityTimeWrap: {
    flexShrink: 0,
    maxWidth: 104,
    marginStart: 8,
    justifyContent: "center",
  },
  activityTimeWrapRTL: {
    marginStart: 0,
    marginEnd: 8,
  },
  activityTime: {
    fontSize: 11,
    color: COLORS.textLight,
    textAlign: "right",
  },
  activityTimeRTL: {
    textAlign: "left",
  },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.border,
  },

  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxWidth: 400,
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
    textAlign: 'center',
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
  },
  selectedOptionText: {
    color: COLORS.primary,
    fontWeight: 'bold',
  },
  tableCell: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
  },
  cellWide: {
    flex: 1.5,
  },
  statusBadge: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  quickActions: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  quickAction: {
    alignItems: "center",
    width: (width - 64) / 4,
  },
  quickActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 12,
    color: COLORS.text,
    textAlign: "center",
  },
  bottomSpacer: {
    height: 20,
  },
});
