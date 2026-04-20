import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { loadSavedLanguage } from '../i18n';
import i18n from '../i18n';
import { applyLanguage, setWebDirection, syncNativeLayoutDirection } from '../i18n/applyLanguage';
import { COLORS } from '../utils/theme';

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
  const [language, setLanguage] = useState<Language>('en');
  const [isRTL, setIsRTL] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [isLanguageReady, setIsLanguageReady] = useState(false);

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
      const savedLang = await loadSavedLanguage();
      const lang = (savedLang === 'ar' ? 'ar' : 'en') as Language;

      setLanguage(lang);
      setIsRTL(lang === 'ar');

      if (Platform.OS === 'web' || typeof document !== 'undefined') {
        setWebDirection(lang);
      }

      await syncNativeLayoutDirection(lang);
    } catch (error) {
      console.log('Error initializing language:', error);
      setLanguage('en');
      setIsRTL(false);
    } finally {
      setIsLoading(false);
      // Mark language as ready — app will NOT render until this is set
      setIsLanguageReady(true);
    }
  };

  const changeLanguage = async (lang: Language) => {
    try {
      await applyLanguage(i18n, lang);
      setLanguage(lang);
      setIsRTL(lang === 'ar');
      // On native, applyLanguage may call Updates.reloadAsync() when I18nManager RTL changes.
    } catch (error) {
      console.log('Error changing language:', error);
    }
  };

  const toggleLanguage = async () => {
    const newLang = language === 'en' ? 'ar' : 'en';
    await changeLanguage(newLang);
  };

  // Show loading while i18n is not ready OR while saved language is still loading from storage.
  // This ensures isRTL is correctly set before ANY component renders.
  if (!isReady || !isLanguageReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.backgroundLight }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
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
      <View style={Platform.OS === 'web' ? { flex: 1, direction: isRTL ? 'rtl' : 'ltr' } : { flex: 1 }}>
        {children}
      </View>
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
