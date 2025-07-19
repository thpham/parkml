import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface AutonomicSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const AutonomicSymptomsSection: React.FC<AutonomicSymptomsSectionProps> = ({
  register,
}) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{t('autonomic.title')}</h2>
      
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('autonomic.bladderBowel.title')}</h3>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('autonomic.bladderBowel.urination')}</span>
              </label>
              <select
                {...register('autonomicSymptoms.bladderBowel.urination')}
                className="select select-bordered w-full"
              >
                <option value="">{t('placeholders.selectStatus')}</option>
                <option value="normal">{t('autonomic.urinationTypes.normal')}</option>
                <option value="frequent">{t('autonomic.urinationTypes.frequent')}</option>
                <option value="urgent">{t('autonomic.urinationTypes.urgent')}</option>
                <option value="incontinence">{t('autonomic.urinationTypes.incontinence')}</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('autonomic.bladderBowel.bowelMovements')}</span>
              </label>
              <select
                {...register('autonomicSymptoms.bladderBowel.bowelMovements')}
                className="select select-bordered w-full"
              >
                <option value="">{t('placeholders.selectStatus')}</option>
                <option value="normal">{t('autonomic.bowelTypes.normal')}</option>
                <option value="constipation">{t('autonomic.bowelTypes.constipation')}</option>
                <option value="frequent">{t('autonomic.bowelTypes.frequent')}</option>
                <option value="incontinence">{t('autonomic.bowelTypes.incontinence')}</option>
              </select>
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('autonomic.bladderBowel.notes')}</span>
            </label>
            <textarea
              {...register('autonomicSymptoms.bladderBowel.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.bladderBowelNotes')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AutonomicSymptomsSection;