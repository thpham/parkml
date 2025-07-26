import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  Smartphone,
  Monitor,
  Tablet,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface PasskeyManagerProps {
  passkeyCount: number;
  onPasskeyCountChange: (count: number) => void;
}

interface PasskeyCredential {
  id: string;
  credentialId: string;
  deviceName: string;
  deviceType: 'mobile' | 'desktop' | 'tablet' | 'unknown';
  createdAt: string;
  lastUsedAt: string | null;
  isActive: boolean;
}

const PasskeyManager: React.FC<PasskeyManagerProps> = ({ onPasskeyCountChange }) => {
  const { t } = useTranslation(['security', 'common']);
  const [passkeys, setPasskeys] = useState<PasskeyCredential[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddPasskey, setShowAddPasskey] = useState(false);
  const [newDeviceName, setNewDeviceName] = useState('');
  const loadingRef = useRef(false);

  const loadPasskeys = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (isLoading || loadingRef.current) {
      return;
    }

    loadingRef.current = true;

    try {
      setIsLoading(true);
      const response = await fetch('/api/security/passkeys', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        setPasskeys(result.data?.passkeys || []);
      } else {
        throw new Error('Failed to load passkeys');
      }
    } catch (error) {
      console.error('Error loading passkeys:', error);
      toast.error('Failed to load passkeys');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  }, [isLoading]);

  useEffect(() => {
    loadPasskeys();
  }, [loadPasskeys]);

  const registerPasskey = async () => {
    if (!newDeviceName.trim()) {
      toast.error(t('security:passkeys.errors.deviceNameRequired'));
      return;
    }

    try {
      setIsLoading(true);

      // Start registration
      const beginResponse = await fetch('/api/security/passkeys/register/begin', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ deviceName: newDeviceName }),
      });

      if (!beginResponse.ok) {
        throw new Error('Failed to start passkey registration');
      }

      const response = await beginResponse.json();
      const registrationOptions = response.data;

      // Use WebAuthn API
      const { startRegistration } = await import('@simplewebauthn/browser');
      const credential = await startRegistration({ optionsJSON: registrationOptions });

      // Complete registration
      const finishResponse = await fetch('/api/security/passkeys/register/complete', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          attestationResponse: credential,
          deviceName: newDeviceName,
        }),
      });

      if (finishResponse.ok) {
        toast.success(t('security:passkeys.success.registered'));
        setNewDeviceName('');
        setShowAddPasskey(false);
        await loadPasskeys();
        onPasskeyCountChange(passkeys.length + 1);
      } else {
        throw new Error('Failed to complete passkey registration');
      }
    } catch (error: unknown) {
      console.error('Passkey registration error:', error);
      const errorName = error instanceof Error ? error.name : '';
      if (errorName === 'NotAllowedError') {
        toast.error(t('security:passkeys.errors.userCancelled'));
      } else if (errorName === 'NotSupportedError') {
        toast.error(t('security:passkeys.errors.notSupported'));
      } else {
        toast.error(t('security:passkeys.errors.registrationFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const deletePasskey = async (passkeyId: string, deviceName: string) => {
    if (!confirm(t('security:passkeys.confirmDelete', { deviceName }))) {
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch(`/api/security/passkeys/${passkeyId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        toast.success(t('security:passkeys.success.deleted'));
        await loadPasskeys();
        onPasskeyCountChange(passkeys.length - 1);
      } else {
        throw new Error('Failed to delete passkey');
      }
    } catch (error) {
      console.error('Error deleting passkey:', error);
      toast.error(t('security:passkeys.errors.deleteFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'mobile':
        return Smartphone;
      case 'tablet':
        return Tablet;
      case 'desktop':
        return Monitor;
      default:
        return Shield;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (isLoading && passkeys.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-md"></div>
          <p className="mt-2 text-sm text-base-content/60">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">{t('security:passkeys.title')}</h3>
          <p className="text-sm text-base-content/60">{t('security:passkeys.description')}</p>
        </div>
        <button
          onClick={() => setShowAddPasskey(true)}
          className="btn btn-primary btn-sm"
          disabled={isLoading}
        >
          <Plus className="h-4 w-4 mr-1" />
          {t('security:passkeys.add')}
        </button>
      </div>

      {/* WebAuthn Support Check */}
      {typeof window !== 'undefined' && !window.PublicKeyCredential && (
        <div className="alert alert-warning">
          <AlertCircle className="h-5 w-5" />
          <div>
            <h4 className="font-medium">{t('security:passkeys.unsupported.title')}</h4>
            <p className="text-sm">{t('security:passkeys.unsupported.description')}</p>
          </div>
        </div>
      )}

      {/* Add Passkey Form */}
      {showAddPasskey && (
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <h4 className="font-medium mb-3">{t('security:passkeys.add')}</h4>
            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">{t('security:passkeys.deviceName')}</span>
                </label>
                <input
                  type="text"
                  value={newDeviceName}
                  onChange={e => setNewDeviceName(e.target.value)}
                  placeholder={t('security:passkeys.deviceNamePlaceholder')}
                  className="input input-bordered"
                  maxLength={50}
                />
                <label className="label">
                  <span className="label-text-alt">{t('security:passkeys.deviceNameHint')}</span>
                </label>
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={registerPasskey}
                  disabled={isLoading || !newDeviceName.trim()}
                  className="btn btn-primary"
                >
                  {isLoading && <span className="loading loading-spinner loading-sm"></span>}
                  {t('security:passkeys.register')}
                </button>
                <button
                  onClick={() => {
                    setShowAddPasskey(false);
                    setNewDeviceName('');
                  }}
                  className="btn btn-outline"
                >
                  {t('common:cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Passkey List */}
      {passkeys.length === 0 ? (
        <div className="text-center py-8">
          <Shield className="h-12 w-12 text-base-content/30 mx-auto mb-3" />
          <h3 className="font-medium text-base-content/60 mb-1">
            {t('security:passkeys.noPasskeys')}
          </h3>
          <p className="text-sm text-base-content/50">
            {t('security:passkeys.noPasskeysDescription')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {passkeys.map(passkey => {
            const DeviceIcon = getDeviceIcon(passkey.deviceType);
            return (
              <div key={passkey.id} className="card bg-base-200 border border-base-300">
                <div className="card-body p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <DeviceIcon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">{passkey.deviceName}</h4>
                        <div className="flex items-center space-x-4 text-xs text-base-content/60">
                          <span>
                            {t('security:passkeys.created')}: {formatDate(passkey.createdAt)}
                          </span>
                          {passkey.lastUsedAt && (
                            <span>
                              {t('security:passkeys.lastUsed')}: {formatDate(passkey.lastUsedAt)}
                            </span>
                          )}
                          {!passkey.lastUsedAt && (
                            <span className="text-warning">{t('security:passkeys.neverUsed')}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {passkey.isActive ? (
                        <div className="badge badge-success badge-sm">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('security:status.active')}
                        </div>
                      ) : (
                        <div className="badge badge-error badge-sm">
                          {t('security:status.inactive')}
                        </div>
                      )}

                      <button
                        onClick={() => deletePasskey(passkey.id, passkey.deviceName)}
                        className="btn btn-ghost btn-sm btn-square text-error hover:bg-error/10"
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Security Information */}
      <div className="card bg-info/10 border border-info/20">
        <div className="card-body p-4">
          <div className="flex items-start space-x-3">
            <Shield className="h-5 w-5 text-info flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-medium text-info mb-1">{t('security:passkeys.info.title')}</h4>
              <ul className="text-sm text-base-content/70 space-y-1">
                <li>• {t('security:passkeys.info.point1')}</li>
                <li>• {t('security:passkeys.info.point2')}</li>
                <li>• {t('security:passkeys.info.point3')}</li>
                <li>• {t('security:passkeys.info.point4')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PasskeyManager;
