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
  const [startInput, setStartInput] = useState('');
  const [destInput, setDestInput] = useState('');
  const startAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const destAutocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const [startLocation, setStartLocation] = useState<Location | null>(null);
  const [isSettingStart, setIsSettingStart] = useState<boolean>(true);
  const [hasStartLocation, setHasStartLocation] = useState<boolean>(false);
  const [destination, setDestination] = useState<Location | null>(null);

  const directionsService = useRef<google.maps.DirectionsService | null>(null);

  const toLatLng = (location: Location): google.maps.LatLngLiteral => ({
    lat: location.lat,
    lng: location.lng
  });

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

    // Initialize DirectionsService
    directionsService.current = new google.maps.DirectionsService();

    // Initialize DirectionsRenderer
    const renderer = new google.maps.DirectionsRenderer({
      suppressMarkers: true, // We'll handle markers ourselves
      map: mapInstance, // Attach to map immediately
      preserveViewport: false
    });
    setDirectionsRenderer(renderer);

    setupPlacesAutocomplete(mapInstance);

    return () => {
      markers.forEach(marker => marker.setMap(null));
      renderer.setMap(null);
      if (startAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(startAutocompleteRef.current);
      }
      if (destAutocompleteRef.current) {
        google.maps.event.clearInstanceListeners(destAutocompleteRef.current);
      }
    };
  }, []);

  useEffect(() => {
    // Synchronize state with localStorage on mount
    const savedStart = localStorage.getItem('startLocation');
    
    if (savedStart) {
      const parsedStart = JSON.parse(savedStart);
      setStartLocation(parsedStart);
      setHasStartLocation(true);
      setIsSettingStart(false);
      console.log('🔄 Initialized from localStorage:', {
        address: parsedStart.address,
        hasStartLocation: true,
        isSettingStart: false
      });
    } else {
      setHasStartLocation(false);
      setIsSettingStart(true);
      console.log('🔄 No saved location found, ready for start location');
    }
  }, []); // Empty dependency array for mount only

  useEffect(() => {
    if (startLocation) {
      // Update localStorage and state atomically
      localStorage.setItem('startLocation', JSON.stringify(startLocation));
      setHasStartLocation(true);
      setIsSettingStart(false);

      console.log('✅ Start location updated:', {
        address: startLocation.address,
        hasStartLocation: true,
        isSettingStart: false
      });
    }
  }, [startLocation]);

  // Add this useEffect to monitor hasStartLocation changes
  useEffect(() => {
    console.log('🔍 hasStartLocation changed:', {
      hasStartLocation,
      isSettingStart,
      currentStart: startLocation?.address
    });
  }, [hasStartLocation, isSettingStart, startLocation]);

  // Add a useEffect to monitor isSettingStart changes
  useEffect(() => {
    console.log('🚩 isSettingStart changed:', {
      isSettingStart,
      hasStartLocation,
      currentStart: startLocation?.address
    });
  }, [isSettingStart]);

  const setupPlacesAutocomplete = (mapInstance: google.maps.Map) => {
    const startInput = document.getElementById('start-location-input') as HTMLInputElement;
    const destInput = document.getElementById('dest-location-input') as HTMLInputElement;
    if (!startInput || !destInput) return;

    // Setup start location autocomplete
    const startAutocomplete = new google.maps.places.Autocomplete(startInput);
    startAutocomplete.bindTo('bounds', mapInstance);
    startAutocompleteRef.current = startAutocomplete;

    // Setup destination autocomplete
    const destAutocomplete = new google.maps.places.Autocomplete(destInput);
    destAutocomplete.bindTo('bounds', mapInstance);
    destAutocompleteRef.current = destAutocomplete;

    // Handle start location selection
    startAutocomplete.addListener('place_changed', () => {
      const place = startAutocomplete.getPlace();
      if (!place.geometry?.location) return;

      const location: Location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name || ''
      };

      handleStartLocation(location, mapInstance);
      setStartInput('');
    });

    // Handle destination selection
    destAutocomplete.addListener('place_changed', () => {
      const place = destAutocomplete.getPlace();
      if (!place.geometry?.location) return;

      const location: Location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        address: place.formatted_address || place.name || ''
      };

      handleDestination(location, mapInstance);
      setDestInput('');
    });
  };

  const handleStartLocation = (location: Location, mapInstance: google.maps.Map) => {
    console.log('🏁 Setting START location:', location.address);
    markers.forEach(marker => marker.setMap(null));
    
    const startMarker = new google.maps.Marker({
      position: location,
      map: mapInstance,
      label: { text: 'A', color: 'white', fontSize: '14px' },
      title: `Start: ${location.address}`
    });

    setStartLocation(location);
    setMarkers([startMarker]);
    
    mapInstance.setCenter(location);
    mapInstance.setZoom(13);
  };

  const handleDestination = (location: Location, mapInstance: google.maps.Map) => {
    if (!startLocation || !directionsService.current || !directionsRenderer) {
      console.error('Missing required services or start location');
      return;
    }

    console.log('🎯 Adding DESTINATION:', {
      from: startLocation.address,
      to: location.address
    });
    
    // Clear existing markers first
    markers.forEach(marker => marker.setMap(null));
    
    // Add start marker
    const startMarker = new google.maps.Marker({
      position: toLatLng(startLocation),
      map: mapInstance,
      label: { text: 'A', color: 'white', fontSize: '14px' },
      title: `Start: ${startLocation.address}`
    });

    // Add destination marker
    const destMarker = new google.maps.Marker({
      position: toLatLng(location),
      map: mapInstance,
      label: { text: 'B', color: 'white', fontSize: '14px' },
      title: `Destination: ${location.address}`
    });

    setMarkers([startMarker, destMarker]);
    setDestination(location);
    setStops([location]);

    // Calculate and display route
    const request: google.maps.DirectionsRequest = {
      origin: toLatLng(startLocation),
      destination: toLatLng(location),
      travelMode: google.maps.TravelMode.DRIVING
    };
    
    directionsService.current.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        directionsRenderer.setMap(mapInstance); // Ensure renderer is attached to map
        directionsRenderer.setDirections(result);
        
        // Create bounds that include both points
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(toLatLng(startLocation));
        bounds.extend(toLatLng(location));
        
        // Fit the map to show both points with padding
        mapInstance.fitBounds(bounds);
        mapInstance.panToBounds(bounds, { top: 50, right: 50, bottom: 50, left: 50 });
        
        console.log('📍 Route calculated and displayed');
      } else {
        console.error('Failed to calculate route:', status);
      }
    });

    // Calculate route with charging stops if needed
    calculateRoute([startLocation, location]);
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

  const handleStartLocationChange = () => {
    console.log('Changing start location');
    
    // Clear map first
    clearMap();
    
    // Set isSettingStart first to ensure we're in the right mode
    setIsSettingStart(true);
    
    // Then clear other states and localStorage
    setStartLocation(null);
    setHasStartLocation(false);
    setStops([]);
    setChargeStops([]);
    
    // Clear only relevant localStorage items
    localStorage.removeItem('startLocation');
    
    console.log('Start location change initiated:', {
      isSettingStart: true,
      hasStartLocation: false,
      startLocation: null
    });
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
        <div className="flex flex-col gap-2">
          <input
            id="start-location-input"
            type="text"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            placeholder="Enter starting location"
            className="px-4 py-2 border rounded text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
          <input
            id="dest-location-input"
            type="text"
            value={destInput}
            onChange={(e) => setDestInput(e.target.value)}
            placeholder="Enter destination"
            className="px-4 py-2 border rounded text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
            autoComplete="off"
          />
        </div>

        {startLocation && (
          <div className="text-sm text-gray-600">
            Starting from: {startLocation.address}
            <button
              onClick={handleStartLocationChange}
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
    </div>
  );
} 