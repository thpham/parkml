import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface NonMotorSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const NonMotorSymptomsSection: React.FC<NonMotorSymptomsSectionProps> = ({
  register,
}) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{t('nonMotor.title')}</h2>
      
      {/* Cognitive Function */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('nonMotor.cognitive.title')}</h3>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('nonMotor.cognitive.timeObserved')}</span>
              </label>
              <input
                {...register('nonMotorSymptoms.cognitive.timeObserved')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('nonMotor.cognitive.alertness')}</span>
              </label>
              <select
                {...register('nonMotorSymptoms.cognitive.alertness')}
                className="select select-bordered w-full"
              >
                <option value="">{t('nonMotor.alertnessLevels.selectLevel')}</option>
                <option value="alert">{t('nonMotor.alertnessLevels.alert')}</option>
                <option value="drowsy">{t('nonMotor.alertnessLevels.drowsy')}</option>
                <option value="confused">{t('nonMotor.alertnessLevels.confused')}</option>
                <option value="disoriented">{t('nonMotor.alertnessLevels.disoriented')}</option>
              </select>
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('nonMotor.cognitive.memoryRecentEvents')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'good', label: t('nonMotor.qualityLevels.good') },
                { value: 'fair', label: t('nonMotor.qualityLevels.fair') },
                { value: 'poor', label: t('nonMotor.qualityLevels.poor') },
              ].map((level) => (
                <label key={level.value} className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
                  <input
                    {...register('nonMotorSymptoms.cognitive.memory.recentEvents')}
                    type="radio"
                    value={level.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{level.label}</span>
                </label>
              ))}
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('nonMotor.cognitive.concentrationAttention')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'good', label: t('nonMotor.qualityLevels.good') },
                { value: 'fair', label: t('nonMotor.qualityLevels.fair') },
                { value: 'poor', label: t('nonMotor.qualityLevels.poor') },
              ].map((level) => (
                <label key={level.value} className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
                  <input
                    {...register('nonMotorSymptoms.cognitive.concentration')}
                    type="radio"
                    value={level.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{level.label}</span>
                </label>
              ))}
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('nonMotor.cognitive.notes')}</span>
            </label>
            <textarea
              {...register('nonMotorSymptoms.cognitive.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.cognitiveNotes')}
            />
          </div>
        </div>
      </div>
      
      {/* Sleep Assessment */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('nonMotor.sleep.title')}</h3>
        
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('nonMotor.sleep.bedtime')}</span>
              </label>
              <input
                {...register('nonMotorSymptoms.sleep.bedtime')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('nonMotor.sleep.wakeTime')}</span>
              </label>
              <input
                {...register('nonMotorSymptoms.sleep.wakeTime')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('nonMotor.sleep.totalSleepHours')}</span>
              </label>
              <input
                {...register('nonMotorSymptoms.sleep.totalSleepHours')}
                type="number"
                step="0.5"
                min="0"
                max="24"
                className="input input-bordered w-full"
              />
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('nonMotor.sleep.sleepQuality')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'restful', label: t('nonMotor.sleepQualityTypes.restful') },
                { value: 'restless', label: t('nonMotor.sleepQualityTypes.restless') },
                { value: 'frequent_awakenings', label: t('nonMotor.sleepQualityTypes.frequentAwakenings') },
              ].map((quality) => (
                <label key={quality.value} className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors">
                  <input
                    {...register('nonMotorSymptoms.sleep.sleepQuality')}
                    type="radio"
                    value={quality.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{quality.label}</span>
                </label>
              ))}
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('nonMotor.sleep.notes')}</span>
            </label>
            <textarea
              {...register('nonMotorSymptoms.sleep.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.sleepNotes')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default NonMotorSymptomsSection;