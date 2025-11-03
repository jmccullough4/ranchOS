const tabs = [
  { id: "ops", label: "Operations" },
  { id: "eid", label: "Chute-Side EID Lite" },
];

export function Header({ activeTab, onTabChange }) {
  return (
    <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="3 Strands Cattle Co. logo" className="h-10 w-10 rounded-full border border-neutral-800 bg-neutral-900 object-contain" />
          <div>
            <div className="text-xs uppercase tracking-widest text-neutral-400">3 Strands Cattle Co.</div>
            <div className="text-xl font-semibold text-neutral-50">ranchOS Demo Suite</div>
            <div className="text-xs text-neutral-500">Security · Telemetry · Herd management</div>
          </div>
        </div>
        <div className="hidden text-xs text-neutral-500 sm:block">
          <div className="text-right font-mono text-[11px] uppercase tracking-wider text-emerald-400">Live ranch twin</div>
          <div>Monitor cattle position, infrastructure health, and chute-side throughput.</div>
        </div>
      </div>
      <div className="mx-auto max-w-6xl px-4 pb-3">
        <nav className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`rounded-2xl border px-4 py-2 text-sm transition ${activeTab === tab.id ? "border-neutral-700 bg-neutral-800" : "border-neutral-900 bg-neutral-900 hover:border-neutral-700"}`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
