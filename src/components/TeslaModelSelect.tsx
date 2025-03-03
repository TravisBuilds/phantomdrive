import { useState } from 'react'

export type TeslaModel = 'Model 3' | 'Model Y' | 'Model S' | 'Model X' | 'Cybertruck';

interface TeslaModelSelectProps {
  onModelSelect: (model: TeslaModel) => void;
}

export default function TeslaModelSelect({ onModelSelect }: TeslaModelSelectProps) {
  const [selectedModel, setSelectedModel] = useState<TeslaModel>('Model 3');

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const model = event.target.value as TeslaModel;
    setSelectedModel(model);
    onModelSelect(model);
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <label 
        htmlFor="tesla-model" 
        className="block text-sm font-medium text-gray-700 mb-2"
      >
        Select Your Tesla Model
      </label>
      <select
        id="tesla-model"
        value={selectedModel}
        onChange={handleChange}
        className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        required
      >
        <option value="">Select a model</option>
        <option value="Model 3">Tesla Model 3</option>
        <option value="Model Y">Tesla Model Y</option>
        <option value="Model S">Tesla Model S</option>
        <option value="Model X">Tesla Model X</option>
        <option value="Cybertruck">Tesla Cybertruck</option>
      </select>
    </div>
  );
} 