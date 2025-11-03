import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Field } from "./Field.jsx";

export function TelemetryPanel({ telemetry, sms }) {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <div className="font-medium">Telemetry</div>
        <div className="text-xs text-neutral-400">LoRaWAN → MQTT</div>
      </div>
      <div className="grid gap-4 p-4">
        <div className="h-36 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
          <div className="mb-1 text-xs text-neutral-400">Trough level (%)</div>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={telemetry.waterSeries} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
              <defs>
                <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
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

        <div className="h-36 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
          <div className="mb-1 text-xs text-neutral-400">Fence voltage (kV)</div>
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

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Field label="Pump status" value={telemetry.pumpOn ? "ON" : "OFF"} />
          <Field label="LoRa GW" value="Online" />
          <Field label="Network health" value={`${telemetry.networkHealth}%`} />
          <Field label="Fence voltage" value={`${telemetry.fenceKv.toFixed(1)} kV`} />
          <Field label="Water level" value={`${Math.round(telemetry.waterPct)}%`} />
          <Field label="Last alert" value={sms || telemetry.alerts} />
        </div>
      </div>
    </div>
  );
}
