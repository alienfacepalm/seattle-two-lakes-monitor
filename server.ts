import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Health check route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // API Route to fetch buoy data
  app.get("/api/buoy-data", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    console.log(`[API] Fetching buoy data for: ${req.query.buoy || "Sammamish"}`);
    try {
      const targetBuoy = (req.query.buoy as string) || "Sammamish";
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const text = await response.text();
      const buoys = text.split("^").filter(line => line.trim() !== "");
      const buoyLine = buoys.find(line => line.toLowerCase().includes(targetBuoy.toLowerCase()));
      if (!buoyLine) throw new Error(`${targetBuoy} buoy data not found`);
      const parts = buoyLine.split("|").map(p => p.trim());
      const nameIndex = parts.findIndex(p => p.toLowerCase().includes(targetBuoy.toLowerCase()));
      const tempC = parseFloat(parts[nameIndex + 5]);
      if (isNaN(tempC)) throw new Error(`Invalid temperature data`);
      const tempF = (tempC * 9/5) + 32;
      
      const airTempC = parseFloat(parts[nameIndex + 2]);
      const windSpeed = parseFloat(parts[nameIndex + 3]);
      // Some buoys have more data, let's try to find precipitation if it exists
      // Index 4 is often wind direction, index 10+ might have more
      const precipitation = parseFloat(parts[nameIndex + 10]); // Potential index for rain
      const humidity = parseFloat(parts[nameIndex + 11]); // Potential index for humidity

      // Parse both timestamps and pick the most recent one
      const ts1 = parts[nameIndex + 1];
      const ts2 = parts[nameIndex + 6];
      let bestTimestamp = ts1;
      try {
        const d1 = new Date(ts1).getTime();
        const d2 = new Date(ts2).getTime();
        if (!isNaN(d2) && (isNaN(d1) || d2 > d1)) {
          bestTimestamp = ts2;
        }
      } catch (e) {
        // Fallback to ts1
      }

      // Determine condition based on temp, wind, and potential rain
      let condition = "Moderate";
      if (!isNaN(precipitation) && precipitation > 0) {
        condition = precipitation > 0.1 ? "Rainy" : "Showers";
      } else if (tempC > 22) {
        condition = "Warm";
      } else if (tempC < 12) {
        condition = "Cold";
      } else if (windSpeed > 15) {
        condition = "Windy";
      } else if (tempC < 18 && windSpeed < 5) {
        condition = "Overcast";
      } else if (tempC < 18) {
        condition = "Cloudy";
      }

      const data = {
        location: `${parts[nameIndex]} Buoy`,
        tempC: parseFloat(tempC.toFixed(2)),
        tempF: Math.round(tempF),
        airTempC: isNaN(airTempC) ? null : parseFloat(airTempC.toFixed(2)),
        airTempF: isNaN(airTempC) ? null : Math.round((airTempC * 9/5) + 32),
        windSpeed: isNaN(windSpeed) ? null : parseFloat(windSpeed.toFixed(1)),
        precipitation: isNaN(precipitation) ? 0 : parseFloat(precipitation.toFixed(2)),
        humidity: isNaN(humidity) ? null : parseFloat(humidity.toFixed(1)),
        timestamp: bestTimestamp, 
        status: parts[nameIndex + 9] === "Y" ? "ACTIVE" : "INACTIVE",
        condition,
        lastSync: new Date().toISOString()
      };
      res.json(data);
    } catch (error) {
      console.error("Error fetching buoy data:", error);
      // Fallback data if external site is unreachable
      const fallback = {
        location: `${req.query.buoy || "Sammamish"} Buoy (Offline)`,
        tempC: 14.5,
        tempF: 58,
        airTempC: 12.0,
        airTempF: 54,
        windSpeed: 5.0,
        precipitation: 0.05,
        humidity: 78,
        timestamp: new Date().toISOString(),
        status: "OFFLINE",
        condition: "Overcast",
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
        const name = parts[nameIndex] || "Unknown";
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
      });

      res.json(buoyData);
    } catch (error) {
      console.error("Error fetching all buoys:", error);
      // Fallback list
      res.json([
        { id: "sammamish", name: "Sammamish", tempC: 14.5, tempF: 58, lat: 47.58167, lon: -122.09000, active: false },
        { id: "washington", name: "Washington", tempC: 13.9, tempF: 57, lat: 47.61222, lon: -122.25428, active: false }
      ]);
    }
  });

  // API Route to fetch history (simulated for now based on real current data)
  app.get("/api/buoy-history", async (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    console.log(`[API] Fetching history for: ${req.query.buoy || "Sammamish"}`);
    try {
      const targetBuoy = (req.query.buoy as string) || "Sammamish";
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx", {
        signal: AbortSignal.timeout(10000),
        headers: { "Cache-Control": "no-cache" }
      });
      const text = await response.text();
      const buoys = text.split("^").filter(line => line.trim() !== "");
      const buoyLine = buoys.find(line => line.toLowerCase().includes(targetBuoy.toLowerCase()));
      
      if (!buoyLine) throw new Error(`${targetBuoy} buoy not found`);
      
      const parts = buoyLine.split("|").map(p => p.trim());
      const nameIndex = parts.findIndex(p => p.toLowerCase().includes(targetBuoy.toLowerCase()));
      const currentTempC = parseFloat(parts[nameIndex + 5]);
      const currentAirTempC = parseFloat(parts[nameIndex + 2]);
      const currentWindSpeed = parseFloat(parts[nameIndex + 3]);

      // Generate 24 hours of data points
      const history = [];
      const now = new Date();
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        // Simulate a daily cycle: cooler at night, warmer in day
        const hour = time.getHours();
        const cycle = Math.sin((hour - 6) * Math.PI / 12); // Peak at 6pm, low at 6am
        
        const waterVariance = (Math.random() - 0.5) * 0.3;
        const waterTempC = currentTempC + (cycle * 1.2) + waterVariance;
        
        const airVariance = (Math.random() - 0.5) * 2.0;
        const airTempC = (isNaN(currentAirTempC) ? currentTempC - 2 : currentAirTempC) + (cycle * 4.0) + airVariance;

        const windVariance = (Math.random() - 0.5) * 5.0;
        const windSpeed = Math.max(0, (isNaN(currentWindSpeed) ? 5 : currentWindSpeed) + windVariance);
        
        // Simple heuristic for historical rain chance
        const isLikelyRainy = (isNaN(currentAirTempC) ? 12 : currentAirTempC) < 15 && Math.random() > 0.6;
        const rainChance = isLikelyRainy ? 0.4 : 0.1;
        const precipitation = Math.random() < rainChance ? Math.random() * 0.2 : 0;

        history.push({
          time: time.toISOString(),
          tempC: parseFloat(waterTempC.toFixed(2)),
          tempF: Math.round((waterTempC * 9/5) + 32),
          airTempC: parseFloat(airTempC.toFixed(2)),
          airTempF: Math.round((airTempC * 9/5) + 32),
          windSpeed: parseFloat(windSpeed.toFixed(1)),
          precipitation: parseFloat(precipitation.toFixed(2))
        });
      }

      res.json(history);
    } catch (error) {
      console.error("Error generating history:", error);
      // Fallback history
      const history = [];
      const now = new Date();
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        history.push({
          time: time.toISOString(),
          tempC: 14 + Math.sin(i),
          tempF: Math.round((14 + Math.sin(i)) * 9/5 + 32),
          airTempC: 12 + Math.sin(i) * 2,
          airTempF: Math.round((12 + Math.sin(i) * 2) * 9/5 + 32),
          windSpeed: 4 + Math.random() * 4
        });
      }
      res.json(history);
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
  });
}

startServer();
