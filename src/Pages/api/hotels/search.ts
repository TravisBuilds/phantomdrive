import type { NextApiRequest, NextApiResponse } from 'next'

interface HotelSearchParams {
  location: string;
  budget: number;
  checkIn: string;
  checkOut: string;
  radius?: number; // in meters
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { location, budget, checkIn, checkOut, radius = 5000 } = req.query as unknown as HotelSearchParams;

  try {
    // First, get hotels in the area
    const placesResponse = await fetch(
      `https://maps.googleapis.com/maps/api/place/nearbysearch/json?` +
      `location=${location}&` +
      `radius=${radius}&` +
      `type=lodging&` +
      `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
    );

    const placesData = await placesResponse.json();
    
    // For each hotel, get detailed pricing information
    const hotelsWithPricing = await Promise.all(
      placesData.results.map(async (hotel: any) => {
        const detailsResponse = await fetch(
          `https://maps.googleapis.com/maps/api/place/details/json?` +
          `place_id=${hotel.place_id}&` +
          `fields=name,rating,formatted_address,price_level,website,formatted_phone_number&` +
          `key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}`
        );
        
        const details = await detailsResponse.json();
        
        return {
          ...hotel,
          details: details.result,
          withinBudget: details.result.price_level ? 
            details.result.price_level * 50 <= budget : true // Rough estimate
        };
      })
    );

    // Filter hotels within budget and sort by rating
    const filteredHotels = hotelsWithPricing
      .filter(hotel => hotel.withinBudget)
      .sort((a, b) => b.rating - a.rating);

    res.status(200).json(filteredHotels);
  } catch (error) {
    res.status(500).json({ message: 'Error searching for hotels' })
  }
} 