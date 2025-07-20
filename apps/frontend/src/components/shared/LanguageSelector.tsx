import React from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation, supportedLanguages, getLanguageDisplayName, type SupportedLanguage } from '../../hooks/useTranslation';

interface LanguageSelectorProps {
  className?: string;
  compact?: boolean;
  mobile?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  className = '', 
  compact = false,
  mobile = false 
}) => {
  const { language, setLanguage, t } = useTranslation();

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage as SupportedLanguage);
    
    // Close dropdown by removing focus
    const activeElement = document.activeElement as HTMLElement;
    if (activeElement) {
      activeElement.blur();
    }
  };

  if (compact) {
    return (
      <div className={`dropdown dropdown-end ${className}`}>
        <div 
          tabIndex={0} 
          role="button" 
          className="btn btn-ghost btn-circle"
        >
          <span className="text-lg">
            {supportedLanguages.find(lang => lang.code === language)?.flag || '🌐'}
          </span>
        </div>
        <ul
          tabIndex={0}
          className="dropdown-content menu bg-base-100 rounded-box z-[1] w-44 p-2 shadow-lg border"
        >
          {supportedLanguages.map((lang) => (
            <li key={lang.code}>
              <button
                onClick={() => handleLanguageChange(lang.code)}
                className={`flex items-center justify-between ${
                  language === lang.code ? 'active' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">{lang.flag}</span>
                  <span>{lang.nativeName}</span>
                </div>
                {language === lang.code && (
                  <div className="w-2 h-2 bg-primary rounded-full"></div>
                )}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  // Mobile version: Simple button list without dropdown
  if (mobile) {
    return (
      <div className={`w-full ${className}`}>
        <div className="mb-3">
          <h3 className="text-sm font-medium text-base-content/70 px-2">
            {t('language.selectLanguage')}
          </h3>
        </div>
        <div className="space-y-1">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                language === lang.code 
                  ? 'bg-primary text-primary-content shadow-md' 
                  : 'hover:bg-base-200 active:bg-base-300'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{lang.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="font-medium text-sm">{lang.nativeName}</span>
                  <span className="text-xs opacity-70">{lang.name}</span>
                </div>
              </div>
              {language === lang.code && (
                <div className="w-2 h-2 bg-current rounded-full"></div>
              )}
            </button>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-base-300">
          <div className="text-xs text-base-content/60 px-2">
            {t('language.currentLanguage')}: {getLanguageDisplayName(language)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`dropdown dropdown-end ${className}`}>
      <div
        tabIndex={0}
        role="button"
        className="btn btn-ghost normal-case flex items-center gap-2"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {supportedLanguages.find(lang => lang.code === language)?.flag || '🌐'}
          </span>
          <span className="hidden sm:inline">
            {getLanguageDisplayName(language)}
          </span>
        </div>
        <ChevronDown className="h-4 w-4" />
      </div>
      <ul
        tabIndex={0}
        className="dropdown-content menu bg-base-100 rounded-box z-[1] w-52 p-2 shadow-lg border"
      >
        <li className="menu-title">
          <span>{t('language.selectLanguage')}</span>
        </li>
        {supportedLanguages.map((lang) => (
          <li key={lang.code}>
            <button
              onClick={() => handleLanguageChange(lang.code)}
              className={`flex items-center justify-between ${
                language === lang.code ? 'active' : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{lang.flag}</span>
                <div className="flex flex-col items-start">
                  <span className="font-medium">{lang.nativeName}</span>
                  <span className="text-xs text-base-content/60">{lang.name}</span>
                </div>
              </div>
              {language === lang.code && (
                <div className="w-2 h-2 bg-primary rounded-full"></div>
              )}
            </button>
          </li>
        ))}
        <div className="divider my-1"></div>
        <li className="text-xs text-base-content/60 px-4 py-1">
          <span>{t('language.currentLanguage')}: {getLanguageDisplayName(language)}</span>
        </li>
      </ul>
    </div>
  );
};

export default LanguageSelector;