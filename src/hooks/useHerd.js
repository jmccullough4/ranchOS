import { useEffect, useState } from "react";
import { ranchBounds } from "../constants/ranch.js";
import { clamp } from "../utils/math.js";
import { useTicker } from "./useTicker.js";

function createCow(index) {
  return {
    id: `C-${String(index).padStart(3, "0")}`,
    lon: ranchBounds.minLon + Math.random() * (ranchBounds.maxLon - ranchBounds.minLon),
    lat: ranchBounds.minLat + Math.random() * (ranchBounds.maxLat - ranchBounds.minLat),
    vx: (Math.random() - 0.5) * 0.00015,
    vy: (Math.random() - 0.5) * 0.00015,
  };
}

export function useHerd(count = 160, tickMs = 1000) {
  const [cows, setCows] = useState(() => Array.from({ length: count }, (_, index) => createCow(index)));
  const [trails, setTrails] = useState(() => new Map());
  const tick = useTicker(tickMs);

  useEffect(() => {
    setCows((list) =>
      list.map((cow) => {
        let vx = clamp(cow.vx + (Math.random() - 0.5) * 0.00003, -0.00025, 0.00025);
        let vy = clamp(cow.vy + (Math.random() - 0.5) * 0.00003, -0.00025, 0.00025);
        let lon = cow.lon + vx;
        let lat = cow.lat + vy;

        if (lon < ranchBounds.minLon || lon > ranchBounds.maxLon) {
          vx = -vx;
          lon = clamp(lon, ranchBounds.minLon, ranchBounds.maxLon);
        }
        if (lat < ranchBounds.minLat || lat > ranchBounds.maxLat) {
          vy = -vy;
          lat = clamp(lat, ranchBounds.minLat, ranchBounds.maxLat);
        }
        if (Math.random() < 0.02) {
          vx *= 0.5;
          vy *= -0.5;
        }

        return { ...cow, lon, lat, vx, vy };
      }),
    );
  }, [tick]);

  useEffect(() => {
    setTrails((previous) => {
      const map = new Map(previous);
      for (const cow of cows) {
        const points = map.get(cow.id) ?? [];
        points.push({ lon: cow.lon, lat: cow.lat });
        if (points.length > 20) points.shift();
        map.set(cow.id, points);
      }
      return map;
    });
  }, [cows]);

  return { cows, trails };
}
