import { Area, AreaChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatRelativeFromNow } from "../utils/time.js";
import { Field } from "./Field.jsx";

const severityTokens = {
  critical: {
    container: "border-rose-500/50 ring-rose-500/20 bg-rose-500/5",
    badge: "text-rose-200 bg-rose-500/10 border-rose-400/40",
    label: "Critical",
  },
  warning: {
    container: "border-amber-500/50 ring-amber-500/20 bg-amber-500/5",
    badge: "text-amber-200 bg-amber-500/10 border-amber-400/40",
    label: "Warning",
  },
  nominal: {
    container: "border-emerald-500/40 ring-emerald-500/15 bg-emerald-500/5",
    badge: "text-emerald-200 bg-emerald-500/10 border-emerald-400/40",
    label: "Nominal",
  },
};

function getSeverity(value, thresholds) {
  if (!thresholds) return "nominal";
  if (value <= thresholds.critical) return "critical";
  if (value <= thresholds.warning) return "warning";
  return "nominal";
}

function statusBadge(severity) {
  const token = severityTokens[severity] ?? severityTokens.nominal;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${token.badge}`}
    >
      {token.label}
    </span>
  );
}

export function SensorNotifications({
  telemetry,
  herd,
  lastMessage,
  onViewMap,
  reportStatus,
  channels,
  onChannelChange,
  onSendReport,
}) {
  const strayCows = herd.cows.filter((cow) => cow.isStray);
  const straySeverity = strayCows.length > 4 ? "critical" : strayCows.length > 0 ? "warning" : "nominal";
  const latestAlert = lastMessage || telemetry.alerts;
  const lastRefreshTs = herd.cows.reduce((max, cow) => Math.max(max, cow.lastSeenTs ?? 0), 0);
  const lastRefreshed = lastRefreshTs ? formatRelativeFromNow(lastRefreshTs) : "moments ago";
  const lastAlertSeverity =
    latestAlert && latestAlert.toLowerCase().includes("low")
      ? "warning"
      : latestAlert && latestAlert.toLowerCase().includes("below")
        ? "critical"
        : "nominal";

  const selectedChannels = channels ?? { sms: false, backhaul: false };
  const hasChannel = selectedChannels.sms || selectedChannels.backhaul;

  const toggleChannel = (key) => {
    onChannelChange?.({ ...selectedChannels, [key]: !selectedChannels[key] });
  };

  const handleSendReport = () => {
    const mediums = [];
    if (selectedChannels.sms) mediums.push("SMS uplink");
    if (selectedChannels.backhaul) mediums.push("Backhaul uplink");
    onSendReport?.(mediums);
  };

  const lastReportCopy = reportStatus ? `${reportStatus.timestamp} · ${reportStatus.channels.join(" + ")}` : "No report sent yet";

  const sensors = [
    {
      id: "water",
      label: "Water trough",
      value: `${Math.round(telemetry.waterPct)}% full`,
      severity: getSeverity(telemetry.waterPct, { critical: 30, warning: 55 }),
      detail: telemetry.pumpOn ? "Pump engaged" : "Pump idle",
      meta: telemetry.pumpOn ? "Auto refill active" : "Holding until 60%",
    },
    {
      id: "fence",
      label: "Perimeter fence",
      value: `${telemetry.fenceKv.toFixed(1)} kV`,
      severity: getSeverity(telemetry.fenceKv, { critical: 6, warning: 6.8 }),
      detail: telemetry.fenceKv < 6.2 ? "Below energizer target" : "Energized",
      meta: "LoRa energizer node",
    },
    {
      id: "network",
      label: "Network health",
      value: `${telemetry.networkHealth}% uptime`,
      severity: telemetry.networkHealth < 94 ? "warning" : "nominal",
      detail: telemetry.networkHealth < 96 ? "Packet retries elevated" : "Nominal",
      meta: "Backhaul + edge mesh",
    },
    {
      id: "strays",
      label: "Stray monitor",
      value: strayCows.length ? `${strayCows.length} flagged` : "All accounted for",
      severity: straySeverity,
      detail: strayCows.length ? "Outside preferred grazing zone" : "Within virtual fence",
      meta: strayCows.length ? `Last ping ${formatRelativeFromNow(strayCows[0]?.lastSeenTs ?? Date.now())}` : "",
      action:
        strayCows.length > 0
          ? () => {
              onViewMap?.();
            }
          : null,
      actionLabel: "View on map",
    },
  ];

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-6 shadow-2xl shadow-emerald-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-neutral-500">Sensor notification hub</div>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Live infrastructure status</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Review water, fencing, network, and herd positioning telemetry at a glance. Use these alerts to triage issues before
            they escalate.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] text-neutral-400">
          Last refreshed {lastRefreshed}
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,2.6fr)_minmax(0,1.2fr)]">
        <div className="grid gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {sensors.map((sensor) => {
              const severity = sensor.severity ?? "nominal";
              const token = severityTokens[severity] ?? severityTokens.nominal;
              return (
                <div
                  key={sensor.id}
                  className={`flex flex-col justify-between gap-3 rounded-2xl border bg-neutral-900/80 p-4 text-sm text-neutral-300 ring-1 ring-inset transition hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-500/10 ${token.container}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[11px] uppercase tracking-wide text-neutral-500">{sensor.label}</div>
                      <div className="mt-1 text-xl font-semibold text-neutral-50">{sensor.value}</div>
                    </div>
                    {statusBadge(severity)}
                  </div>
                  <div className="text-neutral-400">{sensor.detail}</div>
                  {sensor.meta ? <div className="text-[11px] uppercase tracking-widest text-neutral-500">{sensor.meta}</div> : null}
                  {sensor.action && (
                    <button
                      type="button"
                      onClick={sensor.action}
                      className="self-start rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
                    >
                      {sensor.actionLabel}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Trough level trend</span>
                <span>{telemetry.pumpOn ? "Pump active" : "Pump idle"}</span>
              </div>
              <div className="h-40">
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
              <div className="grid grid-cols-2 gap-3 text-xs text-neutral-300">
                <Field label="Water level" value={`${Math.round(telemetry.waterPct)}%`} />
                <Field label="Pump status" value={telemetry.pumpOn ? "ON" : "OFF"} />
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4">
              <div className="flex items-center justify-between text-xs text-neutral-400">
                <span>Fence voltage trend</span>
                <span>{telemetry.fenceKv < 6.4 ? "Investigate energizer" : "Nominal"}</span>
              </div>
              <div className="h-40">
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
                <Field label="Network uptime" value={`${telemetry.networkHealth}%`} />
              </div>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-neutral-300">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">Latest alert</div>
                <div className="mt-1 text-base font-semibold text-neutral-50">{latestAlert || "No alerts"}</div>
                <div className="mt-1 text-xs text-neutral-400">{strayCows.length ? `Herd sync ${lastRefreshed}` : `Updated ${lastRefreshed}`}</div>
              </div>
              {statusBadge(lastAlertSeverity)}
            </div>
            {strayCows.length > 0 && (
              <button
                type="button"
                onClick={() => onViewMap?.()}
                className="mt-3 inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
              >
                Focus stray herd
              </button>
            )}
          </div>

          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-neutral-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">Herd status report</div>
                <div className="mt-1 text-neutral-200">{lastReportCopy}</div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-neutral-200">
                    <input type="checkbox" checked={selectedChannels.sms} onChange={() => toggleChannel("sms")} />
                    SMS uplink
                  </label>
                  <label className="inline-flex items-center gap-2 text-neutral-200">
                    <input type="checkbox" checked={selectedChannels.backhaul} onChange={() => toggleChannel("backhaul")} />
                    Internet backhaul
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleSendReport}
                  disabled={!hasChannel}
                  className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Publish report
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
