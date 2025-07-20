import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Key, 
  Smartphone, 
  AlertTriangle, 
  Clock,
  Eye
} from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

// Security sub-components
import TwoFactorSetup from './security/TwoFactorSetup';
import PasskeyManager from './security/PasskeyManager';
import SecurityAuditLog from './security/SecurityAuditLog';
import PasswordChangeForm from './security/PasswordChangeForm';

interface SecuritySectionProps {}

interface SecurityStatus {
  passwordStrength: 'weak' | 'medium' | 'strong';
  twoFactorEnabled: boolean;
  passkeyCount: number;
  lastPasswordChange: Date | null;
  recentLoginAttempts: number;
  securityScore: number;
}

const SecuritySection: React.FC<SecuritySectionProps> = () => {
  const { t } = useTranslation(['profile', 'security', 'common']);
  const [securityStatus, setSecurityStatus] = useState<SecurityStatus>({
    passwordStrength: 'medium',
    twoFactorEnabled: false,
    passkeyCount: 0,
    lastPasswordChange: null,
    recentLoginAttempts: 0,
    securityScore: 65
  });
  const [isLoading, setIsLoading] = useState(true);
  const [activeSubSection, setActiveSubSection] = useState<string | null>(null);

  useEffect(() => {
    loadSecurityStatus();
  }, []);

  const loadSecurityStatus = async () => {
    try {
      setIsLoading(true);
      
      // Fetch actual security data from multiple endpoints
      const [twoFactorResponse, passkeysResponse] = await Promise.all([
        fetch('/api/security/2fa/status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`
          }
        }),
        fetch('/api/security/passkeys', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`
          }
        })
      ]);
      
      let twoFactorEnabled = false;
      let passkeyCount = 0;
      
      // Get 2FA status
      if (twoFactorResponse.ok) {
        const twoFactorData = await twoFactorResponse.json();
        twoFactorEnabled = twoFactorData.data?.isEnabled || false;
      }
      
      // Get passkey count
      if (passkeysResponse.ok) {
        const passkeysData = await passkeysResponse.json();
        passkeyCount = passkeysData.data?.passkeys?.length || 0;
      }
      
      // Calculate security score based on actual status
      let securityScore = 40; // Base score
      if (twoFactorEnabled) securityScore += 25;
      if (passkeyCount > 0) securityScore += 20;
      securityScore += 15; // For having a password
      
      setSecurityStatus({
        passwordStrength: 'medium', // TODO: Get from user profile
        twoFactorEnabled,
        passkeyCount,
        lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // TODO: Get from profile
        recentLoginAttempts: 0, // TODO: Get from audit logs
        securityScore: Math.min(securityScore, 100)
      });
      
    } catch (error) {
      console.error('Failed to load security status:', error);
      // Fallback to default values
      setSecurityStatus({
        passwordStrength: 'medium',
        twoFactorEnabled: false,
        passkeyCount: 0,
        lastPasswordChange: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        recentLoginAttempts: 0,
        securityScore: 40
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getSecurityScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 70) return 'text-warning';
    return 'text-error';
  };

  const getSecurityScoreLabel = (score: number) => {
    if (score >= 90) return t('security:score.excellent');
    if (score >= 70) return t('security:score.good');
    if (score >= 50) return t('security:score.fair');
    return t('security:score.poor');
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
      {/* Security Overview Header */}
      <div className="border-b border-base-300 pb-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-base-content mb-2">
              {t('profile:security.title')}
            </h2>
            <p className="text-base-content/60">
              {t('profile:security.description')}
            </p>
          </div>
          <div className="text-right">
            <div className={`text-2xl font-bold ${getSecurityScoreColor(securityStatus.securityScore)}`}>
              {securityStatus.securityScore}%
            </div>
            <div className="text-sm text-base-content/60">
              {getSecurityScoreLabel(securityStatus.securityScore)}
            </div>
          </div>
        </div>

        {/* Security Score Progress */}
        <div className="w-full bg-base-300 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              securityStatus.securityScore >= 90 ? 'bg-success' :
              securityStatus.securityScore >= 70 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${securityStatus.securityScore}%` }}
          ></div>
        </div>
      </div>

      {/* Security Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Password Status */}
        <div className="card bg-base-200 border-l-4 border-l-primary">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{t('security:password.title')}</h3>
                <p className={`text-xs capitalize ${
                  securityStatus.passwordStrength === 'strong' ? 'text-success' :
                  securityStatus.passwordStrength === 'medium' ? 'text-warning' : 'text-error'
                }`}>
                  {t(`security:password.strength.${securityStatus.passwordStrength}`)}
                </p>
              </div>
              <Key className="h-5 w-5 text-base-content/60" />
            </div>
          </div>
        </div>

        {/* 2FA Status */}
        <div className="card bg-base-200 border-l-4 border-l-secondary">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{t('security:twoFactor.title')}</h3>
                <p className={`text-xs ${securityStatus.twoFactorEnabled ? 'text-success' : 'text-error'}`}>
                  {securityStatus.twoFactorEnabled ? t('security:status.enabled') : t('security:status.disabled')}
                </p>
              </div>
              <Smartphone className="h-5 w-5 text-base-content/60" />
            </div>
          </div>
        </div>

        {/* Passkeys Status */}
        <div className="card bg-base-200 border-l-4 border-l-accent">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{t('security:passkeys.title')}</h3>
                <p className="text-xs text-base-content/60">
                  {securityStatus.passkeyCount} {t('security:passkeys.registered')}
                </p>
              </div>
              <Shield className="h-5 w-5 text-base-content/60" />
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card bg-base-200 border-l-4 border-l-info">
          <div className="card-body p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-sm">{t('security:activity.title')}</h3>
                <p className="text-xs text-base-content/60">
                  {securityStatus.recentLoginAttempts} {t('security:activity.recentAttempts')}
                </p>
              </div>
              <Clock className="h-5 w-5 text-base-content/60" />
            </div>
          </div>
        </div>
      </div>

      {/* Security Recommendations */}
      {securityStatus.securityScore < 90 && (
        <div className="alert alert-warning">
          <AlertTriangle className="h-5 w-5" />
          <div>
            <h3 className="font-medium">{t('security:recommendations.title')}</h3>
            <div className="text-sm mt-1 space-y-1">
              {!securityStatus.twoFactorEnabled && (
                <p>• {t('security:recommendations.enable2fa')}</p>
              )}
              {securityStatus.passkeyCount === 0 && (
                <p>• {t('security:recommendations.addPasskey')}</p>
              )}
              {securityStatus.passwordStrength !== 'strong' && (
                <p>• {t('security:recommendations.strongPassword')}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Security Settings Sections */}
      <div className="space-y-4">
        {/* Password Management */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Key className="h-5 w-5 text-primary" />
                <div>
                  <h3 className="font-medium">{t('security:password.change')}</h3>
                  <p className="text-sm text-base-content/60">
                    {securityStatus.lastPasswordChange 
                      ? t('security:password.lastChanged', { 
                          date: securityStatus.lastPasswordChange.toLocaleDateString() 
                        })
                      : t('security:password.neverChanged')
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubSection(activeSubSection === 'password' ? null : 'password')}
                className="btn btn-outline btn-sm"
              >
                {activeSubSection === 'password' ? t('common:cancel') : t('common:change')}
              </button>
            </div>
            {activeSubSection === 'password' && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <PasswordChangeForm onSuccess={() => setActiveSubSection(null)} />
              </div>
            )}
          </div>
        </div>

        {/* Two-Factor Authentication */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Smartphone className="h-5 w-5 text-secondary" />
                <div>
                  <h3 className="font-medium">{t('security:twoFactor.title')}</h3>
                  <p className="text-sm text-base-content/60">
                    {t('security:twoFactor.description')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {securityStatus.twoFactorEnabled && (
                  <div className="badge badge-success badge-sm">
                    {t('security:status.enabled')}
                  </div>
                )}
                <button
                  onClick={() => setActiveSubSection(activeSubSection === '2fa' ? null : '2fa')}
                  className={`btn btn-sm ${securityStatus.twoFactorEnabled ? 'btn-outline' : 'btn-primary'}`}
                >
                  {securityStatus.twoFactorEnabled 
                    ? (activeSubSection === '2fa' ? t('common:cancel') : t('security:twoFactor.manage'))
                    : t('security:twoFactor.setupButton')
                  }
                </button>
              </div>
            </div>
            {activeSubSection === '2fa' && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <TwoFactorSetup 
                  isEnabled={securityStatus.twoFactorEnabled}
                  onStatusChange={(enabled) => {
                    setSecurityStatus(prev => ({ ...prev, twoFactorEnabled: enabled }));
                    // Reload full security status to update score
                    loadSecurityStatus();
                  }}
                  onClose={() => setActiveSubSection(null)}
                />
              </div>
            )}
          </div>
        </div>

        {/* Passkey Management */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Shield className="h-5 w-5 text-accent" />
                <div>
                  <h3 className="font-medium">{t('security:passkeys.title')}</h3>
                  <p className="text-sm text-base-content/60">
                    {t('security:passkeys.description')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubSection(activeSubSection === 'passkeys' ? null : 'passkeys')}
                className="btn btn-outline btn-sm"
              >
                {activeSubSection === 'passkeys' ? t('common:cancel') : t('security:passkeys.manage')}
              </button>
            </div>
            {activeSubSection === 'passkeys' && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <PasskeyManager 
                  passkeyCount={securityStatus.passkeyCount}
                  onPasskeyCountChange={(count) => {
                    setSecurityStatus(prev => ({ ...prev, passkeyCount: count }));
                    // Reload full security status to update score
                    loadSecurityStatus();
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Security Audit Log */}
        <div className="card bg-base-100 border border-base-300">
          <div className="card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Eye className="h-5 w-5 text-info" />
                <div>
                  <h3 className="font-medium">{t('security:auditLog.title')}</h3>
                  <p className="text-sm text-base-content/60">
                    {t('security:auditLog.description')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSubSection(activeSubSection === 'audit' ? null : 'audit')}
                className="btn btn-outline btn-sm"
              >
                {activeSubSection === 'audit' ? t('common:hide') : t('common:view')}
              </button>
            </div>
            {activeSubSection === 'audit' && (
              <div className="mt-4 pt-4 border-t border-base-300">
                <SecurityAuditLog />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecuritySection;