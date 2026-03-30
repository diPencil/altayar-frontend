import React from "react";
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
  sidebarBg: "#1e3a5f",
  sidebarHover: "#2d4a6f",
  primary: "#1071b8",
  accent: "#167dc1",
  gold: "#f59e0b",
  white: "#ffffff",
  text: "#e2e8f0",
  textMuted: "#94a3b8",
  background: "#f1f5f9",
  cardBg: "#ffffff",
};

export default function EmployeeLayout() {
  const { t } = useTranslation();
  const { isRTL, toggleLanguage, language } = useLanguage();
  const { isAuthenticated, isLoading, user } = useAuth();
  const { unreadCount } = useNotifications();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const pathname = usePathname();
  const [avatarError, setAvatarError] = React.useState(false);

  // Track RTL state
  const [sidebarIsRTL, setSidebarIsRTL] = React.useState(language === 'ar');

  React.useEffect(() => {
    setSidebarIsRTL(language === 'ar');
  }, [isRTL, language]);

  // Reset avatar error when user avatar changes
  React.useEffect(() => {
    setAvatarError(false);
  }, [user?.avatar]);

  if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
  }

  const toggleSidebar = (open: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSidebarOpen(open);
  };

  if (isLoading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (!isAuthenticated || !["EMPLOYEE", "ADMIN", "SUPER_ADMIN"].includes(user?.role || "")) {
    return <Redirect href="/(auth)/login" />;
  }

  const MENU_ITEMS = [
    { icon: "grid", label: t("employee.layout.dashboard", "Dashboard"), route: "/(employee)" },
    { icon: "pricetags", label: t("employee.layout.orders", "Orders"), route: "/(employee)/orders" },
    { icon: "megaphone", label: t("employee.layout.marketing", "Marketing"), route: "/(employee)/marketing" },
    { icon: "people", label: t("employee.layout.customers", "Customers"), route: "/(employee)/customers" },
    { icon: "gift", label: t("employee.layout.referrals", "Referrals"), route: "/(employee)/referrals" },
    { icon: "trophy", label: t("employee.layout.competition", "Competition"), route: "/(employee)/competition" },
    { icon: "chatbubbles", label: t("employee.layout.chats", "Chats"), route: "/(employee)/chats" },
    { icon: "notifications", label: t("employee.layout.notifications", "Notifications"), route: "/(employee)/notifications" },
    { icon: "settings", label: t("employee.layout.settings", "Settings"), route: "/(employee)/settings" },
  ];

  return (
    <View style={[styles.container, isRTL && styles.containerRTL]}>
      {/* Main Content */}
      <View style={[
        styles.main
      ]}>
        {/* Top Bar */}
        <SafeAreaView edges={["top"]} style={styles.topBar}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => toggleSidebar(!sidebarOpen)}
          >
            <Ionicons name="menu" size={26} color={COLORS.sidebarBg} />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>
            {t("employee.layout.salesPanel")}
          </Text>
          <View style={styles.topBarActions}>
            <TouchableOpacity
              style={styles.notifBtn}
              onPress={() => router.push('/(employee)/notifications')}
            >
              <Ionicons name="notifications-outline" size={24} color={COLORS.sidebarBg} />
              {unreadCount > 0 && (
                <View style={styles.notifBadge}>
                  <Text style={styles.notifBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.langBtn} onPress={toggleLanguage}>
              <Text style={styles.langBtnText}>{language === 'ar' ? 'EN' : 'ع'}</Text>
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
            <Text style={[styles.salesBadge, isRTL && styles.salesBadgeRTL]}>{t('common.employee', 'EMPLOYEE').toUpperCase()}</Text>
          </View>

          {/* Profile */}
          <View style={[styles.profileSection, isRTL && styles.profileSectionRTL]}>
            <View style={styles.avatar}>
              {user?.avatar && !avatarError ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={{ width: 40, height: 40, borderRadius: 20 }}
                  onError={() => {
                    console.log('Employee sidebar avatar failed to load');
                    setAvatarError(true);
                  }}
                />
              ) : user?.first_name ? (
                <Text style={{ color: COLORS.gold, fontSize: 18, fontWeight: 'bold' }}>
                  {user.first_name.charAt(0).toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person" size={24} color={COLORS.gold} />
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, isRTL && styles.textRTL]}>
                {user ? `${user.first_name} ${user.last_name}` : t("employee.layout.employee", "Employee")}
              </Text>
              <Text style={[styles.profileRole, isRTL && styles.textRTL]}>
                {t("employee.layout.altayarEmployee", "Altayar Employee")}
              </Text>
            </View>
          </View>

          {/* Menu */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {MENU_ITEMS.map((item, index) => {
              const isActive = pathname === item.route ||
                (item.route === "/(employee)" && pathname === "/(employee)/index") ||
                (item.route === "/(employee)/competition" && pathname?.startsWith?.("/(employee)/competition"));
              return (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    isActive && styles.menuItemActive,
                  ]}
                  onPress={() => {
                    toggleSidebar(false);
                    router.push(item.route as any);
                  }}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={isActive ? COLORS.gold : COLORS.textMuted}
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
            {/* Back to Admin Dashboard - Only show if user is ADMIN or SUPER_ADMIN */}
            {(user?.role === "ADMIN" || user?.role === "SUPER_ADMIN") && (
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => router.replace("/(admin)")}
              >
                <Ionicons name="home" size={20} color={COLORS.gold} />
                <Text style={[styles.navBtnText, isRTL && styles.navBtnTextRTL]}>
                  {t("admin.backToAdmin", "Back to Admin")}
                </Text>
              </TouchableOpacity>
            )}

            {/* Switch to User View */}
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => router.replace("/(user)")}
            >
              <Ionicons name="person" size={20} color={COLORS.primary} />
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
    // Removed row-reverse
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
    // Removed base left to avoid conflicts
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
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sidebarHeaderRTL: {
    // Removed row-reverse
  },
  sidebarLogo: {
    width: 100,
    height: 35,
  },
  salesBadge: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.white,
    backgroundColor: COLORS.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginStart: 10,
    marginEnd: 0,
  },
  salesBadgeRTL: {
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
    // Removed row-reverse
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
    color: COLORS.gold,
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
    // Removed row-reverse
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
    color: COLORS.gold,
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
    // Removed row-reverse
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
    // Removed row-reverse
  },
  menuBtn: {
    padding: 4,
  },
  pageTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.sidebarBg,
    textAlign: "center",
  },
  topBarActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  langBtn: {
    backgroundColor: COLORS.gold,
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
    end: 0,
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
