import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  Platform,
  Alert,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { walletApi, pointsApi, cashbackApi, ordersApi, bookingsApi, offersApi, Offer, api, resolveReelMediaUrl, rewriteBackendMediaUrl } from "../../src/services/api";
import { reelsService, Reel } from "../../src/services/reels";
import NotificationBell from "../../src/components/NotificationBell";
import Video from 'expo-av/build/Video';
import { ResizeMode } from 'expo-av/build/Video.types';
import { initiateBookingPayment, initiateOrderPayment } from "../../src/services/paymentHelpers";
import { formatCurrency } from "../../src/utils/currency";
import { formatCurrencyLabel } from "../../src/utils/currencyLabel";
import { isMembershipActive } from "../../src/utils/membership";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width } = Dimensions.get("window");

const COLORS = {
  primary: "#1071b8",
  primaryDark: "#0e7490",
  secondary: "#167dc1",
  accent: "#f59e0b",
  gold: "#d4a537",
  silver: "#9ca3af",
  background: "#f0f9ff",
  white: "#ffffff",
  gray: "#64748b",
  lightGray: "#e2e8f0",
  text: "#1e293b",
  textLight: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

interface UserData {
  wallet: number;
  points: number;
  pointsTotal: number;
  cashback: number;
}

export default function UserDashboard() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const isMember = isMembershipActive(user);
  const [activeSlide, setActiveSlide] = useState(0);
  const [userData, setUserData] = useState<UserData>({
    wallet: 0,
    points: 0,
    pointsTotal: 0,
    cashback: 0,
  });
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const MEMBERSHIP_TIERS = [
    { id: 'silver', name: t('membershipTiers.silver.name'), icon: require('../../assets/images/silver.png'), color: '#4b5563', bgColor: '#f1f5f9' },
    { id: 'gold', name: t('membershipTiers.gold.name'), icon: require('../../assets/images/gold.png'), color: '#92400e', bgColor: '#fef3c7' },
    { id: 'platinum', name: t('membershipTiers.platinum.name'), icon: require('../../assets/images/platinum.png'), color: '#6b21a8', bgColor: '#f3e8ff' },
    { id: 'vip', name: t('membershipTiers.vip.name'), icon: require('../../assets/images/vip.png'), color: '#064e3b', bgColor: '#d1fae5' },
    { id: 'diamond', name: t('membershipTiers.diamond.name'), icon: require('../../assets/images/diamond.png'), color: '#0369a1', bgColor: '#e0f2fe' },
    { id: 'business', name: t('membershipTiers.business.name'), icon: require('../../assets/images/business.png'), color: '#991b1b', bgColor: '#fee2e2' },
  ];
  const [walletCurrency, setWalletCurrency] = useState('USD');
  const [forYouOffers, setForYouOffers] = useState<Offer[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [featuredOffers, setFeaturedOffers] = useState<Offer[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [latestReels, setLatestReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [loadingPaymentDetails, setLoadingPaymentDetails] = useState(false);
  const [saveCard, setSaveCard] = useState(true);
  const [avatarError, setAvatarError] = useState(false);

  // Auto-play Effect
  useEffect(() => {
    if (isAutoPlayPaused || featuredOffers.length === 0) return;

    const interval = setInterval(() => {
      if (flatListRef.current && featuredOffers.length > 0) {
        let nextSlide = activeSlide + 1;
        if (nextSlide >= featuredOffers.length) {
          nextSlide = 0; // Loop back to start
        }

        // Use exact mathematical offset to prevent RTL Coordinate conflicts
        const offset = nextSlide * width;
        flatListRef.current.scrollToOffset({ offset, animated: true });
        setActiveSlide(nextSlide);
      }
    }, 4500); 

    return () => clearInterval(interval);
  }, [activeSlide, isAutoPlayPaused, featuredOffers.length, isRTL, language]);

  const flatListRef = useRef<any>(null);

  // Load user data from API if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDashboardData();
    }
  }, [isAuthenticated, language]); // Reload on language change for translated offers

  // Reset avatar error when user changes (e.g., switching from employee to user view)
  useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Parallel data fetching
      const [walletRes, pointsRes, cashbackRes, offersRes, featuredRes, transactionsRes, reelsRes] = await Promise.allSettled([
        walletApi.getBalance(),
        pointsApi.getBalance(),
        cashbackApi.getBalance(),
        offersApi.getMyOffers(), // Use user-specific offers instead of public
        offersApi.getFeatured(),
        walletApi.getTransactions(),
        reelsService.getReels(0, 10), // Get latest 10 reels
      ]);

      // Update User Stats
      setUserData({
        wallet: walletRes.status === 'fulfilled' ? (walletRes.value as any)?.balance || 0 : 0,
        points: pointsRes.status === 'fulfilled' ? (pointsRes.value as any)?.current_balance || 0 : 0,
        pointsTotal: pointsRes.status === 'fulfilled' ? (pointsRes.value as any)?.total_earned || 0 : 0,
        cashback: cashbackRes.status === 'fulfilled' ? (cashbackRes.value as any)?.available || 0 : 0,
      });

      // Set wallet currency
      if (walletRes.status === 'fulfilled') {
        setWalletCurrency((walletRes.value as any)?.currency || 'USD');
      }

      // Update Featured Offers (Banners)
      let featuredList: Offer[] = [];
      if (featuredRes.status === 'fulfilled') {
        featuredList = featuredRes.value || [];
        setFeaturedOffers(featuredList);
      }

      // Update Offers (Split logic)
      if (offersRes.status === 'fulfilled') {
        const allOffers = offersRes.value || [];
        const nonFeatured = allOffers.filter(o => !featuredList.some(f => f.id === o.id));

        // Split into "For You" (Targeted/Marketing) and "Special Offers" (Global/Admin)
        // Now using explicit offer_source field for separation as requested
        const targeted = nonFeatured.filter(o => o.offer_source === 'MARKETING');
        const global = nonFeatured.filter(o => !o.offer_source || o.offer_source === 'ADMIN');

        setForYouOffers(targeted);
        setOffers(global);
      }

      // Update Transactions / Payments (Fetch UNPAID Orders + Bookings)
      // Combine both unpaid orders and unpaid bookings for "Payments" section
      try {
        // Get all orders and filter client-side to handle all unpaid statuses
        const [allOrders, pendingBookings] = await Promise.all([
          ordersApi.getMyOrders().catch(() => []),
          bookingsApi.getMyBookings().then((bookings: any[]) =>
            bookings.filter((b: any) => {
              const status = (b.status || '').toUpperCase();
              const paymentStatus = (b.payment_status || '').toUpperCase();
              return (status === 'PENDING' || status === 'CONFIRMED') &&
                paymentStatus === 'UNPAID';
            })
          ).catch(() => [])
        ]);

        // Filter orders client-side to include UNPAID and PARTIALLY_PAID
        const pendingOrders = allOrders.filter((order: any) => {
          const ps = (order.payment_status || '').toUpperCase();
          return ps === 'UNPAID' || ps === 'PARTIALLY_PAID';
        });

        // Debug logging for payment statuses
        console.log('All Orders:', allOrders.map(o => ({ id: o.id, status: o.payment_status, number: o.order_number })));
        console.log('Pending Orders:', pendingOrders.map(o => ({ id: o.id, status: o.payment_status, number: o.order_number })));
        console.log('Pending Bookings:', pendingBookings.map(b => ({ id: b.id, status: b.payment_status })));

        // Merge and mark type for rendering
        const allPending = [
          ...(pendingOrders || []).map((o: any) => ({ ...o, _type: 'order' })),
          ...(pendingBookings || []).map((b: any) => ({ ...b, _type: 'booking' }))
        ];

        // Sort by created_at or due_date
        allPending.sort((a: any, b: any) => {
          const dateA = new Date(a.due_date || a.created_at || 0).getTime();
          const dateB = new Date(b.due_date || b.created_at || 0).getTime();
          return dateB - dateA; // Newest first
        });

        setTransactions(allPending);
      } catch (e) {
        console.log("Error fetching pending payments", e);
      }

      // Update Latest Reels
      if (reelsRes.status === 'fulfilled') {
        setLatestReels(reelsRes.value || []);
      } else {
        console.log("Error fetching reels:", reelsRes);
        setLatestReels([]);
      }

    } catch (error) {
      console.log('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  }, []);

  const openPaymentDetails = async (item: any) => {
    setPaymentModalVisible(true);
    setLoadingPaymentDetails(true);
    try {
      const isBooking = item._type === 'booking';
      if (isBooking) {
        // Fetch booking details
        const details = await bookingsApi.getBooking(item.id);
        setSelectedPayment({ ...details, _type: 'booking' });
      } else {
        // Fetch order details
        const details = await ordersApi.getOrder(item.id);
        setSelectedPayment({ ...details, _type: 'order' });
      }
    } catch (error) {
      console.log('Error loading payment details:', error);
    } finally {
      setLoadingPaymentDetails(false);
    }
  };

  const handleModalPay = async () => {
    if (!selectedPayment) return;

    try {
      const isBooking = selectedPayment._type === 'booking';
      const userName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : 'Guest';
      const userEmail = user?.email || 'guest@example.com';

      // Don't close modal yet - wait for successful payment initiation
      if (isBooking) {
        await initiateBookingPayment(selectedPayment, userEmail, userName, saveCard);
      } else {
        await initiateOrderPayment(selectedPayment, userEmail, userName, saveCard);
      }

      // Only close modal after successful navigation to payment screen
      setPaymentModalVisible(false);
    } catch (error: any) {
      console.log('Error initiating payment:', error);
      Alert.alert(
        'خطأ في الدفع',
        error?.message || error?.response?.data?.detail || 'حدث خطأ أثناء بدء عملية الدفع. يرجى المحاولة مرة أخرى.',
        [{ text: 'حسناً' }]
      );
      // Keep modal open on error so user can try again
    }
  };

  const userName = user?.first_name || t('common.guest');

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Image
          source={{ uri: 'https://customer-assets.emergentagent.com/job_viptraveller/artifacts/hsqancxd_altayarlogo.png' }}
          style={styles.logoImage}
          resizeMode="contain"
        />
        <View style={[styles.headerRight]}>
          <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
            <Text style={styles.langText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
          </TouchableOpacity>
          <View style={styles.iconBtn}>
            <NotificationBell size={24} color={COLORS.white} />
          </View>

          {/* Profile Menu with Dropdown */}
          <View style={styles.profileMenuWrapper}>
            <TouchableOpacity
              style={styles.profileBtn}
              onPress={() => setShowProfileMenu(!showProfileMenu)}
            >
              {user?.avatar && !avatarError ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: COLORS.white }}
                  onError={() => {
                    console.log('Avatar failed to load');
                    setAvatarError(true);
                  }}
                />
              ) : (
                <Ionicons name="person-circle" size={36} color={COLORS.white} />
              )}
            </TouchableOpacity>

            {/* Dropdown Menu */}
            {showProfileMenu && (
              <View style={[styles.profileDropdown, isRTL ? styles.profileDropdownRTL : styles.profileDropdownLTR]}>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/(user)/member-card');
                  }}
                >
                  <Ionicons name="card" size={20} color={COLORS.primary} />
                  <Text style={[styles.dropdownItemText, isRTL && styles.textRTL]}>
                    {isRTL ? 'بطاقة العضوية' : 'Member Card'}
                  </Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/(user)/profile-view');
                  }}
                >
                  <Ionicons name="person-outline" size={20} color={COLORS.text} />
                  <Text style={[styles.dropdownItemText, isRTL && styles.textRTL]}>
                    {t('common.myAccount', 'My Account')}
                  </Text>
                </TouchableOpacity>
                <View style={styles.dropdownDivider} />
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={async () => {
                    setShowProfileMenu(false);
                    await logout();
                  }}
                >
                  <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
                  <Text style={[styles.dropdownItemText, { color: COLORS.error }, isRTL && styles.textRTL]}>
                    {isRTL ? 'تسجيل خروج' : 'Log Out'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Greeting */}
        <View style={[styles.greeting, isRTL && styles.greetingRTL]}>
          <View style={isRTL ? { alignItems: 'flex-end', width: '100%' } : undefined}>
            <Text style={[styles.greetingText, isRTL && styles.greetingTextRTL]}>
              {t("dashboard.hello")}, {userName}! 👋
            </Text>
            <Text style={[styles.greetingSubtext, isRTL && styles.greetingSubtextRTL]}>
              {t("dashboard.welcomeTo")}
            </Text>
          </View>
          {userName === t('common.guest') && (
            <TouchableOpacity onPress={logout} style={{ backgroundColor: '#ef4444', padding: 8, borderRadius: 8 }}>
              <Text style={{ color: 'white', fontWeight: 'bold' }}>{t('common.logout')}</Text>
            </TouchableOpacity>
          )}
        </View>
        {/* Hero Banner Slider - Dynamic */}
        {featuredOffers.length > 0 ? (
          <View style={{ direction: 'ltr' } as any}>
            <FlatList
              key={`hero-slider-native-${language}`}
              ref={flatListRef}
              data={featuredOffers}
              keyExtractor={(item, index) => (item.id || index).toString()}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.slider}
              onTouchStart={() => setIsAutoPlayPaused(true)}
              onTouchEnd={() => setIsAutoPlayPaused(false)}
              onMomentumScrollEnd={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const slide = Math.round(x / width);
                if (slide >= 0 && slide < featuredOffers.length && slide !== activeSlide) {
                  setActiveSlide(slide);
                }
              }}
              scrollEventThrottle={16}
              renderItem={({ item, index }) => (
                <View style={{ width: width }}>
                  <BannerCard
                    title={language === 'ar' ? item.title_ar : item.title_en}
                    subtitle={item.discount_percentage ? `${item.discount_percentage}% ${t("common.off")}` : (language === 'ar' ? item.description_ar : item.description_en)}
                    image={item.image_url}
                    gradient={index % 2 === 0 ? ["#1071b8", "#167dc1"] : ["#7c3aed", "#a78bfa"]}
                    icon="sunny"
                    isRTL={isRTL}
                    learnMore={t("common.learnMore")}
                    onPress={() => router.push(`/(user)/offer/${item.id}` as any)}
                  />
                </View>
              )}
              initialNumToRender={1}
              maxToRenderPerBatch={2}
              windowSize={3}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
            />

            <View style={styles.dots}>
              {featuredOffers.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, activeSlide === i && styles.dotActive]}
                />
              ))}
            </View>
          </View>
        ) : (
          /* Fallback if no featured deals */
          <View style={[styles.bannerCard, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: 'white', fontSize: 18 }}>{t("dashboard.noOffers")}</Text>
          </View>
        )}

        {/* Membership Card */}
        <MembershipCard isRTL={isRTL} t={t} user={user} language={language} membership={user?.membership} router={router} />

        {/* Quick Stats Row */}
        <View style={[styles.statsRow]}>
          <StatCard
            icon="wallet"
            label={t("dashboard.wallet")}
            value={userData.wallet.toLocaleString()}
            unit={walletCurrency}
            color={COLORS.success}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/wallet-history")}
          />
          <StatCard
            icon="gift"
            label={t("dashboard.cashback")}
            value={userData.cashback.toLocaleString()}
            unit={walletCurrency}
            color={COLORS.primary}
            isRTL={isRTL}
            onPress={() => router.push("/(user)/club-gifts-history")}
          />
        </View>

        {/* Payments Card - Pending Bills */}
        <View style={styles.card}>
          <View style={[styles.cardHeader]}>
            <View style={[styles.cardTitleRow]}>
              <Ionicons name="card" size={22} color={COLORS.primary} />
              <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>
                {t("dashboard.payments")}
              </Text>
              {transactions.length > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{transactions.length}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={() => router.push("/(user)/orders" as any)}>
              <Text style={[styles.cardAction, isRTL && styles.textRTL]}>
                {transactions.length > 1 ? t("common.viewAll") : t("common.history")}
              </Text>
            </TouchableOpacity>
          </View>

          {transactions.length > 0 ? (
            (() => {
              const item = transactions[0]; // Show only first unpaid invoice
              const isBooking = item._type === 'booking';
              const title = isBooking
                ? `${t('common.booking')} ${item.booking_number || item.id?.slice(0, 8)}`
                : `${t('common.invoiceNumber')} ${item.order_number || item.id?.slice(0, 8)}`;
              const dueDate = item.due_date || item.start_date || item.created_at;

              return (
                <TouchableOpacity
                  key={0}
                  style={[styles.paymentItem]}
                  onPress={() => openPaymentDetails(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.paymentIcon, { backgroundColor: "#fee2e2" }]}>
                    {/* Red/Orange icon for Unpaid */}
                    <Ionicons name="alert-circle" size={20} color={COLORS.error} />
                  </View>
                  <View style={[styles.paymentInfo, isRTL && styles.paymentInfoRTL]}>
                    <Text style={[styles.paymentTitle, isRTL && styles.textRTL]}>
                      {title}
                    </Text>
                    <Text style={[styles.paymentDate, isRTL && styles.textRTL]}>
                      {/* Show Due Date if available, else Created Date */}
                      {t('common.due')}: {new Date(dueDate).toLocaleDateString()}
                    </Text>
                  </View>
                  <Text style={[styles.paymentAmount, { color: COLORS.error }, isRTL && styles.textRTL]}>
                    {item.total_amount} {formatCurrencyLabel(item.currency, t)}
                  </Text>
                </TouchableOpacity>
              );
            })()
          ) : (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} style={{ marginBottom: 8 }} />
              <Text style={[styles.emptyText, isRTL && styles.textRTL]}>
                {t("dashboard.noPendingPayments", "No pending payments")}
              </Text>
            </View>
          )}

          {transactions.length > 0 && (
            <TouchableOpacity
              style={[styles.payNowBtn]}
              onPress={() => {
                // Open payment details for the first item
                if (transactions.length > 0) {
                  openPaymentDetails(transactions[0]);
                }
              }}
            >
              <Text style={styles.payNowText}>
                {transactions.length === 1 ?
                  t("common.payNow") :
                  t("common.payAll", "Pay All")
                }
              </Text>
              <Ionicons
                name={isRTL ? "arrow-back" : "arrow-forward"}
                size={18}
                color={COLORS.white}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Points Progress Card */}
        <PointsCard isRTL={isRTL} t={t} points={userData.points} total={userData.pointsTotal} isMember={isMember} />

        {/* Special Offers Section (Global) */}
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t("dashboard.specialOffers")}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(user)/offers")}>
            <Text style={[styles.seeAll, isRTL && styles.textRTL]}>{t("common.seeAll")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.offersScroll}
        >
          {offers.length > 0 ? (
            offers.map((offer, index) => (
              <View key={offer.id || index}>
                <OfferCard
                  title={language === 'ar' ? offer.title_ar : offer.title_en}
                  discount={offer.discount_percentage ? `${offer.discount_percentage}%` : ""}
                  price={offer.discounted_price || offer.original_price}
                  image={offer.image_url || ((offer as any).category === 'hotel' ? 'beach' : 'city')}
                  isRTL={isRTL}
                  currency={offer.currency}
                  offer_type={offer.offer_type}
                  t={t}
                  onNavigate={() => router.push(`/(user)/offer/${offer.id}` as any)}
                />
              </View>
            ))
          ) : (
            <Text style={{ padding: 10, color: COLORS.textLight }}>{t("dashboard.noOffers")}</Text>
          )}
        </ScrollView>

        {/* Membership Description Section */}
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL, { marginTop: 24 }]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t("membershipTiers.title")}
          </Text>
        </View>

        <View style={[styles.membershipGrid]}>
          {MEMBERSHIP_TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              style={[styles.tierCardMinimal, { backgroundColor: tier.bgColor }]}
              onPress={() => router.push({
                pathname: "/(user)/tier-feed",
                params: { tier: tier.id }
              } as any)}
            >
              <View style={styles.tierIconMinimal}>
                <Image source={tier.icon} style={styles.tierIconImage} resizeMode="contain" />
              </View>
              <Text
                style={[styles.tierNameMinimal, isRTL && styles.textRTL, { color: tier.color }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {tier.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* For You Section (Targeted) */}
        <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
            {t("dashboard.forYou")}
          </Text>
          <TouchableOpacity onPress={() => router.push("/(user)/for-you")}>
            <Text style={[styles.seeAll, isRTL && styles.textRTL]}>{t("common.seeAll")}</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.offersScroll}
        >
          {forYouOffers.length > 0 ? (
            forYouOffers.map((offer, index) => (
              <View key={offer.id || index}>
                <OfferCard
                  title={language === 'ar' ? offer.title_ar : offer.title_en}
                  discount={offer.discount_percentage ? `${offer.discount_percentage}%` : ""}
                  price={offer.discounted_price || offer.original_price}
                  image={offer.image_url || ((offer as any).category === 'hotel' ? 'beach' : 'city')}
                  isRTL={isRTL}
                  currency={offer.currency}
                  offer_type={offer.offer_type}
                  t={t}
                  onNavigate={() => router.push(`/(user)/offer/${offer.id}` as any)}
                />
              </View>
            ))
          ) : (
            <Text style={{ padding: 10, color: COLORS.textLight }}>{t("dashboard.noForYouOffers")}</Text>
          )}
        </ScrollView>

        {/* Latest Reels Section */}
        {latestReels.length > 0 && (
          <>
            <View style={[styles.sectionHeader, isRTL && styles.sectionHeaderRTL]}>
              <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
                {t("dashboard.latestReels", "Latest Reels")}
              </Text>
              <TouchableOpacity onPress={() => router.push("/(user)/reels")}>
                <Text style={[styles.seeAll, isRTL && styles.textRTL]}>{t("common.seeAll")}</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.reelsScroll}
            >
              {latestReels.map((reel) => (
                <View key={reel.id}>
                  <ReelCard
                    reel={reel}
                    isRTL={isRTL}
                    t={t}
                    onPress={() => {
                      // Navigate to reels page with specific reel
                      router.push({
                        pathname: "/(user)/reels",
                        params: { reelId: reel.id }
                      } as any);
                    }}
                  />
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* Admin Access - Only show for admins */}
        {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
          <TouchableOpacity
            style={[styles.adminBtn]}
            onPress={() => router.push("/(admin)")}
          >
            <Ionicons name="shield-checkmark" size={20} color={COLORS.primary} />
            <Text style={[styles.adminBtnText, isRTL && styles.adminBtnTextRTL]}>
              {t("dashboard.switchToAdmin")}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={20}
              color={COLORS.gray}
            />
          </TouchableOpacity>
        )}

        {/* Employee Access - Only show for employees */}
        {user?.role === "EMPLOYEE" && (
          <TouchableOpacity
            style={[styles.adminBtn]}
            onPress={() => router.push("/(employee)")}
          >
            <Ionicons name="briefcase" size={20} color={COLORS.gold} />
            <Text style={[styles.adminBtnText, isRTL && styles.adminBtnTextRTL]}>
              {t("dashboard.backToEmployee", "Back to Employee Panel")}
            </Text>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={20}
              color={COLORS.gray}
            />
          </TouchableOpacity>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Payment Details Modal */}
      <Modal visible={paymentModalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={[styles.modalHeader]}>
            <Text style={styles.modalTitle}>{t('invoices.details') || "Payment Details"}</Text>
            <TouchableOpacity onPress={() => setPaymentModalVisible(false)} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {loadingPaymentDetails ? (
            <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 50 }} />
          ) : selectedPayment ? (
            <ScrollView contentContainerStyle={{ padding: 20 }}>
              {/* Header Info */}
              <View style={[styles.detailsSection, { flexDirection: 'row' }]}>
                <Text style={styles.detailsLabel}>
                  {selectedPayment._type === 'booking' ?
                    `#${selectedPayment.booking_number || selectedPayment.id?.slice(0, 8)}` :
                    `#${selectedPayment.order_number || selectedPayment.id?.slice(0, 8)}`}
                </Text>
                <View style={[styles.statusBadge, {
                  backgroundColor: selectedPayment.payment_status === 'PARTIALLY_PAID' ? '#fef3c7' : '#fee2e2'
                }]}>
                  <Text style={[styles.statusText, {
                    color: selectedPayment.payment_status === 'PARTIALLY_PAID' ? COLORS.warning : COLORS.error
                  }]}>
                    {selectedPayment.payment_status === 'PARTIALLY_PAID' ?
                      (t('common.partiallyPaid') || "PARTIALLY PAID") :
                      (t('common.unpaid') || "UNPAID")
                    }
                  </Text>
                </View>
              </View>

              {/* Items Section if available */}
              {selectedPayment.items && selectedPayment.items.length > 0 && (
                <>
                  <Text style={[styles.sectionHeader, isRTL && styles.textRTL]}>{t('admin.manageInvoices.items') || "Items"}</Text>
                  {selectedPayment.items.map((item: any, idx: number) => {
                    const fullDesc = isRTL ? (item.description_ar || item.description) : (item.description_en || item.description);
                    const lines = fullDesc ? fullDesc.split('\n') : [item.service_name || 'Item'];
                    const title = lines[0];
                    const description = lines.length > 1 ? lines.slice(1).join('\n') : '';

                    return (
                      <View key={idx} style={[styles.itemRow]}>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.itemTitle, isRTL && styles.textRTL]}>{title}</Text>
                          {description ? (
                            <Text style={[styles.itemDescription, isRTL && styles.textRTL]}>{description}</Text>
                          ) : null}
                          <Text style={[styles.itemParams, isRTL && styles.textRTL]}>
                            {item.quantity} x {formatCurrency(item.unit_price, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                          </Text>
                        </View>
                        <Text style={[styles.itemTotal, isRTL && styles.textRTL]}>
                          {formatCurrency(item.quantity * item.unit_price, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                        </Text>
                      </View>
                    );
                  })}
                  <View style={styles.divider} />
                </>
              )}

              {/* Financial Summary */}
              <View style={[styles.summaryRow]}>
                <Text style={styles.summaryLabel}>{t('admin.manageInvoices.subtotal') || "Subtotal"}</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(selectedPayment.subtotal || selectedPayment.total_amount, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                </Text>
              </View>

              {selectedPayment.tax_amount > 0 && (
                <View style={[styles.summaryRow]}>
                  <Text style={styles.summaryLabel}>{t('admin.manageInvoices.tax') || "Tax"}</Text>
                  <Text style={styles.summaryValue}>
                    {formatCurrency(selectedPayment.tax_amount, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                  </Text>
                </View>
              )}

              {selectedPayment.discount_amount > 0 && (
                <View style={[styles.summaryRow]}>
                  <Text style={[styles.summaryLabel, { color: COLORS.warning }]}>{t('common.discount') || "Discount"}</Text>
                  <Text style={[styles.summaryValue, { color: COLORS.warning }]}>
                    - {formatCurrency(selectedPayment.discount_amount, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                  </Text>
                </View>
              )}

              <View style={styles.divider} />

              <View style={[styles.totalRow]}>
                <Text style={styles.totalLabelLarge}>{t('orders.total')}</Text>
                <Text style={styles.amountLarge}>
                  {formatCurrency(selectedPayment.total_amount, selectedPayment.currency, isRTL ? 'ar-EG' : 'en-US')}
                </Text>
              </View>

              <View style={[styles.saveCardContainer]}>
                <TouchableOpacity
                  style={[styles.checkbox, saveCard && styles.checkboxChecked]}
                  onPress={() => setSaveCard(!saveCard)}
                >
                  {saveCard && <Ionicons name="checkmark" size={16} color="#fff" />}
                </TouchableOpacity>
                <Text style={[styles.saveCardText, isRTL && styles.textRTL]}>
                  {t('offers.saveCard') || t('membership.saveCard', 'Save card for future payments')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.payBtn, { marginTop: 20 }]}
                onPress={handleModalPay}
              >
                <Text style={styles.payBtnText}>{t('invoices.payNow') || "Pay Now"}</Text>
                <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={20} color="white" style={{ marginStart: 8 }} />
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>
      </Modal>

    </SafeAreaView >
  );
}


function BannerCard({ title, subtitle, image, gradient, icon, isRTL, learnMore, onPress }: any) {
  return (
    <View style={styles.bannerCard} >
      <View style={styles.bannerInner}>
        {image ? (
          <Image source={{ uri: image }} style={[StyleSheet.absoluteFillObject]} resizeMode="cover" />
        ) : (
          <LinearGradient
            colors={gradient as any}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
        )}

        <View style={[styles.bannerContent]}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'flex-start' }}>
            <Text style={[styles.bannerTitle, isRTL && styles.textRTL]} numberOfLines={1} adjustsFontSizeToFit>{title}</Text>
            <Text style={[styles.bannerSubtitle, isRTL && styles.textRTL]} numberOfLines={1}>{subtitle}</Text>
          </View>
          <TouchableOpacity style={styles.bannerBtn} onPress={onPress}>
            <Text style={styles.bannerBtnText}>{learnMore}</Text>
          </TouchableOpacity>
        </View>

        {!image && (
          <Ionicons
            name={icon}
            size={80}
            color="rgba(255,255,255,0.2)"
            style={styles.bannerIcon}
          />
        )}
      </View>
    </View>
  );
}

const TIER_CONFIG: any = {
  silver: { icon: require('../../assets/images/silver.png'), color: '#64748b', gradient: ['#D1D5DB', '#6B7280', '#374151'], lightColor: '#94a3b8' },
  gold: { icon: require('../../assets/images/gold.png'), color: '#b45309', gradient: ['#FFD700', '#F59E0B', '#B45309'], lightColor: '#f59e0b' },
  platinum: { icon: require('../../assets/images/platinum.png'), color: '#7e22ce', gradient: ['#A78BFA', '#7C3AED', '#4C1D95'], lightColor: '#a855f7' },
  vip: { icon: require('../../assets/images/vip.png'), color: '#047857', gradient: ['#34D399', '#059669', '#064E3B'], lightColor: '#10b981' },
  diamond: { icon: require('../../assets/images/diamond.png'), color: '#0369a1', gradient: ['#38BDF8', '#0284C7', '#0C4A6E'], lightColor: '#0ea5e9' },
  business: { icon: require('../../assets/images/business.png'), color: '#b91c1c', gradient: ['#F87171', '#DC2626', '#7F1D1D'], lightColor: '#ef4444' },
};

function MembershipCard({ isRTL, t, user, language, membership, router }: any) {
  const isMember = isMembershipActive(user);

  const LOCKED_CONFIG = {
    gradient: ['#0f172a', '#334155', '#64748b'],
    icon: 'lock-closed' as const,
  };

  // Get membership details or use defaults
  // Use membership_id_display (ALT-XXX) if available, otherwise fallback to membership_number (MEM-XXX)
  const membershipNumber = isMember
    ? (membership?.membership_id_display || membership?.membership_number || '--')
    : '--';

  const planName = isMember ? (language === 'ar' ? membership?.plan_name_ar : membership?.plan_name_en) : '';
  const tierName = isMember ? (planName || t('common.member')) : t('membership.locked.title', 'Subscribe to unlock');

  // Get full name from user object
  const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : t('common.guest');

  // Helper to determine tier config
  const getTierConfig = () => {
    const tier = (membership?.plan_name_en || '').toLowerCase();
    const code = (membership?.tier_code || '').toUpperCase();

    // Check for full names first
    if (tier.includes('vip') || code.startsWith('VM')) return TIER_CONFIG.vip;
    if (tier.includes('platinum') || code.startsWith('PM')) return TIER_CONFIG.platinum;
    if (tier.includes('diamond') || code.startsWith('DM')) return TIER_CONFIG.diamond;
    if (tier.includes('business') || code.startsWith('BM')) return TIER_CONFIG.business;
    if (tier.includes('gold') || code.startsWith('GM')) return TIER_CONFIG.gold;
    if (tier.includes('silver') || code.startsWith('SM')) return TIER_CONFIG.silver;

    // Default fallback
    return TIER_CONFIG.silver;
  };

  const tierConfig = getTierConfig();

  // Format expiry date
  let expiryDisplay = '--/--';
  if (!isMember) {
    expiryDisplay = '--/--';
  } else if (membership?.is_lifetime) {
    expiryDisplay = t('common.lifetime');
  } else if (membership?.expiry_date) {
    const date = new Date(membership.expiry_date);
    expiryDisplay = date.toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  return (
    <LinearGradient
      colors={isMember ? tierConfig.gradient : LOCKED_CONFIG.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.membershipCard}
    >
      {/* Decorative Airplane Icon */}
      <Ionicons
        name={isMember ? "airplane" : LOCKED_CONFIG.icon}
        size={isMember ? 180 : 120}
        color="rgba(255, 255, 255, 0.10)"
        style={{
          position: 'absolute',
          right: isRTL ? undefined : -20,
          left: isRTL ? -20 : undefined,
          top: '50%',
          transform: [{ translateY: isMember ? -90 : -60 }, { rotate: isMember ? '-45deg' : '0deg' }]
        }}
      />

      <View style={[styles.membershipHeader]}>
        <View>
          <Text style={[styles.membershipLabel, isRTL && styles.textRTL]}>
            {t('common.clubMembership')}
          </Text>
          <View style={[styles.membershipTier]}>
            {isMember ? (
              <Image
                source={tierConfig.icon}
                style={{ width: 24, height: 24 }}
                resizeMode="contain"
              />
            ) : (
              <Ionicons name="lock-closed" size={18} color="#fff" />
            )}
            <Text style={[styles.membershipTierText, { color: COLORS.white }]}>
              {isMember ? String(tierName).toUpperCase() : String(tierName)}
            </Text>
          </View>
        </View>
        <View style={styles.membershipLogo}>
          <Text style={styles.membershipLogoText}>{t("app.name")}</Text>
          <Text style={styles.membershipLogoVip}>{t("common.tiers.VIP")}</Text>
        </View>
      </View>

      <View style={[styles.membershipDetails, isRTL && styles.membershipDetailsRTL]}>
        <Text style={[styles.memberName, isRTL && styles.textRTL]}>
          {fullName}
        </Text>
        {isMember ? (
          <Text style={[styles.memberId, isRTL && styles.textRTL]}>
            {t('common.memberId')}: {membershipNumber}
          </Text>
        ) : (
          <Text style={[styles.memberId, isRTL && styles.textRTL]}>
            {t('membership.locked.body', 'Subscribe to explore the app and access all features.')}
          </Text>
        )}
      </View>

      <View style={[styles.membershipFooter]}>
        <View>
          <Text style={[styles.membershipExpLabel, isRTL && styles.textRTL]}>
            {t("dashboard.validUntil")}
          </Text>
          <Text style={[styles.membershipExpDate, isRTL && styles.textRTL]}>
            {expiryDisplay}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.manageBtn}
          onPress={() => {
            if (!isMember) {
              router.push("/(user)/memberships-explore" as any);
              return;
            }

            // Standardized navigation logic matching Membership Tiers list
            const tierCodeRaw = (membership?.tier_code || membership?.plan?.tier_code || '').toUpperCase();
            const planNameRaw = (membership?.plan_name_en || '').toLowerCase();

            // Handle the abbreviations from DB (VM, GM, etc.)
            let tierKey = 'silver';
            let tierCodeFormatted = tierCodeRaw || 'SILVER';

            if (tierCodeRaw.startsWith('VM') || planNameRaw.includes('vip')) tierKey = 'vip';
            else if (tierCodeRaw.startsWith('PM') || planNameRaw.includes('platinum')) tierKey = 'platinum';
            else if (tierCodeRaw.startsWith('DM') || planNameRaw.includes('diamond')) tierKey = 'diamond';
            else if (tierCodeRaw.startsWith('BM') || planNameRaw.includes('business')) tierKey = 'business';
            else if (tierCodeRaw.startsWith('GM') || planNameRaw.includes('gold')) tierKey = 'gold';
            else if (tierCodeRaw.startsWith('SM') || planNameRaw.includes('silver')) tierKey = 'silver';

            console.log('Navigating to membership details:', { tier: tierKey, tier_code: tierCodeFormatted });

            router.push({
              pathname: "/(user)/membership-details",
              params: {
                tier: tierKey,
                tier_code: tierCodeFormatted
              }
            } as any);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.manageBtnText}>
            {isMember
              ? t("membership.benefits", "Membership Benefits")
              : t("membership.locked.cta", "View memberships")}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

function StatCard({ icon, label, value, unit, color, isRTL, onPress }: any) {
  return (
    <TouchableOpacity style={styles.statCard} onPress={onPress}>
      <View style={[styles.statIcon, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={22} color={color} />
      </View>
      <Text style={[styles.statLabel, isRTL && styles.textRTL]}>{label}</Text>
      <View style={[styles.statValue]}>
        <Text style={styles.statNumber}>{value}</Text>
        <Text style={[styles.statUnit, isRTL && styles.statUnitRTL]}>{unit}</Text>
      </View>
    </TouchableOpacity>
  );
}



function PointsCard({ isRTL, t, points, total, isMember }: any) {
  // Logic: 
  // 100% means you have all your earned points (Current == Total).
  // 0% means you spent them all (Current == 0).
  // Denominator is Total Earned.

  if (!isMember) {
    return (
      <LinearGradient
        colors={['#0f172a', '#334155', '#64748b']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.card, styles.pointsLockedCard]}
      >
        <View style={[styles.cardHeader]}>
          <View style={[styles.cardTitleRow]}>
            <Ionicons name="lock-closed" size={22} color="#fff" />
            <Text style={[styles.pointsLockedTitle, isRTL && styles.cardTitleRTL]}>
              {t("dashboard.loyaltyPoints")}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push("/(user)/memberships-explore" as any)}>
            <Text style={styles.pointsLockedAction}>
              {t("membership.locked.cta", "View memberships")}
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.pointsLockedSubtitle, isRTL && styles.textRTL]}>
          {t(
            "dashboard.loyaltyPointsLockedDesc",
            "Subscribe to unlock loyalty points, history, and rewards."
          )}
        </Text>

        <View style={[styles.pointsLockedPreviewRow]}>
          <View style={styles.pointsLockedPreviewPill}>
            <Ionicons name="trophy-outline" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.pointsLockedPreviewText}>{t("common.placeholderDash")}</Text>
          </View>
          <View style={styles.pointsLockedPreviewPill}>
            <Ionicons name="star-outline" size={16} color="rgba(255,255,255,0.9)" />
            <Text style={styles.pointsLockedPreviewText}>{t("common.placeholderDash")}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.pointsLockedBtn]}
          onPress={() => router.push("/(user)/memberships-explore" as any)}
          activeOpacity={0.85}
        >
          <Text style={styles.pointsLockedBtnText}>
            {t("dashboard.unlockPointsCta", "Unlock points")}
          </Text>
          <Ionicons name={isRTL ? "arrow-back" : "arrow-forward"} size={18} color="#0f172a" />
        </TouchableOpacity>
      </LinearGradient>
    );
  }

  // Guard against division by zero if new user with 0 points
  const goal = total > 0 ? total : 5000; // Fallback for display if 0
  const denominator = total > 0 ? total : 1;
  const progress = Math.min(points / denominator, 1);
  const progressPercent = Math.round(progress * 100);

  return (
    <View style={styles.card}>
      <View style={[styles.cardHeader]}>
        <View style={[styles.cardTitleRow]}>
          <Ionicons name="trophy" size={22} color={COLORS.accent} />
          <Text style={[styles.cardTitle, isRTL && styles.cardTitleRTL]}>
            {t("dashboard.loyaltyPoints")}
          </Text>
        </View>
        <TouchableOpacity onPress={() => router.push("/(user)/points-history")}>
          <Text style={styles.cardAction}>{t("common.history")}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.pointsMain}>
        <Text style={styles.pointsValue}>{points.toLocaleString()}</Text>
        <Text style={[styles.pointsLabel, isRTL && styles.textRTL]}>
          {t("dashboard.availablePoints")}
        </Text>
      </View>

      <View style={styles.progressContainer}>
        {/* Progress Bar with orange color as requested */}
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPercent}%`, backgroundColor: COLORS.accent }]} />
        </View>
        <View style={[styles.progressLabels]}>
          <Text style={[styles.progressText, isRTL && styles.textRTL]}>
            {points} / {goal} {t("common.pts")}
          </Text>
          <Text style={[styles.progressText, isRTL && styles.textRTL, { color: COLORS.accent }]}>
            {progressPercent}%
          </Text>
        </View>
      </View>
    </View>
  );
}

function OfferCard({ id, title, discount, price, image, isRTL, currency, offer_type, t, onPress, onNavigate }: any) {
  const bgColors: any = {
    beach: ["#1071b8", "#167dc1"],
    city: ["#8b5cf6", "#a78bfa"],
    desert: ["#f59e0b", "#fbbf24"],
  };

  // Decide image source: network url OR local fallback key
  const imageSource = (image && (image.startsWith('http') || image.startsWith('data:')))
    ? { uri: image }
    : null; // Fallback handled by parent or different component logic if needed
  // But here the parent passed 'beach' or 'city' if image_url was null.
  // Wait, parent logic: image={offer.image_url || 'beach'}
  // So if it's 'beach', image='beach'.

  const isFallback = !imageSource;

  return (
    <TouchableOpacity style={styles.offerCard} onPress={onNavigate}>
      {isFallback ? (
        <LinearGradient
          colors={bgColors[image] || bgColors.beach}
          style={styles.offerImage}
        >
          {discount && (
            <View style={[styles.discountBadge, isRTL && styles.discountBadgeRTL]}>
              <Text style={styles.discountText}>{discount} {t('common.off')}</Text>
            </View>
          )}
        </LinearGradient>
      ) : (
        <Image source={imageSource} style={styles.offerImage} resizeMode="cover">
          {/* Note: Children inside Image is deprecated in some versions but works in RN usually if ImageBG used. 
                 Using View wrapping for badge */}
        </Image>
      )}

      {/* Re-add badge if image was real */}
      {!isFallback && discount && (
        <View style={[styles.discountBadge, { position: 'absolute', top: 12, end: 12 }]}>
          <Text style={styles.discountText}>{discount} {t('common.off')}</Text>
        </View>
      )}

      <View style={[styles.offerInfo, isRTL && styles.offerInfoRTL]}>
        <Text style={[styles.offerTitle, isRTL && styles.textRTL]} numberOfLines={1}>{title}</Text>
        <Text style={[styles.offerPrice, isRTL && styles.textRTL]}>
          {(offer_type === 'BROADCAST' || offer_type === 'OTHER') ? (t('common.readMore')) : `${t('common.from')} ${price} ${formatCurrencyLabel(currency, t)}`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function ReelCard({ reel, isRTL, t, onPress }: { reel: Reel; isRTL: boolean; t: any; onPress: () => void }) {
  // Get thumbnail or video source
  let thumbnailUrl = reel.thumbnail_url;
  let videoSource: string | null = null;

  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;

  // YouTube still image (works without server-side ffmpeg)
  if (!thumbnailUrl && reel.video_url) {
    const match = reel.video_url.match(youtubeRegex);
    if (match?.[1]) {
      thumbnailUrl = `https://img.youtube.com/vi/${match[1]}/mqdefault.jpg`;
    }
  }

  if (reel.video_type === 'UPLOAD' && reel.video_url) {
    videoSource = resolveReelMediaUrl(reel.video_url) ?? null;
  } else if (
    !thumbnailUrl &&
    reel.video_type === 'URL' &&
    reel.video_url &&
    (reel.video_url.startsWith('http://') || reel.video_url.startsWith('https://')) &&
    !youtubeRegex.test(reel.video_url)
  ) {
    videoSource = resolveReelMediaUrl(reel.video_url) ?? null;
  }

  return (
    <TouchableOpacity style={styles.reelCard} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.reelThumbnailContainer}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: rewriteBackendMediaUrl(thumbnailUrl) ?? thumbnailUrl }}
            style={styles.reelThumbnail}
            resizeMode="cover"
          />
        ) : videoSource ? (
          <Video
            source={{ uri: videoSource }}
            style={styles.reelThumbnail}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            useNativeControls={false}
            isMuted={true}
            isLooping={false}
          />
        ) : (
          <View style={[styles.reelThumbnail, styles.reelPlaceholder]}>
            <Ionicons name="videocam" size={32} color="#999" />
          </View>
        )}

        {/* Play overlay */}
        <View style={styles.reelPlayOverlay}>
          <View style={styles.reelPlayButton}>
            <Ionicons name="play" size={20} color="white" />
          </View>
        </View>

        {/* Views count */}
        <View style={styles.reelViewsCount}>
          <Ionicons name="eye" size={12} color="white" />
          <Text style={styles.reelViewsText}>{reel.views_count || 0}</Text>
        </View>
      </View>

      {/* Reel Info */}
      <View style={[styles.reelInfo, isRTL && styles.reelInfoRTL]}>
        <Text style={[styles.reelTitle, isRTL && styles.textRTL]} numberOfLines={2}>
          {reel.title || t('reels.untitled', 'Untitled Reel')}
        </Text>
        <View style={[styles.reelStats]}>
          <View style={styles.reelStat}>
            <Ionicons name="heart" size={12} color="#FF3B30" />
            <Text style={styles.reelStatText}>{reel.likes_count || 0}</Text>
          </View>
          <View style={styles.reelStat}>
            <Ionicons name="chatbubble" size={12} color="#007AFF" />
            <Text style={styles.reelStatText}>{reel.comments_count || 0}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
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

  logoImage: {
    width: 120,
    height: 40,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  badge: {
    backgroundColor: COLORS.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginStart: 6,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeRTL: {
    // start/end handles this
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  profileBtn: {},
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  greeting: {
    marginTop: 20,
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  greetingRTL: {
    alignItems: 'flex-end',
  },
  greetingText: {
    fontSize: 26,
    fontWeight: "bold",
    color: COLORS.text,
  },
  greetingTextRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'flex-end',
  },
  greetingSubtext: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 4,
  },
  greetingSubtextRTL: {
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'flex-end',
  },
  textRTL: {
    textAlign: "right",
  },
  emptyText: {
    textAlign: 'center',
    color: COLORS.textLight,
    fontWeight: '500',
    fontSize: 16,
  },
  slider: {
    marginBottom: 8,
  },
  sliderContent: {
    // No extra padding needed for paging
  },
  bannerCard: {
    width: width,
    height: 180,
    paddingHorizontal: 16,
    overflow: "hidden",
  },
  bannerInner: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    position: 'relative',
  },
  bannerContent: {
    position: 'absolute',
    bottom: 0,
    start: 0,
    end: 0,
    backgroundColor: 'rgba(0,0,0,0.6)', 
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  bannerTitle: {
    fontSize: 18, // Reduced from 24
    fontWeight: "bold",
    color: COLORS.white,
  },
  bannerSubtitle: {
    fontSize: 12, // Reduced from 14
    color: "rgba(255,255,255,0.9)", // Increased opacity for readability
    marginTop: 2,
  },
  bannerBtn: {
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 12, // Reduced from 16
    paddingVertical: 6, // Reduced from 8
    borderRadius: 20,
    marginStart: 12,
  },
  bannerBtnRTL: {
    // marginStart natively flips in RTL
  },
  bannerBtnText: {
    color: COLORS.white,
    fontWeight: "600",
    fontSize: 12,
  },
  bannerIcon: {
    position: "absolute",
    end: 10,
    bottom: 10,
  },
  bannerIconRTL: {
    // start/end handles this
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.lightGray,
    marginHorizontal: 4,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    width: 24,
  },
  membershipCard: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  membershipHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },

  membershipLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1,
  },
  membershipTier: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  membershipTierText: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.gold,
    marginStart: 6,
  },
  membershipTierTextRTL: {
    // handled by logical direction
  },
  manageBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
  },
  manageBtnText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  membershipDetails: {
    marginTop: 24,
  },
  membershipDetailsRTL: {
    // handled by logical direction
  },
  memberName: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.white,
  },
  memberId: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  membershipFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 20,
  },

  membershipExpLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
  },
  membershipExpDate: {
    fontSize: 14,
    color: COLORS.white,
    fontWeight: "600",
  },
  membershipLogo: {
    flexDirection: "row",
    alignItems: "baseline",
    direction: 'ltr',
  },
  membershipLogoText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.4)",
  },
  membershipLogoVip: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.gold,
    marginStart: 3,
  },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 16,
  },

  statCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 4,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  statValue: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },

  statNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.text,
  },
  statUnit: {
    fontSize: 11,
    color: COLORS.textLight,
    marginStart: 3,
  },
  statUnitRTL: {
    // handled by logical direction
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 18,
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: COLORS.text,
    marginStart: 8,
  },
  cardTitleRTL: {
    // handled by logical direction
  },
  cardAction: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: "600",
  },
  paymentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },

  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  paymentInfo: {
    flex: 1,
    marginStart: 12,
  },
  paymentInfoRTL: {
    // handled by logical direction
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  paymentDate: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  paymentAmount: {
    fontSize: 15,
    fontWeight: "600",
  },
  payNowBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 16,
  },

  payNowText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: "600",
    marginEnd: 8,
  },
  pointsMain: {
    alignItems: "center",
    marginBottom: 16,
  },
  pointsValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.text,
  },
  pointsLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },

  progressText: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  pointsLockedCard: {
    padding: 18,
  },
  pointsLockedTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#fff",
    marginStart: 8,
  },
  pointsLockedAction: {
    fontSize: 13,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  pointsLockedSubtitle: {
    marginTop: 8,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    lineHeight: 18,
  },
  pointsLockedPreviewRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },

  pointsLockedPreviewPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  pointsLockedPreviewText: {
    color: "rgba(255,255,255,0.9)",
    fontWeight: "900",
    letterSpacing: 1,
  },
  pointsLockedBtn: {
    marginTop: 14,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  pointsLockedBtnText: {
    color: "#0f172a",
    fontWeight: "900",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 24,
  },
  sectionHeaderRTL: {
    flexDirection: "row-reverse",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  seeAll: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  offersScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  offerCard: {
    width: 160,
    marginEnd: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  offerImage: {
    height: 100,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    padding: 8,
  },
  discountBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discountBadgeRTL: {
    // Native RTL automatically mirrors to left padding and layout
  },
  discountText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: "bold",
  },
  offerInfo: {
    padding: 12,
  },
  offerInfoRTL: {
    // Native RTL handles cross-axis layout natively
  },
  offerTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  offerPrice: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
    marginTop: 4,
  },
  adminBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },

  adminBtnText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.text,
    marginStart: 10,
  },
  adminBtnTextRTL: {
    // marginStart natively flips in RTL
    textAlign: "right",
  },
  bottomSpacer: {
    height: 64,
  },
  reelsScroll: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  reelCard: {
    width: 140,
    marginEnd: 12,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  reelThumbnailContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    backgroundColor: '#000',
  },
  reelThumbnail: {
    width: '100%',
    height: '100%',
  },
  reelPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  reelPlayOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  reelPlayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  reelViewsCount: {
    position: 'absolute',
    bottom: 8,
    start: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
  },
  reelViewsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
    marginStart: 4,
  },
  reelInfo: {
    padding: 12,
  },
  reelInfoRTL: {
    // Native RTL handles cross-axis flex-start alignment cleanly
  },
  reelTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
  },
  reelStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  reelStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reelStatText: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },
  membershipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12, // Reduced to allow more space for items
    gap: 10,
    justifyContent: 'center',
    marginTop: 15,
    marginBottom: 25,
  },

  tierCardMinimal: {
    // Correct calculation: (windowWidth - outerScrollPadding(32) - gridPadding(24) - 2*gaps(20)) / 3
    width: (width - 32 - 24 - 20) / 3 - 1,
    aspectRatio: 1,
    borderRadius: 24,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconMinimal: {
    marginBottom: 8,
  },
  tierIconImage: {
    width: 60,
    height: 60,
  },
  tierNameMinimal: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
    backgroundColor: COLORS.white,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeBtn: {
    padding: 8,
  },
  detailsSection: {
    marginBottom: 20,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailsLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 16,
  },

  infoLabel: {
    fontSize: 14,
    color: COLORS.textLight,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: COLORS.text,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 20,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  payBtn: {
    backgroundColor: COLORS.success,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 40,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  payBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  // Invoice Details Modal Styles
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },

  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  itemDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 2,
  },
  itemParams: {
    fontSize: 12,
    color: COLORS.textLight,
    marginTop: 4,
  },
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGray,
    marginBottom: 20,
  },
  totalLabelLarge: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.text,
  },
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  amountLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.primary,
  },
  saveCardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
  },
  saveCardText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '500',
  },
  // Profile Dropdown Menu Styles
  profileMenuWrapper: {
    position: 'relative',
  },
  profileDropdown: {
    position: 'absolute',
    top: 45,
    width: 180,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
    zIndex: 1000,
  },
  profileDropdownLTR: {
    right: 0,
  },
  profileDropdownRTL: {
    left: 0,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 10,
  },
  dropdownItemText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    flex: 1,
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginVertical: 4,
  },
});
