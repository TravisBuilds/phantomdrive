import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  try {
    const token = await getTeslaToken();
    const { routePath } = req.body;

    // Get superchargers near the route
    const response = await fetch('https://owner-api.teslamotors.com/api/1/superchargers', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      }
    });

    const data = await response.json();
    
    // Filter superchargers near the route path
    const nearbyChargers = filterChargersByRoute(data.superchargers, routePath);

    res.status(200).json(nearbyChargers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching supercharger data' })
  }
}

async function getTeslaToken() {
  const response = await fetch('/api/tesla/auth', {
    method: 'POST',
  });
  const data = await response.json();
  return data.access_token;
} 