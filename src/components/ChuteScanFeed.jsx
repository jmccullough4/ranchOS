import { useEffect, useState } from "react";
import { formatNow } from "../utils/time.js";

const depthPalette = ["#22d3ee", "#38bdf8", "#8b5cf6", "#f97316"];

export function ChuteScanFeed({ src = "/chute-scan.mp4", variant = "compact", className = "" }) {
  const [timestamp, setTimestamp] = useState(() => formatNow());
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTimestamp(formatNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const heightClass =
    variant === "expanded" ? "h-[220px] sm:h-[280px] lg:h-[320px]" : "h-[160px] sm:h-[200px]";

  return (
    <div
      className={`relative ${heightClass} overflow-hidden rounded-2xl border border-cyan-500/30 bg-black text-cyan-100 shadow-[0_0_25px_rgba(6,182,212,0.25)] ${className}`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-sky-500/10 to-purple-700/20" />
      <div className="absolute top-3 left-4 z-10 text-[11px] uppercase tracking-[0.2em] text-cyan-200">Chute scanner</div>
      <div className="absolute top-3 right-4 z-10 rounded border border-cyan-500/40 bg-cyan-500/10 px-2 py-1 text-[11px] text-cyan-100">{timestamp}</div>
      <div className="absolute inset-x-0 top-10 z-10 flex justify-center gap-2 text-[10px] text-cyan-300/70">
        {depthPalette.map((color, index) => (
          <span key={color} className="flex items-center gap-1">
            <span className="inline-flex h-2 w-2 rounded-full" style={{ background: color }} />
            {index * 6 + 2}ft
          </span>
        ))}
      </div>
      <div className="scan-visor absolute inset-0" />
      {!fallback ? (
        <video
          className="absolute inset-0 h-full w-full object-cover mix-blend-screen"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFallback(true)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-neutral-950 text-center text-xs text-neutral-300">
          <div>
            <p className="font-medium text-cyan-200">Scanner feed unavailable</p>
            <p className="text-[11px] text-neutral-500">Expected asset: {src}</p>
          </div>
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 pb-3 text-[10px] font-medium uppercase tracking-widest text-cyan-300/80">
        <span>depth mesh</span>
        <span>frame sync 4D</span>
      </div>
    </div>
  );
}
