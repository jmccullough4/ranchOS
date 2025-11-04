import { useEffect, useMemo, useState } from "react";
import { PastureMap } from "./PastureMap.jsx";
import { CameraFeed } from "./CameraFeed.jsx";
import { defaultRanchAddress, defaultRanchBoundary, paddocks as defaultPaddocks } from "../constants/ranch.js";
import { polygonAreaInAcres } from "../utils/geo.js";
import { formatRelativeFromNow } from "../utils/time.js";

const cameraFeeds = [
  { id: "cam1", label: "Barn alley", src: "/cam1.mp4" },
  { id: "cam2", label: "Chute staging", src: "/cam2.mp4" },
  { id: "cam3", label: "East gate", src: "/cam3.mp4" },
  { id: "cam4", label: "Creek crossing", src: "/cam4.mp4" },
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

export function MapScreen({ herd, options, onOptionsChange, onNotify }) {
  const [pastures, setPastures] = useState(() => paddocksToFeatures(defaultPaddocks));
  const [selectedCowId, setSelectedCowId] = useState(null);
  const [cameraWallOpen, setCameraWallOpen] = useState(false);

  useEffect(() => {
    if (!selectedCowId) return;
    const stillPresent = herd.cows.some((cow) => cow.id === selectedCowId);
    if (!stillPresent) {
      setSelectedCowId(null);
    }
  }, [herd.cows, selectedCowId]);

  const selectedCow = useMemo(
    () => herd.cows.find((cow) => cow.id === selectedCowId) ?? null,
    [herd.cows, selectedCowId],
  );

  const strayCows = useMemo(() => herd.cows.filter((cow) => cow.isStray), [herd.cows]);

  const lastRefreshTs = herd.cows.reduce((max, cow) => Math.max(max, cow.lastSeenTs ?? 0), 0);
  const lastRefreshed = lastRefreshTs ? formatRelativeFromNow(lastRefreshTs) : "moments ago";

  const herdAverage = useMemo(() => {
    if (herd.cows.length === 0) return null;
    const totals = herd.cows.reduce(
      (accumulator, cow) => {
        accumulator.weight += cow.weight;
        accumulator.gain += parseFloat(cow.avgDailyGain ?? 0);
        accumulator.temp += parseFloat(cow.temperature ?? 0);
        return accumulator;
      },
      { weight: 0, gain: 0, temp: 0 },
    );
    const count = herd.cows.length;
    return {
      avgWeight: Math.round(totals.weight / count),
      avgGain: (totals.gain / count).toFixed(1),
      avgTemp: (totals.temp / count).toFixed(1),
    };
  }, [herd.cows]);

  const threatActive = strayCows.length > 0;
  const address = defaultRanchAddress;

  const handleFocusStrays = () => {
    const primary = strayCows[0];
    if (primary) {
      setSelectedCowId(primary.id);
      onNotify?.(`Zoomed to ${primary.tag} on the perimeter.`);
    }
  };

  const handleToggleOption = (key) => (event) => {
    onOptionsChange?.({ ...options, [key]: event.target.checked });
  };

  const handleClearSelection = () => {
    setSelectedCowId(null);
  };

  return (
    <div className="relative h-full w-full">
      <div className="absolute inset-0">
        <PastureMap
          cows={herd.cows}
          trails={herd.trails}
          options={options}
          boundary={defaultRanchBoundary}
          pastures={pastures}
          onPasturesChange={(features) =>
            setPastures(
              features.map((feature, index) => {
                const coords = feature.geometry?.coordinates?.[0];
                const acres = coords ? polygonAreaInAcres(coords) : feature.properties?.acres;
                const featureId = feature.id ?? `drawn-${index}`;
                return {
                  ...feature,
                  id: featureId,
                  properties: { ...feature.properties, acres, __id: feature.properties?.__id ?? featureId },
                };
              }),
            )
          }
          selectedCowId={selectedCowId}
          selectedCow={selectedCow}
          onSelectCow={(cow) => setSelectedCowId(cow?.id ?? null)}
          variant="immersive"
          enableDrawing={false}
          showCowOverlay={false}
          showGroupOverlay={false}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-6 p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="pointer-events-auto max-w-xl rounded-3xl border border-neutral-800/80 bg-neutral-950/85 p-5 text-neutral-100 shadow-[0_0_40px_rgba(34,197,94,0.12)] backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.35em] text-emerald-300/80">Ranch operations HQ</div>
            <div className="mt-1 text-2xl font-semibold text-neutral-50">{address}</div>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-neutral-300">
              <span>{`Tracking ${herd.cows.length} head`}</span>
              <span className="h-1 w-1 rounded-full bg-neutral-700" aria-hidden />
              <span>Last refreshed {lastRefreshed}</span>
            </div>
            {herdAverage && (
              <div className="mt-4 grid gap-3 text-xs text-neutral-300 sm:grid-cols-3">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Avg weight</div>
                  <div className="mt-1 text-lg font-semibold text-neutral-100">{herdAverage.avgWeight} lb</div>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Avg daily gain</div>
                  <div className="mt-1 text-lg font-semibold text-neutral-100">{herdAverage.avgGain} lb</div>
                </div>
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2">
                  <div className="text-[10px] uppercase tracking-wide text-neutral-500">Body temp</div>
                  <div className="mt-1 text-lg font-semibold text-neutral-100">{herdAverage.avgTemp} °F</div>
                </div>
              </div>
            )}
          </div>

          <div className="pointer-events-auto flex flex-col gap-3 rounded-3xl border border-neutral-800/80 bg-neutral-950/85 p-5 text-xs text-neutral-200 backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Map layers</div>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
              <span className="text-sm text-neutral-200">Movement trails</span>
              <input type="checkbox" checked={options.breadcrumbs} onChange={handleToggleOption("breadcrumbs")} />
            </label>
            <label className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2">
              <span className="text-sm text-neutral-200">Grazing heatmap</span>
              <input type="checkbox" checked={options.heatmap} onChange={handleToggleOption("heatmap")} />
            </label>
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 px-3 py-2 text-[11px] text-neutral-400">
              Click any marker to open an animal profile. Shift + drag to sweep select a group and compare averages together.
            </div>
          </div>

          {selectedCow && (
            <div className="pointer-events-auto max-w-sm rounded-3xl border border-emerald-500/30 bg-neutral-950/90 p-5 text-neutral-100 shadow-[0_0_35px_rgba(16,185,129,0.25)] backdrop-blur">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Animal profile</div>
                  <div className="mt-2 text-xl font-semibold text-neutral-50">{selectedCow.tag}</div>
                  <div className="text-sm text-neutral-400">{selectedCow.id}</div>
                  {selectedCow.isStray && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-rose-500/50 bg-rose-500/20 px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-rose-100">
                      Stray perimeter
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleClearSelection}
                  className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-neutral-500"
                >
                  Clear
                </button>
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-neutral-200">
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Weight</dt>
                  <dd className="text-neutral-100">{selectedCow.weight} lb</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Condition</dt>
                  <dd className="text-neutral-100">{selectedCow.bodyCondition}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Breed</dt>
                  <dd className="text-neutral-100">{selectedCow.breed}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Age</dt>
                  <dd className="text-neutral-100">{selectedCow.ageYears} yrs</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Pregnancy</dt>
                  <dd className="text-neutral-100">{selectedCow.pregnancy}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Last treatment</dt>
                  <dd className="text-neutral-100">{selectedCow.lastTreatment}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Notes</dt>
                  <dd className="text-neutral-100">{selectedCow.notes}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Fence distance</dt>
                  <dd className="text-neutral-100">{Math.round(selectedCow.distanceToFence)} m</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Last seen</dt>
                  <dd className="text-neutral-100">{formatRelativeFromNow(selectedCow.lastSeenTs)}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="pointer-events-auto max-w-lg rounded-3xl border border-neutral-800/80 bg-neutral-950/85 p-5 text-neutral-200 backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Stray watch</div>
                <div className="mt-2 text-lg font-semibold text-neutral-100">{strayCows.length} strays outside herd flow</div>
              </div>
              <button
                type="button"
                onClick={handleFocusStrays}
                className="rounded-full border border-amber-400/40 bg-amber-500/10 px-4 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
              >
                Focus stray cluster
              </button>
            </div>
            <ul className="mt-3 max-h-40 space-y-2 overflow-y-auto pr-1">
              {strayCows.slice(0, 6).map((cow) => (
                <li
                  key={cow.id}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-2 text-sm text-neutral-200"
                >
                  <div>
                    <div className="font-semibold text-neutral-100">{cow.tag}</div>
                    <div className="text-[11px] text-neutral-500">Fence {Math.round(cow.distanceToFence)} m · Hub {Math.round(cow.distanceFromCenter)} m</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCowId(cow.id)}
                    className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-emerald-500/40"
                  >
                    View
                  </button>
                </li>
              ))}
              {strayCows.length === 0 && (
                <li className="rounded-2xl border border-neutral-800 bg-neutral-900/70 px-3 py-4 text-sm text-neutral-400">
                  Herd is within designated grazing cells.
                </li>
              )}
            </ul>
          </div>

          <div
            className={`pointer-events-auto w-full max-w-sm rounded-3xl border ${
              threatActive ? "border-rose-500/50 shadow-[0_0_30px_rgba(244,63,94,0.25)]" : "border-sky-500/30"
            } bg-neutral-950/90 p-4 text-neutral-200 backdrop-blur`}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-sky-300/80">Security wall</div>
                <div className="mt-2 text-lg font-semibold text-neutral-100">
                  {threatActive ? "Perimeter watch active" : "No threats detected"}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCameraWallOpen(true)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                  threatActive
                    ? "border-rose-400/60 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                    : "border-sky-400/60 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30"
                }`}
              >
                Open wall
              </button>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {cameraFeeds.map((feed) => (
                <div key={feed.id} className="overflow-hidden rounded-2xl border border-sky-400/20 bg-black/60">
                  <CameraFeed src={feed.src} label={feed.label} />
                </div>
              ))}
            </div>
          </div>

          <div className="pointer-events-auto max-w-xs rounded-3xl border border-neutral-800/80 bg-neutral-950/85 p-4 text-[11px] text-neutral-300 backdrop-blur">
            <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Legend</div>
            <div className="mt-3 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-3 w-3 rounded-full border border-yellow-500 bg-yellow-300/80" aria-hidden />
                Herd marker
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-3 w-3 rounded-full border border-rose-500 bg-rose-400/80" aria-hidden />
                Stray marker
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex h-3 w-3 rounded-full border border-emerald-400 bg-emerald-500/20" aria-hidden />
                Selection highlight
              </div>
            </div>
          </div>
        </div>
      </div>

      {cameraWallOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-neutral-950/80 p-4 backdrop-blur">
          <div className="w-full max-w-5xl rounded-3xl border border-neutral-800 bg-neutral-950/95 p-6 text-neutral-100 shadow-[0_0_45px_rgba(56,189,248,0.35)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.35em] text-sky-300">Security wall</div>
                <div className="mt-1 text-2xl font-semibold text-neutral-50">Multi-camera perimeter overview</div>
                <p className="mt-1 text-sm text-neutral-400">
                  Expanded feeds with motion analytics overlays for barn, chute staging, east gate, and creek crossings.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCameraWallOpen(false)}
                className="rounded-full border border-neutral-700 bg-neutral-900 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-neutral-300 hover:border-sky-400/60"
              >
                Close
              </button>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {cameraFeeds.map((feed) => (
                <CameraFeed key={`${feed.id}-modal`} src={feed.src} label={feed.label} variant="expanded" />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
