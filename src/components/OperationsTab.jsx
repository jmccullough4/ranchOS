import { motion } from "framer-motion";
import { hasMapboxToken } from "../constants/map.js";
import { CameraFeed } from "./CameraFeed.jsx";
import { PastureMap } from "./PastureMap.jsx";
import { TelemetryPanel } from "./TelemetryPanel.jsx";

const cameraFeeds = [
  { label: "CAM 1 — East Gate", src: "/cam1.mp4" },
  { label: "CAM 2 — Barn", src: "/cam2.mp4" },
  { label: "CAM 3 — North Road", src: "/cam3.mp4" },
  { label: "CAM 4 — Creek", src: "/cam4.mp4" },
];

export function OperationsTab({ telemetry, herd, sms, options, onOptionsChange }) {
  return (
    <motion.section key="ops" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-4">
          <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div className="font-medium">Security cameras</div>
              <div className="text-xs text-neutral-400">Frigate/IP</div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              {cameraFeeds.map((camera) => (
                <CameraFeed key={camera.label} label={camera.label} src={camera.src} />
              ))}
            </div>
          </div>
        </div>

        <TelemetryPanel telemetry={telemetry} sms={sms} />

        <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3 text-xs text-neutral-400">
            <div className="text-base font-medium text-neutral-100">Pasture management</div>
            <div className="flex items-center gap-2">
              <span>Basemap</span>
              <select
                className="rounded px-2 py-1 border border-neutral-800 bg-neutral-900"
                value={options.basemap}
                onChange={(event) => onOptionsChange({ ...options, basemap: event.target.value })}
                disabled={!hasMapboxToken}
              >
                <option value="satellite">Satellite</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </div>
          <div className="space-y-3 p-3">
            <PastureMap cows={herd.cows} trails={herd.trails} options={options} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-300">
              <label className="flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={options.breadcrumbs}
                  onChange={(event) => onOptionsChange({ ...options, breadcrumbs: event.target.checked })}
                />
                Breadcrumbs
              </label>
              <span>Tracking {herd.cows.length} cattle</span>
            </div>
            {!hasMapboxToken && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
                Satellite tiles require a Mapbox token. Without it, the demo falls back to MapLibre sample tiles so you can still showcase movement and overlays.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
