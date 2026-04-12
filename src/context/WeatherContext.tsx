import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { BuoyData, HistoryPoint, MapBuoy } from "../types";

interface WeatherContextType {
  data: BuoyData | null;
  history: HistoryPoint[];
  allBuoys: MapBuoy[];
  loading: boolean;
  refreshing: boolean;
  unit: "F" | "C";
  setUnit: (unit: "F" | "C") => void;
  selectedBuoy: string;
  setSelectedBuoy: (name: string) => void;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  error: string | null;
  lastFetchTime: Date;
  timeOfDay: string;
  isOnline: boolean;
  nextSync: string;
  fetchData: () => Promise<void>;
  toggleUnit: () => void;
}

const WeatherContext = createContext<WeatherContextType | undefined>(undefined);

export const WeatherProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [data, setData] = useState<BuoyData | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [allBuoys, setAllBuoys] = useState<MapBuoy[]>([]);
  const [loading, setLoading] = useState(true);
  const [unit, setUnit] = useState<"F" | "C">("F");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBuoy, setSelectedBuoy] = useState("Lake Sammamish");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("theme") === "dark" || 
             (!localStorage.getItem("theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
    }
    return false;
  });
  const [error, setError] = useState<string | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<Date>(new Date());
  const [timeOfDay, setTimeOfDay] = useState("day");
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [nextSync, setNextSync] = useState("");
  const [pendingRefresh, setPendingRefresh] = useState(false);

  const fetchData = useCallback(async () => {
    if (!navigator.onLine) {
      setPendingRefresh(true);
      return;
    }
    setRefreshing(true);
    setError(null);
    try {
      const [currentRes, historyRes, mapRes] = await Promise.all([
        fetch(`/api/buoy-data?buoy=${selectedBuoy}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/buoy-history?buoy=${selectedBuoy}&t=${Date.now()}`, { cache: 'no-store' }),
        fetch(`/api/all-buoys?t=${Date.now()}`, { cache: 'no-store' })
      ]);

      if (!currentRes.ok) {
        const errData = await currentRes.json().catch(() => ({}));
        throw new Error(errData.message || `Server error: ${currentRes.status}`);
      }
      
      const currentResult = await currentRes.json();
      const historyResult = await historyRes.json().catch(() => []);
      const mapResult = await mapRes.json().catch(() => []);

      setData(currentResult);
      setHistory(historyResult);
      setAllBuoys(mapResult);
      setLastFetchTime(new Date());
    } catch (error) {
      console.error("Error fetching data:", error);
      setError(error instanceof Error ? error.message : "An unknown error occurred");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedBuoy]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline && pendingRefresh) {
      setPendingRefresh(false);
      fetchData();
    }
  }, [isOnline, pendingRefresh, fetchData]);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 8) setTimeOfDay("dawn");
    else if (hour >= 8 && hour < 17) setTimeOfDay("day");
    else if (hour >= 17 && hour < 20) setTimeOfDay("dusk");
    else setTimeOfDay("night");
  }, []);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextAutoRefresh = new Date(lastFetchTime.getTime() + 60 * 60 * 1000);
      const diff = nextAutoRefresh.getTime() - now.getTime();
      
      if (diff <= 0) {
        fetchData();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setNextSync(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lastFetchTime, fetchData]);

  const toggleUnit = () => setUnit((prev) => (prev === "F" ? "C" : "F"));

  return (
    <WeatherContext.Provider value={{
      data, history, allBuoys, loading, refreshing, unit, setUnit,
      selectedBuoy, setSelectedBuoy, isDark, setIsDark, error,
      lastFetchTime, timeOfDay, isOnline, nextSync, fetchData, toggleUnit
    }}>
      {children}
    </WeatherContext.Provider>
  );
};

export const useWeather = () => {
  const context = useContext(WeatherContext);
  if (context === undefined) {
    throw new Error("useWeather must be used within a WeatherProvider");
  }
  return context;
};
