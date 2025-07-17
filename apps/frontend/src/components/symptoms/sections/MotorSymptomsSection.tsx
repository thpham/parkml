import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface MotorSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const MotorSymptomsSection: React.FC<MotorSymptomsSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Motor Symptoms</h2>
      
      {/* Tremors Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Tremors</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Observed
            </label>
            <input
              {...register('motorSymptoms.tremors.0.timeObserved')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Severity (1-5)
            </label>
            <select
              {...register('motorSymptoms.tremors.0.severity')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select severity</option>
              <option value="1">1 - Barely perceptible</option>
              <option value="2">2 - Mild</option>
              <option value="3">3 - Moderate</option>
              <option value="4">4 - Marked</option>
              <option value="5">5 - Severe</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {['right_hand', 'left_hand', 'right_leg', 'left_leg', 'head', 'jaw'].map((location) => (
              <label key={location} className="flex items-center">
                <input
                  {...register(`motorSymptoms.tremors.0.location` as any)}
                  type="checkbox"
                  value={location}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">
                  {location.replace('_', ' ')}
                </span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Type
          </label>
          <div className="space-y-2">
            {[
              { value: 'at_rest', label: 'At rest' },
              { value: 'during_movement', label: 'During movement' },
              { value: 'maintaining_position', label: 'Maintaining position' },
            ].map((type) => (
              <label key={type.value} className="flex items-center">
                <input
                  {...register('motorSymptoms.tremors.0.type')}
                  type="radio"
                  value={type.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{type.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Duration
          </label>
          <input
            {...register('motorSymptoms.tremors.0.duration')}
            type="text"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="e.g., 15 minutes, continuous, intermittent"
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Triggers/Situations
          </label>
          <textarea
            {...register('motorSymptoms.tremors.0.triggers')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="What situations or activities trigger the tremor?"
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('motorSymptoms.tremors.0.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional observations about tremors..."
          />
        </div>
      </div>
      
      {/* Balance and Posture Section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Balance and Posture</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Time Observed
            </label>
            <input
              {...register('motorSymptoms.balance.timeObserved')}
              type="time"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Falls Today
            </label>
            <input
              {...register('motorSymptoms.balance.fallsToday')}
              type="number"
              min="0"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Posture
          </label>
          <div className="space-y-2">
            {[
              { value: 'normal', label: 'Normal' },
              { value: 'hunched', label: 'Hunched' },
              { value: 'leaning_sideways', label: 'Leaning sideways' },
              { value: 'other', label: 'Other' },
            ].map((posture) => (
              <label key={posture.value} className="flex items-center">
                <input
                  {...register('motorSymptoms.balance.posture')}
                  type="radio"
                  value={posture.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{posture.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Balance Problems
          </label>
          <div className="space-y-2">
            {[
              { value: 'none', label: 'None' },
              { value: 'slight_swaying', label: 'Slight swaying' },
              { value: 'needs_support', label: 'Needs support' },
              { value: 'falls', label: 'Falls' },
            ].map((problem) => (
              <label key={problem.value} className="flex items-center">
                <input
                  {...register('motorSymptoms.balance.balanceProblems')}
                  type="radio"
                  value={problem.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{problem.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Walking Pattern
          </label>
          <div className="space-y-2">
            {[
              { value: 'normal', label: 'Normal' },
              { value: 'shuffling', label: 'Shuffling' },
              { value: 'small_steps', label: 'Small steps' },
              { value: 'freezing_episodes', label: 'Freezing episodes' },
            ].map((pattern) => (
              <label key={pattern.value} className="flex items-center">
                <input
                  {...register('motorSymptoms.balance.walkingPattern')}
                  type="radio"
                  value={pattern.value}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">{pattern.label}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('motorSymptoms.balance.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional observations about balance and posture..."
          />
        </div>
      </div>
    </div>
  );
};

export default MotorSymptomsSection;