import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import maplibregl from "maplibre-gl";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid,
} from "recharts";

// ---------- Utils
const pad = (n) => (n < 10 ? `0${n}` : `${n}`);
function timeNow() { const d = new Date(); return `${pad(d.getFullYear())}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`; }
function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function clamp(v, min, max){ return Math.max(min, Math.min(max, v)); }

// ---------- Center on requested coordinates
const ranchCenter = { lat: 26.808367, lon: -80.267190 };
// Bounds ~800m x 600m around center
const ranchBounds = {
  minLon: ranchCenter.lon - 0.006,
  maxLon: ranchCenter.lon + 0.006,
  minLat: ranchCenter.lat - 0.0045,
  maxLat: ranchCenter.lat + 0.0045,
};

// Some paddocks inside the bounds
const paddocks = [
  { name: "North Paddock", coords: [[ranchBounds.minLon, ranchBounds.maxLat-0.0015],[ranchBounds.minLon+0.004, ranchBounds.maxLat-0.0015],[ranchBounds.minLon+0.004, ranchBounds.maxLat-0.0035],[ranchBounds.minLon, ranchBounds.maxLat-0.0035],[ranchBounds.minLon, ranchBounds.maxLat-0.0015]] },
  { name: "Central", coords: [[ranchBounds.minLon+0.0042, ranchBounds.maxLat-0.0017],[ranchBounds.maxLon-0.001, ranchBounds.maxLat-0.0017],[ranchBounds.maxLon-0.001, ranchBounds.maxLat-0.0037],[ranchBounds.minLon+0.0042, ranchBounds.maxLat-0.0037],[ranchBounds.minLon+0.0042, ranchBounds.maxLat-0.0017]] },
  { name: "South Paddock", coords: [[ranchBounds.minLon, ranchBounds.minLat+0.002],[ranchBounds.maxLon-0.002, ranchBounds.minLat+0.002],[ranchBounds.maxLon-0.002, ranchBounds.minLat],[ranchBounds.minLon, ranchBounds.minLat],[ranchBounds.minLon, ranchBounds.minLat+0.002]] },
];

// Demo script
const demoScript = [
  { t: 0, tab: "ops" },
  { t: 6, tab: "ops" },
  { t: 12, tab: "eid" },
  { t: 14, eid: true },
  { t: 16, eid: true },
  { t: 18, eid: true },
  { t: 20, tab: "ops" },
  { t: 28, tab: "eid" },
  { t: 30, eid: true, toast: "Receipt & ADT export generated" },
  { t: 34, tab: "ops" },
];

// ---------- Hooks
function useTicker(ms) {
  const [t, setT] = useState(0);
  useEffect(() => { const id = setInterval(() => setT(v => v + 1), ms); return () => clearInterval(id); }, [ms]);
  return t;
}

function useTelemetry(tickMs=1000) {
  const tick = useTicker(tickMs);
  const [waterPct, setWaterPct] = useState(78);
  const [fenceKv, setFenceKv] = useState(7.8);
  const [pumpOn, setPumpOn] = useState(false);
  useEffect(() => {
    setWaterPct(v => clamp(v + (Math.random() - 0.5) * 2, 20, 100));
    setFenceKv(v => clamp(+(v + (Math.random() - 0.5) * 0.2).toFixed(2), 5.5, 9.0));
    if (waterPct < 45 && !pumpOn) setPumpOn(true);
    if (waterPct > 85 && pumpOn) setPumpOn(false);
  }, [tick]);
  const waterSeries = useMemo(() => Array.from({ length: 20 }, (_, i) => ({ t: i - 19, level: clamp(waterPct + (Math.random()-0.5)*2, 0, 100) })), [waterPct, tick]);
  const fenceSeries = useMemo(() => Array.from({ length: 20 }, (_, i) => ({ t: i - 19, kv: clamp(+(fenceKv + (Math.random()-0.5)*0.2).toFixed(2), 0, 12) })), [fenceKv, tick]);
  return { waterPct, fenceKv, waterSeries, fenceSeries, pumpOn };
}

function useCows(count=160, tickMs=1000){
  function randomCow(i){
    return {
      id: `C-${String(i).padStart(3, "0")}`,
      lon: ranchBounds.minLon + Math.random() * (ranchBounds.maxLon - ranchBounds.minLon),
      lat: ranchBounds.minLat + Math.random() * (ranchBounds.maxLat - ranchBounds.minLat),
      vx: (Math.random() - 0.5) * 0.00015,
      vy: (Math.random() - 0.5) * 0.00015,
    };
  }
  const [cows, setCows] = useState(() => Array.from({length: count}, (_,i)=>randomCow(i)));
  const [trails, setTrails] = useState(() => new Map()); // id -> [{lon,lat},...]
  const tick = useTicker(tickMs);
  useEffect(()=>{
    setCows(list => list.map(c => {
      let vx = c.vx + (Math.random()-0.5)*0.00003;
      let vy = c.vy + (Math.random()-0.5)*0.00003;
      vx = clamp(vx, -0.00025, 0.00025);
      vy = clamp(vy, -0.00025, 0.00025);
      let lon = c.lon + vx;
      let lat = c.lat + vy;
      if (lon < ranchBounds.minLon || lon > ranchBounds.maxLon) { vx = -vx; lon = clamp(lon, ranchBounds.minLon, ranchBounds.maxLon); }
      if (lat < ranchBounds.minLat || lat > ranchBounds.maxLat) { vy = -vy; lat = clamp(lat, ranchBounds.minLat, ranchBounds.maxLat); }
      if (Math.random() < 0.02) { vx *= 0.5; vy *= -0.5; }
      const next = { ...c, lon, lat, vx, vy };
      return next;
    }));
  }, [tick]);

  // trails update
  useEffect(()=>{
    setTrails(prev => {
      const m = new Map(prev);
      for (const c of cows) {
        const arr = m.get(c.id) || [];
        arr.push({lon:c.lon, lat:c.lat});
        if (arr.length > 20) arr.shift();
        m.set(c.id, arr);
      }
      return m;
    });
  }, [cows]);

  return { cows, trails };
}

// ---------- Components
function CameraFeed({ src="/cam1.mp4", label="CAM" }) {
  const [fallback, setFallback] = useState(false);
  const [localSrc, setLocalSrc] = useState(src);
  const [clock, setClock] = useState(timeNow());
  useEffect(()=>{ const id = setInterval(()=>setClock(timeNow()), 1000); return ()=>clearInterval(id); },[]);
  return (
    <div className="relative h-[200px] bg-black">
      <div className="absolute top-2 left-2 text-xs px-2 py-1 rounded bg-black/60 border border-neutral-800">{label}</div>
      <div className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-black/60 border border-neutral-800">{clock}</div>
      {!fallback ? (
        <video className="absolute inset-0 w-full h-full object-cover" src={localSrc} autoPlay muted loop playsInline onError={() => setFallback(true)} />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-neutral-900 text-neutral-300 text-xs border border-neutral-700 rounded">
          Missing: {src}
        </div>
      )}
    </div>
  );
}

function PastureMap({ cows, trails, options }){
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const token = window.MAPBOX_TOKEN;

  const cowsSource = "cows";
  const trailsSource = "cow-trails";
  const paddockSource = "paddocks";
  const ranchSource = "ranch-bounds";

  useEffect(()=>{
    if (!mapRef.current || mapObj.current) return;
    // Style with two basemaps (Mapbox raster tiles)
    const style = {
      version: 8,
      sources: {
        "satellite": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/satellite-v9/tiles/256/{z}/{x}/{y}?access_token=${token}`
          ],
          tileSize: 256,
          attribution: "© Mapbox © OpenStreetMap contributors"
        },
        "dark": {
          type: "raster",
          tiles: [
            `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/256/{z}/{x}/{y}?access_token=${token}`
          ],
          tileSize: 256,
          attribution: "© Mapbox © OpenStreetMap contributors"
        }
      },
      layers: [
        { id: "satellite", type: "raster", source: "satellite", layout: { visibility: options.basemap === "satellite" ? "visible" : "none" } },
        { id: "dark", type: "raster", source: "dark", layout: { visibility: options.basemap === "dark" ? "visible" : "none" } },
      ]
    };

    const map = new maplibregl.Map({
      container: mapRef.current,
      style,
      center: [ranchCenter.lon, ranchCenter.lat],
      zoom: 16,
      attributionControl: true
    });
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapObj.current = map;

    map.on("load", () => {
      // paddocks
      map.addSource(paddockSource, {
        type: "geojson",
        data: {
          type:"FeatureCollection",
          features: paddocks.map(p=>({ type:"Feature", properties:{name:p.name}, geometry:{ type:"Polygon", coordinates:[p.coords] } }))
        }
      });
      map.addLayer({ id:"paddock-fill", type:"fill", source:paddockSource, paint:{ "fill-color":"#22c55e", "fill-opacity":0.12 } });
      map.addLayer({ id:"paddock-outline", type:"line", source:paddockSource, paint:{ "line-color":"#22c55e", "line-width":1.5 } });
      map.addLayer({ id:"paddock-label", type:"symbol", source:paddockSource, layout:{ "text-field":["get","name"], "text-size":12 }, paint:{ "text-color":"#e5e7eb" } });

      // ranch bounds
      map.addSource(ranchSource, {
        type:"geojson",
        data:{
          type:"Feature",
          geometry:{ type:"Polygon", coordinates:[[[ranchBounds.minLon,ranchBounds.minLat],[ranchBounds.maxLon,ranchBounds.minLat],[ranchBounds.maxLon,ranchBounds.maxLat],[ranchBounds.minLon,ranchBounds.maxLat],[ranchBounds.minLon,ranchBounds.minLat]]] }
        }
      });
      map.addLayer({ id:"ranch-outline", type:"line", source:ranchSource, paint:{ "line-color":"#a3a3a3", "line-width":2 } });

      // cows
      map.addSource(cowsSource, { type: "geojson", data: { type:"FeatureCollection", features: [] } });
      map.addLayer({
        id: "cow-dots",
        type: "circle",
        source: cowsSource,
        paint: {
          "circle-radius": 3,
          "circle-color": "#fde68a",
          "circle-stroke-color": "#78350f",
          "circle-stroke-width": 1
        }
      });

      // trails
      map.addSource(trailsSource, { type:"geojson", data:{ type:"FeatureCollection", features:[] } });
      map.addLayer({
        id: "cow-trails",
        type: "line",
        source: trailsSource,
        layout: { visibility: options.breadcrumbs ? "visible" : "none" },
        paint: { "line-color": "#eab308", "line-width": 1, "line-opacity": 0.6 }
      });

      map.fitBounds([[ranchBounds.minLon, ranchBounds.minLat],[ranchBounds.maxLon, ranchBounds.maxLat]], { padding: 24 });
    });
    return ()=>{ mapObj.current && mapObj.current.remove(); };
  }, []);

  // Respond to basemap/breadcrumb toggles
  useEffect(()=>{
    const map = mapObj.current; if (!map) return;
    const setVis = (id, on) => { if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", on ? "visible" : "none"); };
    setVis("satellite", options.basemap === "satellite");
    setVis("dark", options.basemap === "dark");
    setVis("cow-trails", options.breadcrumbs);
  }, [options]);

  // Update cows + trails data
  useEffect(()=>{
    const map = mapObj.current; if (!map) return;
    const features = cows.map(c => ({ type:"Feature", properties:{ id:c.id }, geometry:{ type:"Point", coordinates:[c.lon, c.lat] } }));
    const src = map.getSource(cowsSource);
    if (src) src.setData({ type:"FeatureCollection", features });

    // trails for first 20 cows
    const trailFeats = [];
    let count = 0;
    for (const [id, arr] of trails.entries()) {
      if (count >= 20) break;
      if (arr.length > 1) {
        trailFeats.push({ type:"Feature", properties:{ id }, geometry:{ type:"LineString", coordinates: arr.map(p=>[p.lon,p.lat]) } });
      }
      count++;
    }
    const tsrc = map.getSource(trailsSource);
    if (tsrc) tsrc.setData({ type:"FeatureCollection", features: trailFeats });
  }, [cows, trails]);

  return <div className="h-[340px] maplibre-container" ref={mapRef} />;
}

function Field({ label, value }) {
  return (
    <div className="rounded-xl bg-neutral-950 border border-neutral-800 p-3">
      <div className="text-xs text-neutral-400">{label}</div>
      <div className="text-base font-medium">{value}</div>
    </div>
  );
}

// ---------- EID Tab helpers
function printReceipt(row){
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>body{{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:600px;margin:40px auto;color:#111}h1{{font-size:20px}}table{{border-collapse:collapse;width:100%}}td,th{{border:1px solid #ccc;padding:8px}}</style></head>
  <body><h1>Chute-Side Receipt</h1><p>3 Strands Cattle Co. — ranchOS</p>
  <table><tr><th>Time</th><td>${row.time}</td></tr><tr><th>EID</th><td>${row.eid}</td></tr><tr><th>Weight (lb)</th><td>${row.weight}</td></tr><tr><th>Treatment</th><td>${row.treatment}</td></tr><tr><th>Withdrawal</th><td>${row.withdrawal}</td></tr></table>
  <p style="margin-top:20px">Signature: _________________________</p>
  <script>window.print()</script></body></html>`;
  const w = window.open("", "_blank");
  w.document.write(html); w.document.close();
}

// ---------- Main App
export default function App() {
  const [activeTab, setActiveTab] = useState("ops");
  const [playing, setPlaying] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [sms, setSms] = useState("");
  const [rows, setRows] = useState([]);
  const [speed, setSpeed] = useState(1); // 1x or 2x
  const [options, setOptions] = useState({ basemap:"satellite", breadcrumbs:true });

  const tel = useTelemetry(1000 / speed);
  const herd = useCows(160, 1000 / speed);

  // demo script player
  useEffect(() => {
    if (!playing) return;
    const step = demoScript.find(s => s.t === timeline);
    if (step) {
      if (step.tab) setActiveTab(step.tab);
      if (step.eid) {
        setRows(r => [...r, {
          time: timeNow(),
          eid: `84000312${rand(345670, 999999)}`,
          weight: rand(920, 1280),
          treatment: "Resp Shot A",
          withdrawal: "7 days",
        }]);
      }
      if (step.toast) setSms(step.toast);
    }
    const id = setTimeout(() => setTimeline(t => t + 1), 1000 / speed);
    return () => clearTimeout(id);
  }, [playing, timeline, speed]);

  useEffect(() => { if (!sms) return; const id = setTimeout(() => setSms(""), 3000); return () => clearTimeout(id); }, [sms]);

  const onPlay = () => { setPlaying(true); setTimeline(0); setRows([]); setSms(""); setActiveTab("ops"); };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-20 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="3 Strands Cattle Co. logo" className="h-9 w-9 rounded-full object-contain bg-neutral-900 border border-neutral-800" />
            <div className="leading-tight">
              <div className="text-sm uppercase tracking-widest text-neutral-400">3 Strands Cattle Co.</div>
              <div className="text-xl font-semibold">ranchOS</div>
              <div className="text-xs text-neutral-500">Security • Telemetry • Herd management</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onPlay} className="rounded-2xl px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm">▶ Play demo</button>
            <button onClick={() => setPlaying(false)} className="rounded-2xl px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm">⏸ Pause</button>
            <select value={speed} onChange={(e)=>setSpeed(Number(e.target.value))} className="bg-neutral-900 border border-neutral-800 rounded-xl text-sm px-2 py-1">
              <option value={1}>Speed: 1x</option>
              <option value={2}>Speed: 2x</option>
            </select>
          </div>
        </div>
        <nav className="mx-auto max-w-6xl px-4 pb-2">
          <div className="flex gap-2">
            {[
              { id: "ops", label: "Operations" },
              { id: "eid", label: "Chute-Side EID Lite" },
            ].map((t) => (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-2xl text-sm border ${activeTab === t.id ? "bg-neutral-800 border-neutral-700" : "bg-neutral-900 border-neutral-900 hover:border-neutral-700"}`}>
                {t.label}
              </button>
            ))}
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "ops" ? (
            <motion.section key="ops" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
              <div className="grid gap-6 xl:grid-cols-3">
                {/* Cameras column */}
                <div className="space-y-4">
                  <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                      <div className="font-medium">Security cameras</div>
                      <div className="text-xs text-neutral-400">Frigate/IP</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 p-2">
                      <CameraFeed label="CAM 1 — East Gate" src="/cam1.mp4" />
                      <CameraFeed label="CAM 2 — Barn" src="/cam2.mp4" />
                      <CameraFeed label="CAM 3 — North Road" src="/cam3.mp4" />
                      <CameraFeed label="CAM 4 — Creek" src="/cam4.mp4" />
                    </div>
                  </div>
                </div>

                {/* Telemetry column */}
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden flex flex-col">
                  <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
                    <div className="font-medium">Telemetry</div>
                    <div className="text-xs text-neutral-400">LoRaWAN → MQTT</div>
                  </div>
                  <div className="p-4 grid grid-cols-1 gap-4">
                    <div className="h-36 rounded-2xl bg-neutral-950 border border-neutral-800 p-3">
                      <div className="text-xs text-neutral-400 mb-1">Trough level (%)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={tel.waterSeries} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                          <defs>
                            <linearGradient id="gradWater" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis dataKey="t" hide />
                          <YAxis hide domain={[0, 100]} />
                          <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                          <Area type="monotone" dataKey="level" stroke="#22d3ee" fill="url(#gradWater)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="h-36 rounded-2xl bg-neutral-950 border border-neutral-800 p-3">
                      <div className="text-xs text-neutral-400 mb-1">Fence voltage (kV)</div>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={tel.fenceSeries} margin={{ top: 6, right: 8, left: 0, bottom: 2 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#262626" />
                          <XAxis dataKey="t" hide />
                          <YAxis hide domain={[0, 12]} />
                          <Tooltip contentStyle={{ background: "#0a0a0a", border: "1px solid #27272a" }} />
                          <Line type="monotone" dataKey="kv" stroke="#86efac" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <Field label="Pump status" value={tel.pumpOn ? "ON" : "OFF"} />
                      <Field label="LoRa GW" value="Online" />
                      <Field label="Last alert" value={sms || "—"} />
                    </div>
                  </div>
                </div>

                {/* Pasture column */}
                <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-800">
                    <div className="font-medium">Pasture management</div>
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <span>Basemap</span>
                      <select className="bg-neutral-900 border border-neutral-800 rounded px-2 py-1"
                        value={options.basemap} onChange={e=>setOptions(o=>({...o, basemap:e.target.value}))}>
                        <option value="satellite">Satellite</option>
                        <option value="dark">Dark</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-3 space-y-3">
                    <PastureMap cows={herd.cows} trails={herd.trails} options={options} />
                    <div className="flex flex-wrap gap-2 text-xs">
                      <label className="flex items-center gap-1"><input type="checkbox" checked={options.breadcrumbs} onChange={e=>setOptions(o=>({...o, breadcrumbs:e.target.checked}))} /> Breadcrumbs</label>
                    </div>
                    <div className="text-xs text-neutral-400">Tracking {herd.cows.length} cattle.</div>
                  </div>
                </div>
              </div>
            </motion.section>
          ) : (
            <EidTab rows={rows} setRows={setRows} />
          )}
        </AnimatePresence>

        <AnimatePresence>
          {sms && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
              className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/15 px-4 py-2 text-emerald-200 text-sm shadow">
                📄 {sms}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="mt-8 mb-10 text-center text-xs text-neutral-500">
        © {new Date().getFullYear()} 3 Strands Cattle Co. · ranchOS demo.
      </footer>
    </div>
  );
}

// ---------- EID Tab
function EidTab({ rows, setRows }) {
  return (
    <motion.section key="eid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="rounded-3xl border border-neutral-800 bg-neutral-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
          <div className="font-medium">Chute-Side — Session #A24</div>
          <div className="text-xs text-neutral-400">Bluetooth EID reader · Scale</div>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Field label="EID" value={rows.at(-1)?.eid || "84000…"} />
            <Field label="Weight (lb)" value={rows.at(-1)?.weight || "—"} />
            <Field label="Treatment" value={rows.at(-1)?.treatment || "—"} />
          </div>
          <div className="rounded-2xl bg-neutral-950 border border-neutral-800 p-3">
            <div className="text-xs text-neutral-400 mb-2">Scans this session</div>
            <div className="max-h-56 overflow-auto rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/60 text-neutral-300">
                  <tr>
                    <th className="text-left px-3 py-2">Time</th>
                    <th className="text-left px-3 py-2">EID</th>
                    <th className="text-left px-3 py-2">Weight</th>
                    <th className="text-left px-3 py-2">Treatment</th>
                    <th className="text-left px-3 py-2">Withdrawal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="odd:bg-neutral-900/30">
                      <td className="px-3 py-2 text-neutral-300">{r.time}</td>
                      <td className="px-3 py-2 font-mono">{r.eid}</td>
                      <td className="px-3 py-2">{r.weight}</td>
                      <td className="px-3 py-2">{r.treatment}</td>
                      <td className="px-3 py-2">{r.withdrawal}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                        Scan an EID to begin… (or press ▶ Play demo)
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setRows(r => [...r, {
              time: timeNow(),
              eid: `84000312${rand(345670, 999999)}`,
              weight: rand(920, 1280),
              treatment: "Resp Shot A",
              withdrawal: "7 days",
            }])} className="rounded-xl px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-sm">+ Scan demo</button>

            <button onClick={() => rows.length && printReceipt(rows.at(-1))} className="rounded-xl px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-sm">🧾 Print latest receipt</button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
