import { demoDuration } from "../data/demoScript.js";

const tabs = [
  { id: "ops", label: "Operations" },
  { id: "eid", label: "Chute-Side EID Lite" },
];

export function Header({ activeTab, onTabChange, onPlayDemo, onPauseDemo, playing, speed, onSpeedChange, timeline, narrative }) {
  const progress = Math.min(timeline / demoDuration, 1);

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
        <div className="flex items-center gap-2 text-sm">
          <button
            type="button"
            onClick={onPlayDemo}
            className="rounded-2xl border border-neutral-700 bg-neutral-800 px-4 py-2 font-medium hover:bg-neutral-700"
          >
            ▶ Play demo
          </button>
          <button
            type="button"
            onClick={onPauseDemo}
            className="rounded-2xl border border-neutral-800 bg-neutral-900 px-3 py-2 hover:bg-neutral-800"
          >
            {playing ? "⏸ Pause" : "■ Stop"}
          </button>
          <select
            className="rounded-xl border border-neutral-800 bg-neutral-900 px-2 py-1"
            value={speed}
            onChange={(event) => onSpeedChange(Number(event.target.value))}
          >
            <option value={1}>Speed: 1x</option>
            <option value={2}>Speed: 2x</option>
          </select>
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
      <div className="border-t border-neutral-900 bg-neutral-950/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-3 md:flex-row md:items-center md:justify-between">
          <div className="text-xs uppercase tracking-wide text-neutral-400">Demo narrative</div>
          <div className="flex flex-1 flex-col gap-1 md:items-end">
            <div className="flex w-full items-center gap-3 text-xs text-neutral-400">
              <div className="flex-1 overflow-hidden rounded-full bg-neutral-900">
                <div className="h-1 rounded-full bg-emerald-500" style={{ width: `${progress * 100}%` }} />
              </div>
              <span className="font-mono text-neutral-500">{timeline.toString().padStart(2, "0")}s / {demoDuration}s</span>
            </div>
            <div className="text-xs text-neutral-300 md:text-right">{narrative || "Idle — ready when you are."}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
