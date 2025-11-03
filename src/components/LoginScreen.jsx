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

  const handleSelectUser = (user) => {
    setUsername(user.username);
    setPassword("3strands");
    setError("");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full flex-col justify-center bg-neutral-950 px-4 py-10 text-neutral-100">
      <div className="mx-auto w-full max-w-4xl">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-6 rounded-3xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-2xl shadow-emerald-500/10 backdrop-blur">
            <div>
              <div className="text-xs uppercase tracking-[0.4em] text-emerald-400">Welcome to ranchOS</div>
              <h1 className="mt-2 text-3xl font-semibold text-neutral-50">routeOS secure login</h1>
              <p className="mt-2 text-sm text-neutral-400">
                Authenticate to unlock the live ranch twin. Manage pasture cameras, LoRa telemetry, and chute-side data in a single dynamic console.
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
                  placeholder="jay"
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
              {error && <div className="rounded-xl border border-rose-500/50 bg-rose-500/10 px-3 py-2 text-xs text-rose-100">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-500/60 bg-emerald-600/20 px-4 py-2 text-sm font-semibold uppercase tracking-wide text-emerald-200 hover:bg-emerald-600/30 disabled:opacity-60"
              >
                {submitting ? "Verifying…" : "Enter ranchOS"}
              </button>
            </form>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-3xl border border-neutral-800 bg-neutral-900/60 p-5 text-sm text-neutral-300">
              <div className="text-[11px] uppercase tracking-[0.35em] text-neutral-500">Quick select</div>
              <p className="mt-2 text-neutral-400">
                Demo identities mirror typical ranch roles. Choose one to auto-populate credentials and explore the full routerOS toolkit.
              </p>
              <ul className="mt-4 grid gap-3">
                {normalizedUsers.map((user) => (
                  <li key={user.username}>
                    <button
                      type="button"
                      onClick={() => handleSelectUser(user)}
                      className="flex w-full items-center justify-between gap-3 rounded-2xl border border-neutral-700 bg-neutral-950/70 px-4 py-3 text-left text-sm text-neutral-100 transition hover:border-emerald-500/50 hover:bg-neutral-900"
                    >
                      <div>
                        <div className="font-semibold text-neutral-50">{user.name}</div>
                        <div className="text-xs uppercase tracking-wide text-neutral-500">{user.role}</div>
                      </div>
                      <div className="text-[11px] font-mono uppercase tracking-wide text-emerald-400">{user.username}</div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-emerald-500/30 bg-emerald-500/10 p-5 text-xs text-emerald-100">
              <div className="text-[10px] uppercase tracking-[0.3em] text-emerald-300">Edge intelligence</div>
              <p className="mt-2 text-sm">
                routeOS stitches together location pings, vaccinations, and heat signatures so you spot strays before they drift. Seamless hand-off from login to live situational awareness.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
