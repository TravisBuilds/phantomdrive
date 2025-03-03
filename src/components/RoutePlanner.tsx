import { useEffect, useRef, useState } from 'react';
import { TeslaModel } from './TeslaModelSelect';

interface Location {
  lat: number;
  lng: number;
  address: string;
}

interface RoutePlannerProps {
  selectedModel: TeslaModel;
  onLocationSelect: (location: { lat: number; lng: number }) => void;
}

interface ChargeStop {
  location: { lat: number; lng: number };
  name: string;
  duration: number;
  distance: number;
}

export default function RoutePlanner({ selectedModel, onLocationSelect }: RoutePlannerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [stops, setStops] = useState<Location[]>([]);
  const [chargeStops, setChargeStops] = useState<ChargeStop[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const initMap = () => {
    if (!mapRef.current || !window.google) {
      console.error('Google Maps not loaded');
      setError('Failed to load Google Maps. Please check your API key configuration.');
      return;
    }

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 },
        zoom: 8,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true
      });

      setMap(mapInstance);

      const input = document.getElementById('location-input') as HTMLInputElement;
      const autocomplete = new google.maps.places.Autocomplete(input, {
        fields: ['address_components', 'geometry', 'name', 'formatted_address'],
      });
      
      autocompleteRef.current = autocomplete;
      autocomplete.bindTo('bounds', mapInstance);

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAddStop();
        }
      });

      autocomplete.addListener('place_changed', () => {
        handlePlaceSelect();
      });
    } catch (error) {
      console.error('Map initialization error:', error);
      setError('Failed to initialize map. Please refresh the page or try again later.');
    }
  };

  useEffect(() => {
    if (window.google && mapRef.current) {
      initMap();
      
      // Initialize DirectionsRenderer
      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true, // We'll handle markers ourselves
        preserveViewport: true
      });
      setDirectionsRenderer(renderer);
    }
  }, []);

  const addStop = async (location: Location) => {
    const newStops = [...stops, location];
    setStops(newStops);

    // Create a marker for the new stop
    if (map) {
      const marker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        label: `${newStops.length}`,
        title: location.address
      });
      setMarkers([...markers, marker]);
    }

    // Pan to the new location
    map?.panTo({ lat: location.lat, lng: location.lng });
    map?.setZoom(13);

    // Only calculate route if we have at least 2 stops
    if (newStops.length >= 2) {
      await calculateRoute(newStops);
    }
  };

  const calculateRoute = async (routeStops: Location[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          origin: routeStops[0],
          destination: routeStops[routeStops.length - 1],
          waypoints: routeStops.slice(1, -1),
          model: selectedModel
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to calculate route');
      }

      if (!data.route || !Array.isArray(data.route)) {
        throw new Error('Invalid route data received');
      }

      setChargeStops(data.chargeStops || []);
      displayRoute(data.route);
      onLocationSelect(routeStops[routeStops.length - 1]);
      
    } catch (error) {
      console.error('Route calculation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to calculate route');
    } finally {
      setIsLoading(false);
    }
  };

  const displayRoute = (routePath: Array<{ lat: number; lng: number }>) => {
    if (!map) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    // Create new markers array
    const newMarkers: google.maps.Marker[] = [];

    // Add markers for stops
    stops.forEach((stop, index) => {
      const marker = new google.maps.Marker({
        position: { lat: stop.lat, lng: stop.lng },
        map,
        label: `${index + 1}`,
        title: stop.address
      });
      newMarkers.push(marker);
    });

    // Add markers for charging stops
    chargeStops.forEach((stop) => {
      const marker = new google.maps.Marker({
        position: stop.location,
        map,
        icon: {
          url: '/charging-station.png', // Add this icon to your public folder
          scaledSize: new google.maps.Size(24, 24)
        },
        title: `${stop.name} - ${Math.round(stop.duration)}min charge`
      });
      newMarkers.push(marker);
    });

    setMarkers(newMarkers);

    // Draw route line using DirectionsService
    if (stops.length >= 2 && directionsRenderer) {
      const directionsService = new google.maps.DirectionsService();
      
      directionsService.route({
        origin: { lat: stops[0].lat, lng: stops[0].lng },
        destination: { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng },
        waypoints: stops.slice(1, -1).map(stop => ({
          location: { lat: stop.lat, lng: stop.lng },
          stopover: true
        })),
        travelMode: google.maps.TravelMode.DRIVING
      }, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setMap(map);
          directionsRenderer.setDirections(result);
          
          // Fit bounds to include all stops and charging stations
          const bounds = new google.maps.LatLngBounds();
          stops.forEach(stop => bounds.extend({ lat: stop.lat, lng: stop.lng }));
          chargeStops.forEach(stop => bounds.extend(stop.location));
          map.fitBounds(bounds);
        }
      });
    }
  };

  const handlePlaceSelect = async () => {
    if (!autocompleteRef.current) return;
    
    const place = autocompleteRef.current.getPlace();
    if (!place.geometry?.location) {
      setError('No location found for this place');
      return;
    }

    const location: Location = {
      lat: place.geometry.location.lat(),
      lng: place.geometry.location.lng(),
      address: place.formatted_address || place.name || searchInput
    };

    try {
      await addStop(location);
      setSearchInput('');
      setError(null);
    } catch (error) {
      console.error('Error adding stop:', error);
      setError('Failed to add stop');
    }
  };

  const handleAddStop = async () => {
    if (!searchInput.trim()) {
      setError('Please enter a destination');
      return;
    }

    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place?.geometry?.location) {
        const location: Location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
          address: place.formatted_address || place.name || searchInput
        };
        try {
          await addStop(location);
          setSearchInput('');
        } catch (error) {
          console.error('Error adding stop:', error);
          setError('Failed to add stop');
        }
        return;
      }

      // If no place is selected, use Places Service to find one
      const placesService = new google.maps.places.PlacesService(map!);
      
      try {
        const results = await new Promise<google.maps.places.PlaceResult[]>((resolve, reject) => {
          placesService.findPlaceFromQuery({
            query: searchInput,
            fields: ['formatted_address', 'geometry', 'name']
          }, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK && results) {
              resolve(results);
            } else {
              reject(new Error('Place not found'));
            }
          });
        });

        if (results[0]?.geometry?.location) {
          const result = results[0];
          const location: Location = {
            lat: result.geometry.location.lat(),
            lng: result.geometry.location.lng(),
            address: result.formatted_address || result.name || searchInput
          };
          await addStop(location);
          setSearchInput('');
        } else {
          setError('Could not find location. Please try a different search.');
        }
      } catch (error) {
        console.error('Error finding place:', error);
        setError('Could not find location. Please try a different search.');
      }
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <input
          id="location-input"
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Enter a destination"
          className="flex-1 px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500"
          autoComplete="off"
        />
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          onClick={handleAddStop}
        >
          Add Stop
        </button>
      </div>

      <div 
        ref={mapRef} 
        className={`w-full h-[500px] rounded-lg shadow-lg ${error ? 'bg-gray-100' : ''}`}
      />

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <h3 className="font-semibold">Stops:</h3>
            {stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                <span className="font-medium">{index + 1}.</span>
                <span>{stop.address}</span>
              </div>
            ))}
          </div>

          {chargeStops.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-semibold">Charging Stops:</h3>
              {chargeStops.map((stop, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div>
                    <span className="font-medium">{stop.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {Math.round(stop.distance)} miles
                    </span>
                  </div>
                  <span className="text-sm">
                    Charge time: {Math.round(stop.duration)} min
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
} 