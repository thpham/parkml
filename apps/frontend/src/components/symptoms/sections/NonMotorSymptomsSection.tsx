import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface NonMotorSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const NonMotorSymptomsSection: React.FC<NonMotorSymptomsSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Non-Motor Symptoms</h2>
      
      {/* Cognitive Function */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Cognitive Function</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Observed
            </label>
            <input
              {...register('nonMotorSymptoms.cognitive.timeObserved')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Alertness
            </label>
            <select
              {...register('nonMotorSymptoms.cognitive.alertness')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select alertness level</option>
              <option value="alert">Alert</option>
              <option value="drowsy">Drowsy</option>
              <option value="confused">Confused</option>
              <option value="disoriented">Disoriented</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Memory - Recent Events
          </label>
          <div className="space-y-2">
            {[
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' },
            ].map((level) => (
              <label key={level.value} className="flex items-center">
                <input
                  {...register('nonMotorSymptoms.cognitive.memory.recentEvents')}
                  type="radio"
                  value={level.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Concentration/Attention
          </label>
          <div className="space-y-2">
            {[
              { value: 'good', label: 'Good' },
              { value: 'fair', label: 'Fair' },
              { value: 'poor', label: 'Poor' },
            ].map((level) => (
              <label key={level.value} className="flex items-center">
                <input
                  {...register('nonMotorSymptoms.cognitive.concentration')}
                  type="radio"
                  value={level.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{level.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('nonMotorSymptoms.cognitive.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional observations about cognitive function..."
          />
        </div>
      </div>
      
      {/* Sleep Assessment */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Sleep Patterns</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bedtime
            </label>
            <input
              {...register('nonMotorSymptoms.sleep.bedtime')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Wake Time
            </label>
            <input
              {...register('nonMotorSymptoms.sleep.wakeTime')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Sleep Hours
            </label>
            <input
              {...register('nonMotorSymptoms.sleep.totalSleepHours')}
              type="number"
              step="0.5"
              min="0"
              max="24"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Sleep Quality
          </label>
          <div className="space-y-2">
            {[
              { value: 'restful', label: 'Restful' },
              { value: 'restless', label: 'Restless' },
              { value: 'frequent_awakenings', label: 'Frequent awakenings' },
            ].map((quality) => (
              <label key={quality.value} className="flex items-center">
                <input
                  {...register('nonMotorSymptoms.sleep.sleepQuality')}
                  type="radio"
                  value={quality.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{quality.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('nonMotorSymptoms.sleep.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional observations about sleep patterns..."
          />
        </div>
      </div>
    </div>
  );
};

export default NonMotorSymptomsSection;