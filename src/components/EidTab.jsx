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

  return (
    <motion.section key="eid" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
      <div className="overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <div className="font-medium">Chute-Side — Session #A24</div>
          <div className="text-xs text-neutral-400">Bluetooth EID reader · Scale</div>
        </div>
        <div className="space-y-3 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Field label="EID" value={latest?.eid || "84000…"} />
            <Field label="Weight (lb)" value={latest?.weight || "—"} />
            <Field label="Treatment" value={latest?.treatment || "—"} />
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
                        Scan an EID to begin… (or press ▶ Play demo)
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
