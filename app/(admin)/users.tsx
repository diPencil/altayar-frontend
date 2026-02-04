import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, ActivityIndicator, Image, Modal, Alert, Dimensions } from 'react-native';
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../src/services/api";
import { useTranslation } from "react-i18next";
import Toast from "../../src/components/Toast";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { getPlanColor, getShortCode } from "../../src/utils/planColors";

const { width } = Dimensions.get('window');

function safePlanColor(tierCode: string | undefined): string {
  try {
    return getPlanColor(tierCode, undefined) || COLORS.primary;
  } catch {
    return COLORS.primary;
  }
}
const COLORS = {
  primary: "#2563eb",
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

export default function UsersManagement() {
  const router = useRouter();
  const { userId, returnPath } = useLocalSearchParams(); // Deep linking param
  const { t, i18n } = useTranslation();
  const { isRTL, isReady } = useLanguage();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    pendingUsers: 0,
    blockedUsers: 0
  });

  // filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [showFilterModal, setShowFilterModal] = useState(false);

  // details modal
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Toast state
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  // Handle deep linking for userId
  useEffect(() => {
    if (userId) {
      // Small delay to ensure UI is ready or simply open it
      console.log("Deep link to user:", userId);
      setSelectedUserId(userId as string);
      setDetailsModalVisible(true);
    }
  }, [userId]);

  // Refetch users when screen comes into focus (e.g., after creating/editing/deleting a user)
  useFocusEffect(
    useCallback(() => {
      fetchUsers();
    }, [search, roleFilter])
  );

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params: any = { limit: 50 };
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;

      const res = await adminApi.getAllUsers(params);
      const usersList = res.users || [];
      setUsers(usersList);

      // Calculate stats from users list
      calculateStats(usersList);
    } catch (e) {
      console.log("Error fetching users", e);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (usersList: any[]) => {
    const totalUsers = usersList.length;
    const activeUsers = usersList.filter(u =>
      u.status === 'ACTIVE' || u.status === 'active'
    ).length;

    // Pending users: users with PENDING status (registered but not activated)
    const pendingUsers = usersList.filter(u =>
      u.status === 'PENDING' || u.status === 'pending'
    ).length;

    // Blocked users: users with DELETED or SUSPENDED status
    const blockedUsers = usersList.filter(u =>
      u.status === 'DELETED' || u.status === 'deleted' ||
      u.status === 'SUSPENDED' || u.status === 'suspended' ||
      u.deleted_at // Also check for soft-deleted users
    ).length;

    setStats({
      totalUsers,
      activeUsers,
      pendingUsers,
      blockedUsers
    });
  };

  const openDetails = (id: string) => {
    setSelectedUserId(id);
    setDetailsModalVisible(true);
  }

  // Wait for language to be ready
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
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={styles.pageTitle}>{t('admin.users', 'Users')}</Text>
        <TouchableOpacity
          style={[styles.addBtn, isRTL && styles.addBtnRTL]}
          onPress={() => router.push('/(admin)/users/create')}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.addBtnText}>{t('admin.manageUsers.create', 'Create')}</Text>
        </TouchableOpacity>
      </View>

      {/* Statistics Cards */}
      <View style={[styles.statsGrid, isRTL && styles.statsGridRTL]}>
        <StatsCard
          title={t('admin.manageUsers.totalUsers', 'Total Users')}
          value={stats.totalUsers.toString()}
          icon="people"
          color="#3b82f6"
          width="48%"
          isRTL={isRTL}
        />
        <StatsCard
          title={t('admin.manageUsers.activeUsers', 'Active Users')}
          value={stats.activeUsers.toString()}
          icon="checkmark-circle"
          color="#10b981"
          width="48%"
          isRTL={isRTL}
        />
        <StatsCard
          title={t('admin.manageUsers.pendingUsers', 'Pending Users')}
          value={stats.pendingUsers.toString()}
          icon="time"
          color="#8b5cf6"
          width="48%"
          isRTL={isRTL}
        />
        <StatsCard
          title={t('admin.manageUsers.blockedUsers', 'Blocked Users')}
          value={stats.blockedUsers.toString()}
          icon="ban"
          color="#ef4444"
          width="48%"
          isRTL={isRTL}
        />
      </View>

      {/* Simple Mobile Filter Bar */}
      <View style={[styles.filterBar, isRTL && styles.filterBarRTL]}>
        <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
          <Ionicons name="search" size={20} color={COLORS.textLight} />
          <TextInput
            style={[styles.searchInput, isRTL && styles.searchInputRTL]}
            placeholder={t('admin.manageUsers.searchPlaceholder', 'Search by name, email, or phone')}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={fetchUsers}
            placeholderTextColor={COLORS.textLight}
          />
        </View>
        <TouchableOpacity style={[styles.filterBtn, roleFilter ? styles.filterBtnActive : null]} onPress={() => setShowFilterModal(true)}>
          <Ionicons name="options-outline" size={22} color={roleFilter ? 'white' : COLORS.text} />
        </TouchableOpacity>
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ margin: 40 }} />
      ) : users.length === 0 ? (
        <Text style={[styles.emptyText, isRTL && styles.textRTL]}>{t('admin.manageUsers.empty', 'No users found. Create one to get started.')}</Text>
      ) : (
        <View style={styles.listContainer}>
          {users.map((u) => (
            <View key={u.id} style={styles.userCard}>
              <View style={[styles.userMeta, isRTL && styles.userMetaRTL]}>
                <View style={styles.avatar}>
                  {u.avatar ? (
                    <Image source={{ uri: u.avatar }} style={{ width: 48, height: 48, borderRadius: 24 }} />
                  ) : (
                    <Text style={styles.avatarText}>{u.first_name?.[0]}{u.last_name?.[0]}</Text>
                  )}
                </View>
                <View style={{ flex: 1, [isRTL ? 'marginRight' : 'marginLeft']: 12 }}>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.userName} numberOfLines={1}>{u.first_name} {u.last_name}</Text>
                    <StatusDot status={u.status} />
                  </View>
                  <Text style={[styles.userEmail, isRTL && styles.textRTL]}>{u.email}</Text>
                  <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', marginTop: 4, gap: 8 }}>
                    {u.plan ? (
                      <PlanBadge
                        code={u.plan.code || u.plan.tier_code}
                        name={isRTL ? u.plan.name_ar || u.plan.name : u.plan.name}
                        color={u.plan.color || u.plan.color_hex}
                      />
                    ) : (<Text style={styles.noPlan}>{t('admin.manageUsers.noPlan', 'No Plan')}</Text>)}
                  </View>
                </View>
              </View>

              <TouchableOpacity style={[styles.detailsBtn, isRTL && styles.detailsBtnRTL]} onPress={() => openDetails(u.id)}>
                <Text style={styles.detailsBtnText}>{t('admin.manageUsers.details', 'Details')}</Text>
                <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={COLORS.primary} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.filterModalContent, isRTL && styles.filterModalContentRTL]}>
            <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('filterUsers.title', 'Filter Users')}</Text>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('filterUsers.byRole', 'By Role')}</Text>
            <View style={[styles.chipsContainer, isRTL && styles.chipsContainerRTL]}>
              {[
                { key: '', label: t('filterUsers.all', 'All') },
                { key: 'CUSTOMER', label: t('filterUsers.customer', 'Customer') },
                { key: 'EMPLOYEE', label: t('filterUsers.employee', 'Employee') },
                { key: 'ADMIN', label: t('filterUsers.admin', 'Admin') }
              ].map(({ key, label }) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.chip, roleFilter === key && styles.chipActive]}
                  onPress={() => setRoleFilter(key)}
                >
                  <Text style={[styles.chipText, roleFilter === key && styles.chipTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.applyFiltersBtn} onPress={() => { fetchUsers(); setShowFilterModal(false); }}>
              <Text style={[styles.applyFiltersBtnText, isRTL && styles.textRTL]}>{t('filterUsers.applyFilters', 'Apply Filters')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* User Details Modal */}
      {selectedUserId && (
        <UserDetailsModal
          userId={selectedUserId}
          visible={detailsModalVisible}
          onClose={() => {
            setDetailsModalVisible(false);
            setSelectedUserId(null);
            // If came from chat, go back to chat
            if (returnPath === 'chat') {
              router.back();
            }
          }}
          onUserUpdated={fetchUsers}
          setToast={setToast}
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

// --- Components ---

function StatsCard({ title, value, icon, color, width, isRTL }: any) {
  return (
    <View style={[styles.statCard, { width: width || '100%' }, isRTL && styles.statCardRTL]}>
      <View style={[styles.iconBox, { backgroundColor: `${color} 15` }]}>
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <View style={{ flex: 1, ...(isRTL && { alignItems: 'flex-end' }) }}>
        <Text style={[styles.statValue, isRTL && styles.textRTL]}>{value}</Text>
        <Text style={[styles.statTitle, isRTL && styles.textRTL]}>{title}</Text>
      </View>
    </View>
  );
}

function UserDetailsModal({ userId, visible, onClose, onUserUpdated, setToast }: { userId: string; visible: boolean; onClose: () => void; onUserUpdated: () => void; setToast: (toast: { visible: boolean, message: string, type: 'success' | 'error' | 'info' }) => void }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [competitionStats, setCompetitionStats] = useState<{ plan_id: string; tier_code: string; tier_name_en: string; tier_name_ar: string; count: number }[] | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showBlockConfirm, setShowBlockConfirm] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [attributing, setAttributing] = useState(false);
  const [toast, setLocalToast] = useState({ visible: false, message: '', type: 'info' as 'success' | 'alert' | 'error' | 'info' });

  const handleAttributeReferral = async () => {
    console.log('🏆 [Attribute] Starting attribution process...');
    console.log('👤 [Attribute] Target User ID:', userId);
    console.log('👤 [Attribute] Employee ID:', data?.assigned_employee?.id);

    if (!data?.assigned_employee?.id) {
      setToast({ visible: true, message: t('admin.manageUsers.noEmployeeAssigned', 'No employee assigned'), type: 'error' });
      return;
    }

    try {
      setAttributing(true);
      // Small delay to ensure UI reflects the "loading" state
      await new Promise(resolve => setTimeout(resolve, 100));

      const res = await adminApi.attributeReferral(userId, data.assigned_employee.id);
      console.log('✅ [Attribute] Success:', res);

      const successMsg = res.message || t('admin.manageUsers.attributeSuccess', 'Sale attributed successfully!');

      setLocalToast({
        visible: true,
        message: successMsg,
        type: 'success'
      });

      // Also update parent toast just in case
      setToast({
        visible: true,
        message: successMsg,
        type: 'success'
      });

      // Alert replaced by Toast

      await loadData();
      onUserUpdated();
    } catch (e: any) {
      console.error('❌ [Attribute] Error:', e);
      const errorMsg = e.response?.data?.detail || t('admin.manageUsers.attributeFailed', 'Failed to attribute sale');

      setLocalToast({
        visible: true,
        message: errorMsg,
        type: 'error'
      });

      // Alert replaced by Toast
    } finally {
      setAttributing(false);
    }
  };

  const formatDateSafe = (value: any) => {
    if (!value) return t('common.unknown', 'N/A');
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return t('common.unknown', 'N/A');
    return d.toLocaleDateString(isRTL ? 'ar-EG' : 'en-US');
  };

  useEffect(() => {
    if (visible && userId) {
      loadData();
    }
  }, [visible, userId]);

  const loadData = async () => {
    try {
      console.log('🔄 Loading user details for:', userId);
      setLoading(true);
      const res = await adminApi.getUserDetails(userId);
      console.log('📦 User details loaded:', res);
      console.log('👤 Assigned employee:', res.assigned_employee);
      console.log('👤 Assigned employee ID:', res.assigned_employee?.id);
      console.log('👤 Assigned employee Name:', res.assigned_employee?.name);

      // Ensure assigned_employee is properly set
      if (res.user?.assigned_employee_id && !res.assigned_employee) {
        console.warn('⚠️ User has assigned_employee_id but assigned_employee is missing!');
      }

      setData(res);
      setCompetitionStats(null);
      const role = res?.user?.role;
      if (role === 'EMPLOYEE' || role === 'ADMIN' || role === 'SUPER_ADMIN') {
        try {
          const comp = await adminApi.getUserCompetition(userId);
          setCompetitionStats(Array.isArray(comp) ? comp : []);
        } catch {
          setCompetitionStats([]);
        }
      }
    } catch (e: any) {
      console.error('❌ Failed to load user details:', e);
      const errorMessage = e?.message || e?.response?.data?.detail || 'Failed to load user details. Please check if the backend server is running.';
      setToast({
        visible: true,
        message: errorMessage,
        type: 'error'
      });
      // Don't auto-close on error, let user see the error message
      // onClose();
    } finally {
      setLoading(false);
    }
  };



  const performBlock = async () => {
    if (!data?.user) return;

    try {
      setBlocking(true);
      const newStatus = data.user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      await adminApi.updateUser(userId, { status: newStatus });
      setShowBlockConfirm(false);
      // Reload data to reflect the change
      await loadData();
      setToast({ visible: true, message: t('admin.manageUsers.updateSuccess', 'User updated successfully'), type: 'success' });
    } catch (e: any) {
      setShowBlockConfirm(false);
      setToast({ visible: true, message: e.response?.data?.detail || t('common.error', 'An error occurred'), type: 'error' });
    } finally {
      setBlocking(false);
    }
  };

  const performDeleteUser = async () => {
    try {
      console.log("🗑️ Deleting user...");
      await adminApi.deleteUser(userId);
      console.log("✅ User deleted successfully!");

      setShowDeleteConfirm(false);
      onClose(); // Close details modal

      // Show success toast
      setToast({ visible: true, message: t('admin.manageUsers.deleteSuccess', 'User deleted successfully'), type: 'success' });

      // Immediately refresh the list (useFocusEffect will also trigger)
      onUserUpdated();

      console.log("🎉 User deleted and list refreshed!");
    } catch (e) {
      console.error("❌ Error deleting user:", e);
      setShowDeleteConfirm(false);
      setToast({ visible: true, message: t('admin.manageUsers.deleteFailed', 'Failed to delete user'), type: 'error' });
    }
  };

  // Assign Employee Modal State
  const [showAssignModal, setShowAssignModal] = useState(false);

  const handleAssignEmployee = async (employeeId: string | null) => {
    try {
      console.log('🔄 Assigning employee:', employeeId, 'to user:', userId);
      const response = await adminApi.assignEmployee(userId, employeeId);
      console.log('✅ Assignment response:', response);

      // Reload data FIRST to get updated assigned_employee
      console.log('🔄 Reloading user data after assignment...');
      await loadData();

      // Small delay to ensure state is updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Force re-render by checking the new data
      console.log('✅ Data reloaded successfully');
      console.log('📦 Final data.assigned_employee:', data?.assigned_employee);

      // Close modal after data is loaded
      setShowAssignModal(false);

      const successMessage = employeeId
        ? t('admin.manageUsers.employeeAssignedSuccess', 'Employee assigned successfully')
        : t('admin.manageUsers.employeeUnassignedSuccess', 'Employee unassigned successfully');

      setToast({
        visible: true,
        message: successMessage,
        type: 'success'
      });

      // Show Alert AFTER data is refreshed
      // Alert replaced by Toast

      onUserUpdated(); // Refresh parent list
    } catch (e: any) {
      console.error('❌ Assignment error:', e);
      console.error('Error details:', e.response?.data || e.message);

      setToast({
        visible: true,
        message: e.response?.data?.detail || t('admin.manageUsers.assignmentFailed', 'Failed to assign employee. Please try again.'),
        type: 'error'
      });
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <AssignEmployeeModal
        visible={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        onAssign={handleAssignEmployee}
        currentEmployeeId={data?.assigned_employee?.id}
      />

      <View style={styles.detailsContainer}>
        <View style={styles.detailsHeader}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.detailsTitle}>{t('admin.manageUsers.userProfile.title', 'User Profile')}</Text>

          <View style={{ flexDirection: 'row' }}>
            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => {
                onClose();
                router.push(`/(admin)/users/${userId}/edit` as any);
              }}
            >
              <Ionicons name="pencil" size={20} color={COLORS.primary} />
            </TouchableOpacity >

            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => setShowBlockConfirm(true)}
              disabled={blocking}
            >
              <Ionicons
                name={data?.user?.status === 'ACTIVE' ? "ban" : "checkmark-circle"}
                size={20}
                color={data?.user?.status === 'ACTIVE' ? COLORS.warning : COLORS.success}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={{ padding: 8 }}
              onPress={() => setShowDeleteConfirm(true)}
            >
              <Ionicons name="trash-outline" size={20} color={COLORS.error} />
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 100 }} />
        ) : !data ? (
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.textLight} />
            <Text style={[styles.detailsTitle, { marginTop: 12, textAlign: 'center' }]}>{t('admin.manageUsers.userProfile.loadFailed', 'Failed to load user details')}</Text>
            <TouchableOpacity style={{ marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: COLORS.primary, borderRadius: 8 }} onPress={onClose}>
              <Text style={{ color: '#fff', fontWeight: '600' }}>{t('common.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView contentContainerStyle={{ padding: 20 }}>
            {/* Profile Card */}
            <View style={styles.card}>
              <View style={{ alignItems: 'center', marginBottom: 16 }}>
                <View style={[styles.avatar, { width: 80, height: 80, borderRadius: 40 }]}>
                  {data.user.avatar ? (
                    <Image
                      source={{ uri: data.user.avatar }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                    />
                  ) : (
                    <Text style={{ fontSize: 32, fontWeight: 'bold', color: COLORS.textLight }}>
                      {data.user.name?.[0]}
                    </Text>
                  )}
                </View>
                <Text style={{ fontSize: 13, color: COLORS.primary, fontWeight: '600', marginBottom: 2 }}>
                  @{data.user.role === 'ADMIN' ? 'AltayarVIP' : (data.user.username || 'user')}
                </Text>
                <Text style={styles.bigName}>{data.user.name}</Text>
                <Text style={styles.subText}>{data.user.email}</Text>
                <Text style={styles.subText}>{data.user.phone || t('common.unknown', 'N/A')}</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <View style={[styles.badge, { backgroundColor: '#f1f5f9' }]}>
                    <Text style={{ fontSize: 12, color: COLORS.textLight }}>
                      {String(t(`admin.manageUsers.roles.${data.user.role}`, data.user.role))}
                    </Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: data.user.status === 'ACTIVE' ? '#ecfdf5' : '#fff1f2' }]}>
                    <Text style={{ fontSize: 12, color: data.user.status === 'ACTIVE' ? '#059669' : '#e11d48' }}>
                      {String(t(`admin.manageUsers.status.${data.user.status}`))}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.divider} />
              <View style={[styles.rowBetween, isRTL && styles.rowBetweenRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.memberId', 'Member ID')}</Text>
                <Text style={[styles.value, isRTL && styles.textRTL]}>
                  {data.user.membership_id_display || (data.user.id ? `ALT-${data.user.id.substring(0, 8).toUpperCase()}` : t('common.unknown', 'N/A'))}
                </Text>
              </View>
              <View style={[styles.rowBetween, isRTL && styles.rowBetweenRTL]}>
                <Text style={[styles.label, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.joined', 'Joined')}</Text>
                <Text style={[styles.value, isRTL && styles.textRTL]}>{formatDateSafe(data.user.joined_at)}</Text>
              </View>
            </View>

            {/* Employee Assignment (Only for Customers) */}
            {data.user && data.user.role === 'CUSTOMER' && (
              <View style={styles.card}>
                <View style={[styles.rowBetween, isRTL && styles.rowBetweenRTL]}>
                  <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 8 }, isRTL && { flexDirection: 'row-reverse' }]}>
                    <Ionicons name="people-circle-outline" size={24} color={COLORS.primary} />
                    <Text style={[styles.cardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.assignedEmployee', 'Assigned Employee')}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowAssignModal(true)}
                    style={{ padding: 4, backgroundColor: '#f1f5f9', borderRadius: 4 }}
                  >
                    <Ionicons name="pencil" size={18} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 12 }}>
                  {data.assigned_employee && data.assigned_employee.id && data.assigned_employee.name ? (
                    <View style={{ backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 }}>
                      <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 12 }}>
                        <View style={[styles.avatar, { width: 40, height: 40, borderRadius: 20 }]}>
                          <Text style={styles.avatarText}>{data.assigned_employee.name?.[0]?.toUpperCase() || 'E'}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.employeeName, isRTL && styles.textRTL]}>{data.assigned_employee.name || 'Unknown'}</Text>
                          <Text style={[styles.employeeEmail, isRTL && styles.textRTL]}>{data.assigned_employee.email || ''}</Text>
                        </View>
                        <View style={{ backgroundColor: '#ecfdf5', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ fontSize: 10, color: '#059669', fontWeight: 'bold' }}>{t('admin.manageUsers.status.ACTIVE', 'Active')}</Text>
                        </View>
                      </View>

                      <View style={[styles.actionButtons, isRTL && styles.actionButtonsRTL, { flexDirection: isRTL ? 'row-reverse' : 'row', gap: 8, marginTop: 12, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 12 }]}>
                        <TouchableOpacity
                          style={[styles.changeButton, { flex: 1, backgroundColor: 'white', borderWidth: 1, borderColor: COLORS.border, paddingVertical: 8, borderRadius: 6, alignItems: 'center' }]}
                          onPress={() => setShowAssignModal(true)}
                        >
                          <Text style={[styles.buttonText, { fontSize: 12, fontWeight: '600', color: COLORS.text }]}>{t('common.change', 'Change')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.unassignButton, { flex: 1, backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fecaca', paddingVertical: 8, borderRadius: 6, alignItems: 'center' }]}
                          onPress={() => handleAssignEmployee(null)}
                        >
                          <Text style={[styles.buttonText, { fontSize: 12, fontWeight: '600', color: COLORS.error }]}>{t('common.unassign', 'Unassign')}</Text>
                        </TouchableOpacity>
                      </View>

                      {/* Attribute to Competition Button */}
                      {data.membership && data.membership.status === 'ACTIVE' && (
                        <TouchableOpacity
                          style={{
                            backgroundColor: COLORS.warning,
                            paddingVertical: 10,
                            borderRadius: 6,
                            marginTop: 12,
                            flexDirection: isRTL ? 'row-reverse' : 'row',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            opacity: attributing ? 0.7 : 1
                          }}
                          onPress={() => {
                            console.log('🔘 Attribute Button Pressed');
                            handleAttributeReferral();
                          }}
                          disabled={attributing}
                        >
                          {attributing ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <>
                              <Ionicons name="trophy" size={16} color="white" />
                              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 13 }}>
                                {t('admin.manageUsers.attributeSale', 'Attribute to Competition')}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    <View style={{ alignItems: 'center', padding: 20, backgroundColor: '#f8fafc', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.border }}>
                      <Text style={{ color: COLORS.textLight, marginBottom: 12 }}>
                        {t('admin.manageUsers.noEmployeeAssigned', 'No employee assigned to this customer.')}
                      </Text>
                      <TouchableOpacity
                        style={[styles.assignButton, { flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 6 }]}
                        onPress={() => setShowAssignModal(true)}
                      >
                        <Ionicons name="person-add" size={16} color="white" style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                        <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('admin.manageUsers.assign', 'Assign Employee')}</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Status Grid: Membership, Wallet, Cashback, Points */}
            <View style={{ gap: 12 }}>
              {/* Row 1: Membership & Wallet */}
              <View style={[styles.grid, isRTL && styles.gridRTL]}>
                {/* Membership */}
                <View style={[styles.miniCard, { flex: 1 }, isRTL ? { marginLeft: 8 } : { marginRight: 8 }]}>
                  <Ionicons name="card-outline" size={24} color={COLORS.purple} />
                  <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.membership', 'Membership')}</Text>
                  {data.membership ? (
                    <>
                      <Text style={[styles.highlightValue, {
                        color: getPlanColor(
                          data.membership.plan_code || data.membership.tier_code,
                          data.membership.plan_color
                        )
                      }]}>
                        {data.membership.plan_name}
                      </Text>
                      {data.membership.status === 'PENDING_PAYMENT' ? (
                        <>
                          <View style={{ backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, marginTop: 4 }}>
                            <Text style={{ color: '#92400e', fontSize: 11, fontWeight: '600' }}>
                              {t('admin.manageUsers.pendingPayment', 'Pending Payment')}
                            </Text>
                          </View>
                          <TouchableOpacity
                            style={{ backgroundColor: COLORS.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 6, marginTop: 8 }}
                            onPress={async () => {
                              try {
                                await adminApi.sendPaymentRequest(data.user.id);
                                setToast({ visible: true, message: t('admin.manageUsers.paymentRequestSent', 'Payment request sent successfully!'), type: 'success' });
                              } catch (e) {
                                setToast({ visible: true, message: t('admin.manageUsers.paymentRequestFailed', 'Failed to send payment request'), type: 'error' });
                              }
                            }}
                          >
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: '600', textAlign: 'center' }}>
                              📧 {t('admin.manageUsers.sendPaymentRequest', 'Send Payment Request')}
                            </Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <Text style={styles.miniCardSub}>
                          {t('admin.manageUsers.userProfile.ends')}: {formatDateSafe(data.membership?.end_date)}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.value}>{t('admin.manageUsers.userProfile.notSubscribed', 'Not Subscribed')}</Text>
                  )}
                </View>

                {/* Wallet */}
                <View style={[styles.miniCard, { flex: 1 }, isRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>
                  <Ionicons name="wallet-outline" size={24} color={COLORS.success} />
                  <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.walletBalance', 'Wallet Balance')}</Text>
                  <Text style={[styles.highlightValue, { color: COLORS.success }]}>
                    {data.wallet?.balance ?? 0} {data.wallet?.currency || 'USD'}
                  </Text>
                  <Text style={styles.miniCardSub}>{t('admin.manageUsers.userProfile.available', 'Available')}</Text>
                </View>
              </View>

              {/* Row 2: Cashback & Points */}
              <View style={[styles.grid, isRTL && styles.gridRTL]}>
                {/* Cashback */}
                <View style={[styles.miniCard, { flex: 1 }, isRTL ? { marginLeft: 8 } : { marginRight: 8 }]}>
                  <Ionicons name="gift-outline" size={24} color="#0ea5e9" />
                  <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.cashbackBalance', 'Club Gifts Balance')}</Text>
                  <Text style={[styles.highlightValue, { color: "#0ea5e9" }]}>
                    {data.cashback_balance?.toFixed(2) || '0.00'} USD
                  </Text>
                  <Text style={styles.miniCardSub}>{t('admin.manageUsers.userProfile.available', 'Available')}</Text>
                </View>

                {/* Points */}
                <View style={[styles.miniCard, { flex: 1 }, isRTL ? { marginRight: 8 } : { marginLeft: 8 }]}>
                  <Ionicons name="star-outline" size={24} color={COLORS.warning} />
                  <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.loyaltyPoints', 'Loyalty Points')}</Text>
                  <Text style={[styles.highlightValue, { color: COLORS.warning }]}>
                    {data.points?.current_balance || 0} PTS
                  </Text>
                  <Text style={styles.miniCardSub}>{t('admin.manageUsers.userProfile.totalEarned')}: {data.points?.total_earned || 0}</Text>
                </View>
              </View>

              {/* Row 3: Referrals */}
              <View style={[styles.grid, isRTL && styles.gridRTL]}>
                <View style={[styles.miniCard, { flex: 1 }]}>
                  <Ionicons name="people-outline" size={24} color="#64748b" />
                  <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.referralStats', 'Referral Stats')}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                    <View>
                      <Text style={[styles.highlightValue, { color: "#64748b", fontSize: 16 }]}>
                        {data.referrals?.count || 0}
                      </Text>
                      <Text style={[styles.miniCardSub, { fontSize: 10 }]}>{t('admin.manageUsers.userProfile.totalReferrals', 'Total Referrals')}</Text>
                    </View>
                    <View style={{ width: 1, height: 24, backgroundColor: '#eee' }} />
                    <View>
                      <Text style={[styles.highlightValue, { color: "#64748b", fontSize: 16 }]}>
                        {data.referrals?.points_earned || 0} PTS
                      </Text>
                      <Text style={[styles.miniCardSub, { fontSize: 10 }]}>{t('admin.manageUsers.userProfile.referralPoints', 'Points Earned')}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Row 4: Competition (cards sold per tier) – for employees */}
              {competitionStats !== null && data?.user && (data.user.role === 'EMPLOYEE' || data.user.role === 'ADMIN' || data.user.role === 'SUPER_ADMIN') && (
                <View style={[styles.grid, isRTL && styles.gridRTL, { marginTop: 12 }]}>
                  <View style={[styles.miniCard, { flex: 1, flexDirection: 'column', alignItems: 'flex-start' }]}>
                    <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Ionicons name="trophy-outline" size={24} color={COLORS.warning} />
                      <Text style={[styles.miniCardTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.userProfile.competition', 'Competition (Cards sold)')}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {Array.isArray(competitionStats) && competitionStats.map((tier: { plan_id: string; tier_code?: string; tier_name_en?: string; tier_name_ar?: string; count?: number }) => {
                        const name = isRTL ? (tier.tier_name_ar || tier.tier_name_en || '') : (tier.tier_name_en || tier.tier_name_ar || '');
                        const color = safePlanColor(tier.tier_code);
                        return (
                          <View key={tier.plan_id} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: `${color}15`, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 }}>
                            <Text style={[styles.miniCardSub, { fontSize: 11, color, fontWeight: '600', marginRight: 4 }]} numberOfLines={1}>{name}</Text>
                            <Text style={{ fontSize: 14, fontWeight: '700', color }}>{tier.count ?? 0}</Text>
                          </View>
                        );
                      })}
                      {(!Array.isArray(competitionStats) || competitionStats.length === 0) && (
                        <Text style={[styles.miniCardSub, { fontSize: 12 }]}>{t('employee.competition.noData', 'No completed referrals yet')}</Text>
                      )}
                    </View>
                  </View>
                </View>
              )}
            </View>

            {/* Recent Payments */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>{t('admin.manageUsers.userProfile.recentPayments', 'Recent Payments')}</Text>
            {data.recent_payments?.length > 0 ? (
              data.recent_payments.map((p: any) => (
                <View key={p.id} style={styles.paymentRow}>
                  <View>
                    <Text style={styles.paymentAmount}>{p.amount} {p.currency}</Text>
                    <Text style={styles.paymentDate}>{formatDateSafe(p.date)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <View style={[styles.statusBadge,
                    p.status === 'PAID' ? { backgroundColor: '#ecfdf5' } : { backgroundColor: '#fff1f2' }
                    ]}>
                      <Text style={[styles.statusText,
                      p.status === 'PAID' ? { color: '#059669' } : { color: '#e11d48' }
                      ]}>{String(t(`admin.manageUsers.userProfile.paymentStatus.${p.status}`, p.status))}</Text>
                    </View>
                    <Text style={styles.paymentMethod}>{p.method}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={{ textAlign: 'center', color: COLORS.textLight, marginTop: 12 }}>
                {t('admin.manageUsers.userProfile.noPayments', 'No recent payments')}
              </Text>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </View>

      {/* Block/Unblock Confirmation Modal */}
      <Modal
        visible={showBlockConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBlockConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmHeader}>
              <Ionicons
                name={data?.user?.status === 'ACTIVE' ? "ban" : "checkmark-circle"}
                size={48}
                color={data?.user?.status === 'ACTIVE' ? COLORS.warning : COLORS.success}
              />
              <Text style={[styles.confirmTitle, isRTL && styles.textRTL]}>
                {data?.user?.status === 'ACTIVE' ? t('admin.manageUsers.blockUser', 'Block User?') : t('admin.manageUsers.unblockUser', 'Unblock User?')}
              </Text>
            </View>
            <Text style={[styles.confirmMessage, isRTL && styles.textRTL]}>
              {data?.user?.status === 'ACTIVE'
                ? t('admin.manageUsers.blockConfirmMsg', { name: data?.user?.name }) || `Are you sure you want to block ${data?.user?.name || 'this user'}?`
                : t('admin.manageUsers.unblockConfirmMsg', { name: data?.user?.name }) || `Are you sure you want to unblock ${data?.user?.name || 'this user'}?`
              }
            </Text>
            <View style={[styles.confirmButtons, isRTL && styles.confirmButtonsRTL]}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => setShowBlockConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, data?.user?.status === 'ACTIVE' ? styles.blockBtn : styles.unblockBtn]}
                onPress={performBlock}
                disabled={blocking}
              >
                {blocking ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.blockBtnText}>
                    {data?.user?.status === 'ACTIVE' ? t('admin.manageUsers.block', 'Block') : t('admin.manageUsers.unblock', 'Unblock')}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal Layer */}
      <Modal
        visible={showDeleteConfirm}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmContent}>
            <View style={styles.confirmHeader}>
              <Ionicons name="warning" size={48} color={COLORS.error} />
              <Text style={[styles.confirmTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.deleteConfirmTitle')}</Text>
            </View>
            <Text style={[styles.confirmMessage, isRTL && styles.textRTL]}>
              {t('admin.manageUsers.deleteConfirmMsg')}
            </Text>
            <View style={[styles.confirmButtons, isRTL && styles.confirmButtonsRTL]}>
              <TouchableOpacity
                style={[styles.confirmBtn, styles.cancelBtn]}
                onPress={() => setShowDeleteConfirm(false)}
              >
                <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, { backgroundColor: COLORS.error }]}
                onPress={performDeleteUser}
              >
                <Text style={styles.blockBtnText}>{t('common.delete')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Local Toast Inside Modal */}
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type as any}
        onHide={() => setLocalToast({ ...toast, visible: false })}
      />
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

function PlanBadge({ code, name, color }: any) {
  const shortCode = getShortCode(code, name);
  const badgeColor = getPlanColor(code, color, shortCode);

  // Display plan name with correct color
  return (
    <View style={{ paddingHorizontal: 8, paddingVertical: 4, backgroundColor: badgeColor, borderRadius: 12 }}>
      <Text style={{ color: 'white', fontSize: 11, fontWeight: 'bold' }}>{name}</Text>
    </View>
  );
}

function AssignEmployeeModal({ visible, onClose, onAssign, currentEmployeeId }: { visible: boolean; onClose: () => void; onAssign: (id: string | null) => void; currentEmployeeId?: string | null }) {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (visible) {
      loadEmployees();
    }
  }, [visible]);

  const loadEmployees = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getEmployees();
      setEmployees(res);
    } catch (e) {
      console.error("Failed to load employees", e);
    } finally {
      setLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e =>
    !search ||
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (employeeId: string | null) => {
    try {
      console.log('👤 Employee selected:', employeeId);
      setAssigning(true);
      await onAssign(employeeId);
      console.log('✅ Assignment completed');
      // onAssign handles close and toast
    } catch (e) {
      console.error('❌ Selection error:', e);
      setAssigning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={[styles.modalHeader, isRTL && styles.modalHeaderRTL]}>
          <Text style={[styles.modalTitle, isRTL && styles.textRTL]}>{t('admin.manageUsers.assignEmployee', 'Assign Employee')}</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.modalBody}>
          <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL, { marginBottom: 16, flexDirection: isRTL ? 'row-reverse' : 'row' }]}>
            <Ionicons name="search" size={20} color={COLORS.textLight} style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
            <TextInput
              style={[styles.searchInput, isRTL && styles.searchInputRTL]}
              placeholder={t('admin.manageUsers.searchEmployee', 'Search employee by name or email')}
              value={search}
              onChangeText={setSearch}
              textAlign={isRTL ? 'right' : 'left'}
              placeholderTextColor={COLORS.textLight}
            />
          </View>

          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
              {currentEmployeeId && (
                <TouchableOpacity
                  style={[styles.employeeItem, isRTL && styles.employeeItemRTL, { borderColor: COLORS.error, borderStyle: 'dashed', flexDirection: isRTL ? 'row-reverse' : 'row' }]}
                  onPress={() => handleSelect(null)}
                  disabled={assigning}
                >
                  <View style={[styles.avatar, { backgroundColor: '#fee2e2' }]}>
                    <Ionicons name="person-remove" size={20} color={COLORS.error} />
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.unassignText, isRTL && styles.textRTL, { color: COLORS.error, fontWeight: 'bold' }]}>
                      {t('admin.manageUsers.unassign', 'Unassign Current Employee')}
                    </Text>
                  </View>
                  {assigning && <ActivityIndicator size="small" color={COLORS.error} />}
                </TouchableOpacity>
              )}

              {filteredEmployees.map(emp => (
                <TouchableOpacity
                  key={emp.id}
                  style={[
                    styles.employeeItem,
                    isRTL && styles.employeeItemRTL,
                    currentEmployeeId === emp.id && styles.employeeItemActive
                  ]}
                  onPress={() => handleSelect(emp.id)}
                  disabled={assigning}
                >
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{(emp.name?.[0] || 'E').toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1, marginHorizontal: 12 }}>
                    <Text style={[styles.employeeName, isRTL && styles.textRTL]}>{emp.name || 'Unknown'}</Text>
                    <Text style={[styles.employeeEmail, isRTL && styles.textRTL]}>{emp.email || ''}</Text>
                    <Text style={[styles.employeeRole, isRTL && styles.textRTL]}>{emp.role || ''}</Text>
                  </View>
                  {currentEmployeeId === emp.id && (
                    <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              ))}

              {filteredEmployees.length === 0 && (
                <Text style={{ textAlign: 'center', color: COLORS.textLight, marginTop: 20 }}>
                  {t('common.noResults', 'No employees found')}
                </Text>
              )}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  pageTitle: {
    fontSize: 20,
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
  addBtnText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Filter Bar
  filterBar: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    flexDirection: 'row',
    gap: 12,
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
    marginLeft: 8,
    fontSize: 14,
    color: COLORS.text,
  },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
  },
  filterBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  // Stats Cards
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 20,
    gap: 12,
  },
  statCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 0,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  // List
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
  emptyText: {
    textAlign: 'center',
    padding: 32,
    color: COLORS.textLight,
    fontSize: 14,
  },
  userMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textLight,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: '85%',
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
    justifyContent: 'center',
    paddingVertical: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginRight: 4,
  },
  // Filter Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  filterModalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  filterModalContentRTL: {

  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textLight,
    marginBottom: 12,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  chipsContainerRTL: {
    flexDirection: 'row-reverse',
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chipActive: {
    backgroundColor: '#eff6ff',
    borderColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    color: COLORS.text,
  },
  chipTextActive: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  applyFiltersBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyFiltersBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  // User Details Modal
  detailsContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  closeBtn: {
    padding: 4,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bigName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 12,
    color: COLORS.text,
  },
  subText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: 16,
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rowBetweenRTL: {
    flexDirection: 'row-reverse',
  },
  label: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
  },
  grid: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  gridRTL: {
    flexDirection: 'row-reverse',
  },
  miniCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
  },
  miniCardTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 8,
  },
  highlightValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    textAlign: 'center',
  },
  miniCardSub: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  paymentRow: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  paymentMethod: {
    fontSize: 11,
    color: COLORS.textLight,
    marginTop: 4,
  },
  // Confirm Modal Styles
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2000,
  },
  confirmContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  confirmHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 12,
  },
  confirmMessage: {
    fontSize: 15,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  confirmBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#e2e8f0',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  deleteBtn: {
    backgroundColor: '#ef4444',
  },
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  blockBtn: {
    backgroundColor: COLORS.warning,
  },
  unblockBtn: {
    backgroundColor: COLORS.success,
  },
  blockBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // RTL Styles
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  addBtnRTL: {
    flexDirection: 'row-reverse',
  },
  statsGridRTL: {
    flexDirection: 'row-reverse',
  },
  filterBarRTL: {
    flexDirection: 'row-reverse',
  },
  searchContainerRTL: {
    flexDirection: 'row-reverse',
  },
  searchInputRTL: {
    textAlign: 'right',
  },
  textRTL: {
    textAlign: 'right',
  },
  userMetaRTL: {
    flexDirection: 'row-reverse',
  },
  detailsBtnRTL: {
    flexDirection: 'row-reverse',
  },
  statCardRTL: {
    alignItems: 'flex-end',
  },
  // Assign Employee Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalBody: {
    flex: 1,
    padding: 20,
  },
  employeeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  employeeItemActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#eff6ff',
  },
  employeeName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  employeeEmail: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  employeeRole: {
    fontSize: 11,
    color: COLORS.primary,
    marginTop: 2,
    backgroundColor: '#eff6ff',
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  // Additional RTL styles
  employeeInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButtonsRTL: {
    flexDirection: 'row-reverse',
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  changeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  unassignButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  unassignText: {
    color: COLORS.error,
    fontWeight: 'bold',
  },
  employeeItemRTL: {
    flexDirection: 'row-reverse',
  },
  modalHeaderRTL: {
    flexDirection: 'row-reverse',
  },
});
