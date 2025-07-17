import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';
import { useAuth } from '../../contexts/AuthContext';
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
    { id: 'motor', title: 'Motor Symptoms', icon: '🏃' },
    { id: 'non-motor', title: 'Non-Motor Symptoms', icon: '🧠' },
    { id: 'autonomic', title: 'Autonomic Symptoms', icon: '❤️' },
    { id: 'daily', title: 'Daily Activities', icon: '🏠' },
    { id: 'environmental', title: 'Environmental Factors', icon: '🌤️' },
    { id: 'safety', title: 'Safety Incidents', icon: '⚠️' },
  ];

  const submitForm = async (data: Partial<SymptomEntry>) => {
    if (!user || !token) {
      toast.error('Please log in to submit symptoms');
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
        throw new Error(result.error || 'Failed to submit symptoms');
      }

      toast.success('Symptoms recorded successfully!');
      onSubmit?.(result.data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit symptoms');
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
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* Header */}
        <div className="bg-blue-600 text-white p-6 rounded-t-lg">
          <h1 className="text-2xl font-bold flex items-center">
            <Calendar className="h-6 w-6 mr-3" />
            Daily Symptom Tracking
          </h1>
          <div className="mt-4 flex items-center space-x-4 text-blue-100">
            <div className="flex items-center">
              <User className="h-4 w-4 mr-1" />
              <span>Patient ID: {patientId}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeSection === section.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                {section.title}
              </button>
            ))}
          </nav>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit(submitForm)} className="p-6">
          {renderSection()}

          {/* General Notes */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Notes
            </label>
            <textarea
              {...register('notes')}
              id="notes"
              rows={4}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Any additional observations or concerns..."
            />
          </div>

          {/* Submit Button */}
          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Save Symptom Entry
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