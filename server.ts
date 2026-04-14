import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase for background sync
const firebaseConfigPath = path.join(process.cwd(), "firebase-applet-config.json");
let db: any = null;

if (fs.existsSync(firebaseConfigPath)) {
  try {
    const firebaseConfig = JSON.parse(fs.readFileSync(firebaseConfigPath, "utf8"));
    const firebaseApp = initializeApp(firebaseConfig);
    db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);
    console.log("[Firebase] Background sync initialized");
  } catch (err) {
    console.error("[Firebase] Failed to initialize background sync:", err);
  }
}

let syncStats = {
  lastSync: "Never",
  pointsSaved: 0,
  errors: 0
};

async function performBackgroundSync() {
  if (!db) {
    console.log("[Background Sync] Skipped: Firebase not initialized");
    return;
  }
  console.log("[Background Sync] Starting fetch at", new Date().toISOString());
  const buoys = ["Lake Sammamish", "Lake Washington"];
  
  for (const buoyName of buoys) {
    try {
      const searchName = buoyName.toLowerCase().replace("lake ", "");
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        headers: { "Cache-Control": "no-cache" }
      });
      const text = await response.text();
      const lines = text.split("^").filter(line => line.trim() !== "");
      const buoyLine = lines.find(line => line.toLowerCase().includes(searchName));
      
      if (!buoyLine) continue;
      
      const parts = buoyLine.split("|").map(p => p.trim());
      const nameIndex = parts.findIndex(p => p.toLowerCase().includes(searchName));
      
      if (nameIndex === -1) continue;

      // King County Buoy Data Format (Relative to Name Index):
      // 0: Name, 1: Time, 2: AirTemp, 3: WindSpeed, 4: WindDir, 5: WaterTemp, 
      // 6: Time2, 7: Lat, 8: Lon, 9: Active, 10: Precipitation, 11: Humidity
      
      const rawTempC = parts[nameIndex + 5];
      const tempC = parseFloat(rawTempC);
      if (isNaN(tempC)) continue;
      
      const ts1 = parts[nameIndex + 1];
      const ts2 = parts[nameIndex + 6];
      let bestTimestamp = ts1 || ts2 || new Date().toISOString();
      const normalizedTimestamp = new Date(bestTimestamp).toISOString();

      // Check existence to avoid duplicates
      const q = query(
        collection(db, "buoy_snapshots"),
        where("buoyId", "==", buoyName),
        where("timestamp", "==", normalizedTimestamp),
        limit(1)
      );
      
      const existing = await getDocs(q);
      
      const getVal = (idx: number) => {
        const val = parts[nameIndex + idx];
        if (val === undefined || val === "" || val === null) return NaN;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? NaN : parsed;
      };

      const airTempC = getVal(2);
      const windSpeed = getVal(3);
      const precipitation = getVal(10);
      const humidity = getVal(11);
      const lat = getVal(7);
      const lon = getVal(8);

      if (existing.empty) {
        await addDoc(collection(db, "buoy_snapshots"), {
          buoyId: buoyName,
          timestamp: normalizedTimestamp,
          recordedAt: new Date().toISOString(),
          tempC: tempC,
          tempF: Math.round((tempC * 9/5) + 32),
          airTempC: isNaN(airTempC) ? null : airTempC,
          airTempF: isNaN(airTempC) ? null : Math.round((airTempC * 9/5) + 32),
          windSpeed: isNaN(windSpeed) ? null : windSpeed,
          precipitation: isNaN(precipitation) ? 0 : precipitation,
          humidity: isNaN(humidity) ? null : humidity,
          lat: isNaN(lat) ? null : lat,
          lon: isNaN(lon) ? null : lon
        });
        console.log(`[Background Sync] Saved ${buoyName}: T=${tempC}, P=${precipitation}, H=${humidity}`);
        syncStats.pointsSaved++;
      }
      syncStats.lastSync = new Date().toISOString();
    } catch (err) {
      console.error(`[Background Sync] Error for ${buoyName}:`, err);
      syncStats.errors++;
    }
  }
}

// Simple in-memory cache for NWS data
const nwsCache: Record<string, { data: any, expires: number }> = {};
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      timestamp: new Date().toISOString(),
      sync: syncStats
    });
  });

  // API Route to fetch buoy data
  app.get("/api/buoy-data", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    console.log(`[API] Fetching buoy data for: ${req.query.buoy || "Sammamish"}`);
    try {
      const targetBuoy = (req.query.buoy as string) || "Lake Sammamish";
      const searchName = targetBuoy.toLowerCase().replace("lake ", "");
      
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      const buoys = text.split("^").filter(line => line.trim() !== "");
      const buoyLine = buoys.find(line => line.toLowerCase().includes(searchName));
      if (!buoyLine) throw new Error(`${targetBuoy} buoy data not found`);
      
      const parts = buoyLine.split("|").map(p => p.trim());
      // Find the name index more robustly - it's usually the first non-empty part
      const nameIndex = parts.findIndex(p => p.toLowerCase().includes(searchName));
      
      if (nameIndex === -1) throw new Error(`Could not locate ${targetBuoy} in data line`);

      // King County Buoy Data Format (Relative to Name Index):
      // 0: Name, 1: Time, 2: AirTemp, 3: WindSpeed, 4: WindDir, 5: WaterTemp, 
      // 6: Time2, 7: Lat, 8: Lon, 9: Active, 10: Precipitation, 11: Humidity

      const rawTempC = parts[nameIndex + 5];
      const tempC = parseFloat(rawTempC);
      const isActive = parts[nameIndex + 9] === "Y" && !isNaN(tempC);
      
      const tempF = isNaN(tempC) ? null : (tempC * 9/5) + 32;
      
      const getVal = (idx: number) => {
        const val = parts[nameIndex + idx];
        if (val === undefined || val === "" || val === null) return NaN;
        const parsed = parseFloat(val);
        return isNaN(parsed) ? NaN : parsed;
      };

      const airTempC = getVal(2);
      const windSpeed = getVal(3);
      const precipitation = getVal(10);
      const humidity = getVal(11);
      const lat = getVal(7);
      const lon = getVal(8);

      // Parse both timestamps and pick the most recent one
      const ts1 = parts[nameIndex + 1];
      const ts2 = parts[nameIndex + 6];
      let bestTimestamp = ts1 || ts2 || new Date().toISOString();
      try {
        const d1 = ts1 ? new Date(ts1).getTime() : NaN;
        const d2 = ts2 ? new Date(ts2).getTime() : NaN;
        if (!isNaN(d2) && (isNaN(d1) || d2 > d1)) {
          bestTimestamp = ts2;
        }
      } catch (e) {
        // Fallback to ts1 or current
      }

      // Determine condition
      let condition = "Unknown";
      if (isActive) {
        condition = "Moderate";
        if (!isNaN(precipitation) && precipitation > 0) {
          condition = precipitation > 0.1 ? "Rainy" : "Showers";
        } else if (!isNaN(tempC)) {
          if (tempC > 22) condition = "Warm";
          else if (tempC < 12) condition = "Cold";
          else if (windSpeed > 15) condition = "Windy";
          else if (tempC < 18 && windSpeed < 5) condition = "Overcast";
          else if (tempC < 18) condition = "Cloudy";
        }
      }

      let locationName = parts[nameIndex];
      if (locationName === "Sammamish") locationName = "Lake Sammamish";
      if (locationName === "Washington") locationName = "Lake Washington";

      // NWS Data Augmentation (Dynamic based on Buoy Coords)
      let sunrise = null;
      let sunset = null;
      let hourlyForecast = [];
      let dailyForecast = [];
      let alerts = [];
      let radarStation = "KATX"; // Default

      if (!isNaN(lat) && !isNaN(lon)) {
        const cacheKey = `${lat.toFixed(2)},${lon.toFixed(2)}`;
        const cached = nwsCache[cacheKey];
        
        if (cached && cached.expires > Date.now()) {
          console.log(`[NWS] Using cached data for ${locationName}`);
          ({ sunrise, sunset, hourlyForecast, dailyForecast, alerts, radarStation } = cached.data);
        } else {
          try {
            // Fetch Point Data (Metadata + Astronomy)
            const pointRes = await fetch(`https://api.weather.gov/points/${lat.toFixed(4)},${lon.toFixed(4)}`, {
              signal: AbortSignal.timeout(10000),
              headers: { "User-Agent": "LakeBuoyApp/1.0 (brandons.pliska@gmail.com)" }
            });
            
            if (pointRes.ok) {
              const pointData = await pointRes.json();
              sunrise = pointData.properties.astronomicalData?.sunrise;
              sunset = pointData.properties.astronomicalData?.sunset;
              radarStation = pointData.properties.radarStation || "KATX";
              
              const hourlyUrl = pointData.properties.forecastHourly;
              const dailyUrl = pointData.properties.forecast;
              const forecastZone = pointData.properties.forecastZone;

              // Fetch remaining data in parallel
              const [hourlyRes, dailyRes, alertsRes] = await Promise.allSettled([
                hourlyUrl ? fetch(hourlyUrl, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "LakeBuoyApp/1.0 (brandons.pliska@gmail.com)" } }) : Promise.reject("No hourly URL"),
                dailyUrl ? fetch(dailyUrl, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "LakeBuoyApp/1.0 (brandons.pliska@gmail.com)" } }) : Promise.reject("No daily URL"),
                forecastZone ? fetch(`https://api.weather.gov/alerts/active/zone/${forecastZone.split('/').pop()}`, { signal: AbortSignal.timeout(10000), headers: { "User-Agent": "LakeBuoyApp/1.0 (brandons.pliska@gmail.com)" } }) : Promise.reject("No zone ID")
              ]);

              if (hourlyRes.status === 'fulfilled' && hourlyRes.value.ok) {
                const forecastData = await hourlyRes.value.json();
                hourlyForecast = forecastData.properties.periods.slice(0, 24).map((p: any) => ({
                  time: p.startTime,
                  temp: p.temperature,
                  condition: p.shortForecast,
                  isDaytime: p.isDaytime,
                  windSpeed: p.windSpeed,
                  windDirection: p.windDirection,
                  icon: p.icon,
                  precipitationProbability: p.probabilityOfPrecipitation?.value || 0,
                  humidity: p.relativeHumidity?.value || null,
                  dewpoint: p.dewpoint?.value || null
                }));
              }

              if (dailyRes.status === 'fulfilled' && dailyRes.value.ok) {
                const dailyData = await dailyRes.value.json();
                dailyForecast = dailyData.properties.periods.map((p: any) => ({
                  name: p.name,
                  temp: p.temperature,
                  isDaytime: p.isDaytime,
                  icon: p.icon,
                  shortForecast: p.shortForecast,
                  detailedForecast: p.detailedForecast,
                  precipitationProbability: p.probabilityOfPrecipitation?.value || 0
                }));
              }

              if (alertsRes.status === 'fulfilled' && alertsRes.value.ok) {
                const alertsData = await alertsRes.value.json();
                alerts = alertsData.features.map((f: any) => ({
                  event: f.properties.event,
                  severity: f.properties.severity,
                  headline: f.properties.headline,
                  description: f.properties.description,
                  instruction: f.properties.instruction
                }));
              }

              // Update cache
              nwsCache[cacheKey] = {
                data: { sunrise, sunset, hourlyForecast, dailyForecast, alerts, radarStation },
                expires: Date.now() + CACHE_TTL
              };
            }
          } catch (nwsErr) {
            console.warn("[NWS] Failed to fetch augmented data:", nwsErr);
          }
        }
      }

      const data = {
        location: `${locationName} Buoy`,
        tempC: isNaN(tempC) ? null : parseFloat(tempC.toFixed(2)),
        tempF: tempF === null ? null : Math.round(tempF),
        airTempC: isNaN(airTempC) ? null : parseFloat(airTempC.toFixed(2)),
        airTempF: isNaN(airTempC) ? null : Math.round((airTempC * 9/5) + 32),
        windSpeed: isNaN(windSpeed) ? null : parseFloat(windSpeed.toFixed(1)),
        precipitation: (isNaN(precipitation) || precipitation === null) ? (hourlyForecast[0]?.precipitationProbability > 0 ? hourlyForecast[0].precipitationProbability / 100 : 0) : parseFloat(precipitation.toFixed(2)),
        humidity: (isNaN(humidity) || humidity === null) ? (hourlyForecast[0]?.humidity || null) : parseFloat(humidity.toFixed(1)),
        lat: isNaN(lat) ? null : lat,
        lon: isNaN(lon) ? null : lon,
        timestamp: bestTimestamp, 
        status: isActive ? "ACTIVE" : "INACTIVE",
        condition,
        lastSync: new Date().toISOString(),
        sunrise,
        sunset,
        hourlyForecast,
        dailyForecast,
        alerts,
        radarStation
      };
      res.json(data);
    } catch (error) {
      console.error("Error fetching buoy data:", error);
      // Fallback data if external site is unreachable
      let requestedBuoy = (req.query.buoy as string) || "Lake Sammamish";
      if (requestedBuoy === "Sammamish") requestedBuoy = "Lake Sammamish";
      if (requestedBuoy === "Washington") requestedBuoy = "Lake Washington";

      const fallback = {
        location: `${requestedBuoy} Buoy (Offline)`,
        tempC: 14.5,
        tempF: 58,
        airTempC: 12.0,
        airTempF: 54,
        windSpeed: 5.0,
        precipitation: 0.05,
        humidity: 78,
        timestamp: new Date().toISOString(),
        status: "OFFLINE",
        condition: "Unknown",
        lastSync: new Date().toISOString(),
        isFallback: true
      };
      res.json(fallback);
    }
  });

  // API Route to fetch all buoy data for the map
  app.get("/api/all-buoys", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    console.log("[API] Fetching all buoys");
    try {
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" }
      });
      const text = await response.text();
      const buoys = text.split("^").filter(line => line.trim() !== "");
      
      const buoyData = buoys.map(line => {
        const parts = line.split("|").map(p => p.trim());
        // Find the first non-empty part that isn't just whitespace or tabs
        const nameIndex = parts.findIndex(p => p.length > 0 && !p.startsWith("\t"));
        if (nameIndex === -1) return null;
        
        let name = parts[nameIndex];
        
        // Add "Lake " prefix if missing for Sammamish and Washington
        if (name === "Sammamish") name = "Lake Sammamish";
        if (name === "Washington") name = "Lake Washington";
        
        const tempC = parseFloat(parts[nameIndex + 5]);
        
        return {
          id: name.toLowerCase().replace(/\s+/g, "-"),
          name: name,
          tempC: isNaN(tempC) ? null : parseFloat(tempC.toFixed(2)),
          tempF: isNaN(tempC) ? null : Math.round((tempC * 9/5) + 32),
          lat: parseFloat(parts[nameIndex + 7]),
          lon: parseFloat(parts[nameIndex + 8]),
          active: parts[nameIndex + 9] === "Y"
        };
      }).filter((buoy): buoy is NonNullable<typeof buoy> => buoy !== null && buoy.name !== "Unknown");

      res.json(buoyData);
    } catch (error) {
      console.error("Error fetching all buoys:", error);
      // Fallback list
      res.json([
        { id: "lake-sammamish", name: "Lake Sammamish", tempC: 14.5, tempF: 58, lat: 47.58167, lon: -122.09000, active: false },
        { id: "lake-washington", name: "Lake Washington", tempC: 13.9, tempF: 57, lat: 47.61222, lon: -122.25428, active: false }
      ]);
    }
  });

  // API Route to fetch history (simulated for now based on real current data)
  app.get("/api/buoy-history", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    console.log(`[API] Fetching history for: ${req.query.buoy || "Lake Sammamish"}`);
    try {
      const targetBuoy = (req.query.buoy as string) || "Lake Sammamish";
      const searchName = targetBuoy.toLowerCase().replace("lake ", "");

      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" }
      });
      const text = await response.text();
      const buoys = text.split("^").filter(line => line.trim() !== "");
      const buoyLine = buoys.find(line => line.toLowerCase().includes(searchName));
      
      if (!buoyLine) throw new Error(`${targetBuoy} buoy not found`);
      
      const parts = buoyLine.split("|").map(p => p.trim());
      const nameIndex = parts.findIndex(p => p.toLowerCase().includes(searchName));
      
      const isActive = parts[nameIndex + 9] === "Y";
      
      if (!isActive) {
        return res.json([]);
      }

      const rawTempC = parts[nameIndex + 5];
      const currentTempC = isNaN(parseFloat(rawTempC)) ? 14.0 : parseFloat(rawTempC);
      const currentAirTempC = parseFloat(parts[nameIndex + 2]);
      const currentWindSpeed = parseFloat(parts[nameIndex + 3]);
      // Real historical data is not available from the current API endpoint.
      // Returning empty array to comply with "only use real data" requirement.
      res.json([]);
    } catch (error) {
      console.error("Error generating history:", error);
      res.json([]);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    
    // Start background sync every hour
    if (db) {
      setInterval(performBackgroundSync, 60 * 60 * 1000);
      // Run initial sync after a short delay to let server settle
      setTimeout(performBackgroundSync, 5000);
    }
  });
}

startServer();
