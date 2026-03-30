import type { i18n as I18nType } from 'i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Updates from 'expo-updates';
import { DevSettings, I18nManager, Platform } from 'react-native';

const LANGUAGE_KEY = '@app_language';

/**
 * Set document direction and lang for web. Safe to call on init or when applying language.
 * Used by applyLanguage and by LanguageContext.initializeLanguage (web).
 */
export function setWebDirection(lang: 'en' | 'ar') {
  if (typeof document === 'undefined') return;
  const dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.documentElement.lang = lang;
  document.documentElement.dir = dir;
  document.documentElement.style.direction = dir;
  document.documentElement.style.unicodeBidi = 'isolate';

  if (document.body) {
    document.body.dir = dir;
    document.body.style.direction = dir;
    document.body.style.textAlign = dir === 'rtl' ? 'right' : 'left';
    document.body.style.unicodeBidi = 'isolate';
  }

  const rootId = document.getElementById('root');
  if (rootId) {
    rootId.setAttribute('dir', dir);
    rootId.setAttribute('data-dir', dir);
    rootId.style.direction = dir;
    rootId.style.unicodeBidi = 'isolate';
  }

  const expoRoot = document.getElementById('expo-root');
  if (expoRoot) {
    expoRoot.setAttribute('dir', dir);
    expoRoot.setAttribute('data-dir', dir);
    expoRoot.style.direction = dir;
    expoRoot.style.unicodeBidi = 'isolate';
  }

  const styleId = 'rtl-direction-style';
  let styleTag = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = styleId;
    document.head.appendChild(styleTag);
  }

  styleTag.textContent = `
    html[dir="rtl"], body[dir="rtl"], #root[dir="rtl"], #expo-root[dir="rtl"] {
      direction: rtl !important;
      unicode-bidi: isolate;
    }

    html[dir="ltr"], body[dir="ltr"], #root[dir="ltr"], #expo-root[dir="ltr"] {
      direction: ltr !important;
      unicode-bidi: isolate;
    }
  `;

  document.documentElement.classList.toggle('is-rtl', dir === 'rtl');
  document.documentElement.classList.toggle('is-ltr', dir === 'ltr');
}

/**
 * Align React Native's layout direction with the selected language.
 * forceRTL only takes effect after a full reload; expo-updates handles that on native.
 */
export async function syncNativeLayoutDirection(lang: 'en' | 'ar'): Promise<void> {
  if (Platform.OS === 'web') return;

  I18nManager.allowRTL(true);
  const needRTL = lang === 'ar';
  if (I18nManager.isRTL === needRTL) return;

  I18nManager.forceRTL(needRTL);
  try {
    await Updates.reloadAsync();
  } catch (e) {
    console.warn('expo-updates reloadAsync failed; falling back to DevSettings.reload', e);
    try {
      DevSettings.reload();
    } catch (e2) {
      console.warn('DevSettings.reload failed — fully restart the app once to apply RTL.', e2);
    }
  }
}

/**
 * Centralized "apply language": i18n + persistence + web dir/lang + native RTL (with reload when needed).
 */
export async function applyLanguage(i18nInstance: I18nType, newLang: 'en' | 'ar'): Promise<void> {
  await i18nInstance.changeLanguage(newLang);

  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, newLang);
  } catch (e) {
    // ignore storage errors
  }

  if (Platform.OS === 'web' || typeof document !== 'undefined') {
    setWebDirection(newLang);
  }

  await syncNativeLayoutDirection(newLang);
}
