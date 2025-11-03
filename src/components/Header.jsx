const sensorColors = {
  nominal: "bg-emerald-400",
  warning: "bg-amber-400",
  critical: "bg-rose-500",
};

const signalToneClasses = {
  nominal: "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.45)]",
  warning: "bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.45)]",
  critical: "bg-rose-500 shadow-[0_0_6px_rgba(248,113,113,0.45)]",
};

function SignalStrengthIcon({ strength, tone = "nominal" }) {
  const clamped = Math.max(0, Math.min(100, strength ?? 0));
  const normalized = clamped / 100;
  const activeClass = signalToneClasses[tone] ?? signalToneClasses.nominal;
  const thresholds = [0.2, 0.45, 0.7, 0.9];
  return (
    <span className="ml-1 flex items-end gap-[3px]" aria-hidden>
      {thresholds.map((threshold, index) => {
        const isActive = normalized >= threshold - 0.05;
        return (
          <span
            key={threshold}
            className={`w-[3px] rounded-sm ${isActive ? activeClass : "bg-neutral-700/70"}`}
            style={{ height: `${8 + index * 4}px` }}
          />
        );
      })}
    </span>
  );
}

function SensorStatus({ label, value, detail, tone, icon = null }) {
  const dotClass = sensorColors[tone] ?? sensorColors.nominal;
  return (
    <div className="group relative flex items-center gap-2">
      <span className={`h-2.5 w-2.5 rounded-full ${dotClass} shadow-[0_0_10px_var(--tw-shadow-color)]`} style={{ "--tw-shadow-color": tone === "critical" ? "rgba(248,113,113,0.5)" : tone === "warning" ? "rgba(251,191,36,0.45)" : "rgba(74,222,128,0.45)" }} />
      <span className="flex items-center text-xs uppercase tracking-wide text-neutral-400">
        {label}
        {icon}
      </span>
      <div className="pointer-events-none absolute left-0 top-full z-20 mt-3 hidden w-64 rounded-2xl border border-neutral-800 bg-neutral-950/95 p-3 text-xs text-neutral-200 shadow-xl backdrop-blur group-hover:block">
        <div className="text-sm font-semibold text-neutral-100">{value}</div>
        {detail && <div className="mt-1 text-[11px] text-neutral-400">{detail}</div>}
      </div>
    </div>
  );
}

export function Header({ telemetry, herd, user, onLogout }) {
  const displayName = user?.name ?? user?.username ?? "";
  const networkTone =
    telemetry.networkHealth <= 70 ? "critical" : telemetry.networkHealth <= 90 ? "warning" : "nominal";
  const statuses = [
    {
      id: "water",
      label: "Water",
      value: `${Math.round(telemetry.waterPct)}% full`,
      detail: telemetry.pumpOn ? "Pump circulating" : "Pump idle until 60%",
      tone: telemetry.waterPct <= 30 ? "critical" : telemetry.waterPct <= 55 ? "warning" : "nominal",
    },
    {
      id: "network",
      label: "Backhaul link",
      value: `${telemetry.networkHealth}% uptime`,
      detail:
        telemetry.networkHealth >= 95
          ? "Multi-path link healthy"
          : telemetry.networkHealth >= 80
            ? "Monitoring packet loss on ridge repeater"
            : "Inspect gateway and antennas",
      tone: networkTone,
      icon: <SignalStrengthIcon strength={telemetry.networkHealth} tone={networkTone} />,
    },
    {
      id: "fence",
      label: "Fence",
      value: `${telemetry.fenceKv.toFixed(1)} kV at energizer`,
      detail: telemetry.fenceKv < 6.4 ? "Inspect fence voltage" : "Voltage within target window",
      tone: telemetry.fenceKv <= 6 ? "critical" : telemetry.fenceKv <= 6.8 ? "warning" : "nominal",
    },
    {
      id: "network",
      label: "Link",
      value: `${telemetry.networkHealth}% uptime`,
      detail:
        telemetry.networkHealth >= 95
          ? "Multi-path link healthy"
          : telemetry.networkHealth >= 80
            ? "Monitoring packet loss on ridge repeater"
            : "Inspect gateway and antennas",
      tone: networkTone,
      icon: <SignalStrengthIcon strength={telemetry.networkHealth} tone={networkTone} />,
    },
  ];

  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="3 Strands Cattle Co. logo" className="h-10 w-10 rounded-full border border-neutral-800 bg-neutral-900 object-contain" />
            <div>
              <div className="text-xs uppercase tracking-widest text-neutral-400">3 Strands Cattle Co.</div>
              <div className="text-xl font-semibold text-neutral-50">ranchOS Operations</div>
              <div className="text-xs text-neutral-500">Security · Telemetry · Herd management</div>
            </div>
          </div>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-2">
              <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">Sensor status</div>
              <div className="mt-2 flex flex-wrap gap-3">
                {statuses.map((status) => (
                  <SensorStatus key={status.id} {...status} />
                ))}
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Signed in</div>
                  <div className="text-sm font-semibold text-neutral-100">{displayName}</div>
                  {user.role && <div className="text-[11px] text-neutral-500">{user.role}</div>}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-xl border border-neutral-700 bg-neutral-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-emerald-500/50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
