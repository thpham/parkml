import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { 
  Eye, 
  EyeOff, 
  LogIn, 
  Smartphone, 
  Key, 
  Shield,
  ArrowLeft,
  CheckCircle 
} from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

interface TwoFactorFormData {
  twoFactorCode?: string;
  backupCode?: string;
}

type LoginStep = 'credentials' | 'twoFactor' | 'passkey';
type TwoFactorMethod = 'totp' | 'backup';

interface TwoFactorResponse {
  requiresTwoFactor: boolean;
  userId: string;
}

const LoginForm: React.FC = () => {
  const { t } = useTranslation(['auth', 'common', 'security']);
  
  // State management
  const [currentStep, setCurrentStep] = useState<LoginStep>('credentials');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [twoFactorMethod, setTwoFactorMethod] = useState<TwoFactorMethod>('totp');
  const [loginCredentials, setLoginCredentials] = useState<{ email: string; password: string } | null>(null);
  const [, setTwoFactorData] = useState<TwoFactorResponse | null>(null);

  // Form hooks
  const credentialsForm = useForm<LoginFormData>();
  const twoFactorForm = useForm<TwoFactorFormData>();

  // Enhanced login function that handles multi-step authentication
  const performLogin = async (email: string, password: string, twoFactorCode?: string, backupCode?: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        email, 
        password, 
        ...(twoFactorCode && { twoFactorCode }),
        ...(backupCode && { backupCode })
      }),
    });

    const data = await response.json();

    if (!data.success && !data.data?.requiresTwoFactor) {
      throw new Error(data.error || 'Login failed');
    }

    return data;
  };

  // Step 1: Handle credentials submission
  const onCredentialsSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      const result = await performLogin(data.email, data.password);
      
      // Check if 2FA is required
      if (result.data?.requiresTwoFactor) {
        setLoginCredentials({ email: data.email, password: data.password });
        setTwoFactorData(result.data);
        setCurrentStep('twoFactor');
        toast(t('auth:login.twoFactorRequired'), { 
          icon: '🔐',
          duration: 4000 
        });
      } else {
        // Complete login without 2FA
        await completeLogin(result);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth:login.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Step 2: Handle 2FA submission
  const onTwoFactorSubmit = async (data: TwoFactorFormData) => {
    if (!loginCredentials) {
      toast.error(t('auth:login.sessionExpired'));
      handleBackToCredentials();
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await performLogin(
        loginCredentials.email,
        loginCredentials.password,
        twoFactorMethod === 'totp' ? data.twoFactorCode : undefined,
        twoFactorMethod === 'backup' ? data.backupCode : undefined
      );
      
      await completeLogin(result);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('auth:login.twoFactorInvalid'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Complete the login process
  const completeLogin = async (loginResult: any) => {
    // Store user data in localStorage and update auth context
    localStorage.setItem('parkml_token', loginResult.data.token);
    localStorage.setItem('parkml_user', JSON.stringify(loginResult.data.user));
    
    if (loginResult.data.user.organization) {
      localStorage.setItem('parkml_organization', JSON.stringify(loginResult.data.user.organization));
    }

    toast.success(t('auth:login.successMessage'));
    
    // Refresh the page to update auth context
    window.location.reload();
  };

  // Navigation helpers
  const handleBackToCredentials = () => {
    setCurrentStep('credentials');
    setLoginCredentials(null);
    setTwoFactorData(null);
    twoFactorForm.reset();
  };

  const switchTwoFactorMethod = (method: TwoFactorMethod) => {
    setTwoFactorMethod(method);
    twoFactorForm.reset();
  };

  // Handle passkey login
  const handlePasskeyLogin = async () => {
    const email = credentialsForm.getValues('email');
    if (!email) {
      toast.error(t('auth:validation.emailRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      // Start passkey authentication
      const beginResponse = await fetch('/api/auth/login/passkey/begin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const beginData = await beginResponse.json();
      if (!beginData.success) {
        throw new Error(beginData.error || 'Failed to start passkey authentication');
      }

      // Import WebAuthn browser functions
      const { startAuthentication } = await import('@simplewebauthn/browser');
      
      // Perform WebAuthn authentication
      const authResponse = await startAuthentication(beginData.data.options);

      // Complete passkey authentication
      const completeResponse = await fetch('/api/auth/login/passkey/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: beginData.data.userId,
          challengeKey: beginData.data.challengeKey,
          authenticationResponse: authResponse,
        }),
      });

      const completeData = await completeResponse.json();
      if (!completeData.success) {
        throw new Error(completeData.error || 'Passkey authentication failed');
      }

      // Complete login
      await completeLogin(completeData);
    } catch (error) {
      console.error('Passkey login error:', error);
      toast.error(error instanceof Error ? error.message : t('auth:login.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Step 1: Credentials
  const renderCredentialsStep = () => (
    <div className="card w-full max-w-md mx-auto mt-8 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="text-center mb-6">
          <h2 className="card-title text-2xl justify-center">{t('auth:login.title')}</h2>
          <p className="text-base-content/70 mt-2">{t('auth:login.subtitle')}</p>
        </div>

        <form onSubmit={credentialsForm.handleSubmit(onCredentialsSubmit)} className="space-y-4">
          <div className="form-control w-full">
            <label className="label" htmlFor="email">
              <span className="label-text">{t('auth:form.emailLabel')}</span>
            </label>
            <input
              {...credentialsForm.register('email', {
                required: t('auth:validation.emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('auth:validation.emailInvalid'),
                },
              })}
              type="email"
              id="email"
              className={`input input-bordered w-full ${credentialsForm.formState.errors.email ? 'input-error' : ''}`}
              placeholder={t('auth:form.emailPlaceholder')}
              disabled={isSubmitting}
            />
            {credentialsForm.formState.errors.email && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {credentialsForm.formState.errors.email.message}
                </span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="password">
              <span className="label-text">{t('auth:form.passwordLabel')}</span>
            </label>
            <div className="relative">
              <input
                {...credentialsForm.register('password', {
                  required: t('auth:validation.passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('auth:validation.passwordMinLength'),
                  },
                })}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`input input-bordered w-full pr-10 ${credentialsForm.formState.errors.password ? 'input-error' : ''}`}
                placeholder={t('auth:form.passwordPlaceholder')}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isSubmitting}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 opacity-50" />
                ) : (
                  <Eye className="h-5 w-5 opacity-50" />
                )}
              </button>
            </div>
            {credentialsForm.formState.errors.password && (
              <label className="label">
                <span className="label-text-alt text-error">
                  {credentialsForm.formState.errors.password.message}
                </span>
              </label>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                {t('auth:login.submitButton')}
              </>
            )}
          </button>
        </form>

        {/* Passkey login option */}
        <div className="divider text-sm">{t('common:or')}</div>
        <button
          type="button"
          className="btn btn-outline w-full"
          disabled={isSubmitting}
          onClick={handlePasskeyLogin}
          title={t('auth:login.passkeyHelp')}
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <Shield className="h-4 w-4" />
          )}
          {t('auth:login.passkeyLogin')}
        </button>
      </div>
    </div>
  );

  // Render Step 2: Two-Factor Authentication
  const renderTwoFactorStep = () => (
    <div className="card w-full max-w-md mx-auto mt-8 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={handleBackToCredentials}
            className="btn btn-ghost btn-sm"
            disabled={isSubmitting}
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common:back')}
          </button>
          <div className="text-center">
            <h2 className="card-title text-xl justify-center">{t('security:twoFactor.verify')}</h2>
          </div>
          <div className="w-16"></div> {/* Spacer for symmetry */}
        </div>

        <div className="text-center mb-6">
          <p className="text-base-content/70 text-sm">
            {t('auth:login.twoFactorDescription')}
          </p>
        </div>

        {/* Method Selection */}
        <div className="tabs tabs-boxed mb-6">
          <button
            type="button"
            className={`tab ${twoFactorMethod === 'totp' ? 'tab-active' : ''}`}
            onClick={() => switchTwoFactorMethod('totp')}
            disabled={isSubmitting}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            {t('security:twoFactor.authenticatorApp')}
          </button>
          <button
            type="button"
            className={`tab ${twoFactorMethod === 'backup' ? 'tab-active' : ''}`}
            onClick={() => switchTwoFactorMethod('backup')}
            disabled={isSubmitting}
          >
            <Key className="h-4 w-4 mr-2" />
            {t('security:twoFactor.backupCode')}
          </button>
        </div>

        <form onSubmit={twoFactorForm.handleSubmit(onTwoFactorSubmit)} className="space-y-4">
          {twoFactorMethod === 'totp' ? (
            <div className="form-control w-full">
              <label className="label" htmlFor="twoFactorCode">
                <span className="label-text">{t('security:twoFactor.enterCode')}</span>
              </label>
              <input
                {...twoFactorForm.register('twoFactorCode', {
                  required: twoFactorMethod === 'totp' ? t('security:validation.codeRequired') : false,
                  pattern: {
                    value: /^\d{6}$/,
                    message: t('security:validation.codeInvalid'),
                  },
                })}
                type="text"
                id="twoFactorCode"
                className={`input input-bordered w-full text-center text-lg tracking-wider ${
                  twoFactorForm.formState.errors.twoFactorCode ? 'input-error' : ''
                }`}
                placeholder="000000"
                maxLength={6}
                disabled={isSubmitting}
                autoComplete="one-time-code"
              />
              {twoFactorForm.formState.errors.twoFactorCode && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {twoFactorForm.formState.errors.twoFactorCode.message}
                  </span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt text-base-content/60 text-xs">
                  {t('security:twoFactor.codeHelp')}
                </span>
              </label>
            </div>
          ) : (
            <div className="form-control w-full">
              <label className="label" htmlFor="backupCode">
                <span className="label-text">{t('security:twoFactor.enterBackupCode')}</span>
              </label>
              <input
                {...twoFactorForm.register('backupCode', {
                  required: twoFactorMethod === 'backup' ? t('security:validation.backupCodeRequired') : false,
                  pattern: {
                    value: /^[A-Z0-9]{8}$/,
                    message: t('security:validation.backupCodeInvalid'),
                  },
                })}
                type="text"
                id="backupCode"
                className={`input input-bordered w-full text-center text-lg tracking-wider uppercase ${
                  twoFactorForm.formState.errors.backupCode ? 'input-error' : ''
                }`}
                placeholder="XXXXXXXX"
                maxLength={8}
                disabled={isSubmitting}
                style={{ textTransform: 'uppercase' }}
              />
              {twoFactorForm.formState.errors.backupCode && (
                <label className="label">
                  <span className="label-text-alt text-error">
                    {twoFactorForm.formState.errors.backupCode.message}
                  </span>
                </label>
              )}
              <label className="label">
                <span className="label-text-alt text-base-content/60 text-xs">
                  {t('security:twoFactor.backupCodeHelp')}
                </span>
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full"
          >
            {isSubmitting ? (
              <span className="loading loading-spinner loading-sm"></span>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                {t('auth:login.verifyAndLogin')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );

  // Main render
  return (
    <>
      {currentStep === 'credentials' && renderCredentialsStep()}
      {currentStep === 'twoFactor' && renderTwoFactorStep()}
    </>
  );
};

export default LoginForm;