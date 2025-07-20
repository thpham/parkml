import React, { useState } from 'react';
import { User, Shield, Settings, Bell } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import Avatar from '../components/shared/Avatar';

// Profile section components
import PersonalInfoSection from '../components/profile/PersonalInfoSection';
import SecuritySection from '../components/profile/SecuritySection';
import PreferencesSection from '../components/profile/PreferencesSection';
import NotificationsSection from '../components/profile/NotificationsSection';

interface ProfilePageProps {}

const ProfilePage: React.FC<ProfilePageProps> = () => {
  const { user } = useAuth();
  const { t } = useTranslation(['profile', 'common']);
  const [activeTab, setActiveTab] = useState('personal');

  const tabs = [
    {
      id: 'personal',
      title: t('profile:tabs.personalInfo'),
      icon: User,
      description: t('profile:tabs.personalInfoDesc')
    },
    {
      id: 'security',
      title: t('profile:tabs.security'),
      icon: Shield,
      description: t('profile:tabs.securityDesc')
    },
    {
      id: 'preferences',
      title: t('profile:tabs.preferences'),
      icon: Settings,
      description: t('profile:tabs.preferencesDesc')
    },
    {
      id: 'notifications',
      title: t('profile:tabs.notifications'),
      icon: Bell,
      description: t('profile:tabs.notificationsDesc')
    }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'personal':
        return <PersonalInfoSection />;
      case 'security':
        return <SecuritySection />;
      case 'preferences':
        return <PreferencesSection />;
      case 'notifications':
        return <NotificationsSection />;
      default:
        return <PersonalInfoSection />;
    }
  };

  if (!user) {
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
    <div className="max-w-screen-2xl mx-auto p-4 sm:p-6">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-base-content mb-2">
              {t('profile:pageTitle')}
            </h1>
            <p className="text-base-content/60 text-sm sm:text-base">
              {t('profile:pageDescription')}
            </p>
          </div>
          <div className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-primary/10 rounded-lg">
            <div className="w-2 h-2 bg-success rounded-full"></div>
            <span className="text-sm font-medium">{t('profile:status.active')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Navigation - Desktop */}
        <div className="hidden lg:block lg:col-span-1">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-0">
              <div className="p-4 border-b border-base-300">
                <div className="flex items-center space-x-3">
                  <Avatar
                    variant="initial"
                    color="primary"
                    size="lg"
                    aria-label={`${user.name || user.email} profile avatar`}
                  >
                    {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">{user.name || user.email}</h3>
                    <p className="text-xs text-base-content/60 capitalize">{user.role}</p>
                  </div>
                </div>
              </div>
              
              <nav className="p-2">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center space-x-3 px-3 py-3 rounded-lg transition-colors text-left ${
                        activeTab === tab.id
                          ? 'bg-primary text-primary-content'
                          : 'hover:bg-base-200 text-base-content'
                      }`}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{tab.title}</div>
                        <div className={`text-xs mt-0.5 ${
                          activeTab === tab.id ? 'text-primary-content/80' : 'text-base-content/60'
                        }`}>
                          {tab.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="lg:hidden col-span-1">
          <div className="tabs tabs-boxed grid grid-cols-2 gap-1 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`tab tab-sm flex flex-col items-center gap-1 py-3 ${
                    activeTab === tab.id ? 'tab-active' : ''
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs">{tab.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-3">
          <div className="card bg-base-100 shadow-lg">
            <div className="card-body p-4 sm:p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;