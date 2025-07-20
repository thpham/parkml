import React, { useState } from 'react';
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../../hooks/useTranslation';
import toast from 'react-hot-toast';

interface PasswordChangeFormProps {
  onSuccess: () => void;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumbers: boolean;
  hasSpecialChars: boolean;
}

const PasswordChangeForm: React.FC<PasswordChangeFormProps> = ({ onSuccess }) => {
  const { t } = useTranslation(['security', 'common']);
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength>({
    score: 0,
    feedback: [],
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumbers: false,
    hasSpecialChars: false
  });

  const analyzePasswordStrength = (password: string): PasswordStrength => {
    const hasMinLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChars = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    
    const criteria = [hasMinLength, hasUppercase, hasLowercase, hasNumbers, hasSpecialChars];
    const score = criteria.filter(Boolean).length;
    
    const feedback = [];
    if (!hasMinLength) feedback.push(t('security:password.requirements.minLength'));
    if (!hasUppercase) feedback.push(t('security:password.requirements.uppercase'));
    if (!hasLowercase) feedback.push(t('security:password.requirements.lowercase'));
    if (!hasNumbers) feedback.push(t('security:password.requirements.numbers'));
    if (!hasSpecialChars) feedback.push(t('security:password.requirements.specialChars'));

    return {
      score: Math.round((score / 5) * 100),
      feedback,
      hasMinLength,
      hasUppercase,
      hasLowercase,
      hasNumbers,
      hasSpecialChars
    };
  };

  const handlePasswordChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (field === 'newPassword') {
      setPasswordStrength(analyzePasswordStrength(value));
    }
  };

  const getPasswordStrengthColor = (score: number) => {
    if (score >= 80) return 'progress-success';
    if (score >= 60) return 'progress-warning';
    if (score >= 40) return 'progress-info';
    return 'progress-error';
  };

  const getPasswordStrengthLabel = (score: number) => {
    if (score >= 80) return t('security:password.strength.strong');
    if (score >= 60) return t('security:password.strength.good');
    if (score >= 40) return t('security:password.strength.fair');
    if (score >= 20) return t('security:password.strength.weak');
    return t('security:password.strength.veryWeak');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error(t('security:password.errors.passwordMismatch'));
      return;
    }

    if (passwordStrength.score < 60) {
      toast.error(t('security:password.errors.weakPassword'));
      return;
    }

    try {
      setIsLoading(true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('parkml_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      if (response.ok) {
        toast.success(t('security:password.success.changed'));
        setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        onSuccess();
      } else {
        const error = await response.json();
        toast.error(error.message || t('security:password.errors.changeFailed'));
      }
    } catch (error) {
      console.error('Password change error:', error);
      toast.error(t('security:password.errors.changeFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({ ...prev, [field]: !prev[field] }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {/* Current Password */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('security:password.current')}</span>
          </label>
          <div className="input-group">
            <span className="bg-base-200 px-3 flex items-center">
              <Lock className="h-4 w-4 text-base-content/60" />
            </span>
            <input
              type={showPasswords.current ? 'text' : 'password'}
              value={formData.currentPassword}
              onChange={(e) => handlePasswordChange('currentPassword', e.target.value)}
              className="input input-bordered flex-1"
              placeholder={t('security:password.currentPlaceholder')}
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('current')}
              className="btn btn-square btn-outline"
            >
              {showPasswords.current ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('security:password.new')}</span>
          </label>
          <div className="input-group">
            <span className="bg-base-200 px-3 flex items-center">
              <Lock className="h-4 w-4 text-base-content/60" />
            </span>
            <input
              type={showPasswords.new ? 'text' : 'password'}
              value={formData.newPassword}
              onChange={(e) => handlePasswordChange('newPassword', e.target.value)}
              className="input input-bordered flex-1"
              placeholder={t('security:password.newPlaceholder')}
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('new')}
              className="btn btn-square btn-outline"
            >
              {showPasswords.new ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          
          {/* Password Strength Indicator */}
          {formData.newPassword && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>{t('security:password.strengthLabel')}</span>
                <span className={`font-medium ${
                  passwordStrength.score >= 80 ? 'text-success' :
                  passwordStrength.score >= 60 ? 'text-warning' : 'text-error'
                }`}>
                  {getPasswordStrengthLabel(passwordStrength.score)}
                </span>
              </div>
              <progress 
                className={`progress w-full ${getPasswordStrengthColor(passwordStrength.score)}`}
                value={passwordStrength.score} 
                max={100}
              ></progress>
              
              {/* Requirements Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs">
                {[
                  { key: 'hasMinLength', label: t('security:password.requirements.minLength') },
                  { key: 'hasUppercase', label: t('security:password.requirements.uppercase') },
                  { key: 'hasLowercase', label: t('security:password.requirements.lowercase') },
                  { key: 'hasNumbers', label: t('security:password.requirements.numbers') },
                  { key: 'hasSpecialChars', label: t('security:password.requirements.specialChars') }
                ].map((req) => (
                  <div key={req.key} className="flex items-center space-x-1">
                    {passwordStrength[req.key as keyof PasswordStrength] ? (
                      <CheckCircle className="h-3 w-3 text-success" />
                    ) : (
                      <AlertCircle className="h-3 w-3 text-base-content/40" />
                    )}
                    <span className={passwordStrength[req.key as keyof PasswordStrength] ? 'text-success' : 'text-base-content/60'}>
                      {req.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="form-control">
          <label className="label">
            <span className="label-text font-medium">{t('security:password.confirm')}</span>
          </label>
          <div className="input-group">
            <span className="bg-base-200 px-3 flex items-center">
              <Lock className="h-4 w-4 text-base-content/60" />
            </span>
            <input
              type={showPasswords.confirm ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={(e) => handlePasswordChange('confirmPassword', e.target.value)}
              className={`input input-bordered flex-1 ${
                formData.confirmPassword && formData.newPassword !== formData.confirmPassword 
                  ? 'input-error' : ''
              }`}
              placeholder={t('security:password.confirmPlaceholder')}
              required
            />
            <button
              type="button"
              onClick={() => togglePasswordVisibility('confirm')}
              className="btn btn-square btn-outline"
            >
              {showPasswords.confirm ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {formData.confirmPassword && formData.newPassword !== formData.confirmPassword && (
            <label className="label">
              <span className="label-text-alt text-error">{t('security:password.errors.passwordMismatch')}</span>
            </label>
          )}
        </div>
      </div>

      {/* Security Tips */}
      <div className="alert alert-info">
        <AlertCircle className="h-5 w-5" />
        <div>
          <h4 className="font-medium">{t('security:password.tips.title')}</h4>
          <ul className="text-sm mt-1 space-y-1">
            <li>• {t('security:password.tips.tip1')}</li>
            <li>• {t('security:password.tips.tip2')}</li>
            <li>• {t('security:password.tips.tip3')}</li>
          </ul>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex space-x-3">
        <button
          type="submit"
          disabled={
            isLoading || 
            !formData.currentPassword || 
            !formData.newPassword || 
            !formData.confirmPassword ||
            formData.newPassword !== formData.confirmPassword ||
            passwordStrength.score < 60
          }
          className="btn btn-primary"
        >
          {isLoading && <span className="loading loading-spinner loading-sm"></span>}
          {t('security:password.change')}
        </button>
        <button
          type="button"
          onClick={onSuccess}
          className="btn btn-outline"
        >
          {t('common:cancel')}
        </button>
      </div>
    </form>
  );
};

export default PasswordChangeForm;