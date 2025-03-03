# PhantomDrive Web App

## Overview
This web app helps Tesla drivers plan road trips by finding the most optimal routes, charging stations, and hotels. It fully automates the route and charging stop planning using the Tesla API but also allows for course correction if the user deviates from the planned route. Users can input multiple stops and make adjustments if new destinations or scenic locations pop up during the trip.

## Key Features

### 1. Automated Route & Charging Stops
- **Route Planning**: The app uses the Tesla API to find the most efficient route for the trip, factoring in charging station locations and distances between stops.
- **Charging Stops**: The app automatically suggests the best charging stations along the route, ensuring the driver has enough charge to reach the next destination.

### 2. Course Correction
- **Real-Time Monitoring**: The app continuously checks the user's GPS location. If the user deviates from the planned route, it recalculates the best route from the new position.
- **Notifications**: The app sends alerts or notifications when a course correction is needed to keep the trip on track.

### 3. Tesla Model Selection
- **Model Input**: Users can select their Tesla model at the beginning of the app.
- **Route Optimization**: The selected Tesla model is integrated with the Tesla API to dynamically adjust the route based on the vehicle's specific range, charging capabilities, and other specifications.

### 4. Hotel Booking Integration
- **Hotel Budget Input**: Users can input their hotel budget for each night of the trip.
- **Hotel Search**: The app helps find suitable hotels along the route using the Google Hotels API, offering direct links to the cheapest booking options.
- **Fixed Accommodation**: Once the hotel is selected, it will not suggest alternative hotels if the route changes, ensuring the user sticks to the planned accommodation.

### 5. Multiple Stops & Scenic Destinations
- **Input Multiple Stops**: Users can plan multiple stops along the way, including adding new destinations during the trip if they find a scenic location or new point of interest.
- **No Meal or Scenic Recommendations**: The app focuses purely on route efficiency, charging, and accommodation, without suggesting meal stops or scenic routes.

### 6. Route Efficiency
- **Prioritize Fastest Route**: The app prioritizes the most efficient (fastest) route, optimizing travel time while factoring in charging stops, user input destinations, and hotel bookings.

### 7. User Experience
- **Web App**: The app will be built using Next.js for server-side rendering, API routes, and smooth performance.
- **Tesla Screen Compatibility**: The app will be optimized for use in the Tesla browser (as a PWA) with potential for future native app support if Tesla opens up app store functionality.
- **No Extra Features**: The app will focus solely on route planning, charging, and hotel bookings, with no extra features like meal suggestions or scenic routes.

## Tech Stack
- **Frontend**: Next.js (React-based)
- **Backend**: Supabase (for storing user queries and hotel details)
- **APIs**:
  - Tesla API (for route and charging station data, model specifications)
  - Google Hotels API (for hotel search and booking links)
  - Google Places API (for additional location-based data)

## Future Considerations
- **Offline Functionality**: Potential integration of service workers for offline use, especially for route data and hotel details.
- **Push Notifications**: Support for push notifications to alert users of important route changes or charging stop updates. 