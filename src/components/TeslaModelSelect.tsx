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
    <select 
      value={selectedModel} 
      onChange={handleChange}
      className="mt-4 block w-full p-2 border rounded"
    >
      <option value="Model 3">Tesla Model 3</option>
      <option value="Model Y">Tesla Model Y</option>
      <option value="Model S">Tesla Model S</option>
      <option value="Model X">Tesla Model X</option>
      <option value="Cybertruck">Tesla Cybertruck</option>
    </select>
  );
} 