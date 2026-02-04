import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { notificationsApi, NotificationSettings } from "../../src/services/api";

const COLORS = {
  primary: "#0891b2",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  error: "#ef4444",
};

export default function NotificationsSettingsScreen() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<Partial<NotificationSettings>>({
    push_notifications: true,
    email_notifications: true,
    sms_notifications: false,
    booking_updates: true,
    payment_alerts: true,
    promotions: true,
    new_offers: true,
    price_drops: false,
    chat_messages: true,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await notificationsApi.getSettings();
      setSettings(data);
    } catch (error) {
      console.log('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSetting = async (key: keyof NotificationSettings) => {
    // optimistic update (safe boolean handling)
    const previousSettings = { ...settings };
    const currentValue = !!previousSettings[key];
    const nextValue = !currentValue;
    setSettings(prev => ({ ...prev, [key]: nextValue }));

    try {
      const updated = await notificationsApi.updateSettings({ [key]: nextValue });
      setSettings(updated);
    } catch (error) {
      console.log('Error updating setting:', error);
      // Revert on error
      setSettings(previousSettings);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('notifications.settings.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading && (
          <View style={styles.loadingBox}>
            <ActivityIndicator color={COLORS.primary} />
          </View>
        )}

        {/* Push Notifications Section */}
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('notifications.settings.channels.title')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon="notifications"
            title={t('notifications.settings.channels.push')}
            subtitle={t('notifications.settings.channels.pushDesc')}
            value={settings.push_notifications}
            onToggle={() => toggleSetting('push_notifications')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="mail"
            title={t('notifications.settings.channels.email')}
            subtitle={t('notifications.settings.channels.emailDesc')}
            value={settings.email_notifications}
            onToggle={() => toggleSetting('email_notifications')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="chatbubble"
            title={t('notifications.settings.channels.sms')}
            subtitle={t('notifications.settings.channels.smsDesc')}
            value={settings.sms_notifications}
            onToggle={() => toggleSetting('sms_notifications')}
            isRTL={isRTL}
            disabled={loading}
            isLast
          />
        </View>

        {/* Activity Notifications */}
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('notifications.settings.activity.title')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon="airplane"
            title={t('notifications.settings.activity.booking')}
            subtitle={t('notifications.settings.activity.bookingDesc')}
            value={settings.booking_updates}
            onToggle={() => toggleSetting('booking_updates')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="card"
            title={t('notifications.settings.activity.payment')}
            subtitle={t('notifications.settings.activity.paymentDesc')}
            value={settings.payment_alerts}
            onToggle={() => toggleSetting('payment_alerts')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="chatbubbles"
            title={t('notifications.settings.activity.chat')}
            subtitle={t('notifications.settings.activity.chatDesc')}
            value={settings.chat_messages}
            onToggle={() => toggleSetting('chat_messages')}
            isRTL={isRTL}
            disabled={loading}
            isLast
          />
        </View>

        {/* Marketing Notifications */}
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('notifications.settings.marketing.title')}
        </Text>
        <View style={styles.section}>
          <SettingRow
            icon="megaphone"
            title={t('notifications.settings.marketing.promotions')}
            subtitle={t('notifications.settings.marketing.promotionsDesc')}
            value={settings.promotions}
            onToggle={() => toggleSetting('promotions')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="pricetag"
            title={t('notifications.settings.marketing.newOffers')}
            subtitle={t('notifications.settings.marketing.newOffersDesc')}
            value={settings.new_offers}
            onToggle={() => toggleSetting('new_offers')}
            isRTL={isRTL}
            disabled={loading}
          />
          <SettingRow
            icon="trending-down"
            title={t('notifications.settings.marketing.priceDrops')}
            subtitle={t('notifications.settings.marketing.priceDropsDesc')}
            value={settings.price_drops}
            onToggle={() => toggleSetting('price_drops')}
            isRTL={isRTL}
            disabled={loading}
            isLast
          />
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isRTL && styles.textRTL]}>
            {t('notifications.settings.footer')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingRow({ icon, title, subtitle, value, onToggle, isRTL, isLast, disabled }: any) {
  return (
    <View style={[styles.settingRow, isRTL && styles.settingRowRTL, !isLast && styles.settingRowBorder]}>
      <View style={styles.settingIcon}>
        <Ionicons name={icon} size={22} color={COLORS.primary} />
      </View>
      <View style={[styles.settingInfo, isRTL && styles.settingInfoRTL]}>
        <Text style={[styles.settingTitle, isRTL && styles.textRTL]}>{title}</Text>
        <Text style={[styles.settingSubtitle, isRTL && styles.textRTL]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
        thumbColor={COLORS.white}
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 20,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 10,
  },
  headerRTL: {
    flexDirection: "row-reverse",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingTop: 10,
    paddingBottom: 110,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 12,
    marginTop: 8,
    textTransform: "uppercase",
  },
  textRTL: {
    textAlign: "right",
  },
  section: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  settingRowRTL: {
    flexDirection: "row-reverse",
  },
  settingRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  settingIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#e0f7fa",
    alignItems: "center",
    justifyContent: "center",
  },
  settingInfo: {
    flex: 1,
    marginLeft: 12,
  },
  settingInfoRTL: {
    marginLeft: 0,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
  },
  settingSubtitle: {
    fontSize: 13,
    color: COLORS.textLight,
    marginTop: 2,
  },
  footer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 13,
    color: COLORS.textLight,
  },
  loadingBox: {
    paddingVertical: 10,
    alignItems: "center",
  },
});
