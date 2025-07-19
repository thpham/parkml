import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { Eye, EyeOff, LogIn } from 'lucide-react';

interface LoginFormData {
  email: string;
  password: string;
}

const LoginForm: React.FC = () => {
  const { login } = useAuth();
  const { t } = useTranslation(['auth', 'common']);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsSubmitting(true);
    try {
      await login(data.email, data.password);
      toast.success(t('login.successMessage'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('login.errorMessage'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card w-full max-w-md mx-auto mt-8 bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="text-center mb-6">
          <h2 className="card-title text-2xl justify-center">{t('login.title')}</h2>
          <p className="text-base-content/70 mt-2">{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
                placeholder={t('form.passwordPlaceholder')}
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
                {t('login.submitButton')}
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;