import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface EnvironmentalFactorsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const EnvironmentalFactorsSection: React.FC<EnvironmentalFactorsSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Environmental Factors</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Weather and Environment</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Temperature (°C)
            </label>
            <input
              {...register('environmentalFactors.temperature')}
              type="number"
              step="0.5"
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Humidity
            </label>
            <select
              {...register('environmentalFactors.humidity')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select humidity level</option>
              <option value="high">High</option>
              <option value="normal">Normal</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Weather Conditions
          </label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {['sunny', 'cloudy', 'rainy', 'hot', 'cold'].map((weather) => (
              <label key={weather} className="flex items-center">
                <input
                  {...register(`environmentalFactors.weather` as any)}
                  type="checkbox"
                  value={weather}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700 capitalize">{weather}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Environmental Changes
          </label>
          <textarea
            {...register('environmentalFactors.environmentalChanges')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any changes in environment that might affect symptoms..."
          />
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Stressful Events
          </label>
          <textarea
            {...register('environmentalFactors.stressfulEvents')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Any stressful events or situations today..."
          />
        </div>
      </div>
    </div>
  );
};

export default EnvironmentalFactorsSection;