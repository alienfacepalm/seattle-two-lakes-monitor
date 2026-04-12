import { 
  ThermometerSun, 
  Sun, 
  ThermometerSnowflake, 
  Cloud, 
  Wind, 
  CloudRain, 
  CloudDrizzle, 
  Waves,
  Cloudy as CloudyIcon
} from "lucide-react";

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
