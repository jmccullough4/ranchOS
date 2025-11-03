import { useEffect, useState } from "react";
import { formatNow } from "../utils/time.js";

export function CameraFeed({ src = "/cam1.mp4", label = "CAM", variant = "compact" }) {
  const [fallback, setFallback] = useState(false);
  const [timestamp, setTimestamp] = useState(() => formatNow());

  useEffect(() => {
    const id = setInterval(() => setTimestamp(formatNow()), 1000);
    return () => clearInterval(id);
  }, []);

  const heightClass = variant === "expanded" ? "h-[240px] sm:h-[320px]" : "h-[160px] sm:h-[200px]";

  return (
    <div className={`relative ${heightClass} rounded-xl bg-black`}>
      <div className="absolute top-2 left-2 rounded border border-neutral-800 bg-black/60 px-2 py-1 text-xs">{label}</div>
      <div className="absolute top-2 right-2 rounded border border-neutral-800 bg-black/60 px-2 py-1 text-xs">{timestamp}</div>
      {!fallback ? (
        <video
          className="absolute inset-0 h-full w-full rounded-xl border border-neutral-800 object-cover"
          src={src}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setFallback(true)}
        />
      ) : (
        <div className="absolute inset-0 grid h-full w-full place-items-center rounded-xl border border-dashed border-neutral-700 bg-neutral-900 text-center text-xs text-neutral-300">
          <div>
            <p className="font-medium">Demo stream unavailable</p>
            <p className="text-[11px] text-neutral-500">Expected asset: {src}</p>
          </div>
        </div>
      )}
    </div>
  );
}
