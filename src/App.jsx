import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { demoDuration, demoScript } from "./data/demoScript.js";
import { useHerd } from "./hooks/useHerd.js";
import { useTelemetry } from "./hooks/useTelemetry.js";
import { randomInt } from "./utils/math.js";
import { formatNow } from "./utils/time.js";
import { DemoToast } from "./components/DemoToast.jsx";
import { EidTab } from "./components/EidTab.jsx";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { OperationsTab } from "./components/OperationsTab.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("ops");
  const [playing, setPlaying] = useState(false);
  const [timeline, setTimeline] = useState(0);
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [speed, setSpeed] = useState(1);
  const [options, setOptions] = useState({ basemap: "satellite", breadcrumbs: true });

  const telemetry = useTelemetry(1000 / speed);
  const herd = useHerd(160, 1000 / speed);

  useEffect(() => {
    if (!playing) return;

    const step = demoScript.find((item) => item.t === timeline);
    if (step) {
      if (step.tab) setActiveTab(step.tab);
      if (step.eid) {
        setRows((previous) => [
          ...previous,
          {
            time: formatNow(),
            eid: `84000312${randomInt(345670, 999999)}`,
            weight: randomInt(920, 1280),
            treatment: "Resp Shot A",
            withdrawal: "7 days",
          },
        ]);
      }
      if (step.toast) {
        setToastMessage(step.toast);
      }
    }

    if (timeline >= demoDuration) {
      setPlaying(false);
      return;
    }

    const id = setTimeout(() => setTimeline((value) => value + 1), 1000 / speed);
    return () => clearTimeout(id);
  }, [playing, timeline, speed]);

  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(id);
  }, [toastMessage]);

  const narrative = useMemo(() => {
    const reversed = [...demoScript].reverse();
    const current = reversed.find((step) => step.t <= timeline && step.narrative);
    return current?.narrative;
  }, [timeline]);

  const handlePlay = () => {
    setPlaying(true);
    setTimeline(0);
    setRows([]);
    setToastMessage("Demo playback started");
    setActiveTab("ops");
  };

  const handlePause = () => {
    setPlaying(false);
  };

  const handleAddRow = (row) => {
    setRows((previous) => [...previous, row]);
  };

  const handleReceipt = (row) => {
    setToastMessage(`Receipt prepared for ${row.eid}`);
  };

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPlayDemo={handlePlay}
        onPauseDemo={handlePause}
        playing={playing}
        speed={speed}
        onSpeedChange={setSpeed}
        timeline={timeline}
        narrative={narrative}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "ops" ? (
            <OperationsTab telemetry={telemetry} herd={herd} sms={toastMessage} options={options} onOptionsChange={setOptions} />
          ) : (
            <EidTab rows={rows} onAddRow={handleAddRow} onPrintReceipt={handleReceipt} />
          )}
        </AnimatePresence>
      </main>

      <DemoToast message={toastMessage} />
      <Footer />
    </div>
  );
}
