import React from 'react';
import { UseFormRegister, Control, FieldErrors } from 'react-hook-form';
import { SymptomEntry } from '@parkml/shared';

interface AutonomicSymptomsSectionProps {
  register: UseFormRegister<Partial<SymptomEntry>>;
  control: Control<Partial<SymptomEntry>>;
  errors: FieldErrors<Partial<SymptomEntry>>;
}

const AutonomicSymptomsSection: React.FC<AutonomicSymptomsSectionProps> = ({
  register,
}) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-medium text-gray-900">Autonomic Symptoms</h2>
      
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-md font-medium text-gray-800 mb-4">Bladder/Bowel Function</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urination
            </label>
            <select
              {...register('autonomicSymptoms.bladderBowel.urination')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="normal">Normal</option>
              <option value="frequent">Frequent</option>
              <option value="urgent">Urgent</option>
              <option value="incontinence">Incontinence</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bowel Movements
            </label>
            <select
              {...register('autonomicSymptoms.bladderBowel.bowelMovements')}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select status</option>
              <option value="normal">Normal</option>
              <option value="constipation">Constipation</option>
              <option value="frequent">Frequent</option>
              <option value="incontinence">Incontinence</option>
            </select>
          </div>
        </div>
        
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            {...register('autonomicSymptoms.bladderBowel.notes')}
            rows={3}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            placeholder="Additional observations about bladder/bowel function..."
          />
        </div>
      </div>
    </div>
  );
};

export default AutonomicSymptomsSection;