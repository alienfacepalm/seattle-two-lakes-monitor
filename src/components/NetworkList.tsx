import React from "react";
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useWeather } from "../context/WeatherContext";

export const NetworkList: React.FC = () => {
  const { allBuoys, selectedBuoy, setSelectedBuoy, unit } = useWeather();
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="space-y-6"
    >
      <div className="bg-surface-container-low rounded-[2rem] p-8 shadow-sm border border-black/5 dark:border-white/5">
        <h2 className="text-2xl font-black text-on-surface mb-2 font-headline uppercase tracking-tight">Lake Network</h2>
        <p className="text-sm text-on-surface-variant opacity-70 mb-8">Real-time data from all monitored sensors in the Seattle area.</p>
        
        <div className="space-y-3">
          {allBuoys.map((buoy) => (
            <motion.div 
              key={buoy.id}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setSelectedBuoy(buoy.name);
                navigate("/");
              }}
              className={`relative rounded-2xl p-4 flex items-center justify-between cursor-pointer transition-all overflow-hidden ${selectedBuoy === buoy.name ? "bg-primary/10 ring-1 ring-primary/20" : "bg-surface-container-highest hover:bg-black/10 dark:hover:bg-white/10"}`}
            >
              <div className="relative z-10 flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-colors ${buoy.active ? "bg-[#ccff00]/10 text-[#718800] dark:text-[#ccff00] border-[#718800]/30 dark:border-[#ccff00]/20" : "bg-on-surface-variant/10 text-on-surface-variant border-transparent"}`}>
                  <MapPin className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-on-surface">{buoy.name}</h3>
                  <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {buoy.lat?.toFixed(3) || "0.000"}, {buoy.lon?.toFixed(3) || "0.000"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-on-surface">
                  {buoy.tempC ? (unit === "F" ? buoy.tempF : buoy.tempC) : "--"}°
                </p>
                <span className={`text-[8px] font-black uppercase tracking-widest ${buoy.active ? "text-[#718800] dark:text-[#ccff00]" : "text-on-surface-variant"}`}>
                  {buoy.active ? "Active" : "Offline"}
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};
