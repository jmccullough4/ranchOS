import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { paddocks, ranchBounds, ranchCenter } from "../constants/ranch.js";
import { hasMapboxToken, mapboxToken } from "../constants/map.js";

const cowsSourceId = "cows";
const trailsSourceId = "cow-trails";
const paddockSourceId = "paddocks";
const ranchSourceId = "ranch-bounds";

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

export function PastureMap({ cows, trails, options }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: createStyle(),
      center: [ranchCenter.lon, ranchCenter.lat],
      zoom: 16,
      attributionControl: true,
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      map.addSource(paddockSourceId, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: paddocks.map((paddock) => ({
            type: "Feature",
            properties: { name: paddock.name },
            geometry: { type: "Polygon", coordinates: [paddock.coords] },
          })),
        },
      });
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
        paint: { "text-color": "#e5e7eb" },
      });

      map.addSource(ranchSourceId, {
        type: "geojson",
        data: {
          type: "Feature",
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
      });
      map.addLayer({ id: "ranch-outline", type: "line", source: ranchSourceId, paint: { "line-color": "#a3a3a3", "line-width": 2 } });

      map.addSource(cowsSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cow-dots",
        type: "circle",
        source: cowsSourceId,
        paint: {
          "circle-radius": 3,
          "circle-color": "#fde68a",
          "circle-stroke-color": "#78350f",
          "circle-stroke-width": 1,
        },
      });

      map.addSource(trailsSourceId, { type: "geojson", data: { type: "FeatureCollection", features: [] } });
      map.addLayer({
        id: "cow-trails",
        type: "line",
        source: trailsSourceId,
        layout: { visibility: options.breadcrumbs ? "visible" : "none" },
        paint: { "line-color": "#eab308", "line-width": 1, "line-opacity": 0.6 },
      });

      map.fitBounds(
        [
          [ranchBounds.minLon, ranchBounds.minLat],
          [ranchBounds.maxLon, ranchBounds.maxLat],
        ],
        { padding: 24 },
      );
    });

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
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
          properties: { id: cow.id },
          geometry: { type: "Point", coordinates: [cow.lon, cow.lat] },
        })),
      });
    }

    const trailSource = map.getSource(trailsSourceId);
    if (trailSource) {
      const features = [];
      let count = 0;
      for (const [id, points] of trails.entries()) {
        if (count >= 20) break;
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
  }, [cows, trails]);

  return (
    <div className="relative h-[340px] overflow-hidden rounded-2xl">
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
