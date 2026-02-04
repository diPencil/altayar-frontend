import { Tabs, Redirect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Platform, ActivityIndicator, View, Text, TouchableOpacity, Dimensions, Animated, Easing } from "react-native";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { useAuth } from "../../src/contexts/AuthContext";
import { useEffect, useRef, useState } from "react";
import { MembershipRequiredModal } from "../../src/components/MembershipRequiredModal";
import { onMembershipRequired } from "../../src/utils/membershipGate";

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const COLORS = {
  primary: "#0891b2",
  primaryDark: "#0e7490",
  background: "#f0f9ff",
  white: "#ffffff",
  gray: "#94a3b8",
  text: "#1e293b",
};

// Custom Tab Bar Component
function CustomTabBar({ state, descriptors, navigation }: any) {
  const { isRTL } = useLanguage();
  const totalTabs = state.routes.length;
  // Filter out hidden tabs (href: null)
  // We use an explicit allow-list to ensure only the main 5 tabs are shown and avoid layout bugs
  const MAIN_TABS = ['index', 'offers', 'profile', 'inbox', 'reels'];
  const visibleRoutes = state.routes.filter((route: any) => MAIN_TABS.includes(route.name));

  const BAR_MARGIN = 20;
  const BAR_WIDTH = SCREEN_WIDTH - (BAR_MARGIN * 2);
  const tabWidth = BAR_WIDTH / visibleRoutes.length;
  const animatedValue = useRef(new Animated.Value(0)).current;

  // Map sub-screens to their parent "Main Tab"
  const SUB_SCREEN_MAP: Record<string, string> = {
    'personal-info': 'profile',
    'security': 'profile',
    'language': 'profile',
    'notifications-settings': 'profile',
    'help-center': 'profile',
    'about': 'profile',
    'about/company': 'profile',
    'about/memberships': 'profile',
    'about/club': 'profile',
    'about/community': 'profile',
    'privacy-policy': 'profile',
    'terms-of-service': 'profile',
    'membership-details': 'profile',
    'membership-journey': 'profile',
    'memberships-explore': 'profile',
    'wallet': 'profile',
    'points': 'profile',
    'invoices': 'profile',
    'orders': 'profile',
    'points-history': 'profile',
    'wallet-history': 'profile',
    'club-gifts': 'profile',
    'club-gifts-history': 'profile',
    'refer': 'profile',
    'bookings': 'profile', // Bookings list
    'bookings/[id]': 'profile', // Booking details
    'offer/[id]': 'offers',
    'offer-checkout': 'offers',
    'for-you': 'offers',
    'profile-view': 'profile',
    'favorites': 'profile', // Favorites is a sub-screen of profile
    'notifications': 'profile',
    'payment-methods': 'profile',
    'add-card': 'profile',
    'member-card': 'profile', // Member card is a sub-screen of profile
    'payment/[paymentId]': 'index',
    'payment/success': 'index',
    'payment/fail': 'index',
    'tier-feed': 'index',
  };

  useEffect(() => {
    // Animate the circle to the active tab
    // Find the index of the active tab within VISIBLE routes
    const activeRouteName = state.routes[state.index].name;
    const parentTabName = SUB_SCREEN_MAP[activeRouteName] || activeRouteName;
    const activeIndex = visibleRoutes.findIndex((r: any) => r.name === parentTabName);

    if (activeIndex !== -1) {
      Animated.timing(animatedValue, {
        toValue: isRTL ? (visibleRoutes.length - 1 - activeIndex) : activeIndex,
        duration: 400,
        easing: Easing.bezier(0.4, 0, 0.2, 1), // Premium fluid easing
        useNativeDriver: true,
      }).start();
    }
  }, [state.index, isRTL, visibleRoutes]);

  const translateX = animatedValue.interpolate({
    inputRange: [0, visibleRoutes.length - 1],
    outputRange: [0, tabWidth * (visibleRoutes.length - 1)],
  });

  return (
    <View style={styles.tabBarContainer}>
      {/* Background Bar */}
      <View style={styles.tabBarBackground} />

      {/* The "Cutout" Simulator (The concave curve) */}
      <Animated.View
        style={[
          styles.cutoutContainer,
          {
            width: tabWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.cutoutCircle} />
      </Animated.View>

      {/* The Floating Active Button */}
      <Animated.View
        style={[
          styles.activeButtonContainer,
          {
            width: tabWidth,
            transform: [{ translateX }],
          },
        ]}
      >
        <View style={styles.activeButton}>
          {(() => {
            const currentRoute = state.routes[state.index];
            if (!currentRoute) return null;

            const activeRouteName = currentRoute.name;
            const parentTabName = SUB_SCREEN_MAP[activeRouteName] || activeRouteName;
            const parentRoute = visibleRoutes.find((r: any) => r.name === parentTabName);
            if (parentRoute && descriptors[parentRoute.key]) {
              return descriptors[parentRoute.key].options.tabBarIcon({
                focused: true,
                color: COLORS.white,
                size: 24
              });
            }
            return null;
          })()}
        </View>
      </Animated.View>

      {/* Tab Items */}
      <View style={[styles.tabsRow, isRTL && styles.tabsRowRTL]}>
        {visibleRoutes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const currentRoute = state.routes[state.index];
          const activeRouteName = currentRoute?.name;
          const parentTabName = SUB_SCREEN_MAP[activeRouteName] || activeRouteName;
          const isFocused = route.name === parentTabName;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!event.defaultPrevented) {
              // Always navigate to the root tab screen when clicked
              // This fixes the issue where clicking the tab while on a sub-screen didn't return to the main tab
              navigation.navigate(route.name);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              testID={options.tabBarTestID}
              onPress={onPress}
              style={[styles.tabItem, { width: tabWidth }]}
              activeOpacity={1}
            >
              <View style={styles.iconWrapper}>
                {!isFocused && options.tabBarIcon && options.tabBarIcon({
                  focused: isFocused,
                  color: COLORS.gray,
                  size: 24
                })}
              </View>
              {!isFocused && options.title && (
                <Text style={[styles.tabLabel, { color: COLORS.gray }]}>
                  {options.title}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function UserLayout() {
  const { t } = useTranslation();
  const { isRTL } = useLanguage();
  const { isAuthenticated, isLoading } = useAuth();
  const [membershipModalVisible, setMembershipModalVisible] = useState(false);
  const [membershipModalSource, setMembershipModalSource] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsub = onMembershipRequired(({ source }) => {
      setMembershipModalSource(source);
      setMembershipModalVisible(true);
    });
    return unsub;
  }, []);

  if (isLoading) {
    return <ActivityIndicator size="large" color={COLORS.primary} style={{ flex: 1, justifyContent: 'center' }} />;
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <MembershipRequiredModal
        visible={membershipModalVisible}
        source={membershipModalSource}
        onClose={() => setMembershipModalVisible(false)}
      />
      <Tabs
        backBehavior="history"
        tabBar={(props: any) => <CustomTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t("common.home"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="home" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="offers"
          options={{
            title: t("common.offers"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="pricetag" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: t("common.profile"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="person" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="inbox"
          options={{
            title: t("common.chat"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="chatbubbles" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="reels"
          options={{
            title: t("common.reels", "Reels"),
            tabBarIcon: ({ color, size }: { color: string; size: number }) => (
              <Ionicons name="videocam" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden screens - accessible via navigation but not shown in tab bar */}
        <Tabs.Screen
          name="bookings"
          options={{
            href: null,
          }}
        />
        {/* Hidden screens - accessible via navigation but not shown in tab bar */}
        <Tabs.Screen
          name="personal-info"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="security"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="language"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications-settings"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="help-center"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="wallet"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="points"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="club-gifts"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="invoices"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="for-you"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="offer/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile-view"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="orders"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="points-history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="wallet-history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="club-gifts-history"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="about"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="about/company"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="about/memberships"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="about/club"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="about/community"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="privacy-policy"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="terms-of-service"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="membership-details"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="memberships-explore"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen name="refer" options={{ href: null }} />
        <Tabs.Screen
          name="favorites"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payment"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="tier-feed"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="notifications"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="membership-journey"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="payment-methods"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="add-card"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="member-card"
          options={{
            href: null,
          }}
        />

      </Tabs>
    </View >
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: 8,
    left: 20,
    right: 20,
    height: 64,
    backgroundColor: 'transparent',
    elevation: 0,
    zIndex: 1000,
  },
  tabBarBackground: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    zIndex: 1,
  },
  tabsRow: {
    flexDirection: 'row',
    height: '100%',
    width: '100%',
    position: 'absolute',
    top: 0,
    zIndex: 10,
  },
  tabsRowRTL: {
    flexDirection: 'row-reverse',
  },
  tabItem: {
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 40,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
  },
  cutoutContainer: {
    position: 'absolute',
    top: 15,
    height: 30,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 2,
    pointerEvents: 'none',
  },
  cutoutCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.background,
    opacity: 0, // Hidden - no more weird shape
  },
  activeButtonContainer: {
    position: 'absolute',
    top: -8,
    height: 70,
    justifyContent: 'flex-start',
    alignItems: 'center',
    zIndex: 20,
    pointerEvents: 'none',
  },
  activeButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // Enhanced glow effect (التوهج القوي)
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 20,
    borderWidth: 5,
    borderColor: COLORS.white,
  },
});
