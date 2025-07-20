import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import toast from 'react-hot-toast';
import { Save, Calendar, User, Clock } from 'lucide-react';

// Import form sections
import MotorSymptomsSection from './sections/MotorSymptomsSection';
import NonMotorSymptomsSection from './sections/NonMotorSymptomsSection';
import AutonomicSymptomsSection from './sections/AutonomicSymptomsSection';
import DailyActivitiesSection from './sections/DailyActivitiesSection';
import EnvironmentalFactorsSection from './sections/EnvironmentalFactorsSection';
import SafetyIncidentsSection from './sections/SafetyIncidentsSection';

interface SymptomFormProps {
  patientId: string;
  onSubmit?: (entry: SymptomEntry) => void;
}

const SymptomForm: React.FC<SymptomFormProps> = ({ patientId, onSubmit }) => {
  const { user, token } = useAuth();
  const { t } = useTranslation(['symptoms', 'common']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('motor');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Partial<SymptomEntry>>({
    defaultValues: {
      entryDate: new Date(),
      patientId,
      notes: '',
    },
  });

  const sections = [
    { id: 'motor', title: t('categories.motorSymptoms'), shortTitle: t('categories.motorSymptomsShort', t('categories.motorSymptoms')), icon: '🏃' },
    { id: 'non-motor', title: t('categories.nonMotorSymptoms'), shortTitle: t('categories.nonMotorSymptomsShort', t('categories.nonMotorSymptoms')), icon: '🧠' },
    { id: 'autonomic', title: t('categories.autonomicSymptoms'), shortTitle: t('categories.autonomicSymptomsShort', t('categories.autonomicSymptoms')), icon: '❤️' },
    { id: 'daily', title: t('categories.dailyActivities'), shortTitle: t('categories.dailyActivitiesShort', t('categories.dailyActivities')), icon: '🏠' },
    { id: 'environmental', title: t('categories.environmentalFactors'), shortTitle: t('categories.environmentalFactorsShort', t('categories.environmentalFactors')), icon: '🌤️' },
    { id: 'safety', title: t('categories.safetyIncidents'), shortTitle: t('categories.safetyIncidentsShort', t('categories.safetyIncidents')), icon: '⚠️' },
  ];

  const submitForm = async (data: Partial<SymptomEntry>) => {
    if (!user || !token) {
      toast.error(t('messages.loginRequired'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/symptom-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t('messages.submitError'));
      }

      toast.success(t('messages.submitSuccess'));
      onSubmit?.(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('messages.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'motor':
        return <MotorSymptomsSection register={register} control={control} errors={errors} />;
      case 'non-motor':
        return <NonMotorSymptomsSection register={register} control={control} errors={errors} />;
      case 'autonomic':
        return <AutonomicSymptomsSection register={register} control={control} errors={errors} />;
      case 'daily':
        return <DailyActivitiesSection register={register} control={control} errors={errors} />;
      case 'environmental':
        return <EnvironmentalFactorsSection register={register} control={control} errors={errors} />;
      case 'safety':
        return <SafetyIncidentsSection register={register} control={control} errors={errors} />;
      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-3 sm:p-6">
      <div className="card bg-base-100 shadow-xl">
        {/* Header */}
        <div className="bg-primary text-primary-content p-4 sm:p-6 rounded-t-lg">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center flex-wrap">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 mr-2 sm:mr-3 flex-shrink-0" />
            <span className="truncate">{t('title')}</span>
          </h1>
          <div className="mt-3 sm:mt-4 flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 opacity-90">
            <div className="flex items-center">
              <User className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <span className="text-sm sm:text-base truncate">{t('patientId')}: {patientId}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
              <span className="text-sm sm:text-base">{t('form.date', { ns: 'common' })}: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Navigation - Enhanced Mobile Responsive Tabs */}
        <div className="border-b border-base-300 bg-base-50">
          <div className="px-2 sm:px-6 py-2 sm:py-0">
            {/* Mobile: Horizontal Scrollable Pills */}
            <div className="sm:hidden">
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgb(203 213 225) transparent' }}>
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`flex flex-col items-center justify-center min-w-[80px] h-16 px-3 py-2 rounded-xl transition-all duration-200 flex-shrink-0 ${
                      activeSection === section.id
                        ? 'bg-primary text-primary-content shadow-lg scale-105'
                        : 'bg-white hover:bg-base-100 border border-base-300 hover:border-primary/30'
                    }`}
                  >
                    <span className="text-lg mb-1">{section.icon}</span>
                    <span className="text-[10px] font-medium leading-tight text-center">
                      {section.shortTitle}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Desktop: Traditional Tabs */}
            <div className="hidden sm:block">
              <div className="tabs tabs-bordered overflow-x-auto">
                {sections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setActiveSection(section.id)}
                    className={`tab tab-lg whitespace-nowrap transition-all duration-200 ${
                      activeSection === section.id
                        ? 'tab-active font-semibold'
                        : 'hover:text-primary'
                    }`}
                  >
                    <span className="mr-2 text-base">{section.icon}</span>
                    <span>{section.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(submitForm)} className="p-3 sm:p-6">
          {renderSection()}

          {/* General Notes */}
          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-base-300">
            <div className="form-control">
              <label className="label" htmlFor="notes">
                <span className="label-text font-medium">{t('additionalNotes')}</span>
              </label>
              <textarea
                {...register('notes')}
                id="notes"
                rows={4}
                className="textarea textarea-bordered w-full"
                placeholder={t('form.additionalObservations', { ns: 'common' })}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-center sm:justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn btn-primary btn-md sm:btn-lg w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  <span className="ml-2">{t('messages.saving')}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span className="ml-2">{t('messages.saveSymptomEntry')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SymptomForm;