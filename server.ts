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

      const data = {
        location: `${parts[nameIndex]} Buoy`,
        tempC: parseFloat(tempC.toFixed(2)),
        tempF: Math.round(tempF),
        airTempC: isNaN(airTempC) ? null : parseFloat(airTempC.toFixed(2)),
        airTempF: isNaN(airTempC) ? null : Math.round((airTempC * 9/5) + 32),
        windSpeed: isNaN(windSpeed) ? null : parseFloat(windSpeed.toFixed(1)),
        timestamp: bestTimestamp, 
        status: parts[nameIndex + 9] === "Y" ? "ACTIVE" : "INACTIVE",
        condition: tempC > 20 ? "Warm" : tempC > 10 ? "Moderate" : "Cold",
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
        timestamp: new Date().toISOString(),
        status: "OFFLINE",
        condition: "Moderate",
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

      // Generate 24 hours of data points
      const history = [];
      const now = new Date();
      for (let i = 24; i >= 0; i--) {
        const time = new Date(now.getTime() - i * 60 * 60 * 1000);
        // Simulate a daily cycle: cooler at night, warmer in day
        const hour = time.getHours();
        const cycle = Math.sin((hour - 6) * Math.PI / 12); // Peak at 6pm, low at 6am
        const variance = (Math.random() - 0.5) * 0.5;
        const tempC = currentTempC + (cycle * 1.5) + variance;
        
        history.push({
          time: time.toISOString(),
          tempC: parseFloat(tempC.toFixed(2)),
          tempF: Math.round((tempC * 9/5) + 32)
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
          tempF: Math.round((14 + Math.sin(i)) * 9/5 + 32)
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
