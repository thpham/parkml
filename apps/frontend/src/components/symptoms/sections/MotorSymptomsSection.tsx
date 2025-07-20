import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface MotorSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const MotorSymptomsSection: React.FC<MotorSymptomsSectionProps> = ({ register }) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-4 sm:space-y-6">
      <h2 className="text-lg sm:text-xl font-medium">{t('categories.motorSymptoms')}</h2>

      {/* Tremors Section */}
      <div className="card bg-base-200">
        <div className="card-body p-4 sm:p-6">
          <h3 className="card-title text-sm sm:text-md mb-3 sm:mb-4">{t('types.tremors')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('form.timeObserved')}</span>
              </label>
              <input
                {...register('motorSymptoms.tremors.0.timeObserved')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('form.severityScale')}</span>
              </label>
              <select
                {...register('motorSymptoms.tremors.0.severity')}
                className="select select-bordered w-full"
              >
                <option value="">{t('form.selectSeverity')}</option>
                <option value="1">{t('severityLevels.1')}</option>
                <option value="2">{t('severityLevels.2')}</option>
                <option value="3">{t('severityLevels.3')}</option>
                <option value="4">{t('severityLevels.4')}</option>
                <option value="5">{t('severityLevels.5')}</option>
              </select>
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.location')}</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { value: 'right_hand', key: 'rightHand' },
                { value: 'left_hand', key: 'leftHand' },
                { value: 'right_leg', key: 'rightLeg' },
                { value: 'left_leg', key: 'leftLeg' },
                { value: 'head', key: 'head' },
                { value: 'jaw', key: 'jaw' },
              ].map(location => (
                <label
                  key={location.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register(`motorSymptoms.tremors.0.location` as any)}
                    type="checkbox"
                    value={location.value}
                    className="checkbox checkbox-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`locations.${location.key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.type')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'at_rest', key: 'atRest' },
                { value: 'during_movement', key: 'duringMovement' },
                { value: 'maintaining_position', key: 'maintainingPosition' },
              ].map(type => (
                <label
                  key={type.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register('motorSymptoms.tremors.0.type')}
                    type="radio"
                    value={type.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`tremorTypes.${type.key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.duration')}</span>
            </label>
            <input
              {...register('motorSymptoms.tremors.0.duration')}
              type="text"
              className="input input-bordered w-full"
              placeholder={t('placeholders.duration')}
            />
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.triggers')}</span>
            </label>
            <textarea
              {...register('motorSymptoms.tremors.0.triggers')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.triggers')}
            />
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.notes')}</span>
            </label>
            <textarea
              {...register('motorSymptoms.tremors.0.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.tremorNotes')}
            />
          </div>
        </div>
      </div>

      {/* Balance and Posture Section */}
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('types.balancePosture')}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('form.timeObserved')}</span>
              </label>
              <input
                {...register('motorSymptoms.balance.timeObserved')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('form.fallsToday')}</span>
              </label>
              <input
                {...register('motorSymptoms.balance.fallsToday')}
                type="number"
                min="0"
                className="input input-bordered w-full"
              />
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.posture')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'normal', key: 'normal' },
                { value: 'hunched', key: 'hunched' },
                { value: 'leaning_sideways', key: 'leaningSideways' },
                { value: 'other', key: 'other' },
              ].map(posture => (
                <label
                  key={posture.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register('motorSymptoms.balance.posture')}
                    type="radio"
                    value={posture.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`postureTypes.${posture.key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.balanceProblems')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'none', key: 'none' },
                { value: 'slight_swaying', key: 'slightSwaying' },
                { value: 'needs_support', key: 'needsSupport' },
                { value: 'falls', key: 'falls' },
              ].map(problem => (
                <label
                  key={problem.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register('motorSymptoms.balance.balanceProblems')}
                    type="radio"
                    value={problem.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`balanceProblemsTypes.${problem.key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.walkingPattern')}</span>
            </label>
            <div className="space-y-3">
              {[
                { value: 'normal', key: 'normal' },
                { value: 'shuffling', key: 'shuffling' },
                { value: 'small_steps', key: 'smallSteps' },
                { value: 'freezing_episodes', key: 'freezingEpisodes' },
              ].map(pattern => (
                <label
                  key={pattern.value}
                  className="flex items-center gap-3 cursor-pointer hover:bg-base-100 p-2 rounded-lg transition-colors"
                >
                  <input
                    {...register('motorSymptoms.balance.walkingPattern')}
                    type="radio"
                    value={pattern.value}
                    className="radio radio-primary flex-shrink-0"
                  />
                  <span className="label-text">{t(`walkingPatterns.${pattern.key}`)}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('form.notes')}</span>
            </label>
            <textarea
              {...register('motorSymptoms.balance.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.balanceNotes')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MotorSymptomsSection;
