import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../../../src/contexts/LanguageContext';
import { adminApi } from '../../../../src/services/api';
import Toast from '../../../../src/components/Toast';

const COLORS = {
  primary: "#0891b2",
  secondary: "#06b6d4",
  background: "#f8fafc",
  cardBg: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  border: "#e2e8f0",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

const TIER_IMAGES: Record<string, any> = {
  silver: require('../../../../assets/images/silver.png'),
  gold: require('../../../../assets/images/gold.png'),
  platinum: require('../../../../assets/images/platinum.png'),
  vip: require('../../../../assets/images/vip.png'),
  diamond: require('../../../../assets/images/diamond.png'),
  business: require('../../../../assets/images/business.png'),
};

const normalizeCode = (c: string) => {
  const uc = c?.toUpperCase() || '';
  const lc = c?.toLowerCase() || '';
  // Handle 2-letter prefixes from database (SM, GM, PM, VM, DM, BM)
  if (uc.startsWith('VM') || lc.includes('vip')) return 'vip';
  if (uc.startsWith('GM') || lc.includes('gold')) return 'gold';
  if (uc.startsWith('PM') || lc.includes('platinum')) return 'platinum';
  if (uc.startsWith('DM') || lc.includes('diamond')) return 'diamond';
  if (uc.startsWith('BM') || lc.includes('business')) return 'business';
  if (uc.startsWith('SM') || lc.includes('silver')) return 'silver';
  return lc; // fallback
};

export default function MembershipBenefitsList() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState<any[]>([]);
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' });

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getAllMemberships();
      if (res && Array.isArray(res)) {
        // Sort by price
        const sorted = [...res].sort((a, b) => (a.price || 0) - (b.price || 0));
        setPlans(sorted);
      }
    } catch (error) {
      console.log('Error loading plans:', error);
      setToast({ visible: true, message: t('common.error', 'Error loading plans'), type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    router.push('/(admin)/memberships/benefits/create' as any);
  };

  const handleEdit = (planId: string) => {
    router.push({
      pathname: '/(admin)/memberships/benefits/create' as any,
      params: { planId }
    } as any);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>
          {t('admin.membershipBenefits', 'Membership Benefits')}
        </Text>
        <TouchableOpacity
          style={[styles.createBtnHeader, isRTL && styles.createBtnHeaderRTL]}
          onPress={handleCreate}
        >
          <Ionicons name="add" size={20} color="white" />
          <Text style={styles.createBtnHeaderText}>
            {t('common.create', 'Create')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Plans List */}
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="diamond-outline" size={64} color={COLORS.textLight} />
            <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
              {t('admin.noMembershipPlans', 'No membership plans found. Create a plan first.')}
            </Text>
          </View>
        ) : (
          <View style={styles.pagesList}>
            {plans.map((plan) => {
              const planName = language === 'ar'
                ? (plan.tier_name_ar || plan.plan_name_ar || plan.name_ar)
                : (plan.tier_name_en || plan.plan_name_en || plan.name_en);
              const displayName = planName || plan.tier_name_en || plan.tier_name_ar || plan.plan_name_en || plan.plan_name_ar || plan.name || plan.tier_code || 'Unnamed Plan';
              return (
                <TouchableOpacity
                  key={plan.id}
                  style={[styles.pageCard, isRTL && styles.pageCardRTL]}
                  onPress={() => handleEdit(plan.id)}
                >
                  <View style={[styles.pageInfo, isRTL && styles.pageInfoRTL]}>
                    <View style={styles.pageIcon}>
                      <Image
                        source={TIER_IMAGES[normalizeCode(plan.tier_code)] || TIER_IMAGES.silver}
                        style={styles.tierImage}
                        resizeMode="contain"
                      />
                    </View>
                    <View style={styles.pageDetails}>
                      <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>
                        {displayName}
                      </Text>
                      <Text style={[styles.pageSubtitle, isRTL && styles.textRTL]}>
                        {t('admin.benefitsPage', 'Benefits Page')} • {plan.tier_code || 'N/A'}
                      </Text>
                    </View>
                  </View>
                  <Ionicons
                    name={isRTL ? "chevron-back" : "chevron-forward"}
                    size={20}
                    color={COLORS.textLight}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </View>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerRTL: {
    flexDirection: 'row-reverse',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
    marginHorizontal: 12,
  },
  createBtnHeader: {
    backgroundColor: COLORS.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  createBtnHeaderRTL: {
    flexDirection: 'row-reverse',
  },
  createBtnHeaderText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  pagesList: {
    gap: 12,
  },
  pageCard: {
    backgroundColor: COLORS.cardBg,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  pageCardRTL: {
    flexDirection: 'row-reverse',
  },
  pageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  pageInfoRTL: {
    flexDirection: 'row-reverse',
  },
  pageIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}05`, // More subtle background for images
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  tierImage: {
    width: 40,
    height: 40,
  },
  pageDetails: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  pageSubtitle: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 16,
    textAlign: 'center',
  },
  textRTL: {
    textAlign: 'right',
  },
});
