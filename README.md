# ranchOS demo suite

A polished, self-running ranchOS showcase built for 3 Strands Cattle Co. business development demos. It highlights security cameras, telemetry, pasture management, and chute-side EID workflows in a single Vite + React app.

## Quick start

```bash
npm install
npm run dev
```

The dev server runs on [http://localhost:5173](http://localhost:5173) by default. For a production-style preview, use:

```bash
npm run build
npm run preview
```

## Demo controls

- **▶ Play demo** resets the data, switches to the Operations tab, and steps through the scripted story beat-by-beat.
- **⏸ Pause / ■ Stop** pauses automation so you can manually explore the interface.
- **Speed** doubles the tempo for rapid walk-throughs.
- The timeline bar at the bottom of the header shows progress and the current narrative beat so presenters know what to highlight next.

You can also switch tabs manually at any time—the telemetry, herd simulation, and EID table continue to update in real time.

## Map configuration

The pasture view ships with a graceful fallback using MapLibre sample tiles. To unlock the satellite + dark Mapbox basemaps showcased in the UI, supply a token in one of two ways:

1. Create an `.env` file with `VITE_MAPBOX_TOKEN=<your-token>`
2. Or set `window.MAPBOX_TOKEN = "<your-token>"` before the app mounts

With a token present, presenters can toggle between satellite and dark imagery during the demo.

## Project structure

```
src/
  components/     Reusable UI components and tab layouts
  constants/      Ranch geometry and map configuration helpers
  data/           Demo scripting metadata
  hooks/          Real-time telemetry + herd simulation hooks
  utils/          Formatting helpers shared across components
```

## Included assets

The `/public` folder contains placeholder MP4 clips (`cam1.mp4` … `cam4.mp4`) and a logo. Replace these with ranch-specific footage or branding to personalize the experience.

## Deployment

The app is a static bundle once built. Host the contents of `dist/` behind any CDN or static file host (Netlify, S3, CloudFront, etc.). If you need an Nginx container, the provided `Dockerfile` and `docker-compose.yml` remain compatible.

---

Questions or feedback? Drop a note in the repo and the product team can continue refining the story.
