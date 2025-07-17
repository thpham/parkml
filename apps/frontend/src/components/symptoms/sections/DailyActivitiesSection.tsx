import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface DailyActivitiesSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const DailyActivitiesSection: React.FC<DailyActivitiesSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Daily Activities</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Activity Level</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Rest Time (hours)
            </label>
            <input
              {...register('dailyActivities.activityLevel.totalRestTime')}
              type="number"
              step="0.5"
              min="0"
              max="24"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Energy Level (1-5)
            </label>
            <select
              {...register('dailyActivities.activityLevel.energyLevel')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select energy level</option>
              <option value="1">1 - Very low energy</option>
              <option value="2">2 - Low energy</option>
              <option value="3">3 - Moderate energy</option>
              <option value="4">4 - High energy</option>
              <option value="5">5 - Very high energy</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Periods
          </label>
          <textarea
            {...register('dailyActivities.activityLevel.activePeriods')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe when you were most active today..."
          />
        </div>
      </div>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Medication Compliance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Morning Medications
            </label>
            <select
              {...register('dailyActivities.medicationCompliance.morning')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="taken_as_prescribed">Taken as prescribed</option>
              <option value="forgotten">Forgotten</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Afternoon Medications
            </label>
            <select
              {...register('dailyActivities.medicationCompliance.afternoon')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="taken_as_prescribed">Taken as prescribed</option>
              <option value="forgotten">Forgotten</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Evening Medications
            </label>
            <select
              {...register('dailyActivities.medicationCompliance.evening')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="taken_as_prescribed">Taken as prescribed</option>
              <option value="forgotten">Forgotten</option>
              <option value="delayed">Delayed</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Side Effects Observed
          </label>
          <textarea
            {...register('dailyActivities.medicationCompliance.sideEffects')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any side effects noticed today..."
          />
        </div>
      </div>
    </div>
  );
};

export default DailyActivitiesSection;