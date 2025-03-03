import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayouts'
import TeslaModelSelect, { TeslaModel } from '@/components/TeslaModelSelect'
import RoutePlanner from '@/components/RoutePlanner'
import HotelSelector from '@/components/HotelSelector'

interface Hotel {
  name: string;
  rating: number;
  details: {
    formatted_address: string;
    formatted_phone_number: string;
    website: string;
    price_level: number;
  };
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<TeslaModel | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedHotel, setSelectedHotel] = useState<Hotel | null>(null);

  const handleModelSelect = (model: TeslaModel) => {
    setSelectedModel(model);
  };

  const handleLocationSelect = (location: { lat: number; lng: number }) => {
    setSelectedLocation(location);
  };

  const handleHotelSelect = (hotel: Hotel) => {
    setSelectedHotel(hotel);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Plan Your Tesla Road Trip</h2>
          <p className="text-gray-600 mb-4">
            Welcome to PhantomDrive. Start planning your next adventure with smart routing
            and charging stops for your Tesla.
          </p>
          <TeslaModelSelect onModelSelect={handleModelSelect} />
        </div>

        {selectedModel && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Plan Your Route</h2>
            <RoutePlanner 
              selectedModel={selectedModel} 
              onLocationSelect={handleLocationSelect}
            />
          </div>
        )}

        {selectedLocation && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Find Hotels</h2>
            <HotelSelector
              location={selectedLocation}
              onHotelSelect={handleHotelSelect}
            />
          </div>
        )}

        {selectedHotel && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Selected Hotel</h2>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">{selectedHotel.name}</h3>
              <p className="text-gray-600">{selectedHotel.details.formatted_address}</p>
              <p className="text-gray-600">Rating: {selectedHotel.rating} ⭐</p>
              <p className="text-gray-600">
                Price Level: {'$'.repeat(selectedHotel.details.price_level || 1)}
              </p>
              {selectedHotel.details.website && (
                <a 
                  href={selectedHotel.details.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline"
                >
                  Visit Website
                </a>
              )}
              {selectedHotel.details.formatted_phone_number && (
                <p className="text-gray-600">
                  Phone: {selectedHotel.details.formatted_phone_number}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  )
}