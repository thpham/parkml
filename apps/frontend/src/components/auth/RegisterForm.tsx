import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, UserPlus } from 'lucide-react';

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  role: 'patient' | 'caregiver' | 'healthcare_provider';
}

const RegisterForm: React.FC = () => {
  const { register: registerUser } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>();

  const password = watch('password');

  const onSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    try {
      await registerUser(data.email, data.password, data.name, data.role);
      toast.success(t('register.successMessage'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('register.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card w-full max-w-md mx-auto mt-8 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="text-center mb-6">
          <h2 className="card-title text-2xl justify-center">{t('register.title')}</h2>
          <p className="text-base-content/70 mt-2">{t('register.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-control w-full">
            <label className="label" htmlFor="name">
              <span className="label-text">{t('form.nameLabel')}</span>
            </label>
            <input
              {...register('name', {
                required: t('validation.nameRequired'),
                minLength: {
                  value: 2,
                  message: t('validation.nameMinLength'),
                },
              })}
              type="text"
              id="name"
              className={`input input-bordered w-full ${errors.name ? 'input-error' : ''}`}
              placeholder={t('form.namePlaceholder')}
            />
            {errors.name && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.name.message}</span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="email">
              <span className="label-text">{t('form.emailLabel')}</span>
            </label>
            <input
              {...register('email', {
                required: t('validation.emailRequired'),
                pattern: {
                  value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                  message: t('validation.emailInvalid'),
                },
              })}
              type="email"
              id="email"
              className={`input input-bordered w-full ${errors.email ? 'input-error' : ''}`}
              placeholder={t('form.emailPlaceholder')}
            />
            {errors.email && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.email.message}</span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="role">
              <span className="label-text">{t('form.roleLabel')}</span>
            </label>
            <select
              {...register('role', { required: t('validation.roleRequired') })}
              id="role"
              className={`select select-bordered w-full ${errors.role ? 'select-error' : ''}`}
            >
              <option value="">{t('form.roleSelectPlaceholder')}</option>
              <option value="patient">{t('roles.patient')}</option>
              <option value="caregiver">{t('roles.caregiver')}</option>
              <option value="healthcare_provider">{t('roles.healthcareProvider')}</option>
            </select>
            {errors.role && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.role.message}</span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="password">
              <span className="label-text">{t('form.passwordLabel')}</span>
            </label>
            <div className="relative">
              <input
                {...register('password', {
                  required: t('validation.passwordRequired'),
                  minLength: {
                    value: 6,
                    message: t('validation.passwordMinLength'),
                  },
                })}
                type={showPassword ? 'text' : 'password'}
                id="password"
                className={`input input-bordered w-full pr-10 ${errors.password ? 'input-error' : ''}`}
                placeholder={t('form.createPasswordPlaceholder')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5 opacity-50" />
                ) : (
                  <Eye className="h-5 w-5 opacity-50" />
                )}
              </button>
            </div>
            {errors.password && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.password.message}</span>
              </label>
            )}
          </div>

          <div className="form-control w-full">
            <label className="label" htmlFor="confirmPassword">
              <span className="label-text">{t('form.confirmPasswordLabel')}</span>
            </label>
            <div className="relative">
              <input
                {...register('confirmPassword', {
                  required: t('validation.confirmPasswordRequired'),
                  validate: (value) => value === password || t('validation.passwordMismatch'),
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                className={`input input-bordered w-full pr-10 ${errors.confirmPassword ? 'input-error' : ''}`}
                placeholder={t('form.confirmPasswordPlaceholder')}
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5 opacity-50" />
                ) : (
                  <Eye className="h-5 w-5 opacity-50" />
                )}
              </button>
            </div>
            {errors.confirmPassword && (
              <label className="label">
                <span className="label-text-alt text-error">{errors.confirmPassword.message}</span>
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
                <UserPlus className="h-4 w-4" />
                {t('register.submitButton')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;