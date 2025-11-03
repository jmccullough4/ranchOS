import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { hasMapboxToken } from "../constants/map.js";
import { paddocks as defaultPaddocks, ranchBounds } from "../constants/ranch.js";
import { CameraFeed } from "./CameraFeed.jsx";
import { ChuteScanFeed } from "./ChuteScanFeed.jsx";
import { PastureMap } from "./PastureMap.jsx";
import { TelemetryPanel } from "./TelemetryPanel.jsx";
import { polygonAreaInAcres } from "../utils/geo.js";

const cameraFeeds = [
  { label: "CAM 1 — East Gate", src: "/cam1.mp4" },
  { label: "CAM 2 — Barn", src: "/cam2.mp4" },
  { label: "CAM 3 — North Road", src: "/cam3.mp4" },
  { label: "CAM 4 — Creek", src: "/cam4.mp4" },
];

const panelIds = {
  cameras: "cameras",
  telemetry: "telemetry",
  map: "map",
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

export function OperationsTab({ telemetry, herd, sms, options, onOptionsChange, onNotify }) {
  const [expandedPanel, setExpandedPanel] = useState(null);
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

  useEffect(() => {
    if (!expandedPanel) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setExpandedPanel(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [expandedPanel]);

  useEffect(() => {
    if (!selectedCowId) return;
    const stillPresent = herd.cows.some((cow) => cow.id === selectedCowId);
    if (!stillPresent) {
      setSelectedCowId(null);
    }
  }, [herd.cows, selectedCowId]);

  const selectedCow = useMemo(() => herd.cows.find((cow) => cow.id === selectedCowId) ?? null, [herd.cows, selectedCowId]);

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
    } catch (error) {
      setSearchError(error.message);
      onNotify?.("Unable to fetch parcel boundary. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const panelBaseClasses =
    "relative flex flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900 transition duration-300 ease-out ring-1 ring-neutral-900/40";

  const getPanelClasses = (panelId) => {
    const isExpanded = expandedPanel === panelId;
    return `${panelBaseClasses} xl:col-span-2 xl:row-span-1 ${
      isExpanded ? "ring-emerald-500/40 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]" : "hover:ring-emerald-500/30"
    }`;
  };

  const pastureList = useMemo(
    () =>
      pastures.map((feature) => ({
        id: feature.id,
        name: feature.properties?.name ?? "Untitled pasture",
        acres: feature.properties?.acres ?? null,
      })),
    [pastures],
  );

  const renderCameraPanel = (variant) => {
    const isExpanded = variant === "expanded";
    return (
      <div className={`grid ${isExpanded ? "gap-4 p-4" : "gap-2 p-3"} ${isExpanded ? "md:grid-cols-2" : "grid-cols-2"}`}>
        <ChuteScanFeed variant={variant} />
        {cameraFeeds.map((camera) => (
          <CameraFeed key={camera.label} label={camera.label} src={camera.src} variant={variant} />
        ))}
      </div>
    );
  };

  const renderTelemetryPanel = (variant) => (
    <div className={variant === "expanded" ? "p-4" : "p-3"}>
      <TelemetryPanel telemetry={telemetry} sms={sms} selectedCow={selectedCow} variant={variant} />
    </div>
  );

  const renderMapPanel = (variant) => {
    const isExpanded = variant === "expanded";
    return (
      <div className={isExpanded ? "flex-1 p-4" : "flex-1 p-3"}>
        <div className={`flex flex-col gap-3 ${isExpanded ? "lg:grid lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] lg:gap-6" : ""}`}>
          <div className="flex flex-col gap-3">
            <form
              onSubmit={handleLocate}
              className={`flex flex-col gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3 text-sm ${
                isExpanded ? "sm:flex-row sm:items-end" : "sm:flex-row sm:items-center"
              }`}
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
                className="mt-1 rounded-lg border border-emerald-500/40 bg-emerald-600/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-50 sm:mt-0"
              >
                {isSearching ? "Fetching…" : "Load boundary"}
              </button>
            </form>
            {searchError && (
              <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{searchError}</div>
            )}
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
              onSelectCow={(cow) => {
                setSelectedCowId(cow?.id ?? null);
              }}
              onDrawReady={setDrawReady}
              variant={variant}
            />
            <div
              className={`grid gap-2 text-xs text-neutral-300 ${
                isExpanded ? "sm:grid-cols-2 lg:grid-cols-3" : "md:grid-cols-2"
              }`}
            >
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
              <div className="text-right text-neutral-400">Tracking {herd.cows.length} head</div>
            </div>
          </div>
          <div className={`flex flex-col gap-3 ${isExpanded ? "lg:sticky lg:top-6 lg:h-fit" : ""}`}>
            <div className="grid gap-2 rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
              <div className="text-xs uppercase tracking-wide text-neutral-400">Drawn pastures</div>
              {pastureList.length === 0 && (
                <div className="text-xs text-neutral-500">
                  {drawReady
                    ? "Use the polygon tool in the map’s top-left corner to sketch paddocks."
                    : "Loading drawing tools… ensure network access to unpkg.com for Mapbox Draw."}
                </div>
              )}
              {pastureList.map((pasture) => (
                <div
                  key={pasture.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm"
                >
                  <span className="font-medium text-neutral-100">{pasture.name}</span>
                  {pasture.acres && <span className="text-xs text-neutral-500">{pasture.acres.toFixed(1)} ac</span>}
                </div>
              ))}
            </div>
            {selectedCow && (
              <div className="rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-3 text-sm text-emerald-100">
                <div className="text-xs uppercase tracking-wide text-emerald-300">Selected animal</div>
                <div className="mt-1 font-semibold text-emerald-100">{selectedCow.tag} · {selectedCow.id}</div>
                <div className="mt-1 grid gap-1 text-xs md:grid-cols-2">
                  <div>Weight: {selectedCow.weight} lb</div>
                  <div>Body condition: {selectedCow.bodyCondition}</div>
                  <div>Last check: {selectedCow.lastCheck}</div>
                  <div>Notes: {selectedCow.notes}</div>
                </div>
              </div>
            )}
            {!hasMapboxToken && (
              <div className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
                Satellite tiles require a Mapbox token. Without it, the demo falls back to MapLibre sample tiles so you can still showcase movement and overlays.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCompactPanel = (panelId) => {
    if (expandedPanel === panelId) {
      return (
        <div className="flex flex-1 items-center justify-center p-6 text-sm text-neutral-400">
          Opened in detail view
        </div>
      );
    }
    if (panelId === panelIds.cameras) return renderCameraPanel("compact");
    if (panelId === panelIds.telemetry) return renderTelemetryPanel("compact");
    return renderMapPanel("compact");
  };

  const renderExpandedPanel = (panelId) => {
    if (panelId === panelIds.cameras) return renderCameraPanel("expanded");
    if (panelId === panelIds.telemetry) return renderTelemetryPanel("expanded");
    return renderMapPanel("expanded");
  };

  const panelMeta = {
    [panelIds.cameras]: {
      title: "Security cameras",
      subtitle: "Frigate/IP edge ingest",
    },
    [panelIds.telemetry]: {
      title: "Telemetry",
      subtitle: "LoRaWAN → MQTT",
    },
    [panelIds.map]: {
      title: "Pasture management",
      subtitle: "Draw paddocks · Track herd",
    },
  };

  const expandedConfig = expandedPanel ? panelMeta[expandedPanel] : null;

  return (
    <>
      <motion.section
        key="ops"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.25 }}
      >
        <div className="grid gap-6 xl:auto-rows-[420px] xl:grid-cols-6">
          <section className={getPanelClasses(panelIds.cameras)}>
            <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div>
                <div className="font-medium">{panelMeta[panelIds.cameras].title}</div>
                <div className="text-xs text-neutral-400">{panelMeta[panelIds.cameras].subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPanel(panelIds.cameras)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-700"
              >
                View detail
              </button>
            </header>
            {renderCompactPanel(panelIds.cameras)}
          </section>

          <section className={getPanelClasses(panelIds.telemetry)}>
            <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
              <div>
                <div className="font-medium">{panelMeta[panelIds.telemetry].title}</div>
                <div className="text-xs text-neutral-400">{panelMeta[panelIds.telemetry].subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPanel(panelIds.telemetry)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-700"
              >
                View detail
              </button>
            </header>
            {renderCompactPanel(panelIds.telemetry)}
          </section>

          <section className={getPanelClasses(panelIds.map)}>
            <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 px-4 py-3">
              <div>
                <div className="font-medium">{panelMeta[panelIds.map].title}</div>
                <div className="text-xs text-neutral-400">{panelMeta[panelIds.map].subtitle}</div>
              </div>
              <button
                type="button"
                onClick={() => setExpandedPanel(panelIds.map)}
                className="rounded-xl border border-neutral-800 bg-neutral-950 px-3 py-1 text-xs text-neutral-300 hover:border-neutral-700"
              >
                View detail
              </button>
            </header>
            {renderCompactPanel(panelIds.map)}
          </section>
        </div>
      </motion.section>

      <AnimatePresence>
        {expandedPanel && expandedConfig && (
          <motion.div
            key="panel-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10 backdrop-blur"
            onClick={() => setExpandedPanel(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 180, damping: 20 }}
              className="relative w-full max-w-6xl overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-neutral-800 px-6 py-5">
                <div>
                  <div className="text-xs uppercase tracking-wide text-neutral-400">{expandedConfig.subtitle}</div>
                  <div className="text-2xl font-semibold text-neutral-100">{expandedConfig.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setExpandedPanel(null)}
                  className="rounded-xl border border-neutral-800 bg-neutral-900 px-4 py-2 text-xs font-medium text-neutral-300 hover:border-neutral-700"
                >
                  Close
                </button>
              </div>
              <div className="max-h-[80vh] overflow-y-auto">
                {renderExpandedPanel(expandedPanel)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
