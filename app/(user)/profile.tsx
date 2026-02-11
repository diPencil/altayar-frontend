import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Image, Alert, Dimensions, Platform, SafeAreaView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { cashbackApi, walletApi, pointsApi, api } from "../../src/services/api";
import NotificationBell from "../../src/components/NotificationBell";
import * as ImagePicker from 'expo-image-picker';
import { isMembershipActive } from "../../src/utils/membership";
import Toast from "../../src/components/Toast";

const { width } = Dimensions.get('window');

const COLORS = {
  primary: "#1071b8",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  gold: "#f59e0b",
  error: "#ef4444",
};

const DISPLAY_NAMES: any = {
  silver: { en: 'Silver', ar: 'فضي' },
  gold: { en: 'Gold', ar: 'ذهبي' },
  platinum: { en: 'Platinum', ar: 'بلاتينيوم' },
  vip: { en: 'VIP', ar: 'VIPMember' },
  diamond: { en: 'Diamond', ar: 'الماسية' },
  business: { en: 'Business', ar: 'البزنس' }
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { user, logout, isAuthenticated, refreshUser } = useAuth();
  const insets = useSafeAreaInsets();
  const isMember = isMembershipActive(user as any);

  const [plans, setPlans] = useState<any[]>([]);
  const [balances, setBalances] = useState({
    wallet: 0,
    cashback: 0,
    points: 0,
    totalEarned: 0,
    referrals: 0,
    loading: true
  });
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [membershipProgress, setMembershipProgress] = useState({
    currentPoints: 0,
    pointsNeeded: 1000,
    targetPoints: 0,
    nextTier: 'Platinum',
    nextTierAr: 'بلاتينيوم',
    currentTierName: '',
    currentTierNameAr: '',
    relativeCurrentPoints: 0,
    relativeTotalRange: 0,
    progressPercent: 0,
    loading: true
  });

  // Toast State
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' | 'info' });
  const [avatarError, setAvatarError] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ visible: true, message, type });
  };

  const userName = user ? `${user.first_name} ${user.last_name}` : t('common.guest');
  const userEmail = user?.email || "guest@example.com";
  const userPhone = user?.phone || "";

  // Fetch plans on mount
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await api.get('/memberships/plans');
        if (Array.isArray(response)) {
          setPlans(response);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };
    fetchPlans();
  }, []);

  const calculateMembershipProgress = () => {
    try {
      if (!plans.length) return;

      const currentPoints = balances.totalEarned || 0; // Use Total Earned for progress
      const spendablePoints = balances.points || 0;

      // Helper for normalization
      const normalizeCode = (c: string | undefined) => {
        const uc = c?.toUpperCase() || '';
        const lc = c?.toLowerCase() || '';
        if (uc.startsWith('VM') || lc.includes('vip')) return 'vip';
        if (uc.startsWith('PM') || lc.includes('platinum')) return 'platinum';
        if (uc.startsWith('DM') || lc.includes('diamond')) return 'diamond';
        if (uc.startsWith('BM') || lc.includes('business')) return 'business';
        if (uc.startsWith('GM') || lc.includes('gold')) return 'gold';
        if (uc.startsWith('SM') || lc.includes('silver')) return 'silver';
        return lc;
      };

      // 1. Sort plans by points required
      const sortedPlans = [...plans].sort((a, b) => {
        const pointsA = a.perks?.points || a.price || 0;
        const pointsB = b.perks?.points || b.price || 0;
        return pointsA - pointsB;
      });

      // 2. Determine Current Tier
      const userTierCode = normalizeCode(user?.membership?.tier_code);
      let currentTierIndex = sortedPlans.findIndex(p => normalizeCode(p.tier_code) === userTierCode);

      // Fallback: Find by points
      if (currentTierIndex === -1) {
        currentTierIndex = sortedPlans.findIndex((p, index) => {
          const planPoints = p.perks?.points || p.price || 0;
          const nextPlan = sortedPlans[index + 1];
          const nextPoints = nextPlan ? (nextPlan.perks?.points || nextPlan.price || 0) : Infinity;
          return currentPoints >= planPoints && currentPoints < nextPoints;
        });
      }

      // Default to first tier if not found
      if (currentTierIndex === -1) currentTierIndex = 0;

      const currentTier = sortedPlans[currentTierIndex];
      const nextTier = sortedPlans[currentTierIndex + 1];

      // 3. Calculate Progress
      let progressPercent = 0;
      let pointsNeeded = 0;
      let startPoints = currentTier?.perks?.points || currentTier?.price || 0;
      let targetPoints = 0;

      if (nextTier) {
        targetPoints = nextTier.perks?.points || nextTier.price || 0;

        // Use Absolute Progress (User Request)
        if (targetPoints > 0) {
          progressPercent = (currentPoints / targetPoints) * 100;
        } else {
          progressPercent = 100;
        }

        progressPercent = Math.min(100, Math.max(0, progressPercent));
      } else {
        progressPercent = 100; // Max tier
        targetPoints = startPoints;
      }

      // Helper to clean names (remove 'Membership' suffix)
      const cleanName = (name: string) => name?.replace(/\s+Membership/i, '').trim() || '';

      const nextNameRaw = nextTier?.tier_name_en || '';
      const nextNameArRaw = nextTier?.tier_name_ar || '';
      const currNameRaw = currentTier?.tier_name_en || '';
      const currNameArRaw = currentTier?.tier_name_ar || '';

      const nextDisplayName = DISPLAY_NAMES[normalizeCode(nextTier?.tier_code)]?.[language === 'ar' ? 'ar' : 'en'] || cleanName(nextNameRaw);
      const nextDisplayNameAr = DISPLAY_NAMES[normalizeCode(nextTier?.tier_code)]?.ar || cleanName(nextNameArRaw);

      const currDisplayName = DISPLAY_NAMES[normalizeCode(currentTier?.tier_code)]?.[language === 'ar' ? 'ar' : 'en'] || (language === 'ar' ? cleanName(currNameArRaw) : cleanName(currNameRaw));
      const currDisplayNameAr = DISPLAY_NAMES[normalizeCode(currentTier?.tier_code)]?.ar || cleanName(currNameArRaw);

      setMembershipProgress({
        currentPoints: currentPoints,
        pointsNeeded: Math.max(0, targetPoints - currentPoints),
        targetPoints: targetPoints,
        nextTier: nextDisplayName,
        nextTierAr: nextDisplayNameAr,
        currentTierName: currDisplayName,
        currentTierNameAr: currDisplayNameAr,
        relativeCurrentPoints: 0,
        relativeTotalRange: 0,
        progressPercent: Math.round(progressPercent),
        loading: false
      });
    } catch (error) {
      console.error('Error calculating membership progress:', error);
      // Fallback
      setMembershipProgress({
        currentPoints: 0,
        pointsNeeded: 0,
        targetPoints: 0,
        nextTier: 'Unknown',
        nextTierAr: 'غير معروف',
        currentTierName: 'Unknown',
        currentTierNameAr: 'غير معروف',
        relativeCurrentPoints: 0,
        relativeTotalRange: 0,
        progressPercent: 0,
        loading: false
      });
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadBalances();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!balances.loading && isMember && plans.length > 0) {
      calculateMembershipProgress();
    }
    if (!isMember) {
      setMembershipProgress((prev: any) => ({ ...prev, loading: false }));
    }
  }, [balances.loading, balances.totalEarned, isMember, user?.membership, plans, language]);

  // Reset avatar error when user changes
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const loadBalances = async () => {
    try {
      setBalances((prev: any) => ({ ...prev, loading: true }));

      const [walletRes, cashbackRes, pointsRes, referralsRes] = await Promise.allSettled([
        walletApi.getBalance(),
        cashbackApi.getBalance(),
        pointsApi.getBalance(),
        api.get('/referrals/stats').catch(() => ({ total_referrals: 0 }))
      ]);

      const newBalances = {
        wallet: 0,
        cashback: 0,
        points: 0,
        totalEarned: 0,
        referrals: 0,
        loading: false
      };

      if (walletRes.status === 'fulfilled') {
        const val = walletRes.value as any;
        newBalances.wallet = val?.balance || val?.total || 0;
      }

      if (cashbackRes.status === 'fulfilled') {
        const val = cashbackRes.value as any;
        newBalances.cashback = val?.available || val?.total || val?.balance || 0;
      }

      if (pointsRes.status === 'fulfilled') {
        const val = pointsRes.value as any;
        newBalances.points = val?.current_balance || val?.balance || 0;
        newBalances.totalEarned = val?.total_earned || val?.total_points || 0;
      }

      if (referralsRes.status === 'fulfilled') {
        const val = referralsRes.value as any;
        newBalances.referrals = val?.total_referrals || val?.totalReferrals || 0;
      }

      setBalances(newBalances);
    } catch (error) {
      console.log('Error loading balances:', error);
      setBalances((prev: any) => ({ ...prev, loading: false }));
    }
  };

  const handleAvatarChange = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        showToast(t('common.error') + ': Permission to access gallery is required', 'error');
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingAvatar(true);

        // Convert to base64
        const response = await fetch(result.assets[0].uri);
        const blob = await response.blob();
        const reader = new FileReader();

        reader.onloadend = async () => {
          const base64data = reader.result as string;

          try {
            // Upload to backend
            await api.put('/auth/me', {
              avatar: base64data
            });

            // Refresh user data
            await refreshUser();

            showToast(t('common.success') + ': Profile picture updated successfully', 'success');
          } catch (error: any) {
            showToast(t('common.error') + ': ' + (error.message || 'Failed to update profile picture'), 'error');
          } finally {
            setUploadingAvatar(false);
          }
        };

        reader.readAsDataURL(blob);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      showToast(t('common.error') + ': Failed to pick image', 'error');
      setUploadingAvatar(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Home Style Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <Image
          source={{ uri: 'https://customer-assets.emergentagent.com/job_viptraveller/artifacts/hsqancxd_altayarlogo.png' }}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={[styles.headerRight, isRTL && styles.headerRightRTL]}>
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Text style={styles.langText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
          </TouchableOpacity>
          <View style={styles.iconBtn}>
            <NotificationBell size={24} color={COLORS.white} />
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => router.push("/(user)/profile-view")}
          >
            {user?.avatar && !avatarError ? (
              <Image
                source={{ uri: user.avatar }}
                style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.white }}
                onError={() => {
                  console.log('Header avatar failed to load');
                  setAvatarError(true);
                }}
              />
            ) : (
              <Ionicons name="person-circle" size={36} color={COLORS.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Profile Card Header */}
        <View style={styles.headerContainer}>
          <LinearGradient
            colors={[COLORS.primary, "#0e7490"]}
            style={styles.profileCard}
          >
            {/* Decorative Elements */}
            <View style={styles.cardDecoration} />
            <Ionicons
              name="airplane"
              size={120}
              color="rgba(255,255,255,0.05)"
              style={styles.cardIconDecor}
            />

            <View style={[styles.cardTop, isRTL && styles.rowRTL]}>
              <View style={styles.avatarWrapper}>
                <View style={styles.avatar}>
                  {user?.avatar && !avatarError ? (
                    <Image
                      source={{ uri: user.avatar }}
                      style={{ width: 80, height: 80, borderRadius: 40 }}
                      onError={() => {
                        console.log('Profile card avatar failed to load');
                        setAvatarError(true);
                      }}
                    />
                  ) : (
                    <Ionicons name="person" size={40} color={COLORS.primary} />
                  )}
                  {uploadingAvatar && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color={COLORS.white} />
                    </View>
                  )}
                </View>
                <TouchableOpacity
                  style={[styles.editAvatar, isRTL && styles.editAvatarRTL]}
                  onPress={handleAvatarChange}
                  disabled={uploadingAvatar}
                >
                  <Ionicons name="camera" size={14} color={COLORS.white} />
                </TouchableOpacity>
              </View>

              <View style={[styles.userInfo, isRTL && styles.userInfoRTL]}>
                <Text style={styles.profileName}>{userName}</Text>
                <Text style={styles.usernameText}>
                  {t("common.usernameHandle", { username: user?.username || t("common.user") })}
                </Text>
              </View>
            </View>

            <View style={styles.cardDivider} />

            <View style={[styles.cardBottom, isRTL && styles.rowRTL]}>
              <View>
                <Text style={styles.cardLabel}>{t('common.memberId')}</Text>
                <Text style={styles.memberIdText}>
                  {isMember ? ((user as any)?.membership_id_display || "--") : "--"}
                </Text>
              </View>
              {isMember ? (
                <View style={[styles.memberBadge, isRTL && styles.memberBadgeRTL]}>
                  <Ionicons name="diamond" size={14} color={COLORS.gold} />
                  <Text style={[styles.memberText, isRTL && styles.memberTextRTL]}>
                    {(language === 'ar' ? user?.membership?.plan_name_ar : user?.membership?.plan_name_en) ||
                      (DISPLAY_NAMES[(user?.membership?.tier_code || '').toLowerCase()]?.[language === 'ar' ? 'ar' : 'en'] as any) ||
                      t("common.na", "--")}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[styles.memberBadge, isRTL && styles.memberBadgeRTL]}
                  onPress={() => router.push("/(user)/memberships-explore" as any)}
                  activeOpacity={0.85}
                >
                  <Ionicons name="lock-closed" size={14} color={COLORS.gold} />
                  <Text style={[styles.memberText, isRTL && styles.memberTextRTL]}>
                    {t("membership.locked.title", "Subscribe to unlock")}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Stats Grid */}
        {isAuthenticated && (
          <View style={[styles.statsGrid, isRTL && styles.statsGridRTL]}>
            {balances.loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={COLORS.primary} />
              </View>
            ) : (
              <>
                <BalanceCard
                  icon="wallet-outline"
                  label={t("dashboard.wallet")}
                  value={balances.wallet.toFixed(0)}
                  color="#0ea5e9"
                  isRTL={isRTL}
                />
                <BalanceCard
                  icon="star-outline"
                  label={t("dashboard.points")}
                  value={balances.points.toString()}
                  color="#f59e0b"
                  isRTL={isRTL}
                />
                <BalanceCard
                  icon="gift-outline"
                  label={t("dashboard.cashback")}
                  value={balances.cashback.toFixed(0)}
                  color="#10b981"
                  isRTL={isRTL}
                />
                <BalanceCard
                  icon="people-outline"
                  label={t('profile.referrals')}
                  value={balances.referrals.toString()}
                  color="#8b5cf6"
                  isRTL={isRTL}
                />
              </>
            )}
          </View>
        )}

        {/* Membership Journey Section */}
        {isAuthenticated && (
          <View style={styles.journeySection}>
            <View style={[styles.sectionHeader, isRTL && styles.rowRTL]}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t('profile.membershipJourney')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  isMember
                    ? router.push("/(user)/membership-journey" as any)
                    : router.push("/(user)/memberships-explore" as any)
                }
              >
                <Text style={styles.viewDetailText}>{t('common.details')}</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.journeyCard}>
              {!isMember ? (
                <>
                  <View style={[styles.lockedJourneyRow, isRTL && styles.rowRTL]}>
                    <Ionicons name="lock-closed" size={18} color={COLORS.primary} />
                    <Text style={[styles.currentTierText, isRTL && styles.textRTL]}>
                      {t("membership.locked.title", "Subscribe to unlock")}
                    </Text>
                  </View>
                  <Text style={[styles.lockedJourneyBody, isRTL && styles.textRTL]}>
                    {t("membership.locked.body", "Subscribe to explore the app and access all features.")}
                  </Text>
                  <TouchableOpacity
                    style={[styles.lockedJourneyBtn, isRTL && styles.lockedJourneyBtnRTL]}
                    onPress={() => router.push("/(user)/memberships-explore" as any)}
                  >
                    <Text style={styles.lockedJourneyBtnText}>
                      {t("membership.locked.cta", "View memberships")}
                    </Text>
                    <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={16} color={COLORS.primary} />
                  </TouchableOpacity>
                </>
              ) : membershipProgress.loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <>
                  <View style={[styles.journeyInfo, isRTL && styles.rowRTL]}>
                    <Text style={[styles.currentTierText, isRTL && styles.textRTL]}>
                      {t('profile.currentPlan', 'Current Plan')}: {language === 'ar' ? membershipProgress.currentTierNameAr : membershipProgress.currentTierName}
                    </Text>
                    <Text style={[styles.nextTierText, isRTL && styles.textRTL]}>
                      {membershipProgress.progressPercent >= 100
                        ? `🎉 ${t('profile.maxLevel')}`
                        : `${t('profile.nextGoal', 'Next')}: ${language === 'ar' ? membershipProgress.nextTierAr : membershipProgress.nextTier}`}
                    </Text>
                  </View>
                  <View style={styles.progressBarWrapper}>
                    <LinearGradient
                      colors={['#f59e0b', '#d97706', '#b45309']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={[styles.progressBar, { width: `${Math.max(2, Math.round(membershipProgress.progressPercent))}%` }]}
                    />
                  </View>
                  <Text style={[styles.progressLabels, isRTL && styles.textRTL]}>
                    {membershipProgress.progressPercent >= 100
                      ? (t('profile.congratulationsMaxLevel'))
                      : (`${membershipProgress.currentPoints.toLocaleString()} / ${membershipProgress.targetPoints.toLocaleString()} ${t('common.pts', 'PTS')}`)}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}

        {/* Quick Actions Grid */}
        <View style={styles.quickActionsSection}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL, { marginStart: 16, marginBottom: 16 }]}>
            {t('profile.quickActions')}
          </Text>
          <View style={[styles.quickActionsGrid, isRTL && styles.rowRTL]}>
            {[
              { icon: 'pricetags', label: t('profile.clubOffers'), color: '#8b5cf6', route: "/(user)/for-you" },
              { icon: 'add-circle', label: t('profile.addFunds'), color: '#10b981', route: "/(user)/wallet" },
              { icon: 'share-social', label: t('profile.refer'), color: '#3b82f6', route: "/(user)/refer" },
              { icon: 'time', label: t('profile.activity'), color: '#f59e0b', route: "/(user)/orders" },
            ].map((action, idx) => (
              <TouchableOpacity
                key={idx}
                style={styles.quickActionItem}
                onPress={() => router.push(action.route as any)}
              >
                <LinearGradient
                  colors={[`${action.color}20`, `${action.color}05`]}
                  style={styles.quickActionIcon}
                >
                  <Ionicons name={action.icon as any} size={28} color={action.color} />
                </LinearGradient>
                <Text style={styles.quickActionLabel}>{action.label}</Text>
                <View style={styles.actionArrow}>
                  <Ionicons name={isRTL ? "chevron-back" : "chevron-forward"} size={12} color={COLORS.textLight} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Language Switcher */}
        <TouchableOpacity
          style={[styles.languageBtn, isRTL && styles.languageBtnRTL]}
          onPress={() => router.push("/(user)/language")}
        >
          <Ionicons name="language" size={22} color={COLORS.primary} />
          <Text style={[styles.languageLabel, isRTL && styles.languageLabelRTL]}>
            {t("common.language")}
          </Text>
          <View style={[styles.languageValue, isRTL && styles.languageValueRTL]}>
            <Text style={styles.langText}>
              {language === 'ar' ? t("common.arabic") : t("common.english")}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={20}
              color={COLORS.lightGray}
            />
          </View>
        </TouchableOpacity>

        {/* Menu Items */}
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            label={t("profile.personalInfo")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/personal-info")}
          />
          <MenuItem
            icon="card-outline"
            label={t("profile.paymentMethods")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/payment-methods" as any)}
          />
          <MenuItem
            icon="wallet-outline"
            label={t("profile.myWallet")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/wallet")}
          />
          <MenuItem
            icon="star-outline"
            label={t("profile.myPoints")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/points")}
          />
          <MenuItem
            icon="gift-outline"
            label={t("profile.myCashback")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/club-gifts")}
          />
          <MenuItem
            icon="airplane-outline"
            label={t("common.myBookings", "My Bookings")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/bookings")}
          />
          <MenuItem
            icon="heart-outline"
            label={t("common.favorites")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/favorites")}
          />
          <MenuItem
            icon="document-text-outline"
            label={t("profile.myInvoices")}
            isRTL={isRTL}
            isLast
            onPress={() => router.push("/(user)/invoices")}
          />
        </View>

        <View style={styles.menuSection}>
          <MenuItem
            icon="lock-closed-outline"
            label={t("profile.security")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/security")}
          />
          <MenuItem
            icon="notifications-outline"
            label={t("profile.notificationSettings")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/notifications-settings")}
          />
          <MenuItem
            icon="help-circle-outline"
            label={t("profile.helpSupport")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/help-center")}
          />
          <MenuItem
            icon="information-circle-outline"
            label={t("profile.about")}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/about")}
            isLast
          />
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, isRTL && styles.logoutBtnRTL]}
          onPress={logout}
        >
          <Ionicons name="log-out-outline" size={22} color={COLORS.error} />
          <Text style={[styles.logoutText, isRTL && styles.logoutTextRTL]}>
            {t("common.logout")}
          </Text>
        </TouchableOpacity>

        {/* Admin/Employee Switch */}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <TouchableOpacity
            style={[styles.adminSwitch, isRTL && styles.adminSwitchRTL]}
            onPress={() => router.push("/(admin)")}
          >
            <Ionicons name="shield" size={20} color={COLORS.primary} />
            <Text style={[styles.adminSwitchText, isRTL && styles.adminSwitchTextRTL]}>
              {t("profile.switchToAdmin")}
            </Text>
          </TouchableOpacity>
        )}

        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <TouchableOpacity
            style={[styles.adminSwitch, isRTL && styles.adminSwitchRTL]}
            onPress={() => router.push("/(employee)")}
          >
            <Ionicons name="briefcase" size={20} color={COLORS.gold} />
            <Text style={[styles.adminSwitchText, isRTL && styles.adminSwitchTextRTL, { color: COLORS.gold }]}>
              {t("profile.employeePanel")}
            </Text>
          </TouchableOpacity>
        )}

        {/* Employee Back Button */}
        {user?.role === "EMPLOYEE" && (
          <TouchableOpacity
            style={[styles.adminSwitch, isRTL && styles.adminSwitchRTL]}
            onPress={() => router.push("/(employee)")}
          >
            <Ionicons name="briefcase" size={20} color={COLORS.gold} />
            <Text style={[styles.adminSwitchText, isRTL && styles.adminSwitchTextRTL, { color: COLORS.gold }]}>
              {t("profile.backToEmployee", "Back to Employee Panel")}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.version}>
          <Text style={styles.versionText}>
            {t("app.name")} {t("common.tiers.VIP")} {t("profile.version")} 1.0.0
          </Text>
        </View>
      </ScrollView>
      <Toast
        visible={toast.visible}
        message={toast.message}
        type={toast.type}
        onHide={() => setToast(prev => ({ ...prev, visible: false }))}
      />
    </SafeAreaView>
  );
}

function MenuItem({ icon, label, isRTL, isLast, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.menuItem, isRTL && styles.menuItemRTL, !isLast && styles.menuItemBorder]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={22} color={COLORS.textLight} />
      <Text style={[styles.menuLabel, isRTL && styles.menuLabelRTL]}>{label}</Text>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={20}
        color={COLORS.lightGray}
      />
    </TouchableOpacity>
  );
}

function BalanceCard({ icon, label, value, color, isRTL, fullWidth }: any) {
  return (
    <View style={[styles.balanceCard, fullWidth && { width: '100%' }, isRTL && styles.rowRTL]}>
      <View style={[styles.balanceIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <View style={[styles.balanceContent, isRTL && styles.alignEnd]}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <Text style={[styles.balanceValue, { color: color }]}>{value}</Text>
      </View>
      <Ionicons
        name={isRTL ? "chevron-back" : "chevron-forward"}
        size={16}
        color={COLORS.lightGray}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 15,
    paddingTop: 10,
    borderBottomStartRadius: 30,
    borderBottomEndRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 10,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  logoImage: {
    width: 120,
    height: 40,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerRightRTL: {
    flexDirection: "row-reverse",
  },
  langBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  langText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 14,
  },
  iconBtn: {
    position: "relative",
  },
  profileBtn: {},
  headerContainer: {
    padding: 16,
    paddingTop: 10,
  },
  profileCard: {
    borderRadius: 24,
    padding: 24,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 8,
  },
  cardDecoration: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardIconDecor: {
    position: 'absolute',
    bottom: -20,
    right: -20,
    transform: [{ rotate: '-45deg' }],
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  editAvatar: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: COLORS.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.white,
  },
  editAvatarRTL: {
    left: 0,
    right: undefined,
  },
  userInfo: {
    marginStart: 16,
    flex: 1,
  },
  userInfoRTL: {
    marginStart: 0,
    marginEnd: 16,
    alignItems: 'flex-end',
  },
  profileName: {
    color: COLORS.white,
    fontSize: 22,
    fontWeight: 'bold', marginBottom: 4,
  },
  usernameText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginVertical: 16,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginBottom: 4,
  },
  memberIdText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  memberBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  memberBadgeRTL: {
    flexDirection: 'row-reverse',
  },
  memberText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  memberTextRTL: {},
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 8,
    gap: 12,
    marginBottom: 10,
  },
  statsGridRTL: {
    flexDirection: 'row-reverse',
  },
  loadingContainer: {
    flex: 1,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    flex: 1,
    minWidth: (width - 48) / 2,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  balanceIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceContent: {
    flex: 1,
  },
  alignEnd: {
    alignItems: 'flex-end',
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  journeySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  viewDetailText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  journeyCard: {
    backgroundColor: COLORS.background, // Or a very light blue?
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  journeyInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentTierText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  nextTierText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  progressBarWrapper: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  lockedJourneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  lockedJourneyBody: {
    color: COLORS.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  lockedJourneyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  lockedJourneyBtnRTL: {
    flexDirection: 'row-reverse',
  },
  lockedJourneyBtnText: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  quickActionsSection: {
    marginBottom: 24,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  quickActionItem: {
    width: (width - 44) / 2,
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  quickActionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  quickActionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  actionArrow: {
    position: 'absolute',
    top: 12,
    right: 12,
    opacity: 0.5,
  },
  languageBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  languageBtnRTL: {
    flexDirection: "row-reverse",
  },
  languageLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginStart: 12,
  },
  languageLabelRTL: {
    marginStart: 0,
    marginEnd: 12,
    textAlign: "right",
  },
  languageValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  languageValueRTL: {
    flexDirection: "row-reverse",
  },
  menuSection: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  menuItemRTL: {
    flexDirection: "row-reverse",
  },
  menuItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    marginStart: 12,
  },
  menuLabelRTL: {
    marginStart: 0,
    marginEnd: 12,
    textAlign: "right",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fee2e2",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  logoutBtnRTL: {
    flexDirection: "row-reverse",
  },
  logoutText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "bold",
  },
  logoutTextRTL: {},
  adminSwitch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#e0f2fe",
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 16,
    borderRadius: 16,
    gap: 8,
  },
  adminSwitchRTL: {
    flexDirection: "row-reverse",
  },
  adminSwitchText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  adminSwitchTextRTL: {},
  version: {
    alignItems: "center",
    marginBottom: 20,
  },
  versionText: {
    color: COLORS.textLight,
    fontSize: 12,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textRTL: {
    textAlign: 'right',
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    borderRadius: 40,
  }
});
