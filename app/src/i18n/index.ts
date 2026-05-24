import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import id from './locales/id.json';
import en from './locales/en.json';

// Default language: English. Device 'id' locale → switch ke 'id', otherwise
// default 'en' (termasuk untuk locale non-id seperti zh, es, dll).
// Saved user preference override ini di preferences.store.hydrate().
const deviceLanguage = getLocales()[0]?.languageCode ?? 'en';
const initialLang = deviceLanguage === 'id' ? 'id' : 'en';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      id: { translation: id },
      en: { translation: en },
    },
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

export default i18n;

export type SupportedLang = 'id' | 'en';

export function setLanguage(lang: SupportedLang) {
  return i18n.changeLanguage(lang);
}

export function getCurrentLanguage(): SupportedLang {
  return (i18n.language as SupportedLang) || 'en';
}
