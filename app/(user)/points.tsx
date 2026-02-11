import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Platform, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';
import { useAuth } from '../../src/contexts/AuthContext';
import { pointsApi } from '../../src/services/api';
import { LinearGradient } from 'expo-linear-gradient';
import { isMembershipActive } from '../../src/utils/membership';

const COLORS = {
  primary: '#f59e0b', // Amber/Gold for Points
  secondary: '#fff7ed',
  background: '#f0f9ff',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
  success: '#10b981',
};

export default function PointsPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const { isRTL, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const isMember = isMembershipActive(user);
  const [loading, setLoading] = useState(true);
  const [balanceData, setBalanceData] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isMember) {
      setLoading(false);
      setRefreshing(false);
      return;
    }
    loadData();
  }, [isMember]);

  const loadData = async () => {
    try {
      const [balanceRes, historyRes] = await Promise.allSettled([
        pointsApi.getBalance(),
        pointsApi.getTransactions()
      ]);

      if (balanceRes.status === 'fulfilled') {
        setBalanceData(balanceRes.value);
      }
      if (historyRes.status === 'fulfilled') {
        setTransactions(historyRes.value);
      }
    } catch (error) {
      console.error('Error loading points data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const currentPoints = (balanceData as any)?.current_balance || 0;
  const totalEarned = (balanceData as any)?.total_earned || 0;
  // Use plan_name from user context as truth
  const tier = user?.membership?.plan_name_en || (balanceData as any)?.tier || 'Member';

  // Progress Calculation 
  const goal = totalEarned > 0 ? totalEarned : 5000;
  const progress = Math.min((currentPoints / (totalEarned || 1)) * 100, 100);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('points.title', 'My Points')}</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {!isMember ? (
            <LinearGradient colors={['#0f172a', '#334155', '#64748b']} style={styles.lockedCard}>
              <View style={[styles.lockedHeaderRow, isRTL && styles.lockedHeaderRowRTL]}>
                <View style={[styles.lockIconWrap]}>
                  <Ionicons name="lock-closed" size={20} color="#fff" />
                </View>
                <Text style={[styles.lockedTitle, isRTL && styles.textRTL]}>
                  {t('membership.locked.title', 'Subscribe to unlock')}
                </Text>
              </View>

              <Text style={[styles.lockedBody, isRTL && styles.textRTL]}>
                {t('membership.locked.body', 'Subscribe to explore the app and access all features.')}
              </Text>

              <TouchableOpacity
                style={[styles.lockedBtn, isRTL && styles.lockedBtnRTL]}
                onPress={() => router.push('/(user)/memberships-explore')}
                activeOpacity={0.85}
              >
                <Text style={styles.lockedBtnText}>
                  {t('membership.locked.cta', 'View memberships')}
                </Text>
                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color="#0f172a" />
              </TouchableOpacity>
            </LinearGradient>
          ) : (
            <>
          {/* Main Card */}
          <LinearGradient
            colors={['#f59e0b', '#d97706']}
            style={styles.mainCard}
          >
            <View style={styles.tierBadge}>
              <Ionicons name="diamond" size={16} color="#fff" style={{ marginEnd: 4 }} />
              <Text style={styles.tierText}>
                {tier ? (`${t(`membershipTiers.${tier.toLowerCase().replace(' membership', '').replace(' plan', '').trim()}.name`, tier)} ${t('common.membership', 'Membership')}`).toUpperCase() : ''}
              </Text>
            </View>

            <Text style={styles.label}>{t('dashboard.availablePoints', 'Available Points')}</Text>
            <Text style={styles.balance}>{currentPoints}</Text>

            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => router.push('/(user)/points-history')}
            >
              <Text style={styles.actionBtnText}>{t('common.history', 'Points History')}</Text>
            </TouchableOpacity>
          </LinearGradient>

          {/* Progress Section */}
          <View style={styles.sectionCard}>
            <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{t('points.progress', 'Progress to Next Tier')}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={[styles.progressText, isRTL && styles.textRTL]}>
              {currentPoints} / {goal} {t('common.pts')}
            </Text>
          </View>

          {/* History Section Preview */}
          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, isRTL && styles.textRTL]}>{t('points.history', 'Points History')}</Text>
            {transactions.slice(0, 5).map((item, index) => (
              <View key={index} style={[styles.historyItem, isRTL && styles.rowRTL]}>
                <View style={[styles.iconContainer, { backgroundColor: item.points > 0 ? '#dcfce7' : '#fee2e2' }]}>
                  <Ionicons
                    name={item.points > 0 ? "add" : "remove"}
                    size={20}
                    color={item.points > 0 ? COLORS.success : '#ef4444'}
                  />
                </View>
                <View style={{ flex: 1, marginHorizontal: 12 }}>
                  <Text style={[styles.historyDesc, isRTL && styles.textRTL]}>
                    {language === 'ar' ? (item.description_ar || item.description) : (item.description_en || item.description || item.transaction_type)}
                  </Text>
                  <Text style={[styles.historyDate, isRTL && styles.textRTL]}>
                    {new Date(item.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </Text>
                </View>
                <Text style={[styles.historyAmount, { color: item.points > 0 ? COLORS.success : '#ef4444' }]}>
                  {item.points > 0 ? "+" : ""}{item.points}
                </Text>
              </View>
            ))}
            {transactions.length === 0 && (
              <Text style={styles.emptyText}>{t('common.noTransactions')}</Text>
            )}
          </View>

            </>
          )}
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
    flexDirection: 'row-reverse',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 110,
  },
  mainCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  tierText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  label: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    marginBottom: 4,
  },
  balance: {
    color: '#fff',
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  actionBtn: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  sectionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 12,
  },
  textRTL: {
    textAlign: 'right',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#e2e8f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  historySection: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
    marginBottom: 16,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyDesc: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  historyDate: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    padding: 20,
  },
  lockedCard: {
    borderRadius: 18,
    padding: 18,
    overflow: 'hidden',
  },
  lockedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lockedHeaderRowRTL: {
    flexDirection: 'row-reverse',
  },
  lockIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  lockedTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    flex: 1,
  },
  lockedBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '600',
    lineHeight: 20,
  },
  lockedBtn: {
    marginTop: 14,
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  lockedBtnRTL: {
    flexDirection: 'row-reverse',
  },
  lockedBtnText: {
    color: '#0f172a',
    fontWeight: '900',
  },
});
