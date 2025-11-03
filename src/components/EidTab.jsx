import { motion } from "framer-motion";
import { randomInt } from "../utils/math.js";
import { formatNow } from "../utils/time.js";
import { Field } from "./Field.jsx";

function printReceipt(row) {
  if (!row) return;
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Receipt</title>
  <style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu;max-width:600px;margin:40px auto;color:#111}
  h1{font-size:20px;margin-bottom:16px}
  table{border-collapse:collapse;width:100%;margin-top:12px}
  td,th{border:1px solid #ccc;padding:8px;text-align:left}
  .muted{color:#444}</style></head>
  <body><h1>Chute-Side Receipt</h1><p class="muted">3 Strands Cattle Co. — ranchOS</p>
  <table><tr><th>Time</th><td>${row.time}</td></tr><tr><th>EID</th><td>${row.eid}</td></tr>
  <tr><th>Weight (lb)</th><td>${row.weight}</td></tr><tr><th>Treatment</th><td>${row.treatment}</td></tr>
  <tr><th>Withdrawal</th><td>${row.withdrawal}</td></tr></table>
  <p style="margin-top:20px">Signature: _________________________</p>
  <script>window.print()</script></body></html>`;
  const popup = window.open("", "_blank");
  if (!popup) return;
  popup.document.write(html);
  popup.document.close();
}

export function EidTab({ rows, onAddRow, onPrintReceipt }) {
  const latest = rows.at(-1);
  const shrinkPct = latest ? ((parseInt(latest.eid.slice(-2), 10) % 4) + 1) : null;
  const chuteTemp = latest ? 99 + (parseInt(latest.eid.slice(-3), 10) % 3) : null;

  return (
    <motion.section key="eid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="font-medium">Chute-Side — Session #A24</div>
          <div className="text-xs text-neutral-400">Bluetooth EID reader · Scale</div>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)] xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="EID" value={latest?.eid || "84000…"} />
                <Field label="Weight (lb)" value={latest?.weight || "—"} />
                <Field label="Treatment" value={latest?.treatment || "—"} />
              </div>
              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Shrink" value={latest ? `${shrinkPct}%` : "—"} />
                <Field label="Temp" value={latest ? `${chuteTemp} °F` : "—"} />
                <Field label="Disposition" value={latest ? "Calm" : "—"} />
              </div>
            </div>
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-emerald-500/40 bg-gradient-to-br from-emerald-500/15 via-transparent to-sky-500/20 shadow-[0_0_35px_rgba(16,185,129,0.18)]">
              <video
                src="/chute-scan.mp4"
                className="h-full w-full object-cover opacity-70 mix-blend-screen"
                autoPlay
                muted
                loop
                playsInline
              />
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,#2dd4bf22,transparent_60%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/65 to-transparent px-3 py-2 text-[11px] uppercase tracking-wide text-emerald-200">
                <span>Chute 3 · Depth vision</span>
                <span>LIVE</span>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-4 pb-3 text-[10px] uppercase tracking-[0.2em] text-emerald-200/80">
                <span>Frame sync 4D</span>
                <span>Scan mesh</span>
              </div>
              <div className="scan-visor pointer-events-none absolute inset-0" />
            </div>
          </div>
          <div className="rounded-2xl border border-neutral-800 bg-neutral-950 p-3">
            <div className="mb-2 text-xs text-neutral-400">Scans this session</div>
            <div className="max-h-56 overflow-auto rounded-lg border border-neutral-800">
              <table className="w-full text-sm">
                <thead className="bg-neutral-900/60 text-neutral-300">
                  <tr>
                    <th className="px-3 py-2 text-left">Time</th>
                    <th className="px-3 py-2 text-left">EID</th>
                    <th className="px-3 py-2 text-left">Weight</th>
                    <th className="px-3 py-2 text-left">Treatment</th>
                    <th className="px-3 py-2 text-left">Withdrawal</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={`${row.eid}-${index}`} className="odd:bg-neutral-900/30">
                      <td className="px-3 py-2 text-neutral-300">{row.time}</td>
                      <td className="px-3 py-2 font-mono">{row.eid}</td>
                      <td className="px-3 py-2">{row.weight}</td>
                      <td className="px-3 py-2">{row.treatment}</td>
                      <td className="px-3 py-2">{row.withdrawal}</td>
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-center text-neutral-400">
                        Scan an EID to begin and monitor the chute-side stream for confirmation.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                onAddRow({
                  time: formatNow(),
                  eid: `84000312${randomInt(345670, 999999)}`,
                  weight: randomInt(920, 1280),
                  treatment: "Resp Shot A",
                  withdrawal: "7 days",
                })
              }
              className="rounded-xl border border-neutral-700 bg-neutral-800 px-4 py-2 text-sm hover:bg-neutral-700"
            >
              + Scan demo
            </button>
            <button
              type="button"
              onClick={() => {
                if (latest) {
                  printReceipt(latest);
                  onPrintReceipt?.(latest);
                }
              }}
              className="rounded-xl border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm hover:bg-neutral-800"
            >
              🧾 Print latest receipt
            </button>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
