import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useTranslation } from '../../../hooks/useTranslation';

interface SafetyIncidentsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const SafetyIncidentsSection: React.FC<SafetyIncidentsSectionProps> = ({
  register,
}) => {
  const { t } = useTranslation('symptoms');
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium">{t('safety.title')}</h2>
      
      <div className="card bg-base-200">
        <div className="card-body">
          <h3 className="card-title text-md">{t('safety.incidentReport.title')}</h3>
        
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('safety.incidentReport.incidentType')}</span>
              </label>
              <select
                {...register('safetyIncidents.0.type')}
                className="select select-bordered w-full"
              >
                <option value="">{t('safety.incidentTypes.selectType')}</option>
                <option value="fall">{t('safety.incidentTypes.fall')}</option>
                <option value="near_fall">{t('safety.incidentTypes.nearFall')}</option>
                <option value="choking">{t('safety.incidentTypes.choking')}</option>
                <option value="medication_error">{t('safety.incidentTypes.medicationError')}</option>
                <option value="other">{t('safety.incidentTypes.other')}</option>
              </select>
            </div>
            
            <div className="form-control">
              <label className="label">
                <span className="label-text">{t('safety.incidentReport.timeOfIncident')}</span>
              </label>
              <input
                {...register('safetyIncidents.0.time')}
                type="time"
                className="input input-bordered w-full"
              />
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('safety.incidentReport.location')}</span>
            </label>
            <input
              {...register('safetyIncidents.0.location')}
              type="text"
              className="input input-bordered w-full"
              placeholder={t('placeholders.incidentLocation')}
            />
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('safety.incidentReport.circumstances')}</span>
            </label>
            <textarea
              {...register('safetyIncidents.0.circumstances')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.incidentCircumstances')}
            />
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('safety.incidentReport.injuryLevel')}</span>
            </label>
            <div className="space-y-2">
              {[
                { value: 'none', label: t('safety.injuryLevels.none') },
                { value: 'minor', label: t('safety.injuryLevels.minor') },
                { value: 'significant', label: t('safety.injuryLevels.significant') },
              ].map((injury) => (
                <label key={injury.value} className="label cursor-pointer justify-start">
                  <input
                    {...register('safetyIncidents.0.injury')}
                    type="radio"
                    value={injury.value}
                    className="radio radio-primary"
                  />
                  <span className="label-text ml-2">{injury.label}</span>
                </label>
              ))}
            </div>
          </div>
        
          <div className="form-control mt-4">
            <label className="label">
              <span className="label-text">{t('safety.incidentReport.additionalNotes')}</span>
            </label>
            <textarea
              {...register('safetyIncidents.0.notes')}
              rows={3}
              className="textarea textarea-bordered w-full"
              placeholder={t('placeholders.incidentNotes')}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafetyIncidentsSection;