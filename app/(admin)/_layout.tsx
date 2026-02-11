import React, { useState } from "react";
import { Stack } from "expo-router";
import { View, StyleSheet, Dimensions, TouchableOpacity, Text, ScrollView, Image, ActivityIndicator, LayoutAnimation, Platform, UIManager } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname, Redirect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { useNotifications } from "../../src/contexts/NotificationsContext";

const { width } = Dimensions.get("window");
const SIDEBAR_WIDTH = 260;

const COLORS = {
  sidebarBg: "#0f172a",
  sidebarHover: "#1e293b",
  primary: "#1071b8",
  accent: "#167dc1",
  gold: "#f59e0b",
  white: "#ffffff",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  background: "#f1f5f9",
  cardBg: "#ffffff",
};

export default function AdminLayout() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language, isReady } = useLanguage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  // Track RTL state - use language to determine RTL
  const [sidebarIsRTL, setSidebarIsRTL] = useState(language === 'ar');

  // Debug language changes
  React.useEffect(() => {
    console.log('🔍 AdminLayout - Language changed:', { isRTL, language });
    // Update sidebar RTL state when language changes
    setSidebarIsRTL(language === 'ar');
  }, [isRTL, language]);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleSidebar = (open: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSidebarOpen(open);
  };

  if (isLoading || !isReady) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  // Wait for user data to be loaded before checking role
  if (!isAuthenticated || !user) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  // Only redirect if user is definitely not admin (not during loading/refresh)
  if (user.role !== "ADMIN" && user.role !== "SUPER_ADMIN") {
    return <Redirect href="/(auth)/login" />;
  }

  const MENU_ITEMS = [
    { icon: "grid", label: t("admin.dashboard.dashboard", "Dashboard"), route: "/(admin)" },
    { icon: "chatbubble", label: t("common.chat", "Chat"), route: "/(admin)/chat" },
    { icon: "people", label: t("admin.users", "Users"), route: "/(admin)/users" },
    { icon: "diamond", label: t("admin.memberships", "Memberships"), route: "/(admin)/memberships" },
    { icon: "star", label: t("admin.membershipBenefits", "Membership Benefits"), route: "/(admin)/memberships/benefits" },
    { icon: "card", label: t("admin.payments", "Payments"), route: "/(admin)/payments" },
    { icon: "wallet", label: t("admin.wallets", "Wallets"), route: "/(admin)/wallets" },
    { icon: "star", label: t("dashboard.points", "Points"), route: "/(admin)/points" },
    { icon: "cash", label: t("dashboard.cashback", "Club Gifts"), route: "/(admin)/club-gifts" },
    { icon: "file-tray-full", label: t("admin.withdrawals.title", "Withdrawals"), route: "/(admin)/withdrawals" },
    { icon: "airplane", label: t("common.bookings", "Bookings"), route: "/(admin)/bookings" },
    { icon: "receipt", label: t("admin.ordersManagement", "Orders"), route: "/(admin)/orders" },
    { icon: "pricetag", label: t("common.offers", "Offers"), route: "/(admin)/offers" },
    { icon: "megaphone", label: t("admin.marketing", "Marketing"), route: "/(admin)/admin-marketing" },
    { icon: "videocam", label: t("admin.reelsManagement", "Reels"), route: "/(admin)/reels" },
    { icon: "chatbubbles", label: t("admin.tierPosts.title", "Tier Posts"), route: "/(admin)/tier-posts" },
    { icon: "bar-chart", label: t("admin.reports", "Reports"), route: "/(admin)/reports" },
    { icon: "settings", label: t("common.settings", "Settings"), route: "/(admin)/settings" },
  ];

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Main Content */}
      <View style={[
        styles.main,
        isRTL && styles.mainRTL
      ]}>
        {/* Top Bar */}
        <SafeAreaView edges={["top"]} style={[styles.topBar, isRTL && styles.topBarRTL]}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => toggleSidebar(!sidebarOpen)}
          >
            <Ionicons name="menu" size={26} color={COLORS.sidebarBg} />
          </TouchableOpacity>
          <Text style={[styles.pageTitle, isRTL && styles.textRTL]}>{t("admin.title", "Admin Panel")}</Text>
          <View style={[styles.topBarActions, isRTL && styles.topBarActionsRTL]}>
            <TouchableOpacity
              style={styles.langBtn}
              onPress={async () => {
                console.log('🔘 Language button clicked! Current:', language);
                await toggleLanguage();
                console.log('🔘 Toggle completed! New language should be:', language === 'en' ? 'ar' : 'en');
              }}
            >
              <Text style={styles.langBtnText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => {
                // Check if we are currently on the notifications page
                // Using 'includes' is safer than exact match in case of query params
                if (pathname?.includes('notifications')) {
                  if (router.canGoBack()) {
                    router.back();
                  } else {
                    // Fallback if no history (e.g. deep link)
                    router.replace("/(admin)");
                  }
                } else {
                  router.push("/(admin)/notifications");
                }
              }}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.sidebarBg} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount.toString()}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Page Content */}
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
        </Stack>
      </View>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => toggleSidebar(false)}
        />
      )}

      {/* Sidebar */}
      <View
        key={`sidebar-${sidebarIsRTL ? 'rtl' : 'ltr'}`}
        style={[
          styles.sidebar,
          // Conditionally apply LTR or RTL positioning
          sidebarIsRTL
            ? (sidebarOpen ? styles.sidebarVisibleRTL : styles.sidebarHiddenRTL)
            : (sidebarOpen ? styles.sidebarVisibleLTR : styles.sidebarHiddenLTR)
        ]}
      >
        <SafeAreaView style={styles.sidebarContent}>
          {/* Logo */}
          <View style={[styles.sidebarHeader, isRTL && styles.sidebarHeaderRTL]}>
            <Image
              source={{ uri: 'https://customer-assets.emergentagent.com/job_viptraveller/artifacts/hsqancxd_altayarlogo.png' }}
              style={styles.sidebarLogo}
              resizeMode="contain"
            />
            <Text style={[styles.adminBadge, isRTL && styles.adminBadgeRTL]}>{t("admin.badge")}</Text>
          </View>

          {/* Profile */}
          <View style={[styles.profileSection, isRTL && styles.profileSectionRTL]}>
            <View style={styles.avatar}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={{ width: 44, height: 44, borderRadius: 22 }} />
              ) : (
                <Ionicons name="person" size={24} color={COLORS.primary} />
              )}
            </View>
            <View style={[styles.profileInfo, isRTL && styles.profileInfoRTL]}>
              <Text style={[styles.profileName, isRTL && styles.textRTL]}>
                {user?.first_name || t('admin.superAdmin', 'Admin')} {user?.last_name || ''}
              </Text>
              <Text style={[styles.profileRole, isRTL && styles.textRTL]}>
                @{user?.email?.split('@')[0] || t('admin.superAdmin', 'admin')}
              </Text>
            </View>
          </View>

          {/* Menu */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {MENU_ITEMS.map((item, index) => {
              const isActive = pathname === item.route ||
                (item.route === "/(admin)" && pathname === "/(admin)/index");
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    isRTL && styles.menuItemRTL,
                  ]}
                  onPress={() => {
                    toggleSidebar(false);
                    router.push(item.route as any);
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? COLORS.accent : COLORS.textMuted}
                  />
                  <Text style={[
                    styles.menuLabel,
                    isActive && styles.menuLabelActive,
                    isRTL && styles.menuLabelRTL,
                  ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Navigation Actions */}
          <View style={styles.navigationSection}>
            {/* Switch to Employee View */}
            <TouchableOpacity
              style={[styles.navBtn, isRTL && styles.navBtnRTL]}
              onPress={() => router.replace("/(employee)")}
            >
              <Ionicons name="briefcase" size={20} color={COLORS.gold} />
              <Text style={[styles.navBtnText, isRTL && styles.navBtnTextRTL]}>
                {t("admin.switchToEmployee", "Switch to Employee View")}
              </Text>
            </TouchableOpacity>

            {/* Switch to User View */}
            <TouchableOpacity
              style={[styles.navBtn, isRTL && styles.navBtnRTL]}
              onPress={() => router.replace("/(user)")}
            >
              <Ionicons name="person" size={20} color={COLORS.accent} />
              <Text style={[styles.navBtnText, isRTL && styles.navBtnTextRTL]}>
                {t("admin.switchToUser", "Switch to User View")}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
    overflow: 'hidden',
    width: '100%',
  },
  containerRTL: {
    flexDirection: "row-reverse",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 10,
  },
  sidebar: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: COLORS.sidebarBg,
    zIndex: 20,
    // Removed base 'left' to avoid LTR/RTL conflicts
  },
  // Explicit States for LTR
  sidebarHiddenLTR: {
    left: -SIDEBAR_WIDTH,
  },
  sidebarVisibleLTR: {
    left: 0,
  },
  // Explicit States for RTL
  sidebarHiddenRTL: {
    right: -SIDEBAR_WIDTH,
  },
  sidebarVisibleRTL: {
    right: 0,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sidebarHeaderRTL: {
    flexDirection: "row-reverse",
  },
  sidebarLogo: {
    width: 100,
    height: 35,
  },
  adminBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.white,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginStart: 10,
  },
  adminBadgeRTL: {
    marginStart: 0,
    marginEnd: 10,
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  profileSectionRTL: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  profileInfo: {
    marginStart: 12,
  },
  profileInfoRTL: {
    marginStart: 0,
    marginEnd: 12,
    alignItems: "flex-end",
  },
  profileName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  profileRole: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  textRTL: {
    textAlign: "right",
  },
  menuScroll: {
    flex: 1,
    paddingTop: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    borderRadius: 10,
  },
  menuItemRTL: {
    flexDirection: "row-reverse",
  },
  menuItemActive: {
    backgroundColor: COLORS.sidebarHover,
  },
  menuLabel: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginStart: 14,
  },
  menuLabelRTL: {
    marginStart: 0,
    marginEnd: 14,
    textAlign: "right",
  },
  menuLabelActive: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  navigationSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    paddingTop: 8,
    paddingBottom: 8,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
  },
  navBtnRTL: {
    flexDirection: "row-reverse",
  },
  navBtnText: {
    fontSize: 14,
    color: COLORS.text,
    marginStart: 12,
    fontWeight: "500",
  },
  navBtnTextRTL: {
    marginStart: 0,
    marginEnd: 12,
    textAlign: "right",
  },
  main: {
    flex: 1,
    backgroundColor: COLORS.background,
    width: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
  },
  mainRTL: {
    // any RTL adjustments for the main container
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  topBarRTL: {
    flexDirection: "row-reverse",
  },
  menuBtn: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.sidebarBg,
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topBarActionsRTL: {
    flexDirection: "row-reverse",
  },
  langBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  langBtnText: {
    color: COLORS.white,
    fontWeight: "bold",
    fontSize: 12,
  },
  notifBtn: {
    padding: 4,
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  notifBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },
});
