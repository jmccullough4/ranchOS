import { formatRelativeFromNow } from "../utils/time.js";

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

export function SensorNotifications({ telemetry, herd, lastMessage, onViewMap }) {
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

  const sensors = [
    {
      id: "water",
      label: "Water trough",
      value: `${Math.round(telemetry.waterPct)}% full`,
      severity: getSeverity(telemetry.waterPct, { critical: 30, warning: 55 }),
      detail: telemetry.pumpOn ? "Pump engaged" : "Pump idle",
      meta: `Pump ${telemetry.pumpOn ? "running" : "standing by"}`,
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
      id: "alerts",
      label: "Latest alert",
      value: latestAlert,
      severity: lastAlertSeverity,
      detail: `Updated ${lastRefreshed}`,
      meta: "Notification hub",
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
    },
  ];

  return (
    <section className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-5 shadow-2xl shadow-emerald-500/10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.4em] text-neutral-500">Sensor notification hub</div>
          <h2 className="mt-1 text-2xl font-semibold text-neutral-50">Live infrastructure status</h2>
          <p className="mt-1 max-w-2xl text-sm text-neutral-400">
            Review real-time readings from water, fencing, network backhaul, and herd positioning sensors. Use these alerts to
            triage issues before they escalate.
          </p>
        </div>
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-[11px] text-neutral-400">
          Last refreshed {lastRefreshed}
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {sensors.map((sensor) => {
          const severity = sensor.severity ?? "nominal";
          const token = severityTokens[severity] ?? severityTokens.nominal;
          return (
            <div
              key={sensor.id}
              className={`flex flex-col justify-between gap-3 rounded-3xl border bg-neutral-900/80 p-4 text-sm text-neutral-300 ring-1 ring-inset transition hover:translate-y-[-1px] hover:shadow-lg hover:shadow-emerald-500/10 ${token.container}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">{sensor.label}</div>
                  <div className="mt-1 text-xl font-semibold text-neutral-50">{sensor.value}</div>
                </div>
                {statusBadge(severity)}
              </div>
              <div className="text-neutral-400">{sensor.detail}</div>
              {sensor.meta ? (
                <div className="text-[11px] uppercase tracking-widest text-neutral-500">{sensor.meta}</div>
              ) : null}
              {sensor.action && (
                <button
                  type="button"
                  onClick={sensor.action}
                  className="self-start rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20"
                >
                  View on map
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
