import React from "react";
import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, History as HistoryIcon, MapPin } from "lucide-react";
import { useWeather } from "../context/WeatherContext";
import { Header } from "./Header";
import { InstallPrompt } from "./InstallPrompt";
import { OfflineAlert } from "./OfflineAlert";

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { timeOfDay } = useWeather();
  const location = useLocation();
  
  const activeTab = location.pathname === "/history" ? "history" : 
                    location.pathname === "/network" ? "map" : "current";

  return (
    <div className="min-h-screen pb-32 transition-colors duration-300 bg-surface">
      {/* Lake Background */}
      <div className={`lake-bg lake-bg-${timeOfDay}`} />
      <div className="lake-waves" />

      <Header />

      <main className="pt-20 px-4 max-w-4xl mx-auto">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-4 pt-3 pb-8 bg-surface/80 backdrop-blur-2xl z-50 border-t border-black/5 dark:border-white/5">
        <Link 
          to="/"
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "current" ? "text-primary" : "text-on-surface/40"}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Dashboard</span>
        </Link>
        <Link 
          to="/history"
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "history" ? "text-primary" : "text-on-surface/40"}`}
        >
          <HistoryIcon className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">History</span>
        </Link>
        <Link 
          to="/network"
          className={`flex flex-col items-center justify-center transition-all ${activeTab === "map" ? "text-primary" : "text-on-surface/40"}`}
        >
          <MapPin className="w-6 h-6" />
          <span className="text-[10px] font-bold mt-1">Network</span>
        </Link>
      </nav>

      <InstallPrompt />
      <OfflineAlert />
    </div>
  );
};
