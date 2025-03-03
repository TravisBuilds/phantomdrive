import { useState } from 'react';

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

interface HotelSelectorProps {
  location: { lat: number; lng: number };
  onHotelSelect: (hotel: Hotel) => void;
}

export default function HotelSelector({ location, onHotelSelect }: HotelSelectorProps) {
  const [budget, setBudget] = useState<number>(200);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchHotels = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/hotels/search?` +
        `location=${location.lat},${location.lng}&` +
        `budget=${budget}&` +
        `checkIn=${new Date().toISOString()}&` + // You might want to make these dates selectable
        `checkOut=${new Date().toISOString()}`
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message);

      setHotels(data);
    } catch (error) {
      setError('Failed to fetch hotels');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center">
        <label className="font-medium">Budget per night:</label>
        <input
          type="number"
          value={budget}
          onChange={(e) => setBudget(Number(e.target.value))}
          className="px-4 py-2 border rounded"
          min={0}
          step={50}
        />
        <button
          onClick={searchHotels}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Search Hotels
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
          {hotels.map((hotel, index) => (
            <div 
              key={index}
              className="p-4 border rounded hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => onHotelSelect(hotel)}
            >
              <h3 className="font-semibold">{hotel.name}</h3>
              <div className="text-sm text-gray-600">
                <p>{hotel.details.formatted_address}</p>
                <p>Rating: {hotel.rating} ⭐</p>
                <p>Price Level: {'$'.repeat(hotel.details.price_level || 1)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
} 