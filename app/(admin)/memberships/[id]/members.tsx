import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, FlatList, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { adminApi } from "../../../../src/services/api";
import { useTranslation } from "react-i18next";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useLanguage } from "../../../../src/contexts/LanguageContext";
import Toast from "../../../../src/components/Toast";
import { TextInput } from "react-native";

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

export default function MembershipMembers() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const { isRTL, isReady } = useLanguage();
  const params = useLocalSearchParams();
  const planId = params.id as string;

  const [members, setMembers] = useState<any[]>([]);
  const [filteredMembers, setFilteredMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [plan, setPlan] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });

  useEffect(() => {
    loadPlanAndMembers();
  }, [planId]);

  useEffect(() => {
    filterMembers();
  }, [members, searchQuery]);

  const loadPlanAndMembers = async () => {
    try {
      setLoading(true);


      let planData = null;
      let membersData = [];

      // Load members of this plan (this API returns both plan and members)
      const membersResponse = await adminApi.getMembershipMembers(planId);

      // Extract both plan and members from the response
      planData = membersResponse.plan;
      membersData = membersResponse.members || [];

      // If we still don't have plan data, try the separate plan API as fallback
      if (!planData) {
        const planResponse = await adminApi.getMembershipPlan(planId);
        planData = planResponse.plan;
      }

      // Set the data
      setPlan(planData);
      setMembers(membersData);


    } catch (error: any) {
      console.error('Error loading plan and members:', error);
      console.error('Error details:', error.response?.data || error.message);

      // Set empty data on error
      setPlan(null);
      setMembers([]);

      setToast({
        visible: true,
        message: `Failed to load data: ${error.response?.data?.detail || error.message}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMembers = () => {
    if (!searchQuery.trim()) {
      setFilteredMembers(members);
      return;
    }

    const filtered = members.filter(member =>
      member.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone?.includes(searchQuery)
    );
    setFilteredMembers(filtered);
  };

  const handleShowMemberCard = (member: any) => {
    router.push({
      pathname: '/(admin)/memberships/member-card',
      params: {
        memberId: member.id,
        planId: planId,
        memberData: JSON.stringify(member),
        planData: JSON.stringify(plan)
      }
    });
  };

  const renderMemberRow = ({ item: member, index }: { item: any; index: number }) => (
    <View style={[styles.memberRow]}>
      <View style={styles.memberInfo}>
        <Text style={[styles.memberName, isRTL && styles.textRTL]}>{member.name || 'N/A'}</Text>
        <Text style={[styles.memberEmail, isRTL && styles.textRTL]}>{member.email}</Text>
        <Text style={[styles.memberPhone, isRTL && styles.textRTL]}>{member.phone || 'N/A'}</Text>
      </View>

      <View style={styles.memberStatus}>
        <View style={[styles.statusBadge, member.membership?.status === 'ACTIVE' ? styles.activeBadge : styles.inactiveBadge]}>
          <Text style={[styles.statusText, member.membership?.status === 'ACTIVE' ? styles.activeText : styles.inactiveText]}>
            {member.membership?.status === 'ACTIVE' ? t('memberCard.active', 'Active') :
              member.membership?.status === 'EXPIRED' ? t('memberCard.expired', 'Expired') :
                member.membership?.status === 'SUSPENDED' ? t('memberCard.suspended', 'Suspended') :
                  member.membership?.status === 'CANCELLED' ? t('memberCard.cancelled', 'Cancelled') :
                    member.membership?.status === 'PENDING' ? t('memberCard.pending', 'Pending') :
                      (member.membership?.status || 'UNKNOWN')}
          </Text>
        </View>
        {member.membership?.end_date && (
          <Text style={[styles.expiryText, isRTL && styles.textRTL]}>
            {t('common.expires', 'Expires')}: {new Date(member.membership.end_date).toLocaleDateString()}
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.cardButton]}
        onPress={() => handleShowMemberCard(member)}
      >
        <Ionicons name="card-outline" size={20} color={COLORS.primary} />
        <Text style={styles.cardButtonText}>{t('common.card', 'Card')}</Text>
      </TouchableOpacity>
    </View>
  );

  // Wait for language to be ready
  if (!isReady || !i18n.isInitialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>{t('admin.common.loading', 'Loading...')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={[styles.header]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={24} color={COLORS.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>
            {t('manageMemberships.members', 'Members')}
          </Text>
          <Text style={[styles.membersCount, isRTL && styles.textRTL]}>
            {filteredMembers.length} {t('manageMemberships.members', 'Members')}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textLight} style={styles.searchIcon} />
        <TextInput
          style={[styles.searchInput, isRTL && styles.textRTL]}
          placeholder={t('admin.manageUsers.searchPlaceholder', 'Search by name, email, or phone')}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={COLORS.textLight}
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textLight} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Members List */}
      <View style={styles.membersContainer}>
        {filteredMembers.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
              {searchQuery ? t('admin.common.noResults', 'No results found') : t('manageMemberships.noMembers', 'No members in this plan')}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredMembers}
            keyExtractor={(item) => item.id}
            renderItem={renderMemberRow}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast({ ...toast, visible: false })}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.textLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },

  backButton: {
    padding: 8,
    marginEnd: 16,
  },
  headerContent: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  membersCount: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchIcon: {
    marginEnd: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  membersContainer: {
    flex: 1,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardBg,
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },

  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  memberEmail: {
    fontSize: 14,
    color: COLORS.textLight,
    marginBottom: 2,
  },
  memberPhone: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  memberStatus: {
    alignItems: 'center',
    marginEnd: 16,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  activeBadge: {
    backgroundColor: COLORS.success,
  },
  inactiveBadge: {
    backgroundColor: COLORS.error,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeText: {
    color: COLORS.cardBg,
  },
  inactiveText: {
    color: COLORS.cardBg,
  },
  expiryText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  cardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },

  cardButtonText: {
    color: COLORS.cardBg,
    fontSize: 14,
    fontWeight: '600',
    marginStart: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
});
