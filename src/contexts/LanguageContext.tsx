import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { I18nManager, View, ActivityIndicator, Platform, Text, TouchableOpacity, DevSettings } from 'react-native';
import { useTranslation } from 'react-i18next';
import { loadSavedLanguage, changeLanguage as i18nChangeLanguage } from '../i18n';
import i18n from '../i18n';
import { COLORS } from '../utils/theme';
import * as Updates from 'expo-updates';

type Language = 'en' | 'ar';

interface LanguageContextType {
  language: Language;
  isRTL: boolean;
  isLoading: boolean;
  isReady: boolean;
  changeLanguage: (lang: Language) => Promise<void>;
  toggleLanguage: () => Promise<void>;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [language, setLanguage] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [restartRequired, setRestartRequired] = useState(false);

  useEffect(() => {
    initializeLanguage();

    // Check if i18n is already ready
    const checkReady = () => {
      if (i18n.isInitialized && i18n.services && i18n.services.resourceStore) {
        console.log('✅ i18n is ready, language:', i18n.language);
        console.log('Sample translation:', i18n.t('admin.users'));
        setIsReady(true);
      } else {
        console.log('⏳ i18n not ready yet, checking again...');
        setTimeout(checkReady, 50);
      }
    };

    // Listen for i18n ready event
    const handleReady = () => {
      console.log('🔄 i18n initialized event received');
      checkReady();
    };

    if (i18n.isInitialized) {
      checkReady();
    } else {
      i18n.on('initialized', handleReady);
      // Also check periodically in case the event doesn't fire
      checkReady();
    }

    return () => {
      i18n.off('initialized', handleReady);
    };
  }, []);

  const initializeLanguage = async () => {
    try {
      // Load saved language synchronously if possible
      const savedLang = await loadSavedLanguage();
      const lang = (savedLang === 'ar' ? 'ar' : 'en') as Language;
      setLanguage(lang);
      setIsRTL(lang === 'ar');

      // RTL is already initialized in i18n/index.ts at app startup
      // We only need to set the state here
      console.log('LanguageContext initialized with:', { lang, isRTL: lang === 'ar', nativeRTL: I18nManager.isRTL });
    } catch (error) {
      console.log('Error initializing language:', error);
      // Set defaults
      setLanguage('en');
      setIsRTL(false);
    } finally {
      setIsLoading(false);
    }
  };

  const requestRestart = async () => {
    // Use expo-updates for production reload, DevSettings for dev
    try {
      // Try expo-updates first (works in production and preview builds)
      if (Platform.OS !== 'web' && Updates.reloadAsync) {
        console.log('🔄 Attempting Updates.reloadAsync()...');
        await Updates.reloadAsync();
        return;
      }
    } catch (error) {
      console.log('expo-updates reload failed:', error);
    }

    // Fallback to DevSettings in development
    try {
      if (Platform.OS !== 'web' && DevSettings?.reload) {
        console.log('🔄 Attempting DevSettings.reload()...');
        DevSettings.reload();
        return;
      }
    } catch (error) {
      console.log('DevSettings reload failed:', error);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      console.log('🔄 LanguageContext - Changing language to:', lang);
      await i18nChangeLanguage(lang);
      setLanguage(lang);

      const newIsRTL = lang === 'ar';
      setIsRTL(newIsRTL);
      console.log('✅ LanguageContext - Language changed:', { lang, isRTL: newIsRTL });

      if (newIsRTL !== I18nManager.isRTL) {
        I18nManager.allowRTL(newIsRTL);
        I18nManager.forceRTL(newIsRTL);
        // Immediately trigger reload for better UX
        setTimeout(() => requestRestart(), 500);
      }
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  // Show loading while i18n is not ready
  if (!isReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundLight }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (restartRequired) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: COLORS.backgroundLight }}>
        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.text, textAlign: 'center' }}>
          {t('common.restartRequiredTitle')}
        </Text>
        <Text style={{ marginTop: 10, fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 20 }}>
          {t('common.restartRequiredBody')}
        </Text>

        <TouchableOpacity
          onPress={async () => {
            await requestRestart();
          }}
          style={{ marginTop: 16, backgroundColor: COLORS.primary, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 }}
        >
          <Text style={{ color: '#fff', fontWeight: '800' }}>{t('common.restartNow')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setRestartRequired(false)}
          style={{ marginTop: 10, paddingHorizontal: 18, paddingVertical: 12 }}
        >
          <Text style={{ color: COLORS.textSecondary, fontWeight: '700' }}>{t('common.restartLater')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LanguageContext.Provider
      value={{
        language,
        isRTL,
        isLoading,
        isReady,
        changeLanguage,
        toggleLanguage,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
