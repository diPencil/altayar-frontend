import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager, Platform } from 'react-native';

// Import translations directly
const en = require('./translations/en.json');
const ar = require('./translations/ar.json');

const LANGUAGE_KEY = '@app_language';

// Translation resources - Force reload: 2025-12-28 23:11
const resources = {
  en: { translation: en },
  ar: { translation: ar },
};

// Get device language
const getDeviceLanguage = () => {
  try {
    const locales = Localization.getLocales();
    const locale = locales && locales[0] ? locales[0].languageCode : 'en';
    return locale?.startsWith('ar') ? 'ar' : 'en';
  } catch (error) {
    console.log('Error getting device language:', error);
    return 'en';
  }
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    debug: __DEV__,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
    preload: ['en', 'ar'],
    initImmediate: false,
  });

console.log('✅ i18n initialized');
console.log('Current language:', i18n.language);
console.log('Available translations:', Object.keys(i18n.services.resourceStore.data));
console.log('Sample AR translation:', i18n.t('memberCard.title'));
console.log('Sample EN translation:', i18n.t('memberCard.title', { lng: 'en' }));

// Initialize RTL based on saved language (synchronous check)
// This runs ONCE at app startup to ensure RTL is set before any rendering
(async () => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    const shouldBeRTL = savedLang === 'ar';

    console.log('🔄 RTL Initialization:', { savedLang, shouldBeRTL, currentIsRTL: I18nManager.isRTL });

    // Only force RTL change if it differs from current state
    if (shouldBeRTL !== I18nManager.isRTL) {
      console.log('⚠️ RTL mismatch detected! Setting RTL to:', shouldBeRTL);
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);

      // Note: App needs to restart for RTL changes to take effect
      // This will be handled by LanguageContext when user changes language
    } else {
      console.log('✅ RTL already correctly set');
    }
  } catch (error) {
    console.log('Error initializing RTL:', error);
  }
})();


// Load saved language preference
export const loadSavedLanguage = async () => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLang && (savedLang === 'en' || savedLang === 'ar')) {
      await i18n.changeLanguage(savedLang);
      return savedLang;
    }
    return getDeviceLanguage();
  } catch (error) {
    console.log('Error loading language:', error);
    return getDeviceLanguage();
  }
};

// Save and change language
export const changeLanguage = async (lang: 'en' | 'ar') => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
    await i18n.changeLanguage(lang);
    return true;
  } catch (error) {
    console.log('Error saving language:', error);
    return false;
  }
};

// Check if RTL
export const isRTL = () => i18n.language === 'ar';

export default i18n;
