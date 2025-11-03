import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { ranchBounds, ranchCenter } from "../constants/ranch.js";
import { hasMapboxToken, mapboxToken } from "../constants/map.js";

const cowsSourceId = "cows";
const trailsSourceId = "cow-trails";
const heatmapSourceId = "cow-heatmap";
const paddockSourceId = "paddocks";
const ranchSourceId = "ranch-bounds";
const selectedCowLayerId = "cow-selected";

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

function buildCowPopup(cow) {
  return `
    <div class="min-w-[180px] text-xs text-neutral-100">
      <div class="text-[11px] uppercase tracking-wide text-emerald-300">${cow.tag} · ${cow.id}</div>
      <div class="mt-1">Weight: <strong>${cow.weight} lb</strong></div>
      <div class="mt-1">Body condition: <strong>${cow.bodyCondition}</strong></div>
      <div class="mt-1">Last check: ${cow.lastCheck}</div>
      <div class="mt-1">Notes: ${cow.notes}</div>
    </div>
  `;
}

export function PastureMap({
  cows,
  trails,
  options,
  boundary,
  pastures,
  onPasturesChange,
  selectedCowId,
  onSelectCow,
  onDrawReady,
  variant = "compact",
}) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const drawRef = useRef(null);
  const suppressDrawEventsRef = useRef(false);
  const popupRef = useRef(null);
  const cowsRef = useRef(cows);
  const onPasturesChangeRef = useRef(onPasturesChange);
  const onSelectCowRef = useRef(onSelectCow);
  const optionsRef = useRef(options);
  const onDrawReadyRef = useRef(onDrawReady);

  useEffect(() => {
    cowsRef.current = cows;
  }, [cows]);

  useEffect(() => {
    onPasturesChangeRef.current = onPasturesChange;
  }, [onPasturesChange]);

  useEffect(() => {
    onSelectCowRef.current = onSelectCow;
  }, [onSelectCow]);

  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  useEffect(() => {
    onDrawReadyRef.current = onDrawReady;
  }, [onDrawReady]);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const loadDraw = () => {
      if (typeof window === "undefined") return Promise.resolve(null);
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
          draw = new DrawCtor({ displayControlsDefault: false, controls: { polygon: true, trash: true } });
          map.addControl(draw, "top-left");
          drawRef.current = draw;
          onDrawReadyRef.current?.(true);
        } else {
          onDrawReadyRef.current?.(false);
        }

        const handleDrawChange = () => {
          if (!draw || suppressDrawEventsRef.current) return;
          const collection = draw.getAll();
          const features = collection.features.map((feature, index) => {
            const name = feature.properties?.name ?? `Pasture ${index + 1}`;
            draw.setFeatureProperty(feature.id, "name", name);
            return { ...feature, properties: { ...feature.properties, name } };
          });
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
        id: "paddock-label",
        type: "symbol",
        source: paddockSourceId,
        layout: { "text-field": ["get", "name"], "text-size": 12 },
        paint: { "text-color": "#e5e7eb", "text-halo-color": "#111827", "text-halo-width": 1 },
      });

      map.addSource(ranchSourceId, { type: "geojson", data: boundary ?? getFeatureCollection() });
      map.addLayer({ id: "ranch-outline", type: "line", source: ranchSourceId, paint: { "line-color": "#60a5fa", "line-width": 2 } });

      map.addSource(cowsSourceId, { type: "geojson", data: getFeatureCollection() });
      map.addLayer({
        id: "cow-dots",
        type: "circle",
        source: cowsSourceId,
        paint: {
          "circle-radius": 4,
          "circle-color": "#fde68a",
          "circle-stroke-color": "#78350f",
          "circle-stroke-width": 1,
        },
      });

      map.addLayer({
        id: selectedCowLayerId,
        type: "circle",
        source: cowsSourceId,
        paint: {
          "circle-radius": 8,
          "circle-color": "#facc15",
          "circle-opacity": 0.35,
          "circle-stroke-color": "#facc15",
          "circle-stroke-width": 1,
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
            onSelectCowRef.current?.(cow);
          });

      map.on("mouseenter", "cow-dots", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      map.on("mouseleave", "cow-dots", () => {
        map.getCanvas().style.cursor = "";
      });

          const bounds = computeBounds(boundary ?? getFeatureCollection());
          map.fitBounds(bounds, { padding: 40, maxZoom: 18 });
        });

        mapRef.current = map;
      });

    return () => {
      cancelled = true;
      drawRef.current = null;
      onDrawReadyRef.current?.(false);
      popupRef.current?.remove();
      popupRef.current = null;
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
    if (!selectedCowId) {
      popupRef.current?.remove();
      popupRef.current = null;
    }
    if (map.getLayer(selectedCowLayerId)) {
      map.setFilter(selectedCowLayerId, ["==", ["get", "id"], selectedCowId ?? ""]);
    }
    if (!selectedCowId) return;
    const cow = cows.find((item) => item.id === selectedCowId);
    if (!cow) return;
    const popup = popupRef.current ?? new maplibregl.Popup({ closeButton: true, closeOnClick: false, offset: 12 });
    popupRef.current = popup;
    popup.setLngLat([cow.lon, cow.lat]).setHTML(buildCowPopup(cow)).addTo(map);
  }, [selectedCowId, cows]);

  const heightClass = variant === "expanded" ? "h-[420px] sm:h-[520px] lg:h-[600px]" : "h-[320px] sm:h-[340px]";

  return (
    <div className={`relative ${heightClass} overflow-hidden rounded-2xl`}>
      <div ref={mapContainerRef} className="h-full w-full" />
      {!hasMapboxToken && (
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-3">
          <div className="pointer-events-auto max-w-xs rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-100 shadow">
            Provide a Mapbox access token via <span className="font-mono">VITE_MAPBOX_TOKEN</span> or <span className="font-mono">window.MAPBOX_TOKEN</span> to enable satellite and dark basemaps.
          </div>
        </div>
      )}
    </div>
  );
}
