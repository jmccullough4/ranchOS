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

export function Header({ telemetry, herd, user, onLogout, activeScreen = "map", onNavigate, threatActive = false }) {
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
      id: "fence",
      label: "Fence",
      value: `${telemetry.fenceKv.toFixed(1)} kV at energizer`,
      detail: telemetry.fenceKv < 6.4 ? "Inspect fence voltage" : "Voltage within target window",
      tone: telemetry.fenceKv <= 6 ? "critical" : telemetry.fenceKv <= 6.8 ? "warning" : "nominal",
    },
    {
      id: "network",
      label: "Network status",
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

  const uniqueStatuses = [];
  const seenStatusIds = new Set();
  for (const status of statuses) {
    if (seenStatusIds.has(status.id)) continue;
    seenStatusIds.add(status.id);
    uniqueStatuses.push(status);
  }

  const navItems = [
    { id: "map", label: "Operations map" },
    { id: "processing", label: "Chute sync" },
  ];

  const herdCount = herd?.cows?.length ?? 0;

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-800/70 bg-neutral-950/85 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="3 Strands Cattle Co. logo" className="h-11 w-11 rounded-full border border-neutral-800 bg-neutral-900 object-contain" />
            <div>
              <div className="text-xs uppercase tracking-[0.45em] text-neutral-500">ranchOS</div>
              <div className="text-2xl font-semibold text-neutral-50">3 Strands Cattle Co. command center</div>
              <div className="text-xs text-neutral-500">1375 Duette Rd · Duette, FL 34219</div>
            </div>
          </div>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/70 px-4 py-3">
              <div className="text-[10px] uppercase tracking-[0.35em] text-neutral-500">Sensor status</div>
              <div className="mt-2 flex flex-wrap gap-3">
                {uniqueStatuses.map((status) => (
                  <SensorStatus key={status.id} {...status} />
                ))}
              </div>
            </div>
            {user && (
              <div className="flex items-center gap-3 rounded-3xl border border-neutral-800 bg-neutral-900/70 px-4 py-3 text-right">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Signed in</div>
                  <div className="text-sm font-semibold text-neutral-100">{displayName}</div>
                  {user.role && <div className="text-[11px] text-neutral-500">{user.role}</div>}
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="rounded-full border border-neutral-700 bg-neutral-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-emerald-500/50"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            {navItems.map((item) => {
              const isActive = item.id === activeScreen;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate?.(item.id)}
                  className={`rounded-full border px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition ${
                    isActive
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.3)]"
                      : "border-neutral-800 bg-neutral-900/70 text-neutral-300 hover:border-emerald-400/40 hover:text-neutral-100"
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-neutral-500">
            <span>Herd {herdCount} head</span>
            <span className="h-1 w-1 rounded-full bg-neutral-700" aria-hidden />
            <span>Network status {telemetry.networkHealth}% uptime</span>
            <span className="h-1 w-1 rounded-full bg-neutral-700" aria-hidden />
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[10px] font-semibold tracking-[0.2em] ${
                threatActive
                  ? "border-rose-500/50 bg-rose-500/15 text-rose-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {threatActive ? "Perimeter watch active" : "Perimeter secure"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
