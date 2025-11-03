import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { hasMapboxToken } from "../constants/map.js";
import { paddocks as defaultPaddocks, ranchBounds } from "../constants/ranch.js";
import { PastureMap } from "./PastureMap.jsx";
import { SensorNotifications } from "./SensorNotifications.jsx";
import { polygonAreaInAcres } from "../utils/geo.js";
import { formatRelativeFromNow } from "../utils/time.js";

const cameraHubLink = {
  label: "Open security camera wall",
  href: "/cam1.mp4",
};

function paddocksToFeatures(paddocks) {
  return paddocks.map((paddock, index) => ({
    type: "Feature",
    id: paddock.id ?? `default-${index}`,
    properties: {
      name: paddock.name ?? `Pasture ${index + 1}`,
      acres: polygonAreaInAcres(paddock.coords),
    },
    geometry: { type: "Polygon", coordinates: [paddock.coords] },
  }));
}

export function Dashboard({ telemetry, herd, sms, options, onOptionsChange, onNotify, reportStatus, onSendReport }) {
  const mapSectionRef = useRef(null);
  const [address, setAddress] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [boundary, setBoundary] = useState(() => ({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { name: "Demo Ranch" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [ranchBounds.minLon, ranchBounds.minLat],
              [ranchBounds.maxLon, ranchBounds.minLat],
              [ranchBounds.maxLon, ranchBounds.maxLat],
              [ranchBounds.minLon, ranchBounds.maxLat],
              [ranchBounds.minLon, ranchBounds.minLat],
            ],
          ],
        },
      },
    ],
  }));
  const [pastures, setPastures] = useState(() => paddocksToFeatures(defaultPaddocks));
  const [selectedCowId, setSelectedCowId] = useState(null);
  const [drawReady, setDrawReady] = useState(false);
  const [reportChannels, setReportChannels] = useState({ sms: true, backhaul: true });

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

  const strayCows = useMemo(() => {
    const list = herd.cows.filter((cow) => cow.isStray);
    return list
      .slice()
      .sort((a, b) => a.distanceToFence - b.distanceToFence)
      .slice(0, 6);
  }, [herd.cows]);

  const scrollMapIntoView = () => {
    mapSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const focusMapWithCow = (cowId) => {
    if (cowId) {
      setSelectedCowId(cowId);
    }
    scrollMapIntoView();
  };

  const handleLocate = async (event) => {
    event.preventDefault();
    if (!address.trim()) return;
    setIsSearching(true);
    setSearchError("");
    try {
      const query = encodeURIComponent(address.trim());
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=geojson&polygon_geojson=1&q=${query}`, {
        headers: { Accept: "application/geo+json,application/json" },
      });
      if (!response.ok) throw new Error("Address lookup failed");
      const geojson = await response.json();
      const feature = geojson.features?.find((item) => item.geometry?.type?.includes("Polygon"));
      if (!feature) {
        setSearchError("No parcel boundary found for that address. Try refining the search.");
        return;
      }
      setBoundary({ type: "FeatureCollection", features: [feature] });
      onNotify?.(`Loaded ranch boundary for ${feature.properties?.display_name ?? "address"}`);
      scrollMapIntoView();
    } catch (error) {
      setSearchError(error.message);
      onNotify?.("Unable to fetch parcel boundary. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemovePasture = (id) => {
    setPastures((previous) => previous.filter((feature) => feature.id !== id));
    onNotify?.("Removed pasture boundary.");
  };

  const handleViewStrays = () => {
    const primary = strayCows[0] ?? herd.cows.find((cow) => cow.isStray);
    if (primary) {
      setSelectedCowId(primary.id);
    }
    scrollMapIntoView();
  };

  return (
    <motion.section key="dashboard" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="space-y-6">
        <SensorNotifications
          telemetry={telemetry}
          herd={herd}
          lastMessage={sms}
          onViewMap={handleViewStrays}
          reportStatus={reportStatus}
          channels={reportChannels}
          onChannelChange={setReportChannels}
          onSendReport={onSendReport}
        />

        <section
          ref={mapSectionRef}
          id="dashboard-map"
          className="rounded-3xl border border-neutral-800 bg-neutral-950/90 shadow-2xl shadow-emerald-500/5"
        >
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-5 py-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">Pasture management</div>
              <h2 className="text-xl font-semibold text-neutral-50">Interactive ranch map</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-sm text-neutral-400">
              <span>Tracking {herd.cows.length} head</span>
              <button
                type="button"
                onClick={handleViewStrays}
                className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
              >
                View stray cluster
              </button>
            </div>
          </header>

          <div className="flex flex-col gap-5 p-5">
            <form
              onSubmit={handleLocate}
              className="flex flex-col gap-3 rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm sm:flex-row sm:items-end"
            >
              <label className="flex-1 text-xs uppercase tracking-wide text-neutral-400">
                Ranch address
                <input
                  type="text"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="123 County Rd, Myakka City"
                  className="mt-1 w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                />
              </label>
              <button
                type="submit"
                disabled={isSearching}
                className="rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50"
              >
                {isSearching ? "Fetching…" : "Load boundary"}
              </button>
            </form>
            {searchError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{searchError}</div>
            )}

            <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,2.75fr)_minmax(0,1.1fr)] lg:gap-6">
              <div className="flex flex-col gap-4">
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
                        return {
                          ...feature,
                          id: feature.id ?? `drawn-${index}`,
                          properties: { ...feature.properties, acres },
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
                    Tip: Shift + drag on the map to box-select animals and review grazing stats as a batch.
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
                      {drawReady
                        ? "Use the polygon tool in the map to sketch paddocks."
                        : "Ensure network access to load drawing controls."}
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

                {strayCows.length > 0 ? (
                  <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-amber-300">Stray watch</div>
                        <div className="text-xs text-amber-200">{strayCows.length} animal{strayCows.length === 1 ? "" : "s"} flagged</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => focusMapWithCow(strayCows[0].id)}
                        className="rounded-lg border border-amber-500/50 bg-amber-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-100 hover:bg-amber-500/20"
                      >
                        Focus first
                      </button>
                    </div>
                    <ul className="mt-2 flex flex-col gap-2">
                      {strayCows.map((cow) => (
                        <li key={cow.id}>
                          <button
                            type="button"
                            onClick={() => focusMapWithCow(cow.id)}
                            className="flex w-full flex-col gap-1 rounded-xl border border-amber-500/30 bg-neutral-900/80 px-3 py-2 text-left text-[11px] text-amber-100 hover:border-amber-400"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-amber-200">{cow.tag}</span>
                              <span className="text-[10px] text-amber-300">{formatRelativeFromNow(cow.lastSeenTs)}</span>
                            </div>
                            <div className="text-[10px] text-amber-200">
                              {cow.id} · Fence {Math.max(0, Math.round(cow.distanceToFence))} m · Hub {Math.round(cow.distanceFromCenter)} m
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-xs text-emerald-200">
                    <div className="text-[10px] uppercase tracking-wide text-emerald-300">Stray watch</div>
                    <div className="mt-1 text-xs">All animals within safe radius.</div>
                  </div>
                )}

                {selectedCow && (
                  <div className="rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                    <div className="text-xs uppercase tracking-wide text-emerald-300">Selected animal</div>
                    <div className="mt-1 font-semibold text-emerald-100">{selectedCow.tag} · {selectedCow.id}</div>
                    <div className="mt-1 grid gap-1 text-xs md:grid-cols-2">
                      <div>Weight: {selectedCow.weight} lb</div>
                      <div>Body condition: {selectedCow.bodyCondition}</div>
                      <div>Distance to hub: {Math.round(selectedCow.distanceFromCenter)} m</div>
                      <div>Nearest fence: {Math.round(selectedCow.distanceToFence)} m</div>
                      <div>Last check: {selectedCow.lastCheck}</div>
                      <div>Notes: {selectedCow.notes}</div>
                    </div>
                    {selectedCow.immunizations?.length ? (
                      <div className="mt-2 space-y-1 text-[11px]">
                        <div className="text-[10px] uppercase tracking-wide text-emerald-300">Immunizations</div>
                        {selectedCow.immunizations.map((record) => (
                          <div key={record.id} className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1">
                            <div className="flex items-center justify-between gap-2 text-emerald-100">
                              <span className="font-semibold">{record.label}</span>
                              <span className="text-[10px] text-emerald-200">{record.date}</span>
                            </div>
                            <div className="text-[10px] text-emerald-200/80">{record.category} · {record.location} · {record.lot}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-4 text-sm text-neutral-300">
                  <div className="text-[11px] uppercase tracking-wide text-neutral-500">Security cameras</div>
                  <p className="mt-1 text-xs text-neutral-400">
                    Live edge recording is available from the barn, east gate, and creek monitors.
                  </p>
                  <a
                    href={cameraHubLink.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex items-center gap-2 rounded-xl border border-sky-400/40 bg-sky-500/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-sky-200 hover:bg-sky-500/20"
                  >
                    {cameraHubLink.label}
                  </a>
                </div>

                {!hasMapboxToken && (
                  <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
                    Satellite tiles require a Mapbox token. Without it, the demo falls back to MapLibre sample tiles so you can still
                    showcase movement and overlays.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </motion.section>
  );
}
