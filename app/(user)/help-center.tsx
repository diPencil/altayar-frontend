import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLanguage } from "../../src/contexts/LanguageContext";
import { SettingsService, type ContactUsSettings } from "../../src/services/settingsService";

const COLORS = {
  primary: "#0891b2",
  background: "#f0f9ff",
  white: "#ffffff",
  text: "#1e293b",
  textLight: "#64748b",
  lightGray: "#e2e8f0",
  success: "#10b981",
  whatsapp: "#25D366",
  phone: "#0891b2",
  email: "#f59e0b",
};

// FAQ data is now handled through translation keys

export default function HelpCenterScreen() {
  const { isRTL } = useLanguage();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [contactUs, setContactUs] = useState<ContactUsSettings>({
    whatsapp_number: "966575180639",
    call_number: "+201125889336",
    email: "info@altayarvip.com",
  });

  // Dynamic FAQ data from translations
  // Dynamic FAQ data from translations
  const faqData = Array.from({ length: 30 }, (_, i) => i + 1).map(i => ({
    id: i,
    question: t(`helpCenter.questions.q${i}`),
    answer: t(`helpCenter.questions.a${i}`)
  }));

  const filteredFaq = faqData.filter(item =>
    (item.question && item.question.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (item.answer && item.answer.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const remote = await SettingsService.getContactUsSettings();
        if (mounted && remote) setContactUs(remote);
      } catch (e) {
        console.warn("[HelpCenter] Failed to load contact_us settings:", e);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const sanitizeWhatsappDigits = (val: string) => (val || "").replace(/[^\d]/g, "");

  const ensureTelUrl = (val: string) => {
    const v = (val || "").trim();
    if (!v) return "";
    if (v.startsWith("tel:")) return v;
    // keep plus and digits
    const num = v.replace(/[^\d+]/g, "");
    return `tel:${num}`;
  };

  const ensureMailtoUrl = (val: string) => {
    const v = (val || "").trim();
    if (!v) return "";
    if (v.startsWith("mailto:")) return v;
    return `mailto:${v}`;
  };

  const handleWhatsApp = () => {
    const digits = sanitizeWhatsappDigits(contactUs?.whatsapp_number);
    if (!digits) return;
    const msg = String(t("helpCenter.whatsappPrefill", "Hi, I need help with Altayar VIP app."));
    const encoded = encodeURIComponent(msg);
    const url = encoded ? `https://wa.me/${digits}?text=${encoded}` : `https://wa.me/${digits}`;
    Linking.openURL(url);
  };

  const handleCall = () => {
    const url = ensureTelUrl(contactUs?.call_number);
    if (!url) return;
    Linking.openURL(url);
  };

  const handleEmail = () => {
    const url = ensureMailtoUrl(contactUs?.email);
    if (!url) return;
    Linking.openURL(url);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.headerRTL, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name={isRTL ? "arrow-forward" : "arrow-back"} size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t('helpCenter.title')}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>
            {t('helpCenter.heroTitle')}
          </Text>
          <Text style={styles.heroSubtitle}>
            {t('helpCenter.heroSubtitle')}
          </Text>

          {/* Search */}
          <View style={[styles.searchContainer, isRTL && styles.searchContainerRTL]}>
            <Ionicons name="search" size={20} color={COLORS.textLight} />
            <TextInput
              style={[styles.searchInput, isRTL && styles.searchInputRTL]}
              placeholder={t('helpCenter.searchPlaceholder')}
              placeholderTextColor={COLORS.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
              textAlign={isRTL ? 'right' : 'left'}
            />
          </View>
        </View>

        {/* Contact Options */}
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('helpCenter.contactUs')}
        </Text>
        <View style={[styles.contactRow, isRTL && styles.contactRowRTL]}>
          <TouchableOpacity style={styles.contactBtn} onPress={handleWhatsApp}>
            <View style={[styles.contactIcon, { backgroundColor: '#dcfce7' }]}>
              <Ionicons name="logo-whatsapp" size={24} color={COLORS.whatsapp} />
            </View>
            <Text style={styles.contactLabel}>
              {t('helpCenter.whatsapp')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactBtn} onPress={handleCall}>
            <View style={[styles.contactIcon, { backgroundColor: '#e0f7fa' }]}>
              <Ionicons name="call" size={24} color={COLORS.phone} />
            </View>
            <Text style={styles.contactLabel}>
              {t('helpCenter.callUs')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactBtn} onPress={handleEmail}>
            <View style={[styles.contactIcon, { backgroundColor: '#fef3c7' }]}>
              <Ionicons name="mail" size={24} color={COLORS.email} />
            </View>
            <Text style={styles.contactLabel}>
              {t('helpCenter.email')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>
          {t('helpCenter.faq')}
        </Text>
        <View style={styles.faqContainer}>
          {filteredFaq.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.faqItem, index !== filteredFaq.length - 1 && styles.faqItemBorder]}
              onPress={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
              activeOpacity={0.7}
            >
              <View style={[styles.faqQuestion, isRTL && styles.faqQuestionRTL]}>
                <Text style={[styles.faqQuestionText, isRTL && styles.textRTL]}>
                  {item.question}
                </Text>
                <Ionicons
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.primary}
                />
              </View>
              {expandedFaq === item.id && (
                <Text style={[styles.faqAnswer, isRTL && styles.textRTL]}>
                  {item.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Live Chat */}
        <TouchableOpacity
          style={styles.liveChatBtn}
          onPress={() => router.push('/(user)/inbox')}
        >
          <View style={[styles.liveChatContent, isRTL && styles.liveChatContentRTL]}>
            <View style={styles.liveChatIcon}>
              <Ionicons name="chatbubbles" size={28} color={COLORS.white} />
            </View>
            <View style={[styles.liveChatInfo, isRTL && styles.liveChatInfoRTL]}>
              <Text style={[styles.liveChatTitle, isRTL && styles.textRTL]}>
                {t('helpCenter.liveChat')}
              </Text>
              <Text style={[styles.liveChatSubtitle, isRTL && styles.textRTL]}>
                {t('helpCenter.liveChatSubtitle')}
              </Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={24}
              color={COLORS.white}
            />
          </View>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={[styles.footerText, isRTL && styles.textRTL]}>
            {t('helpCenter.weAreHere')}
          </Text>
        </View>
      </ScrollView>
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
    justifyContent: "space-between",
    alignItems: "center",
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  heroSection: {
    backgroundColor: COLORS.primary,
    marginHorizontal: -16,
    marginTop: -16,
    padding: 30,
    paddingBottom: 40,
    marginBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
    marginBottom: 24,
  },
  searchContainerRTL: {
    flexDirection: "row-reverse",
  },
  searchInput: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
  },
  searchInputRTL: {
    textAlign: "right",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textLight,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  textRTL: {
    textAlign: "right",
  },
  contactRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
  },
  contactRowRTL: {
    flexDirection: "row-reverse",
  },
  contactBtn: {
    alignItems: "center",
  },
  contactIcon: {
    width: 60,
    height: 60,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  contactLabel: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  },
  faqContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    marginBottom: 20,
    overflow: "hidden",
  },
  faqItem: {
    padding: 16,
  },
  faqItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  faqQuestion: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestionRTL: {
    flexDirection: "row-reverse",
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.text,
    marginRight: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.textLight,
    marginTop: 12,
    lineHeight: 22,
  },
  liveChatBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  liveChatContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  liveChatContentRTL: {
    flexDirection: "row-reverse",
  },
  liveChatIcon: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  liveChatInfo: {
    flex: 1,
    marginLeft: 14,
  },
  liveChatInfoRTL: {
    marginLeft: 0,
    marginRight: 14,
  },
  liveChatTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  liveChatSubtitle: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
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
});
