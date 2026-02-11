import React from "react";
import { Redirect, router } from "expo-router";
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Dimensions } from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
import { useTranslation } from "react-i18next";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from "react-native-reanimated";

const { width, height } = Dimensions.get("window");

export default function Index() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = React.useState({
    image: "https://images.unsplash.com/photo-1526772662000-3f88f10405ff?q=80&w=1974&auto=format&fit=crop",
    title: { en: "Explore your journey only with us", ar: "استكشف رحلتك معنا فقط" },
    subtitle: { en: "All your vacations destinations are here, enjoy your holiday", ar: "جميع وجهات عطلاتك هنا، استمتع بعطلتك" }
  });

  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
    flex: 1,
  }));

  React.useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { SettingsService } = await import("../src/services/settingsService");
      const data = await SettingsService.getOnboardingSettings();
      if (data) {
        setSettings(data);
      }
    } catch (error) {
      console.log("Using default onboarding settings");
    }
  };

  // Show loading indicator while checking auth state
  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#1071b8" />
      </View>
    );
  }

  // Redirect to dashboard if authenticated
  if (isAuthenticated && user) {
    if (user.role === "ADMIN" || user.role === "SUPER_ADMIN") {
      return <Redirect href="/(admin)" />;
    } else if (user.role === "EMPLOYEE") {
      return <Redirect href="/(employee)" />;
    } else {
      return <Redirect href="/(user)" />;
    }
  }

  // Show Onboarding Screen if not authenticated
  const currentLang = i18n.language.startsWith('ar') ? 'ar' : 'en';

  const handleGetStarted = () => {
    opacity.value = withTiming(0, { duration: 500 });
    scale.value = withTiming(0.9, { duration: 500 }, (finished) => {
      if (finished) {
        runOnJS(router.push)("/(auth)/login");
        // Reset animation values for when user comes back
        opacity.value = 1;
        scale.value = 1;
      }
    });
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Image
        source={{ uri: settings.image }}
        style={styles.image}
        resizeMode="cover"
      />

      {/* Overlay Gradient (Optional, or just styling) */}

      <View style={styles.contentContainer}>
        <View style={styles.textContainer}>
          <Text style={styles.title}>{settings.title[currentLang] || t('onboarding.title')}</Text>
          <Text style={styles.subtitle}>{settings.subtitle[currentLang] || t('onboarding.subtitle')}</Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={handleGetStarted}
        >
          <Text style={styles.buttonText}>{t('onboarding.getStarted')}</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  image: {
    width: width,
    height: height * 0.65, // Takes up top 65%
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#fff",
    borderTopStartRadius: 30,
    borderTopEndRadius: 30,
    marginTop: -30, // Overlap the image
    paddingHorizontal: 24,
    paddingTop: 40,
    justifyContent: "space-between",
    paddingBottom: 50,
    alignItems: "center",
  },
  textContainer: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#1e293b",
    textAlign: "center",
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: "#64748b",
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: "#1071b8",
    width: "100%",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#1071b8",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "700",
  },
});
