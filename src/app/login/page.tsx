"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const DEMO = [
  { label: "RIPPLR Admin", email: "admin@ripplr.com" },
  { label: "Happilo (Brand)", email: "ops@happilo.com" },
  { label: "Fogg (Brand)", email: "ops@fogg.com" },
];

export default function LoginPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("admin@ripplr.com");
  const [password, setPassword] = useState("ripplr123");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Login failed");
      return;
    }
    router.push(params.get("next") || "/");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-ripplr-600 text-xl font-bold text-white">R</span>
          <div>
            <div className="text-xl font-semibold text-white">RIPPLR Orchestrator</div>
            <div className="text-xs uppercase tracking-widest text-ripplr-500">Distribution-as-a-Service</div>
          </div>
        </div>

        <form onSubmit={submit} className="card space-y-4">
          <h1 className="text-lg font-semibold text-white">Sign in</h1>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Email</span>
            <input value={email} onChange={(e) => setEmail(e.target.value)} className="login-input" autoComplete="username" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="login-input"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="text-sm text-red-300">{error}</p>}
          <button disabled={busy} className="btn btn-primary w-full">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <div className="mt-4 rounded-lg border border-ink-600/60 bg-ink-800/50 p-3">
          <div className="mb-2 text-[11px] uppercase tracking-wide text-slate-500">Demo accounts (password: ripplr123)</div>
          <div className="flex flex-wrap gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword("ripplr123");
                }}
                className="btn btn-ghost px-2 py-1 text-xs"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <style jsx>{`
        :global(.login-input) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid rgb(42 54 84 / 0.8);
          background: rgb(11 18 32 / 0.6);
          padding: 0.55rem 0.75rem;
          font-size: 0.9rem;
          color: rgb(226 232 240);
          outline: none;
        }
        :global(.login-input:focus) {
          border-color: rgb(5 150 105);
        }
      `}</style>
    </div>
  );
}
