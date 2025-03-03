import { TeslaModel } from '@/components/TeslaModelSelect'

interface RouteParams {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints?: Array<{ lat: number; lng: number }>;
  model: TeslaModel;
  route: {
    path: Array<{ lat: number; lng: number }>;
    totalDistance: number;
    duration: number;
  };
}

interface ChargeStop {
  location: { lat: number; lng: number };
  name: string;
  duration: number;
  distance: number;
}

interface SuperchargerLocation {
  name: string;
  location: { lat: number; lng: number };
  available_stalls: number;
  charging_rate: number; // kW
}

const SAFETY_BUFFER = 0.8; // Only use 80% of theoretical range for safety

export async function calculateChargeStops(params: RouteParams) {
  const modelRanges = {
    'Model 3': 358,
    'Model Y': 330,
    'Model S': 405,
    'Model X': 348,
    'Cybertruck': 500,
  };

  const effectiveRange = modelRanges[params.model] * SAFETY_BUFFER;
  
  // For now, return a simple example charging stop
  // You can enhance this with actual Tesla Supercharger API data later
  if (params.route.totalDistance > effectiveRange) {
    const numberOfStops = Math.ceil(params.route.totalDistance / effectiveRange) - 1;
    const distanceBetweenStops = params.route.totalDistance / (numberOfStops + 1);
    
    return Array.from({ length: numberOfStops }, (_, index) => ({
      location: {
        lat: params.origin.lat + (params.destination.lat - params.origin.lat) * ((index + 1) / (numberOfStops + 1)),
        lng: params.origin.lng + (params.destination.lng - params.origin.lng) * ((index + 1) / (numberOfStops + 1))
      },
      name: `Charging Stop ${index + 1}`,
      duration: 30, // Example charging duration in minutes
      distance: distanceBetweenStops * (index + 1)
    }));
  }

  return []; // No charging stops needed if distance is within range
}

async function getRouteDetails(params: RouteParams) {
  const response = await fetch('/api/routes/directions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  
  return await response.json();
}

async function getNearbyChargers(routePath: Array<{ lat: number; lng: number }>) {
  const response = await fetch('/api/tesla/superchargers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ routePath }),
  });
  
  return await response.json();
}

function calculateOptimalChargeStops(
  route: { path: Array<{ lat: number; lng: number }>; totalDistance: number },
  superchargers: SuperchargerLocation[],
  effectiveRange: number
): ChargeStop[] {
  const stops: ChargeStop[] = [];
  let distanceCovered = 0;
  let currentLocation = route.path[0];

  while (distanceCovered < route.totalDistance) {
    const nextCharger = findNextOptimalCharger(
      currentLocation,
      superchargers,
      effectiveRange,
      distanceCovered,
      route.totalDistance
    );

    if (!nextCharger) break;

    stops.push({
      location: nextCharger.location,
      name: nextCharger.name,
      duration: calculateChargeDuration(nextCharger.charging_rate),
      distance: distanceCovered,
    });

    currentLocation = nextCharger.location;
    distanceCovered += calculateDistance(currentLocation, route.path[0]);
  }

  return stops;
} 