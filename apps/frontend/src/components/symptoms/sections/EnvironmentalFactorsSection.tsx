import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface EnvironmentalFactorsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const EnvironmentalFactorsSection: React.FC<EnvironmentalFactorsSectionProps> = ({ register }) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{t('environmental.title')}</h2>

      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('environmental.weatherEnvironment.title')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {t('environmental.weatherEnvironment.temperature')}
                </span>
              </label>
              <input
                {...register('environmentalFactors.temperature')}
                type="number"
                step="0.5"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('environmental.weatherEnvironment.humidity')}</span>
              </label>
              <select
                {...register('environmentalFactors.humidity')}
                className="select select-bordered w-full"
              >
                <option value="">{t('environmental.humidityLevels.selectLevel')}</option>
                <option value="high">{t('environmental.humidityLevels.high')}</option>
                <option value="normal">{t('environmental.humidityLevels.normal')}</option>
                <option value="low">{t('environmental.humidityLevels.low')}</option>
              </select>
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">
                {t('environmental.weatherEnvironment.weatherConditions')}
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
              {['sunny', 'cloudy', 'rainy', 'hot', 'cold'].map(weather => (
                <label
                  key={weather}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register(`environmentalFactors.weather` as any)}
                    type="checkbox"
                    value={weather}
                    className="checkbox checkbox-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`environmental.weatherTypes.${weather}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">
                {t('environmental.weatherEnvironment.environmentalChanges')}
              </span>
            </label>
            <textarea
              {...register('environmentalFactors.environmentalChanges')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.environmentalChanges')}
            />
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">
                {t('environmental.weatherEnvironment.stressfulEvents')}
              </span>
            </label>
            <textarea
              {...register('environmentalFactors.stressfulEvents')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.stressfulEvents')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalFactorsSection;
