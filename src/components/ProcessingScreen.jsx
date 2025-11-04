import { useCallback, useEffect, useMemo } from "react";
import { formatNow } from "../utils/time.js";
import { Field } from "./Field.jsx";
import { randomInt } from "../utils/math.js";

const hubTreatments = [
  { name: "Bovishield Gold 5", withdrawal: "21 days" },
  { name: "Vision 7 Somnus", withdrawal: "18 days" },
  { name: "One Shot Ultra 7", withdrawal: "10 days" },
  { name: "Ultrabac 7/Somubac", withdrawal: "14 days" },
  { name: "Cattlemaster Gold FP5", withdrawal: "28 days" },
];

function createHubScan() {
  const treatment = hubTreatments[randomInt(0, hubTreatments.length - 1)];
  return {
    time: formatNow(),
    eid: `84000312${randomInt(345670, 999999)}`,
    weight: randomInt(920, 1280),
    treatment: treatment.name,
    withdrawal: treatment.withdrawal,
  };
}

export function ProcessingScreen({ rows, onAddRow, onNotify }) {
  const latestScan = rows.at(-1) ?? null;
  const shrinkPct = latestScan ? ((parseInt(latestScan.eid.slice(-2), 10) % 4) + 1) : null;
  const chuteTemp = latestScan ? 99 + (parseInt(latestScan.eid.slice(-3), 10) % 3) : null;

  const queueStats = useMemo(() => {
    const total = rows.length;
    if (!total) return { total: 0, avgWeight: null };
    const sum = rows.reduce((accumulator, row) => accumulator + row.weight, 0);
    return { total, avgWeight: Math.round(sum / total) };
  }, [rows]);

  const handleSimulateScan = useCallback(() => {
    const sample = createHubScan();
    onAddRow?.(sample);
    onNotify?.(`Hub sync logged ${sample.eid} (${sample.treatment})`);
  }, [onAddRow, onNotify]);

  useEffect(() => {
    const interval = setInterval(() => {
      const sample = createHubScan();
      onAddRow?.(sample);
      onNotify?.(`Hub sync logged ${sample.eid} (${sample.treatment})`);
    }, 45000);
    return () => clearInterval(interval);
  }, [onAddRow, onNotify]);

  return (
    <div className="flex h-full flex-col overflow-hidden bg-neutral-950 text-neutral-100">
      <div className="relative flex-1 overflow-y-auto">
        <div className="mx-auto flex h-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="rounded-3xl border border-neutral-800/80 bg-neutral-900/80 p-6 backdrop-blur">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">Processing lane</div>
                <h1 className="mt-1 text-3xl font-semibold text-neutral-50">Chute synchronization console</h1>
                <p className="mt-2 max-w-2xl text-sm text-neutral-400">
                  Monitor RFID reads and treatment logs streaming from the portable chute hub. Queue updates every 45 seconds so you can narrate the flow during demos.
                </p>
              </div>
              <div className="grid gap-3 rounded-3xl border border-neutral-800 bg-neutral-950/80 px-4 py-3 text-sm text-neutral-200">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] uppercase tracking-wide text-neutral-500">Queue length</span>
                  <span className="text-lg font-semibold text-neutral-100">{queueStats.total}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-[11px] uppercase tracking-wide text-neutral-500">Avg weight</span>
                  <span className="text-lg font-semibold text-neutral-100">{queueStats.avgWeight ? `${queueStats.avgWeight} lb` : "—"}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <Field label="EID" value={latestScan?.eid || "84000…"} />
              <Field label="Weight (lb)" value={latestScan?.weight || "—"} />
              <Field label="Treatment" value={latestScan?.treatment || "—"} />
              <Field label="Shrink" value={latestScan ? `${shrinkPct}%` : "—"} />
              <Field label="Chute temp" value={latestScan ? `${chuteTemp} °F` : "—"} />
              <Field label="Withdrawal" value={latestScan?.withdrawal || "—"} />
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSimulateScan}
                className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-5 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/30"
              >
                Log manual scan
              </button>
              <span className="text-[11px] text-neutral-500">
                Demo tip: mention the hands-free link back to headquarters when the queue auto-updates.
              </span>
            </div>
          </section>

          <section className="rounded-3xl border border-neutral-800/80 bg-neutral-950/80 p-6 backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Session history</div>
                <h2 className="text-2xl font-semibold text-neutral-50">Live RFID capture log</h2>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-4 py-2 text-sm text-neutral-300">
                Streaming events · {formatNow()}
              </div>
            </div>
            <div className="mt-4 max-h-[420px] overflow-y-auto rounded-2xl border border-neutral-800">
              <table className="min-w-full text-sm text-neutral-200">
                <thead className="bg-neutral-900/80 text-neutral-400">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">Time</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">EID</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">Weight</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">Treatment</th>
                    <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide text-[11px]">Withdrawal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.eid}-${index}`} className={index % 2 === 0 ? "bg-neutral-900/40" : "bg-neutral-900/20"}>
                      <td className="px-4 py-3 text-neutral-300">{row.time}</td>
                      <td className="px-4 py-3 font-mono text-[13px]">{row.eid}</td>
                      <td className="px-4 py-3">{row.weight}</td>
                      <td className="px-4 py-3">{row.treatment}</td>
                      <td className="px-4 py-3">{row.withdrawal}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-neutral-400">
                        Waiting on the first RFID read to roll in from the chute hub.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
