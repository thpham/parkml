import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface DailyActivitiesSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const DailyActivitiesSection: React.FC<DailyActivitiesSectionProps> = ({ register }) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{t('dailyActivities.title')}</h2>

      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('dailyActivities.activityLevel.title')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {t('dailyActivities.activityLevel.totalRestTime')}
                </span>
              </label>
              <input
                {...register('dailyActivities.activityLevel.totalRestTime')}
                type="number"
                step="0.5"
                min="0"
                max="24"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('dailyActivities.activityLevel.energyLevel')}</span>
              </label>
              <select
                {...register('dailyActivities.activityLevel.energyLevel')}
                className="select select-bordered w-full"
              >
                <option value="">{t('dailyActivities.energyLevels.selectLevel')}</option>
                <option value="1">{t('dailyActivities.energyLevels.1')}</option>
                <option value="2">{t('dailyActivities.energyLevels.2')}</option>
                <option value="3">{t('dailyActivities.energyLevels.3')}</option>
                <option value="4">{t('dailyActivities.energyLevels.4')}</option>
                <option value="5">{t('dailyActivities.energyLevels.5')}</option>
              </select>
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('dailyActivities.activityLevel.activePeriods')}</span>
            </label>
            <textarea
              {...register('dailyActivities.activityLevel.activePeriods')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.activePeriods')}
            />
          </div>
        </div>
      </div>

      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('dailyActivities.medicationCompliance.title')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {t('dailyActivities.medicationCompliance.morning')}
                </span>
              </label>
              <select
                {...register('dailyActivities.medicationCompliance.morning')}
                className="select select-bordered w-full"
              >
                <option value="">{t('placeholders.selectStatus')}</option>
                <option value="taken_as_prescribed">
                  {t('dailyActivities.medicationStatus.takenAsPrescribed')}
                </option>
                <option value="forgotten">{t('dailyActivities.medicationStatus.forgotten')}</option>
                <option value="delayed">{t('dailyActivities.medicationStatus.delayed')}</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {t('dailyActivities.medicationCompliance.afternoon')}
                </span>
              </label>
              <select
                {...register('dailyActivities.medicationCompliance.afternoon')}
                className="select select-bordered w-full"
              >
                <option value="">{t('placeholders.selectStatus')}</option>
                <option value="taken_as_prescribed">
                  {t('dailyActivities.medicationStatus.takenAsPrescribed')}
                </option>
                <option value="forgotten">{t('dailyActivities.medicationStatus.forgotten')}</option>
                <option value="delayed">{t('dailyActivities.medicationStatus.delayed')}</option>
              </select>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">
                  {t('dailyActivities.medicationCompliance.evening')}
                </span>
              </label>
              <select
                {...register('dailyActivities.medicationCompliance.evening')}
                className="select select-bordered w-full"
              >
                <option value="">{t('placeholders.selectStatus')}</option>
                <option value="taken_as_prescribed">
                  {t('dailyActivities.medicationStatus.takenAsPrescribed')}
                </option>
                <option value="forgotten">{t('dailyActivities.medicationStatus.forgotten')}</option>
                <option value="delayed">{t('dailyActivities.medicationStatus.delayed')}</option>
              </select>
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">
                {t('dailyActivities.medicationCompliance.sideEffects')}
              </span>
            </label>
            <textarea
              {...register('dailyActivities.medicationCompliance.sideEffects')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.sideEffects')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyActivitiesSection;
