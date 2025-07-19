import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Namespace-based dynamic resource loading function
const loadNamespaceForLanguage = async (language: string, namespace: string) => {
  try {
    const module = await import(`../locales/${language}/${namespace}.json`);
    return module.default;
  } catch (error) {
    console.error(`Failed to load ${namespace} for language ${language}:`, error);
    // Fallback to English for this namespace
    try {
      const fallback = await import(`../locales/en/${namespace}.json`);
      return fallback.default;
    } catch (fallbackError) {
      console.error(`Failed to load fallback ${namespace}:`, fallbackError);
      return {};
    }
  }
};

// Custom backend for namespace-based dynamic loading
const customBackend = {
  type: 'backend' as const,
  init: () => {},
  read: async (language: string, namespace: string, callback: any) => {
    try {
      const resources = await loadNamespaceForLanguage(language, namespace);
      callback(null, resources);
    } catch (error) {
      callback(error, null);
    }
  }
};

// Supported languages configuration
export const supportedLanguages = [
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
  { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' },
  //{ code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  //{ code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  //{ code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
] as const;

export type SupportedLanguage = typeof supportedLanguages[number]['code'];

i18n
  .use(customBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    // Language settings
    lng: 'en', // Default language
    fallbackLng: 'en',
    supportedLngs: supportedLanguages.map(lang => lang.code),
    
    // Namespace settings
    ns: ['common', 'navigation', 'auth', 'dashboard', 'admin', 'patient', 'caregiver', 'symptoms'],
    defaultNS: 'common',
    
    // Debug mode (disable in production)
    debug: import.meta.env.DEV,
    
    // Language detection settings
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'parkml-language',
      caches: ['localStorage'],
    },
    
    // Interpolation settings
    interpolation: {
      escapeValue: false, // React already escapes values
      formatSeparator: ',',
      format: (value, format) => {
        if (format === 'uppercase') return value.toUpperCase();
        if (format === 'lowercase') return value.toLowerCase();
        if (format && format.startsWith('date:')) {
          const dateFormat = format.split(':')[1];
          return new Date(value).toLocaleDateString(i18n.language, {
            ...(dateFormat === 'short' && { dateStyle: 'short' }),
            ...(dateFormat === 'long' && { dateStyle: 'long' }),
          });
        }
        return value;
      },
    },
    
    // Performance optimizations
    load: 'languageOnly', // Don't load region-specific translations
    cleanCode: true, // Clean language codes
    
    // React specific settings
    react: {
      useSuspense: false, // We'll handle loading ourselves
      bindI18n: 'languageChanged loaded',
      bindI18nStore: 'added removed',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em'],
    },
    
    // Backend settings
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json', // This won't be used with our custom backend
    },
  });

// Helper functions
export const changeLanguage = async (language: SupportedLanguage) => {
  try {
    await i18n.changeLanguage(language);
    console.log(`Language changed to: ${language}`);
  } catch (error) {
    console.error('Failed to change language:', error);
  }
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return i18n.language as SupportedLanguage;
};

export const getLanguageDisplayName = (code: string): string => {
  const lang = supportedLanguages.find(l => l.code === code);
  return lang?.nativeName || code;
};

export const isLanguageSupported = (lang: string): lang is SupportedLanguage => {
  return supportedLanguages.some(supportedLang => supportedLang.code === lang);
};

export default i18n;