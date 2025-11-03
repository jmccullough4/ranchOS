# ranchOS demo suite

A polished ranchOS showcase built for 3 Strands Cattle Co. business development demos. It highlights security cameras, live telemetry, pasture management, and chute-side EID workflows in a single Vite + React app.

## Quick start

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:8082](http://localhost:8082) by default. For a production-style preview, use:

```bash
npm run build
npm run preview
```

## What to demo

- **Operations tab** shows synchronized camera tiles, live infrastructure telemetry, and an interactive pasture manager. Each panel can be expanded to take center stage for deeper dives.
- **Pasture manager** lets prospects search an address, pull the detected property boundary, sketch custom paddocks, toggle breadcrumbs/heatmap overlays, and click individual cattle for weight + treatment history.
- **Chute-side tab** now includes a faux depth-vision chute stream alongside live scans so presenters can speak to EID throughput and safety monitoring simultaneously.

## Map configuration & ranch boundaries

The pasture view ships with a graceful fallback using MapLibre sample tiles. To unlock the satellite + dark Mapbox basemaps showcased in the UI, supply a token in one of two ways:

1. Create an `.env` file with `VITE_MAPBOX_TOKEN=<your-token>`
2. Or set `window.MAPBOX_TOKEN = "<your-token>"` before the app mounts

With a token present, presenters can toggle between satellite and dark imagery during the demo.

Parcel lookups use the public Nominatim (OpenStreetMap) API. Ensure the demo network permits outbound HTTPS to `nominatim.openstreetmap.org`. Drawing paddocks relies on Mapbox GL Draw served from the public unpkg CDN.

## Project structure

```
src/
  components/     Reusable UI components and tab layouts
  constants/      Ranch geometry and map configuration helpers
  hooks/          Real-time telemetry + herd simulation hooks
  utils/          Formatting helpers shared across components
```

## Included assets

 The `/public` folder contains placeholder MP4 clips (`cam1.mp4` … `cam4.mp4`) and a logo. Drop a `chute-scan.mp4` file alongside them to drive the chute-side depth view—it's ignored by git so teams can swap in production footage without touching the codebase.

> **Note:** The included `docker-compose.yml` maps the Nginx container to port 8082 so the hosted demo matches the Vite dev server’s URL.

## Deployment

The app is a static bundle once built. Host the contents of `dist/` behind any CDN or static file host (Netlify, S3, CloudFront, etc.). If you need an Nginx container, the provided `Dockerfile` and `docker-compose.yml` remain compatible.

---

Questions or feedback? Drop a note in the repo and the product team can continue refining the story.
