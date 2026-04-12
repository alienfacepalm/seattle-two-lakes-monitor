export interface BuoyData {
  location: string;
  tempC: number;
  tempF: number;
  airTempC: number | null;
  airTempF: number | null;
  windSpeed: number | null;
  timestamp: string;
  status: string;
  condition: string;
  lastSync: string;
}

export interface MapBuoy {
  id: string;
  name: string;
  tempC: number | null;
  tempF: number | null;
  lat: number;
  lon: number;
  active: boolean;
}

export interface HistoryPoint {
  time: string;
  tempC: number;
  tempF: number;
  airTempC?: number;
  airTempF?: number;
  precipitation?: number;
}

export type Tab = "current" | "history" | "map";
