import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../src/contexts/LanguageContext';

const COLORS = {
  primary: '#1071b8',
  background: '#f0f9ff',
  white: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  border: '#e2e8f0',
};

export default function LanguageScreen() {
  const { isRTL, language, changeLanguage } = useLanguage();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const languages = [
    { code: 'ar', name: 'العربية', nameEn: 'Arabic', flag: '🇸🇦' },
    { code: 'en', name: 'English', nameEn: 'English', flag: '🇺🇸' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name={isRTL ? "chevron-forward" : "chevron-back"} size={26} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.language', 'Language')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {languages.map((item) => (
          <TouchableOpacity
            key={item.code}
            style={[
              styles.langCard,
              language === item.code && styles.langCardActive
            ]}
            onPress={() => changeLanguage(item.code as 'ar' | 'en')}
          >
            <View style={[styles.flagContainer, isRTL && { marginStart: 0, marginEnd: 0 }]}>
              <Text style={styles.flagText}>{item.flag}</Text>
            </View>
            <View style={{ flex: 1, marginHorizontal: 15 }}>
              <Text style={[styles.langName, language === item.code && styles.textActive, isRTL && styles.textRTL]}>
                {item.name}
              </Text>
              <Text style={[styles.langEnName, isRTL && styles.textRTL]}>
                {item.nameEn}
              </Text>
            </View>
            {language === item.code && (
              <Ionicons name="checkmark-circle" size={24} color={COLORS.primary} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Bottom Footer Credits */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {t('common.appVersion', 'Version')} 1.0.0
        </Text>
      </View>
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
    // Removed row-reverse
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
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
  scrollContent: {
    padding: 20,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  langCardActive: {
    borderColor: COLORS.primary,
    backgroundColor: '#f0f9ff',
  },
  rowRTL: {
    // Removed row-reverse
  },
  flagContainer: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flagText: {
    fontSize: 24,
  },
  langInfo: {
    // Used in inline style now
  },
  langName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  textActive: {
    color: COLORS.primary,
  },
  langEnName: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  textRTL: {
    textAlign: 'right',
  },
  footer: {
    padding: 24,
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textLight,
    fontSize: 14,
  },
});
