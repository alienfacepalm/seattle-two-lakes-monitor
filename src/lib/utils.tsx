import { 
  Waves, 
  Sun, 
  Cloud, 
  CloudRain, 
  Wind, 
  ThermometerSnowflake, 
  ThermometerSun, 
  CloudDrizzle, 
  Cloudy as CloudyIcon 
} from "lucide-react";
import React from "react";

export const getConditionIcon = (condition: string) => {
  if (condition === "Warm") return <ThermometerSun className="w-12 h-12 text-yellow-400" />;
  if (condition === "Moderate") return <Sun className="w-12 h-12 text-orange-400" />;
  if (condition === "Cold") return <ThermometerSnowflake className="w-12 h-12 text-blue-400" />;
  if (condition === "Cloudy") return <Cloud className="w-12 h-12 text-gray-400" />;
  if (condition === "Overcast") return <CloudyIcon className="w-12 h-12 text-slate-500" opacity={0.8} />;
  if (condition === "Windy") return <Wind className="w-12 h-12 text-blue-300" />;
  if (condition === "Rainy") return <CloudRain className="w-12 h-12 text-blue-500" />;
  if (condition === "Showers") return <CloudDrizzle className="w-12 h-12 text-blue-400 opacity-80" />;
  return <Waves className="w-12 h-12 text-on-surface-variant opacity-40" />;
};

export const getBuoyBackground = () => {
  return "https://images.unsplash.com/photo-1439066615861-d1af74d74000?auto=format&fit=crop&w=1200&q=80";
};

export const TEMP_SCALE = [
  { max: 45, label: "< 45°", color: "indigo", classes: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-600 dark:bg-indigo-400" },
  { max: 55, label: "45-55°", color: "blue", classes: "text-blue-600 dark:text-blue-400", bg: "bg-blue-600 dark:bg-blue-400" },
  { max: 65, label: "55-65°", color: "cyan", classes: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-600 dark:bg-cyan-400" },
  { max: 75, label: "65-75°", color: "orange", classes: "text-orange-500 dark:text-orange-400", bg: "bg-orange-500 dark:bg-orange-400" },
  { max: Infinity, label: "> 75°", color: "deep-orange", classes: "text-orange-600 dark:text-orange-400", bg: "bg-orange-600 dark:bg-orange-400" },
];

export const getTemperatureColor = (tempF: number) => {
  if (typeof tempF !== 'number' || isNaN(tempF)) return "text-on-surface";
  const step = TEMP_SCALE.find(s => tempF < s.max);
  return step ? step.classes : "text-on-surface";
};
