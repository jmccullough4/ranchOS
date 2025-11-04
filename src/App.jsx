import { useEffect, useState } from "react";
import { useHerd } from "./hooks/useHerd.js";
import { useTelemetry } from "./hooks/useTelemetry.js";
import { DemoToast } from "./components/DemoToast.jsx";
import { LoginScreen } from "./components/LoginScreen.jsx";
import { Footer } from "./components/Footer.jsx";
import { Header } from "./components/Header.jsx";
import { MapScreen } from "./components/MapScreen.jsx";
import { ProcessingScreen } from "./components/ProcessingScreen.jsx";

export default function App() {
  const [toastMessage, setToastMessage] = useState("");
  const [rows, setRows] = useState([]);
  const [options, setOptions] = useState({ breadcrumbs: true, heatmap: true });
  const [user, setUser] = useState(null);
  const [activeScreen, setActiveScreen] = useState("map");

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

  const handleNotify = (message) => {
    if (!message) return;
    setToastMessage(message);
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
    <div className="flex min-h-screen w-full flex-col bg-neutral-950 text-neutral-100">
      <Header
        telemetry={telemetry}
        herd={herd}
        user={user}
        onLogout={() => setUser(null)}
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        threatActive={herd.cows.some((cow) => cow.isStray)}
      />

      <main className="relative flex-1 overflow-hidden">
        {activeScreen === "map" ? (
          <MapScreen herd={herd} options={options} onOptionsChange={setOptions} onNotify={handleNotify} />
        ) : (
          <ProcessingScreen rows={rows} onAddRow={handleAddRow} onNotify={handleNotify} />
        )}
      </main>

      <DemoToast message={toastMessage} />
    </div>
  );
}
