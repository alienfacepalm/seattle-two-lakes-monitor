import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import * as cheerio from "cheerio";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.get("/api/buoy-data", async (req, res) => {
    try {
      const targetBuoy = (req.query.buoy as string) || "Sammamish";
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx");
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

      const data = {
        location: `${parts[nameIndex]} Buoy`,
        tempC: parseFloat(tempC.toFixed(2)),
        tempF: Math.round(tempF),
        airTempC: isNaN(airTempC) ? null : parseFloat(airTempC.toFixed(2)),
        airTempF: isNaN(airTempC) ? null : Math.round((airTempC * 9/5) + 32),
        windSpeed: isNaN(windSpeed) ? null : parseFloat(windSpeed.toFixed(1)),
        timestamp: parts[nameIndex + 6] || parts[nameIndex + 1], 
        status: parts[nameIndex + 9] === "Y" ? "ACTIVE" : "INACTIVE",
        condition: tempC > 20 ? "Warm" : tempC > 10 ? "Moderate" : "Cold",
        lastSync: new Date().toISOString()
      };
      res.json(data);
    } catch (error) {
      console.error("Error fetching buoy data:", error);
      res.status(500).json({ error: "Failed to fetch real data", message: error instanceof Error ? error.message : String(error) });
    }
  });

  // API Route to fetch all buoy data for the map
  app.get("/api/all-buoys", async (req, res) => {
    try {
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx");
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
      res.status(500).json({ error: "Failed to fetch buoy map data" });
    }
  });

  // API Route to fetch history (simulated for now based on real current data)
  app.get("/api/buoy-history", async (req, res) => {
    try {
      const targetBuoy = (req.query.buoy as string) || "Sammamish";
      const response = await fetch("https://green2.kingcounty.gov/lake-buoy/GenerateMapData.aspx");
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
      res.status(500).json({ error: "Failed to fetch history" });
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
