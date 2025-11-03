const envToken = import.meta.env?.VITE_MAPBOX_TOKEN;
const browserToken = typeof window !== "undefined" ? window.MAPBOX_TOKEN : undefined;

export const mapboxToken = envToken || browserToken || "";
export const hasMapboxToken = Boolean(mapboxToken);
