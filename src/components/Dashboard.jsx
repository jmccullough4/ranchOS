import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { hasMapboxToken } from "../constants/map.js";
import { defaultRanchAddress, defaultRanchBoundary, paddocks as defaultPaddocks } from "../constants/ranch.js";
import { PastureMap } from "./PastureMap.jsx";
import { polygonAreaInAcres } from "../utils/geo.js";
import { formatNow, formatRelativeFromNow } from "../utils/time.js";
import { randomInt } from "../utils/math.js";
import { Field } from "./Field.jsx";
import { CameraFeed } from "./CameraFeed.jsx";

const cameraFeeds = [
  { id: "cam1", label: "Barn alley", src: "/cam1.mp4" },
  { id: "cam2", label: "Chute staging", src: "/cam2.mp4" },
  { id: "cam3", label: "East gate", src: "/cam3.mp4" },
  { id: "cam4", label: "Creek crossing", src: "/cam4.mp4" },
];

const hubTreatments = [
  { name: "Bovishield Gold 5", withdrawal: "21 days" },
  { name: "Vision 7 Somnus", withdrawal: "18 days" },
  { name: "One Shot Ultra 7", withdrawal: "10 days" },
  { name: "Ultrabac 7/Somubac", withdrawal: "14 days" },
  { name: "Cattlemaster Gold FP5", withdrawal: "28 days" },
];

function paddocksToFeatures(paddocks) {
  return paddocks.map((paddock, index) => {
    const id = paddock.id ?? `default-${index}`;
    return {
      type: "Feature",
      id,
      properties: {
        name: paddock.name ?? `Pasture ${index + 1}`,
        acres: polygonAreaInAcres(paddock.coords),
        __id: id,
      },
      geometry: { type: "Polygon", coordinates: [paddock.coords] },
    };
  });
}

export function Dashboard({
  telemetry,
  herd,
  options,
  onOptionsChange,
  onNotify,
  reportStatus,
  onSendReport,
  rows,
  onAddRow,
}) {
  const mapSectionRef = useRef(null);
  const address = defaultRanchAddress;
  const [boundary, setBoundary] = useState(defaultRanchBoundary);
  const [pastures, setPastures] = useState(() => paddocksToFeatures(defaultPaddocks));
  const [selectedCowId, setSelectedCowId] = useState(null);
  const [drawReady, setDrawReady] = useState(false);
  const [reportChannels, setReportChannels] = useState({ sms: true, backhaul: true });
  const [cameraWallOpen, setCameraWallOpen] = useState(false);

  useEffect(() => {
    if (!selectedCowId) return;
    const stillPresent = herd.cows.some((cow) => cow.id === selectedCowId);
    if (!stillPresent) {
      setSelectedCowId(null);
    }
  }, [herd.cows, selectedCowId]);

  const selectedCow = useMemo(() => herd.cows.find((cow) => cow.id === selectedCowId) ?? null, [herd.cows, selectedCowId]);

  const pastureList = useMemo(
    () =>
      pastures.map((feature) => ({
        id: feature.id,
        name: feature.properties?.name ?? "Untitled pasture",
        acres: feature.properties?.acres ?? null,
      })),
    [pastures],
  );

  const lastRefreshTs = herd.cows.reduce((max, cow) => Math.max(max, cow.lastSeenTs ?? 0), 0);
  const lastRefreshed = lastRefreshTs ? formatRelativeFromNow(lastRefreshTs) : "moments ago";

  const scrollMapIntoView = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const handleRemovePasture = (id) => {
    setPastures((previous) => previous.filter((feature) => feature.id !== id));
    onNotify?.("Removed pasture boundary.");
  };

  const handleRecenterBoundary = () => {
    setBoundary(defaultRanchBoundary);
    onNotify?.("Ranch boundary restored from hub record.");
    scrollMapIntoView();
  };

  const handleFocusStrays = () => {
    const primary = herd.cows.find((cow) => cow.isStray);
    if (primary) {
      setSelectedCowId(primary.id);
      onNotify?.(`Focusing on ${primary.tag} near the fence.`);
    }
    scrollMapIntoView();
  };

  const toggleChannel = (key) => {
    setReportChannels((previous) => ({ ...previous, [key]: !previous[key] }));
  };

  const handleSendReport = () => {
    const mediums = [];
    if (reportChannels.sms) mediums.push("SMS uplink");
    if (reportChannels.backhaul) mediums.push("Backhaul uplink");
    onSendReport?.(mediums);
  };

  const lastReportCopy = reportStatus ? `${reportStatus.timestamp} · ${reportStatus.channels.join(" + ")}` : "No report sent yet";

  const latestScan = rows.at(-1) ?? null;
  const shrinkPct = latestScan ? ((parseInt(latestScan.eid.slice(-2), 10) % 4) + 1) : null;
  const chuteTemp = latestScan ? 99 + (parseInt(latestScan.eid.slice(-3), 10) % 3) : null;

  const createHubScan = useCallback(() => {
    const treatment = hubTreatments[randomInt(0, hubTreatments.length - 1)];
    return {
      time: formatNow(),
      eid: `84000312${randomInt(345670, 999999)}`,
      weight: randomInt(920, 1280),
      treatment: treatment.name,
      withdrawal: treatment.withdrawal,
    };
  }, []);

  const handleSimulateScan = () => {
    const sample = createHubScan();
    onAddRow?.(sample);
    onNotify?.(`Hub sync logged ${sample.eid} (${sample.treatment})`);
  };

  useEffect(() => {
    const interval = setInterval(() => {
      const sample = createHubScan();
      onAddRow?.(sample);
      onNotify?.(`Hub sync logged ${sample.eid} (${sample.treatment})`);
    }, 45000);
    return () => clearInterval(interval);
  }, [createHubScan, onAddRow, onNotify]);

  return (
    <motion.section key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)]">
          <section
            ref={mapSectionRef}
            id="dashboard-map"
            className="rounded-3xl border border-neutral-800 bg-neutral-950/90 shadow-2xl shadow-emerald-500/5"
          >
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-5 py-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">Pasture operations</div>
                <h2 className="text-xl font-semibold text-neutral-50">Interactive ranch map</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
                <span>Tracking {herd.cows.length} head</span>
                <button
                  type="button"
                  onClick={handleFocusStrays}
                  className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
                >
                  Focus stray cluster
                </button>
              </div>
            </header>

            <div className="flex flex-col gap-5 p-5">
              <div className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Ranch address</div>
                  <div className="mt-1 text-sm font-medium text-neutral-200">{address}</div>
                  <div className="text-[11px] text-neutral-500">Auto-filled from saved hub parcel.</div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <button
                    type="button"
                    onClick={handleRecenterBoundary}
                    className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
                  >
                    Recenter map
                  </button>
                  <span className="text-[10px] text-neutral-500">Parcel boundary synced nightly.</span>
                </div>
              </div>

              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.75fr)_minmax(0,1fr)]">
                <div className="space-y-4">
                  <PastureMap
                    cows={herd.cows}
                    trails={herd.trails}
                    options={options}
                    boundary={boundary}
                    pastures={pastures}
                    onPasturesChange={(features) => {
                      setPastures(
                        features.map((feature, index) => {
                          const coords = feature.geometry?.coordinates?.[0];
                          const acres = coords ? polygonAreaInAcres(coords) : undefined;
                          const featureId = feature.id ?? `drawn-${index}`;
                          return {
                            ...feature,
                            id: featureId,
                            properties: { ...feature.properties, acres, __id: feature.properties?.__id ?? featureId },
                          };
                        }),
                      );
                    }}
                    selectedCowId={selectedCowId}
                    selectedCow={selectedCow}
                    onSelectCow={(cow) => {
                      if (cow) {
                        setSelectedCowId(cow.id);
                      } else {
                        setSelectedCowId(null);
                      }
                    }}
                    onDrawReady={setDrawReady}
                    variant="expanded"
                  />
                  <div className="grid gap-3 text-xs text-neutral-300 sm:grid-cols-2 lg:grid-cols-3">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.breadcrumbs}
                        onChange={(event) => onOptionsChange({ ...options, breadcrumbs: event.target.checked })}
                      />
                      Breadcrumb trails
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={options.heatmap}
                        onChange={(event) => onOptionsChange({ ...options, heatmap: event.target.checked })}
                      />
                      Grazing heatmap
                    </label>
                    <label className="flex items-center gap-2">
                      <span>Basemap</span>
                      <select
                        className="flex-1 rounded border border-neutral-800 bg-neutral-950 px-2 py-1"
                        value={options.basemap}
                        onChange={(event) => onOptionsChange({ ...options, basemap: event.target.value })}
                        disabled={!hasMapboxToken}
                      >
                        <option value="satellite">Satellite</option>
                        <option value="dark">Dark</option>
                      </select>
                    </label>
                    <div className="sm:col-span-2 lg:col-span-3 text-[11px] text-neutral-500">
                      Tip: Shift + drag on the map to box-select animals and review grazing stats together.
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="grid gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-4">
                    <div className="flex items-center justify-between text-xs uppercase tracking-wide text-neutral-400">
                      <span>Drawn pastures</span>
                      {!drawReady && <span className="text-[10px] text-neutral-500">Loading tools…</span>}
                    </div>
                    {pastureList.length === 0 && (
                      <div className="text-xs text-neutral-500">
                        {drawReady ? "Use the polygon tool in the map to sketch paddocks." : "Ensure network access to load drawing controls."}
                      </div>
                    )}
                    {pastureList.map((pasture) => (
                      <div
                        key={pasture.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium text-neutral-100">{pasture.name}</div>
                          {pasture.acres && <div className="text-xs text-neutral-500">{pasture.acres.toFixed(1)} ac</div>}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePasture(pasture.id)}
                          className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-[11px] uppercase tracking-wide text-neutral-300 hover:border-rose-400/70 hover:text-rose-200"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-xs text-neutral-300">
                    <div className="text-[10px] uppercase tracking-wide text-neutral-500">Herd sync</div>
                    <div className="mt-1 text-neutral-200">Last position update {lastRefreshed}</div>
                    <div className="mt-2 text-[11px] text-neutral-500">Breadcrumb refresh cadence: every 60 seconds.</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <aside className="flex flex-col gap-4">
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/80 p-4 text-sm text-neutral-300">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Herd status report</div>
                  <div className="mt-1 text-neutral-200">{lastReportCopy}</div>
                </div>
                <div className="flex flex-col gap-2 sm:items-end">
                  <div className="flex flex-wrap gap-3">
                    <label className="inline-flex items-center gap-2 text-neutral-200">
                      <input type="checkbox" checked={reportChannels.sms} onChange={() => toggleChannel("sms")} />
                      SMS uplink
                    </label>
                    <label className="inline-flex items-center gap-2 text-neutral-200">
                      <input type="checkbox" checked={reportChannels.backhaul} onChange={() => toggleChannel("backhaul")} />
                      Internet backhaul
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={handleSendReport}
                    disabled={!reportChannels.sms && !reportChannels.backhaul}
                    className="inline-flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Publish report
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
              <div className="text-[11px] uppercase tracking-wide text-neutral-500">Security cameras</div>
              <p className="mt-1 text-xs text-neutral-400">
                Live edge recording from barn, chute staging, east gate, and creek crossings with threat analytics overlays.
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {cameraFeeds.map((feed) => (
                  <div key={feed.id} className="overflow-hidden rounded-2xl border border-sky-400/30 bg-neutral-950/80">
                    <CameraFeed src={feed.src} label={feed.label} />
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setCameraWallOpen(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-sky-400/50 bg-sky-500/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-sky-100 hover:bg-sky-500/20"
              >
                ↗ Launch camera wall
              </button>
              <div className="mt-2 text-[10px] text-sky-200/80">Threat detection flags motion across all feeds.</div>
            </div>
          </aside>
        </div>

        <section className="rounded-3xl border border-neutral-800 bg-neutral-950/90 p-6 shadow-2xl shadow-emerald-500/5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">Hub sync</div>
                <h2 className="text-xl font-semibold text-neutral-50">Processing lane overview</h2>
              </div>
              <div className="rounded-xl border border-neutral-800 bg-neutral-900/80 px-3 py-2 text-[11px] text-neutral-400">
                Queue {rows.length} scans
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] lg:items-start">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="EID" value={latestScan?.eid || "84000…"} />
                  <Field label="Weight (lb)" value={latestScan?.weight || "—"} />
                  <Field label="Treatment" value={latestScan?.treatment || "—"} />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <Field label="Shrink" value={latestScan ? `${shrinkPct}%` : "—"} />
                  <Field label="Temp" value={latestScan ? `${chuteTemp} °F` : "—"} />
                  <Field label="Disposition" value={latestScan ? "Calm" : "—"} />
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
                  <div className="mb-2 text-xs text-neutral-400">Scans this session</div>
                  <div className="max-h-48 overflow-auto rounded-lg border border-neutral-800">
                    <table className="w-full text-sm">
                      <thead className="bg-neutral-900/60 text-neutral-300">
                        <tr>
                          <th className="px-3 py-2 text-left">Time</th>
                          <th className="px-3 py-2 text-left">EID</th>
                          <th className="px-3 py-2 text-left">Weight</th>
                          <th className="px-3 py-2 text-left">Treatment</th>
                          <th className="px-3 py-2 text-left">Withdrawal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row, index) => (
                          <tr key={`${row.eid}-${index}`} className="odd:bg-neutral-900/30">
                            <td className="px-3 py-2 text-neutral-300">{row.time}</td>
                            <td className="px-3 py-2 font-mono">{row.eid}</td>
                            <td className="px-3 py-2">{row.weight}</td>
                            <td className="px-3 py-2">{row.treatment}</td>
                            <td className="px-3 py-2">{row.withdrawal}</td>
                          </tr>
                        ))}
                        {rows.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                              Scan an EID to begin and monitor the chute-side stream for confirmation.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-xs text-neutral-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wide text-neutral-500">Live vitals</span>
                    <span className="text-neutral-200">Queue ready</span>
                  </div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">Scale drift</div>
                      <div className="text-sm text-neutral-100">±0.4 lb</div>
                    </div>
                    <div className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wide text-neutral-500">Reader RSSI</div>
                      <div className="text-sm text-neutral-100">-62 dBm</div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-700"
                  >
                    Sync hub now
                  </button>
                </div>
              </div>
            </div>
        </section>

        {!hasMapboxToken && (
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
            Satellite tiles require a Mapbox token. Without it, the map falls back to MapLibre sample tiles so you can still showcase movement and overlays.
          </div>
        )}
      </div>
      {cameraWallOpen && (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-950/95 p-6 shadow-[0_0_40px_rgba(14,165,233,0.2)] backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.35em] text-sky-300">Security hub</div>
                <h3 className="text-xl font-semibold text-neutral-50">Threat detection camera wall</h3>
                <p className="mt-1 text-sm text-neutral-400">Streaming four HD feeds with anomaly detection overlays.</p>
              </div>
              <button
                type="button"
                onClick={() => setCameraWallOpen(false)}
                className="rounded-xl border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-sky-400/60"
              >
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {cameraFeeds.map((feed) => (
                <CameraFeed key={`${feed.id}-wall`} src={feed.src} label={feed.label} variant="expanded" />
              ))}
            </div>
            <div className="mt-4 text-[11px] text-neutral-500">Smart alerts highlight motion zones in red whenever livestock or intruders enter high-risk areas.</div>
          </div>
        </div>
      )}
    </motion.section>
  );
}
