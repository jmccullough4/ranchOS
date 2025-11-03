import { useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useHerd } from "./hooks/useHerd.js";
import { useTelemetry } from "./hooks/useTelemetry.js";
import { formatNow } from "./utils/time.js";
import { DemoToast } from "./components/DemoToast.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { EidTab } from "./components/EidTab.jsx";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { Dashboard } from "./components/Dashboard.jsx";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ basemap: "satellite", breadcrumbs: true, heatmap: true });
  const [reportStatus, setReportStatus] = useState(null);
  const [user, setUser] = useState(null);

  const telemetry = useTelemetry(1000);
  const herd = useHerd(50, 1000);

  useEffect(() => {
    if (!toastMessage) return;
    const id = setTimeout(() => setToastMessage(""), 3000);
    return () => clearTimeout(id);
  }, [toastMessage]);

  const handleAddRow = (row) => {
    setRows((previous) => [...previous, row]);
  };

  const handleReceipt = (row) => {
    setToastMessage(`Receipt prepared for ${row.eid}`);
  };

  const handleNotify = (message) => {
    if (!message) return;
    setToastMessage(message);
  };

  const handleReport = (channels) => {
    if (!channels?.length) {
      setToastMessage("Select at least one delivery path before sending.");
      return;
    }

    const timestamp = formatNow();
    setReportStatus({ timestamp, channels });
    const formatted = channels.join(" + ");
    setToastMessage(`Herd status report dispatched via ${formatted}.`);
  };

  if (!user) {
    return (
      <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
        <LoginScreen
          onLogin={(profile) => {
            setUser(profile);
            setToastMessage(`Welcome back, ${profile.name}!`);
          }}
        />
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-neutral-950 text-neutral-100">
      <Header activeTab={activeTab} onTabChange={setActiveTab} user={user} onLogout={() => setUser(null)} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          {activeTab === "dashboard" ? (
            <Dashboard
              telemetry={telemetry}
              herd={herd}
              sms={toastMessage}
              options={options}
              onOptionsChange={setOptions}
              onNotify={handleNotify}
              reportStatus={reportStatus}
              onSendReport={handleReport}
            />
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
