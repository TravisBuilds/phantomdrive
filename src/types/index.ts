export interface TeslaModel {
  id: string;
  name: string;
  range: number;  // EPA estimated range in miles
  chargingSpeed: number;  // Average charging speed in kW
}

export interface Location {
  lat: number;
  lng: number;
  address: string;
}

export interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export interface RouteStop {
  location: Location;
  chargingRequired?: boolean;
  estimatedChargingTime?: number;
}

export interface RouteData {
  stops: RouteStop[];
  totalDistance: number;
  totalDuration: number;
  totalChargingTime: number;
} 