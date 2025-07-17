import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface SafetyIncidentsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const SafetyIncidentsSection: React.FC<SafetyIncidentsSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Safety Incidents</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Incident Report</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Incident Type
            </label>
            <select
              {...register('safetyIncidents.0.type')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select incident type</option>
              <option value="fall">Fall</option>
              <option value="near_fall">Near fall</option>
              <option value="choking">Choking</option>
              <option value="medication_error">Medication error</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time of Incident
            </label>
            <input
              {...register('safetyIncidents.0.time')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <input
            {...register('safetyIncidents.0.location')}
            type="text"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Where did the incident occur?"
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Circumstances
          </label>
          <textarea
            {...register('safetyIncidents.0.circumstances')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Describe what happened and the circumstances..."
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Injury Level
          </label>
          <div className="space-y-2">
            {[
              { value: 'none', label: 'No injury' },
              { value: 'minor', label: 'Minor injury' },
              { value: 'significant', label: 'Significant injury' },
            ].map((injury) => (
              <label key={injury.value} className="flex items-center">
                <input
                  {...register('safetyIncidents.0.injury')}
                  type="radio"
                  value={injury.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{injury.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            {...register('safetyIncidents.0.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any additional details about the incident..."
          />
        </div>
      </div>
    </div>
  );
};

export default SafetyIncidentsSection;