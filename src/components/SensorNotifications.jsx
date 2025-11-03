import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Field } from "./Field.jsx";

export function SensorNotifications({ telemetry }) {
  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-6 shadow-2xl shadow-emerald-500/10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-neutral-500">Infrastructure telemetry</div>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Water and fence health</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Monitor trough reserves, pump activity, fence voltage, and backhaul reliability in one glance.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-[11px] text-neutral-400">
          Network uptime {telemetry.networkHealth}%
        </div>
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Water trough</span>
            <span>{telemetry.pumpOn ? "Pump circulating" : "Pump idle"}</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry.waterSeries} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                <defs>
                  <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                <Area type="monotone" dataKey="level" stroke="#22d3ee" fill="url(#gradWater)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-neutral-300">
            <Field label="Reservoir" value={`${Math.round(telemetry.waterPct)}%`} />
            <Field label="Pump status" value={telemetry.pumpOn ? "ON" : "OFF"} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>Perimeter fence</span>
            <span>{telemetry.fenceKv < 6.4 ? "Investigate energizer" : "Voltage nominal"}</span>
          </div>
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={telemetry.fenceSeries} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                <XAxis dataKey="t" hide />
                <YAxis hide domain={[0, 12]} />
                <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                <Line type="monotone" dataKey="kv" stroke="#86efac" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs text-neutral-300">
            <Field label="Fence voltage" value={`${telemetry.fenceKv.toFixed(1)} kV`} />
            <Field label="Backhaul uptime" value={`${telemetry.networkHealth}%`} />
          </div>
        </div>
      </div>
    </section>
  );
}
