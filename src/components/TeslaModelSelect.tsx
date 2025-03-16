import { useState } from 'react'

export interface TeslaModel {
  id: string;
  name: string;
  range: number;
  chargingSpeed: number;
}

const TESLA_MODELS: TeslaModel[] = [
  { id: 'model3', name: 'Model 3', range: 358, chargingSpeed: 250 },
  { id: 'modely', name: 'Model Y', range: 330, chargingSpeed: 250 },
  { id: 'models', name: 'Model S', range: 405, chargingSpeed: 250 },
  { id: 'modelx', name: 'Model X', range: 348, chargingSpeed: 250 },
  { id: 'cybertruck', name: 'Cybertruck', range: 500, chargingSpeed: 250 }
];

interface TeslaModelSelectProps {
  onModelSelect: (model: TeslaModel) => void;
}

export default function TeslaModelSelect({ onModelSelect }: TeslaModelSelectProps) {
  const [selectedModel, setSelectedModel] = useState<TeslaModel>(TESLA_MODELS[0]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const model = TESLA_MODELS.find(m => m.id === event.target.value);
    if (model) {
      setSelectedModel(model);
      onModelSelect(model);
    }
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
        value={selectedModel.id}
        onChange={handleChange}
        className="block w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 text-gray-900"
        required
      >
        {TESLA_MODELS.map(model => (
          <option key={model.id} value={model.id}>
            Tesla {model.name}
          </option>
        ))}
      </select>
    </div>
  );
} 