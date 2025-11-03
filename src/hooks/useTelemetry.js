import { useEffect, useMemo, useState } from "react";
import { clamp, randomInt } from "../utils/math.js";
import { useTicker } from "./useTicker.js";

export function useTelemetry(tickMs = 1000) {
  const tick = useTicker(tickMs);
  const [waterPct, setWaterPct] = useState(78);
  const [fenceKv, setFenceKv] = useState(7.8);
  const [pumpOn, setPumpOn] = useState(false);

  useEffect(() => {
    setWaterPct((value) => clamp(value + (Math.random() - 0.5) * 2, 20, 100));
    setFenceKv((value) => clamp(+(value + (Math.random() - 0.5) * 0.2).toFixed(2), 5.5, 9));
    setPumpOn((current) => {
      if (waterPct < 45) return true;
      if (waterPct > 85) return false;
      return current;
    });
  }, [tick, waterPct]);

  const waterSeries = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        t: index - 19,
        level: clamp(waterPct + (Math.random() - 0.5) * 2, 0, 100),
      })),
    [waterPct, tick],
  );

  const fenceSeries = useMemo(
    () =>
      Array.from({ length: 20 }, (_, index) => ({
        t: index - 19,
        kv: clamp(+(fenceKv + (Math.random() - 0.5) * 0.2).toFixed(2), 0, 12),
      })),
    [fenceKv, tick],
  );

  const alerts = useMemo(() => {
    if (pumpOn && waterPct < 50) {
      return "Trough pump active";
    }
    if (!pumpOn && waterPct < 35) {
      return "Low trough level";
    }
    if (fenceKv < 6.2) {
      return "Fence voltage below threshold";
    }
    return "All systems nominal";
  }, [pumpOn, waterPct, fenceKv]);

  return {
    waterPct,
    fenceKv,
    waterSeries,
    fenceSeries,
    pumpOn,
    alerts,
    networkHealth: randomInt(96, 100),
  };
}
