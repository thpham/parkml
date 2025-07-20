import { useTranslation as useI18nextTranslation } from 'react-i18next';
import { changeLanguage, getCurrentLanguage, type SupportedLanguage } from '../i18n';

/**
 * Enhanced useTranslation hook that wraps react-i18next with our custom functionality
 * 
 * Features:
 * - Type-safe translation keys
 * - Async language switching
 * - Loading states
 * - Parameter interpolation
 * - Namespace support
 */

// Enhanced useTranslation hook with namespace support
export function useTranslation(ns?: string | string[]) {
  const { t, i18n, ready } = useI18nextTranslation(ns);

  /**
   * Translation function with type safety and parameter interpolation
   * 
   * @param key - Translation key (e.g., 'common.save', 'dashboard.title')
   * @param params - Parameters for interpolation (e.g., { name: 'John', count: 5 })
   * @param options - Additional i18next options
   */
  const translate = (
    key: string, 
    params?: Record<string, string | number | Date>,
    options?: any
  ): string => {
    const result = t(key, { ...params, returnObjects: false, ...options });
    return typeof result === 'string' ? result : String(result);
  };

  /**
   * Change language with loading state and error handling
   * 
   * @param language - Target language code
   * @returns Promise that resolves when language is loaded
   */
  const setLanguage = async (language: SupportedLanguage): Promise<void> => {
    try {
      await changeLanguage(language);
    } catch (error) {
      console.error('Failed to change language:', error);
      throw error;
    }
  };

  /**
   * Get current language with type safety
   */
  const language = getCurrentLanguage();

  /**
   * Check if translations are ready/loaded
   */
  const isLoading = !ready;

  /**
   * Check if there was an error loading translations
   */
  const error = i18n.store?.data ? null : 'Failed to load translations';

  return {
    t: translate,
    language,
    setLanguage,
    isLoading,
    error,
    ready,
    // Advanced features for future use
    i18n, // Direct access to i18n instance
    exists: (key: string) => i18n.exists(key),
    getFixedT: (lng?: string, ns?: string) => i18n.getFixedT(lng || 'en', ns),
  };
}

// Re-export types for convenience
export type { SupportedLanguage } from '../i18n';
export { supportedLanguages, getLanguageDisplayName, getStoredLanguage } from '../i18n';