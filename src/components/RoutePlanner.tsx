import { useEffect, useRef, useState } from 'react';
import { TeslaModel } from './TeslaModelSelect';
import { Location, ChargeStop } from '@/types';

interface RoutePlannerProps {
  selectedModel: TeslaModel;
  onLocationSelect: (location: google.maps.LatLngLiteral) => void;
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
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [isSettingStart, setIsSettingStart] = useState(true);

  const directionsService = useRef<google.maps.DirectionsService | null>(null);

  const toLatLng = (location: Location): google.maps.LatLngLiteral => ({
    lat: location.lat,
    lng: location.lng
  });

  const initMap = () => {
    if (!mapRef.current || !window.google) {
      console.error('Google Maps not loaded');
      setError('Failed to load Google Maps. Please check your API key configuration.');
      return;
    }

    try {
      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: 40.7128, lng: -74.0060 }, // Default to NYC
        zoom: 4,
        mapTypeControl: true,
        streetViewControl: true,
        fullscreenControl: true,
        zoomControl: true
      });

      setMap(mapInstance);

      const renderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        preserveViewport: false // Allow map to auto-zoom to show route
      });
      renderer.setMap(mapInstance);
      setDirectionsRenderer(renderer);

      setupPlacesAutocomplete(mapInstance);
    } catch (error) {
      console.error('Map initialization error:', error);
      setError('Failed to initialize map. Please refresh the page or try again later.');
    }
  };

  // Add this helper function back
  const getFormattedAddress = (place: google.maps.places.PlaceResult): string => {
    if (place.name && place.types?.includes('establishment')) {
      return place.name;
    }
    return place.formatted_address || place.name || '';
  };

  // Update the setupPlacesAutocomplete function
  const setupPlacesAutocomplete = (mapInstance: google.maps.Map) => {
    const input = document.getElementById('location-input') as HTMLInputElement;
    if (!input) return;

    const autocomplete = new google.maps.places.Autocomplete(input);
    autocomplete.bindTo('bounds', mapInstance);
    autocompleteRef.current = autocomplete;

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) return;

      const location: Location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name || ''
      };

      // Update map and markers
      mapInstance.setCenter(location);
      mapInstance.setZoom(13);

      if (isSettingStart) {
        // Clear previous markers
        markers.forEach(marker => marker.setMap(null));
        setMarkers([]);

        // Add new start marker
        const marker = new google.maps.Marker({
          position: location,
          map: mapInstance,
          label: { text: 'A', color: 'white', fontSize: '14px' },
          title: `Start: ${location.address}`
        });
        setMarkers([marker]);
        setStartLocation(location);
        setIsSettingStart(false);
      } else {
        addStop(location);
      }
      setSearchInput('');
    });
  };

  useEffect(() => {
    if (!mapRef.current || !window.google) return;

    const mapInstance = new google.maps.Map(mapRef.current, {
      center: { lat: 40.7128, lng: -74.0060 },
      zoom: 4,
      mapTypeControl: true,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true
    });

    setMap(mapInstance);

    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true,
      preserveViewport: false
    });
    renderer.setMap(mapInstance);
    setDirectionsRenderer(renderer);

    setupPlacesAutocomplete(mapInstance);
  }, []);

  const handleSetStart = (location: Location) => {
    if (!map) return;
    
    clearMap();
    setStartLocation(location);
    setIsSettingStart(false);

    // Create marker
    const marker = new google.maps.Marker({
      position: { lat: location.lat, lng: location.lng },
      map: map,
      label: { text: 'A', color: 'white', fontSize: '14px' },
      title: `Start: ${location.address}`
    });
    setMarkers([marker]);

    // Update map view
    map.setCenter({ lat: location.lat, lng: location.lng });
    map.setZoom(13);
  };

  const addStop = async (location: Location) => {
    if (!startLocation) {
      handleSetStart(location);
      return;
    }

    // Set the destination
    setStops([location]);

    if (map) {
      // Clear existing markers
      markers.forEach(marker => marker.setMap(null));

      // Create markers for both start and destination
      const startMarker = new google.maps.Marker({
        position: { lat: startLocation.lat, lng: startLocation.lng },
        map,
        label: { text: 'A', color: 'white', fontSize: '14px' },
        title: `Start: ${startLocation.address}`
      });

      const destMarker = new google.maps.Marker({
        position: { lat: location.lat, lng: location.lng },
        map,
        label: { text: 'B', color: 'white', fontSize: '14px' },
        title: `Destination: ${location.address}`
      });

      setMarkers([startMarker, destMarker]);

      // Calculate route
      if (directionsRenderer) {
        const request: google.maps.DirectionsRequest = {
          origin: { lat: startLocation.lat, lng: startLocation.lng },
          destination: { lat: location.lat, lng: location.lng },
          travelMode: google.maps.TravelMode.DRIVING
        };

        const service = new google.maps.DirectionsService();
        service.route(request, (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result);
            map.fitBounds(result.routes[0].bounds);
          }
        });
      }
    }
  };

  const calculateRoute = async (routeStops: Location[]) => {
    setIsLoading(true);
    setError(null);

    try {
      // Make sure we have both start and destination
      if (routeStops.length < 2) {
        throw new Error('Need both start and destination locations');
      }

      // Create a clean request body without any extra properties
      const requestBody = {
        origin: {
          lat: routeStops[0].lat,
          lng: routeStops[0].lng,
          address: routeStops[0].address
        },
        destination: {
          lat: routeStops[routeStops.length - 1].lat,
          lng: routeStops[routeStops.length - 1].lng,
          address: routeStops[routeStops.length - 1].address
        },
        waypoints: routeStops.slice(1, -1).map(stop => ({
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address
        })),
        model: {
          id: selectedModel.id,
          name: selectedModel.name,
          range: selectedModel.range,
          chargingSpeed: selectedModel.chargingSpeed
        }
      };

      console.log('Request body:', requestBody);

      const response = await fetch('/api/routes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.message || 
          `Failed to calculate route (${response.status})`
        );
      }

      const data = await response.json();
      
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
    if (!map || !startLocation) return;

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null));
    
    // Create new markers array
    const newMarkers: google.maps.Marker[] = [];

    // Add marker for start location
    const startMarker = new google.maps.Marker({
      position: toLatLng(startLocation),
      map,
      label: 'A',
      title: `Start: ${startLocation.address}`
    });
    newMarkers.push(startMarker);

    // Add marker for destination
    if (stops.length > 0) {
      const destinationMarker = new google.maps.Marker({
        position: toLatLng(stops[stops.length - 1]),
        map,
        label: 'B',
        title: `Destination: ${stops[stops.length - 1].address}`
      });
      newMarkers.push(destinationMarker);
    }

    // Add markers for charging stops if they exist
    if (chargeStops?.length > 0) {
      chargeStops.forEach((stop) => {
        if (stop?.location) {
          const marker = new google.maps.Marker({
            position: stop.location,
            map,
            icon: {
              url: '/charging-station.png',
              scaledSize: new google.maps.Size(24, 24)
            },
            title: `${stop.name} - ${Math.round(stop.duration)}min charge`
          });
          newMarkers.push(marker);
        }
      });
    }

    setMarkers(newMarkers);

    // Draw route line using DirectionsService
    if (stops.length > 0 && directionsRenderer && directionsService.current) {
      directionsRenderer.setMap(map);
      
      const request: google.maps.DirectionsRequest = {
        origin: toLatLng(startLocation),
        destination: toLatLng(stops[stops.length - 1]),
        waypoints: stops.slice(0, -1).map(stop => ({
          location: toLatLng(stop),
          stopover: true
        })),
        travelMode: google.maps.TravelMode.DRIVING
      };

      directionsService.current.route(request, (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
          
          const bounds = new google.maps.LatLngBounds();
          
          // Add start location
          bounds.extend(toLatLng(startLocation));
          
          // Add all stops
          stops.forEach(stop => bounds.extend(toLatLng(stop)));
          
          // Add charge stops
          chargeStops?.forEach(stop => {
            if (stop?.location) {
              bounds.extend(stop.location);
            }
          });
          
          map.fitBounds(bounds);
        }
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchInput(e.target.value);
  };

  const clearMap = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
    setStops([]);
    setChargeStops([]);
    if (directionsRenderer) {
      directionsRenderer.setMap(null);
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

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <input
            id="location-input"
            type="text"
            value={searchInput}
            onChange={handleInputChange}
            placeholder={isSettingStart ? "Enter starting location" : "Enter destination"}
            className="flex-1 px-4 py-2 border rounded text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
        </div>

        {startLocation && (
          <div className="text-sm text-gray-600">
            Starting from: {startLocation.address}
            <button
              onClick={() => {
                setIsSettingStart(true);
                setStartLocation(null);
                setStops([]);
                setChargeStops([]);
                markers.forEach(marker => marker.setMap(null));
                setMarkers([]);
                if (directionsRenderer) {
                  directionsRenderer.setMap(null);
                }
              }}
              className="ml-2 text-blue-500 hover:text-blue-600"
            >
              Change
            </button>
          </div>
        )}
      </div>

      <div 
        ref={mapRef} 
        className={`w-full h-[500px] rounded-lg shadow-lg ${error ? 'bg-gray-100' : ''}`}
      />

      {/* Route Summary Section */}
      <div className="flex flex-col gap-4 p-4 bg-white rounded-lg shadow">
        <h3 className="font-semibold text-lg mb-2 text-gray-900">Route Summary</h3>
        <div className="space-y-3">
          {startLocation && (
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full font-semibold">
                A
              </span>
              <span className="text-gray-900">{startLocation.address}</span>
            </div>
          )}
          
          {stops.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 bg-blue-500 text-white rounded-full font-semibold">
                B
              </span>
              <span className="text-gray-900">{stops[0].address}</span>
            </div>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2">
            <h3 className="font-semibold">Stops:</h3>
            {stops.map((stop, index) => (
              <div key={index} className="flex items-center gap-2 text-gray-900">
                <span>{index + 1}.</span>
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