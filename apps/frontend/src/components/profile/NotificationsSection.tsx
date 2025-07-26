import React, { useState, useEffect } from 'react';
import {
  Bell,
  Mail,
  MessageSquare,
  Clock,
  Volume2,
  Smartphone,
  Monitor,
  Check,
  X,
  AlertCircle,
  Settings,
  Save,
  Trash2,
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface NotificationsSectionProps {}

interface NotificationSettings {
  email: {
    enabled: boolean;
    symptomReminders: boolean;
    appointmentReminders: boolean;
    medicationReminders: boolean;
    systemUpdates: boolean;
    securityAlerts: boolean;
    weeklyReports: boolean;
    frequency: 'immediate' | 'daily' | 'weekly';
  };
  push: {
    enabled: boolean;
    symptomReminders: boolean;
    appointmentReminders: boolean;
    medicationReminders: boolean;
    emergencyAlerts: boolean;
    quietHours: {
      enabled: boolean;
      start: string;
      end: string;
    };
  };
  sms: {
    enabled: boolean;
    emergencyOnly: boolean;
    appointmentReminders: boolean;
    phoneNumber: string;
  };
  inApp: {
    sound: boolean;
    vibration: boolean;
    badges: boolean;
    popups: boolean;
  };
}

interface NotificationHistory {
  id: string;
  type: 'email' | 'push' | 'sms';
  category: 'reminder' | 'alert' | 'update' | 'report';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  success: boolean;
}

const NotificationsSection: React.FC<NotificationsSectionProps> = () => {
  const { t } = useTranslation(['profile', 'common']);
  const [settings, setSettings] = useState<NotificationSettings>({
    email: {
      enabled: true,
      symptomReminders: true,
      appointmentReminders: true,
      medicationReminders: true,
      systemUpdates: true,
      securityAlerts: true,
      weeklyReports: false,
      frequency: 'daily',
    },
    push: {
      enabled: true,
      symptomReminders: true,
      appointmentReminders: true,
      medicationReminders: true,
      emergencyAlerts: true,
      quietHours: {
        enabled: true,
        start: '22:00',
        end: '07:00',
      },
    },
    sms: {
      enabled: false,
      emergencyOnly: true,
      appointmentReminders: false,
      phoneNumber: '',
    },
    inApp: {
      sound: true,
      vibration: true,
      badges: true,
      popups: true,
    },
  });
  const [notificationHistory, setNotificationHistory] = useState<NotificationHistory[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('settings');

  useEffect(() => {
    loadNotificationSettings();
    loadNotificationHistory();
  }, []);

  const loadNotificationSettings = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/notification-settings', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotificationHistory = async () => {
    try {
      const response = await fetch('/api/user/notification-history', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotificationHistory(data.notifications || []);
      } else {
        // Mock data for development
        setNotificationHistory([
          {
            id: '1',
            type: 'push',
            category: 'reminder',
            title: 'Symptom Tracking Reminder',
            message: "Don't forget to log your symptoms for today",
            timestamp: '2024-01-20T09:00:00Z',
            read: true,
            success: true,
          },
          {
            id: '2',
            type: 'email',
            category: 'report',
            title: 'Weekly Health Report',
            message: 'Your weekly health summary is ready',
            timestamp: '2024-01-19T10:00:00Z',
            read: false,
            success: true,
          },
          {
            id: '3',
            type: 'push',
            category: 'alert',
            title: 'Appointment Reminder',
            message: 'You have a doctor appointment tomorrow at 2:00 PM',
            timestamp: '2024-01-18T16:00:00Z',
            read: true,
            success: true,
          },
        ]);
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
  };

  const handleSettingChange = (
    category: keyof NotificationSettings,
    key: string,
    value: boolean | string,
    nested?: string
  ) => {
    setSettings(prev => ({
      ...prev,
      [category]: nested
        ? {
            ...(prev[category] as Record<string, unknown>),
            [nested]: {
              ...((prev[category] as Record<string, unknown>)[nested] as Record<string, unknown>),
              [key]: value,
            },
          }
        : {
            ...(prev[category] as Record<string, unknown>),
            [key]: value,
          },
    }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/user/notification-settings', {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        setHasChanges(false);
        toast.success(t('profile:notifications.saveSuccess'));
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving notification settings:', error);
      toast.error(t('profile:notifications.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  const testNotification = async (type: 'email' | 'push' | 'sms') => {
    try {
      const response = await fetch('/api/user/test-notification', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type }),
      });

      if (response.ok) {
        toast.success(t(`profile:notifications.testSent.${type}`));
      } else {
        throw new Error('Failed to send test notification');
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      toast.error(t('profile:notifications.testError'));
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch(`/api/user/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      setNotificationHistory(prev =>
        prev.map(notif => (notif.id === notificationId ? { ...notif, read: true } : notif))
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const clearHistory = async () => {
    if (!confirm(t('profile:notifications.clearHistoryConfirm'))) {
      return;
    }

    try {
      await fetch('/api/user/notification-history', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      setNotificationHistory([]);
      toast.success(t('profile:notifications.historyCleared'));
    } catch (error) {
      console.error('Error clearing notification history:', error);
      toast.error(t('profile:notifications.clearError'));
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'email':
        return Mail;
      case 'push':
        return Smartphone;
      case 'sms':
        return MessageSquare;
      default:
        return Bell;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'reminder':
        return 'badge-info';
      case 'alert':
        return 'badge-warning';
      case 'update':
        return 'badge-success';
      case 'report':
        return 'badge-primary';
      default:
        return 'badge-ghost';
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
            {t('profile:notifications.title')}
          </h2>
          <p className="text-base-content/60 mt-1">{t('profile:notifications.description')}</p>
        </div>
        {hasChanges && (
          <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isLoading}>
            {isLoading ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            {t('common:save')}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="tabs tabs-boxed">
        <button
          onClick={() => setActiveTab('settings')}
          className={`tab ${activeTab === 'settings' ? 'tab-active' : ''}`}
        >
          <Settings className="h-4 w-4 mr-2" />
          {t('profile:notifications.tabs.settings')}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`tab ${activeTab === 'history' ? 'tab-active' : ''}`}
        >
          <Clock className="h-4 w-4 mr-2" />
          {t('profile:notifications.tabs.history')}
        </button>
      </div>

      {activeTab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Email Notifications */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">
                  <Mail className="h-5 w-5 text-primary" />
                  {t('profile:notifications.email.title')}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.email.enabled}
                    onChange={e => handleSettingChange('email', 'enabled', e.target.checked)}
                    className="toggle toggle-primary"
                  />
                  <button
                    onClick={() => testNotification('email')}
                    className="btn btn-outline btn-xs"
                    disabled={!settings.email.enabled}
                  >
                    {t('profile:notifications.test')}
                  </button>
                </div>
              </div>

              {settings.email.enabled && (
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.email.symptomReminders')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email.symptomReminders}
                        onChange={e =>
                          handleSettingChange('email', 'symptomReminders', e.target.checked)
                        }
                        className="checkbox checkbox-primary"
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.email.appointmentReminders')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email.appointmentReminders}
                        onChange={e =>
                          handleSettingChange('email', 'appointmentReminders', e.target.checked)
                        }
                        className="checkbox checkbox-primary"
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.email.medicationReminders')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email.medicationReminders}
                        onChange={e =>
                          handleSettingChange('email', 'medicationReminders', e.target.checked)
                        }
                        className="checkbox checkbox-primary"
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.email.weeklyReports')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.email.weeklyReports}
                        onChange={e =>
                          handleSettingChange('email', 'weeklyReports', e.target.checked)
                        }
                        className="checkbox checkbox-primary"
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        {t('profile:notifications.email.frequency')}
                      </span>
                    </label>
                    <select
                      value={settings.email.frequency}
                      onChange={e => handleSettingChange('email', 'frequency', e.target.value)}
                      className="select select-bordered select-sm"
                    >
                      <option value="immediate">
                        {t('profile:notifications.frequencies.immediate')}
                      </option>
                      <option value="daily">{t('profile:notifications.frequencies.daily')}</option>
                      <option value="weekly">
                        {t('profile:notifications.frequencies.weekly')}
                      </option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Push Notifications */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">
                  <Smartphone className="h-5 w-5 text-secondary" />
                  {t('profile:notifications.push.title')}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.push.enabled}
                    onChange={e => handleSettingChange('push', 'enabled', e.target.checked)}
                    className="toggle toggle-secondary"
                  />
                  <button
                    onClick={() => testNotification('push')}
                    className="btn btn-outline btn-xs"
                    disabled={!settings.push.enabled}
                  >
                    {t('profile:notifications.test')}
                  </button>
                </div>
              </div>

              {settings.push.enabled && (
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.push.symptomReminders')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push.symptomReminders}
                        onChange={e =>
                          handleSettingChange('push', 'symptomReminders', e.target.checked)
                        }
                        className="checkbox checkbox-secondary"
                      />
                    </label>
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.push.emergencyAlerts')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push.emergencyAlerts}
                        onChange={e =>
                          handleSettingChange('push', 'emergencyAlerts', e.target.checked)
                        }
                        className="checkbox checkbox-secondary"
                      />
                    </label>
                  </div>

                  <div className="divider text-xs">
                    {t('profile:notifications.push.quietHours')}
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.push.enableQuietHours')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.push.quietHours.enabled}
                        onChange={e =>
                          handleSettingChange('push', 'enabled', e.target.checked, 'quietHours')
                        }
                        className="checkbox checkbox-secondary"
                      />
                    </label>
                  </div>

                  {settings.push.quietHours.enabled && (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs">
                            {t('profile:notifications.push.quietStart')}
                          </span>
                        </label>
                        <input
                          type="time"
                          value={settings.push.quietHours.start}
                          onChange={e =>
                            handleSettingChange('push', 'start', e.target.value, 'quietHours')
                          }
                          className="input input-bordered input-sm"
                        />
                      </div>
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text text-xs">
                            {t('profile:notifications.push.quietEnd')}
                          </span>
                        </label>
                        <input
                          type="time"
                          value={settings.push.quietHours.end}
                          onChange={e =>
                            handleSettingChange('push', 'end', e.target.value, 'quietHours')
                          }
                          className="input input-bordered input-sm"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SMS Notifications */}
          <div className="card bg-base-200">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="card-title text-lg">
                  <MessageSquare className="h-5 w-5 text-accent" />
                  {t('profile:notifications.sms.title')}
                </h3>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={settings.sms.enabled}
                    onChange={e => handleSettingChange('sms', 'enabled', e.target.checked)}
                    className="toggle toggle-accent"
                  />
                  <button
                    onClick={() => testNotification('sms')}
                    className="btn btn-outline btn-xs"
                    disabled={!settings.sms.enabled}
                  >
                    {t('profile:notifications.test')}
                  </button>
                </div>
              </div>

              {settings.sms.enabled && (
                <div className="space-y-3">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">
                        {t('profile:notifications.sms.phoneNumber')}
                      </span>
                    </label>
                    <input
                      type="tel"
                      value={settings.sms.phoneNumber}
                      onChange={e => handleSettingChange('sms', 'phoneNumber', e.target.value)}
                      placeholder="+41 XX XXX XX XX"
                      className="input input-bordered"
                    />
                  </div>

                  <div className="form-control">
                    <label className="cursor-pointer label">
                      <span className="label-text">
                        {t('profile:notifications.sms.emergencyOnly')}
                      </span>
                      <input
                        type="checkbox"
                        checked={settings.sms.emergencyOnly}
                        onChange={e =>
                          handleSettingChange('sms', 'emergencyOnly', e.target.checked)
                        }
                        className="checkbox checkbox-accent"
                      />
                    </label>
                  </div>

                  {!settings.sms.emergencyOnly && (
                    <div className="form-control">
                      <label className="cursor-pointer label">
                        <span className="label-text">
                          {t('profile:notifications.sms.appointmentReminders')}
                        </span>
                        <input
                          type="checkbox"
                          checked={settings.sms.appointmentReminders}
                          onChange={e =>
                            handleSettingChange('sms', 'appointmentReminders', e.target.checked)
                          }
                          className="checkbox checkbox-accent"
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* In-App Notifications */}
          <div className="card bg-base-200">
            <div className="card-body">
              <h3 className="card-title text-lg mb-4">
                <Monitor className="h-5 w-5 text-info" />
                {t('profile:notifications.inApp.title')}
              </h3>

              <div className="space-y-3">
                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text flex items-center">
                      <Volume2 className="h-4 w-4 mr-2" />
                      {t('profile:notifications.inApp.sound')}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.inApp.sound}
                      onChange={e => handleSettingChange('inApp', 'sound', e.target.checked)}
                      className="checkbox checkbox-info"
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text flex items-center">
                      <Smartphone className="h-4 w-4 mr-2" />
                      {t('profile:notifications.inApp.vibration')}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.inApp.vibration}
                      onChange={e => handleSettingChange('inApp', 'vibration', e.target.checked)}
                      className="checkbox checkbox-info"
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text flex items-center">
                      <Bell className="h-4 w-4 mr-2" />
                      {t('profile:notifications.inApp.badges')}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.inApp.badges}
                      onChange={e => handleSettingChange('inApp', 'badges', e.target.checked)}
                      className="checkbox checkbox-info"
                    />
                  </label>
                </div>

                <div className="form-control">
                  <label className="cursor-pointer label">
                    <span className="label-text flex items-center">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      {t('profile:notifications.inApp.popups')}
                    </span>
                    <input
                      type="checkbox"
                      checked={settings.inApp.popups}
                      onChange={e => handleSettingChange('inApp', 'popups', e.target.checked)}
                      className="checkbox checkbox-info"
                    />
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{t('profile:notifications.history.title')}</h3>
            <button
              onClick={clearHistory}
              className="btn btn-outline btn-sm"
              disabled={notificationHistory.length === 0}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {t('profile:notifications.clearHistory')}
            </button>
          </div>

          {notificationHistory.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-base-content/30 mx-auto mb-3" />
              <h3 className="font-medium text-base-content/60 mb-1">
                {t('profile:notifications.history.empty')}
              </h3>
              <p className="text-sm text-base-content/50">
                {t('profile:notifications.history.emptyDesc')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {notificationHistory.map(notification => {
                const Icon = getNotificationIcon(notification.type);

                return (
                  <div
                    key={notification.id}
                    className={`card bg-base-200 border ${!notification.read ? 'border-primary' : 'border-base-300'}`}
                  >
                    <div className="card-body p-4">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          <Icon className="h-5 w-5 text-primary" />
                        </div>

                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <h4
                              className={`font-medium ${!notification.read ? 'text-primary' : ''}`}
                            >
                              {notification.title}
                            </h4>
                            <div className="flex items-center space-x-2">
                              <div
                                className={`badge badge-sm ${getCategoryColor(notification.category)}`}
                              >
                                {t(`profile:notifications.categories.${notification.category}`)}
                              </div>
                              {notification.success ? (
                                <Check className="h-4 w-4 text-success" />
                              ) : (
                                <X className="h-4 w-4 text-error" />
                              )}
                            </div>
                          </div>

                          <p className="text-sm text-base-content/70 mb-2">
                            {notification.message}
                          </p>

                          <div className="flex items-center justify-between">
                            <span className="text-xs text-base-content/60">
                              {new Date(notification.timestamp).toLocaleString()}
                            </span>

                            {!notification.read && (
                              <button
                                onClick={() => markAsRead(notification.id)}
                                className="btn btn-xs btn-outline"
                              >
                                {t('profile:notifications.markRead')}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Unsaved Changes Warning */}
      {hasChanges && (
        <div className="alert alert-warning">
          <AlertCircle className="h-5 w-5" />
          <div className="flex-1">
            <h4 className="font-medium">{t('profile:notifications.unsavedChanges')}</h4>
            <p className="text-sm">{t('profile:notifications.unsavedChangesDesc')}</p>
          </div>
          <button onClick={handleSave} className="btn btn-sm btn-primary" disabled={isLoading}>
            {t('common:save')}
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsSection;
