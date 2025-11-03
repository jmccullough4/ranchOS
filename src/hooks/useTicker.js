import { useEffect, useState } from "react";

export function useTicker(intervalMs) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((value) => value + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick;
}
