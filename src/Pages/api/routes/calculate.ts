import type { NextApiRequest, NextApiResponse } from 'next'
import { calculateChargeStops } from '@/lib/tesla'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const { origin, destination, waypoints, model } = req.body

    console.log('Route calculation request:', { origin, destination, waypoints, model });

    // Validate input
    if (!origin?.lat || !origin?.lng || !destination?.lat || !destination?.lng || !model) {
      return res.status(400).json({ 
        message: 'Missing required fields',
        details: {
          origin: !origin?.lat || !origin?.lng ? 'missing coordinates' : 'ok',
          destination: !destination?.lat || !destination?.lng ? 'missing coordinates' : 'ok',
          model: !model ? 'missing' : 'ok'
        }
      });
    }

    // Get route from Google Directions API first
    const directionsUrl = new URL('https://maps.googleapis.com/maps/api/directions/json');
    directionsUrl.searchParams.append('origin', `${origin.lat},${origin.lng}`);
    directionsUrl.searchParams.append('destination', `${destination.lat},${destination.lng}`);
    if (waypoints?.length) {
      const waypointsStr = waypoints
        .map(wp => `${wp.lat},${wp.lng}`)
        .join('|');
      directionsUrl.searchParams.append('waypoints', waypointsStr);
    }
    directionsUrl.searchParams.append('key', process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!);

    console.log('Fetching directions from:', directionsUrl.toString());

    const directionsResponse = await fetch(directionsUrl);
    const directionsData = await directionsResponse.json();

    console.log('Directions API response:', directionsData);

    if (directionsData.status !== 'OK') {
      return res.status(400).json({ 
        message: 'Failed to get directions',
        status: directionsData.status,
        error_message: directionsData.error_message
      });
    }

    // Extract route path and total distance
    const route = {
      path: directionsData.routes[0].legs.flatMap(leg => 
        leg.steps.map(step => ({
          lat: step.end_location.lat,
          lng: step.end_location.lng
        }))
      ),
      totalDistance: directionsData.routes[0].legs.reduce(
        (total, leg) => total + leg.distance.value, 0
      ) / 1609.34, // Convert meters to miles
      duration: directionsData.routes[0].legs.reduce(
        (total, leg) => total + leg.duration.value, 0
      ) / 60 // Convert seconds to minutes
    };

    // Calculate charging stops
    const chargeStops = await calculateChargeStops({
      origin,
      destination,
      waypoints: waypoints || [],
      model,
      route
    });

    const response = {
      route: route.path,
      totalDistance: route.totalDistance,
      duration: route.duration,
      chargeStops
    };

    console.log('Sending response:', response);

    res.status(200).json(response);
  } catch (error) {
    console.error('Route calculation error:', error);
    res.status(500).json({ 
      message: 'Error calculating route',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
} 