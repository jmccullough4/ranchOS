import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import { ranchBounds, ranchCenter } from "../constants/ranch.js";
import { hasMapboxToken, mapboxToken } from "../constants/map.js";
import { formatRelativeFromNow } from "../utils/time.js";

const cowsSourceId = "cows";
const trailsSourceId = "cow-trails";
const heatmapSourceId = "cow-heatmap";
const paddockSourceId = "paddocks";
const ranchSourceId = "ranch-bounds";
const selectedCowLayerId = "cow-selected";
const activePastureLayerId = "paddock-active";
const drawStylesheetId = "mapbox-draw-stylesheet";

function createStyle() {
  if (!hasMapboxToken) {
    return "https://demotiles.maplibre.org/style.json";
  }

  return {
    version: 8,
    sources: {
      satellite: {
        type: "raster",
        tiles: [`https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`],
        tileSize: 256,
        attribution: "© Mapbox © OpenStreetMap contributors",
      },
      dark: {
        type: "raster",
        tiles: [`https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxToken}`],
        tileSize: 256,
        attribution: "© Mapbox © OpenStreetMap contributors",
      },
    },
    layers: [
      {
        id: "satellite",
        type: "raster",
        source: "satellite",
        layout: { visibility: "visible" },
      },
      {
        id: "dark",
        type: "raster",
        source: "dark",
        layout: { visibility: "none" },
      },
    ],
  };
}

function getFeatureCollection(features = []) {
  return { type: "FeatureCollection", features };
}

function computeBounds(featureCollection) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const feature of featureCollection.features ?? []) {
    const coordinates = feature.geometry?.type === "Polygon" ? feature.geometry.coordinates : feature.geometry?.coordinates;
    const rings = feature.geometry?.type === "Polygon" ? coordinates : feature.geometry?.type === "MultiPolygon" ? coordinates.flat() : [];
    for (const ring of rings) {
      for (const [lon, lat] of ring) {
        if (lon < minX) minX = lon;
        if (lon > maxX) maxX = lon;
        if (lat < minY) minY = lat;
        if (lat > maxY) maxY = lat;
      }
    }
  }
  if (!Number.isFinite(minX)) {
    return [
      [ranchBounds.minLon, ranchBounds.minLat],
      [ranchBounds.maxLon, ranchBounds.maxLat],
    ];
  }
  return [
    [minX, minY],
    [maxX, maxY],
  ];
}

export function PastureMap({
  cows,
  trails,
  options,
  boundary,
  pastures,
  onPasturesChange,
  selectedCowId,
  selectedCow,
  onSelectCow,
  onDrawReady,
  variant = "compact",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const suppressDrawEventsRef = useRef(false);
  const cowsRef = useRef(cows);
  const onPasturesChangeRef = useRef(onPasturesChange);
  const onSelectCowRef = useRef(onSelectCow);
  const optionsRef = useRef(options);
  const onDrawReadyRef = useRef(onDrawReady);
  const [groupSelectionIds, setGroupSelectionIds] = useState([]);
  const [activePastureId, setActivePastureId] = useState(null);
  const [pastureNameDraft, setPastureNameDraft] = useState("");
  const [drawReadyInternal, setDrawReadyInternal] = useState(false);
  const [activeDrawMode, setActiveDrawMode] = useState("simple_select");

  useEffect(() => {
    cowsRef.current = cows;
  }, [cows]);

  useEffect(() => {
    onPasturesChangeRef.current = onPasturesChange;
  }, [onPasturesChange]);

  useEffect(() => {
    onSelectCowRef.current = onSelectCow;
  }, [onSelectCow]);

  const overlayCow = groupSelectionIds.length
    ? null
    : selectedCow ?? cows.find((item) => item.id === selectedCowId) ?? null;

  const groupSelection = useMemo(
    () => cows.filter((cow) => groupSelectionIds.includes(cow.id)),
    [cows, groupSelectionIds],
  );

  const activePasture = useMemo(
    () => pastures.find((feature) => feature.id === activePastureId) ?? null,
    [pastures, activePastureId],
  );

  const groupStats = useMemo(() => {
    if (groupSelection.length === 0) return null;
    const count = groupSelection.length;
    const totals = groupSelection.reduce(
      (accumulator, cow) => {
        accumulator.weight += cow.weight;
        accumulator.distance += cow.distanceFromCenter;
        accumulator.temp += parseFloat(cow.temperature);
        if (cow.isStray) accumulator.strays += 1;
        return accumulator;
      },
      { weight: 0, distance: 0, temp: 0, strays: 0 },
    );
    return {
      count,
      avgWeight: totals.weight / count,
      avgDistance: totals.distance / count,
      avgTemp: totals.temp / count,
      strayCount: totals.strays,
    };
  }, [groupSelection]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    if (activePastureId && !pastures.some((feature) => feature.id === activePastureId)) {
      setActivePastureId(null);
    }
  }, [pastures, activePastureId]);

  useEffect(() => {
    if (activePasture) {
      setPastureNameDraft(activePasture.properties?.name ?? "");
    } else {
      setPastureNameDraft("");
    }
  }, [activePasture]);

  useEffect(() => {
    onDrawReadyRef.current = onDrawReady;
  }, [onDrawReady]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const ensureDrawStyles = () => {
      if (typeof document === "undefined") return;
      if (document.getElementById(drawStylesheetId)) return;
      const link = document.createElement("link");
      link.id = drawStylesheetId;
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.css";
      document.head.appendChild(link);
    };

    const loadDraw = () => {
      if (typeof window === "undefined") return Promise.resolve(null);
      ensureDrawStyles();
      if (window.MapboxDraw) return Promise.resolve(window.MapboxDraw);
      if (window.__ranchosDrawPromise) return window.__ranchosDrawPromise;
      window.__ranchosDrawPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/@mapbox/mapbox-gl-draw@1.5.0/dist/mapbox-gl-draw.js";
        script.async = true;
        script.onload = () => resolve(window.MapboxDraw);
        script.onerror = (error) => reject(error);
        document.head.appendChild(script);
      });
      return window.__ranchosDrawPromise;
    };

    let cancelled = false;

    loadDraw()
      .catch(() => null)
      .then((DrawCtor) => {
        if (cancelled || mapRef.current) return;

        const map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: createStyle(),
          center: [ranchCenter.lon, ranchCenter.lat],
          zoom: 16,
          attributionControl: true,
        });
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");

        let draw = null;
        if (DrawCtor) {
          draw = new DrawCtor({ displayControlsDefault: false, controls: {}, defaultMode: "simple_select" });
          map.addControl(draw, "top-left");
          drawRef.current = draw;
          setDrawReadyInternal(true);
          setActiveDrawMode(draw?.getMode ? draw.getMode() : "simple_select");
          draw?.on("draw.modechange", (event) => {
            setActiveDrawMode(event.mode);
          });
          onDrawReadyRef.current?.(true);
        } else {
          onDrawReadyRef.current?.(false);
          setDrawReadyInternal(false);
        }

        const handleDrawChange = () => {
          if (!draw || suppressDrawEventsRef.current) return;
          const collection = draw.getAll();
          const features = collection.features.map((feature, index) => {
            const name = feature.properties?.name ?? `Pasture ${index + 1}`;
            draw.setFeatureProperty(feature.id, "name", name);
            draw.setFeatureProperty(feature.id, "__id", feature.id);
            return { ...feature, properties: { ...feature.properties, name, __id: feature.id } };
          });
          const newest = features.at(-1);
          if (newest) {
            setActivePastureId(newest.id ?? newest.properties?.__id ?? null);
          } else {
            setActivePastureId(null);
          }
          onPasturesChangeRef.current?.(features);
        };

        map.on("load", () => {
          map.addSource(paddockSourceId, { type: "geojson", data: getFeatureCollection(pastures) });
          map.addLayer({
            id: "paddock-fill",
            type: "fill",
            source: paddockSourceId,
        paint: { "fill-color": "#22c55e", "fill-opacity": 0.12 },
      });
      map.addLayer({
        id: "paddock-outline",
        type: "line",
        source: paddockSourceId,
        paint: { "line-color": "#22c55e", "line-width": 1.5 },
      });
      map.addLayer({
        id: activePastureLayerId,
        type: "line",
        source: paddockSourceId,
        paint: {
          "line-color": "#f97316",
          "line-width": 3,
          "line-opacity": 0.85,
        },
        filter: ["==", ["get", "__id"], ""],
      });
      map.addLayer({
        id: "paddock-label",
        type: "symbol",
        source: paddockSourceId,
        layout: { "text-field": ["get", "name"], "text-size": 12 },
        paint: { "text-color": "#e5e7eb", "text-halo-color": "#111827", "text-halo-width": 1 },
      });

      const handleSelectPasture = (event) => {
        const feature = event.features?.[0];
        if (!feature) return;
        const id = feature.properties?.__id ?? feature.id;
        setActivePastureId(id ?? null);
      };

      map.on("click", "paddock-fill", handleSelectPasture);
      map.on("click", "paddock-outline", handleSelectPasture);
      map.on("click", "paddock-label", handleSelectPasture);
      map.on("mouseenter", "paddock-fill", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "paddock-fill", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "paddock-outline", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "paddock-outline", () => {
        map.getCanvas().style.cursor = "";
      });
      map.on("mouseenter", "paddock-label", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "paddock-label", () => {
        map.getCanvas().style.cursor = "";
      });

      map.addSource(ranchSourceId, { type: "geojson", data: boundary ?? getFeatureCollection() });
      map.addLayer({ id: "ranch-outline", type: "line", source: ranchSourceId, paint: { "line-color": "#60a5fa", "line-width": 2 } });

      map.addSource(cowsSourceId, { type: "geojson", data: getFeatureCollection() });
      map.addLayer({
        id: "cow-dots",
        type: "circle",
        source: cowsSourceId,
        paint: {
          "circle-radius": [
            "case",
            ["==", ["get", "isStray"], true],
            5.5,
            4,
          ],
          "circle-color": [
            "case",
            ["==", ["get", "isStray"], true],
            "#f87171",
            "#fde68a",
          ],
          "circle-stroke-color": [
            "case",
            ["==", ["get", "isStray"], true],
            "#b91c1c",
            "#78350f",
          ],
          "circle-stroke-width": 1.25,
        },
      });

      map.addLayer({
        id: selectedCowLayerId,
        type: "circle",
        source: cowsSourceId,
        paint: {
          "circle-radius": 10,
          "circle-color": "#facc15",
          "circle-opacity": 0.25,
          "circle-stroke-color": "#fde68a",
          "circle-stroke-width": 2,
          "circle-blur": 0.4,
        },
        filter: ["==", ["get", "id"], ""],
      });

      map.addSource(trailsSourceId, { type: "geojson", data: getFeatureCollection() });
      map.addLayer({
        id: "cow-trails",
        type: "line",
        source: trailsSourceId,
        layout: { visibility: optionsRef.current.breadcrumbs ? "visible" : "none" },
        paint: { "line-color": "#eab308", "line-width": 1.2, "line-opacity": 0.6 },
      });

      map.addSource(heatmapSourceId, { type: "geojson", data: getFeatureCollection() });
      map.addLayer({
        id: "cow-heatmap",
        type: "heatmap",
        source: heatmapSourceId,
        maxzoom: 18,
        paint: {
          "heatmap-weight": 0.5,
          "heatmap-intensity": 1.4,
          "heatmap-radius": 24,
          "heatmap-opacity": 0.55,
          "heatmap-color": [
            "interpolate",
            ["linear"],
            ["heatmap-density"],
            0,
            "rgba(0,0,0,0)",
            0.3,
            "rgba(22,163,74,0.3)",
            0.6,
            "rgba(250,204,21,0.5)",
            1,
            "rgba(239,68,68,0.6)",
          ],
        },
        layout: { visibility: optionsRef.current.heatmap ? "visible" : "none" },
      });

          draw?.on("draw.create", handleDrawChange);
          draw?.on("draw.update", handleDrawChange);
          draw?.on("draw.delete", handleDrawChange);

          map.on("click", "cow-dots", (event) => {
            const feature = event.features?.[0];
            if (!feature) return;
            const cow = cowsRef.current.find((item) => item.id === feature.properties?.id);
            if (!cow) return;
            setGroupSelectionIds([]);
            onSelectCowRef.current?.(cow);
          });

      map.on("mouseenter", "cow-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cow-dots", () => {
        map.getCanvas().style.cursor = "";
      });

          map.on("boxzoomend", (event) => {
            const bounds = event?.boxZoomBounds;
            if (!bounds) return;
            const selected = cowsRef.current.filter(
              (cow) =>
                cow.lon >= bounds.getWest() &&
                cow.lon <= bounds.getEast() &&
                cow.lat >= bounds.getSouth() &&
                cow.lat <= bounds.getNorth(),
            );
            const ids = selected.map((cow) => cow.id);
            setGroupSelectionIds(ids);
            if (ids.length) {
              onSelectCowRef.current?.(null);
            }
          });

          const bounds = computeBounds(boundary ?? getFeatureCollection());
          map.fitBounds(bounds, { padding: 40, maxZoom: 18 });
        });

        mapRef.current = map;
      });

    return () => {
      cancelled = true;
      drawRef.current = null;
      setDrawReadyInternal(false);
      setActiveDrawMode("simple_select");
      onDrawReadyRef.current?.(false);
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setVisibility = (id, visible) => {
      if (map.getLayer(id)) {
        map.setLayoutProperty(id, "visibility", visible ? "visible" : "none");
      }
    };

    if (hasMapboxToken) {
      setVisibility("satellite", options.basemap === "satellite");
      setVisibility("dark", options.basemap === "dark");
    }

    setVisibility("cow-trails", options.breadcrumbs);
    setVisibility("cow-heatmap", options.heatmap);
  }, [options]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const source = map.getSource(cowsSourceId);
    if (source) {
      source.setData({
        type: "FeatureCollection",
        features: cows.map((cow) => ({
          type: "Feature",
          properties: {
            id: cow.id,
            tag: cow.tag,
            weight: cow.weight,
            bodyCondition: cow.bodyCondition,
            lastCheck: cow.lastCheck,
            notes: cow.notes,
            lastTreatment: cow.lastTreatment,
            breed: cow.breed,
            ageYears: cow.ageYears,
            pregnancy: cow.pregnancy,
            avgDailyGain: cow.avgDailyGain,
            temperature: cow.temperature,
            healthNote: cow.healthNote,
            distanceFromCenter: cow.distanceFromCenter,
            distanceToFence: cow.distanceToFence,
            isStray: cow.isStray,
            lastSeenTs: cow.lastSeenTs,
          },
          geometry: { type: "Point", coordinates: [cow.lon, cow.lat] },
        })),
      });
    }

    const trailSource = map.getSource(trailsSourceId);
    if (trailSource) {
      const features = [];
      let count = 0;
      for (const [id, points] of trails.entries()) {
        if (count >= 40) break;
        if (points.length > 1) {
          features.push({
            type: "Feature",
            properties: { id },
            geometry: { type: "LineString", coordinates: points.map((point) => [point.lon, point.lat]) },
          });
        }
        count += 1;
      }
      trailSource.setData({ type: "FeatureCollection", features });
    }

    const heatSource = map.getSource(heatmapSourceId);
    if (heatSource) {
      const heatFeatures = [];
      for (const points of trails.values()) {
        for (const point of points) {
          heatFeatures.push({ type: "Feature", properties: {}, geometry: { type: "Point", coordinates: [point.lon, point.lat] } });
        }
      }
      heatSource.setData({ type: "FeatureCollection", features: heatFeatures });
    }
  }, [cows, trails]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !boundary) return;
    const source = map.getSource(ranchSourceId);
    if (source) {
      source.setData(boundary);
      const bounds = computeBounds(boundary);
      map.fitBounds(bounds, { padding: 40, maxZoom: 18, duration: 800 });
    }
  }, [boundary]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const draw = drawRef.current;
    const collection = getFeatureCollection(pastures);
    const source = map.getSource(paddockSourceId);
    if (source) {
      source.setData(collection);
    }
    if (draw) {
      suppressDrawEventsRef.current = true;
      draw.deleteAll();
      pastures.forEach((feature) => {
        draw.add(feature);
      });
      suppressDrawEventsRef.current = false;
    }
  }, [pastures]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(activePastureLayerId)) {
      if (activePastureId) {
        map.setFilter(activePastureLayerId, ["==", ["get", "__id"], activePastureId]);
      } else {
        map.setFilter(activePastureLayerId, ["==", ["get", "__id"], ""]);
      }
    }
  }, [activePastureId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const activeCow = selectedCow ?? cows.find((item) => item.id === selectedCowId);
    if (map.getLayer(selectedCowLayerId)) {
      if (groupSelectionIds.length > 0) {
        map.setFilter(selectedCowLayerId, ["in", ["get", "id"], ["literal", groupSelectionIds]]);
      } else {
        map.setFilter(selectedCowLayerId, ["==", ["get", "id"], activeCow?.id ?? ""]);
      }
    }
  }, [selectedCow, selectedCowId, cows, groupSelectionIds]);

  const handleClearSelection = () => {
    onSelectCowRef.current?.(null);
    setGroupSelectionIds([]);
  };

  const heightClass = variant === "expanded" ? "h-[420px] sm:h-[520px] lg:h-[600px]" : "h-[320px] sm:h-[340px]";

  const handleClearGroup = () => {
    setGroupSelectionIds([]);
    onSelectCowRef.current?.(null);
  };

  const handleStartDraw = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.changeMode("draw_polygon");
    setActiveDrawMode("draw_polygon");
  };

  const handleFinishDraw = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.changeMode("simple_select");
    setActiveDrawMode("simple_select");
  };

  const handleDeleteSelection = () => {
    const draw = drawRef.current;
    if (!draw) return;
    draw.trash();
  };

  const handleRenameActivePasture = (event) => {
    if (event) event.preventDefault();
    if (!activePastureId) return;
    const nextName = pastureNameDraft.trim();
    if (!nextName) return;
    const updated = pastures.map((feature) =>
      feature.id === activePastureId
        ? {
            ...feature,
            properties: {
              ...feature.properties,
              name: nextName,
              __id: feature.properties?.__id ?? feature.id,
            },
          }
        : feature,
    );
    onPasturesChangeRef.current?.(updated);
  };

  const handleDeleteActivePasture = () => {
    if (!activePastureId) return;
    const filtered = pastures.filter((feature) => feature.id !== activePastureId);
    setActivePastureId(null);
    onPasturesChangeRef.current?.(filtered);
  };

  const handleCloseActivePasture = () => {
    setActivePastureId(null);
  };

  return (
    <div className={`relative ${heightClass} overflow-hidden rounded-2xl`}>
      {overlayCow && (
        <div className="pointer-events-none absolute left-3 top-3 z-20 w-64 max-w-[calc(100%-1.5rem)]">
          <div className="pointer-events-auto rounded-2xl border border-emerald-500/40 bg-neutral-950/95 p-3 text-xs text-neutral-200 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-emerald-300">Focus animal</div>
                <div className="mt-1 text-sm font-semibold text-neutral-50">{overlayCow.tag}</div>
                <div className="text-[11px] text-neutral-400">{overlayCow.id}</div>
                {overlayCow.isStray && (
                  <div className="mt-1 inline-flex items-center gap-1 rounded-full border border-rose-500/40 bg-rose-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-200">
                    Stray alert
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-300 hover:border-neutral-500"
              >
                Clear
              </button>
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Weight</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.weight} lb</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Condition</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.bodyCondition}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Breed</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.breed}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Age</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.ageYears} yrs</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Last treatment</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.lastTreatment}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Last check</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.lastCheck}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Last ping</dt>
                <dd className="text-sm text-neutral-100">{formatRelativeFromNow(overlayCow.lastSeenTs)}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Distance to hub</dt>
                <dd className="text-sm text-neutral-100">{Math.round(overlayCow.distanceFromCenter)} m</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Nearest fence</dt>
                <dd className="text-sm text-neutral-100">{Math.round(overlayCow.distanceToFence)} m</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Pregnancy</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.pregnancy}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Avg daily gain</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.avgDailyGain} lb</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Temperature</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.temperature} °F</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Notes</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.notes}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Health focus</dt>
                <dd className="text-sm text-neutral-100">{overlayCow.healthNote}</dd>
              </div>
              {overlayCow.immunizations && overlayCow.immunizations.length > 0 && (
                <div className="col-span-2">
                  <dt className="text-[10px] uppercase tracking-wide text-neutral-500">Immunizations</dt>
                  <dd className="mt-1 flex flex-col gap-1">
                    {overlayCow.immunizations.map((record) => (
                      <div
                        key={record.id}
                        className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-[11px] text-neutral-300"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-neutral-100">{record.label}</span>
                          <span className="text-[10px] text-neutral-500">{record.date}</span>
                        </div>
                        <div className="text-[10px] text-neutral-400">{record.category} · {record.location} · {record.lot}</div>
                      </div>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      )}
      {drawReadyInternal && (
        <div className="pointer-events-none absolute right-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-col gap-2">
          <div className="pointer-events-auto rounded-2xl border border-neutral-800/70 bg-neutral-950/90 p-3 text-[11px] text-neutral-200 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleStartDraw}
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
              >
                Draw pasture
              </button>
              <button
                type="button"
                onClick={handleFinishDraw}
                disabled={activeDrawMode !== "draw_polygon"}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-3 py-1 font-semibold uppercase tracking-wide text-neutral-200 hover:border-emerald-500/50 disabled:opacity-50"
              >
                Finish shape
              </button>
              <button
                type="button"
                onClick={handleDeleteSelection}
                className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1 font-semibold uppercase tracking-wide text-rose-100 hover:bg-rose-500/20"
              >
                Delete selection
              </button>
            </div>
            <div className="mt-2 text-[10px] text-neutral-500">
              Use draw to sketch grazing cells, finish to return to select mode, and delete to remove highlighted shapes.
            </div>
          </div>
        </div>
      )}
      <div ref={mapContainerRef} className="h-full w-full" />
      {activePasture && (
        <div className="pointer-events-none absolute left-3 bottom-3 z-20 w-72 max-w-[calc(100%-1.5rem)]">
          <form
            onSubmit={handleRenameActivePasture}
            className="pointer-events-auto rounded-2xl border border-emerald-500/40 bg-neutral-950/95 p-3 text-xs text-neutral-200 shadow-lg backdrop-blur"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Pasture tools</div>
                <div className="mt-1 text-sm font-semibold text-neutral-50">
                  {activePasture.properties?.name || "Untitled pasture"}
                </div>
                <div className="text-[11px] text-neutral-400">
                  {activePasture.properties?.acres ? `${activePasture.properties.acres.toFixed(1)} acres` : "Area calculating…"}
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseActivePasture}
                className="rounded-full border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] uppercase tracking-wide text-neutral-300 hover:border-emerald-500/50"
              >
                Close
              </button>
            </div>
            <label className="mt-3 flex flex-col gap-1 text-[11px] text-neutral-400">
              Rename pasture
              <input
                type="text"
                value={pastureNameDraft}
                onChange={(event) => setPastureNameDraft(event.target.value)}
                className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                placeholder="North lot"
              />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-100 hover:bg-emerald-500/20"
              >
                Save name
              </button>
              <button
                type="button"
                onClick={handleDeleteActivePasture}
                className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-rose-100 hover:bg-rose-500/20"
              >
                Delete
              </button>
            </div>
            <div className="mt-3 rounded-xl border border-neutral-800 bg-neutral-900/80 p-2 text-[11px] text-neutral-400">
              Click a pasture to edit its shape, rename it, or delete it. Use the draw tools to add another grazing cell.
            </div>
          </form>
        </div>
      )}
      {groupStats && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-10 w-72 max-w-[calc(100%-1.5rem)]">
          <div className="pointer-events-auto rounded-2xl border border-emerald-500/40 bg-neutral-950/95 p-3 text-xs text-neutral-200 shadow-lg backdrop-blur">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Selection batch</div>
                <div className="mt-1 text-sm font-semibold text-neutral-50">{groupStats.count} animals</div>
                <div className="text-[11px] text-neutral-400">Avg weight {Math.round(groupStats.avgWeight)} lb · Hub {Math.round(groupStats.avgDistance)} m</div>
                <div className="text-[11px] text-neutral-400">Avg temp {groupStats.avgTemp.toFixed(1)} °F · Strays {groupStats.strayCount}</div>
              </div>
              <button
                type="button"
                onClick={handleClearGroup}
                className="rounded-lg border border-neutral-700 bg-neutral-900 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-200 hover:border-emerald-500/50"
              >
                Clear
              </button>
            </div>
            <ul className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1 text-[11px]">
              {groupSelection.map((cow) => (
                <li key={cow.id} className="rounded-lg border border-neutral-800 bg-neutral-900 px-2 py-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-neutral-100">{cow.tag}</span>
                    <span className="text-[10px] text-neutral-500">{cow.id}</span>
                  </div>
                  <div className="text-[10px] text-neutral-400">{cow.weight} lb · Fence {Math.round(cow.distanceToFence)} m</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {!hasMapboxToken && (
        <div className="pointer-events-none absolute inset-0 flex items-end justify-start p-3">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 shadow">
            Provide a Mapbox access token via <span className="font-mono">VITE_MAPBOX_TOKEN</span> or <span className="font-mono">window.MAPBOX_TOKEN</span> to enable satellite and dark basemaps.
          </div>
        </div>
      )}
    </div>
  );
}
