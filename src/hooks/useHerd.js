import { useEffect, useState } from "react";
import { ranchBounds } from "../constants/ranch.js";
import { clamp } from "../utils/math.js";
import { useTicker } from "./useTicker.js";

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function createCow(index) {
  const baseWeight = 1050 + Math.random() * 250;
  const breeds = ["Brangus", "Angus", "Red Angus", "Hereford", "Charolais"];
  const statuses = ["Bred", "Open", "Heavy bred", "Pair"];
  const healthFlags = ["BQA compliant", "Watch locomotion", "Excellent gain", "Vaccinated 30d", "Monitor hoof"];
  const getHealthNote = () => healthFlags[Math.floor(Math.random() * healthFlags.length)];
  const age = Math.floor(Math.random() * 4) + 3;
  const pregnancy = statuses[Math.floor(Math.random() * statuses.length)];
  return {
    id: `C-${String(index).padStart(3, "0")}`,
    tag: `840-3S-${String(3100 + index).padStart(4, "0")}`,
    weight: Math.round(baseWeight),
    bodyCondition: randomChoice(["5.0", "5.5", "6.0", "6.5"]),
    lastCheck: `${Math.floor(Math.random() * 4) + 1} days ago`,
    lastTreatment: randomChoice(["Vita Charge", "Dewormer", "Respiratory Booster", "Implant"]),
    notes: randomChoice(["Bred AI", "Excellent gain", "Monitor hoof", "Ready for market"]),
    breed: randomChoice(breeds),
    ageYears: age,
    pregnancy,
    avgDailyGain: (2.1 + Math.random() * 0.6).toFixed(1),
    temperature: (100.5 + Math.random() * 1.4).toFixed(1),
    healthNote: getHealthNote(),
    lon: ranchBounds.minLon + Math.random() * (ranchBounds.maxLon - ranchBounds.minLon),
    lat: ranchBounds.minLat + Math.random() * (ranchBounds.maxLat - ranchBounds.minLat),
    vx: (Math.random() - 0.5) * 0.00015,
    vy: (Math.random() - 0.5) * 0.00015,
  };
}

export function useHerd(count = 50, tickMs = 1000) {
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

        const weightShift = (Math.random() - 0.5) * 0.8;
        const weight = Math.max(950, Math.round(cow.weight + weightShift));
        return { ...cow, lon, lat, vx, vy, weight };
      }),
    );
  }, [tick]);

  useEffect(() => {
    setTrails((previous) => {
      const map = new Map(previous);
      for (const cow of cows) {
        const points = map.get(cow.id) ?? [];
        points.push({ lon: cow.lon, lat: cow.lat });
        if (points.length > 60) points.shift();
        map.set(cow.id, points);
      }
      return map;
    });
  }, [cows]);

  return { cows, trails };
}
