import React, { useState, useEffect, useRef } from 'react';
import { Copy, Download, AlertCircle, RotateCcw, Trash2 } from 'lucide-react';
import QRCode from 'react-qr-code';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

// Safe QR Code wrapper to prevent crashes
const SafeQRCode: React.FC<{ value: string; size: number }> = ({ value, size }) => {
  try {
    if (!value || typeof value !== 'string' || value.trim() === '') {
      return (
        <div
          className={`w-[${size}px] h-[${size}px] flex items-center justify-center bg-gray-100 rounded`}
        >
          <p className="text-sm text-gray-500">Invalid QR data</p>
        </div>
      );
    }
    return <QRCode value={value} size={size} />;
  } catch (error) {
    console.error('QR Code error:', error);
    return (
      <div
        className={`w-[${size}px] h-[${size}px] flex items-center justify-center bg-gray-100 rounded`}
      >
        <p className="text-sm text-gray-500">QR Code error</p>
      </div>
    );
  }
};

interface TwoFactorSetupProps {
  isEnabled: boolean;
  onStatusChange: (enabled: boolean) => void;
  onClose: () => void;
}

interface TwoFactorSetupData {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
  manualEntryKey: string;
}

const TwoFactorSetup: React.FC<TwoFactorSetupProps> = ({ isEnabled, onStatusChange, onClose }) => {
  const { t } = useTranslation(['security', 'common']);
  const [currentStep, setCurrentStep] = useState<'setup' | 'verify' | 'manage'>('setup');

  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [setupVerificationCode, setSetupVerificationCode] = useState('');
  const [disableVerificationCode, setDisableVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showBackupCodes, setShowBackupCodes] = useState(false);

  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [generateVerificationCode, setGenerateVerificationCode] = useState('');
  const [backupCodesAccessed, setBackupCodesAccessed] = useState(false);
  const [hasExistingBackupCodes, setHasExistingBackupCodes] = useState(false);
  const [isLoadingBackupStatus, setIsLoadingBackupStatus] = useState(false);
  const [hasFreshCodes, setHasFreshCodes] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const initializingRef = useRef(false);
  const expirationNotifiedRef = useRef(false);

  // Security state for backup codes
  const [hasUnsavedCodes, setHasUnsavedCodes] = useState(false);
  const [codesConfirmed, setCodesConfirmed] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  useEffect(() => {
    if (isEnabled) {
      setCurrentStep('manage');

      // Check for fresh backup codes in localStorage first (survives component remount)
      const freshBackupCodes = localStorage.getItem('parkml_fresh_backup_codes');
      if (freshBackupCodes) {
        try {
          const codes = JSON.parse(freshBackupCodes);
          setSetupData({
            secret: '',
            qrCodeUrl: '',
            manualEntryKey: '',
            backupCodes: codes,
          });
          setHasExistingBackupCodes(true);
          setBackupCodesAccessed(false);
          setHasFreshCodes(true); // Mark as having fresh codes
          setHasUnsavedCodes(true); // Mark as having unsaved codes
          setCodesConfirmed(false); // Reset confirmation

          // Force show backup codes with a small delay to ensure all state is set
          setTimeout(() => {
            setShowBackupCodes(true);
            setShowConfirmation(true); // Show confirmation section
          }, 200);

          // DON'T clear from localStorage immediately - wait for user confirmation
          return; // Don't load existing status
        } catch {
          localStorage.removeItem('parkml_fresh_backup_codes');
        }
      }

      // Only load existing backup codes status if no fresh codes
      if (!hasFreshCodes) {
        loadBackupCodesStatus();
        setShowBackupCodes(false);
      }
    } else {
      // Only initialize if not already loading and no setup data exists
      if (!isLoading && !setupData) {
        initializeSetup();
      }
    }
  }, [isEnabled]); // Simplified dependencies

  // Cleanup countdown interval on unmount
  useEffect(() => {
    return () => {
      if (countdownInterval) {
        clearInterval(countdownInterval);
      }
    };
  }, [countdownInterval]);

  // Security: Warning before closing with unsaved backup codes
  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedCodes && !codesConfirmed) {
        const message = 'You have unsaved backup codes! Make sure to save them before leaving.';
        event.preventDefault();
        // Modern browsers ignore returnValue, but keep for compatibility
        event.returnValue = message;
        return message;
      }
      return undefined;
    };

    if (hasUnsavedCodes && !codesConfirmed) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }
    return undefined;
  }, [hasUnsavedCodes, codesConfirmed]);

  // Start countdown when setup data is loaded
  const startCountdown = () => {
    // Clear any existing countdown first
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }

    // Reset expiration notification flag for new cycle
    expirationNotifiedRef.current = false;
    setCountdown(60);

    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          // Auto-refresh setup when countdown reaches 0
          setTimeout(() => {
            // Only show notification once per expiration cycle
            if (!expirationNotifiedRef.current) {
              expirationNotifiedRef.current = true;
              toast(t('security:twoFactor.countdown.expired'), { icon: 'ℹ️' });
            }
            initializeSetup();
          }, 100);
          return null;
        }
        return prev - 1;
      });
    }, 1000);

    setCountdownInterval(interval);
  };

  const initializeSetup = async () => {
    // Prevent multiple simultaneous calls
    if (isLoading || initializingRef.current) {
      return;
    }

    initializingRef.current = true;

    // Clear any existing countdown
    if (countdownInterval) {
      clearInterval(countdownInterval);
      setCountdownInterval(null);
    }

    try {
      setIsLoading(true);
      setCountdown(null);
      const response = await fetch('/api/security/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setSetupData(result.data);
          setCurrentStep('setup');
          // Start 60-second countdown
          startCountdown();
        } else {
          throw new Error('Invalid 2FA setup response');
        }
      } else if (response.status === 400) {
        // 400 error might be due to incomplete setup, try to clean up and retry
        try {
          const cleanupResponse = await fetch('/api/security/2fa/setup', {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
            },
          });

          if (cleanupResponse.ok) {
            // Retry the setup after cleanup
            const retryResponse = await fetch('/api/security/2fa/setup', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
                'Content-Type': 'application/json',
              },
            });

            if (retryResponse.ok) {
              const retryResult = await retryResponse.json();
              if (retryResult.success && retryResult.data) {
                setSetupData(retryResult.data);
                setCurrentStep('setup');
                startCountdown();
                return; // Success!
              }
            }
          }
        } catch {
          // Cleanup failed, proceed with original error
        }

        throw new Error('Failed to initialize 2FA setup. Please try again.');
      } else {
        throw new Error('Failed to initialize 2FA setup');
      }
    } catch {
      toast.error(t('security:twoFactor.errors.setupFailed'));
    } finally {
      setIsLoading(false);
      initializingRef.current = false;
    }
  };

  const loadBackupCodesStatus = async () => {
    try {
      setIsLoadingBackupStatus(true);
      const response = await fetch('/api/security/2fa/backup-codes/status', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
        },
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setHasExistingBackupCodes(result.data.hasBackupCodes);
        }
      }
    } catch {
      // Error loading backup codes status
    } finally {
      setIsLoadingBackupStatus(false);
    }
  };

  const verifyAndEnable2FA = async () => {
    if (!setupVerificationCode.trim()) {
      toast.error(t('security:twoFactor.errors.codeRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/security/2fa/verify', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: setupVerificationCode,
        }),
      });

      if (response.ok) {
        const result = await response.json();

        // Update setup data with backup codes returned from verification
        if (result.success && result.data?.backupCodes) {
          // Store backup codes temporarily in localStorage to survive component remount
          localStorage.setItem(
            'parkml_fresh_backup_codes',
            JSON.stringify(result.data.backupCodes)
          );

          setSetupData(prev =>
            prev
              ? {
                  ...prev,
                  backupCodes: result.data.backupCodes,
                }
              : {
                  secret: '', // Not needed in manage mode
                  qrCodeUrl: '', // Not needed in manage mode
                  manualEntryKey: '', // Not needed in manage mode
                  backupCodes: result.data.backupCodes,
                }
          );

          // Reset backup codes access state for fresh codes
          setBackupCodesAccessed(false);
          setHasUnsavedCodes(true); // Mark as having unsaved codes
          setCodesConfirmed(false); // Reset confirmation
        }

        toast.success(t('security:twoFactor.success.enabled'));
        setCurrentStep('manage');
        setShowBackupCodes(true);
        // Call onStatusChange last to avoid race condition with parent re-render
        onStatusChange(true);
      } else {
        const error = await response.json();
        toast.error(error.message || t('security:twoFactor.errors.invalidCode'));
      }
    } catch {
      toast.error(t('security:twoFactor.errors.verificationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const disable2FA = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/security/2fa/disable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: disableVerificationCode,
        }),
      });

      if (response.ok) {
        toast.success(t('security:twoFactor.success.disabled'));
        onStatusChange(false);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.message || t('security:twoFactor.errors.disableFailed'));
      }
    } catch {
      toast.error(t('security:twoFactor.errors.disableFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const regenerateBackupCodes = async () => {
    if (!generateVerificationCode || generateVerificationCode.length !== 6) {
      toast.error(t('security:twoFactor.errors.codeRequired'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/security/2fa/backup-codes/regenerate', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: generateVerificationCode }),
      });

      if (response.ok) {
        const result = await response.json();
        setSetupData(prev =>
          prev
            ? { ...prev, backupCodes: result.data.backupCodes }
            : {
                secret: '', // Not needed in manage mode
                qrCodeUrl: '', // Not needed in manage mode
                manualEntryKey: '', // Not needed in manage mode
                backupCodes: result.data.backupCodes,
              }
        );
        toast.success(t('security:twoFactor.success.backupCodesRegenerated'));
        setShowBackupCodes(true); // Automatically show the new codes
        setShowGenerateForm(false); // Hide the generate form
        setGenerateVerificationCode(''); // Clear the verification code
        setBackupCodesAccessed(false); // Reset the accessed flag for new codes
        setHasExistingBackupCodes(true); // Update the existing status
        setHasUnsavedCodes(true); // Mark as having unsaved codes
        setCodesConfirmed(false); // Reset confirmation
        setShowConfirmation(true); // Show confirmation section
      } else {
        throw new Error('Failed to regenerate backup codes');
      }
    } catch {
      toast.error(t('security:twoFactor.errors.backupCodesFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(t('common:copied'));

    // Security: Mark codes as accessed (don't clear until confirmed)
    setBackupCodesAccessed(true);

    // Clear fresh backup codes from localStorage after first access
    const freshBackupCodes = localStorage.getItem('parkml_fresh_backup_codes');
    if (freshBackupCodes) {
      localStorage.removeItem('parkml_fresh_backup_codes');
    }
  };

  const downloadBackupCodes = () => {
    if (!setupData?.backupCodes) return;

    const content = `ParkML 2FA Backup Codes\nGenerated: ${new Date().toISOString()}\n\n${setupData.backupCodes.join('\n')}\n\nKeep these codes safe! Each can only be used once.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'parkml-2fa-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t('security:twoFactor.success.backupCodesDownloaded'));

    // Security: Mark codes as accessed (don't clear until confirmed)
    setBackupCodesAccessed(true);

    // Clear fresh backup codes from localStorage after first access
    const freshBackupCodes = localStorage.getItem('parkml_fresh_backup_codes');
    if (freshBackupCodes) {
      localStorage.removeItem('parkml_fresh_backup_codes');
    }
  };

  const confirmBackupCodesSaved = () => {
    // Only proceed if checkbox is checked and codes have been accessed
    if (codesConfirmed && backupCodesAccessed) {
      setHasUnsavedCodes(false);
      setShowConfirmation(false);

      // Security: Clear backup codes from browser memory after confirmation
      setSetupData(prev => (prev ? { ...prev, backupCodes: [] } : null));

      // Final cleanup of localStorage
      localStorage.removeItem('parkml_fresh_backup_codes');

      toast.success(t('security:twoFactor.success.backupCodesSecured'));
    }
  };

  if (isLoading && !setupData) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="loading loading-spinner loading-md"></div>
          <p className="mt-2 text-sm text-base-content/60">{t('common:loading')}</p>
        </div>
      </div>
    );
  }

  // Setup Step
  if (currentStep === 'setup' && setupData) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold mb-2">{t('security:twoFactor.setup.title')}</h3>
          <p className="text-sm text-base-content/60">
            {t('security:twoFactor.setup.description')}
          </p>
          {countdown !== null && (
            <div className={`alert mt-3 ${countdown <= 10 ? 'alert-warning' : 'alert-info'}`}>
              <AlertCircle className="w-4 h-4" />
              <span className="text-sm">
                {countdown > 10
                  ? t('security:twoFactor.countdown.expiresIn', { seconds: countdown })
                  : t('security:twoFactor.countdown.expiresInWarning', { seconds: countdown })}
              </span>
            </div>
          )}
        </div>

        {/* Step 1: Authenticator App */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-medium">
                1
              </div>
              <h4 className="font-medium">{t('security:twoFactor.setup.step1.title')}</h4>
            </div>
            <p className="text-sm text-base-content/60 mb-3">
              {t('security:twoFactor.setup.step1.description')}
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="badge badge-outline">Google Authenticator</span>
              <span className="badge badge-outline">Authy</span>
              <span className="badge badge-outline">Microsoft Authenticator</span>
              <span className="badge badge-outline">1Password</span>
            </div>
          </div>
        </div>

        {/* Step 2: QR Code */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-medium">
                2
              </div>
              <h4 className="font-medium">{t('security:twoFactor.setup.step2.title')}</h4>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="text-center">
                <div className="bg-white p-4 rounded-lg inline-block">
                  {setupData.qrCodeUrl ? (
                    <SafeQRCode value={setupData.qrCodeUrl} size={200} />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-gray-100 rounded">
                      <p className="text-sm text-gray-500">QR Code unavailable</p>
                    </div>
                  )}
                </div>
                <p className="text-xs text-base-content/60 mt-2">
                  {t('security:twoFactor.setup.step2.qrInstructions')}
                </p>
              </div>

              <div>
                <p className="text-sm text-base-content/60 mb-3">
                  {t('security:twoFactor.setup.step2.manualEntry')}
                </p>
                <div className="form-control">
                  <div className="input-group">
                    <input
                      type="text"
                      value={setupData.manualEntryKey}
                      readOnly
                      className="input input-bordered input-sm flex-1 font-mono text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(setupData.manualEntryKey)}
                      className="btn btn-square btn-sm btn-outline"
                    >
                      <Copy className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Verification */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-6 h-6 bg-primary text-primary-content rounded-full flex items-center justify-center text-sm font-medium">
                3
              </div>
              <h4 className="font-medium">{t('security:twoFactor.setup.step3.title')}</h4>
            </div>

            <div className="space-y-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text">
                    {t('security:twoFactor.setup.step3.codeLabel')}
                  </span>
                </label>
                <input
                  type="text"
                  value={setupVerificationCode}
                  onChange={e => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setSetupVerificationCode(value);
                  }}
                  onPaste={e => {
                    e.preventDefault();
                    const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                    setSetupVerificationCode(paste);
                  }}
                  placeholder="123456"
                  className="input input-bordered font-mono text-center text-lg tracking-widest"
                  maxLength={6}
                  autoComplete="off"
                  id="setup-verification-code"
                />
              </div>

              <div className="flex space-x-2">
                <button
                  onClick={verifyAndEnable2FA}
                  disabled={isLoading || setupVerificationCode.length !== 6}
                  className="btn btn-primary flex-1"
                >
                  {isLoading && <span className="loading loading-spinner loading-sm"></span>}
                  {t('security:twoFactor.setup.step3.verify')}
                </button>
                <button onClick={onClose} className="btn btn-outline">
                  {t('common:cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Management Step (when 2FA is enabled)
  if (currentStep === 'manage') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              {t('security:twoFactor.manageSection.title')}
            </h3>
            <p className="text-sm text-base-content/60">
              {t('security:twoFactor.manageSection.description')}
            </p>
          </div>
          <div className="badge badge-success">{t('security:status.enabled')}</div>
        </div>

        {/* Backup Codes */}
        <div className="card bg-base-200">
          <div className="card-body p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{t('security:twoFactor.manageSection.backupCodes')}</h4>
              <button
                onClick={() => setShowBackupCodes(!showBackupCodes)}
                className="btn btn-sm btn-outline"
              >
                {showBackupCodes ? t('common:hide') : t('common:show')}
              </button>
            </div>

            {showBackupCodes && (
              <div>
                {setupData?.backupCodes && setupData.backupCodes.length > 0 ? (
                  <div>
                    <div className="alert alert-warning mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {t('security:twoFactor.manageSection.backupCodesImportant')}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                      {setupData.backupCodes.map((code, index) => (
                        <div
                          key={index}
                          className="font-mono text-sm bg-base-100 px-2 py-1 rounded"
                        >
                          {code}
                        </div>
                      ))}
                    </div>

                    <div className="flex space-x-2 mb-4">
                      <button onClick={downloadBackupCodes} className="btn btn-sm btn-outline">
                        <Download className="h-3 w-3 mr-1" />
                        {t('common:download')}
                      </button>
                      <button
                        onClick={() => copyToClipboard(setupData.backupCodes.join(', '))}
                        className="btn btn-sm btn-outline"
                      >
                        <Copy className="h-3 w-3 mr-1" />
                        {t('common:copy')}
                      </button>
                    </div>

                    {/* Security confirmation section */}
                    {showConfirmation && (
                      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
                        <div className="form-control">
                          <label className="cursor-pointer label">
                            <input
                              type="checkbox"
                              checked={codesConfirmed}
                              onChange={e => setCodesConfirmed(e.target.checked)}
                              className="checkbox checkbox-warning"
                            />
                            <span className="label-text ml-2">
                              {t('security:twoFactor.manageSection.confirmSaved')}
                            </span>
                          </label>
                        </div>

                        <button
                          onClick={confirmBackupCodesSaved}
                          disabled={!codesConfirmed || !backupCodesAccessed}
                          className="btn btn-warning btn-sm mt-3"
                        >
                          {t('security:twoFactor.manageSection.confirmAndContinue')}
                        </button>

                        {!backupCodesAccessed && (
                          <p className="text-xs text-warning mt-2">
                            {t('security:twoFactor.manageSection.mustSaveFirst')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : hasExistingBackupCodes && !backupCodesAccessed && !showGenerateForm ? (
                  <div className="text-center py-4">
                    <div className="alert alert-info mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {t('security:twoFactor.manageSection.codesExistSecurely')}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/60 mb-3">
                      {t('security:twoFactor.manageSection.regenerateToView')}
                    </p>
                    <button
                      onClick={() => setShowGenerateForm(true)}
                      className="btn btn-sm btn-outline"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t('security:twoFactor.manageSection.regenerate')}
                    </button>
                  </div>
                ) : showGenerateForm ? (
                  <div className="py-4">
                    <div className="alert alert-warning mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {setupData?.backupCodes
                          ? t('security:twoFactor.manageSection.regenerateWarning')
                          : t('security:twoFactor.manageSection.generateInfo')}
                      </span>
                    </div>

                    <div className="space-y-4">
                      <div className="form-control">
                        <label className="label">
                          <span className="label-text font-medium">
                            {t('security:twoFactor.manageSection.verifyToGenerate')}
                          </span>
                        </label>
                        <input
                          type="text"
                          value={generateVerificationCode}
                          onChange={e => {
                            const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                            setGenerateVerificationCode(value);
                          }}
                          onPaste={e => {
                            e.preventDefault();
                            const paste = e.clipboardData
                              .getData('text')
                              .replace(/\D/g, '')
                              .slice(0, 6);
                            setGenerateVerificationCode(paste);
                          }}
                          placeholder={t('security:twoFactor.setup.step3.codeLabel')}
                          className="input input-bordered font-mono text-center text-lg tracking-widest"
                          maxLength={6}
                          autoComplete="off"
                          id="generate-verification-code"
                        />
                        <label className="label">
                          <span className="label-text-alt text-base-content/60">
                            {t('security:twoFactor.manageSection.enterCodeFromApp')}
                          </span>
                        </label>
                      </div>

                      <div className="flex space-x-2">
                        <button
                          onClick={regenerateBackupCodes}
                          disabled={isLoading || generateVerificationCode.length !== 6}
                          className="btn btn-primary flex-1"
                        >
                          {isLoading && (
                            <span className="loading loading-spinner loading-sm"></span>
                          )}
                          <RotateCcw className="h-3 w-3 mr-1" />
                          {setupData?.backupCodes
                            ? t('security:twoFactor.manageSection.regenerate')
                            : t('common:generate')}
                        </button>
                        <button
                          onClick={() => {
                            setShowGenerateForm(false);
                            setGenerateVerificationCode('');
                          }}
                          className="btn btn-outline"
                        >
                          {t('common:cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : backupCodesAccessed ? (
                  <div className="text-center py-4">
                    <div className="alert alert-success mb-4">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">
                        {t('security:twoFactor.success.backupCodesSecured')}
                      </span>
                    </div>
                    <p className="text-sm text-base-content/60 mb-3">
                      {t('security:twoFactor.manageSection.codesAccessedMessage')}
                    </p>
                    <button
                      onClick={() => setShowGenerateForm(true)}
                      className="btn btn-sm btn-primary"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t('security:twoFactor.manageSection.generateNewCodes')}
                    </button>
                  </div>
                ) : !hasExistingBackupCodes && !isLoadingBackupStatus ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-base-content/60 mb-3">
                      {t('security:twoFactor.manageSection.noBackupCodes')}
                    </p>
                    <button
                      onClick={() => setShowGenerateForm(true)}
                      className="btn btn-sm btn-primary"
                    >
                      <RotateCcw className="h-3 w-3 mr-1" />
                      {t('security:twoFactor.manageSection.generateBackupCodes')}
                    </button>
                  </div>
                ) : isLoadingBackupStatus ? (
                  <div className="text-center py-4">
                    <div className="loading loading-spinner loading-sm"></div>
                    <p className="text-sm text-base-content/60 mt-2">{t('common:loading')}</p>
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Disable 2FA */}
        <div className="card bg-error/10 border border-error/20">
          <div className="card-body p-4">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-error flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-error mb-1">
                  {t('security:twoFactor.manageSection.disable.title')}
                </h4>
                <p className="text-sm text-base-content/60 mb-3">
                  {t('security:twoFactor.manageSection.disable.warning')}
                </p>

                <div className="space-y-3">
                  <div className="form-control">
                    <input
                      type="text"
                      value={disableVerificationCode}
                      onChange={e => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                        setDisableVerificationCode(value);
                      }}
                      onPaste={e => {
                        e.preventDefault();
                        const paste = e.clipboardData
                          .getData('text')
                          .replace(/\D/g, '')
                          .slice(0, 6);
                        setDisableVerificationCode(paste);
                      }}
                      placeholder={t('security:twoFactor.manageSection.disable.codePlaceholder')}
                      className="input input-bordered input-sm font-mono"
                      maxLength={6}
                      autoComplete="off"
                      id="disable-verification-code"
                    />
                  </div>

                  <button
                    onClick={disable2FA}
                    disabled={isLoading || disableVerificationCode.length !== 6}
                    className="btn btn-error btn-sm"
                  >
                    {isLoading && <span className="loading loading-spinner loading-xs"></span>}
                    <Trash2 className="h-3 w-3 mr-1" />
                    {t('security:twoFactor.manageSection.disable.confirm')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default TwoFactorSetup;
