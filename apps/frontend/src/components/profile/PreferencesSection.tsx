import React, { useState, useEffect } from 'react';
import {
  Settings,
  Globe,
  Moon,
  Sun,
  Monitor,
  Palette,
  Volume2,
  Clock,
  Save,
  RotateCcw,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface PreferencesSectionProps {}

interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: string;
  timezone: string;
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat: '12h' | '24h';
  notifications: {
    email: boolean;
    push: boolean;
    sms: boolean;
    reminderTime: string;
    frequency: 'daily' | 'weekly' | 'monthly';
  };
  accessibility: {
    reduceMotion: boolean;
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
  privacy: {
    dataSharing: boolean;
    analytics: boolean;
    marketing: boolean;
    profileVisibility: 'public' | 'private' | 'contacts';
  };
}

const PreferencesSection: React.FC<PreferencesSectionProps> = () => {
  const { t, setLanguage } = useTranslation(['profile', 'common']);
  const [preferences, setPreferences] = useState<UserPreferences>({
    theme: 'system',
    language: 'en',
    timezone: 'Europe/Zurich',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    notifications: {
      email: true,
      push: true,
      sms: false,
      reminderTime: '09:00',
      frequency: 'daily',
    },
    accessibility: {
      reduceMotion: false,
      highContrast: false,
      largeText: false,
      screenReader: false,
    },
    privacy: {
      dataSharing: false,
      analytics: true,
      marketing: false,
      profileVisibility: 'private',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/preferences', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPreferences(data);
      }
    } catch (error) {
      console.error('Failed to load preferences:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePreferenceChange = (category: string, key: string, value: boolean | string) => {
    setPreferences(prev => ({
      ...prev,
      [category]:
        typeof prev[category as keyof UserPreferences] === 'object'
          ? {
              ...(prev[category as keyof UserPreferences] as Record<string, unknown>),
              [key]: value,
            }
          : value,
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        setHasChanges(false);
        toast.success(t('profile:preferences.saveSuccess'));

        // Apply language change immediately
        if (preferences.language) {
          await setLanguage(preferences.language as 'en' | 'fr');
        }

        // Apply theme change
        applyTheme(preferences.theme);
      } else {
        throw new Error('Failed to save preferences');
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error(t('profile:preferences.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    loadPreferences();
    setHasChanges(false);
    toast.success(t('profile:preferences.resetSuccess'));
  };

  const applyTheme = (theme: string) => {
    const html = document.documentElement;
    if (theme === 'dark') {
      html.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      html.setAttribute('data-theme', 'light');
    } else {
      // System theme
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      html.setAttribute('data-theme', systemTheme);
    }
  };

  const getThemeIcon = (theme: string) => {
    switch (theme) {
      case 'light':
        return Sun;
      case 'dark':
        return Moon;
      default:
        return Monitor;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="loading loading-spinner loading-lg"></div>
          <p className="mt-4 text-base-content/60">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-base-300 pb-4">
        <div>
          <h2 className="text-xl font-semibold text-base-content">
            {t('profile:preferences.title')}
          </h2>
          <p className="text-base-content/60 mt-1">{t('profile:preferences.description')}</p>
        </div>
        {hasChanges && (
          <div className="flex space-x-2">
            <button onClick={handleReset} className="btn btn-outline btn-sm" disabled={isLoading}>
              <RotateCcw className="h-4 w-4 mr-1" />
              {t('common:reset')}
            </button>
            <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isLoading}>
              {isLoading ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <Save className="h-4 w-4 mr-1" />
              )}
              {t('common:save')}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appearance */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Palette className="h-5 w-5 text-primary" />
              {t('profile:preferences.appearance.title')}
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.appearance.theme')}
                  </span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['light', 'dark', 'system'].map(theme => {
                    const Icon = getThemeIcon(theme);
                    return (
                      <button
                        key={theme}
                        onClick={() => handlePreferenceChange('theme', '', theme)}
                        className={`btn btn-outline btn-sm ${preferences.theme === theme ? 'btn-active' : ''}`}
                      >
                        <Icon className="h-4 w-4 mr-1" />
                        {t(`profile:preferences.appearance.themes.${theme}`)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.appearance.language')}
                  </span>
                </label>
                <select
                  value={preferences.language}
                  onChange={e => handlePreferenceChange('language', '', e.target.value)}
                  className="select select-bordered"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="it">Italiano</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Regional Settings */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Globe className="h-5 w-5 text-secondary" />
              {t('profile:preferences.regional.title')}
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.regional.timezone')}
                  </span>
                </label>
                <select
                  value={preferences.timezone}
                  onChange={e => handlePreferenceChange('timezone', '', e.target.value)}
                  className="select select-bordered"
                >
                  <option value="Europe/Zurich">Europe/Zurich (CET)</option>
                  <option value="Europe/Paris">Europe/Paris (CET)</option>
                  <option value="Europe/Berlin">Europe/Berlin (CET)</option>
                  <option value="Europe/London">Europe/London (GMT)</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                  <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                  <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.regional.dateFormat')}
                  </span>
                </label>
                <select
                  value={preferences.dateFormat}
                  onChange={e => handlePreferenceChange('dateFormat', '', e.target.value)}
                  className="select select-bordered"
                >
                  <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
                </select>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.regional.timeFormat')}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handlePreferenceChange('timeFormat', '', '12h')}
                    className={`btn btn-outline btn-sm ${preferences.timeFormat === '12h' ? 'btn-active' : ''}`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    12h
                  </button>
                  <button
                    onClick={() => handlePreferenceChange('timeFormat', '', '24h')}
                    className={`btn btn-outline btn-sm ${preferences.timeFormat === '24h' ? 'btn-active' : ''}`}
                  >
                    <Clock className="h-4 w-4 mr-1" />
                    24h
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Volume2 className="h-5 w-5 text-accent" />
              {t('profile:preferences.notifications.title')}
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.notifications.email')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.email}
                    onChange={e =>
                      handlePreferenceChange('notifications', 'email', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.notifications.push')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.push}
                    onChange={e =>
                      handlePreferenceChange('notifications', 'push', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.notifications.sms')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.notifications.sms}
                    onChange={e => handlePreferenceChange('notifications', 'sms', e.target.checked)}
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.notifications.reminderTime')}
                  </span>
                </label>
                <input
                  type="time"
                  value={preferences.notifications.reminderTime}
                  onChange={e =>
                    handlePreferenceChange('notifications', 'reminderTime', e.target.value)
                  }
                  className="input input-bordered"
                />
              </div>

              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.notifications.frequency')}
                  </span>
                </label>
                <select
                  value={preferences.notifications.frequency}
                  onChange={e =>
                    handlePreferenceChange('notifications', 'frequency', e.target.value)
                  }
                  className="select select-bordered"
                >
                  <option value="daily">
                    {t('profile:preferences.notifications.frequencies.daily')}
                  </option>
                  <option value="weekly">
                    {t('profile:preferences.notifications.frequencies.weekly')}
                  </option>
                  <option value="monthly">
                    {t('profile:preferences.notifications.frequencies.monthly')}
                  </option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Accessibility */}
        <div className="card bg-base-200">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Settings className="h-5 w-5 text-info" />
              {t('profile:preferences.accessibility.title')}
            </h3>

            <div className="space-y-4">
              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.accessibility.reduceMotion')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.reduceMotion}
                    onChange={e =>
                      handlePreferenceChange('accessibility', 'reduceMotion', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
                <label className="label">
                  <span className="label-text-alt text-base-content/60">
                    {t('profile:preferences.accessibility.reduceMotionDesc')}
                  </span>
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.accessibility.highContrast')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.highContrast}
                    onChange={e =>
                      handlePreferenceChange('accessibility', 'highContrast', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.accessibility.largeText')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.largeText}
                    onChange={e =>
                      handlePreferenceChange('accessibility', 'largeText', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
              </div>

              <div className="form-control">
                <label className="cursor-pointer label">
                  <span className="label-text font-medium">
                    {t('profile:preferences.accessibility.screenReader')}
                  </span>
                  <input
                    type="checkbox"
                    checked={preferences.accessibility.screenReader}
                    onChange={e =>
                      handlePreferenceChange('accessibility', 'screenReader', e.target.checked)
                    }
                    className="toggle toggle-primary"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Privacy Settings */}
        <div className="card bg-base-200 lg:col-span-2">
          <div className="card-body">
            <h3 className="card-title text-lg mb-4">
              <Settings className="h-5 w-5 text-warning" />
              {t('profile:preferences.privacy.title')}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text font-medium">
                      {t('profile:preferences.privacy.dataSharing')}
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences.privacy.dataSharing}
                      onChange={e =>
                        handlePreferenceChange('privacy', 'dataSharing', e.target.checked)
                      }
                      className="toggle toggle-primary"
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      {t('profile:preferences.privacy.dataSharingDesc')}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text font-medium">
                      {t('profile:preferences.privacy.analytics')}
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences.privacy.analytics}
                      onChange={e =>
                        handlePreferenceChange('privacy', 'analytics', e.target.checked)
                      }
                      className="toggle toggle-primary"
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      {t('profile:preferences.privacy.analyticsDesc')}
                    </span>
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text font-medium">
                      {t('profile:preferences.privacy.marketing')}
                    </span>
                    <input
                      type="checkbox"
                      checked={preferences.privacy.marketing}
                      onChange={e =>
                        handlePreferenceChange('privacy', 'marketing', e.target.checked)
                      }
                      className="toggle toggle-primary"
                    />
                  </label>
                  <label className="label">
                    <span className="label-text-alt text-base-content/60">
                      {t('profile:preferences.privacy.marketingDesc')}
                    </span>
                  </label>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">
                      {t('profile:preferences.privacy.profileVisibility')}
                    </span>
                  </label>
                  <select
                    value={preferences.privacy.profileVisibility}
                    onChange={e =>
                      handlePreferenceChange('privacy', 'profileVisibility', e.target.value)
                    }
                    className="select select-bordered"
                  >
                    <option value="public">
                      {t('profile:preferences.privacy.visibility.public')}
                    </option>
                    <option value="contacts">
                      {t('profile:preferences.privacy.visibility.contacts')}
                    </option>
                    <option value="private">
                      {t('profile:preferences.privacy.visibility.private')}
                    </option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Save Changes Banner */}
      {hasChanges && (
        <div className="alert alert-warning">
          <Settings className="h-5 w-5" />
          <div className="flex-1">
            <h4 className="font-medium">{t('profile:preferences.unsavedChanges')}</h4>
            <p className="text-sm">{t('profile:preferences.unsavedChangesDesc')}</p>
          </div>
          <div className="flex space-x-2">
            <button onClick={handleReset} className="btn btn-sm btn-outline">
              {t('common:discard')}
            </button>
            <button onClick={handleSave} className="btn btn-sm btn-primary" disabled={isLoading}>
              {t('common:save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PreferencesSection;
