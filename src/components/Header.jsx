const tabs = [
  { id: "dashboard", label: "Interactive dashboard" },
  { id: "eid", label: "Chute-Side EID Lite" },
];

export function Header({ activeTab, onTabChange, user, onLogout }) {
  const displayName = user?.name ?? user?.username ?? "";
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
        <div className="hidden items-center gap-4 text-xs text-neutral-500 sm:flex">
          <div className="text-right">
            <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-400">Live ranch twin</div>
            <div>Monitor cattle position, infrastructure health, and chute-side throughput.</div>
          </div>
          {user && (
            <div className="flex items-center gap-3 rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-right">
              <div>
                <div className="text-xs uppercase tracking-wide text-neutral-400">Signed in</div>
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
        {user && (
          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300 sm:hidden">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-neutral-500">Signed in</div>
              <div className="text-sm font-semibold text-neutral-100">{displayName}</div>
              {user.role && <div className="text-[11px] text-neutral-500">{user.role}</div>}
            </div>
            <button
              type="button"
              onClick={onLogout}
              className="rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-200"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
