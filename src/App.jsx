import { useEffect, useState } from "react";
import { useHerd } from "./hooks/useHerd.js";
import { useTelemetry } from "./hooks/useTelemetry.js";
import { formatNow } from "./utils/time.js";
import { DemoToast } from "./components/DemoToast.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { Dashboard } from "./components/Dashboard.jsx";

export default function App() {
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ basemap: "satellite", breadcrumbs: true, heatmap: true });
  const [reportStatus, setReportStatus] = useState(null);
  const [user, setUser] = useState(null);

  const telemetry = useTelemetry(1000);
  const herd = useHerd(50, 4000);

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
      <Header telemetry={telemetry} herd={herd} user={user} onLogout={() => setUser(null)} />

      <main className="mx-auto max-w-6xl px-4 py-6">
        <Dashboard
          telemetry={telemetry}
          herd={herd}
          options={options}
          onOptionsChange={setOptions}
          onNotify={handleNotify}
          reportStatus={reportStatus}
          onSendReport={handleReport}
          rows={rows}
          onAddRow={handleAddRow}
          onPrintReceipt={handleReceipt}
        />
      </main>

      <DemoToast message={toastMessage} />
      <Footer />
    </div>
  );
}
