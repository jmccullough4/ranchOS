import { useEffect, useState } from "react";
import { ranchBounds, ranchCenter } from "../constants/ranch.js";
import { clamp } from "../utils/math.js";
import { distanceInMeters, distanceToFenceMeters } from "../utils/geo.js";
import { useTicker } from "./useTicker.js";

function randomChoice(list) {
  return list[Math.floor(Math.random() * list.length)];
}

const stragglerTargetCount = 6;
const herdFocus = {
  lon: ranchCenter.lon - 0.0014,
  lat: ranchCenter.lat + 0.001,
};
const stragglerFocus = {
  lon: ranchBounds.maxLon - 0.0012,
  lat: ranchBounds.minLat + 0.0012,
};

function clampCoordinate(value, min, max) {
  return clamp(value, min, max);
}

function createPosition(isStraggler) {
  const center = isStraggler ? stragglerFocus : herdFocus;
  const lonSpread = isStraggler ? 0.0007 : 0.0016;
  const latSpread = isStraggler ? 0.0006 : 0.0012;
  const lon = clampCoordinate(
    center.lon + (Math.random() - 0.5) * lonSpread,
    ranchBounds.minLon + 0.0004,
    ranchBounds.maxLon - 0.0004,
  );
  const lat = clampCoordinate(
    center.lat + (Math.random() - 0.5) * latSpread,
    ranchBounds.minLat + 0.0004,
    ranchBounds.maxLat - 0.0004,
  );
  return { lon, lat };
}

const vaccines = [
  { name: "Bovishield Gold 5", type: "Respiratory" },
  { name: "Vision 7", type: "Clostridial" },
  { name: "Vira Shield 6", type: "Reproductive" },
  { name: "One Shot Ultra", type: "Mannheimia" },
  { name: "Ultrabac 7", type: "Blackleg" },
];

const dewormers = [
  { name: "Ivomec", type: "Pour-on" },
  { name: "Cydectin", type: "Injectable" },
  { name: "Dectomax", type: "Injectable" },
  { name: "Synanthic", type: "Oral" },
];

function buildImmunizationRecord(index) {
  const now = new Date();
  const monthsAgo = (multiplier) => {
    const copy = new Date(now);
    copy.setMonth(copy.getMonth() - multiplier);
    return copy.toISOString().slice(0, 10);
  };
  const vaccine = randomChoice(vaccines);
  const dewormer = randomChoice(dewormers);
  return [
    {
      id: `${index}-vaccination`,
      label: vaccine.name,
      category: vaccine.type,
      date: monthsAgo(3 + (index % 4)),
      lot: `LOT-${100 + index}`,
      location: randomChoice(["Chute A", "Chute B", "Processing Barn"]),
    },
    {
      id: `${index}-dewormer`,
      label: dewormer.name,
      category: `${dewormer.type} dewormer`,
      date: monthsAgo(1 + ((index + 2) % 3)),
      lot: `LOT-${220 + index}`,
      location: randomChoice(["North pens", "Receiving alley", "Portable tub"]),
    },
    {
      id: `${index}-vitamins`,
      label: "Vita Charge Drench",
      category: "Supplement",
      date: monthsAgo(6 + ((index + 1) % 5)),
      lot: `LOT-${310 + index}`,
      location: randomChoice(["Chute A", "Processing Barn"]),
    },
  ];
}

const strayDistanceMeters = 420;
const fenceWarningMeters = 75;

function evaluateStray(distanceFromCenter, distanceToFence) {
  return distanceFromCenter > strayDistanceMeters || distanceToFence < fenceWarningMeters;
}

function createCow(index, totalCount) {
  const baseWeight = 1050 + Math.random() * 250;
  const breeds = ["Brangus", "Angus", "Red Angus", "Hereford", "Charolais"];
  const statuses = ["Bred", "Open", "Heavy bred", "Pair"];
  const healthFlags = ["BQA compliant", "Watch locomotion", "Excellent gain", "Vaccinated 30d", "Monitor hoof"];
  const getHealthNote = () => healthFlags[Math.floor(Math.random() * healthFlags.length)];
  const age = Math.floor(Math.random() * 4) + 3;
  const pregnancy = statuses[Math.floor(Math.random() * statuses.length)];
  const isStraggler = index >= Math.max(totalCount - stragglerTargetCount, 0);
  const { lon, lat } = createPosition(isStraggler);
  const distanceFromCenter = distanceInMeters({ lon, lat }, ranchCenter);
  const distanceToFence = distanceToFenceMeters({ lon, lat }, ranchBounds);
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
    lon,
    lat,
    homeLon: lon,
    homeLat: lat,
    vx: (Math.random() - 0.5) * 0.00008,
    vy: (Math.random() - 0.5) * 0.00008,
    immunizations: buildImmunizationRecord(index),
    distanceFromCenter,
    distanceToFence,
    isStray: evaluateStray(distanceFromCenter, distanceToFence),
    lastSeenTs: Date.now() - Math.floor(Math.random() * 60000),
    isStraggler,
  };
}

export function useHerd(count = 50, tickMs = 1000) {
  const [cows, setCows] = useState(() => Array.from({ length: count }, (_, index) => createCow(index, count)));
  const [trails, setTrails] = useState(() => new Map());
  const tick = useTicker(tickMs);

  useEffect(() => {
    setCows((list) =>
      list.map((cow) => {
        const pullStrength = cow.isStraggler ? 0.16 : 0.1;
        let vx = clamp(
          cow.vx + (Math.random() - 0.5) * 0.000025 + (cow.homeLon - cow.lon) * pullStrength,
          -0.00025,
          0.00025,
        );
        let vy = clamp(
          cow.vy + (Math.random() - 0.5) * 0.000025 + (cow.homeLat - cow.lat) * pullStrength,
          -0.00025,
          0.00025,
        );
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
        const distanceFromCenter = distanceInMeters({ lon, lat }, ranchCenter);
        const distanceToFence = distanceToFenceMeters({ lon, lat }, ranchBounds);
        return {
          ...cow,
          lon,
          lat,
          vx,
          vy,
          weight,
          distanceFromCenter,
          distanceToFence,
          isStray: evaluateStray(distanceFromCenter, distanceToFence),
          lastSeenTs: Date.now(),
        };
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
