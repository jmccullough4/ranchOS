import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AUTH_USERS } from "../constants/auth.js";

export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const normalizedUsers = useMemo(
    () => AUTH_USERS.map((user) => ({ ...user, username: user.username.toLowerCase() })),
    [],
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");
    const trimmed = username.trim().toLowerCase();
    if (!trimmed || !password) {
      setError("Enter your ranchOS credentials to continue.");
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      const match = normalizedUsers.find((user) => user.username === trimmed && user.password === password);
      if (!match) {
        setError("Invalid username or password.");
        setSubmitting(false);
        return;
      }
      onLogin?.(match);
    }, 450);
  };

  return (
    <div className="mx-auto flex min-h-screen w-full flex-col justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="mx-auto w-full max-w-5xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid gap-10 lg:grid-cols-[1.1fr_1fr]"
        >
          <div className="flex flex-col justify-between gap-8 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur">
            <div className="flex flex-col gap-6">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="3 Strands Cattle Co. logo"
                  className="h-14 w-14 rounded-full border border-neutral-800 bg-neutral-950 object-contain"
                />
                <div>
                  <div className="text-xs uppercase tracking-[0.4em] text-neutral-400">3 Strands Cattle Co.</div>
                  <div className="text-3xl font-semibold text-neutral-50">ranchOS</div>
                  <div className="text-sm text-neutral-500">Digital ranch operations suite</div>
                </div>
              </div>
              <p className="text-sm text-neutral-400">
                ranchOS unifies camera feeds, telemetry, and cattle records into a single command surface. Visualize herd density,
                spotlight stragglers with AI, and dispatch crews in real time from any connected device.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-neutral-300">
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">Live herd twin</div>
                <div className="mt-1 text-neutral-200">Heatmap grazing insights and breadcrumb trails.</div>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">Edge intelligence</div>
                <div className="mt-1 text-neutral-200">AI surfaces fence-line stragglers before they wander.</div>
              </div>
              <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3">
                <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-400">Chute-side sync</div>
                <div className="mt-1 text-neutral-200">EID events, treatments, and receipts stay in lockstep.</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-6 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-400">Secure access</div>
              <h1 className="mt-3 text-3xl font-semibold text-neutral-50">Sign in to ranchOS</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Use your demo credentials to continue into the live operations environment. Theme-aligned access keeps the brand
                consistent from login to dashboard.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <label className="text-xs uppercase tracking-wide text-neutral-400">
                Username
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  type="text"
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="ranch.manager"
                  autoComplete="username"
                />
              </label>
              <label className="text-xs uppercase tracking-wide text-neutral-400">
                Password
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  className="mt-1 w-full rounded-xl border border-neutral-700 bg-neutral-950 px-4 py-2 text-sm text-neutral-100 focus:border-emerald-500 focus:outline-none"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
              </label>
              {error && (
                <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</div>
              )}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Enter ranchOS"}
              </button>
            </form>

            <div className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-3 text-[11px] text-neutral-400">
              <div className="text-[10px] uppercase tracking-[0.3em] text-neutral-500">Need credentials?</div>
              <p className="mt-1">
                Use the sample accounts provided by the ranchOS team to explore telemetry, AI straggler detection, and pasture
                design workflows without leaving the sandbox.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
